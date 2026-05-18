import type { DatabaseSync } from 'node:sqlite';
import type { Model } from '../../shared/types.js';
import { mapModel } from './mappers.js';

export class ModelRepository {
  constructor(private readonly db: DatabaseSync) {}

  listModels(): Model[] {
    return this.db
      .prepare('SELECT * FROM models WHERE enabled = 1 AND deleted_at IS NULL ORDER BY updated_at DESC')
      .all()
      .map((row) => mapModel(row as Record<string, unknown>));
  }

  listDisabledModels(): Model[] {
    return this.db
      .prepare('SELECT * FROM models WHERE (enabled = 0 OR deleted_at IS NOT NULL) ORDER BY updated_at DESC')
      .all()
      .map((row) => mapModel(row as Record<string, unknown>));
  }
}
