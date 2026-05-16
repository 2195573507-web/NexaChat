import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IPC_PERMISSION_BY_CHANNEL,
  SECURITY_PERMISSION_KEYS,
  evaluatePermission,
} from '../src/shared/securityRuntime';
import { IPC_CHANNEL_LIST } from '../src/shared/ipc';

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
  dataDir = join(process.cwd(), 'test-results', `round-11-security-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
});

afterEach(async () => {
  const { closeDatabase } = await import('../src/main/database/connection');
  closeDatabase();
  delete process.env.NEXACHAT_DATA_DIR;
  vi.resetModules();
});

describe('Round 11 security runtime', () => {
  it('maps every IPC channel to a centralized permission key', () => {
    expect(Object.keys(IPC_PERMISSION_BY_CHANNEL).sort()).toEqual([...IPC_CHANNEL_LIST].sort());
    for (const permission of Object.values(IPC_PERMISSION_BY_CHANNEL)) {
      expect(SECURITY_PERMISSION_KEYS).toContain(permission);
    }
  });

  it('evaluates role grants and ACL denies before sensitive actions', () => {
    expect(evaluatePermission({
      userId: 'owner',
      roleId: 'owner',
      permissionKey: 'gateway:key:write',
    }).allowed).toBe(true);

    const viewer = evaluatePermission({
      userId: 'viewer',
      roleId: 'viewer',
      permissionKey: 'gateway:key:write',
    });
    expect(viewer.allowed).toBe(false);
    expect(viewer.reason).toBe('missing-permission');

    const denied = evaluatePermission({
      userId: 'owner',
      roleId: 'owner',
      permissionKey: 'gateway:key:write',
      resourceType: 'gateway_api_key',
      resourceId: 'gkey_blocked',
      aclGrants: [{
        subjectType: 'user',
        subjectId: 'owner',
        resourceType: 'gateway_api_key',
        resourceId: 'gkey_blocked',
        permissionKey: 'gateway:key:write',
        effect: 'deny',
        expiresAt: null,
      }],
    });
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('acl-deny');
  });

  it('bootstraps local admin session enforces ACL denial and records audit hash integrity', async () => {
    const { store } = await import('../src/main/services/store');
    const security = store.getSecurityState();
    expect(security.activeUser.id).toBe('user_local_admin');
    expect(security.activeRole.id).toBe('owner');
    expect(security.activeRole.permissionKeys).toContain('gateway:key:write');

    const created = store.createGatewayKey({ name: 'Round 11 secure key' });
    expect(created.key).toMatch(/^nxk_/);
    expect(created.record.keyPreview).not.toContain(created.key);

    const auditCountBeforeSnapshot = store.getAuditLogs().length;
    store.getSnapshot();
    expect(store.getAuditLogs()).toHaveLength(auditCountBeforeSnapshot);

    const before = store.verifyAuditIntegrity();
    expect(before.status).toBe('verified');
    expect(before.checkedCount).toBeGreaterThan(0);

    const db = store.getRawDatabaseForTesting();
    db.prepare(
      `INSERT INTO acl_grants (id, subject_type, subject_id, resource_type, resource_id, permission_key, effect, created_at, expires_at)
       VALUES (?, 'user', ?, 'gateway_api_key', ?, 'gateway:key:write', 'deny', ?, NULL)`,
    ).run('acl_test_deny', security.activeUser.id, created.record.id, Date.now());

    expect(() => store.revokeGatewayKey(created.record.id)).toThrow(/gateway:key:write/);
    expect(store.searchAuditLogs('security.permission.denied').length).toBeGreaterThan(0);
    const after = store.verifyAuditIntegrity();
    expect(after.status).toBe('verified');

    const exportResult = store.exportAuditLogs();
    expect(exportResult.redacted).toBe(true);
    expect(exportResult.content).not.toContain(created.key);
    expect(exportResult.integrity.status).toBe('verified');
  });

  it('detects audit hash tampering', async () => {
    const { store } = await import('../src/main/services/store');
    store.createSnapshot();
    expect(store.verifyAuditIntegrity().status).toBe('verified');

    const first = store.getAuditLogs().at(-1);
    expect(first).toBeTruthy();
    store.getRawDatabaseForTesting()
      .prepare('UPDATE audit_logs SET details_json = ? WHERE id = ?')
      .run('tampered', first!.id);

    const report = store.verifyAuditIntegrity();
    expect(report.status).toBe('broken');
    expect(report.firstBrokenAuditId).toBe(first!.id);
  });
});
