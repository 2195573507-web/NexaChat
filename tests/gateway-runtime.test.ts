import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let gateway: Server | null = null;
let dataDir = '';

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

beforeEach(() => {
  vi.resetModules();
  dataDir = join(process.cwd(), 'test-results', `round-08-gateway-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
});

afterEach(async () => {
  const { closeDatabase } = await import('../src/main/database/connection');
  closeDatabase();
  delete process.env.NEXACHAT_DATA_DIR;
  await closeServer(gateway);
  gateway = null;
  vi.resetModules();
});

describe('Round 8 gateway runtime authority', () => {
  it('enforces missing invalid scope quota rate disabled revoked and rotated key states', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const created = store.createGatewayKey({
      name: 'Round 8 scoped key',
      scopes: ['models:read'],
      quotaLimit: 2,
      rateLimitPerMinute: 1,
    });
    gateway = createLocalGatewayServer();
    const url = await listen(gateway);

    expect(await status(url, null)).toBe(401);
    expect(await status(url, 'nxk_invalid')).toBe(401);
    expect(await chatStatus(url, created.key)).toBe(403);
    expect(await status(url, created.key)).toBe(200);
    expect(await status(url, created.key)).toBe(429);

    const rotated = store.rotateGatewayKey({ gatewayKeyId: created.record.id });
    expect(store.getGatewayKeys().find((key) => key.id === created.record.id)?.state).toBe('revoked');
    expect(await status(url, created.key)).toBe(401);

    store.updateGatewayKey({ gatewayKeyId: rotated.record.id, disabled: true });
    expect(await status(url, rotated.key)).toBe(403);

    const logs = store.getGatewayLogs();
    expect(logs.some((log) => log.errorCode === 'missing_key')).toBe(true);
    expect(logs.some((log) => log.errorCode === 'invalid_key')).toBe(true);
    expect(logs.some((log) => log.errorCode === 'scope_denied')).toBe(true);
    expect(logs.some((log) => log.errorCode === 'rate_limited')).toBe(true);
    expect(logs.some((log) => log.errorCode === 'revoked_key')).toBe(true);
    expect(logs.some((log) => log.errorCode === 'disabled_key')).toBe(true);
    expect(logs.some((log) => log.keyPreview === rotated.record.keyPreview)).toBe(true);
  });

  it('applies import metadata with rollback snapshot and can disable imported records on rollback', async () => {
    const { store } = await import('../src/main/services/store');
    const result = store.validateImportManifest(JSON.stringify({
      source: 'sub2api',
      providers: [{ name: 'Imported Round 8 Provider', baseUrl: 'http://127.0.0.1:11434/v1' }],
      models: [{ providerName: 'Imported Round 8 Provider', name: 'imported-chat' }],
      gatewayKeys: [{ name: 'Imported template', scopes: ['models:read'] }],
    }));
    expect(result.status).toBe('ready');

    const applied = store.applyImportPlan(result.id, { mode: 'apply-metadata' });
    expect(applied.status).toBe('completed');
    expect(applied.rollbackSnapshotId).toBeTruthy();
    expect(store.getProviders().some((provider) => provider.name === 'Imported Round 8 Provider' && provider.enabled)).toBe(true);
    expect(store.getModels().some((model) => model.name === 'imported-chat' && model.enabled)).toBe(true);

    const rolledBack = store.restoreSnapshot(applied.id, { mode: 'rollback' });
    expect(rolledBack.status).toBe('completed');
    expect(store.getProviders().some((provider) => provider.name === 'Imported Round 8 Provider' && provider.enabled)).toBe(false);
    expect(store.getModels().some((model) => model.name === 'imported-chat' && model.enabled)).toBe(false);
  });

  it('separates available gateway endpoints from reserved responses and serves embeddings', async () => {
    const { store } = await import('../src/main/services/store');
    const { createLocalGatewayServer } = await import('../src/main/services/localGateway');
    const created = store.createGatewayKey({
      name: 'Round mainline endpoint key',
      scopes: ['models:read', 'embeddings:write'],
      quotaLimit: 10,
      rateLimitPerMinute: 10,
    });
    gateway = createLocalGatewayServer();
    const url = await listen(gateway);

    expect(store.getGatewayStatus().endpoints).toEqual(['/v1/models', '/v1/chat/completions', '/v1/embeddings']);
    expect(store.getGatewayStatus().endpoints).not.toContain('/v1/responses');

    const reserved = await fetch(`${url}/v1/responses`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${created.key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ input: 'reserved' }),
    });
    const reservedBody = await reserved.json() as { error: { type: string } };
    expect(reserved.status).toBe(501);
    expect(reservedBody.error.type).toBe('reserved_endpoint');

    const embeddings = await fetch(`${url}/v1/embeddings`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${created.key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ input: ['hello', 'nexachat'] }),
    });
    const embeddingsBody = await embeddings.json() as { object: string; data: Array<{ embedding: number[] }>; nexachat: { strategy: string } };
    expect(embeddings.status).toBe(200);
    expect(embeddingsBody.object).toBe('list');
    expect(embeddingsBody.data).toHaveLength(2);
    expect(embeddingsBody.data[0].embedding.length).toBeGreaterThan(0);
    expect(embeddingsBody.nexachat.strategy).toBe('lexical');
  });
});

async function status(baseUrl: string, key: string | null): Promise<number> {
  const headers: Record<string, string> = key ? { authorization: `Bearer ${key}` } : {};
  const response = await fetch(`${baseUrl}/v1/models`, { headers });
  return response.status;
}

async function chatStatus(baseUrl: string, key: string): Promise<number> {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'scope denied' }] }),
  });
  return response.status;
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
