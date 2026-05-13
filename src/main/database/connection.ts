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

  const userDataPath = app?.getPath ? app.getPath('userData') : join(process.cwd(), 'NexaChatData');
  mkdirSync(userDataPath, { recursive: true });
  const databasePath = join(userDataPath, 'nexachat.sqlite');
  const db = new DatabaseSync(databasePath);
  db.exec(schemaSql);
  context = { db, path: databasePath };
  return context;
}

export function closeDatabase(): void {
  if (context) {
    context.db.close();
    context = null;
  }
}
