import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let upstream: Server | null = null;
let gateway: Server | null = null;
let upstreamBaseUrl = '';
let dataDir = '';
let upstreamStatus = 200;

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
});

function handleUpstream(request: IncomingMessage, response: ServerResponse): void {
  if (request.url === '/v1/models') {
    writeJson(response, upstreamStatus, upstreamStatus === 200 ? { object: 'list', data: [{ id: 'gateway-chat', object: 'model' }] } : { error: { message: 'upstream failed' } });
    return;
  }
  if (request.url === '/v1/chat/completions') {
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
  writeJson(response, 404, { error: { message: 'not found' } });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
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
