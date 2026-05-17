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

export function ObservabilityService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ObservabilityService extends Base {
  getRequestLogs(): RequestLog[] {
    return this.repositories.observability.listRequestLogs();
  }


  getUsageRecords(): UsageRecord[] {
    return this.repositories.observability.listUsageRecords();
  }


  getFeedbackItems(): FeedbackItem[] {
    return this.repositories.observability.listFeedbackItems();
  }


  getEvalSets(): EvalSet[] {
    return this.repositories.observability.listEvalSets();
  }


  getEvalResults(evalSetId?: string): EvalResult[] {
    return this.repositories.observability.listEvalResults(evalSetId);
  }


  queryObservability(input: ObservabilityQueryInput = {}): ObservabilitySnapshot {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityRead, 'observability', null);
    const query = normalizeObservabilityQuery(input);
    const requestLogs = filterObservabilityRequestLogs(this.getRequestLogs(), query);
    const requestLogIds = new Set(requestLogs.map((log) => log.id));
    const gatewayLogs = this.getGatewayLogs().filter((log) => !log.requestLogId || requestLogIds.has(log.requestLogId) || !query.query);
    const usageRecords = this.getUsageRecords().filter((record) => !record.requestLogId || requestLogIds.has(record.requestLogId));
    const auditLogs = query.includeAudit ? this.getAuditLogs() : [];
    const executionTraceEvents = query.includeTrace ? this.getExecutionTraceEvents() : [];
    const knowledgeRetrievals = this.getKnowledgeRetrievalTraces();
    const providerHealthRecords = this.getProviderHealthRecords().filter((record) =>
      (!query.providerId || record.providerId === query.providerId) && (!query.modelId || record.modelId === query.modelId),
    );
    const feedbackItems = this.getFeedbackItems().filter((item) => !item.requestLogId || requestLogIds.has(item.requestLogId));
    const evalSets = this.getEvalSets();
    const evalResults = this.getEvalResults().filter((result) =>
      (!query.providerId || result.providerId === query.providerId) && (!query.modelId || result.modelId === query.modelId),
    );
    const privacy = this.getObservabilityPrivacySettings();
    return {
      summary: buildObservabilitySummary({
        providers: this.getProviders(),
        requestLogs,
        gatewayLogs,
        usageRecords,
        auditLogs,
        executionTraceEvents,
        knowledgeRetrievals,
        feedbackCount: feedbackItems.length,
        evalResultCount: evalResults.length,
      }),
      query,
      requestLogs,
      gatewayLogs,
      usageRecords,
      auditLogs,
      executionTraceEvents,
      knowledgeRetrievals,
      providerHealthRecords,
      feedbackItems,
      evalSets,
      evalResults,
      privacy,
    };
  }


  createFeedback(input: FeedbackCreateInput): FeedbackItem {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityWrite, 'feedback', input.requestLogId ?? input.messageId ?? null);
    const label = OBSERVABILITY_FEEDBACK_LABELS.includes(input.label) ? input.label : 'other';
    const requestLog = input.requestLogId ? this.requireRequestLog(input.requestLogId) : null;
    const message = input.messageId ? this.requireMessage(input.messageId) : requestLog?.messageId ? this.requireMessage(requestLog.messageId) : null;
    const timestamp = now();
    const id = createId('feedback');
    this.db
      .prepare(
        `INSERT INTO feedback_items (id, label, message_id, request_log_id, notes, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        label,
        message?.id ?? null,
        requestLog?.id ?? input.requestLogId ?? null,
        input.notes ? redactSensitive(input.notes).slice(0, 500) : null,
        JSON.stringify({
          linkedProviderId: requestLog?.providerId ?? message?.providerId ?? null,
          linkedModelId: requestLog?.modelId ?? message?.modelId ?? null,
        }),
        timestamp,
      );
    this.audit('observability.feedback.created', 'feedback', id, { label, requestLogId: requestLog?.id ?? null }, SECURITY_ACTION_PERMISSIONS.observabilityWrite);
    return this.requireFeedbackItem(id);
  }


  async runEvaluation(input: EvalRunInput): Promise<EvalResult> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityWrite, 'eval_set', input.evalSetId);
    const evalSet = this.requireEvalSet(input.evalSetId);
    const routeDecision = this.route(undefined, input.modelId ?? undefined);
    const provider = this.requireProvider(routeDecision.providerId);
    const model = this.requireModel(routeDecision.modelId);
    const adapterName = getProviderAdapterName(provider.type);
    const timestamp = now();
    const requestLogId = createId('req');
    this.db
      .prepare(
        `INSERT INTO request_logs (id, conversation_id, message_id, provider_id, model_id, model_name_snapshot, route_id, gateway_request_id, status, endpoint, request_summary_json, response_summary_json, input_tokens, output_tokens, latency_ms, finish_reason, error_code, error_message, started_at, completed_at, created_at)
         VALUES (?, NULL, NULL, ?, ?, ?, NULL, NULL, 'started', '/eval/run', ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?)`,
      )
      .run(
        requestLogId,
        provider.id,
        model.id,
        model.modelNameSnapshot,
        JSON.stringify({
          evalSetId: evalSet.id,
          model: model.name,
          expectedKeywords: safeStringArray(evalSet.expectedKeywordsJson),
        }),
        estimateTokens(evalSet.prompt),
        timestamp,
        timestamp,
      );

    let resultId = createId('eval_result');
    try {
      if (adapterName !== 'openai-compatible') {
        throw new ProviderRuntimeError(t('models.errors.unsupportedProvider'), PROVIDER_RUNTIME_ERROR_CODES.unsupportedProvider);
      }
      const invocation = await invokeOpenAiCompatibleChat({
        provider,
        model,
        apiKey: this.getProviderSecret(provider),
        messages: [{ role: 'user', content: evalSet.prompt }],
        stream: false,
      });
      const outputTokens = invocation.outputTokens ?? estimateTokens(invocation.content);
      const inputTokens = invocation.inputTokens ?? estimateTokens(evalSet.prompt);
      const expectedKeywords = safeStringArray(evalSet.expectedKeywordsJson);
      const score = scoreEvaluationOutput(invocation.content, expectedKeywords);
      this.db
        .prepare(
          `UPDATE request_logs
           SET status = 'completed', response_summary_json = ?, input_tokens = ?, output_tokens = ?, latency_ms = ?, finish_reason = ?, completed_at = ?
           WHERE id = ?`,
        )
        .run(
          JSON.stringify({ redactedPreview: redactSensitive(invocation.content).slice(0, 280), score }),
          inputTokens,
          outputTokens,
          invocation.latencyMs,
          invocation.finishReason ?? 'stop',
          now(),
          requestLogId,
        );
      this.db
        .prepare(
          `INSERT INTO usage_records (id, workspace_id, provider_id, model_id, request_log_id, input_tokens, output_tokens, cost_estimate, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('usage'),
          DEFAULT_WORKSPACE_ID,
          provider.id,
          model.id,
          requestLogId,
          inputTokens,
          outputTokens,
          this.estimateCost(model.id, inputTokens, outputTokens),
          now(),
        );
      this.db
        .prepare(
          `INSERT INTO eval_results (id, eval_set_id, provider_id, model_id, request_log_id, status, score, latency_ms, output_preview, error_code, error_message, created_at)
           VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, NULL, NULL, ?)`,
        )
        .run(resultId, evalSet.id, provider.id, model.id, requestLogId, score, invocation.latencyMs, redactSensitive(invocation.content).slice(0, 500), now());
      this.recordProviderHealth(provider.id, model.id, 'healthy', invocation.latencyMs, 'chat', null, null);
      this.audit('observability.eval.completed', 'eval_set', evalSet.id, { resultId, score, requestLogId }, SECURITY_ACTION_PERMISSIONS.observabilityWrite);
    } catch (error) {
      const normalized = this.normalizeProviderError(error);
      this.db
        .prepare(
          `UPDATE request_logs
           SET status = 'failed', response_summary_json = ?, latency_ms = ?, error_code = ?, error_message = ?, completed_at = ?
           WHERE id = ?`,
        )
        .run(JSON.stringify({ retryable: normalized.retryable }), Math.max(1, now() - timestamp), normalized.code, normalized.message, now(), requestLogId);
      this.db
        .prepare(
          `INSERT INTO eval_results (id, eval_set_id, provider_id, model_id, request_log_id, status, score, latency_ms, output_preview, error_code, error_message, created_at)
           VALUES (?, ?, ?, ?, ?, 'failed', NULL, ?, NULL, ?, ?, ?)`,
        )
        .run(resultId, evalSet.id, provider.id, model.id, requestLogId, Math.max(1, now() - timestamp), normalized.code, normalized.message, now());
      this.recordProviderHealth(provider.id, model.id, 'error', Math.max(1, now() - timestamp), 'chat', normalized.code, normalized.message);
      this.audit('observability.eval.failed', 'eval_set', evalSet.id, { resultId, errorCode: normalized.code, requestLogId }, SECURITY_ACTION_PERMISSIONS.observabilityWrite);
    }
    this.db.prepare('UPDATE eval_sets SET status = ?, updated_at = ? WHERE id = ?').run('completed', now(), evalSet.id);
    return this.requireEvalResult(resultId);
  }


  exportObservability(input: ObservabilityQueryInput = {}): ObservabilityExportResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityExport, 'observability', null);
    const snapshot = this.queryObservability(input);
    const id = createId('observability_export');
    const createdAt = now();
    const content = buildRedactedObservabilityExport(
      {
        summary: snapshot.summary,
        requestLogs: snapshot.requestLogs,
        gatewayLogs: snapshot.gatewayLogs,
        usageRecords: snapshot.usageRecords,
        providerHealthRecords: snapshot.providerHealthRecords,
        feedbackItems: snapshot.feedbackItems,
        evalSets: snapshot.evalSets,
        evalResults: snapshot.evalResults,
        auditLogs: snapshot.auditLogs,
        executionTraceEvents: snapshot.executionTraceEvents,
        knowledgeRetrievals: snapshot.knowledgeRetrievals,
      },
      snapshot.privacy,
    );
    this.audit('observability.exported', 'observability', id, { requestCount: snapshot.summary.requestCount, redacted: true }, SECURITY_ACTION_PERMISSIONS.observabilityExport);
    return {
      id,
      redacted: true,
      content,
      summary: snapshot.summary,
      createdAt,
    };
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
