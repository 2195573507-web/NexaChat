import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let dataDir = '';
let encryptionAvailable = false;
let previousNodeEnv: string | undefined;
let previousVitest: string | undefined;
let previousDevServerUrl: string | undefined;
let previousElectronSmoke: string | undefined;
let previousFallbackFlag: string | undefined;

vi.mock('electron', () => ({
  app: {
    getPath: () => dataDir,
  },
  safeStorage: {
    isEncryptionAvailable: () => encryptionAvailable,
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`, 'utf8'),
    decryptString: (value: Buffer) => value.toString('utf8').replace(/^encrypted:/, ''),
  },
}));

beforeEach(() => {
  vi.resetModules();
  encryptionAvailable = false;
  previousNodeEnv = process.env.NODE_ENV;
  previousVitest = process.env.VITEST;
  previousDevServerUrl = process.env.VITE_DEV_SERVER_URL;
  previousElectronSmoke = process.env.NEXACHAT_ELECTRON_SMOKE;
  previousFallbackFlag = process.env.NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE;
  dataDir = join(process.cwd(), 'test-results', `secret-storage-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
});

afterEach(async () => {
  const { closeDatabase } = await import('../src/main/database/connection');
  closeDatabase();
  delete process.env.NEXACHAT_DATA_DIR;
  restoreEnv('NODE_ENV', previousNodeEnv);
  restoreEnv('VITEST', previousVitest);
  restoreEnv('VITE_DEV_SERVER_URL', previousDevServerUrl);
  restoreEnv('NEXACHAT_ELECTRON_SMOKE', previousElectronSmoke);
  restoreEnv('NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE', previousFallbackFlag);
  vi.resetModules();
});

describe('secret storage fallback policy', () => {
  it('uses Electron safeStorage when encryption is available', async () => {
    encryptionAvailable = true;
    process.env.NODE_ENV = 'production';
    delete process.env.VITEST;
    const { store } = await import('../src/main/services/store');

    const provider = store.createProvider({
      name: 'Safe Storage Provider',
      type: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: 'fake-safe-storage-secret',
    });
    const row = readStoredSecret(provider.secretRef);

    expect(row.encrypted_value).toMatch(/^safeStorage:v1:/);
    expect(row.encrypted_value).not.toContain('fake-safe-storage-secret');
  });

  it('allows clearly marked development fallback in tests only', async () => {
    process.env.NODE_ENV = 'test';
    const { store } = await import('../src/main/services/store');

    const provider = store.createProvider({
      name: 'Fallback Provider',
      type: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: 'fake-dev-fallback-secret',
    });
    const row = store.getRawDatabaseForTesting()
      .prepare('SELECT encrypted_value FROM secrets WHERE id = ?')
      .get(provider.secretRef) as { encrypted_value: string };

    expect(row.encrypted_value).toMatch(/^local-dev:v1:/);
    expect(row.encrypted_value).not.toContain('fake-dev-fallback-secret');
  });

  it('blocks saving new secrets in production when safeStorage is unavailable', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.VITEST;
    delete process.env.VITE_DEV_SERVER_URL;
    delete process.env.NEXACHAT_ELECTRON_SMOKE;
    delete process.env.NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE;
    await expect(import('../src/main/services/store')).rejects.toThrow(/Secure secret storage is unavailable/);
  });

  it('allows the explicit Electron smoke fallback marker without weakening production default', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.VITEST;
    delete process.env.VITE_DEV_SERVER_URL;
    delete process.env.NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE;
    process.env.NEXACHAT_ELECTRON_SMOKE = '1';
    const { store } = await import('../src/main/services/store');

    const created = store.createGatewayKey('Smoke fallback gateway key');
    const row = readStoredSecret(readGatewayKeySecretRef(created.record.id));

    expect(row.encrypted_value).toMatch(/^local-dev:v1:/);
    expect(row.encrypted_value).not.toContain(created.key);
  });

  it('keeps diagnostics and redaction free of raw fallback secrets', async () => {
    process.env.NODE_ENV = 'test';
    const { store } = await import('../src/main/services/store');

    store.createProvider({
      name: 'Redaction Provider',
      type: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: 'fake-redaction-storage-secret',
    });
    const diagnostics = store.exportDiagnostics();
    const content = JSON.stringify(diagnostics);

    expect(content).not.toContain('fake-redaction-storage-secret');
    expect(content).not.toContain('local-dev:v1:');
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function readStoredSecret(secretRef: string | null): { encrypted_value: string } {
  if (!secretRef) {
    throw new Error('Expected a stored secret ref.');
  }
  const db = new DatabaseSync(join(dataDir, 'nexachat.sqlite'));
  try {
    return db.prepare('SELECT encrypted_value FROM secrets WHERE id = ?').get(secretRef) as { encrypted_value: string };
  } finally {
    db.close();
  }
}

function readGatewayKeySecretRef(gatewayKeyId: string): string {
  const db = new DatabaseSync(join(dataDir, 'nexachat.sqlite'));
  try {
    const row = db.prepare('SELECT secret_ref FROM gateway_api_keys WHERE id = ?').get(gatewayKeyId) as { secret_ref: string } | undefined;
    if (!row?.secret_ref) {
      throw new Error('Expected a gateway key secret ref.');
    }
    return row.secret_ref;
  } finally {
    db.close();
  }
}
