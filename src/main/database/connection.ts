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
  configureDatabase(db);
  runSchemaMigration(db, 'schema-preflight-v1', 'Pre-schema compatibility migrations', () => runPreSchemaMigrations(db));
  runSchemaMigration(db, 'schema-core-v1', 'Create or update current schema', () => db.exec(schemaSql));
  runSchemaMigration(db, 'schema-additive-v1', 'Run additive compatibility migrations', () => runAdditiveMigrations(db));
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
  migrateWorkspaceColumns(db);
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
  addColumnIfMissing(db, 'knowledge_chunks', 'knowledge_base_id', 'TEXT');
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
  migrateRagFoundationColumns(db);
  addColumnIfMissing(db, 'models', 'deleted_at', 'INTEGER');
  addColumnIfMissing(db, 'config_snapshots', 'rollback_snapshot_id', 'TEXT');
  addColumnIfMissing(db, 'config_snapshots', 'source', 'TEXT');
  addColumnIfMissing(db, 'config_snapshots', 'applied_entity_ids_json', 'TEXT');
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_health_records (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      model_id TEXT,
      status TEXT NOT NULL,
      latency_ms INTEGER,
      source TEXT NOT NULL,
      error_code TEXT,
      error_message TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_provider_health_provider ON provider_health_records(provider_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_provider_health_status ON provider_health_records(status, created_at);
    CREATE TABLE IF NOT EXISTS feedback_items (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      message_id TEXT,
      request_log_id TEXT,
      notes TEXT,
      metadata_json TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_request ON feedback_items(request_log_id, created_at);
    CREATE TABLE IF NOT EXISTS eval_sets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      prompt TEXT NOT NULL,
      expected_keywords_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS eval_results (
      id TEXT PRIMARY KEY,
      eval_set_id TEXT NOT NULL,
      provider_id TEXT,
      model_id TEXT,
      request_log_id TEXT,
      status TEXT NOT NULL,
      score REAL,
      latency_ms INTEGER,
      output_preview TEXT,
      error_code TEXT,
      error_message TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_eval_results_set ON eval_results(eval_set_id, created_at);
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
  addColumnIfMissing(db, 'ui_preferences', 'advanced_mode', 'INTEGER NOT NULL DEFAULT 0');
  createPerformanceIndexes(db);
}

function configureDatabase(db: DatabaseSync): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
  `);
  ensureSchemaMigrationJournal(db);
}

function ensureSchemaMigrationJournal(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migration_runs (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
  `);
}

function runSchemaMigration(db: DatabaseSync, version: string, summary: string, operation: () => void): void {
  ensureSchemaMigrationJournal(db);
  const timestamp = Date.now();
  db.prepare(
    `INSERT INTO schema_migration_runs (id, version, status, summary, error_message, created_at, completed_at)
     VALUES (?, ?, 'running', ?, NULL, ?, NULL)
     ON CONFLICT(version) DO UPDATE SET status = 'running', summary = excluded.summary, error_message = NULL, completed_at = NULL`,
  ).run(`schema_${version}`, version, summary, timestamp);
  let transactionStarted = false;
  try {
    db.exec('BEGIN IMMEDIATE');
    transactionStarted = true;
    operation();
    db.exec('COMMIT');
    transactionStarted = false;
    db.prepare("UPDATE schema_migration_runs SET status = 'completed', completed_at = ? WHERE version = ?").run(Date.now(), version);
  } catch (error) {
    if (transactionStarted) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Preserve the migration failure that triggered recovery.
      }
    }
    db.prepare("UPDATE schema_migration_runs SET status = 'failed', error_message = ?, completed_at = ? WHERE version = ?")
      .run(error instanceof Error ? error.message : String(error), Date.now(), version);
    throw error;
  }
}

function runPreSchemaMigrations(db: DatabaseSync): void {
  migrateWorkspaceColumns(db);
  migrateKnowledgeColumns(db);
}

function migrateWorkspaceColumns(db: DatabaseSync): void {
  addColumnIfMissing(db, 'conversations', 'workspace_id', "TEXT NOT NULL DEFAULT 'ws_default'");
  addColumnIfMissing(db, 'messages', 'workspace_id', "TEXT NOT NULL DEFAULT 'ws_default'");
  addColumnIfMissing(db, 'usage_records', 'workspace_id', "TEXT NOT NULL DEFAULT 'ws_default'");
  addColumnIfMissing(db, 'memories', 'workspace_id', "TEXT NOT NULL DEFAULT 'ws_default'");
}

function migrateKnowledgeColumns(db: DatabaseSync): void {
  addColumnIfMissing(db, 'files', 'workspace_id', 'TEXT');
  addColumnIfMissing(db, 'files', 'knowledge_base_id', 'TEXT');
  addColumnIfMissing(db, 'files', 'index_status', "TEXT NOT NULL DEFAULT 'queued'");
  addColumnIfMissing(db, 'files', 'deleted_at', 'INTEGER');
  addColumnIfMissing(db, 'knowledge_chunks', 'knowledge_base_id', 'TEXT');
  addColumnIfMissing(db, 'knowledge_chunks', 'status', "TEXT NOT NULL DEFAULT 'indexed'");
}

function migrateRagFoundationColumns(db: DatabaseSync): void {
  addColumnIfMissing(db, 'usage_records', 'request_type', "TEXT NOT NULL DEFAULT 'chat'");
  addColumnIfMissing(db, 'usage_records', 'total_tokens', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'usage_records', 'token_usage_estimated', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing(db, 'usage_records', 'latency_ms', 'INTEGER');
  addColumnIfMissing(db, 'usage_records', 'status', "TEXT NOT NULL DEFAULT 'completed'");
  addColumnIfMissing(db, 'usage_records', 'error_code', 'TEXT');
  if (tableExists(db, 'usage_records')) {
    db.exec(`
      UPDATE usage_records
      SET total_tokens = CASE WHEN total_tokens = 0 THEN input_tokens + output_tokens ELSE total_tokens END,
          token_usage_estimated = COALESCE(token_usage_estimated, 1),
          request_type = COALESCE(NULLIF(request_type, ''), 'chat'),
          status = COALESCE(NULLIF(status, ''), 'completed')
    `);
  }

  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'provider_id', 'TEXT');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'model_id', 'TEXT');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'model_name_snapshot', 'TEXT');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'knowledge_scope_json', 'TEXT');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'candidate_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'vector_candidate_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'lexical_candidate_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'final_citation_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'score_summary_json', 'TEXT');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'timings_json', 'TEXT');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'error_code', 'TEXT');
  addColumnIfMissing(db, 'knowledge_retrieval_traces', 'error_message', 'TEXT');
  if (tableExists(db, 'knowledge_retrieval_traces')) {
    db.exec(`
      UPDATE knowledge_retrieval_traces
      SET candidate_count = CASE WHEN candidate_count = 0 THEN result_count ELSE candidate_count END,
          final_citation_count = CASE WHEN final_citation_count = 0 THEN result_count ELSE final_citation_count END,
          lexical_candidate_count = CASE WHEN lexical_candidate_count = 0 AND strategy = 'lexical' THEN result_count ELSE lexical_candidate_count END,
          vector_candidate_count = CASE WHEN vector_candidate_count = 0 AND strategy = 'vector' THEN result_count ELSE vector_candidate_count END
    `);
  }
}

function addColumnIfMissing(db: DatabaseSync, table: string, column: string, definition: string): void {
  if (!tableExists(db, table)) {
    return;
  }
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (rows.some((row) => row.name === column)) {
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function tableExists(db: DatabaseSync, table: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  return Boolean(row);
}

function createPerformanceIndexes(db: DatabaseSync): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_gateway_logs_created ON gateway_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_gateway_logs_key_created ON gateway_logs(gateway_key_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_gateway_logs_status_created ON gateway_logs(status_code, created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_records_created ON usage_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_records_workspace_created ON usage_records(workspace_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_records_provider_created ON usage_records(provider_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_records_model_created ON usage_records(model_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at);
    CREATE INDEX IF NOT EXISTS idx_provider_health_created ON provider_health_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_files_deleted_updated ON files(deleted_at, updated_at);
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_status_created ON knowledge_chunks(status, created_at, position);
    CREATE INDEX IF NOT EXISTS idx_knowledge_retrieval_traces_created ON knowledge_retrieval_traces(created_at);
    CREATE INDEX IF NOT EXISTS idx_message_citations_message_score ON message_citations(message_id, score);
    CREATE INDEX IF NOT EXISTS idx_message_citations_created ON message_citations(created_at);
  `);
}
