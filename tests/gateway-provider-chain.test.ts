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
  dataDir = join(process.cwd(), 'test-results', `round-06-gateway-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
  upstream = createServer(handleUpstream);
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
    expect(body.nexachat?.requestLogId).toBeTruthy();
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 502)).toBe(true);
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
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 200 && entry.path === '/v1/responses' && entry.requestLogId === body.nexachat?.requestLogId)).toBe(true);
  });

  it('forwards /v1/embeddings through the configured embedding provider and records usage', async () => {
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
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model.name,
        input: ['embedding request'],
      }),
    });
    const body = await response.json() as {
      object?: string;
      data?: Array<{ embedding?: number[] }>;
      usage?: { estimated?: boolean };
      nexachat?: { strategy?: string; providerId?: string | null; modelId?: string | null; requestLogId?: string | null };
    };

    expect(response.status).toBe(200);
    expect(body.object).toBe('list');
    expect(body.data?.[0]?.embedding).toEqual([0.5, 0.25, 0.75]);
    expect(body.usage?.estimated).toBe(false);
    expect(body.nexachat).toMatchObject({ strategy: 'vector', providerId: provider.id, modelId: model.id });
    expect(store.getUsageRecords().some((record) => record.requestType === 'embeddings' && record.requestLogId === body.nexachat?.requestLogId)).toBe(true);
    expect(store.getGatewayLogs().some((entry) => entry.statusCode === 200 && entry.path === '/v1/embeddings' && entry.requestLogId === body.nexachat?.requestLogId)).toBe(true);
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

function handleUpstream(request: IncomingMessage, response: ServerResponse): void {
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
    writeJson(response, upstreamStatus, upstreamStatus === 200
      ? {
          object: 'list',
          data: [{ object: 'embedding', index: 0, embedding: [0.5, 0.25, 0.75] }],
          model: 'gateway-embedding',
          usage: { prompt_tokens: 2, total_tokens: 2 },
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
