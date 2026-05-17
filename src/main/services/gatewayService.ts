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

export function GatewayService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class GatewayService extends Base {
  getGatewayKeys(): GatewayApiKey[] {
    return this.repositories.gateway.listGatewayKeys();
  }


  getGatewayLogs(): GatewayLog[] {
    return this.repositories.gateway.listGatewayLogs();
  }


  getGatewayStatus(): GatewayStatus {
    return {
      enabled: this.gatewayEnabled,
      running: this.gatewayEnabled && this.gatewayListenerState === 'listening',
      listenerState: this.gatewayListenerState,
      port: GATEWAY_PORT,
      bindHost: GATEWAY_BIND_HOST,
      endpoints: [...GATEWAY_AVAILABLE_ENDPOINTS],
      recentError: this.gatewayRecentError,
      lastStartError: this.gatewayLastStartError,
    };
  }


  setGatewayRuntime(
    enabled: boolean,
    recentError: string | null = null,
    listenerState: GatewayStatus['listenerState'] = enabled ? 'listening' : 'stopped',
  ): GatewayStatus {
    this.gatewayEnabled = enabled;
    this.gatewayListenerState = listenerState;
    this.gatewayRecentError = recentError;
    this.gatewayLastStartError = listenerState === 'error' ? recentError : null;
    return this.getGatewayStatus();
  }


  createGatewayKey(input: GatewayKeyCreateInput | string): GatewayKeyCreated {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.gatewayKeyWrite, 'gateway_api_key', null);
    const normalizedInput: GatewayKeyCreateInput = typeof input === 'string' ? { name: input } : input;
    const name = normalizedInput.name.trim() || 'Local integration key';
    const scopes = normalizeGatewayScopes(normalizedInput.scopes);
    const quotaLimit = normalizeGatewayLimit(normalizedInput.quotaLimit);
    const rateLimit = normalizeGatewayRateLimit(normalizedInput.rateLimitPerMinute);
    const key = `nxk_${randomBytes(24).toString('hex')}`;
    const secretRef = this.saveSecret(`${name} gateway key`, key);
    const timestamp = now();
    const id = createId('gkey');
    this.db
      .prepare(
        `INSERT INTO gateway_api_keys (id, name, secret_ref, key_preview, scopes_json, disabled_at, rotated_from_id, last_error_code, rate_limit_per_minute, rate_window_started_at, rate_window_count, quota_limit, quota_used, expires_at, revoked_at, last_used_at, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, NULL, 0, ?, 0, ?, NULL, NULL, ?)`,
      )
      .run(id, name, secretRef, previewSecret(key), JSON.stringify(scopes), rateLimit, quotaLimit, normalizedInput.expiresAt ?? null, timestamp);
    this.audit('gateway.key.created', 'gateway_api_key', id, { name, scopes, quotaLimit, rateLimitPerMinute: rateLimit });
    return { key, record: this.requireGatewayKey(id) };
  }


  updateGatewayKey(input: GatewayKeyUpdateInput): GatewayApiKey {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.gatewayKeyWrite, 'gateway_api_key', input.gatewayKeyId);
    const existing = this.requireGatewayKey(input.gatewayKeyId);
    const name = input.name !== undefined ? input.name.trim() || existing.name : existing.name;
    const scopes = input.scopes !== undefined ? normalizeGatewayScopes(input.scopes) : existing.scopes;
    const quotaLimit = input.quotaLimit !== undefined ? normalizeGatewayLimit(input.quotaLimit) : existing.quotaLimit;
    const rateLimit = input.rateLimitPerMinute !== undefined ? normalizeGatewayRateLimit(input.rateLimitPerMinute) : existing.rateLimitPerMinute;
    const disabledAt = input.disabled === undefined ? existing.disabledAt : input.disabled ? existing.disabledAt ?? now() : null;
    const expiresAt = input.expiresAt !== undefined ? input.expiresAt : existing.expiresAt;
    this.db
      .prepare(
        `UPDATE gateway_api_keys
         SET name = ?, scopes_json = ?, disabled_at = ?, quota_limit = ?, rate_limit_per_minute = ?, expires_at = ?
         WHERE id = ?`,
      )
      .run(name, JSON.stringify(scopes), disabledAt, quotaLimit, rateLimit, expiresAt ?? null, input.gatewayKeyId);
    this.audit('gateway.key.updated', 'gateway_api_key', input.gatewayKeyId, {
      name,
      scopes,
      quotaLimit,
      rateLimitPerMinute: rateLimit,
      disabled: Boolean(disabledAt),
    });
    return this.requireGatewayKey(input.gatewayKeyId);
  }


  rotateGatewayKey(input: GatewayKeyRotateInput): GatewayKeyCreated {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.gatewayKeyWrite, 'gateway_api_key', input.gatewayKeyId);
    const oldKey = this.requireGatewayKey(input.gatewayKeyId);
    const created = this.createGatewayKey({
      name: `${oldKey.name} rotated`,
      scopes: oldKey.scopes,
      quotaLimit: oldKey.quotaLimit,
      rateLimitPerMinute: oldKey.rateLimitPerMinute,
      expiresAt: oldKey.expiresAt,
    });
    const timestamp = now();
    this.db
      .prepare('UPDATE gateway_api_keys SET rotated_from_id = ? WHERE id = ?')
      .run(oldKey.id, created.record.id);
    this.db
      .prepare('UPDATE gateway_api_keys SET revoked_at = ? WHERE id = ?')
      .run(oldKey.revokedAt ?? timestamp, oldKey.id);
    this.audit('gateway.key.rotated', 'gateway_api_key', oldKey.id, { newKeyId: created.record.id, keyPreview: oldKey.keyPreview });
    return { ...created, record: this.requireGatewayKey(created.record.id) };
  }


  revokeGatewayKey(gatewayKeyId: string): GatewayApiKey {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.gatewayKeyWrite, 'gateway_api_key', gatewayKeyId);
    const key = this.requireGatewayKey(gatewayKeyId);
    const timestamp = now();
    this.db
      .prepare('UPDATE gateway_api_keys SET revoked_at = ? WHERE id = ?')
      .run(key.revokedAt ?? timestamp, gatewayKeyId);
    this.audit('gateway.key.revoked', 'gateway_api_key', gatewayKeyId, { keyPreview: key.keyPreview });
    return this.requireGatewayKey(gatewayKeyId);
  }


  toggleGateway(enabled: boolean): GatewayStatus {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.gatewayRuntimeWrite, 'gateway', null);
    this.gatewayEnabled = enabled;
    this.setSetting(GATEWAY_ENABLED_SETTING_KEY, enabled ? 'true' : 'false');
    this.audit(enabled ? 'gateway.enabled' : 'gateway.disabled', 'gateway', null, { bindHost: GATEWAY_BIND_HOST, port: GATEWAY_PORT });
    return this.getGatewayStatus();
  }


  authorizeGatewayKey(rawKey: string | null, scope: GatewayScope): GatewayAuthorizationResult {
    if (!rawKey) {
      return { ok: false, key: null, scope, errorCode: 'missing_key' };
    }
    const rows = this.db
      .prepare(
        `SELECT gateway_api_keys.*, secrets.encrypted_value
         FROM gateway_api_keys
         JOIN secrets ON secrets.id = gateway_api_keys.secret_ref`,
      )
      .all() as Array<Record<string, unknown> & { encrypted_value: string }>;

    for (const row of rows) {
      const decoded = decodeSecretValue(String(row.encrypted_value));
      if (decoded !== rawKey) {
        continue;
      }
      const record = mapGatewayKey(row);
      const nowValue = now();
      if (record.revokedAt) {
        this.markGatewayKeyError(record.id, 'revoked_key');
        return { ok: false, key: record, scope, errorCode: 'revoked_key' };
      }
      if (record.disabledAt) {
        this.markGatewayKeyError(record.id, 'disabled_key');
        return { ok: false, key: record, scope, errorCode: 'disabled_key' };
      }
      if (record.expiresAt && record.expiresAt < nowValue) {
        this.markGatewayKeyError(record.id, 'expired_key');
        return { ok: false, key: record, scope, errorCode: 'expired_key' };
      }
      if (!record.scopes.includes(scope)) {
        this.markGatewayKeyError(record.id, 'scope_denied');
        return { ok: false, key: record, scope, errorCode: 'scope_denied' };
      }
      if (record.quotaLimit !== null && record.quotaUsed >= record.quotaLimit) {
        this.markGatewayKeyError(record.id, 'quota_exceeded');
        return { ok: false, key: record, scope, errorCode: 'quota_exceeded' };
      }
      if (record.rateLimitPerMinute !== null && record.rateLimitPerMinute >= 0) {
        const windowStartedAt = record.rateWindowStartedAt && nowValue - record.rateWindowStartedAt < GATEWAY_RATE_WINDOW_MS
          ? record.rateWindowStartedAt
          : nowValue;
        const windowCount = windowStartedAt === record.rateWindowStartedAt ? record.rateWindowCount : 0;
        if (windowCount >= record.rateLimitPerMinute) {
          this.markGatewayKeyError(record.id, 'rate_limited');
          return { ok: false, key: record, scope, errorCode: 'rate_limited' };
        }
        this.db
          .prepare(
            `UPDATE gateway_api_keys
             SET quota_used = quota_used + 1, last_used_at = ?, last_error_code = NULL, rate_window_started_at = ?, rate_window_count = ?
             WHERE id = ?`,
          )
          .run(nowValue, windowStartedAt, windowCount + 1, record.id);
      } else {
        this.db
          .prepare('UPDATE gateway_api_keys SET quota_used = quota_used + 1, last_used_at = ?, last_error_code = NULL WHERE id = ?')
          .run(nowValue, record.id);
      }
      return { ok: true, key: this.requireGatewayKey(record.id), scope, errorCode: null };
    }
    return { ok: false, key: null, scope, errorCode: 'invalid_key' };
  }


  validateGatewayKey(rawKey: string, scope: GatewayScope): GatewayApiKey | null {
    const result = this.authorizeGatewayKey(rawKey, scope);
    return result.ok ? result.key : null;
  }


  recordGatewayLog(input: GatewayLogInput): void {
    const linkedRequest = input.requestLogId ? this.requireRequestLog(input.requestLogId) : null;
    this.db
      .prepare(
        `INSERT INTO gateway_logs (id, request_log_id, gateway_key_id, key_preview, scope, error_code, latency_ms, remote_address, method, path, status_code, redacted_headers_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        createId('gwlog'),
        input.requestLogId ?? null,
        input.key?.id ?? null,
        input.key?.keyPreview ?? null,
        input.scope ?? null,
        input.errorCode ?? null,
        input.latencyMs ?? null,
        input.remoteAddress ?? null,
        input.method,
        input.path,
        input.statusCode,
        JSON.stringify(redactHeaders(input.headers ?? {})),
        now(),
      );
    if (linkedRequest?.providerId) {
      this.recordProviderHealth(
        linkedRequest.providerId,
        linkedRequest.modelId,
        input.statusCode >= 400 ? 'error' : 'healthy',
        input.latencyMs ?? linkedRequest.latencyMs,
        'gateway',
        input.errorCode ?? linkedRequest.errorCode,
        linkedRequest.errorMessage,
      );
    }
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
