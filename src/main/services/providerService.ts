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

export function ProviderService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ProviderService extends Base {
  getProviders(): Provider[] {
    return this.repositories.provider.listProviders();
  }


  getProviderHealthRecords(): ProviderHealthRecord[] {
    return this.repositories.provider.listProviderHealthRecords();
  }


  createProvider(input: ProviderInput): Provider {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerWrite, 'provider', null);
    if (!/^https?:\/\//i.test(input.baseUrl.trim())) {
      throw new Error(t('models.errors.invalidBaseUrl'));
    }
    const timestamp = now();
    const providerId = createId('provider');
    const secretRef = input.apiKey ? this.saveSecret(`${input.name} API Key`, input.apiKey) : null;
    this.db
      .prepare(
        `INSERT INTO providers (id, name, type, base_url, proxy_url, auth_type, secret_ref, custom_headers_json, enabled, health_status, last_checked_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'unknown', NULL, ?, ?)`,
      )
      .run(
        providerId,
        input.name.trim(),
        input.type,
        normalizeBaseUrl(input.baseUrl),
        input.proxyUrl?.trim() || null,
        input.apiKey ? 'api-key' : 'none',
        secretRef,
        input.customHeadersJson?.trim() || null,
        timestamp,
        timestamp,
      );
    this.audit('provider.created', 'provider', providerId, { name: input.name, baseUrl: normalizeBaseUrl(input.baseUrl) });
    return this.requireProvider(providerId);
  }


  deleteProvider(providerId: string): Provider {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerWrite, 'provider', providerId);
    const provider = this.requireProvider(providerId);
    const timestamp = now();
    const disabledModelIds = this.db
      .prepare('SELECT id FROM models WHERE provider_id = ? AND enabled = 1')
      .all(providerId)
      .map((row) => String((row as { id: unknown }).id));

    try {
      this.db.exec('BEGIN IMMEDIATE');
      this.db
        .prepare('UPDATE providers SET enabled = 0, health_status = ?, updated_at = ? WHERE id = ?')
        .run('unknown', timestamp, providerId);
      this.db
        .prepare('UPDATE models SET enabled = 0, health_status = ?, latency_ms = NULL, updated_at = ? WHERE provider_id = ?')
        .run('unknown', timestamp, providerId);
      this.db
        .prepare(
          `UPDATE workspaces
           SET default_provider_id = CASE WHEN default_provider_id = ? THEN NULL ELSE default_provider_id END,
               default_model_id = CASE WHEN default_model_id IN (SELECT id FROM models WHERE provider_id = ?) THEN NULL ELSE default_model_id END,
               updated_at = ?
           WHERE default_provider_id = ? OR default_model_id IN (SELECT id FROM models WHERE provider_id = ?)`,
        )
        .run(providerId, providerId, timestamp, providerId, providerId);
      this.db
        .prepare(
          `UPDATE conversations
           SET default_provider_id = CASE WHEN default_provider_id = ? THEN NULL ELSE default_provider_id END,
               default_model_id = CASE WHEN default_model_id IN (SELECT id FROM models WHERE provider_id = ?) THEN NULL ELSE default_model_id END,
               updated_at = ?
           WHERE default_provider_id = ? OR default_model_id IN (SELECT id FROM models WHERE provider_id = ?)`,
        )
        .run(providerId, providerId, timestamp, providerId, providerId);
      if (disabledModelIds.length > 0) {
        const placeholders = disabledModelIds.map(() => '?').join(', ');
        this.db
          .prepare(`UPDATE model_aliases SET enabled = 0, updated_at = ? WHERE model_id IN (${placeholders})`)
          .run(timestamp, ...disabledModelIds);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    this.audit('provider.deleted', 'provider', providerId, {
      name: provider.name,
      disabledModelCount: disabledModelIds.length,
      mode: 'soft-delete',
    });
    return this.requireProvider(providerId);
  }


  async testProvider(providerId: string): Promise<Provider> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerTest, 'provider', providerId);
    const provider = this.requireProvider(providerId);
    const start = now();
    const adapterName = getProviderAdapterName(provider.type);
    const apiKey = this.getProviderSecret(provider);
    const health = adapterName === 'openai-compatible'
      ? await testOpenAiCompatibleProvider(provider, apiKey)
      : {
          ok: false,
          latencyMs: Math.max(1, now() - start),
          status: null,
          errorCode: PROVIDER_RUNTIME_ERROR_CODES.unsupportedProvider,
          errorMessage: t('models.errors.unsupportedProvider'),
          modelNames: [],
        };
    const status = health.ok ? 'healthy' : 'error';
    this.db
      .prepare('UPDATE providers SET health_status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?')
      .run(status, start, start, providerId);
    this.db
      .prepare('UPDATE models SET health_status = ?, latency_ms = ?, updated_at = ? WHERE provider_id = ?')
      .run(status, health.ok ? health.latencyMs : null, now(), providerId);
    this.db
      .prepare(
        `INSERT INTO request_logs (id, conversation_id, message_id, provider_id, model_id, model_name_snapshot, route_id, gateway_request_id, status, endpoint, request_summary_json, response_summary_json, input_tokens, output_tokens, latency_ms, finish_reason, error_code, error_message, started_at, completed_at, created_at)
         VALUES (?, NULL, NULL, ?, NULL, NULL, NULL, NULL, ?, '/provider/test', ?, ?, NULL, NULL, ?, NULL, ?, ?, ?, ?, ?)`,
      )
      .run(
        createId('req'),
        providerId,
        health.ok ? 'completed' : 'failed',
        JSON.stringify({
          adapter: adapterName,
          baseUrl: provider.baseUrl,
          authType: provider.authType,
          timeoutMs: PROVIDER_RUNTIME_POLICY.healthTimeoutMs,
        }),
        JSON.stringify({
          status: health.status,
          modelCount: health.modelNames.length,
          models: health.modelNames.slice(0, 20),
        }),
        health.latencyMs,
        health.errorCode,
        health.errorMessage ? redactSensitive(health.errorMessage) : null,
        start,
        now(),
        start,
      );
    this.audit('provider.tested', 'provider', providerId, {
      status,
      baseUrl: provider.baseUrl,
      adapter: adapterName,
      modelCount: health.modelNames.length,
      errorCode: health.errorCode,
    });
    this.recordProviderHealth(providerId, null, status, health.latencyMs, 'provider-test', health.errorCode, health.errorMessage);
    return this.requireProvider(providerId);
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
