import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let upstream: Server | null = null;
let gateway: Server | null = null;
let upstreamBaseUrl = '';
let dataDir = '';
let upstreamStatus = 200;
let upstreamMode: 'json' | 'stream' = 'json';
let upstreamRequests: RecordedUpstreamRequest[] = [];

type RecordedUpstreamRequest = {
  method: string;
  url: string;
  headers: IncomingMessage['headers'];
  bodyText: string;
  bodyJson: unknown | null;
};

vi.mock('electron', () => ({
  app: {
    getPath: () => dataDir,
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value, 'utf8'),
    decryptString: (value: Buffer) => value.toString('utf8'),
  },
}));

beforeEach(async () => {
  vi.resetModules();
  upstreamStatus = 200;
  upstreamMode = 'json';
  upstreamRequests = [];
  dataDir = join(process.cwd(), 'test-results', `round-06-gateway-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
  upstream = createServer((request, response) => {
    void handleUpstream(request, response).catch((error) => {
      writeJson(response, 500, { error: { message: error instanceof Error ? error.message : String(error) } });
    });
  });
  await new Promise<void>((resolve) => upstream?.listen(0, '127.0.0.1', resolve));
  const address = upstream.address();
  if (!address || typeof address === 'string') throw new Error('Missing upstream address.');
  upstreamBaseUrl = `http://127.0.0.1:${address.port}/v1`;
});

afterEach(async () => {
  const { closeDatabase } = await import('../src/main/database/connection');
  closeDatabase();
  delete process.env.NEXACHAT_DATA_DIR;
  await closeServer(gateway);
  await closeServer(upstream);
  gateway = null;
  upstream = null;
  vi.resetModules();
});

describe('local gateway provider forwarding chain', () => {
  it('lists enabled models with gateway metadata without disturbing provider execution coverage', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Model List Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-secret',
    });
    const chatModel = store.createModel({ providerId: provider.id, name: 'gateway-chat', supportsStreaming: false });
    const embeddingModel = store.createModel({ providerId: provider.id, name: 'gateway-embedding', supportsStreaming: false, supportsEmbeddings: true });
    const createdKey = store.createGatewayKey({
      name: 'Round models gateway smoke',
      scopes: ['models:read'],
      quotaLimit: 10,
      rateLimitPerMinute: 10,
    });
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/models`, {
      headers: {
        authorization: `Bearer ${createdKey.key}`,
      },
    });
    const body = await response.json() as {
      object?: string;
      data?: Array<{ id?: string; nexachat?: { modelId?: string; supportsEmbeddings?: boolean } }>;
    };

    expect(response.status).toBe(200);
    expect(body.object).toBe('list');
    expect(body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: chatModel.name, nexachat: expect.objectContaining({ modelId: chatModel.id, supportsEmbeddings: false }) }),
      expect.objectContaining({ id: embeddingModel.name, nexachat: expect.objectContaining({ modelId: embeddingModel.id, supportsEmbeddings: true }) }),
    ]));
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 200 && entry.path === '/v1/models')).toBe(true);
    expect(store.getUsageRecords()).toHaveLength(0);
  });

  it('forwards /v1/chat/completions through the real provider adapter chain', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Mock Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-secret',
    });
    const model = store.createModel({ providerId: provider.id, name: 'gateway-chat', supportsStreaming: false });
    await store.testProvider(provider.id);
    const createdKey = store.createGatewayKey('Round 6 gateway smoke');
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createdKey.key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model.name,
        messages: [{ role: 'user', content: 'gateway should forward' }],
      }),
    });
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }>; nexachat?: { requestLogId?: string } };

    expect(response.status).toBe(200);
    expect(body.choices?.[0]?.message?.content).toBe('gateway upstream response');
    expect(JSON.stringify(body)).not.toContain('Mock response');
    expect(JSON.stringify(body)).not.toContain('本地历史');
    expect(body.nexachat?.requestLogId).toBeTruthy();
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 200 && entry.requestLogId === body.nexachat?.requestLogId)).toBe(true);
    expect(store.getUsageRecords().some((record) => record.requestLogId === body.nexachat?.requestLogId && record.requestType === 'gateway_chat' && record.status === 'completed')).toBe(true);
  });

  it('returns a gateway error when the shared provider chain fails', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Failing Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-secret',
    });
    store.createModel({ providerId: provider.id, name: 'gateway-chat', supportsStreaming: false });
    const createdKey = store.createGatewayKey('Round 6 gateway smoke');
    upstreamStatus = 500;
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createdKey.key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gateway-chat',
        messages: [{ role: 'user', content: 'gateway should fail clearly' }],
      }),
    });
    const body = await response.json() as { error?: { type?: string; message?: string }; nexachat?: { requestLogId?: string } };

    expect(response.status).toBe(502);
    expect(body.error?.type).toBe('provider_upstream_error');
    expect(body.error?.message).toBe('Provider invocation failed.');
    expect(body.nexachat?.requestLogId).toBeTruthy();
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 502)).toBe(true);
    expect(store.getUsageRecords().some((record) => record.requestLogId === body.nexachat?.requestLogId && record.requestType === 'gateway_chat' && record.status === 'failed')).toBe(true);
  });

  it('maps /v1/responses basic text input through the same audited provider chain', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Responses Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-secret',
    });
    const model = store.createModel({ providerId: provider.id, name: 'gateway-chat', supportsStreaming: false });
    const createdKey = store.createGatewayKey({
      name: 'Round responses gateway smoke',
      scopes: ['chat:write'],
      quotaLimit: 10,
      rateLimitPerMinute: 10,
    });
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createdKey.key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model.name,
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: 'gateway responses should forward' }],
          },
        ],
      }),
    });
    const body = await response.json() as {
      object?: string;
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
      nexachat?: { mode?: string; requestLogId?: string; unsupported?: string[] };
    };

    expect(response.status).toBe(200);
    expect(body.object).toBe('response');
    expect(body.output_text).toBe('gateway upstream response');
    expect(body.output?.[0]?.content?.[0]).toMatchObject({ type: 'output_text', text: 'gateway upstream response' });
    expect(body.nexachat?.mode).toBe('basic-text');
    expect(body.nexachat?.unsupported).toContain('tools');
    expect(body.nexachat?.requestLogId).toBeTruthy();
    expect(store.getUsageRecords()).toHaveLength(1);
    expect(store.getUsageRecords()[0]).toMatchObject({ requestType: 'gateway_responses', status: 'completed' });
    expect(store.getRequestLogs().find((entry) => entry.id === body.nexachat?.requestLogId)).toMatchObject({
      endpoint: '/v1/responses',
    });
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 200 && entry.path === '/v1/responses' && entry.requestLogId === body.nexachat?.requestLogId)).toBe(true);
  });

  it('forwards /v1/embeddings only through the configured embedding provider, redacts logs, and records usage', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Embedding Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-embedding-secret',
    });
    const model = store.createModel({ providerId: provider.id, name: 'gateway-embedding', supportsStreaming: false, supportsEmbeddings: true });
    const createdKey = store.createGatewayKey({
      name: 'Round embeddings gateway smoke',
      scopes: ['embeddings:write'],
      quotaLimit: 10,
      rateLimitPerMinute: 10,
    });
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createdKey.key}`,
        'x-api-key': 'sk-client-gateway-header-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model.name,
        input: ['embedding request with sk-client-embedding-input-secret', 'second vector'],
      }),
    });
    const body = await response.json() as {
      object?: string;
      data?: Array<{ embedding?: number[] }>;
      usage?: { estimated?: boolean };
      nexachat?: { strategy?: string; providerId?: string | null; modelId?: string | null; requestLogId?: string | null };
    };
    const embeddingUpstreamRequests = upstreamRequests.filter((entry) => entry.url === '/v1/embeddings');
    const upstreamBody = embeddingUpstreamRequests[0]?.bodyJson as { model?: string; input?: string[] } | undefined;
    const requestLog = store.getRequestLogs().find((entry) => entry.id === body.nexachat?.requestLogId);
    const requestSummary = JSON.parse(requestLog?.requestSummaryJson ?? '{}') as {
      adapter?: string;
      inputCount?: number;
      requestType?: string;
      inputHash?: string;
      headers?: Record<string, string>;
    };
    const usageRecord = store.getUsageRecords().find((record) => record.requestLogId === body.nexachat?.requestLogId);
    const gatewayLog = store.getGatewayLogs().find((entry) => entry.statusCode === 200 && entry.path === '/v1/embeddings' && entry.requestLogId === body.nexachat?.requestLogId);

    expect(response.status).toBe(200);
    expect(body.object).toBe('list');
    expect(body.data?.map((item) => item.embedding)).toEqual([[0.5, 0.25, 0.75], [0.6, 0.25, 0.75]]);
    expect(body.usage?.estimated).toBe(false);
    expect(body.nexachat).toMatchObject({ strategy: 'vector', providerId: provider.id, modelId: model.id });
    expect(embeddingUpstreamRequests).toHaveLength(1);
    expect(embeddingUpstreamRequests[0]?.headers.authorization).toBe('Bearer sk-gateway-embedding-secret');
    expect(upstreamBody).toMatchObject({
      model: model.name,
      input: ['embedding request with sk-client-embedding-input-secret', 'second vector'],
    });
    expect(requestLog).toMatchObject({
      providerId: provider.id,
      modelId: model.id,
      status: 'completed',
      endpoint: '/v1/embeddings',
    });
    expect(requestLog?.gatewayRequestId).toMatch(/^gwemb_/);
    expect(requestLog?.requestSummaryJson).not.toContain('sk-gateway-embedding-secret');
    expect(requestLog?.requestSummaryJson).not.toContain('sk-client-embedding-input-secret');
    expect(requestSummary).toMatchObject({
      adapter: 'openai-compatible',
      inputCount: 2,
      requestType: 'embeddings',
    });
    expect(requestSummary.inputHash).toMatch(/^[a-f0-9]{16}$/);
    expect(requestSummary.headers?.authorization).toBe('[REDACTED]');
    expect(usageRecord).toMatchObject({
      providerId: provider.id,
      modelId: model.id,
      requestType: 'embeddings',
      inputTokens: 4,
      outputTokens: 0,
      totalTokens: 4,
      tokenUsageEstimated: false,
      status: 'completed',
    });
    expect(gatewayLog?.redactedHeadersJson).not.toContain(createdKey.key);
    expect(gatewayLog?.redactedHeadersJson).not.toContain('sk-client-gateway-header-secret');
    expect(gatewayLog?.redactedHeadersJson).toContain('[REDACTED]');
  });

  it('does not fabricate /v1/embeddings when no provider-backed embedding model is configured', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Chat-Only Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-chat-only-secret',
    });
    const chatOnlyModel = store.createModel({ providerId: provider.id, name: 'gateway-chat-only', supportsStreaming: false, supportsEmbeddings: false });
    const createdKey = store.createGatewayKey({
      name: 'Round embeddings no fake vector',
      scopes: ['embeddings:write'],
      quotaLimit: 10,
      rateLimitPerMinute: 10,
    });
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createdKey.key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: chatOnlyModel.name,
        input: ['should not receive a lexical fake vector'],
      }),
    });
    const body = await response.json() as {
      data?: unknown;
      nexachat?: unknown;
      error?: { type?: string; message?: string };
    };

    expect(response.status).toBe(400);
    expect(body.error?.type).toBe('invalid_request');
    expect(body.error?.message).toContain('does not support embeddings');
    expect(body.data).toBeUndefined();
    expect(body.nexachat).toBeUndefined();
    expect(upstreamRequests.filter((entry) => entry.url === '/v1/embeddings')).toHaveLength(0);
    expect(store.getRequestLogs().filter((entry) => entry.endpoint === '/v1/embeddings')).toHaveLength(0);
    expect(store.getUsageRecords().filter((record) => record.requestType === 'embeddings')).toHaveLength(0);
    expect(store.getGatewayLogs().some((entry) => entry.path === '/v1/embeddings' && entry.statusCode === 400 && entry.errorCode === 'invalid_request')).toBe(true);
  });

  it('rejects malformed /v1/embeddings JSON before invoking the provider or recording usage', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Malformed Embedding Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-embedding-secret',
    });
    store.createModel({ providerId: provider.id, name: 'gateway-embedding', supportsStreaming: false, supportsEmbeddings: true });
    const createdKey = store.createGatewayKey({
      name: 'Round embeddings malformed request',
      scopes: ['embeddings:write'],
      quotaLimit: 10,
      rateLimitPerMinute: 10,
    });
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createdKey.key}`,
        'content-type': 'application/json',
      },
      body: '{"input":',
    });
    const body = await response.json() as { error?: { type?: string } };

    expect(response.status).toBe(400);
    expect(body.error?.type).toBe('invalid_json');
    expect(upstreamRequests.filter((entry) => entry.url === '/v1/embeddings')).toHaveLength(0);
    expect(store.getRequestLogs().filter((entry) => entry.endpoint === '/v1/embeddings')).toHaveLength(0);
    expect(store.getUsageRecords().filter((record) => record.requestType === 'embeddings')).toHaveLength(0);
    expect(store.getGatewayLogs().some((entry) => entry.path === '/v1/embeddings' && entry.statusCode === 400 && entry.errorCode === 'invalid_json')).toBe(true);
  });

  it('streams /v1/chat/completions as OpenAI-compatible SSE chunks', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Streaming Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-secret',
    });
    const model = store.createModel({ providerId: provider.id, name: 'gateway-chat', supportsStreaming: true });
    const createdKey = store.createGatewayKey('Round streaming gateway smoke');
    upstreamMode = 'stream';
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createdKey.key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model.name,
        stream: true,
        messages: [{ role: 'user', content: 'gateway should stream' }],
      }),
    });
    const text = await response.text();
    const events = parseSse(text);
    const chunks = events
      .filter((event) => event.data !== '[DONE]' && event.event === null)
      .map((event) => JSON.parse(event.data) as { choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }> });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(chunks.map((chunk) => chunk.choices?.[0]?.delta?.content).filter(Boolean)).toEqual(['gateway ', 'streaming ', 'response']);
    expect(chunks.some((chunk) => chunk.choices?.[0]?.finish_reason === 'stop')).toBe(true);
    expect(events.some((event) => event.event === 'nexachat.completed')).toBe(true);
    expect(events.at(-1)?.data).toBe('[DONE]');
    expect(JSON.stringify(chunks)).not.toContain('Mock response');
    expect(store.getUsageRecords()).toHaveLength(1);
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 200 && entry.path === '/v1/chat/completions')).toBe(true);
  });

  it('returns SSE content when the client requests streaming but the selected model uses a JSON upstream response', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway JSON Upstream Stream Request',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-secret',
    });
    const model = store.createModel({ providerId: provider.id, name: 'gateway-chat', supportsStreaming: false });
    const createdKey = store.createGatewayKey('Round json gateway stream smoke');
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createdKey.key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model.name,
        stream: true,
        messages: [{ role: 'user', content: 'gateway should stream json fallback' }],
      }),
    });
    const events = parseSse(await response.text());
    const chunks = events
      .filter((event) => event.data !== '[DONE]' && event.event === null)
      .map((event) => JSON.parse(event.data) as { choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }> });

    expect(response.status).toBe(200);
    expect(chunks.map((chunk) => chunk.choices?.[0]?.delta?.content).filter(Boolean)).toEqual(['gateway upstream response']);
    expect(chunks.some((chunk) => chunk.choices?.[0]?.finish_reason === 'stop')).toBe(true);
    expect(events.some((event) => event.event === 'nexachat.completed')).toBe(true);
    expect(events.at(-1)?.data).toBe('[DONE]');
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 200 && entry.path === '/v1/chat/completions')).toBe(true);
  });

  it('rejects unauthorized streaming requests before opening SSE', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Unauthorized Streaming Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-secret',
    });
    store.createModel({ providerId: provider.id, name: 'gateway-chat', supportsStreaming: true });
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer nxk_invalid',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gateway-chat',
        stream: true,
        messages: [{ role: 'user', content: 'should not stream' }],
      }),
    });
    const body = await response.json() as { error?: { type?: string } };

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body.error?.type).toBe('invalid_key');
    expect(store.getUsageRecords()).toHaveLength(0);
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 401 && entry.errorCode === 'invalid_key')).toBe(true);
  });

  it('enforces streaming quota before opening SSE', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const provider = store.createProvider({
      name: 'Gateway Quota Streaming Upstream',
      type: 'openai-compatible',
      baseUrl: upstreamBaseUrl,
      apiKey: 'sk-gateway-secret',
    });
    store.createModel({ providerId: provider.id, name: 'gateway-chat', supportsStreaming: true });
    const createdKey = store.createGatewayKey({
      name: 'Round streaming quota key',
      scopes: ['chat:write'],
      quotaLimit: 0,
      rateLimitPerMinute: 10,
    });
    gateway = createLocalGatewayServer();
    const gatewayUrl = await listen(gateway);

    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createdKey.key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gateway-chat',
        stream: true,
        messages: [{ role: 'user', content: 'quota should stop stream' }],
      }),
    });
    const body = await response.json() as { error?: { type?: string } };

    expect(response.status).toBe(429);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body.error?.type).toBe('quota_exceeded');
    expect(store.getUsageRecords()).toHaveLength(0);
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 429 && entry.errorCode === 'quota_exceeded')).toBe(true);
  });
});

async function handleUpstream(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const bodyText = await readBody(request);
  let bodyJson: unknown | null = null;
  try {
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    bodyJson = null;
  }
  upstreamRequests.push({
    method: request.method ?? 'GET',
    url: request.url ?? '/',
    headers: request.headers,
    bodyText,
    bodyJson,
  });

  if (request.url === '/v1/models') {
    writeJson(response, upstreamStatus, upstreamStatus === 200 ? { object: 'list', data: [{ id: 'gateway-chat', object: 'model' }] } : { error: { message: 'upstream failed' } });
    return;
  }
  if (request.url === '/v1/chat/completions') {
    if (upstreamMode === 'stream' && upstreamStatus === 200) {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.write('data: {"choices":[{"delta":{"content":"gateway "}}]}\n\n');
      response.write('data: {"choices":[{"delta":{"content":"streaming "}}]}\n\n');
      response.write('data: {"choices":[{"delta":{"content":"response"},"finish_reason":"stop"}],"usage":{"prompt_tokens":4,"completion_tokens":6,"total_tokens":10}}\n\n');
      response.end('data: [DONE]\n\n');
      return;
    }
    writeJson(response, upstreamStatus, upstreamStatus === 200
      ? {
          id: 'gateway_chatcmpl_test',
          object: 'chat.completion',
          model: 'gateway-chat',
          choices: [{ index: 0, message: { role: 'assistant', content: 'gateway upstream response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 4, completion_tokens: 6, total_tokens: 10 },
        }
      : { error: { message: 'upstream failed' } });
    return;
  }
  if (request.url === '/v1/embeddings') {
    const input = Array.isArray((bodyJson as { input?: unknown } | null)?.input)
      ? (bodyJson as { input: unknown[] }).input
      : [(bodyJson as { input?: unknown } | null)?.input].filter((item) => item !== undefined);
    const data = input.map((_, index) => ({
      object: 'embedding',
      index,
      embedding: [0.5 + index * 0.1, 0.25, 0.75],
    }));
    writeJson(response, upstreamStatus, upstreamStatus === 200
      ? {
          object: 'list',
          data,
          model: 'gateway-embedding',
          usage: { prompt_tokens: data.length * 2, total_tokens: data.length * 2 },
        }
      : { error: { message: 'upstream failed' } });
    return;
  }
  writeJson(response, 404, { error: { message: 'not found' } });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => resolve(data));
    request.on('error', reject);
  });
}

function parseSse(text: string): Array<{ event: string | null; data: string }> {
  return text
    .split(/\n\n/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith(':'))
    .map((block) => {
      const eventLine = block.split(/\n/).find((line) => line.startsWith('event: '));
      const dataLine = block.split(/\n/).find((line) => line.startsWith('data: '));
      return {
        event: eventLine ? eventLine.slice('event: '.length) : null,
        data: dataLine ? dataLine.slice('data: '.length) : '',
      };
    })
    .filter((event) => event.data);
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing gateway address.');
  return `http://127.0.0.1:${address.port}`;
}

function closeServer(target: Server | null): Promise<void> {
  if (!target) return Promise.resolve();
  return new Promise((resolve, reject) => target.close((error) => (error ? reject(error) : resolve())));
}
