import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { store } from './store.js';

let server: Server | null = null;

export async function startLocalGateway(): Promise<void> {
  if (server) {
    store.setGatewayRuntime(true);
    return;
  }

  server = createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    try {
      if (request.method === 'GET' && path === '/v1/models') {
        await handleModels(request, response);
        return;
      }
      if (request.method === 'POST' && path === '/v1/chat/completions') {
        await handleChatCompletions(request, response);
        return;
      }
      if (request.method === 'POST' && path === '/v1/embeddings') {
        await handleEmbeddings(request, response);
        return;
      }
      if (path === '/v1/responses') {
        writeJson(response, 501, { error: { message: '/v1/responses is reserved in this build.', type: 'reserved_endpoint' } });
        store.recordGatewayLog(request.method ?? 'GET', path, 501, null, headersToObject(request));
        return;
      }
      writeJson(response, 404, { error: { message: 'Endpoint not found.', type: 'not_found' } });
      store.recordGatewayLog(request.method ?? 'GET', path, 404, null, headersToObject(request));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      store.setGatewayRuntime(true, message);
      writeJson(response, 500, { error: { message, type: 'internal_error' } });
      store.recordGatewayLog(request.method ?? 'GET', path, 500, null, headersToObject(request));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server?.once('error', reject);
    server?.listen(8787, '127.0.0.1', () => resolve());
  });
  store.setGatewayRuntime(true);
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

async function handleModels(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!authorize(request, 'models:read')) {
    writeJson(response, 401, { error: { message: 'Invalid or unauthorized gateway API key.', type: 'unauthorized' } });
    store.recordGatewayLog('GET', '/v1/models', 401, null, headersToObject(request));
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
  store.recordGatewayLog('GET', '/v1/models', 200, null, headersToObject(request));
}

async function handleChatCompletions(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!authorize(request, 'chat:write')) {
    writeJson(response, 401, { error: { message: 'Invalid or unauthorized gateway API key.', type: 'unauthorized' } });
    store.recordGatewayLog('POST', '/v1/chat/completions', 401, null, headersToObject(request));
    return;
  }
  const body = await readJsonBody(request);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastUser = [...messages].reverse().find((message) => message?.role === 'user');
  const content = typeof lastUser?.content === 'string' ? lastUser.content : JSON.stringify(lastUser?.content ?? '');
  const modelId = store.resolveGatewayModelId(typeof body.model === 'string' ? body.model : undefined);
  const result = store.sendMessage({
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
  writeJson(response, 200, payload);
  store.recordGatewayLog('POST', '/v1/chat/completions', 200, result.requestLog.id, headersToObject(request));
}

async function handleEmbeddings(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!authorize(request, 'embeddings:write')) {
    writeJson(response, 401, { error: { message: 'Invalid or unauthorized gateway API key.', type: 'unauthorized' } });
    store.recordGatewayLog('POST', '/v1/embeddings', 401, null, headersToObject(request));
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
  store.recordGatewayLog('POST', '/v1/embeddings', 200, null, headersToObject(request));
}

function authorize(request: IncomingMessage, scope: 'models:read' | 'chat:write' | 'embeddings:write'): boolean {
  const auth = request.headers.authorization ?? '';
  const token = Array.isArray(auth) ? auth[0] : auth;
  const rawKey = token.startsWith('Bearer ') ? token.slice('Bearer '.length).trim() : '';
  return Boolean(rawKey && store.validateGatewayKey(rawKey, scope));
}

function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error('Request body too large.'));
      }
    });
    request.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {});
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });
    request.on('error', reject);
  });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': 'http://127.0.0.1',
  });
  response.end(JSON.stringify(payload));
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
