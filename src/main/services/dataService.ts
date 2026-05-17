import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { safeStorage } from 'electron';
import type { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../database/connection.js';
import {
  mapApprovalRequest,
  mapAgent,
  mapAuditLog,
  mapConversation,
  mapConversationExport,
  mapDataBackupRecord,
  mapDataConflictRecord,
  mapDataMobilityJob,
  mapEvalResult,
  mapEvalSet,
  mapExecutionRun,
  mapExecutionStep,
  mapExecutionTraceEvent,
  mapFeedbackItem,
  mapGatewayKey,
  mapGatewayLog,
  mapImportExportResult,
  mapKnowledgeChunk,
  mapKnowledgeCitation,
  mapKnowledgeFile,
  mapKnowledgeRetrievalTrace,
  mapMcpServer,
  mapMessage,
  mapMessageAttachment,
  mapMessageChunk,
  mapModel,
  mapPromptTemplate,
  mapProvider,
  mapProviderHealthRecord,
  mapRequestLog,
  mapMigrationRun,
  mapRollbackRecord,
  mapSecurityAclGrant,
  mapSecurityRole,
  mapSecuritySession,
  mapSecurityUser,
  mapToolDefinition,
  mapUiPreferences,
  mapUsageRecord,
  mapWorkspace,
} from '../repositories/mappers.js';
import { redactHeaders, redactSensitive } from '../security/redaction.js';
import { createId, estimateTokens, now, previewSecret } from '../utils/ids.js';
import { diagnoses } from '../../shared/errors.js';
import { translate } from '../../shared/i18n.js';
import {
  PROVIDER_RUNTIME_ERROR_CODES,
  PROVIDER_RUNTIME_POLICY,
  getProviderAdapterName,
} from '../../shared/providerRuntime.js';
import { normalizeThemeMode } from '../../shared/theme.js';
import {
  CONTEXT_STRATEGY_LIMITS,
  MESSAGE_ATTACHMENT_POLICY,
  isAllowedAttachmentMimeType,
  isConversationExportFormat,
} from '../../shared/conversationRuntime.js';
import {
  KNOWLEDGE_RUNTIME_POLICY,
  chunkKnowledgeText,
  lexicalEmbedding,
  normalizeKnowledgeImport,
  scoreKnowledgeChunks,
  stableKnowledgeHash,
  type KnowledgeScoredChunkInput,
} from '../../shared/knowledgeRuntime.js';
import {
  GATEWAY_AVAILABLE_ENDPOINTS,
  GATEWAY_BIND_HOST,
  GATEWAY_DEFAULT_KEY_POLICY,
  GATEWAY_ERROR_CODES,
  GATEWAY_PORT,
  GATEWAY_RATE_WINDOW_MS,
  GATEWAY_SCOPES,
  normalizeGatewayLimit,
  normalizeGatewayRateLimit,
  normalizeGatewayScopes,
  type GatewayErrorCode,
  type GatewayScope,
} from '../../shared/gatewayRuntime.js';
import {
  EXECUTION_TOOL_IDS,
  TOOL_FIXTURES,
  normalizeApprovalDecision,
  normalizeExecutionStartInput,
} from '../../shared/executionRuntime.js';
import {
  SECURITY_ACTION_PERMISSIONS,
  SECURITY_PERMISSION_KEYS,
  SECURITY_ROLES,
  evaluatePermission,
  getSecurityRole,
  type SecurityPermissionKey,
  type SecurityRoleId,
} from '../../shared/securityRuntime.js';
import {
  DATA_CONFIRMATION_PHRASES,
  DATA_MANIFEST_VERSION,
  DATA_MIGRATION_VERSIONS,
  buildRestoreDiffSummary,
  createRedactedBackupPackage,
  detectDataImportSource,
  normalizeDataManifest,
  stableHash,
  type DataBackupProfile,
  type DataBackupPackage,
  type DataConflictInput,
  type NormalizedDataManifest,
} from '../../shared/dataRuntime.js';
import {
  DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS,
  OBSERVABILITY_FEEDBACK_LABELS,
  buildObservabilitySummary,
  buildRedactedObservabilityExport,
  filterObservabilityRequestLogs,
  normalizeObservabilityPrivacySettings,
  normalizeObservabilityQuery,
  type ObservabilityPrivacySettings,
  type ObservabilityQueryInput,
} from '../../shared/observabilityRuntime.js';
import type {
  AgentDefinition,
  AppSnapshot,
  AuditExportResult,
  AuditIntegrityReport,
  ApprovalDecisionInput,
  ApprovalRequest,
  AuditLog,
  CancelMessageInput,
  ChatResponse,
  CompareModelsInput,
  CompareModelsResponse,
  Conversation,
  ConversationExport,
  DashboardSummary,
  DataBackupCreateInput,
  DataBackupRecord,
  DataConflictRecord,
  DataExportOptions,
  DataMobilityJob,
  DataRestorePreflightInput,
  DataRollbackInput,
  EvalResult,
  EvalRunInput,
  EvalSet,
  FeedbackCreateInput,
  FeedbackItem,
  ExecutionRun,
  ExecutionStartInput,
  ExecutionStep,
  ExecutionTraceEvent,
  ExportConversationInput,
  GatewayApiKey,
  GatewayImportPlan,
  GatewayKeyCreated,
  GatewayKeyCreateInput,
  GatewayKeyRotateInput,
  GatewayKeyUpdateInput,
  GatewayLog,
  GatewayStatus,
  ImportPlanApplyOptions,
  ImportExportResult,
  KnowledgeChunk,
  KnowledgeCitation,
  KnowledgeDeleteInput,
  KnowledgeFile,
  KnowledgeImportInput,
  KnowledgeRebuildInput,
  KnowledgeRetrievalInput,
  KnowledgeRetrievalResult,
  KnowledgeRetrievalTrace,
  McpServer,
  Message,
  MessageAttachment,
  MessageAttachmentInput,
  MessageChunk,
  Model,
  ModelInput,
  ObservabilityExportResult,
  ObservabilitySnapshot,
  PromptTemplate,
  Provider,
  ProviderHealthRecord,
  ProviderInput,
  RegenerateMessageInput,
  RequestLog,
  MigrationRun,
  RollbackRecord,
  SecurityAclGrant,
  SecurityRole,
  SecuritySession,
  SecurityState,
  SecurityUser,
  RetryMessageInput,
  RouteDecision,
  SendMessageInput,
  RestoreSnapshotOptions,
  ToolDefinition,
  UiPreferences,
  UsageRecord,
  Workspace,
  ProviderModelOption,
} from '../../shared/types.js';
import {
  ProviderRuntimeError,
  fetchOpenAiCompatibleModels,
  getProviderRequestSummary,
  invokeOpenAiCompatibleChat,
  testOpenAiCompatibleProvider,
  type ChatMessageInput,
} from '../adapters/openAiCompatibleAdapter.js';

const DEFAULT_WORKSPACE_ID = 'ws_default';
const DEFAULT_PREFS_ID = 'ui_default';
const GATEWAY_ENABLED_SETTING_KEY = 'gateway.enabled';
const OBSERVABILITY_PRIVACY_SETTING_KEY = 'observability.privacy';
const DEFAULT_SECURITY_USER_ID = 'user_local_admin';
const DEFAULT_SECURITY_SESSION_ID = 'session_local_admin';
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);

export interface GatewayAuthorizationResult {
  ok: boolean;
  key: GatewayApiKey | null;
  scope: GatewayScope;
  errorCode: GatewayErrorCode | null;
}

export interface GatewayLogInput {
  method: string;
  path: string;
  statusCode: number;
  requestLogId?: string | null;
  key?: GatewayApiKey | null;
  scope?: GatewayScope | null;
  errorCode?: GatewayErrorCode | null;
  headers?: Record<string, string>;
  latencyMs?: number | null;
  remoteAddress?: string | null;
}

import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

export function DataService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class DataService extends Base {
  getImportExportResults(): ImportExportResult[] {
    return this.repositories.data.listImportExportResults();
  }


  getDataMobilityJobs(): DataMobilityJob[] {
    return this.repositories.data.listDataMobilityJobs();
  }


  getDataConflicts(jobId?: string): DataConflictRecord[] {
    return this.repositories.data.listDataConflicts(jobId);
  }


  getDataBackups(): DataBackupRecord[] {
    return this.repositories.data.listDataBackups();
  }


  getMigrationRuns(): MigrationRun[] {
    return this.repositories.data.listMigrationRuns();
  }


  getRollbackRecords(): RollbackRecord[] {
    return this.repositories.data.listRollbackRecords();
  }


  validateImportManifest(manifestText: string): ImportExportResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.dataImport, 'config_snapshot', null);
    const timestamp = now();
    const id = createId('import');
    let status: ImportExportResult['status'] = 'ready';
    let summary = t('data.import.summary.ready');
    let manifest: NormalizedDataManifest | Record<string, unknown> = this.emptyDataManifest('openai-compatible');

    try {
      const parsed = JSON.parse(manifestText) as Record<string, unknown>;
      const conflicts = this.detectDataConflicts(parsed);
      manifest = normalizeDataManifest(parsed, conflicts);
      if (manifest.conflictCount > 0) summary = t('data.import.summary.conflict', { count: manifest.conflictCount });
    } catch (error) {
      status = 'failed';
      summary = t('data.import.summary.rejected', { reason: error instanceof Error ? error.message : String(error) });
      manifest = {
        ...this.emptyDataManifest('unknown'),
        requiresConfirmation: false,
        conflictCount: 0,
        error: summary,
      };
    }

    const manifestJson = JSON.stringify(manifest);
    const jobId = this.insertDataMobilityJob({
      id,
      operationKind: 'import',
      status,
      source: String(manifest.source ?? 'unknown'),
      profile: 'metadata-redacted',
      summary,
      manifestJson,
      manifestHash: stableHash(manifestJson),
      conflictCount: Number(manifest.conflictCount ?? 0),
      requiresConfirmation: Boolean(manifest.requiresConfirmation),
      encrypted: false,
      redacted: true,
      rollbackRecordId: null,
      relatedSnapshotId: null,
      timestamp,
    });
    this.insertDataConflicts(jobId, Array.isArray((manifest as NormalizedDataManifest).conflicts) ? (manifest as NormalizedDataManifest).conflicts : [], timestamp);
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, rollback_snapshot_id, source, applied_entity_ids_json, manifest_json, created_at)
         VALUES (?, 'import', ?, ?, 1, NULL, ?, ?, ?, ?)`,
      )
      .run(id, status, summary, String(manifest.source ?? 'unknown'), JSON.stringify([]), manifestJson, timestamp);
    this.audit('import.manifest.validated', 'config_snapshot', id, { status, summary });
    return this.requireImportExportResult(id);
  }


  applyImportPlan(resultId: string, options: ImportPlanApplyOptions = {}): ImportExportResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.dataImport, 'config_snapshot', resultId);
    const result = this.requireImportExportResult(resultId);
    if (result.action !== 'import' || result.status !== 'ready') {
      throw new Error(t('data.import.errors.readyOnly'));
    }
    if (options.confirmationPhrase !== DATA_CONFIRMATION_PHRASES.applyImport) {
      throw new Error(t('data.import.errors.confirmation'));
    }
    const timestamp = now();
    const rollbackSnapshot = this.createSnapshot();
    const manifest = this.parseManifest(result.manifestJson);
    const mode = options.mode ?? 'apply-metadata';
    const appliedEntityIds: string[] = [];
    if (mode === 'apply-metadata') {
      appliedEntityIds.push(...this.applyImportMetadata(manifest));
    }
    const plan: GatewayImportPlan = {
      source: this.detectImportSource(manifest),
      providerCount: Number(manifest.providerCount ?? 0),
      modelCount: Number(manifest.modelCount ?? 0),
      gatewayKeyTemplateCount: Number(manifest.gatewayKeyTemplateCount ?? 0),
      conflictCount: Number(manifest.conflictCount ?? 0),
      rollbackSnapshotId: rollbackSnapshot.id,
      appliedProviderIds: appliedEntityIds.filter((id) => id.startsWith('provider_')),
      appliedModelIds: appliedEntityIds.filter((id) => id.startsWith('model_')),
    };
    const rollbackId = this.insertRollbackRecord(resultId, rollbackSnapshot.id, appliedEntityIds, 'available', null, timestamp);
    this.db
      .prepare('UPDATE config_snapshots SET status = ?, summary = ?, rollback_snapshot_id = ?, applied_entity_ids_json = ?, manifest_json = ?, created_at = ? WHERE id = ?')
      .run('completed', t('data.import.summary.applied', { count: appliedEntityIds.length }), rollbackSnapshot.id, JSON.stringify(appliedEntityIds), JSON.stringify({ ...manifest, appliedPlan: plan }), timestamp, resultId);
    this.updateDataMobilityJob(resultId, 'completed', t('data.import.summary.applied', { count: appliedEntityIds.length }), rollbackId, rollbackSnapshot.id, timestamp, JSON.stringify({ ...manifest, appliedPlan: plan }));
    this.audit('import.plan.applied', 'config_snapshot', resultId, { mode, rollbackSnapshotId: rollbackSnapshot.id, appliedEntityIds });
    return this.requireImportExportResult(resultId);
  }


  restoreSnapshot(snapshotId: string, options: RestoreSnapshotOptions = {}): ImportExportResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.dataRestore, 'config_snapshot', snapshotId);
    const snapshot = this.requireImportExportResult(snapshotId);
    const timestamp = now();
    const id = createId(options.mode === 'rollback' ? 'rollback' : 'restore');
    const mode = options.mode ?? 'preflight';
    const appliedEntityIds = this.parseStringList(snapshot.manifestJson ? this.parseManifest(snapshot.manifestJson).appliedPlan : null, 'appliedProviderIds')
      .concat(this.parseStringList(snapshot.manifestJson ? this.parseManifest(snapshot.manifestJson).appliedPlan : null, 'appliedModelIds'));
    if (mode === 'rollback') {
      if (options.confirmationPhrase !== DATA_CONFIRMATION_PHRASES.rollback) {
        throw new Error(t('data.restore.errors.confirmation'));
      }
      for (const entityId of appliedEntityIds) {
        if (entityId.startsWith('model_')) {
          this.db.prepare('UPDATE models SET enabled = 0, updated_at = ? WHERE id = ?').run(timestamp, entityId);
        }
        if (entityId.startsWith('provider_')) {
          this.db.prepare('UPDATE providers SET enabled = 0, updated_at = ? WHERE id = ?').run(timestamp, entityId);
        }
      }
      this.markRollbackApplied(snapshot.id, appliedEntityIds, timestamp);
    }
    const manifest = {
      version: DATA_MANIFEST_VERSION,
      sourceSnapshotId: snapshot.id,
      requiresConfirmation: true,
      conflictCount: appliedEntityIds.length,
      mode,
      affectedEntityIds: appliedEntityIds,
    };
    this.insertDataMobilityJob({
      id,
      operationKind: mode === 'rollback' ? 'rollback' : 'restore-preflight',
      status: mode === 'rollback' ? 'completed' : 'ready',
      source: snapshot.source ?? 'nexachat',
      profile: 'metadata-redacted',
      summary: mode === 'rollback' ? t('data.snapshot.summary.rollbackApplied', { count: appliedEntityIds.length }) : t('data.snapshot.summary.restore'),
      manifestJson: JSON.stringify(manifest),
      manifestHash: stableHash(manifest),
      conflictCount: appliedEntityIds.length,
      requiresConfirmation: mode !== 'rollback',
      encrypted: false,
      redacted: true,
      rollbackRecordId: null,
      relatedSnapshotId: snapshot.id,
      timestamp,
    });
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, rollback_snapshot_id, source, applied_entity_ids_json, manifest_json, created_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      )
      .run(id, mode === 'rollback' ? 'rollback' : 'restore-preflight', mode === 'rollback' ? 'completed' : 'ready', mode === 'rollback' ? t('data.snapshot.summary.rollbackApplied', { count: appliedEntityIds.length }) : t('data.snapshot.summary.restore'), snapshot.id, snapshot.source ?? null, JSON.stringify(appliedEntityIds), JSON.stringify(manifest), timestamp);
    this.audit('snapshot.restore.previewed', 'config_snapshot', snapshotId, manifest);
    return this.requireImportExportResult(id);
  }


  createSnapshot(): ImportExportResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.dataExport, 'config_snapshot', null);
    const timestamp = now();
    const id = createId('snapshot');
    const manifest = this.buildDataExportPayload('metadata-redacted');
    const manifestJson = JSON.stringify(manifest);
    this.insertDataMobilityJob({
      id,
      operationKind: 'snapshot',
      status: 'completed',
      source: 'nexachat',
      profile: 'metadata-redacted',
      summary: t('data.snapshot.summary.created'),
      manifestJson,
      manifestHash: stableHash(manifestJson),
      conflictCount: 0,
      requiresConfirmation: false,
      encrypted: false,
      redacted: true,
      rollbackRecordId: null,
      relatedSnapshotId: null,
      timestamp,
    });
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, rollback_snapshot_id, source, applied_entity_ids_json, manifest_json, created_at)
         VALUES (?, 'snapshot', 'completed', ?, 1, NULL, 'nexachat', ?, ?, ?)`,
      )
      .run(id, t('data.snapshot.summary.created'), JSON.stringify([]), manifestJson, timestamp);
    this.audit('snapshot.created', 'config_snapshot', id, manifest);
    return this.requireImportExportResult(id);
  }


  exportDiagnostics(): ImportExportResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.dataExport, 'diagnostics', null);
    const timestamp = now();
    const id = createId('export');
    const diagnostics = {
      requestLogs: this.getRequestLogs().length,
      auditLogs: this.getAuditLogs().length,
      databasePath: '[REDACTED_LOCAL_PATH]',
      redaction: 'Authorization, API keys, custom sensitive headers and local paths are redacted.',
      diagnoses: diagnoses.map((item) => item.code),
    };
    this.insertDataMobilityJob({
      id,
      operationKind: 'diagnostics',
      status: 'completed',
      source: 'nexachat',
      profile: 'metadata-redacted',
      summary: t('data.diagnostics.summary.created'),
      manifestJson: JSON.stringify(diagnostics),
      manifestHash: stableHash(diagnostics),
      conflictCount: 0,
      requiresConfirmation: false,
      encrypted: false,
      redacted: true,
      rollbackRecordId: null,
      relatedSnapshotId: null,
      timestamp,
    });
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, rollback_snapshot_id, source, applied_entity_ids_json, manifest_json, created_at)
         VALUES (?, 'export', 'completed', ?, 1, NULL, 'nexachat', ?, ?, ?)`,
      )
      .run(id, t('data.diagnostics.summary.created'), JSON.stringify([]), JSON.stringify(diagnostics), timestamp);
    this.audit('diagnostics.exported', 'diagnostics', id, diagnostics);
    return this.requireImportExportResult(id);
  }


  exportDataPackage(options: DataExportOptions = {}): ImportExportResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.dataExport, 'data_package', null);
    const timestamp = now();
    const id = createId('export');
    const profile = options.profile ?? 'metadata-redacted';
    const pkg = createRedactedBackupPackage(this.buildDataExportPayload(profile), profile);
    this.insertDataMobilityJob({
      id,
      operationKind: 'export',
      status: 'completed',
      source: 'nexachat',
      profile,
      summary: t('data.export.summary.created'),
      manifestJson: JSON.stringify(pkg),
      manifestHash: pkg.manifestHash,
      conflictCount: 0,
      requiresConfirmation: false,
      encrypted: false,
      redacted: true,
      rollbackRecordId: null,
      relatedSnapshotId: null,
      timestamp,
    });
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, rollback_snapshot_id, source, applied_entity_ids_json, manifest_json, created_at)
         VALUES (?, 'export', 'completed', ?, 1, NULL, 'nexachat', ?, ?, ?)`,
      )
      .run(id, t('data.export.summary.created'), JSON.stringify([]), JSON.stringify(pkg), timestamp);
    this.audit('data.package.exported', 'data_package', id, { profile, encrypted: false, redacted: true });
    return this.requireImportExportResult(id);
  }


  createEncryptedBackup(input: DataBackupCreateInput): DataBackupRecord {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.dataExport, 'data_backup', null);
    const timestamp = now();
    const jobId = createId('backup_job');
    const backupId = createId('backup');
    const pkg = this.createEncryptedBackupPackage(this.buildDataExportPayload(input.profile ?? 'encrypted-full'), input.passphrase);
    this.insertDataMobilityJob({
      id: jobId,
      operationKind: 'encrypted-backup',
      status: 'completed',
      source: 'nexachat',
      profile: 'encrypted-full',
      summary: t('data.backup.summary.created'),
      manifestJson: JSON.stringify({ ...pkg, payload: '[ENCRYPTED_PAYLOAD]' }),
      manifestHash: pkg.manifestHash,
      conflictCount: 0,
      requiresConfirmation: false,
      encrypted: true,
      redacted: true,
      rollbackRecordId: null,
      relatedSnapshotId: null,
      timestamp,
    });
    this.db
      .prepare(
        `INSERT INTO data_backups (id, job_id, profile, encrypted, redacted, manifest_hash, package_json, created_at)
         VALUES (?, ?, ?, 1, 1, ?, ?, ?)`,
      )
      .run(backupId, jobId, 'encrypted-full', pkg.manifestHash, JSON.stringify(pkg), timestamp);
    this.audit('data.backup.encrypted.created', 'data_backup', backupId, { profile: 'encrypted-full', encrypted: true, manifestHash: pkg.manifestHash });
    return this.requireDataBackup(backupId);
  }


  createRestorePreflight(input: DataRestorePreflightInput): DataMobilityJob {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.dataRestore, 'data_backup', input.backupId ?? null);
    const timestamp = now();
    const id = createId('restore');
    const pkg = this.resolveBackupPackage(input);
    const payload = pkg.encrypted ? this.decryptBackupPackage(pkg, input.passphrase ?? '') : JSON.parse(pkg.payload) as Record<string, unknown>;
    const manifest = this.payloadToDataManifest(payload);
    const diff = buildRestoreDiffSummary(manifest);
    const manifestJson = JSON.stringify({ manifest, diff });
    this.insertDataMobilityJob({
      id,
      operationKind: 'restore-preflight',
      status: 'ready',
      source: manifest.source,
      profile: pkg.profile,
      summary: t('data.restore.summary.preflight', { added: diff.added.length, changed: diff.changed.length }),
      manifestJson,
      manifestHash: stableHash(manifestJson),
      conflictCount: manifest.conflictCount,
      requiresConfirmation: true,
      encrypted: pkg.encrypted,
      redacted: true,
      rollbackRecordId: null,
      relatedSnapshotId: input.backupId ?? null,
      timestamp,
    });
    this.insertDataConflicts(id, manifest.conflicts, timestamp);
    this.audit('data.restore.preflight.created', 'data_backup', input.backupId ?? id, { encrypted: pkg.encrypted, diff });
    return this.requireDataMobilityJob(id);
  }


  applyDataRollback(input: DataRollbackInput): DataMobilityJob {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.dataRestore, 'rollback_record', input.rollbackId);
    if (input.confirmationPhrase !== DATA_CONFIRMATION_PHRASES.rollback) {
      throw new Error(t('data.restore.errors.confirmation'));
    }
    const rollback = this.requireRollbackRecord(input.rollbackId);
    const affected = JSON.parse(rollback.affectedEntityIdsJson) as string[];
    const timestamp = now();
    for (const entityId of affected) {
      if (entityId.startsWith('model_')) this.db.prepare('UPDATE models SET enabled = 0, updated_at = ? WHERE id = ?').run(timestamp, entityId);
      if (entityId.startsWith('provider_')) this.db.prepare('UPDATE providers SET enabled = 0, updated_at = ? WHERE id = ?').run(timestamp, entityId);
    }
    this.db.prepare("UPDATE rollback_records SET state = 'applied', applied_at = ? WHERE id = ?").run(timestamp, rollback.id);
    const jobId = createId('rollback');
    this.insertDataMobilityJob({
      id: jobId,
      operationKind: 'rollback',
      status: 'completed',
      source: 'nexachat',
      profile: 'metadata-redacted',
      summary: t('data.snapshot.summary.rollbackApplied', { count: affected.length }),
      manifestJson: JSON.stringify({ affectedEntityIds: affected, rollbackRecordId: rollback.id }),
      manifestHash: stableHash(affected),
      conflictCount: affected.length,
      requiresConfirmation: false,
      encrypted: false,
      redacted: true,
      rollbackRecordId: rollback.id,
      relatedSnapshotId: rollback.rollbackSnapshotId,
      timestamp,
    });
    this.audit('data.rollback.applied', 'rollback_record', rollback.id, { affectedCount: affected.length });
    return this.requireDataMobilityJob(jobId);
  }

  };
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function buildChatRequestSummary(content: string): Record<string, unknown> {
  return {
    promptLength: content.length,
    promptTokenEstimate: estimateTokens(content),
    promptHash: createHash('sha256').update(content).digest('hex').slice(0, 16),
    redactedPreview: redactSensitive(content).slice(0, 120),
  };
}

function encodeSecretValue(value: string): string {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return `safeStorage:v1:${safeStorage.encryptString(value).toString('base64')}`;
    }
  } catch {
    // Electron safeStorage can be unavailable in early test/runtime bootstrap.
  }
  return `local-dev:v1:${Buffer.from(value, 'utf8').toString('base64')}`;
}

function decodeSecretValue(value: string): string {
  if (value.startsWith('safeStorage:v1:')) {
    return safeStorage.decryptString(Buffer.from(value.slice('safeStorage:v1:'.length), 'base64'));
  }
  if (value.startsWith('local-dev:v1:')) {
    return Buffer.from(value.slice('local-dev:v1:'.length), 'base64').toString('utf8');
  }
  return Buffer.from(value, 'base64').toString('utf8');
}

function inferTitle(currentTitle: string, content: string): string {
  if (currentTitle !== t('chat.seed.newConversation') && currentTitle !== t('chat.seed.welcomeConversation')) {
    return currentTitle;
  }
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 28) || currentTitle;
}

function safeJsonParse(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function safeStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function scoreEvaluationOutput(output: string, expectedKeywords: string[]): number {
  if (expectedKeywords.length === 0) {
    return output.trim().length > 0 ? 1 : 0;
  }
  const normalized = output.toLowerCase();
  const matches = expectedKeywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
  return Number((matches.length / expectedKeywords.length).toFixed(3));
}

function computeAuditHash(input: {
  id: string;
  action: string;
  actor: string;
  targetType: string;
  targetId: string | null;
  detailsJson: string | null;
  permissionKey: SecurityPermissionKey | null;
  previousHash: string | null;
  createdAt: number;
}): string {
  return createHash('sha256')
    .update(JSON.stringify({
      id: input.id,
      action: input.action,
      actor: input.actor,
      targetType: input.targetType,
      targetId: input.targetId,
      detailsJson: input.detailsJson,
      permissionKey: input.permissionKey,
      previousHash: input.previousHash,
      createdAt: input.createdAt,
    }))
    .digest('hex');
}
