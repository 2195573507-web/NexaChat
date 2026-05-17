import type { DatabaseSync } from 'node:sqlite';
import type { Model } from '../../shared/types.js';
import { mapModel } from './mappers.js';

export class ModelRepository {
  constructor(private readonly db: DatabaseSync) {}

  listModels(): Model[] {
    return this.db
      .prepare('SELECT * FROM models WHERE enabled = 1 ORDER BY updated_at DESC')
      .all()
      .map((row) => mapModel(row as Record<string, unknown>));
  }
}
