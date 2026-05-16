import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import { schemaSql } from './schema.js';

export interface DatabaseContext {
  db: DatabaseSync;
  path: string;
}

let context: DatabaseContext | null = null;

export function getDatabase(): DatabaseContext {
  if (context) {
    return context;
  }

  const userDataPath = process.env.NEXACHAT_DATA_DIR || (app?.getPath ? app.getPath('userData') : join(process.cwd(), 'NexaChatData'));
  mkdirSync(userDataPath, { recursive: true });
  const databasePath = join(userDataPath, 'nexachat.sqlite');
  const db = new DatabaseSync(databasePath);
  db.exec(schemaSql);
  runAdditiveMigrations(db);
  context = { db, path: databasePath };
  return context;
}

export function closeDatabase(): void {
  if (context) {
    context.db.close();
    context = null;
  }
}

function runAdditiveMigrations(db: DatabaseSync): void {
  addColumnIfMissing(db, 'files', 'workspace_id', 'TEXT');
  addColumnIfMissing(db, 'files', 'knowledge_base_id', 'TEXT');
  addColumnIfMissing(db, 'files', 'index_status', "TEXT NOT NULL DEFAULT 'queued'");
  addColumnIfMissing(db, 'files', 'embedding_status', "TEXT NOT NULL DEFAULT 'queued'");
  addColumnIfMissing(db, 'files', 'parser_type', "TEXT NOT NULL DEFAULT 'unsupported'");
  addColumnIfMissing(db, 'files', 'token_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'files', 'content_hash', 'TEXT');
  addColumnIfMissing(db, 'files', 'storage_ref', 'TEXT');
  addColumnIfMissing(db, 'files', 'metadata_json', 'TEXT');
  addColumnIfMissing(db, 'files', 'parse_started_at', 'INTEGER');
  addColumnIfMissing(db, 'files', 'parse_completed_at', 'INTEGER');
  addColumnIfMissing(db, 'files', 'deleted_at', 'INTEGER');
  addColumnIfMissing(db, 'knowledge_chunks', 'token_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'knowledge_chunks', 'content_hash', 'TEXT');
  addColumnIfMissing(db, 'knowledge_chunks', 'source_start', 'INTEGER');
  addColumnIfMissing(db, 'knowledge_chunks', 'source_end', 'INTEGER');
  addColumnIfMissing(db, 'knowledge_chunks', 'page_number', 'INTEGER');
  addColumnIfMissing(db, 'knowledge_chunks', 'section_title', 'TEXT');
  addColumnIfMissing(db, 'knowledge_chunks', 'status', "TEXT NOT NULL DEFAULT 'indexed'");
  addColumnIfMissing(db, 'knowledge_chunks', 'embedding_id', 'TEXT');
  addColumnIfMissing(db, 'knowledge_chunks', 'metadata_json', 'TEXT');
  addColumnIfMissing(db, 'knowledge_chunks', 'updated_at', 'INTEGER');
  db.exec(`
    UPDATE files
    SET index_status = CASE parse_status WHEN 'indexed' THEN 'stale' WHEN 'failed' THEN 'failed' ELSE index_status END,
        embedding_status = CASE parse_status WHEN 'indexed' THEN 'stale' WHEN 'failed' THEN 'failed' ELSE embedding_status END,
        parser_type = CASE
          WHEN lower(type) LIKE '%markdown%' OR lower(name) LIKE '%.md' THEN 'markdown'
          WHEN lower(type) LIKE '%json%' OR lower(name) LIKE '%.json' THEN 'json'
          WHEN lower(type) LIKE '%csv%' OR lower(name) LIKE '%.csv' THEN 'csv'
          WHEN lower(type) LIKE 'text/%' OR lower(name) LIKE '%.txt' THEN 'plain-text'
          ELSE parser_type
        END,
        workspace_id = COALESCE(workspace_id, 'ws_default'),
        updated_at = updated_at
    WHERE workspace_id IS NULL OR index_status = 'queued' OR embedding_status = 'queued' OR parser_type = 'unsupported';
    UPDATE knowledge_chunks SET updated_at = COALESCE(updated_at, created_at);
  `);
  addColumnIfMissing(db, 'gateway_api_keys', 'disabled_at', 'INTEGER');
  addColumnIfMissing(db, 'gateway_api_keys', 'rotated_from_id', 'TEXT');
  addColumnIfMissing(db, 'gateway_api_keys', 'last_error_code', 'TEXT');
  addColumnIfMissing(db, 'gateway_api_keys', 'rate_limit_per_minute', 'INTEGER');
  addColumnIfMissing(db, 'gateway_api_keys', 'rate_window_started_at', 'INTEGER');
  addColumnIfMissing(db, 'gateway_api_keys', 'rate_window_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'gateway_logs', 'gateway_key_id', 'TEXT');
  addColumnIfMissing(db, 'gateway_logs', 'key_preview', 'TEXT');
  addColumnIfMissing(db, 'gateway_logs', 'scope', 'TEXT');
  addColumnIfMissing(db, 'gateway_logs', 'error_code', 'TEXT');
  addColumnIfMissing(db, 'gateway_logs', 'latency_ms', 'INTEGER');
  addColumnIfMissing(db, 'gateway_logs', 'remote_address', 'TEXT');
  addColumnIfMissing(db, 'config_snapshots', 'rollback_snapshot_id', 'TEXT');
  addColumnIfMissing(db, 'config_snapshots', 'source', 'TEXT');
  addColumnIfMissing(db, 'config_snapshots', 'applied_entity_ids_json', 'TEXT');
  db.exec(`
    CREATE TABLE IF NOT EXISTS data_mobility_jobs (
      id TEXT PRIMARY KEY,
      operation_kind TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT,
      manifest_version TEXT NOT NULL,
      profile TEXT,
      summary TEXT NOT NULL,
      manifest_hash TEXT,
      manifest_json TEXT,
      conflict_count INTEGER NOT NULL,
      requires_confirmation INTEGER NOT NULL,
      encrypted INTEGER NOT NULL,
      redacted INTEGER NOT NULL,
      rollback_record_id TEXT,
      related_snapshot_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS data_conflicts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      type TEXT NOT NULL,
      entity_kind TEXT NOT NULL,
      local_id TEXT,
      import_name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      resolved INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS data_backups (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      profile TEXT NOT NULL,
      encrypted INTEGER NOT NULL,
      redacted INTEGER NOT NULL,
      manifest_hash TEXT NOT NULL,
      package_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS migration_runs (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS rollback_records (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      rollback_snapshot_id TEXT,
      state TEXT NOT NULL,
      affected_entity_ids_json TEXT NOT NULL,
      applied_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
  addColumnIfMissing(db, 'tools', 'kind', "TEXT NOT NULL DEFAULT 'fixture'");
  addColumnIfMissing(db, 'tools', 'permission_key', "TEXT NOT NULL DEFAULT 'tool:read'");
  addColumnIfMissing(db, 'tools', 'risk_level', "TEXT NOT NULL DEFAULT 'read'");
  addColumnIfMissing(db, 'tools', 'requires_approval', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'tools', 'enabled', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing(db, 'audit_logs', 'permission_key', 'TEXT');
  addColumnIfMissing(db, 'audit_logs', 'previous_hash', 'TEXT');
  addColumnIfMissing(db, 'audit_logs', 'entry_hash', 'TEXT');
  addColumnIfMissing(db, 'audit_logs', 'integrity_state', "TEXT NOT NULL DEFAULT 'verified'");
}

function addColumnIfMissing(db: DatabaseSync, table: string, column: string, definition: string): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (rows.some((row) => row.name === column)) {
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
