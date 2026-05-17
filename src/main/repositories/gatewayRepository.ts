import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { GatewayApiKey, GatewayLog, GatewayLogPageInput, PageResult } from '../../shared/types.js';
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

  pageGatewayLogs(input: GatewayLogPageInput = {}): PageResult<GatewayLog> {
    const limit = normalizeLimit(input.limit, 50, 200);
    const offset = normalizeOffset(input.offset);
    const where: string[] = [];
    const params: SQLInputValue[] = [];
    if (input.statusCode !== undefined) {
      where.push('status_code = ?');
      params.push(input.statusCode);
    }
    if (input.since !== undefined) {
      where.push('created_at >= ?');
      params.push(input.since);
    }
    if (input.until !== undefined) {
      where.push('created_at <= ?');
      params.push(input.until);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = Number((this.db.prepare(`SELECT COUNT(*) AS count FROM gateway_logs ${whereSql}`).get(...params) as { count: number } | undefined)?.count ?? 0);
    const rows = this.db
      .prepare(`SELECT * FROM gateway_logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map((row) => mapGatewayLog(row as Record<string, unknown>));
    return { items: rows, total, limit, offset, hasMore: offset + rows.length < total };
  }
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const parsed = Math.floor(Number(value ?? fallback));
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function normalizeOffset(value: number | undefined): number {
  const parsed = Math.floor(Number(value ?? 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
