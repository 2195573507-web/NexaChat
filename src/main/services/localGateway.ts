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
import { KNOWLEDGE_RUNTIME_POLICY, lexicalEmbedding } from '../../shared/knowledgeRuntime.js';
import type { ChatStreamEventPayload } from '../../shared/ipc.js';
import type { ChatResponse } from '../../shared/types.js';

let server: Server | null = null;
const SSE_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'access-control-allow-origin': 'http://127.0.0.1',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
} as const;

export async function startLocalGateway(): Promise<void> {
  if (server) {
    store.setGatewayRuntime(true, null, 'listening');
    return;
  }

  store.setGatewayRuntime(true, null, 'starting');
  server = createLocalGatewayServer();

  await new Promise<void>((resolve, reject) => {
    server?.once('error', reject);
    server?.listen(GATEWAY_PORT, GATEWAY_BIND_HOST, () => resolve());
  }).catch((error) => {
    server = null;
    store.setGatewayRuntime(true, error instanceof Error ? error.message : String(error), 'error');
    throw error;
  });
  store.setGatewayRuntime(true, null, 'listening');
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
      store.setGatewayRuntime(true, message, 'listening');
      writeGatewayError(response, gatewayError.code, message);
      recordGatewayEvent(request, path, GATEWAY_ERROR_STATUS[gatewayError.code], startedAt, null, null, gatewayError.code);
    }
  });
}

export async function stopLocalGateway(): Promise<void> {
  if (!server) {
    store.setGatewayRuntime(false, null, 'stopped');
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server?.close((error) => (error ? reject(error) : resolve()));
  });
  server = null;
  store.setGatewayRuntime(false, null, 'stopped');
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
  const stream = body.stream === true;
  if (stream) {
    await handleStreamingChatCompletions(request, response, startedAt, auth, {
      content: content || 'External gateway request',
      modelId,
    });
    return;
  }
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

async function handleStreamingChatCompletions(
  request: IncomingMessage,
  response: ServerResponse,
  startedAt: number,
  auth: ReturnType<typeof authorize>,
  input: { content: string; modelId?: string },
): Promise<void> {
  let streamOpened = false;
  let requestLogId: string | null = null;
  let completed = false;
  const created = Math.floor(Date.now() / 1000);
  const clientRequestId = `gwstream_${startedAt}_${Math.random().toString(16).slice(2)}`;

  const openStream = () => {
    if (streamOpened) return;
    response.writeHead(200, SSE_HEADERS);
    response.write(': nexachat stream\n\n');
    streamOpened = true;
  };

  try {
    const result = await store.sendMessage({
      content: input.content,
      modelId: input.modelId,
      clientRequestId,
      contextStrategy: 'recent_n',
      metadata: {
        gatewayStream: true,
      },
    }, {
      onEvent(payload: unknown) {
        const event = payload as Omit<ChatStreamEventPayload, 'requestId'>;
        if (event.type === 'chat.stream.started') {
          requestLogId = event.clientRequestId ?? requestLogId;
          openStream();
          return;
        }
        if (event.type === 'chat.stream.chunk' && event.chunk) {
          openStream();
          writeSse(response, {
            id: event.clientRequestId ?? requestLogId ?? clientRequestId,
            object: 'chat.completion.chunk',
            created,
            model: '',
            choices: [
              {
                index: 0,
                delta: {
                  content: event.chunk,
                },
                finish_reason: null,
              },
            ],
          });
          return;
        }
        if (event.type === 'chat.stream.failed' || event.type === 'chat.stream.canceled') {
          openStream();
          writeSse(response, {
            error: {
              message: event.error ?? event.message ?? 'Provider invocation failed.',
              type: event.type === 'chat.stream.canceled' ? 'cancelled' : 'provider_error',
            },
            nexachat: {
              requestLogId: event.clientRequestId ?? requestLogId,
              conversationId: event.conversationId,
            },
          }, 'error');
        }
      },
    });

    requestLogId = result.requestLog.id;
    if (result.requestLog.status === 'failed') {
      const errorPayload = {
        error: {
          message: result.requestLog.errorMessage ?? 'Provider invocation failed.',
          type: result.requestLog.errorCode ?? 'provider_error',
        },
        nexachat: {
          conversationId: result.conversation.id,
          requestLogId: result.requestLog.id,
          routeDecision: result.routeDecision,
        },
      };
      if (!streamOpened) {
        writeJson(response, 502, errorPayload);
      } else {
        writeSse(response, errorPayload, 'error');
        endSse(response);
      }
      recordGatewayEvent(request, GATEWAY_ENDPOINT.chatCompletions, 502, startedAt, auth.key, auth.scope, 'provider_error', result.requestLog.id);
      return;
    }

    openStream();
    if ((result.chunks ?? []).length === 0) {
      writeSse(response, buildStreamingChunk(result, '', null, created));
    }
    writeSse(response, buildStreamingChunk(result, '', result.assistantMessage.finishReason ?? 'stop', created));
    writeSse(response, {
      nexachat: {
        conversationId: result.conversation.id,
        requestLogId: result.requestLog.id,
        routeDecision: result.routeDecision,
      },
      usage: {
        prompt_tokens: result.assistantMessage.inputTokens ?? 0,
        completion_tokens: result.assistantMessage.outputTokens ?? 0,
        total_tokens: (result.assistantMessage.inputTokens ?? 0) + (result.assistantMessage.outputTokens ?? 0),
      },
    }, 'nexachat.completed');
    endSse(response);
    completed = true;
    recordGatewayEvent(request, GATEWAY_ENDPOINT.chatCompletions, 200, startedAt, auth.key, auth.scope, null, result.requestLog.id);
  } finally {
    if (streamOpened && !completed && !response.writableEnded) {
      endSse(response);
    }
  }
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
    model: body.model ?? KNOWLEDGE_RUNTIME_POLICY.embeddingModel,
    usage: {
      prompt_tokens: input.join(' ').length,
      total_tokens: input.join(' ').length,
    },
    nexachat: {
      strategy: 'lexical',
      indexDirectory: KNOWLEDGE_RUNTIME_POLICY.indexDirectory,
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

function writeSse(response: ServerResponse, payload: unknown, event?: string): void {
  if (event) {
    response.write(`event: ${event}\n`);
  }
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function endSse(response: ServerResponse): void {
  response.end('data: [DONE]\n\n');
}

function buildStreamingChunk(result: ChatResponse, content: string, finishReason: string | null, created: number): Record<string, unknown> {
  return {
    id: result.requestLog.gatewayRequestId ?? result.requestLog.id,
    object: 'chat.completion.chunk',
    created,
    model: result.routeDecision.modelNameSnapshot,
    choices: [
      {
        index: 0,
        delta: content ? { content } : {},
        finish_reason: finishReason,
      },
    ],
  };
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
