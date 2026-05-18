import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATA_CONFIRMATION_PHRASES } from '../src/shared/dataRuntime';

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
  dataDir = join(process.cwd(), 'test-results', `round-12-data-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
});

afterEach(async () => {
  const { closeDatabase } = await import('../src/main/database/connection');
  closeDatabase();
  delete process.env.NEXACHAT_DATA_DIR;
  vi.resetModules();
});

describe('Round 12 data mobility runtime', () => {
  it('rejects malformed and empty manifests without applying data', async () => {
    const { store } = await import('../src/main/services/store');
    const malformed = store.validateImportManifest('{bad');
    const empty = store.validateImportManifest(JSON.stringify({ bad: true }));

    expect(malformed.status).toBe('failed');
    expect(empty.status).toBe('failed');
    expect(store.getDataMobilityJobs().filter((job) => job.operationKind === 'import')).toHaveLength(2);
    expect(store.getAuditLogs().some((log) => log.action === 'import.manifest.validated')).toBe(true);
  });

  it('preflights valid manifests with source conflict count and confirmation required', async () => {
    const { store } = await import('../src/main/services/store');
    store.createProvider({ name: 'Existing Provider', type: 'openai-compatible', baseUrl: 'http://127.0.0.1:11434/v1' });

    const result = store.validateImportManifest(JSON.stringify({
      source: 'ccs',
      providers: [{ name: 'Existing Provider', baseUrl: 'http://127.0.0.1:11434/v1' }],
      models: [{ providerName: 'Existing Provider', name: 'existing-model' }],
    }));

    expect(result.status).toBe('ready');
    expect(result.conflictCount).toBeGreaterThan(0);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.redacted).toBe(true);
    expect(store.getDataConflicts(result.id).some((conflict) => conflict.type === 'provider-name')).toBe(true);
  });

  it('applies metadata import with rollback snapshot and skips duplicate providers and models', async () => {
    const { store } = await import('../src/main/services/store');
    const result = store.validateImportManifest(JSON.stringify({
      source: 'sub2api',
      providers: [{ name: 'Imported Round 12 Provider', baseUrl: 'http://127.0.0.1:11434/v1' }],
      models: [{ providerName: 'Imported Round 12 Provider', name: 'round-12-model' }],
    }));

    const applied = store.applyImportPlan(result.id, {
      mode: 'apply-metadata',
      confirmationPhrase: DATA_CONFIRMATION_PHRASES.applyImport,
    });
    const replay = store.validateImportManifest(JSON.stringify({
      providers: [{ name: 'Imported Round 12 Provider', baseUrl: 'http://127.0.0.1:11434/v1' }],
      models: [{ providerName: 'Imported Round 12 Provider', name: 'round-12-model' }],
    }));
    const replayApplied = store.applyImportPlan(replay.id, {
      mode: 'apply-metadata',
      confirmationPhrase: DATA_CONFIRMATION_PHRASES.applyImport,
    });

    expect(applied.status).toBe('completed');
    expect(applied.rollbackSnapshotId).toBeTruthy();
    expect(JSON.parse(applied.appliedEntityIdsJson ?? '[]').length).toBe(2);
    expect(JSON.parse(replayApplied.appliedEntityIdsJson ?? '[]')).toHaveLength(0);
    expect(store.getRollbackRecords().some((record) => record.jobId === result.id && record.state === 'available')).toBe(true);
  });

  it('rolls back imported metadata without deleting existing local records', async () => {
    const { store } = await import('../src/main/services/store');
    const localProvider = store.createProvider({ name: 'Local Provider', type: 'openai-compatible', baseUrl: 'http://127.0.0.1:11434/v1' });
    const localModel = store.createModel({ providerId: localProvider.id, name: 'local-stays-enabled' });
    const result = store.validateImportManifest(JSON.stringify({
      providers: [{ name: 'Rollback Imported Provider', baseUrl: 'http://127.0.0.1:11434/v1' }],
      models: [{ providerName: 'Rollback Imported Provider', name: 'rollback-model' }],
    }));
    expect(() => store.applyImportPlan(result.id, { mode: 'apply-metadata' })).toThrow(/APPLY IMPORT|confirmation/i);
    store.applyImportPlan(result.id, {
      mode: 'apply-metadata',
      confirmationPhrase: DATA_CONFIRMATION_PHRASES.applyImport,
    });

    const rollback = store.getRollbackRecords().find((record) => record.jobId === result.id);
    expect(rollback).toBeTruthy();
    const rollbackJob = store.applyDataRollback({ rollbackId: rollback!.id, confirmationPhrase: DATA_CONFIRMATION_PHRASES.rollback });

    expect(rollbackJob.status).toBe('completed');
    expect(rollbackJob.manifestJson).toContain('import-created-metadata-only');
    expect(store.getProviders().find((provider) => provider.id === localProvider.id)?.enabled).toBe(true);
    expect(store.getModels().find((model) => model.id === localModel.id)?.enabled).toBe(true);
    expect(store.getProviders().some((provider) => provider.name === 'Rollback Imported Provider' && provider.enabled)).toBe(false);
    expect(store.getModels().some((model) => model.name === 'rollback-model' && model.enabled)).toBe(false);
    expect(store.getRollbackRecords().find((record) => record.id === rollback!.id)?.state).toBe('applied');
  });

  it('creates encrypted backup and restore preflight without plaintext secrets or local raw paths', async () => {
    const { store } = await import('../src/main/services/store');
    store.createProvider({
      name: 'Secret Provider',
      type: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: 'sk-round-12-secret',
    });

    const snapshot = store.createSnapshot();
    const diagnostics = store.exportDiagnostics();
    const backup = store.createEncryptedBackup({ passphrase: 'round-12-passphrase' });
    const preflight = store.createRestorePreflight({ backupId: backup.id, passphrase: 'round-12-passphrase' });

    expect(snapshot.manifestJson).not.toContain('sk-round-12-secret');
    expect(diagnostics.manifestJson).not.toContain(dataDir);
    expect(backup.packageJson).not.toContain('sk-round-12-secret');
    expect(backup.encrypted).toBe(true);
    expect(preflight.operationKind).toBe('restore-preflight');
    expect(preflight.status).toBe('ready');
  });

  it('stores provider secrets encoded and enforces data permissions', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({
      name: 'Encoded Provider',
      type: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: 'sk-not-plaintext',
    });
    const rawSecret = store.getRawDatabaseForTesting()
      .prepare('SELECT encrypted_value, preview FROM secrets WHERE id = ?')
      .get(provider.secretRef) as { encrypted_value: string; preview: string };
    expect(rawSecret.encrypted_value).not.toBe('sk-not-plaintext');
    expect(rawSecret.encrypted_value).not.toContain('sk-not-plaintext');
    expect(rawSecret.preview).not.toBe('sk-not-plaintext');

    store.getRawDatabaseForTesting()
      .prepare(
        `INSERT INTO acl_grants (id, subject_type, subject_id, resource_type, resource_id, permission_key, effect, created_at, expires_at)
         VALUES (?, 'user', 'user_local_admin', 'config_snapshot', NULL, 'data:export', 'deny', ?, NULL)`,
      )
      .run('acl_data_export_deny', Date.now());

    expect(() => store.createSnapshot()).toThrow(/data:export/);
    expect(store.searchAuditLogs('security.permission.denied').length).toBeGreaterThan(0);
  });
});
