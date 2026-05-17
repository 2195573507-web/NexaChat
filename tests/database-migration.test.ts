import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let dataDir = '';

vi.mock('electron', () => ({
  app: {
    getPath: () => dataDir,
  },
}));

beforeEach(() => {
  vi.resetModules();
  dataDir = join(process.cwd(), 'test-results', `database-migration-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
});

afterEach(async () => {
  const { closeDatabase } = await import('../src/main/database/connection');
  closeDatabase();
  delete process.env.NEXACHAT_DATA_DIR;
  vi.resetModules();
});

describe('database startup migrations', () => {
  it('adds workspace columns before current schema indexes are created', async () => {
    const databasePath = join(dataDir, 'nexachat.sqlite');
    const legacyDb = new DatabaseSync(databasePath);
    legacyDb.exec(`
      CREATE TABLE workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        default_provider_id TEXT,
        default_model_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO workspaces VALUES ('ws_default', 'Legacy workspace', NULL, NULL, 1, 1);
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        parent_message_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        provider_id TEXT,
        model_id TEXT,
        request_id TEXT,
        request_log_id TEXT,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE usage_records (
        id TEXT PRIMARY KEY,
        provider_id TEXT,
        model_id TEXT,
        request_log_id TEXT,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        cost_estimate REAL NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        size INTEGER NOT NULL,
        parse_status TEXT NOT NULL,
        chunk_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE knowledge_chunks (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        content TEXT NOT NULL,
        citation TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    legacyDb.close();

    const { getDatabase } = await import('../src/main/database/connection');
    const db = getDatabase().db;

    expect(getColumnNames(db, 'conversations')).toContain('workspace_id');
    expect(getColumnNames(db, 'messages')).toContain('workspace_id');
    expect(getColumnNames(db, 'usage_records')).toContain('workspace_id');
    expect(getColumnNames(db, 'files')).toEqual(expect.arrayContaining(['workspace_id', 'index_status', 'deleted_at']));
    expect(getColumnNames(db, 'knowledge_chunks')).toContain('status');
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_conversations_workspace_updated'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_files_workspace_status'").get()).toBeTruthy();
    for (const indexName of [
      'idx_gateway_logs_created',
      'idx_gateway_logs_key_created',
      'idx_gateway_logs_status_created',
      'idx_usage_records_created',
      'idx_usage_records_workspace_created',
      'idx_usage_records_provider_created',
      'idx_usage_records_model_created',
      'idx_audit_logs_created',
      'idx_audit_logs_actor_created',
      'idx_audit_logs_action_created',
      'idx_provider_health_created',
    ]) {
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?").get(indexName), indexName).toBeTruthy();
    }
  });
});

function getColumnNames(db: DatabaseSync, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((row) => row.name);
}
