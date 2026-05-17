import { mapAuditLog } from '../repositories/mappers.js';
import { redactSensitive } from '../security/redaction.js';
import { createId, now } from '../utils/ids.js';
import { translate } from '../../shared/i18n.js';
import { SECURITY_ACTION_PERMISSIONS } from '../../shared/securityRuntime.js';
import type { AuditExportResult, AuditIntegrityReport, AuditLog, AuditLogPageInput, PageResult } from '../../shared/types.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);



export function AuditService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class AuditService extends Base {
  getAuditLogs(): AuditLog[] {
    return this.repositories.audit.listAuditLogs();
  }

  listAuditLogs(input: AuditLogPageInput = {}): PageResult<AuditLog> {
    return this.repositories.audit.pageAuditLogs(input);
  }


  countAuditAction(action: string): number {
    return this.repositories.audit.countAuditAction(action);
  }


  searchAuditLogs(query = ''): AuditLog[] {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.auditRead, 'audit_log', null);
    const normalized = query.trim().toLowerCase();
    const logs = this.getAuditLogs();
    const result = normalized
      ? logs.filter((log) => JSON.stringify(log).toLowerCase().includes(normalized))
      : logs;
    this.audit('audit.searched', 'audit_log', null, { query: normalized ? '[FILTERED]' : 'all', resultCount: result.length }, SECURITY_ACTION_PERMISSIONS.auditRead);
    return result;
  }


  verifyAuditIntegrity(options: { persistAudit?: boolean } = {}): AuditIntegrityReport {
    if (options.persistAudit !== false) {
      this.requirePermission(SECURITY_ACTION_PERMISSIONS.auditVerify, 'audit_log', null);
    }
    const rows = this.db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at ASC, id ASC')
      .all()
      .map((row) => mapAuditLog(row as Record<string, unknown>));
    let previousHash: string | null = null;
    let firstBrokenAuditId: string | null = null;
    for (const row of rows) {
      const expectedHash = this.computeAuditHash({
        id: row.id,
        action: row.action,
        actor: row.actor,
        targetType: row.targetType,
        targetId: row.targetId,
        detailsJson: row.detailsJson,
        permissionKey: row.permissionKey,
        previousHash: row.previousHash,
        createdAt: row.createdAt,
      });
      if (row.previousHash !== previousHash || row.entryHash !== expectedHash || row.integrityState !== 'verified') {
        firstBrokenAuditId = row.id;
        break;
      }
      previousHash = row.entryHash;
    }
    const report: AuditIntegrityReport = {
      status: rows.length === 0 ? 'empty' : firstBrokenAuditId ? 'broken' : 'verified',
      checkedAt: now(),
      checkedCount: rows.length,
      firstBrokenAuditId,
      lastHash: previousHash,
    };
    if (options.persistAudit !== false) {
      this.audit('audit.integrity.verified', 'audit_log', firstBrokenAuditId, report, SECURITY_ACTION_PERMISSIONS.auditVerify);
    }
    return report;
  }


  exportAuditLogs(): AuditExportResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.auditExport, 'audit_log', null);
    const integrity = this.verifyAuditIntegrity({ persistAudit: false });
    const id = createId('audit_export');
    const createdAt = now();
    const content = JSON.stringify({
      exportedAt: createdAt,
      redacted: true,
      integrity,
      auditLogs: this.getAuditLogs().map((log) => ({
        ...log,
        detailsJson: log.detailsJson ? redactSensitive(log.detailsJson) : null,
      })),
    }, null, 2);
    const result: AuditExportResult = { id, redacted: true, content, integrity, createdAt };
    this.audit('audit.exported', 'audit_log', id, { auditCount: this.getAuditLogs().length, integrityStatus: integrity.status }, SECURITY_ACTION_PERMISSIONS.auditExport);
    return result;
  }

  };
}
