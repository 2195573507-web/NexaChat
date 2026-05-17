import type { DatabaseSync } from 'node:sqlite';
import type { GatewayApiKey, GatewayLog } from '../../shared/types.js';
import { mapGatewayKey, mapGatewayLog } from './mappers.js';

export class GatewayRepository {
  constructor(private readonly db: DatabaseSync) {}

  listGatewayKeys(): GatewayApiKey[] {
    return this.db
      .prepare('SELECT * FROM gateway_api_keys ORDER BY created_at DESC')
      .all()
      .map((row) => mapGatewayKey(row as Record<string, unknown>));
  }

  listGatewayLogs(): GatewayLog[] {
    return this.db
      .prepare('SELECT * FROM gateway_logs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapGatewayLog(row as Record<string, unknown>));
  }
}
