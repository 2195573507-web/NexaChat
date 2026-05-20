import { mkdirSync, readFileSync } from 'node:fs';
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
      CREATE TABLE providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        base_url TEXT NOT NULL,
        proxy_url TEXT,
        auth_type TEXT NOT NULL,
        secret_ref TEXT,
        custom_headers_json TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        health_status TEXT NOT NULL,
        last_checked_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE models (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        model_name_snapshot TEXT NOT NULL,
        context_window INTEGER NOT NULL,
        supports_streaming INTEGER NOT NULL DEFAULT 1,
        supports_tools INTEGER NOT NULL DEFAULT 0,
        supports_vision INTEGER NOT NULL DEFAULT 0,
        supports_embeddings INTEGER NOT NULL DEFAULT 0,
        input_price REAL,
        output_price REAL,
        health_status TEXT NOT NULL,
        latency_ms INTEGER,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    legacyDb.close();

    const { getDatabase } = await import('../src/main/database/connection');
    const db = getDatabase().db;

    expect(getColumnNames(db, 'conversations')).toContain('workspace_id');
    expect(getColumnNames(db, 'messages')).toContain('workspace_id');
    expect(getColumnNames(db, 'usage_records')).toContain('workspace_id');
    expect(getColumnNames(db, 'files')).toEqual(expect.arrayContaining([
      'workspace_id',
      'knowledge_base_id',
      'index_status',
      'embedding_status',
      'parser_type',
      'token_count',
      'content_hash',
      'storage_ref',
      'metadata_json',
      'parse_started_at',
      'parse_completed_at',
      'deleted_at',
    ]));
    expect(getColumnNames(db, 'knowledge_chunks')).toEqual(expect.arrayContaining([
      'knowledge_base_id',
      'token_count',
      'content_hash',
      'source_start',
      'source_end',
      'page_number',
      'section_title',
      'status',
      'embedding_id',
      'metadata_json',
      'updated_at',
    ]));
    expect(getColumnNames(db, 'knowledge_retrieval_traces')).toEqual(expect.arrayContaining([
      'provider_id',
      'model_id',
      'model_name_snapshot',
      'knowledge_scope_json',
      'candidate_count',
      'vector_candidate_count',
      'lexical_candidate_count',
      'final_citation_count',
      'score_summary_json',
      'timings_json',
      'error_code',
      'error_message',
    ]));
    expect(getColumnNames(db, 'models')).toContain('deleted_at');
    expect(db.prepare("PRAGMA foreign_keys").get()).toMatchObject({ foreign_keys: 1 });
    expect(db.prepare("PRAGMA busy_timeout").get()).toMatchObject({ timeout: 5000 });
    expect(String((db.prepare("PRAGMA journal_mode").get() as { journal_mode?: string }).journal_mode).toLowerCase()).toBe('wal');
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migration_runs'").get()).toBeTruthy();
    expect(
      (db.prepare("SELECT version FROM schema_migration_runs WHERE status = 'completed' ORDER BY version").all() as Array<{ version: string }>).map((row) => row.version),
    ).toEqual(expect.arrayContaining(['schema-preflight-v1', 'schema-core-v1', 'schema-additive-v1']));
    expect(db.prepare("SELECT status FROM schema_migration_runs WHERE version = 'schema-additive-v1'").get()).toMatchObject({ status: 'completed' });
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
      'idx_files_deleted_updated',
      'idx_knowledge_chunks_status_created',
      'idx_knowledge_retrieval_traces_created',
      'idx_message_citations_message_score',
      'idx_message_citations_created',
    ]) {
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?").get(indexName), indexName).toBeTruthy();
    }
  });

  it('keeps migration transaction start inside failure recording guard', () => {
    const source = readFileSync(join(process.cwd(), 'src/main/database/connection.ts'), 'utf8');
    const functionStart = source.indexOf('function runSchemaMigration');
    const functionEnd = source.indexOf('function runPreSchemaMigrations');
    const migrationSource = source.slice(functionStart, functionEnd);

    expect(migrationSource).toContain('let transactionStarted = false');
    expect(migrationSource.indexOf("db.exec('BEGIN IMMEDIATE')")).toBeGreaterThan(migrationSource.indexOf('try {'));
    expect(migrationSource.indexOf("UPDATE schema_migration_runs SET status = 'failed'")).toBeGreaterThan(migrationSource.indexOf('catch (error)'));
    expect(migrationSource).toContain('if (transactionStarted)');
  });
});

function getColumnNames(db: DatabaseSync, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((row) => row.name);
}
