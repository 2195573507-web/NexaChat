import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { AuditLog, AuditLogPageInput, PageResult } from '../../shared/types.js';
import { mapAuditLog } from './mappers.js';

export class AuditRepository {
  constructor(private readonly db: DatabaseSync) {}

  listAuditLogs(): AuditLog[] {
    return this.db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapAuditLog(row as Record<string, unknown>));
  }

  pageAuditLogs(input: AuditLogPageInput = {}): PageResult<AuditLog> {
    const limit = normalizeLimit(input.limit, 50, 200);
    const offset = normalizeOffset(input.offset);
    const where: string[] = [];
    const params: SQLInputValue[] = [];
    const query = input.query?.trim().toLowerCase();
    if (query) {
      where.push("(lower(action) LIKE ? OR lower(actor) LIKE ? OR lower(target_type) LIKE ? OR lower(COALESCE(details_json, '')) LIKE ?)");
      params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
    }
    if (input.action) {
      where.push('action = ?');
      params.push(input.action);
    }
    if (input.userId) {
      where.push('actor = ?');
      params.push(input.userId);
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
    const total = Number((this.db.prepare(`SELECT COUNT(*) AS count FROM audit_logs ${whereSql}`).get(...params) as { count: number } | undefined)?.count ?? 0);
    const rows = this.db
      .prepare(`SELECT * FROM audit_logs ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map((row) => mapAuditLog(row as Record<string, unknown>));
    return { items: rows, total, limit, offset, hasMore: offset + rows.length < total };
  }

  countAuditAction(action: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM audit_logs WHERE action = ?')
      .get(action) as { count: number } | undefined;
    return Number(row?.count ?? 0);
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
