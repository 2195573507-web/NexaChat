import type { DatabaseSync } from 'node:sqlite';
import type { AuditLog } from '../../shared/types.js';
import { mapAuditLog } from './mappers.js';

export class AuditRepository {
  constructor(private readonly db: DatabaseSync) {}

  listAuditLogs(): AuditLog[] {
    return this.db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapAuditLog(row as Record<string, unknown>));
  }

  countAuditAction(action: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM audit_logs WHERE action = ?')
      .get(action) as { count: number } | undefined;
    return Number(row?.count ?? 0);
  }
}
