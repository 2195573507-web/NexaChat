import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { store } from './store.js';
import {
  GATEWAY_BIND_HOST,
  GATEWAY_BODY_LIMIT_BYTES,
  GATEWAY_ENDPOINT,
  GATEWAY_ENDPOINT_SCOPES,
  GATEWAY_ERROR_MESSAGES,
  GATEWAY_ERROR_STATUS,
  GATEWAY_PORT,
  type GatewayErrorCode,
  type GatewayScope,
} from '../../shared/gatewayRuntime.js';

let server: Server | null = null;

export async function startLocalGateway(): Promise<void> {
  if (server) {
    store.setGatewayRuntime(true);
    return;
  }

  server = createLocalGatewayServer();

  await new Promise<void>((resolve, reject) => {
    server?.once('error', reject);
    server?.listen(GATEWAY_PORT, GATEWAY_BIND_HOST, () => resolve());
  });
  store.setGatewayRuntime(true);
}

export function createLocalGatewayServer(): Server {
  return createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const startedAt = Date.now();
    try {
      if (request.method === 'OPTIONS') {
        writeJson(response, 204, {});
        store.recordGatewayLog({
          method: 'OPTIONS',
          path,
          statusCode: 204,
          headers: headersToObject(request),
          latencyMs: Date.now() - startedAt,
          remoteAddress: request.socket.remoteAddress ?? null,
        });
        return;
      }
      if (request.method === 'GET' && path === GATEWAY_ENDPOINT.models) {
        await handleModels(request, response, startedAt);
        return;
      }
      if (request.method === 'POST' && path === GATEWAY_ENDPOINT.chatCompletions) {
        await handleChatCompletions(request, response, startedAt);
        return;
      }
      if (request.method === 'POST' && path === GATEWAY_ENDPOINT.embeddings) {
        await handleEmbeddings(request, response, startedAt);
        return;
      }
      if (path === GATEWAY_ENDPOINT.responses) {
        writeGatewayError(response, 'reserved_endpoint');
        recordGatewayEvent(request, path, 501, startedAt, null, null, 'reserved_endpoint');
        return;
      }
      writeGatewayError(response, 'not_found');
      recordGatewayEvent(request, path, 404, startedAt, null, null, 'not_found');
    } catch (error) {
      const gatewayError = normalizeGatewayError(error);
      const message = gatewayError.message;
      store.setGatewayRuntime(true, message);
      writeGatewayError(response, gatewayError.code, message);
      recordGatewayEvent(request, path, GATEWAY_ERROR_STATUS[gatewayError.code], startedAt, null, null, gatewayError.code);
    }
  });
}

export async function stopLocalGateway(): Promise<void> {
  if (!server) {
    store.setGatewayRuntime(false);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server?.close((error) => (error ? reject(error) : resolve()));
  });
  server = null;
  store.setGatewayRuntime(false);
}

async function handleModels(request: IncomingMessage, response: ServerResponse, startedAt: number): Promise<void> {
  const auth = authorize(request, GATEWAY_ENDPOINT_SCOPES['/v1/models']);
  if (!auth.ok) {
    const code = auth.errorCode ?? 'invalid_key';
    writeGatewayError(response, code);
    recordGatewayEvent(request, GATEWAY_ENDPOINT.models, GATEWAY_ERROR_STATUS[code], startedAt, auth.key, auth.scope, code);
    return;
  }
  const models = store.getModels().filter((model) => model.enabled);
  writeJson(response, 200, {
    object: 'list',
    data: models.map((model) => ({
      id: model.name,
      object: 'model',
      created: Math.floor(model.createdAt / 1000),
      owned_by: model.providerId,
      nexachat: {
        modelId: model.id,
        displayName: model.displayName,
        health: model.healthStatus,
        supportsEmbeddings: model.supportsEmbeddings,
      },
    })),
  });
  recordGatewayEvent(request, GATEWAY_ENDPOINT.models, 200, startedAt, auth.key, auth.scope, null);
}

async function handleChatCompletions(request: IncomingMessage, response: ServerResponse, startedAt: number): Promise<void> {
  const auth = authorize(request, GATEWAY_ENDPOINT_SCOPES['/v1/chat/completions']);
  if (!auth.ok) {
    const code = auth.errorCode ?? 'invalid_key';
    writeGatewayError(response, code);
    recordGatewayEvent(request, GATEWAY_ENDPOINT.chatCompletions, GATEWAY_ERROR_STATUS[code], startedAt, auth.key, auth.scope, code);
    return;
  }
  const body = await readJsonBody(request);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastUser = [...messages].reverse().find((message) => message?.role === 'user');
  const content = typeof lastUser?.content === 'string' ? lastUser.content : JSON.stringify(lastUser?.content ?? '');
  const modelId = store.resolveGatewayModelId(typeof body.model === 'string' ? body.model : undefined);
  const result = await store.sendMessage({
    content: content || 'External gateway request',
    modelId,
    contextStrategy: 'recent_n',
  });
  const payload = {
    id: result.requestLog.gatewayRequestId ?? result.requestLog.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: result.routeDecision.modelNameSnapshot,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: result.assistantMessage.content,
        },
        finish_reason: result.assistantMessage.finishReason,
      },
    ],
    usage: {
      prompt_tokens: result.assistantMessage.inputTokens ?? 0,
      completion_tokens: result.assistantMessage.outputTokens ?? 0,
      total_tokens: (result.assistantMessage.inputTokens ?? 0) + (result.assistantMessage.outputTokens ?? 0),
    },
    nexachat: {
      conversationId: result.conversation.id,
      requestLogId: result.requestLog.id,
      routeDecision: result.routeDecision,
    },
  };
  if (result.requestLog.status === 'failed') {
    writeJson(response, 502, {
      error: {
        message: result.requestLog.errorMessage ?? 'Provider invocation failed.',
        type: result.requestLog.errorCode ?? 'provider_error',
      },
      nexachat: {
        conversationId: result.conversation.id,
        requestLogId: result.requestLog.id,
        routeDecision: result.routeDecision,
      },
    });
    recordGatewayEvent(request, GATEWAY_ENDPOINT.chatCompletions, 502, startedAt, auth.key, auth.scope, 'provider_error', result.requestLog.id);
    return;
  }
  writeJson(response, 200, payload);
  recordGatewayEvent(request, GATEWAY_ENDPOINT.chatCompletions, 200, startedAt, auth.key, auth.scope, null, result.requestLog.id);
}

async function handleEmbeddings(request: IncomingMessage, response: ServerResponse, startedAt: number): Promise<void> {
  const auth = authorize(request, GATEWAY_ENDPOINT_SCOPES['/v1/embeddings']);
  if (!auth.ok) {
    const code = auth.errorCode ?? 'invalid_key';
    writeGatewayError(response, code);
    recordGatewayEvent(request, GATEWAY_ENDPOINT.embeddings, GATEWAY_ERROR_STATUS[code], startedAt, auth.key, auth.scope, code);
    return;
  }
  const body = await readJsonBody(request);
  const input = Array.isArray(body.input) ? body.input : [body.input ?? ''];
  writeJson(response, 200, {
    object: 'list',
    data: input.map((value, index) => ({
      object: 'embedding',
      index,
      embedding: lexicalEmbedding(String(value)),
    })),
    model: body.model ?? 'nexachat-lexical-embedding',
    usage: {
      prompt_tokens: input.join(' ').length,
      total_tokens: input.join(' ').length,
    },
    nexachat: {
      note: 'First build lexical fallback for endpoint compatibility; real embedding providers are reserved.',
    },
  });
  recordGatewayEvent(request, GATEWAY_ENDPOINT.embeddings, 200, startedAt, auth.key, auth.scope, null);
}

function authorize(request: IncomingMessage, scope: GatewayScope) {
  const auth = request.headers.authorization ?? '';
  const token = Array.isArray(auth) ? auth[0] : auth;
  const rawKey = token.startsWith('Bearer ') ? token.slice('Bearer '.length).trim() : '';
  return store.authorizeGatewayKey(rawKey || null, scope);
}

function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
      if (data.length > GATEWAY_BODY_LIMIT_BYTES) {
        reject(new GatewayRequestError('body_too_large'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {});
      } catch {
        reject(new GatewayRequestError('invalid_json'));
      }
    });
    request.on('error', reject);
  });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': 'http://127.0.0.1',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-max-age': '600',
  });
  response.end(statusCode === 204 ? undefined : JSON.stringify(payload));
}

function writeGatewayError(response: ServerResponse, code: GatewayErrorCode, message = GATEWAY_ERROR_MESSAGES[code]): void {
  writeJson(response, GATEWAY_ERROR_STATUS[code], { error: { message, type: code } });
}

function recordGatewayEvent(
  request: IncomingMessage,
  path: string,
  statusCode: number,
  startedAt: number,
  key: ReturnType<typeof store.getGatewayKeys>[number] | null,
  scope: GatewayScope | null,
  errorCode: GatewayErrorCode | null,
  requestLogId: string | null = null,
): void {
  store.recordGatewayLog({
    method: request.method ?? 'GET',
    path,
    statusCode,
    requestLogId,
    key,
    scope,
    errorCode,
    headers: headersToObject(request),
    latencyMs: Math.max(0, Date.now() - startedAt),
    remoteAddress: request.socket.remoteAddress ?? null,
  });
}

function headersToObject(request: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    headers[key] = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  }
  return headers;
}

function lexicalEmbedding(value: string): number[] {
  const buckets = new Array<number>(12).fill(0);
  for (let index = 0; index < value.length; index += 1) {
    buckets[index % buckets.length] += value.charCodeAt(index) / 255;
  }
  const magnitude = Math.sqrt(buckets.reduce((sum, item) => sum + item * item, 0)) || 1;
  return buckets.map((item) => Number((item / magnitude).toFixed(6)));
}

class GatewayRequestError extends Error {
  constructor(readonly code: GatewayErrorCode) {
    super(GATEWAY_ERROR_MESSAGES[code]);
  }
}

function normalizeGatewayError(error: unknown): { code: GatewayErrorCode; message: string } {
  if (error instanceof GatewayRequestError) {
    return { code: error.code, message: error.message };
  }
  return { code: 'internal_error', message: error instanceof Error ? error.message : String(error) };
}
