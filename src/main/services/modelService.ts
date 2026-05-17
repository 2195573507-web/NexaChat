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

export function ModelService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ModelService extends Base {
  getModels(): Model[] {
    return this.repositories.model.listModels();
  }


  async fetchProviderModels(providerId: string): Promise<ProviderModelOption[]> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerTest, 'provider', providerId);
    const provider = this.requireProvider(providerId);
    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${providerId}`);
    }
    const adapterName = getProviderAdapterName(provider.type);
    if (adapterName !== 'openai-compatible') {
      this.recordProviderHealth(
        providerId,
        null,
        'error',
        null,
        'provider-test',
        PROVIDER_RUNTIME_ERROR_CODES.unsupportedProvider,
        t('models.errors.unsupportedProvider'),
      );
      throw new ProviderRuntimeError(t('models.errors.unsupportedProvider'), PROVIDER_RUNTIME_ERROR_CODES.unsupportedProvider);
    }

    const start = now();
    try {
      const result = await fetchOpenAiCompatibleModels(provider, this.getProviderSecret(provider));
      this.db
        .prepare('UPDATE providers SET health_status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?')
        .run('healthy', start, now(), providerId);
      this.recordProviderHealth(providerId, null, 'healthy', result.latencyMs, 'provider-test', null, null);
      this.audit('provider.models.fetched', 'provider', providerId, {
        status: result.status,
        modelCount: result.modelNames.length,
        models: result.modelNames.slice(0, 20),
      }, SECURITY_ACTION_PERMISSIONS.providerTest);
      return result.modelNames.map((name) => ({ id: name, name }));
    } catch (error) {
      const normalized = this.normalizeProviderError(error);
      this.db
        .prepare('UPDATE providers SET health_status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?')
        .run('error', start, now(), providerId);
      this.recordProviderHealth(providerId, null, 'error', Math.max(1, now() - start), 'provider-test', normalized.code, normalized.message);
      this.audit('provider.models.fetch_failed', 'provider', providerId, {
        errorCode: normalized.code,
        errorMessage: normalized.message,
      }, SECURITY_ACTION_PERMISSIONS.providerTest);
      throw error;
    }
  }


  createModel(input: ModelInput): Model {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.modelWrite, 'model', null);
    const provider = this.requireProvider(input.providerId);
    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${provider.id}`);
    }
    const timestamp = now();
    const id = createId('model');
    const displayName = input.displayName?.trim() || input.name.trim();
    this.db
      .prepare(
        `INSERT INTO models (id, provider_id, name, display_name, model_name_snapshot, context_window, supports_streaming, supports_tools, supports_vision, supports_embeddings, input_price, output_price, health_status, latency_ms, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'unknown', NULL, 1, ?, ?)`,
      )
      .run(
        id,
        provider.id,
        input.name.trim(),
        displayName,
        input.name.trim(),
        input.contextWindow ?? 128000,
        input.supportsStreaming === false ? 0 : 1,
        input.supportsTools ? 1 : 0,
        input.supportsVision ? 1 : 0,
        input.supportsEmbeddings ? 1 : 0,
        timestamp,
        timestamp,
      );

    const aliasCount = Number(
      (this.db.prepare('SELECT COUNT(*) AS count FROM model_aliases').get() as { count: number }).count,
    );
    if (aliasCount === 0) {
      this.db
        .prepare('INSERT INTO model_aliases (id, alias, model_id, enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
        .run(createId('alias'), 'nexachat-default', id, timestamp, timestamp);
    }

    this.audit('model.created', 'model', id, { providerId: provider.id, model: input.name });
    return this.requireModel(id);
  }


  resolveGatewayModelId(modelName: string | undefined): string | undefined {
    if (!modelName) {
      return undefined;
    }
    const alias = this.db
      .prepare('SELECT model_id FROM model_aliases WHERE alias = ? AND enabled = 1')
      .get(modelName) as { model_id: string } | undefined;
    if (alias) {
      return alias.model_id;
    }
    const model = this.getModels().find((item) => item.name === modelName || item.displayName === modelName || item.id === modelName);
    return model?.id;
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
