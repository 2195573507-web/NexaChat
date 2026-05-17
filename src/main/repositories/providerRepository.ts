import type { DatabaseSync } from 'node:sqlite';
import type { Provider, ProviderHealthRecord } from '../../shared/types.js';
import { mapProvider, mapProviderHealthRecord } from './mappers.js';

export class ProviderRepository {
  constructor(private readonly db: DatabaseSync) {}

  listProviders(): Provider[] {
    return this.db
      .prepare('SELECT * FROM providers WHERE enabled = 1 ORDER BY updated_at DESC')
      .all()
      .map((row) => mapProvider(row as Record<string, unknown>));
  }

  listProviderHealthRecords(): ProviderHealthRecord[] {
    return this.db
      .prepare('SELECT * FROM provider_health_records ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapProviderHealthRecord(row as Record<string, unknown>));
  }
}
