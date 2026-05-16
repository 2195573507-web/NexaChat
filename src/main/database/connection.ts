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
}

function addColumnIfMissing(db: DatabaseSync, table: string, column: string, definition: string): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (rows.some((row) => row.name === column)) {
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
