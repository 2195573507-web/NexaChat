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
} from './openAiCompatibleAdapter.js';

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

export class NexaStore {
  private readonly db: DatabaseSync;
  private gatewayEnabled = false;
  private gatewayListenerState: GatewayStatus['listenerState'] = 'stopped';
  private gatewayRecentError: string | null = null;
  private gatewayLastStartError: string | null = null;
  private readonly activeChatControllers = new Map<string, AbortController>();

  constructor() {
    this.db = getDatabase().db;
    this.seed();
    this.gatewayEnabled = this.getSetting(GATEWAY_ENABLED_SETTING_KEY) === 'true';
  }

  getDatabasePath(): string {
    return getDatabase().path;
  }

  getRawDatabaseForTesting(): DatabaseSync {
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      throw new Error('Raw database access is only available in tests.');
    }
    return this.db;
  }

  getSnapshot(): AppSnapshot {
    return {
      dashboard: this.getDashboardSummary(),
      conversations: this.getConversations(),
      messages: this.getMessages(),
      messageChunks: this.getMessageChunks(),
      messageAttachments: this.getMessageAttachments(),
      promptTemplates: this.getPromptTemplates(),
      conversationExports: this.getConversationExports(),
      providers: this.getProviders(),
      models: this.getModels(),
      requestLogs: this.getRequestLogs(),
      gatewayLogs: this.getGatewayLogs(),
      usageRecords: this.getUsageRecords(),
      providerHealthRecords: this.getProviderHealthRecords(),
      feedbackItems: this.getFeedbackItems(),
      evalSets: this.getEvalSets(),
      evalResults: this.getEvalResults(),
      observability: this.queryObservability(),
      gatewayKeys: this.getGatewayKeys(),
      knowledgeFiles: this.getKnowledgeFiles(),
      knowledgeChunks: this.getKnowledgeChunks(),
      knowledgeRetrievals: this.getKnowledgeRetrievalTraces(),
      knowledgeCitations: this.getKnowledgeCitations(),
      mcpServers: this.getMcpServers(),
      agents: this.getAgents(),
      tools: this.getTools(),
      executionRuns: this.getExecutionRuns(),
      executionSteps: this.getExecutionSteps(),
      executionTraceEvents: this.getExecutionTraceEvents(),
      approvalRequests: this.getApprovalRequests(),
      importExportResults: this.getImportExportResults(),
      dataMobilityJobs: this.getDataMobilityJobs(),
      dataConflicts: this.getDataConflicts(),
      dataBackups: this.getDataBackups(),
      migrationRuns: this.getMigrationRuns(),
      rollbackRecords: this.getRollbackRecords(),
      auditLogs: this.getAuditLogs(),
      security: this.getSecurityState(),
      auditIntegrity: this.verifyAuditIntegrity({ persistAudit: false }),
      uiPreferences: this.getUiPreferences(),
    };
  }

  getDashboardSummary(): DashboardSummary {
    const workspace = this.getDefaultWorkspace();
    const providers = this.getProviders();
    const models = this.getModels();
    const usage = this.getUsageRecords();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = usage.filter((record) => record.createdAt >= todayStart.getTime());
    const setupGaps: string[] = [];
    if (providers.length === 0) setupGaps.push(t('dashboard.setup.providerMissing'));
    if (models.length === 0) setupGaps.push(t('dashboard.setup.modelMissing'));
    if (this.getGatewayKeys().length === 0) setupGaps.push(t('dashboard.setup.gatewayKeyMissing'));
    if (this.getConversations().length === 0) setupGaps.push(t('dashboard.setup.conversationMissing'));

    return {
      workspace,
      recentConversations: this.getConversations().slice(0, 5),
      providers,
      models,
      gatewayStatus: this.getGatewayStatus(),
      usageToday: {
        requests: today.length,
        inputTokens: today.reduce((sum, record) => sum + record.inputTokens, 0),
        outputTokens: today.reduce((sum, record) => sum + record.outputTokens, 0),
        costEstimate: today.reduce((sum, record) => sum + record.costEstimate, 0),
      },
      setupGaps,
    };
  }

  getProviders(): Provider[] {
    return this.db
      .prepare('SELECT * FROM providers WHERE enabled = 1 ORDER BY updated_at DESC')
      .all()
      .map((row) => mapProvider(row as Record<string, unknown>));
  }

  getModels(): Model[] {
    return this.db
      .prepare('SELECT * FROM models WHERE enabled = 1 ORDER BY updated_at DESC')
      .all()
      .map((row) => mapModel(row as Record<string, unknown>));
  }

  getConversations(): Conversation[] {
    return this.db
      .prepare("SELECT * FROM conversations WHERE status != 'deleted' ORDER BY is_pinned DESC, updated_at DESC")
      .all()
      .map((row) => mapConversation(row as Record<string, unknown>));
  }

  getMessages(conversationId?: string): Message[] {
    const sql = conversationId
      ? 'SELECT * FROM messages WHERE conversation_id = ? AND status != ? ORDER BY created_at ASC'
      : 'SELECT * FROM messages WHERE status != ? ORDER BY created_at ASC';
    const rows = conversationId
      ? this.db.prepare(sql).all(conversationId, 'deleted')
      : this.db.prepare(sql).all('deleted');
    return rows.map((row) => mapMessage(row as Record<string, unknown>));
  }

  getMessageChunks(messageId?: string): MessageChunk[] {
    const sql = messageId
      ? 'SELECT * FROM message_chunks WHERE message_id = ? ORDER BY sequence ASC'
      : 'SELECT * FROM message_chunks ORDER BY created_at ASC, sequence ASC LIMIT 500';
    const rows = messageId ? this.db.prepare(sql).all(messageId) : this.db.prepare(sql).all();
    return rows.map((row) => mapMessageChunk(row as Record<string, unknown>));
  }

  getMessageAttachments(conversationId?: string): MessageAttachment[] {
    const sql = conversationId
      ? "SELECT * FROM message_attachments WHERE conversation_id = ? AND status != 'deleted' ORDER BY created_at ASC"
      : "SELECT * FROM message_attachments WHERE status != 'deleted' ORDER BY created_at ASC LIMIT 200";
    const rows = conversationId ? this.db.prepare(sql).all(conversationId) : this.db.prepare(sql).all();
    return rows.map((row) => mapMessageAttachment(row as Record<string, unknown>));
  }

  getPromptTemplates(): PromptTemplate[] {
    return this.db
      .prepare('SELECT * FROM prompt_templates ORDER BY scope ASC, updated_at DESC')
      .all()
      .map((row) => mapPromptTemplate(row as Record<string, unknown>));
  }

  getConversationExports(conversationId?: string): ConversationExport[] {
    const sql = conversationId
      ? 'SELECT * FROM conversation_exports WHERE conversation_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM conversation_exports ORDER BY created_at DESC LIMIT 50';
    const rows = conversationId ? this.db.prepare(sql).all(conversationId) : this.db.prepare(sql).all();
    return rows.map((row) => mapConversationExport(row as Record<string, unknown>));
  }

  getRequestLogs(): RequestLog[] {
    return this.db
      .prepare('SELECT * FROM request_logs ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapRequestLog(row as Record<string, unknown>));
  }

  getUsageRecords(): UsageRecord[] {
    return this.db
      .prepare('SELECT * FROM usage_records ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapUsageRecord(row as Record<string, unknown>));
  }

  getProviderHealthRecords(): ProviderHealthRecord[] {
    return this.db
      .prepare('SELECT * FROM provider_health_records ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapProviderHealthRecord(row as Record<string, unknown>));
  }

  getFeedbackItems(): FeedbackItem[] {
    return this.db
      .prepare('SELECT * FROM feedback_items ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapFeedbackItem(row as Record<string, unknown>));
  }

  getEvalSets(): EvalSet[] {
    return this.db
      .prepare('SELECT * FROM eval_sets ORDER BY updated_at DESC')
      .all()
      .map((row) => mapEvalSet(row as Record<string, unknown>));
  }

  getEvalResults(evalSetId?: string): EvalResult[] {
    const rows = evalSetId
      ? this.db.prepare('SELECT * FROM eval_results WHERE eval_set_id = ? ORDER BY created_at DESC LIMIT 200').all(evalSetId)
      : this.db.prepare('SELECT * FROM eval_results ORDER BY created_at DESC LIMIT 200').all();
    return rows.map((row) => mapEvalResult(row as Record<string, unknown>));
  }

  getObservabilityPrivacySettings(): ObservabilityPrivacySettings {
    const raw = this.getSetting(OBSERVABILITY_PRIVACY_SETTING_KEY);
    if (!raw) {
      return normalizeObservabilityPrivacySettings({
        ...DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS,
        updatedAt: now(),
      });
    }
    try {
      return normalizeObservabilityPrivacySettings(JSON.parse(raw) as Partial<ObservabilityPrivacySettings>);
    } catch {
      return normalizeObservabilityPrivacySettings({
        ...DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS,
        updatedAt: now(),
      });
    }
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

  saveObservabilityPrivacy(input: Partial<ObservabilityPrivacySettings>): ObservabilityPrivacySettings {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityWrite, 'observability_privacy', null);
    const settings = normalizeObservabilityPrivacySettings({ ...this.getObservabilityPrivacySettings(), ...input, updatedAt: now() });
    this.setSetting(OBSERVABILITY_PRIVACY_SETTING_KEY, JSON.stringify(settings));
    this.audit('observability.privacy.updated', 'observability_privacy', null, settings, SECURITY_ACTION_PERMISSIONS.observabilityWrite);
    return settings;
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

  getGatewayKeys(): GatewayApiKey[] {
    return this.db
      .prepare('SELECT * FROM gateway_api_keys ORDER BY created_at DESC')
      .all()
      .map((row) => mapGatewayKey(row as Record<string, unknown>));
  }

  getGatewayLogs(): GatewayLog[] {
    return this.db
      .prepare('SELECT * FROM gateway_logs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapGatewayLog(row as Record<string, unknown>));
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

  getSecurityUsers(): SecurityUser[] {
    return this.db
      .prepare('SELECT * FROM security_users ORDER BY created_at ASC')
      .all()
      .map((row) => mapSecurityUser(row as Record<string, unknown>));
  }

  getSecurityRoles(): SecurityRole[] {
    return this.db
      .prepare('SELECT * FROM security_roles ORDER BY id ASC')
      .all()
      .map((row) => mapSecurityRole(row as Record<string, unknown>));
  }

  getSecuritySessions(): SecuritySession[] {
    return this.db
      .prepare('SELECT * FROM security_sessions ORDER BY last_seen_at DESC')
      .all()
      .map((row) => mapSecuritySession(row as Record<string, unknown>));
  }

  getAclGrants(): SecurityAclGrant[] {
    return this.db
      .prepare('SELECT * FROM acl_grants ORDER BY created_at DESC')
      .all()
      .map((row) => mapSecurityAclGrant(row as Record<string, unknown>));
  }

  getSecurityState(): SecurityState {
    const activeSession = this.getActiveSession();
    const activeUser = this.requireSecurityUser(activeSession.userId);
    const activeRole = this.requireSecurityRole(activeSession.roleId);
    return {
      activeUser,
      activeSession,
      activeRole,
      roles: this.getSecurityRoles(),
      aclGrants: this.getAclGrants(),
      permissionKeys: [...SECURITY_PERMISSION_KEYS],
      deniedCount: this.countAuditAction('security.permission.denied'),
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

  getKnowledgeFiles(): KnowledgeFile[] {
    return this.db
      .prepare('SELECT * FROM files WHERE deleted_at IS NULL ORDER BY updated_at DESC')
      .all()
      .map((row) => mapKnowledgeFile(row as Record<string, unknown>));
  }

  getKnowledgeChunks(fileId?: string): KnowledgeChunk[] {
    const sql = fileId
      ? 'SELECT * FROM knowledge_chunks WHERE file_id = ? AND status != ? ORDER BY position ASC'
      : 'SELECT * FROM knowledge_chunks WHERE status != ? ORDER BY created_at DESC, position ASC LIMIT 500';
    const rows = fileId
      ? this.db.prepare(sql).all(fileId, 'deleted')
      : this.db.prepare(sql).all('deleted');
    return rows.map((row) => mapKnowledgeChunk(row as Record<string, unknown>));
  }

  getKnowledgeRetrievalTraces(): KnowledgeRetrievalTrace[] {
    return this.db
      .prepare('SELECT * FROM knowledge_retrieval_traces ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapKnowledgeRetrievalTrace(row as Record<string, unknown>));
  }

  getKnowledgeCitations(messageId?: string): KnowledgeCitation[] {
    const sql = messageId
      ? 'SELECT * FROM message_citations WHERE message_id = ? ORDER BY score DESC, created_at ASC'
      : 'SELECT * FROM message_citations ORDER BY created_at DESC LIMIT 200';
    const rows = messageId ? this.db.prepare(sql).all(messageId) : this.db.prepare(sql).all();
    return rows.map((row) => mapKnowledgeCitation(row as Record<string, unknown>));
  }

  getMcpServers(): McpServer[] {
    return this.db
      .prepare('SELECT * FROM mcp_servers ORDER BY updated_at DESC')
      .all()
      .map((row) => mapMcpServer(row as Record<string, unknown>));
  }

  getAgents(): AgentDefinition[] {
    return this.db
      .prepare('SELECT * FROM agents ORDER BY updated_at DESC')
      .all()
      .map((row) => mapAgent(row as Record<string, unknown>));
  }

  getTools(): ToolDefinition[] {
    return this.db
      .prepare('SELECT * FROM tools ORDER BY name ASC')
      .all()
      .map((row) => mapToolDefinition(row as Record<string, unknown>));
  }

  getExecutionRuns(): ExecutionRun[] {
    return this.db
      .prepare('SELECT * FROM execution_runs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapExecutionRun(row as Record<string, unknown>));
  }

  getExecutionSteps(runId?: string): ExecutionStep[] {
    const rows = runId
      ? this.db.prepare('SELECT * FROM execution_steps WHERE run_id = ? ORDER BY position ASC, created_at ASC').all(runId)
      : this.db.prepare('SELECT * FROM execution_steps ORDER BY created_at DESC LIMIT 300').all();
    return rows.map((row) => mapExecutionStep(row as Record<string, unknown>));
  }

  getExecutionTraceEvents(runId?: string): ExecutionTraceEvent[] {
    const rows = runId
      ? this.db.prepare('SELECT * FROM execution_trace_events WHERE run_id = ? ORDER BY created_at ASC').all(runId)
      : this.db.prepare('SELECT * FROM execution_trace_events ORDER BY created_at DESC LIMIT 300').all();
    return rows.map((row) => mapExecutionTraceEvent(row as Record<string, unknown>));
  }

  getApprovalRequests(): ApprovalRequest[] {
    return this.db
      .prepare('SELECT * FROM approval_requests ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapApprovalRequest(row as Record<string, unknown>));
  }

  getImportExportResults(): ImportExportResult[] {
    return this.db
      .prepare('SELECT * FROM config_snapshots ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapImportExportResult(row as Record<string, unknown>));
  }

  getDataMobilityJobs(): DataMobilityJob[] {
    return this.db
      .prepare('SELECT * FROM data_mobility_jobs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapDataMobilityJob(row as Record<string, unknown>));
  }

  getDataConflicts(jobId?: string): DataConflictRecord[] {
    const rows = jobId
      ? this.db.prepare('SELECT * FROM data_conflicts WHERE job_id = ? ORDER BY created_at ASC').all(jobId)
      : this.db.prepare('SELECT * FROM data_conflicts ORDER BY created_at DESC LIMIT 100').all();
    return rows.map((row) => mapDataConflictRecord(row as Record<string, unknown>));
  }

  getDataBackups(): DataBackupRecord[] {
    return this.db
      .prepare('SELECT * FROM data_backups ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapDataBackupRecord(row as Record<string, unknown>));
  }

  getMigrationRuns(): MigrationRun[] {
    return this.db
      .prepare('SELECT * FROM migration_runs ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapMigrationRun(row as Record<string, unknown>));
  }

  getRollbackRecords(): RollbackRecord[] {
    return this.db
      .prepare('SELECT * FROM rollback_records ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapRollbackRecord(row as Record<string, unknown>));
  }

  getAuditLogs(): AuditLog[] {
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
      const expectedHash = computeAuditHash({
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

  getUiPreferences(): UiPreferences {
    const row = this.db.prepare('SELECT * FROM ui_preferences WHERE id = ?').get(DEFAULT_PREFS_ID);
    if (!row) {
      return { theme: 'system', density: 'comfortable', fontMode: 'system', language: 'zh-CN', reducedMotion: false, advancedMode: false };
    }
    return mapUiPreferences(row as Record<string, unknown>);
  }

  requirePermission(permissionKey: SecurityPermissionKey, resourceType: string | null = null, resourceId: string | null = null): void {
    const session = this.getActiveSession();
    const grants = this.getAclGrants();
    const result = evaluatePermission({
      permissionKey,
      roleId: session.roleId,
      userId: session.userId,
      resourceType,
      resourceId,
      aclGrants: grants,
    });
    this.touchSession(session.id);
    if (!result.allowed) {
      this.audit('security.permission.denied', resourceType ?? 'permission', resourceId, result, permissionKey);
      throw new Error(t('settings.security.permissionDenied', { permission: permissionKey }));
    }
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

  createConversation(title = t('chat.seed.newConversation')): Conversation {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.chatWrite, 'conversation', null);
    const workspace = this.getDefaultWorkspace();
    const timestamp = now();
    const id = createId('conv');
    this.db
      .prepare(
        `INSERT INTO conversations (id, workspace_id, title, assistant_id, default_provider_id, default_model_id, default_router_id, group_name, is_pinned, is_favorite, status, summary, last_message_at, message_count, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, 0, 0, 'active', NULL, NULL, 0, ?, ?, NULL)`,
      )
      .run(id, workspace.id, title, timestamp, timestamp);
    return this.requireConversation(id);
  }

  updateConversationFlags(
    conversationId: string,
    flags: Partial<Pick<Conversation, 'isPinned' | 'isFavorite' | 'status'>>,
  ): Conversation {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.chatManage, 'conversation', conversationId);
    const conversation = this.requireConversation(conversationId);
    const timestamp = now();
    this.db
      .prepare('UPDATE conversations SET is_pinned = ?, is_favorite = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(
        flags.isPinned === undefined ? (conversation.isPinned ? 1 : 0) : flags.isPinned ? 1 : 0,
        flags.isFavorite === undefined ? (conversation.isFavorite ? 1 : 0) : flags.isFavorite ? 1 : 0,
        flags.status ?? conversation.status,
        timestamp,
        conversationId,
      );
    this.audit('conversation.updated', 'conversation', conversationId, flags);
    return this.requireConversation(conversationId);
  }

  async retryMessage(input: RetryMessageInput): Promise<ChatResponse> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.chatWrite, 'message', input.messageId);
    const message = this.requireMessage(input.messageId);
    const userMessage = message.role === 'user'
      ? message
      : message.parentMessageId
        ? this.requireMessage(message.parentMessageId)
        : this.findPreviousUserMessage(message.conversationId, message.createdAt);
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error(t('chat.errors.retrySourceMissing'));
    }
    this.audit('chat.retry.requested', 'message', message.id, { sourceUserMessageId: userMessage.id });
    return this.sendMessage({
      conversationId: userMessage.conversationId,
      content: userMessage.content,
      modelId: input.modelId ?? message.modelId ?? undefined,
      contextStrategy: input.contextStrategy ?? message.contextStrategy,
      parentMessageId: userMessage.id,
      metadata: {
        action: 'retry',
        sourceMessageId: message.id,
        sourceUserMessageId: userMessage.id,
      },
    });
  }

  async regenerateMessage(input: RegenerateMessageInput): Promise<ChatResponse> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.chatWrite, 'message', input.assistantMessageId);
    const assistantMessage = this.requireMessage(input.assistantMessageId);
    if (assistantMessage.role !== 'assistant') {
      throw new Error(t('chat.errors.regenerateAssistantOnly'));
    }
    const userMessage = assistantMessage.parentMessageId
      ? this.requireMessage(assistantMessage.parentMessageId)
      : this.findPreviousUserMessage(assistantMessage.conversationId, assistantMessage.createdAt);
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error(t('chat.errors.regenerateSourceMissing'));
    }
    this.audit('chat.regenerate.requested', 'message', assistantMessage.id, { sourceUserMessageId: userMessage.id });
    return this.sendMessage({
      conversationId: assistantMessage.conversationId,
      content: userMessage.content,
      modelId: input.modelId ?? assistantMessage.modelId ?? undefined,
      contextStrategy: input.contextStrategy ?? assistantMessage.contextStrategy,
      parentMessageId: userMessage.id,
      metadata: {
        action: 'regenerate',
        sourceAssistantMessageId: assistantMessage.id,
        sourceUserMessageId: userMessage.id,
      },
    });
  }

  cancelMessage(input: CancelMessageInput): ChatResponse {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.chatManage, 'request_log', input.requestLogId);
    const requestLog = this.requireRequestLog(input.requestLogId);
    this.activeChatControllers.get(requestLog.id)?.abort(new Error('cancelled_by_user'));
    if (!requestLog.conversationId || !requestLog.messageId) {
      throw new Error(t('chat.errors.cancelRequestMissing'));
    }
    const assistantMessage = this.requireMessage(requestLog.messageId);
    const timestamp = now();
    const normalizedRoute = this.route(assistantMessage.providerId ?? undefined, assistantMessage.modelId ?? undefined);
    this.db
      .prepare(
        `UPDATE messages
         SET status = 'cancelled', error_message = ?, error_code = ?, updated_at = ?
         WHERE id = ? AND status IN ('draft', 'streaming', 'failed')`,
      )
      .run(t('chat.cancelled.message'), 'cancelled_by_user', timestamp, assistantMessage.id);
    this.db
      .prepare(
        `UPDATE request_logs
         SET status = 'cancelled', error_code = ?, error_message = ?, completed_at = ?
         WHERE id = ? AND status IN ('started', 'streaming', 'failed')`,
      )
      .run('cancelled_by_user', t('chat.cancelled.message'), timestamp, requestLog.id);
    this.db
      .prepare(
        `UPDATE message_chunks
         SET status = 'cancelled'
         WHERE request_log_id = ? AND status IN ('streaming', 'failed')`,
      )
      .run(requestLog.id);
    this.audit('chat.cancelled', 'request_log', requestLog.id, { messageId: assistantMessage.id });
    const conversation = this.requireConversation(requestLog.conversationId);
    return {
      conversation,
      userMessage: assistantMessage.parentMessageId ? this.requireMessage(assistantMessage.parentMessageId) : assistantMessage,
      assistantMessage: this.requireMessage(assistantMessage.id),
      requestLog: this.requireRequestLog(requestLog.id),
      routeDecision: normalizedRoute,
      chunks: this.getMessageChunks(assistantMessage.id),
    };
  }

  async compareModels(input: CompareModelsInput): Promise<CompareModelsResponse> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.chatWrite, 'conversation', input.conversationId ?? null);
    const uniqueModelIds = Array.from(new Set(input.modelIds)).filter(Boolean).slice(0, 3);
    if (uniqueModelIds.length < 2) {
      throw new Error(t('chat.errors.compareNeedsModels'));
    }
    if (!input.content.trim()) {
      throw new Error(t('models.errors.messageRequired'));
    }
    const conversation = input.conversationId ? this.requireConversation(input.conversationId) : this.createConversation();
    const responses: ChatResponse[] = [];
    for (const modelId of uniqueModelIds) {
      const response = await this.sendMessage({
        conversationId: conversation.id,
        content: input.content,
        modelId,
        contextStrategy: input.contextStrategy ?? 'recent_n',
        metadata: {
          action: 'compare',
          compareGroupSize: uniqueModelIds.length,
          compareModelIds: uniqueModelIds,
        },
      });
      responses.push(response);
    }
    this.audit('chat.compare.completed', 'conversation', conversation.id, {
      modelIds: uniqueModelIds,
      requestLogIds: responses.map((response) => response.requestLog.id),
    });
    return { conversation: this.requireConversation(conversation.id), responses };
  }

  exportConversation(input: ExportConversationInput): ConversationExport {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.chatExport, 'conversation', input.conversationId);
    const conversation = this.requireConversation(input.conversationId);
    const format = isConversationExportFormat(input.format) ? input.format : 'markdown';
    const redacted = input.redacted !== false;
    const messages = this.getMessages(conversation.id).filter((message) => message.status !== 'deleted');
    const attachments = this.getMessageAttachments(conversation.id);
    const content = format === 'json'
      ? this.buildConversationJsonExport(conversation, messages, attachments, redacted)
      : this.buildConversationMarkdownExport(conversation, messages, attachments, redacted);
    const timestamp = now();
    const id = createId('cexport');
    const summary = {
      conversationId: conversation.id,
      title: conversation.title,
      messageCount: messages.length,
      attachmentCount: attachments.length,
      redacted,
    };
    this.db
      .prepare(
        `INSERT INTO conversation_exports (id, conversation_id, format, redacted, status, content, summary_json, created_at)
         VALUES (?, ?, ?, ?, 'completed', ?, ?, ?)`,
      )
      .run(id, conversation.id, format, redacted ? 1 : 0, content, JSON.stringify(summary), timestamp);
    this.audit('chat.exported', 'conversation', conversation.id, { exportId: id, format, redacted });
    return this.requireConversationExport(id);
  }

  async sendMessage(input: SendMessageInput): Promise<ChatResponse> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.chatWrite, 'conversation', input.conversationId ?? null);
    if (!input.content.trim()) {
      throw new Error(t('models.errors.messageRequired'));
    }
    const conversation = input.conversationId ? this.requireConversation(input.conversationId) : this.createConversation();
    const routeDecision = this.route(input.providerId, input.modelId);
    const contextStrategy = input.contextStrategy ?? 'recent_n';
    const timestamp = now();
    const userMessageId = createId('msg');
    const assistantMessageId = createId('msg');
    const requestLogId = createId('req');
    const requestId = createId('gwreq');
    const trimmedContent = input.content.trim();
    const inputTokens = estimateTokens(trimmedContent);
    const modelForContext = this.requireModel(routeDecision.modelId);
    const retrieval = this.retrieveKnowledge(trimmedContent, { persistCitations: false });
    const context = this.buildConversationContext(
      conversation.id,
      contextStrategy,
      trimmedContent,
      modelForContext.contextWindow,
      retrieval.citations,
    );
    const attachmentSummary = this.validateMessageAttachments(input.attachments ?? []);
    const userMetadata = {
      routeReason: routeDecision.reason,
      fallbackUsed: routeDecision.fallbackUsed,
      action: input.metadata?.action ?? 'send',
      attachments: attachmentSummary.summary,
      ...(input.metadata ?? {}),
    };

    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, workspace_id, parent_message_id, role, content, provider_id, model_id, model_name_snapshot, request_id, request_log_id, input_tokens, output_tokens, latency_ms, finish_reason, error_message, status, content_format, context_strategy, context_message_ids_json, summary_id, artifact_ids_json, error_code, metadata_json, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 'completed', 'markdown', ?, ?, NULL, ?, NULL, ?, ?, ?, NULL)`,
      )
      .run(
        userMessageId,
        conversation.id,
        conversation.workspaceId,
        input.parentMessageId ?? this.findLatestMessageId(conversation.id),
        trimmedContent,
        routeDecision.providerId,
        routeDecision.modelId,
        routeDecision.modelNameSnapshot,
        requestId,
        requestLogId,
        inputTokens,
        contextStrategy,
        JSON.stringify(context.contextMessageIds),
        JSON.stringify(attachmentSummary.accepted.map((attachment) => attachment.id)),
        JSON.stringify(userMetadata),
        timestamp,
        timestamp,
      );
    this.insertMessageAttachments(userMessageId, conversation.id, attachmentSummary.accepted);

    this.db
      .prepare(
        `INSERT INTO request_logs (id, conversation_id, message_id, provider_id, model_id, model_name_snapshot, route_id, gateway_request_id, status, endpoint, request_summary_json, response_summary_json, input_tokens, output_tokens, latency_ms, finish_reason, error_code, error_message, started_at, completed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'streaming', '/v1/chat/completions', ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?)`,
      )
      .run(
        requestLogId,
        conversation.id,
        assistantMessageId,
        routeDecision.providerId,
        routeDecision.modelId,
        routeDecision.modelNameSnapshot,
        requestId,
        JSON.stringify({
          ...buildChatRequestSummary(trimmedContent),
          contextStrategy,
          routeReason: routeDecision.reason,
          contextMessageIds: context.contextMessageIds,
          contextTrimReason: context.trimReason,
          knowledgeRetrievalId: retrieval.trace.id,
          knowledgeCitationCount: retrieval.citations.length,
          attachments: attachmentSummary.summary,
          action: input.metadata?.action ?? 'send',
        }),
        inputTokens,
        timestamp,
        timestamp,
      );

    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, workspace_id, parent_message_id, role, content, provider_id, model_id, model_name_snapshot, request_id, request_log_id, input_tokens, output_tokens, latency_ms, finish_reason, error_message, status, content_format, context_strategy, context_message_ids_json, summary_id, artifact_ids_json, error_code, metadata_json, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, 'assistant', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 'streaming', 'markdown', ?, ?, NULL, NULL, NULL, ?, ?, ?, NULL)`,
      )
      .run(
        assistantMessageId,
        conversation.id,
        conversation.workspaceId,
        userMessageId,
        t('chat.generation.placeholder'),
        routeDecision.providerId,
        routeDecision.modelId,
        routeDecision.modelNameSnapshot,
        requestId,
        requestLogId,
        inputTokens,
        contextStrategy,
        JSON.stringify(context.contextMessageIds),
        JSON.stringify({
          localHistoryRetained: true,
          contextStrategy,
          contextMessageIds: context.contextMessageIds,
          retrievalId: retrieval.trace.id,
          citations: retrieval.citations,
          routeReason: routeDecision.reason,
          fallbackUsed: routeDecision.fallbackUsed,
          action: input.metadata?.action ?? 'send',
          progressiveMode: 'renderer-side-progressive-reveal',
          ...(input.metadata ?? {}),
        }),
        timestamp,
        timestamp,
      );
    this.insertMessageChunks({
      messageId: assistantMessageId,
      conversationId: conversation.id,
      requestLogId,
      chunks: [t('chat.generation.placeholder')],
      status: 'streaming',
      chunkType: 'text',
    });
    this.db
      .prepare('UPDATE conversations SET title = ?, last_message_at = ?, message_count = message_count + 2, updated_at = ? WHERE id = ?')
      .run(inferTitle(conversation.title, trimmedContent), timestamp, timestamp, conversation.id);
    const abortController = new AbortController();
    this.activeChatControllers.set(requestLogId, abortController);

    try {
      const provider = this.requireProvider(routeDecision.providerId);
      const model = modelForContext;
      const adapterName = getProviderAdapterName(provider.type);
      if (adapterName !== 'openai-compatible') {
        throw new ProviderRuntimeError(t('models.errors.unsupportedProvider'), PROVIDER_RUNTIME_ERROR_CODES.unsupportedProvider);
      }
      const apiKey = this.getProviderSecret(provider);
      const providerInput = {
        provider,
        model,
        apiKey,
        messages: context.providerMessages,
        stream: model.supportsStreaming,
        signal: abortController.signal,
      };
      this.db
        .prepare('UPDATE request_logs SET request_summary_json = ? WHERE id = ?')
        .run(JSON.stringify({
          ...getProviderRequestSummary(providerInput),
          ...buildChatRequestSummary(trimmedContent),
          contextStrategy,
          routeReason: routeDecision.reason,
          contextMessageIds: context.contextMessageIds,
          contextTrimReason: context.trimReason,
          knowledgeRetrievalId: retrieval.trace.id,
          knowledgeCitationCount: retrieval.citations.length,
          action: input.metadata?.action ?? 'send',
        }), requestLogId);
      const result = await invokeOpenAiCompatibleChat(providerInput);
      const assistantContent = result.content;
      const outputTokens = result.outputTokens ?? estimateTokens(assistantContent);
      const metadata = {
        localHistoryRetained: true,
        contextStrategy,
        contextMessageIds: context.contextMessageIds,
        contextTrimReason: context.trimReason,
        retrievalId: retrieval.trace.id,
        citations: retrieval.citations,
        adapter: adapterName,
        streamed: result.streamed,
        retryCount: result.retryCount,
        routeReason: routeDecision.reason,
        fallbackUsed: routeDecision.fallbackUsed,
        action: input.metadata?.action ?? 'send',
        ...(input.metadata ?? {}),
      };

      this.db
        .prepare(
          `UPDATE messages
           SET content = ?, input_tokens = ?, output_tokens = ?, latency_ms = ?, finish_reason = ?, error_message = NULL, status = 'completed', error_code = NULL, metadata_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          assistantContent,
          result.inputTokens ?? inputTokens,
          outputTokens,
          result.latencyMs,
          result.finishReason ?? 'stop',
          JSON.stringify(metadata),
          now(),
          assistantMessageId,
        );
      this.db.prepare('DELETE FROM message_chunks WHERE message_id = ? AND request_log_id = ?').run(assistantMessageId, requestLogId);
      this.insertMessageChunks({
        messageId: assistantMessageId,
        conversationId: conversation.id,
        requestLogId,
        chunks: result.chunks.length > 0 ? result.chunks : [assistantContent],
        status: 'completed',
      });
      this.attachKnowledgeCitations(retrieval.citations, assistantMessageId, requestLogId);

      this.db
        .prepare(
          `UPDATE request_logs
           SET status = 'completed', response_summary_json = ?, input_tokens = ?, output_tokens = ?, latency_ms = ?, finish_reason = ?, completed_at = ?, message_id = ?
           WHERE id = ?`,
        )
        .run(
          JSON.stringify({ ...result.responseSummary, redactedPreview: redactSensitive(assistantContent).slice(0, 280) }),
          result.inputTokens ?? inputTokens,
          outputTokens,
          result.latencyMs,
          result.finishReason ?? 'stop',
          now(),
          assistantMessageId,
          requestLogId,
        );

      this.db
        .prepare(
          `INSERT INTO usage_records (id, workspace_id, provider_id, model_id, request_log_id, input_tokens, output_tokens, cost_estimate, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('usage'),
          conversation.workspaceId,
          routeDecision.providerId,
          routeDecision.modelId,
          requestLogId,
          result.inputTokens ?? inputTokens,
          outputTokens,
          this.estimateCost(routeDecision.modelId, result.inputTokens ?? inputTokens, outputTokens),
          now(),
        );

      this.db
        .prepare('UPDATE conversations SET title = ?, last_message_at = ?, updated_at = ? WHERE id = ?')
        .run(inferTitle(conversation.title, trimmedContent), now(), now(), conversation.id);
      this.audit('chat.completed', 'conversation', conversation.id, {
        requestLogId,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        streamed: result.streamed,
        retryCount: result.retryCount,
      });
      this.recordProviderHealth(routeDecision.providerId, routeDecision.modelId, 'healthy', result.latencyMs, 'chat', null, null);
    } catch (error) {
      const normalized = this.normalizeProviderError(error);
      const failedStatus = normalized.code === PROVIDER_RUNTIME_ERROR_CODES.cancelled ? 'cancelled' : 'failed';
      this.db
        .prepare(
          `UPDATE messages
           SET content = ?, input_tokens = ?, latency_ms = ?, error_message = ?, status = ?, error_code = ?, metadata_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          normalized.code === PROVIDER_RUNTIME_ERROR_CODES.cancelled ? t('chat.cancelled.message') : t('chat.assistant.upstreamFailed'),
          inputTokens,
          Math.max(1, now() - timestamp),
          normalized.message,
          failedStatus,
          normalized.code,
          JSON.stringify({
            adapter: getProviderAdapterName(this.requireProvider(routeDecision.providerId).type),
            routeReason: routeDecision.reason,
            fallbackUsed: routeDecision.fallbackUsed,
            retryable: normalized.retryable,
            contextMessageIds: context.contextMessageIds,
            progressiveMode: 'renderer-side-progressive-reveal',
            action: input.metadata?.action ?? 'send',
            ...(input.metadata ?? {}),
          }),
          now(),
          assistantMessageId,
        );
      this.db.prepare('DELETE FROM message_chunks WHERE message_id = ? AND request_log_id = ?').run(assistantMessageId, requestLogId);
      this.insertMessageChunks({
        messageId: assistantMessageId,
        conversationId: conversation.id,
        requestLogId,
        chunks: [normalized.message],
        status: 'failed',
        chunkType: 'error',
      });
      this.db
        .prepare(
          `UPDATE request_logs
           SET status = ?, response_summary_json = ?, latency_ms = ?, error_code = ?, error_message = ?, completed_at = ?, message_id = ?
           WHERE id = ?`,
        )
        .run(
          failedStatus,
          JSON.stringify({ errorCode: normalized.code, retryable: normalized.retryable }),
          Math.max(1, now() - timestamp),
          normalized.code,
          normalized.message,
          now(),
          assistantMessageId,
          requestLogId,
        );
      this.db
        .prepare('UPDATE conversations SET title = ?, last_message_at = ?, updated_at = ? WHERE id = ?')
        .run(inferTitle(conversation.title, trimmedContent), now(), now(), conversation.id);
      this.audit('chat.failed', 'conversation', conversation.id, {
        requestLogId,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        errorCode: normalized.code,
      });
      this.recordProviderHealth(routeDecision.providerId, routeDecision.modelId, 'error', Math.max(1, now() - timestamp), 'chat', normalized.code, normalized.message);
    } finally {
      this.activeChatControllers.delete(requestLogId);
    }

    const updatedConversation = this.requireConversation(conversation.id);
    return {
      conversation: updatedConversation,
      userMessage: this.requireMessage(userMessageId),
      assistantMessage: this.requireMessage(assistantMessageId),
      requestLog: this.requireRequestLog(requestLogId),
      routeDecision,
      chunks: this.getMessageChunks(assistantMessageId),
    };
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

  saveUiPreferences(preferences: UiPreferences): UiPreferences {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.settingsWrite, 'ui_preferences', DEFAULT_PREFS_ID);
    const timestamp = now();
    const normalizedPreferences: UiPreferences = {
      ...preferences,
      theme: normalizeThemeMode(preferences.theme),
      advancedMode: Boolean(preferences.advancedMode),
    };
    this.db
      .prepare(
        `INSERT INTO ui_preferences (id, theme, density, font_mode, language, reduced_motion, advanced_mode, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET theme = excluded.theme, density = excluded.density, font_mode = excluded.font_mode, language = excluded.language, reduced_motion = excluded.reduced_motion, advanced_mode = excluded.advanced_mode, updated_at = excluded.updated_at`,
      )
      .run(
        DEFAULT_PREFS_ID,
        normalizedPreferences.theme,
        normalizedPreferences.density,
        normalizedPreferences.fontMode,
        normalizedPreferences.language,
        normalizedPreferences.reducedMotion ? 1 : 0,
        normalizedPreferences.advancedMode ? 1 : 0,
        timestamp,
      );
    this.audit('ui.preferences.updated', 'ui_preferences', DEFAULT_PREFS_ID, normalizedPreferences);
    return this.getUiPreferences();
  }

  createKnowledgeFile(input: KnowledgeImportInput): KnowledgeFile {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.knowledgeWrite, 'file', null);
    const timestamp = now();
    const id = createId('file');
    const normalized = normalizeKnowledgeImport(input);
    const metadata = {
      parserType: normalized.parserType,
      originalSize: input.size ?? normalized.size,
      importMode: 'inline-text',
      maxImportBytes: KNOWLEDGE_RUNTIME_POLICY.maxImportBytes,
    };
    const chunks = normalized.supported ? chunkKnowledgeText(normalized.content) : [];
    const tokenCount = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
    const errorMessage = normalized.errorKey ? t(normalized.errorKey as Parameters<typeof t>[0]) : null;
    const parseStatus = normalized.supported ? 'indexed' : 'failed';
    const indexStatus = normalized.supported ? 'indexed' : 'failed';
    const embeddingStatus = normalized.supported ? 'embedded' : 'failed';
    this.db
      .prepare(
        `INSERT INTO files (id, workspace_id, knowledge_base_id, name, type, size, parse_status, index_status, embedding_status, parser_type, chunk_count, token_count, content_hash, storage_ref, metadata_json, error_message, parse_started_at, parse_completed_at, deleted_at, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(
        id,
        DEFAULT_WORKSPACE_ID,
        normalized.name,
        normalized.type,
        normalized.size,
        parseStatus,
        indexStatus,
        embeddingStatus,
        normalized.parserType,
        chunks.length,
        tokenCount,
        normalized.contentHash,
        null,
        JSON.stringify(metadata),
        errorMessage,
        timestamp,
        timestamp,
        timestamp,
        timestamp,
      );
    if (normalized.supported) {
      this.indexKnowledgeChunks(id, normalized.name, chunks, timestamp);
    }
    this.audit('knowledge.file.created', 'file', id, {
      name: normalized.name,
      parseStatus,
      indexStatus,
      embeddingStatus,
      chunkCount: chunks.length,
      errorMessage,
    });
    return this.requireKnowledgeFile(id);
  }

  retryKnowledgeFile(input: KnowledgeRebuildInput): KnowledgeFile {
    return this.rebuildKnowledgeFile(input);
  }

  rebuildKnowledgeFile(input: KnowledgeRebuildInput): KnowledgeFile {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.knowledgeWrite, 'file', input.fileId);
    const file = this.requireKnowledgeFile(input.fileId);
    const timestamp = now();
    if (file.deletedAt) {
      throw new Error(t('knowledge.errors.deletedFile'));
    }
    const existingChunks = this.getKnowledgeChunks(file.id);
    if (existingChunks.length === 0 && file.parseStatus === 'failed') {
      this.db
        .prepare('UPDATE files SET parse_status = ?, index_status = ?, embedding_status = ?, error_message = ?, updated_at = ? WHERE id = ?')
        .run('failed', 'failed', 'failed', t('knowledge.errors.rebuildNoSource'), timestamp, file.id);
      this.audit('knowledge.file.rebuild.failed', 'file', file.id, { reason: 'no indexed source chunks' });
      return this.requireKnowledgeFile(file.id);
    }
    const sourceText = existingChunks.map((chunk) => chunk.content).join('\n\n');
    const chunks = chunkKnowledgeText(sourceText);
    this.db.prepare('UPDATE knowledge_chunks SET status = ?, updated_at = ? WHERE file_id = ?').run('deleted', timestamp, file.id);
    this.db
      .prepare(
        `UPDATE files
         SET parse_status = 'indexed', index_status = 'indexed', embedding_status = 'embedded', chunk_count = ?, token_count = ?, error_message = NULL, parse_started_at = ?, parse_completed_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(chunks.length, chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0), timestamp, timestamp, timestamp, file.id);
    this.indexKnowledgeChunks(file.id, file.name, chunks, timestamp);
    this.audit('knowledge.file.rebuilt', 'file', file.id, { chunkCount: chunks.length });
    return this.requireKnowledgeFile(file.id);
  }

  deleteKnowledgeFile(input: KnowledgeDeleteInput): KnowledgeFile {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.knowledgeWrite, 'file', input.fileId);
    const file = this.requireKnowledgeFile(input.fileId);
    const timestamp = now();
    this.db
      .prepare(
        `INSERT INTO knowledge_deletion_tombstones (id, file_id, file_name, chunk_count, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(createId('tombstone'), file.id, file.name, file.chunkCount, 'user-delete', timestamp);
    this.db.prepare('UPDATE knowledge_chunks SET status = ?, updated_at = ? WHERE file_id = ?').run('deleted', timestamp, file.id);
    this.db
      .prepare(
        `UPDATE files
         SET parse_status = 'stale', index_status = 'deleted', embedding_status = 'deleted', chunk_count = 0, deleted_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(timestamp, timestamp, file.id);
    this.audit('knowledge.file.deleted', 'file', file.id, { name: file.name, chunkCount: file.chunkCount });
    return this.requireKnowledgeFile(file.id, { includeDeleted: true });
  }

  previewKnowledgeRetrieval(input: KnowledgeRetrievalInput): KnowledgeRetrievalResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.knowledgeRead, 'knowledge_retrieval', null);
    return this.retrieveKnowledge(input.query, {
      topK: input.topK,
      strategy: input.strategy,
      persistCitations: false,
    });
  }

  createMcpServer(name: string, transport: McpServer['transport'], commandOrUrl: string): McpServer {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.mcpWrite, 'mcp_server', null);
    const timestamp = now();
    const id = createId('mcp');
    this.db
      .prepare(
        `INSERT INTO mcp_servers (id, name, transport, command_or_url, enabled, permission_state, last_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 'discovered', 'unknown', ?, ?)`,
      )
      .run(id, name.trim(), transport, commandOrUrl.trim(), timestamp, timestamp);
    this.audit('mcp.server.registered', 'mcp_server', id, { name, transport });
    return this.requireMcpServer(id);
  }

  updateMcpPermission(serverId: string, permissionState: McpServer['permissionState']): McpServer {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.mcpPermissionWrite, 'mcp_server', serverId);
    const timestamp = now();
    const enabled = permissionState === 'granted' ? 1 : 0;
    this.db
      .prepare('UPDATE mcp_servers SET permission_state = ?, enabled = ?, last_status = ?, updated_at = ? WHERE id = ?')
      .run(permissionState, enabled, permissionState === 'granted' ? 'warning' : 'unknown', timestamp, serverId);
    this.audit('mcp.permission.updated', 'mcp_server', serverId, { permissionState, enabled: Boolean(enabled) });
    return this.requireMcpServer(serverId);
  }

  createAgent(name: string, goal: string): AgentDefinition {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.agentWrite, 'agent', null);
    const timestamp = now();
    const id = createId('agent');
    this.db
      .prepare(
        `INSERT INTO agents (id, name, goal, default_model_id, approval_policy, stage, created_at, updated_at)
         VALUES (?, ?, ?, NULL, 'destructive-only', 'planned', ?, ?)`,
      )
      .run(id, name.trim(), goal.trim(), timestamp, timestamp);
    this.audit('agent.definition.created', 'agent', id, { name, mode: 'dry-run only' });
    return this.requireAgent(id);
  }

  previewAgentRun(agentId: string): ExecutionRun {
    return this.startExecutionRun({
      kind: 'agent',
      mode: 'preview',
      agentId,
      toolId: EXECUTION_TOOL_IDS.statusRead,
      inputJson: '{}',
    });
  }

  startExecutionRun(input: ExecutionStartInput): ExecutionRun {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.executionRun, 'execution_run', null);
    const normalized = normalizeExecutionStartInput(input);
    const timestamp = now();
    const runId = createId('run');
    const agent = normalized.agentId ? this.requireAgent(normalized.agentId) : null;
    const tool = normalized.toolId ? this.requireTool(normalized.toolId) : this.requireTool(EXECUTION_TOOL_IDS.statusRead);
    const requiresApproval = normalized.mode === 'execute' && tool.requiresApproval;
    const initialStatus: ExecutionRun['status'] = requiresApproval ? 'waiting_approval' : 'completed';
    const mode = normalized.mode ?? 'preview';
    const title = agent
      ? t('tools.execution.title.agent', { agent: agent.name })
      : normalized.kind === 'workflow'
        ? t('tools.execution.title.workflow')
        : t('tools.execution.title.tool', { tool: tool.name });
    const output = requiresApproval ? null : this.executeFixtureTool(tool.id, normalized.inputJson ?? '{}');

    this.db
      .prepare(
        `INSERT INTO execution_runs (id, kind, status, mode, title, agent_id, tool_id, mcp_server_id, workflow_id, input_json, output_json, error_message, approval_status, sandbox_mode, created_at, updated_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
      )
      .run(
        runId,
        normalized.kind,
        initialStatus,
        mode,
        title,
        agent?.id ?? null,
        tool.id,
        normalized.mcpServerId ?? null,
        normalized.workflowId ?? null,
        normalized.inputJson ?? '{}',
        output,
        requiresApproval ? 'pending' : null,
        tool.riskLevel === 'read' ? 'read-only' : 'fixture-only',
        timestamp,
        timestamp,
        requiresApproval ? null : timestamp,
      );

    this.createExecutionStep({
      runId,
      kind: 'plan',
      title: agent ? t('tools.agent.dryRun.step.read') : t('tools.execution.step.plan'),
      status: 'completed',
      position: 1,
      timestamp,
    });
    this.addTrace(runId, null, 'run_planned', title, { kind: normalized.kind, mode });
    this.createExecutionStep({
      runId,
      kind: 'permission',
      title: t('tools.execution.step.permission'),
      status: 'completed',
      toolId: tool.id,
      position: 2,
      timestamp,
    });
    this.addTrace(runId, null, 'permission_checked', t('tools.execution.trace.permissionChecked'), {
      permissionKey: tool.permissionKey,
      riskLevel: tool.riskLevel,
      requiresApproval,
    });

    if (requiresApproval) {
      const stepId = this.createExecutionStep({
        runId,
        kind: 'approval',
        title: t('tools.execution.step.approval'),
        status: 'waiting_approval',
        toolId: tool.id,
        position: 3,
        timestamp,
      });
      const approvalId = createId('approval');
      this.db
        .prepare(
          `INSERT INTO approval_requests (id, run_id, step_id, status, requested_action, risk_level, reason, decision_reason, decided_at, created_at, expires_at)
           VALUES (?, ?, ?, 'pending', ?, ?, ?, NULL, NULL, ?, NULL)`,
        )
        .run(approvalId, runId, stepId, tool.name, tool.riskLevel, t('tools.execution.approval.reason', { tool: tool.name }), timestamp);
      this.addTrace(runId, stepId, 'approval_requested', t('tools.execution.trace.approvalRequested'), { approvalId, toolId: tool.id });
    } else {
      const stepId = this.createExecutionStep({
        runId,
        kind: 'tool',
        title: tool.name,
        status: 'completed',
        toolId: tool.id,
        outputJson: output,
        position: 3,
        timestamp,
      });
      this.addTrace(runId, stepId, 'tool_called', t('tools.execution.trace.toolCalled'), { toolId: tool.id });
      this.addTrace(runId, stepId, 'step_completed', t('tools.execution.trace.stepCompleted'), { outputJson: output });
      this.addTrace(runId, null, 'run_completed', t('tools.execution.trace.runCompleted'), { runId });
    }

    this.audit('execution.run.started', 'execution_run', runId, { kind: normalized.kind, mode, toolId: tool.id });
    return this.requireExecutionRun(runId);
  }

  decideApproval(input: ApprovalDecisionInput): ExecutionRun {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.executionApprove, 'approval_request', input.approvalId);
    const normalized = normalizeApprovalDecision(input);
    const approval = this.requireApprovalRequest(normalized.approvalId);
    const timestamp = now();
    if (approval.status !== 'pending') {
      return this.requireExecutionRun(approval.runId);
    }
    const run = this.requireExecutionRun(approval.runId);
    const tool = run.toolId ? this.requireTool(run.toolId) : this.requireTool(EXECUTION_TOOL_IDS.statusRead);
    const approved = normalized.decision === 'approved';
    const decisionReason = normalized.reason ?? null;
    this.db
      .prepare('UPDATE approval_requests SET status = ?, decision_reason = ?, decided_at = ? WHERE id = ?')
      .run(normalized.decision, decisionReason, timestamp, approval.id);
    if (approval.stepId) {
      this.db
        .prepare('UPDATE execution_steps SET status = ?, output_json = ?, error_message = ?, completed_at = ?, updated_at = ? WHERE id = ?')
        .run(approved ? 'completed' : 'cancelled', JSON.stringify({ decision: normalized.decision }), approved ? null : decisionReason, timestamp, timestamp, approval.stepId);
    }
    this.addTrace(run.id, approval.stepId, 'approval_decided', t('tools.execution.trace.approvalDecided'), normalized);

    if (!approved) {
      this.db
        .prepare('UPDATE execution_runs SET status = ?, approval_status = ?, error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?')
        .run('cancelled', 'denied', decisionReason ?? t('tools.execution.error.denied'), timestamp, timestamp, run.id);
      this.addTrace(run.id, null, 'run_cancelled', t('tools.execution.trace.runCancelled'), { approvalId: approval.id });
      this.audit('execution.approval.denied', 'execution_run', run.id, { approvalId: approval.id, reason: normalized.reason });
      return this.requireExecutionRun(run.id);
    }

    const output = this.executeFixtureTool(tool.id, run.inputJson ?? '{}');
    const toolStepId = this.createExecutionStep({
      runId: run.id,
      kind: 'tool',
      title: tool.name,
      status: 'completed',
      toolId: tool.id,
      inputJson: run.inputJson,
      outputJson: output,
      position: this.getExecutionSteps(run.id).length + 1,
      timestamp,
    });
    this.db
      .prepare('UPDATE execution_runs SET status = ?, output_json = ?, approval_status = ?, updated_at = ?, completed_at = ? WHERE id = ?')
      .run('completed', output, 'approved', timestamp, timestamp, run.id);
    this.addTrace(run.id, toolStepId, 'tool_called', t('tools.execution.trace.toolCalled'), { toolId: tool.id });
    this.addTrace(run.id, toolStepId, 'step_completed', t('tools.execution.trace.stepCompleted'), { outputJson: output });
    this.addTrace(run.id, null, 'run_completed', t('tools.execution.trace.runCompleted'), { runId: run.id });
    this.audit('execution.approval.approved', 'execution_run', run.id, { approvalId: approval.id, toolId: tool.id });
    return this.requireExecutionRun(run.id);
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

  private seed(): void {
    const timestamp = now();
    this.seedSecurity(timestamp);
    const workspaceCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM workspaces').get() as { count: number }).count);
    if (workspaceCount === 0) {
      this.db
        .prepare('INSERT INTO workspaces (id, name, default_provider_id, default_model_id, created_at, updated_at) VALUES (?, ?, NULL, NULL, ?, ?)')
        .run(DEFAULT_WORKSPACE_ID, t('dashboard.workspace'), timestamp, timestamp);
    }

    const conversationCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM conversations').get() as { count: number }).count);
    if (conversationCount === 0) {
      this.createConversation(t('chat.seed.welcomeConversation'));
    }

    const fileCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM files').get() as { count: number }).count);
    if (fileCount === 0) {
      this.createKnowledgeFile({
        name: 'NexaChat getting-started.md',
        type: 'text/markdown',
        content: t('knowledge.seed.gettingStartedContent'),
      });
    }

    const mcpCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM mcp_servers').get() as { count: number }).count);
    if (mcpCount === 0) {
      this.createMcpServer(t('tools.mcp.seedLocalFile'), 'stdio', 'npx @modelcontextprotocol/server-filesystem');
    }

    const agentCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM agents').get() as { count: number }).count);
    if (agentCount === 0) {
      this.createAgent(t('tools.agent.seedConfigName'), t('tools.agent.seedConfigGoal'));
    }
    this.seedExecutionTools(timestamp);

    const promptCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM prompt_templates').get() as { count: number }).count);
    if (promptCount === 0) {
      this.db
        .prepare(
          `INSERT INTO prompt_templates (id, scope, name, content, enabled, created_at, updated_at)
           VALUES (?, 'global', ?, ?, 1, ?, ?)`,
        )
        .run(
          createId('prompt'),
          t('chat.prompt.defaultName'),
          t('chat.prompt.defaultContent'),
          timestamp,
          timestamp,
        );
    }

    if (!this.db.prepare('SELECT * FROM ui_preferences WHERE id = ?').get(DEFAULT_PREFS_ID)) {
      this.saveUiPreferences({
        theme: 'system',
        density: 'comfortable',
        fontMode: 'system',
        language: 'zh-CN',
        reducedMotion: false,
        advancedMode: false,
      });
    }

    const keyCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM gateway_api_keys').get() as { count: number }).count);
    if (keyCount === 0) {
      this.createGatewayKey('Local app integration');
    }

    const evalSetCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM eval_sets').get() as { count: number }).count);
    if (evalSetCount === 0) {
      this.db
        .prepare(
          `INSERT INTO eval_sets (id, name, description, prompt, expected_keywords_json, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)`,
        )
        .run(
          'eval_round13_basic',
          t('observability.eval.seed.name'),
          t('observability.eval.seed.description'),
          t('observability.eval.seed.prompt'),
          JSON.stringify(['NexaChat', 'local']),
          timestamp,
          timestamp,
        );
    }
  }

  private seedSecurity(timestamp: number): void {
    for (const role of SECURITY_ROLES) {
      const localizedRole = getSecurityRole(role.id);
      this.db
        .prepare(
          `INSERT INTO security_roles (id, name, description, permission_keys_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, permission_keys_json = excluded.permission_keys_json, updated_at = excluded.updated_at`,
        )
        .run(
          role.id,
          t(localizedRole.nameKey as Parameters<typeof t>[0]),
          t(localizedRole.descriptionKey as Parameters<typeof t>[0]),
          JSON.stringify(role.permissionKeys),
          timestamp,
          timestamp,
        );
    }
    this.backfillAuditHashes();

    const userCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM security_users').get() as { count: number }).count);
    if (userCount === 0) {
      this.db
        .prepare('INSERT INTO security_users (id, display_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(DEFAULT_SECURITY_USER_ID, t('settings.security.localAdmin'), 'active', timestamp, timestamp);
      this.audit('security.bootstrap', 'security_user', DEFAULT_SECURITY_USER_ID, { roleId: 'owner' }, SECURITY_ACTION_PERMISSIONS.securityManage);
    }

    const activeSession = this.db
      .prepare("SELECT * FROM security_sessions WHERE state = 'active' ORDER BY last_seen_at DESC LIMIT 1")
      .get();
    if (!activeSession) {
      this.db
        .prepare(
          `INSERT INTO security_sessions (id, user_id, role_id, state, created_at, expires_at, last_seen_at, revoked_at)
           VALUES (?, ?, ?, 'active', ?, NULL, ?, NULL)`,
        )
        .run(DEFAULT_SECURITY_SESSION_ID, DEFAULT_SECURITY_USER_ID, 'owner', timestamp, timestamp);
      this.audit('security.session.created', 'security_session', DEFAULT_SECURITY_SESSION_ID, { userId: DEFAULT_SECURITY_USER_ID, roleId: 'owner' }, SECURITY_ACTION_PERMISSIONS.securityManage);
    } else {
      this.touchSession(String((activeSession as { id: string }).id));
    }
  }

  private getActiveSession(): SecuritySession {
    const row = this.db
      .prepare("SELECT * FROM security_sessions WHERE state = 'active' ORDER BY last_seen_at DESC LIMIT 1")
      .get();
    if (row) {
      return mapSecuritySession(row as Record<string, unknown>);
    }
    const timestamp = now();
    this.db
      .prepare(
        `INSERT INTO security_sessions (id, user_id, role_id, state, created_at, expires_at, last_seen_at, revoked_at)
         VALUES (?, ?, ?, 'active', ?, NULL, ?, NULL)`,
      )
      .run(DEFAULT_SECURITY_SESSION_ID, DEFAULT_SECURITY_USER_ID, 'owner', timestamp, timestamp);
    return this.requireSecuritySession(DEFAULT_SECURITY_SESSION_ID);
  }

  private touchSession(sessionId: string): void {
    this.db.prepare('UPDATE security_sessions SET last_seen_at = ? WHERE id = ?').run(now(), sessionId);
  }

  private requireSecurityUser(id: string): SecurityUser {
    const row = this.db.prepare('SELECT * FROM security_users WHERE id = ?').get(id);
    if (!row) throw new Error(`Security user not found: ${id}`);
    return mapSecurityUser(row as Record<string, unknown>);
  }

  private requireSecurityRole(id: SecurityRoleId): SecurityRole {
    const row = this.db.prepare('SELECT * FROM security_roles WHERE id = ?').get(id);
    if (!row) throw new Error(`Security role not found: ${id}`);
    return mapSecurityRole(row as Record<string, unknown>);
  }

  private requireSecuritySession(id: string): SecuritySession {
    const row = this.db.prepare('SELECT * FROM security_sessions WHERE id = ?').get(id);
    if (!row) throw new Error(`Security session not found: ${id}`);
    return mapSecuritySession(row as Record<string, unknown>);
  }

  private seedExecutionTools(timestamp: number): void {
    for (const tool of TOOL_FIXTURES) {
      this.db
        .prepare(
          `INSERT INTO tools (id, name, description, kind, permission_key, risk_level, requires_approval, enabled, input_schema_json, output_schema_json, permission_state, audit_mode, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'granted', 'trace', ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, kind = excluded.kind, permission_key = excluded.permission_key, risk_level = excluded.risk_level, requires_approval = excluded.requires_approval, enabled = excluded.enabled, input_schema_json = excluded.input_schema_json, output_schema_json = excluded.output_schema_json, updated_at = excluded.updated_at`,
        )
        .run(
          tool.id,
          tool.name,
          tool.description,
          tool.kind,
          tool.permissionKey,
          tool.riskLevel,
          tool.requiresApproval ? 1 : 0,
          tool.enabled ? 1 : 0,
          tool.inputSchemaJson,
          tool.outputSchemaJson,
          timestamp,
          timestamp,
        );
    }
  }

  private route(providerId?: string, modelId?: string): RouteDecision {
    const models = this.getModels().filter((model) => model.enabled && model.healthStatus !== 'error');
    if (models.length === 0) {
      throw new Error(t('models.errors.noModel'));
    }

    if (modelId) {
      const explicit = models.find((model) => model.id === modelId);
      if (!explicit) {
        throw new Error(t('chat.route.explicitUnavailable'));
      }
      return {
        providerId: explicit.providerId,
        modelId: explicit.id,
        modelNameSnapshot: explicit.modelNameSnapshot,
        reason: t('chat.route.explicitModel'),
        fallbackUsed: false,
      };
    }

    if (providerId) {
      const providerModel = models.find((model) => model.providerId === providerId);
      if (providerModel) {
        return {
          providerId: providerModel.providerId,
          modelId: providerModel.id,
          modelNameSnapshot: providerModel.modelNameSnapshot,
          reason: t('chat.route.explicitProvider'),
          fallbackUsed: false,
        };
      }
    }

    const workspace = this.getDefaultWorkspace();
    const defaultModel = workspace.defaultModelId ? models.find((model) => model.id === workspace.defaultModelId) : null;
    const selected = defaultModel ?? models[0];
    return {
      providerId: selected.providerId,
      modelId: selected.id,
      modelNameSnapshot: selected.modelNameSnapshot,
      reason: defaultModel ? t('chat.route.workspaceDefault') : t('chat.route.firstHealthy'),
      fallbackUsed: false,
    };
  }

  private retrieveKnowledge(
    query: string,
    options: {
      topK?: number;
      strategy?: KnowledgeRetrievalInput['strategy'];
      persistCitations?: boolean;
    } = {},
  ): KnowledgeRetrievalResult {
    const strategy = options.strategy ?? 'lexical';
    const topK = Math.min(Math.max(1, Math.floor(options.topK ?? KNOWLEDGE_RUNTIME_POLICY.defaultTopK)), KNOWLEDGE_RUNTIME_POLICY.maxTopK);
    const timestamp = now();
    const candidates = this.db
      .prepare(
        `SELECT
           knowledge_chunks.id,
           knowledge_chunks.file_id,
           knowledge_chunks.content,
           knowledge_chunks.citation,
           knowledge_chunks.position,
           files.name AS file_name,
           knowledge_embeddings.vector_json
         FROM knowledge_chunks
         JOIN files ON files.id = knowledge_chunks.file_id
         LEFT JOIN knowledge_embeddings ON knowledge_embeddings.chunk_id = knowledge_chunks.id AND knowledge_embeddings.status = 'embedded'
         WHERE knowledge_chunks.status = 'indexed'
           AND files.deleted_at IS NULL
           AND files.index_status = 'indexed'
         ORDER BY knowledge_chunks.created_at DESC`,
      )
      .all() as Array<{
        id: string;
        file_id: string;
        content: string;
        citation: string;
        position: number;
        file_name: string;
        vector_json: string | null;
      }>;
    const scoredInput: KnowledgeScoredChunkInput[] = candidates.map((chunk) => ({
      id: chunk.id,
      fileId: chunk.file_id,
      fileName: chunk.file_name,
      content: chunk.content,
      citation: chunk.citation,
      position: Number(chunk.position),
      strategy,
      vector: chunk.vector_json ? JSON.parse(chunk.vector_json) as number[] : lexicalEmbedding(chunk.content),
    }));
    const scored = scoreKnowledgeChunks(query, scoredInput, topK);
    const retrievalId = createId('retrieval');
    const fallbackReason = strategy === 'lexical' ? 'lexical_embedding' : null;
    this.db
      .prepare(
        `INSERT INTO knowledge_retrieval_traces (id, query, strategy, top_k, selected_chunk_ids_json, result_count, fallback_reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(retrievalId, query.trim(), strategy, topK, JSON.stringify(scored.map((chunk) => chunk.id)), scored.length, fallbackReason, timestamp);
    const citations = scored.map((chunk) => this.buildKnowledgeCitation({
      retrievalId,
      chunkId: chunk.id,
      fileId: chunk.fileId,
      fileName: chunk.fileName,
      citation: chunk.citation,
      snippet: chunk.content.slice(0, 220),
      score: chunk.score,
      strategy,
      fallbackReason,
      timestamp,
      persist: options.persistCitations ?? false,
    }));
    return {
      trace: this.requireKnowledgeRetrievalTrace(retrievalId),
      citations,
    };
  }

  private buildConversationContext(
    conversationId: string,
    strategy: SendMessageInput['contextStrategy'],
    content: string,
    modelContextWindow: number,
    citations: KnowledgeCitation[] = [],
  ): { providerMessages: ChatMessageInput[]; contextMessageIds: string[]; trimReason: string } {
    const normalizedStrategy = strategy ?? 'recent_n';
    const limits = CONTEXT_STRATEGY_LIMITS[normalizedStrategy];
    const prompt = this.getPromptTemplates().find((template) => template.enabled);
    const maxTokens = Math.max(256, Math.floor(modelContextWindow * limits.tokenBudgetRatio));
    let usedTokens = estimateTokens(content) + (prompt ? estimateTokens(prompt.content) : 0);
    const selected: Message[] = [];

    const candidates = this.getMessages(conversationId)
      .filter((message) => message.status === 'completed')
      .filter((message) => message.role === 'user' || message.role === 'assistant' || message.role === 'system' || message.role === 'tool')
      .slice()
      .reverse();

    for (const message of candidates) {
      if (selected.length >= limits.messageLimit) {
        break;
      }
      const messageTokens = estimateTokens(message.content);
      if (usedTokens + messageTokens > maxTokens && selected.length > 0) {
        break;
      }
      selected.push(message);
      usedTokens += messageTokens;
    }

    const ordered = selected.reverse();
    const knowledgeContext = citations.length > 0
      ? [
          t('knowledge.context.providerHeader'),
          ...citations.map((citation, index) => t('knowledge.context.providerCitation', {
            index: index + 1,
            file: citation.fileName,
            citation: citation.citation,
            snippet: citation.snippet,
          })),
        ].join('\n')
      : null;
    const providerMessages: ChatMessageInput[] = [
      ...(prompt ? [{ role: 'system' as const, content: prompt.content }] : []),
      ...(knowledgeContext ? [{ role: 'system' as const, content: knowledgeContext }] : []),
      ...ordered.map((message): ChatMessageInput => ({
        role: message.role === 'error' ? 'assistant' : message.role,
        content: message.content,
      })),
      { role: 'user', content },
    ];
    const availableCount = candidates.length;
    const trimReason = availableCount > ordered.length
      ? t('chat.context.trimmed', { selected: ordered.length, available: availableCount })
      : t('chat.context.untrimmed', { selected: ordered.length });
    return {
      providerMessages,
      contextMessageIds: ordered.map((message) => message.id),
      trimReason,
    };
  }

  private validateMessageAttachments(inputs: MessageAttachmentInput[]): {
    accepted: Array<MessageAttachmentInput & { id: string }>;
    rejected: Array<MessageAttachmentInput & { reason: string }>;
    summary: { accepted: number; rejected: number; maxBytes: number };
  } {
    const accepted: Array<MessageAttachmentInput & { id: string }> = [];
    const rejected: Array<MessageAttachmentInput & { reason: string }> = [];
    for (const input of inputs) {
      const name = input.name.trim();
      const mimeType = input.mimeType.trim();
      const size = Math.max(0, Math.floor(input.size));
      if (!name || !mimeType) {
        rejected.push({ ...input, reason: t('chat.attachments.errors.metadata') });
        continue;
      }
      if (size > MESSAGE_ATTACHMENT_POLICY.maxBytes) {
        rejected.push({ ...input, reason: t('chat.attachments.errors.size') });
        continue;
      }
      if (!isAllowedAttachmentMimeType(mimeType)) {
        rejected.push({ ...input, reason: t('chat.attachments.errors.type') });
        continue;
      }
      accepted.push({ name, mimeType, size, id: createId('attach') });
    }
    return {
      accepted,
      rejected,
      summary: {
        accepted: accepted.length,
        rejected: rejected.length,
        maxBytes: MESSAGE_ATTACHMENT_POLICY.maxBytes,
      },
    };
  }

  private insertMessageAttachments(
    messageId: string,
    conversationId: string,
    attachments: Array<MessageAttachmentInput & { id: string }>,
  ): void {
    const timestamp = now();
    for (const attachment of attachments) {
      this.db
        .prepare(
          `INSERT INTO message_attachments (id, message_id, conversation_id, name, mime_type, size, status, storage_ref, error_message, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'accepted', NULL, NULL, ?, ?)`,
        )
        .run(attachment.id, messageId, conversationId, attachment.name, attachment.mimeType, attachment.size, timestamp, timestamp);
    }
  }

  private insertMessageChunks({
    messageId,
    conversationId,
    requestLogId,
    chunks,
    status,
    chunkType = 'text',
  }: {
    messageId: string;
    conversationId: string;
    requestLogId: string;
    chunks: string[];
    status: MessageChunk['status'];
    chunkType?: MessageChunk['chunkType'];
  }): void {
    const timestamp = now();
    chunks.forEach((chunk, index) => {
      this.db
        .prepare(
          `INSERT INTO message_chunks (id, message_id, conversation_id, request_log_id, sequence, chunk_type, content, token_count, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('chunk'),
          messageId,
          conversationId,
          requestLogId,
          index,
          index === chunks.length - 1 && chunkType === 'text' ? 'final' : chunkType,
          chunk,
          estimateTokens(chunk),
          status,
          timestamp + index,
        );
    });
  }

  private indexKnowledgeChunks(
    fileId: string,
    fileName: string,
    chunks: ReturnType<typeof chunkKnowledgeText>,
    timestamp: number,
  ): void {
    chunks.forEach((chunk, index) => {
      const chunkId = createId('kchunk');
      const embeddingId = createId('kembed');
      const vector = lexicalEmbedding(chunk.content);
      const citation = `${fileName}#chunk-${index + 1}`;
      this.db
        .prepare(
          `INSERT INTO knowledge_chunks (id, file_id, knowledge_base_id, content, citation, position, token_count, content_hash, source_start, source_end, page_number, section_title, status, embedding_id, metadata_json, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'indexed', ?, ?, ?, ?)`,
        )
        .run(
          chunkId,
          fileId,
          chunk.content,
          citation,
          chunk.position,
          chunk.tokenCount,
          chunk.contentHash,
          chunk.sourceStart,
          chunk.sourceEnd,
          embeddingId,
          JSON.stringify({ strategy: 'lexical', indexDirectory: KNOWLEDGE_RUNTIME_POLICY.indexDirectory }),
          timestamp + index,
          timestamp + index,
        );
      this.db
        .prepare(
          `INSERT INTO knowledge_embeddings (id, chunk_id, provider_id, model_id, model_name_snapshot, strategy, dimension, vector_json, vector_hash, status, created_at)
           VALUES (?, ?, NULL, NULL, ?, 'lexical', ?, ?, ?, 'embedded', ?)`,
        )
        .run(
          embeddingId,
          chunkId,
          KNOWLEDGE_RUNTIME_POLICY.embeddingModel,
          vector.length,
          JSON.stringify(vector),
          stableKnowledgeHash(JSON.stringify(vector)),
          timestamp + index,
        );
    });
  }

  private buildKnowledgeCitation(input: {
    retrievalId: string | null;
    chunkId: string;
    fileId: string;
    fileName: string;
    citation: string;
    snippet: string;
    score: number;
    strategy: KnowledgeCitation['strategy'];
    fallbackReason: string | null;
    timestamp: number;
    persist: boolean;
  }): KnowledgeCitation {
    const id = createId('citation');
    if (input.persist) {
      this.db
        .prepare(
          `INSERT INTO message_citations (id, retrieval_id, message_id, request_log_id, file_id, chunk_id, file_name, citation, snippet, score, strategy, fallback_reason, created_at)
           VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.retrievalId,
          input.fileId,
          input.chunkId,
          input.fileName,
          input.citation,
          input.snippet,
          input.score,
          input.strategy,
          input.fallbackReason,
          input.timestamp,
        );
    }
    return {
      id,
      retrievalId: input.retrievalId,
      messageId: null,
      requestLogId: null,
      fileId: input.fileId,
      chunkId: input.chunkId,
      fileName: input.fileName,
      citation: input.citation,
      snippet: input.snippet,
      score: input.score,
      strategy: input.strategy,
      fallbackReason: input.fallbackReason,
      createdAt: input.timestamp,
    };
  }

  private attachKnowledgeCitations(citations: KnowledgeCitation[], messageId: string, requestLogId: string): void {
    for (const citation of citations) {
      this.db
        .prepare(
          `INSERT INTO message_citations (id, retrieval_id, message_id, request_log_id, file_id, chunk_id, file_name, citation, snippet, score, strategy, fallback_reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('citation'),
          citation.retrievalId,
          messageId,
          requestLogId,
          citation.fileId,
          citation.chunkId,
          citation.fileName,
          citation.citation,
          citation.snippet,
          citation.score,
          citation.strategy,
          citation.fallbackReason,
          now(),
        );
    }
  }

  private buildConversationMarkdownExport(
    conversation: Conversation,
    messages: Message[],
    attachments: MessageAttachment[],
    redacted: boolean,
  ): string {
    const lines = [
      `# ${redacted ? redactSensitive(conversation.title) : conversation.title}`,
      '',
      `- ${t('chat.export.fields.conversationId')}: ${conversation.id}`,
      `- ${t('chat.export.fields.messageCount')}: ${messages.length}`,
      `- ${t('chat.export.fields.attachments')}: ${attachments.length}`,
      '',
    ];
    for (const message of messages) {
      const content = redacted ? redactSensitive(message.content) : message.content;
      lines.push(`## ${message.role} · ${message.status}`);
      if (message.modelNameSnapshot) {
        lines.push(`_${message.modelNameSnapshot}_`);
      }
      lines.push('', content, '');
    }
    return lines.join('\n');
  }

  private buildConversationJsonExport(
    conversation: Conversation,
    messages: Message[],
    attachments: MessageAttachment[],
    redacted: boolean,
  ): string {
    const redactMessage = (message: Message): Message => ({
      ...message,
      content: redacted ? redactSensitive(message.content) : message.content,
      errorMessage: message.errorMessage ? redactSensitive(message.errorMessage) : null,
      metadataJson: message.metadataJson ? redactSensitive(message.metadataJson) : null,
    });
    return JSON.stringify({
      conversation: {
        ...conversation,
        title: redacted ? redactSensitive(conversation.title) : conversation.title,
      },
      messages: messages.map(redactMessage),
      attachments: attachments.map((attachment) => ({
        ...attachment,
        storageRef: redacted ? null : attachment.storageRef,
        errorMessage: attachment.errorMessage ? redactSensitive(attachment.errorMessage) : null,
      })),
      redacted,
      exportedAt: now(),
    }, null, 2);
  }

  private findLatestMessageId(conversationId: string): string | null {
    const row = this.db
      .prepare("SELECT id FROM messages WHERE conversation_id = ? AND status != 'deleted' ORDER BY created_at DESC LIMIT 1")
      .get(conversationId) as { id: string } | undefined;
    return row?.id ?? null;
  }

  private findPreviousUserMessage(conversationId: string, beforeCreatedAt: number): Message | null {
    const row = this.db
      .prepare(
        `SELECT * FROM messages
         WHERE conversation_id = ? AND role = 'user' AND status != 'deleted' AND created_at <= ?
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .get(conversationId, beforeCreatedAt) as Record<string, unknown> | undefined;
    return row ? mapMessage(row) : null;
  }

  private estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.requireModel(modelId);
    const inputPrice = model.inputPrice ?? 0;
    const outputPrice = model.outputPrice ?? 0;
    return (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
  }

  private getDefaultWorkspace(): Workspace {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(DEFAULT_WORKSPACE_ID);
    if (!row) {
      throw new Error('Default workspace missing.');
    }
    return mapWorkspace(row as Record<string, unknown>);
  }

  private getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  private setSetting(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(key, value, now());
  }

  private markGatewayKeyError(gatewayKeyId: string, errorCode: GatewayErrorCode): void {
    this.db.prepare('UPDATE gateway_api_keys SET last_error_code = ? WHERE id = ?').run(errorCode, gatewayKeyId);
  }

  private parseManifest(manifestJson: string | null): Record<string, unknown> {
    if (!manifestJson) {
      return {};
    }
    try {
      return JSON.parse(manifestJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private detectImportSource(manifest: Record<string, unknown>): GatewayImportPlan['source'] {
    const value = String(manifest.source ?? manifest.kind ?? manifest.type ?? '').toLowerCase();
    if (value.includes('sub2api')) return 'sub2api';
    if (value.includes('ccs')) return 'ccs';
    if (value.includes('ollama')) return 'ollama';
    if (value.includes('lm-studio') || value.includes('lm studio')) return 'lm-studio';
    if (value.includes('nexachat')) return 'nexachat';
    return 'openai-compatible';
  }

  private normalizeImportProviders(value: unknown): Array<{ name: string; type: Provider['type']; baseUrl: string }> {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.slice(0, 20).map((provider, index) => {
      const item = provider as Record<string, unknown>;
      return {
        name: String(item.name ?? item.label ?? `Imported Provider ${index + 1}`),
        type: 'openai-compatible',
        baseUrl: normalizeBaseUrl(String(item.baseUrl ?? item.base_url ?? item.url ?? 'http://127.0.0.1:11434/v1')),
      };
    });
  }

  private normalizeImportModels(value: unknown): Array<{ providerName: string | null; name: string; displayName: string }> {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.slice(0, 100).map((model, index) => {
      const item = model as Record<string, unknown>;
      const name = String(item.name ?? item.id ?? item.model ?? `imported-model-${index + 1}`);
      return {
        providerName: item.providerName || item.provider ? String(item.providerName ?? item.provider) : null,
        name,
        displayName: String(item.displayName ?? item.label ?? name),
      };
    });
  }

  private normalizeGatewayKeyTemplates(value: unknown): Array<{ name: string; scopes: GatewayScope[]; quotaLimit: number | null }> {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.slice(0, 20).map((item, index) => {
      const record = item as Record<string, unknown>;
      return {
        name: String(record.name ?? record.label ?? `Imported Gateway Key Template ${index + 1}`),
        scopes: normalizeGatewayScopes(Array.isArray(record.scopes) ? record.scopes.map(String) : GATEWAY_SCOPES),
        quotaLimit: normalizeGatewayLimit(typeof record.quotaLimit === 'number' ? record.quotaLimit : null),
      };
    });
  }

  private applyImportMetadata(manifest: Record<string, unknown>): string[] {
    const timestamp = now();
    const appliedEntityIds: string[] = [];
    const providers = Array.isArray(manifest.providers) ? manifest.providers as Array<Record<string, unknown>> : [];
    const providerByName = new Map(this.getProviders().map((provider) => [provider.name, provider]));

    for (const provider of providers) {
      const name = String(provider.name ?? '').trim();
      const baseUrl = normalizeBaseUrl(String(provider.baseUrl ?? ''));
      if (!name || !baseUrl || providerByName.has(name)) {
        continue;
      }
      const id = createId('provider');
      this.db
        .prepare(
          `INSERT INTO providers (id, name, type, base_url, proxy_url, auth_type, secret_ref, custom_headers_json, enabled, health_status, last_checked_at, created_at, updated_at)
           VALUES (?, ?, 'openai-compatible', ?, NULL, 'none', NULL, NULL, 1, 'unknown', NULL, ?, ?)`,
        )
        .run(id, name, baseUrl, timestamp, timestamp);
      appliedEntityIds.push(id);
      providerByName.set(name, this.requireProvider(id));
    }

    const models = Array.isArray(manifest.models) ? manifest.models as Array<Record<string, unknown>> : [];
    const defaultProvider = this.getProviders()[0];
    for (const model of models) {
      const name = String(model.name ?? '').trim();
      if (!name) {
        continue;
      }
      const providerName = model.providerName ? String(model.providerName) : null;
      const provider = providerName ? providerByName.get(providerName) : defaultProvider;
      if (!provider) {
        continue;
      }
      if (this.getModels().some((existing) => existing.providerId === provider.id && existing.name === name)) {
        continue;
      }
      const id = createId('model');
      this.db
        .prepare(
          `INSERT INTO models (id, provider_id, name, display_name, model_name_snapshot, context_window, supports_streaming, supports_tools, supports_vision, supports_embeddings, input_price, output_price, health_status, latency_ms, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 8192, 1, 0, 0, 0, NULL, NULL, 'unknown', NULL, 1, ?, ?)`,
        )
        .run(id, provider.id, name, String(model.displayName ?? name), name, timestamp, timestamp);
      appliedEntityIds.push(id);
    }

    return appliedEntityIds;
  }

  private parseStringList(value: unknown, key: string): string[] {
    if (!value || typeof value !== 'object') {
      return [];
    }
    const raw = (value as Record<string, unknown>)[key];
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
  }

  private saveSecret(label: string, value: string): string {
    const id = createId('secret');
    const timestamp = now();
    const encoded = encodeSecretValue(value);
    this.db
      .prepare('INSERT INTO secrets (id, label, encrypted_value, preview, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, label, encoded, previewSecret(value), timestamp, timestamp);
    return id;
  }

  private getProviderSecret(provider: Provider): string | null {
    if (provider.authType !== 'api-key') {
      return null;
    }
    if (!provider.secretRef) {
      return null;
    }
    const row = this.db.prepare('SELECT encrypted_value FROM secrets WHERE id = ?').get(provider.secretRef) as { encrypted_value: string } | undefined;
    return row ? decodeSecretValue(row.encrypted_value) : null;
  }

  private normalizeProviderError(error: unknown): { code: string; message: string; retryable: boolean } {
    if (error instanceof ProviderRuntimeError) {
      return { code: error.code, message: redactSensitive(error.message), retryable: error.retryable };
    }
    if (error instanceof Error) {
      return { code: PROVIDER_RUNTIME_ERROR_CODES.upstreamError, message: redactSensitive(error.message), retryable: false };
    }
    return { code: PROVIDER_RUNTIME_ERROR_CODES.upstreamError, message: redactSensitive(String(error)), retryable: false };
  }

  private audit(
    action: string,
    targetType: string,
    targetId: string | null,
    details: unknown,
    permissionKey: SecurityPermissionKey | null = null,
  ): void {
    const active = this.db
      .prepare("SELECT user_id FROM security_sessions WHERE state = 'active' ORDER BY last_seen_at DESC LIMIT 1")
      .get() as { user_id: string } | undefined;
    const actor = active?.user_id ?? 'system';
    const id = createId('audit');
    const createdAt = now();
    const detailsJson = redactSensitive(details);
    const previousHash = this.getLatestAuditHash();
    const entryHash = computeAuditHash({
      id,
      action,
      actor,
      targetType,
      targetId,
      detailsJson,
      permissionKey,
      previousHash,
      createdAt,
    });
    this.db
      .prepare(
        `INSERT INTO audit_logs (id, action, actor, target_type, target_id, details_json, permission_key, previous_hash, entry_hash, integrity_state, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)`,
      )
      .run(id, action, actor, targetType, targetId, detailsJson, permissionKey, previousHash, entryHash, createdAt);
  }

  private getLatestAuditHash(): string | null {
    const row = this.db
      .prepare('SELECT entry_hash FROM audit_logs WHERE entry_hash IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1')
      .get() as { entry_hash: string | null } | undefined;
    return row?.entry_hash ?? null;
  }

  private backfillAuditHashes(): void {
    const rows = this.db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at ASC, id ASC')
      .all()
      .map((row) => mapAuditLog(row as Record<string, unknown>));
    let previousHash: string | null = null;
    for (const row of rows) {
      const entryHash = computeAuditHash({
        id: row.id,
        action: row.action,
        actor: row.actor,
        targetType: row.targetType,
        targetId: row.targetId,
        detailsJson: row.detailsJson,
        permissionKey: row.permissionKey,
        previousHash,
        createdAt: row.createdAt,
      });
      if (row.previousHash !== previousHash || row.entryHash !== entryHash || row.integrityState !== 'verified') {
        this.db
          .prepare("UPDATE audit_logs SET previous_hash = ?, entry_hash = ?, integrity_state = 'verified' WHERE id = ?")
          .run(previousHash, entryHash, row.id);
      }
      previousHash = entryHash;
    }
  }

  private requireProvider(id: string): Provider {
    const row = this.db.prepare('SELECT * FROM providers WHERE id = ?').get(id);
    if (!row) throw new Error(`Provider not found: ${id}`);
    return mapProvider(row as Record<string, unknown>);
  }

  private requireModel(id: string): Model {
    const row = this.db.prepare('SELECT * FROM models WHERE id = ?').get(id);
    if (!row) throw new Error(`Model not found: ${id}`);
    return mapModel(row as Record<string, unknown>);
  }

  private requireConversation(id: string): Conversation {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    if (!row) throw new Error(`Conversation not found: ${id}`);
    return mapConversation(row as Record<string, unknown>);
  }

  private requireMessage(id: string): Message {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!row) throw new Error(`Message not found: ${id}`);
    return mapMessage(row as Record<string, unknown>);
  }

  private requireRequestLog(id: string): RequestLog {
    const row = this.db.prepare('SELECT * FROM request_logs WHERE id = ?').get(id);
    if (!row) throw new Error(`Request log not found: ${id}`);
    return mapRequestLog(row as Record<string, unknown>);
  }

  private requireFeedbackItem(id: string): FeedbackItem {
    const row = this.db.prepare('SELECT * FROM feedback_items WHERE id = ?').get(id);
    if (!row) throw new Error(`Feedback item not found: ${id}`);
    return mapFeedbackItem(row as Record<string, unknown>);
  }

  private requireEvalSet(id: string): EvalSet {
    const row = this.db.prepare('SELECT * FROM eval_sets WHERE id = ?').get(id);
    if (!row) throw new Error(`Eval set not found: ${id}`);
    return mapEvalSet(row as Record<string, unknown>);
  }

  private requireEvalResult(id: string): EvalResult {
    const row = this.db.prepare('SELECT * FROM eval_results WHERE id = ?').get(id);
    if (!row) throw new Error(`Eval result not found: ${id}`);
    return mapEvalResult(row as Record<string, unknown>);
  }

  private recordProviderHealth(
    providerId: string,
    modelId: string | null,
    status: ProviderHealthRecord['status'],
    latencyMs: number | null,
    source: ProviderHealthRecord['source'],
    errorCode: string | null,
    errorMessage: string | null,
  ): void {
    this.db
      .prepare(
        `INSERT INTO provider_health_records (id, provider_id, model_id, status, latency_ms, source, error_code, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(createId('health'), providerId, modelId, status, latencyMs, source, errorCode, errorMessage ? redactSensitive(errorMessage) : null, now());
  }

  private requireGatewayKey(id: string): GatewayApiKey {
    const row = this.db.prepare('SELECT * FROM gateway_api_keys WHERE id = ?').get(id);
    if (!row) throw new Error(`Gateway key not found: ${id}`);
    return mapGatewayKey(row as Record<string, unknown>);
  }

  private requireKnowledgeFile(id: string, options: { includeDeleted?: boolean } = {}): KnowledgeFile {
    const row = options.includeDeleted
      ? this.db.prepare('SELECT * FROM files WHERE id = ?').get(id)
      : this.db.prepare('SELECT * FROM files WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!row) throw new Error(`Knowledge file not found: ${id}`);
    return mapKnowledgeFile(row as Record<string, unknown>);
  }

  private requireKnowledgeRetrievalTrace(id: string): KnowledgeRetrievalTrace {
    const row = this.db.prepare('SELECT * FROM knowledge_retrieval_traces WHERE id = ?').get(id);
    if (!row) throw new Error(`Knowledge retrieval not found: ${id}`);
    return mapKnowledgeRetrievalTrace(row as Record<string, unknown>);
  }

  private requireMcpServer(id: string): McpServer {
    const row = this.db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id);
    if (!row) throw new Error(`MCP server not found: ${id}`);
    return mapMcpServer(row as Record<string, unknown>);
  }

  private requireAgent(id: string): AgentDefinition {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    if (!row) throw new Error(`Agent not found: ${id}`);
    return mapAgent(row as Record<string, unknown>);
  }

  private requireTool(id: string): ToolDefinition {
    const row = this.db.prepare('SELECT * FROM tools WHERE id = ? AND enabled = 1').get(id);
    if (!row) throw new Error(`Tool not found or disabled: ${id}`);
    return mapToolDefinition(row as Record<string, unknown>);
  }

  private requireExecutionRun(id: string): ExecutionRun {
    const row = this.db.prepare('SELECT * FROM execution_runs WHERE id = ?').get(id);
    if (!row) throw new Error(`Execution run not found: ${id}`);
    return mapExecutionRun(row as Record<string, unknown>);
  }

  private requireApprovalRequest(id: string): ApprovalRequest {
    const row = this.db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(id);
    if (!row) throw new Error(`Approval request not found: ${id}`);
    return mapApprovalRequest(row as Record<string, unknown>);
  }

  private createExecutionStep(input: {
    runId: string;
    kind: ExecutionStep['kind'];
    title: string;
    status: ExecutionStep['status'];
    position: number;
    timestamp: number;
    toolId?: string | null;
    mcpServerId?: string | null;
    inputJson?: string | null;
    outputJson?: string | null;
    errorMessage?: string | null;
  }): string {
    const id = createId('step');
    const completed = ['completed', 'failed', 'cancelled'].includes(input.status) ? input.timestamp : null;
    const started = ['running', 'completed', 'failed', 'cancelled'].includes(input.status) ? input.timestamp : null;
    this.db
      .prepare(
        `INSERT INTO execution_steps (id, run_id, parent_step_id, kind, title, status, tool_id, mcp_server_id, input_json, output_json, error_message, position, started_at, completed_at, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.runId,
        input.kind,
        input.title,
        input.status,
        input.toolId ?? null,
        input.mcpServerId ?? null,
        input.inputJson ?? null,
        input.outputJson ?? null,
        input.errorMessage ?? null,
        input.position,
        started,
        completed,
        input.timestamp,
        input.timestamp,
      );
    return id;
  }

  private addTrace(
    runId: string,
    stepId: string | null,
    eventType: ExecutionTraceEvent['eventType'],
    message: string,
    metadata?: unknown,
  ): void {
    this.db
      .prepare(
        `INSERT INTO execution_trace_events (id, run_id, step_id, event_type, message, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(createId('trace'), runId, stepId, eventType, message, metadata ? JSON.stringify(redactSensitive(metadata)) : null, now());
  }

  private executeFixtureTool(toolId: string, inputJson: string): string {
    if (toolId === EXECUTION_TOOL_IDS.echo) {
      const parsed = safeJsonParse(inputJson);
      return JSON.stringify({ echo: typeof parsed.message === 'string' ? parsed.message : t('tools.execution.echo.default') });
    }
    return JSON.stringify({
      summary: t('tools.execution.status.summary', {
        models: this.getModels().length,
        knowledge: this.getKnowledgeFiles().length,
        gateway: this.getGatewayStatus().running ? 'running' : 'stopped',
      }),
    });
  }

  private emptyDataManifest(source: string): NormalizedDataManifest {
    return {
      version: DATA_MANIFEST_VERSION,
      source,
      providers: [],
      models: [],
      gatewayKeyTemplates: [],
      conflictCount: 0,
      conflicts: [],
      redaction: {
        secrets: 'stripped',
        localPaths: 'redacted',
      },
      requiresConfirmation: true,
    };
  }

  private detectDataConflicts(parsed: Record<string, unknown>): DataConflictInput[] {
    const conflicts: DataConflictInput[] = [];
    const existingProviders = this.getProviders();
    const providers = Array.isArray(parsed.providers) ? parsed.providers as Array<Record<string, unknown>> : [];
    for (const provider of providers) {
      const name = String(provider.name ?? provider.label ?? '').trim();
      const existing = existingProviders.find((candidate) => candidate.name === name);
      if (existing) {
        conflicts.push({
          type: 'provider-name',
          entityKind: 'provider',
          localId: existing.id,
          importName: name,
          strategy: 'keep-local',
        });
      }
    }
    const models = Array.isArray(parsed.models) ? parsed.models as Array<Record<string, unknown>> : [];
    for (const model of models) {
      const name = String(model.name ?? model.id ?? model.model ?? '').trim();
      const existing = this.getModels().find((candidate) => candidate.name === name);
      if (existing) {
        conflicts.push({
          type: 'model-name',
          entityKind: 'model',
          localId: existing.id,
          importName: name,
          strategy: 'keep-local',
        });
      }
    }
    const keyTemplates = parsed.keys ?? parsed.apiKeys ?? parsed.gatewayKeys;
    if (Array.isArray(keyTemplates) && keyTemplates.length > 0) {
      for (const key of keyTemplates.slice(0, 20)) {
        const item = key as Record<string, unknown>;
        conflicts.push({
          type: 'secret-stripped',
          entityKind: 'secret',
          localId: null,
          importName: String(item.name ?? item.label ?? 'Imported secret template'),
          strategy: 'skip',
        });
      }
    }
    return conflicts;
  }

  private insertDataMobilityJob(input: {
    id: string;
    operationKind: DataMobilityJob['operationKind'];
    status: DataMobilityJob['status'];
    source: string | null;
    profile: DataMobilityJob['profile'];
    summary: string;
    manifestJson: string | null;
    manifestHash: string | null;
    conflictCount: number;
    requiresConfirmation: boolean;
    encrypted: boolean;
    redacted: boolean;
    rollbackRecordId: string | null;
    relatedSnapshotId: string | null;
    timestamp: number;
  }): string {
    this.db
      .prepare(
        `INSERT INTO data_mobility_jobs (id, operation_kind, status, source, manifest_version, profile, summary, manifest_hash, manifest_json, conflict_count, requires_confirmation, encrypted, redacted, rollback_record_id, related_snapshot_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, summary = excluded.summary, manifest_hash = excluded.manifest_hash, manifest_json = excluded.manifest_json, conflict_count = excluded.conflict_count, requires_confirmation = excluded.requires_confirmation, rollback_record_id = excluded.rollback_record_id, related_snapshot_id = excluded.related_snapshot_id, updated_at = excluded.updated_at`,
      )
      .run(
        input.id,
        input.operationKind,
        input.status,
        input.source,
        DATA_MANIFEST_VERSION,
        input.profile,
        input.summary,
        input.manifestHash,
        input.manifestJson,
        input.conflictCount,
        input.requiresConfirmation ? 1 : 0,
        input.encrypted ? 1 : 0,
        input.redacted ? 1 : 0,
        input.rollbackRecordId,
        input.relatedSnapshotId,
        input.timestamp,
        input.timestamp,
      );
    this.ensureMigrationRun(input.timestamp);
    return input.id;
  }

  private insertDataConflicts(jobId: string, conflicts: DataConflictInput[], timestamp: number): void {
    for (const conflict of conflicts) {
      this.db
        .prepare(
          `INSERT INTO data_conflicts (id, job_id, type, entity_kind, local_id, import_name, strategy, resolved, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('conflict'),
          jobId,
          conflict.type,
          conflict.entityKind,
          conflict.localId,
          conflict.importName,
          conflict.strategy ?? 'keep-local',
          0,
          timestamp,
        );
    }
  }

  private updateDataMobilityJob(
    id: string,
    status: DataMobilityJob['status'],
    summary: string,
    rollbackRecordId: string | null,
    relatedSnapshotId: string | null,
    timestamp: number,
    manifestJson?: string,
  ): void {
    this.db
      .prepare(
        `UPDATE data_mobility_jobs
         SET status = ?, summary = ?, rollback_record_id = ?, related_snapshot_id = ?, manifest_json = COALESCE(?, manifest_json), manifest_hash = COALESCE(?, manifest_hash), updated_at = ?
         WHERE id = ?`,
      )
      .run(status, summary, rollbackRecordId, relatedSnapshotId, manifestJson ?? null, manifestJson ? stableHash(manifestJson) : null, timestamp, id);
  }

  private insertRollbackRecord(
    jobId: string,
    rollbackSnapshotId: string | null,
    affectedEntityIds: string[],
    state: RollbackRecord['state'],
    appliedAt: number | null,
    timestamp: number,
  ): string {
    const id = createId('rollback_record');
    this.db
      .prepare(
        `INSERT INTO rollback_records (id, job_id, rollback_snapshot_id, state, affected_entity_ids_json, applied_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, jobId, rollbackSnapshotId, state, JSON.stringify(affectedEntityIds), appliedAt, timestamp);
    return id;
  }

  private markRollbackApplied(jobId: string, fallbackEntityIds: string[], timestamp: number): void {
    const existing = this.db.prepare("SELECT * FROM rollback_records WHERE job_id = ? AND state = 'available' ORDER BY created_at DESC LIMIT 1").get(jobId);
    if (existing) {
      this.db.prepare("UPDATE rollback_records SET state = 'applied', applied_at = ? WHERE id = ?").run(timestamp, (existing as { id: string }).id);
      return;
    }
    this.insertRollbackRecord(jobId, null, fallbackEntityIds, 'applied', timestamp, timestamp);
  }

  private buildDataExportPayload(profile: DataBackupProfile): Record<string, unknown> {
    return {
      version: DATA_MANIFEST_VERSION,
      profile,
      exportedAt: now(),
      providers: this.getProviders().map((provider) => ({
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        enabled: provider.enabled,
        authType: provider.authType,
        secretRef: provider.secretRef ? '[REDACTED]' : null,
      })),
      models: this.getModels().map((model) => ({
        providerId: model.providerId,
        name: model.name,
        displayName: model.displayName,
        contextWindow: model.contextWindow,
        enabled: model.enabled,
      })),
      gatewayKeys: this.getGatewayKeys().map((key) => ({
        name: key.name,
        scopes: key.scopes,
        state: key.state,
        keyPreview: key.keyPreview,
      })),
      conversations: this.getConversations().map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        status: conversation.status,
        messageCount: conversation.messageCount,
      })),
      uiPreferences: this.getUiPreferences(),
      security: {
        activeRole: this.getSecurityState().activeRole.id,
        permissionKeys: this.getSecurityState().permissionKeys,
      },
    };
  }

  private createEncryptedBackupPackage(payload: unknown, passphrase: string): DataBackupPackage {
    const normalized = passphrase.trim();
    if (normalized.length < 8) {
      throw new Error(t('data.backup.errors.passphrase'));
    }
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = pbkdf2Sync(normalized, salt, 120000, 32, 'sha256');
    const plaintext = JSON.stringify(createRedactedBackupPackage(payload, 'encrypted-full'));
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      version: DATA_MANIFEST_VERSION,
      profile: 'encrypted-full',
      encrypted: true,
      redacted: true,
      manifestHash: createHash('sha256').update(plaintext).digest('hex'),
      payload: encrypted.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  private decryptBackupPackage(pkg: DataBackupPackage, passphrase: string): Record<string, unknown> {
    if (!pkg.encrypted) {
      return JSON.parse(pkg.payload) as Record<string, unknown>;
    }
    if (!pkg.salt || !pkg.iv || !pkg.authTag) {
      throw new Error(t('data.restore.errors.backupInvalid'));
    }
    try {
      const key = pbkdf2Sync(passphrase.trim(), Buffer.from(pkg.salt, 'base64'), 120000, 32, 'sha256');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(pkg.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(pkg.authTag, 'base64'));
      const plaintext = Buffer.concat([decipher.update(Buffer.from(pkg.payload, 'base64')), decipher.final()]).toString('utf8');
      if (createHash('sha256').update(plaintext).digest('hex') !== pkg.manifestHash) {
        throw new Error(t('data.restore.errors.integrity'));
      }
      return JSON.parse(plaintext) as Record<string, unknown>;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : t('data.restore.errors.backupInvalid'));
    }
  }

  private resolveBackupPackage(input: DataRestorePreflightInput): DataBackupPackage {
    if (input.packageText?.trim()) {
      return JSON.parse(input.packageText) as DataBackupPackage;
    }
    if (input.backupId) {
      const backup = this.requireDataBackup(input.backupId);
      return JSON.parse(backup.packageJson) as DataBackupPackage;
    }
    throw new Error(t('data.restore.errors.backupRequired'));
  }

  private payloadToDataManifest(payload: Record<string, unknown>): NormalizedDataManifest {
    const nestedPayload = typeof payload.payload === 'string' && !payload.encrypted
      ? JSON.parse(String(payload.payload)) as Record<string, unknown>
      : payload;
    const body = (nestedPayload.profile && typeof nestedPayload.payload === 'string')
      ? JSON.parse(String(nestedPayload.payload)) as Record<string, unknown>
      : nestedPayload;
    const sourcePayload = typeof body.payload === 'object' && body.payload !== null ? body.payload as Record<string, unknown> : body;
    const conflicts = this.detectDataConflicts(sourcePayload);
    try {
      return normalizeDataManifest(sourcePayload, conflicts);
    } catch {
      return this.emptyDataManifest(detectDataImportSource(sourcePayload));
    }
  }

  private ensureMigrationRun(timestamp: number): void {
    const version = DATA_MIGRATION_VERSIONS[0];
    const existing = this.db.prepare('SELECT id FROM migration_runs WHERE version = ?').get(version);
    if (existing) return;
    this.db
      .prepare('INSERT INTO migration_runs (id, version, status, summary, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(createId('migration'), version, 'completed', t('data.migration.summary.round12'), timestamp, timestamp);
  }

  private requireDataMobilityJob(id: string): DataMobilityJob {
    const row = this.db.prepare('SELECT * FROM data_mobility_jobs WHERE id = ?').get(id);
    if (!row) throw new Error(`Data mobility job not found: ${id}`);
    return mapDataMobilityJob(row as Record<string, unknown>);
  }

  private requireDataBackup(id: string): DataBackupRecord {
    const row = this.db.prepare('SELECT * FROM data_backups WHERE id = ?').get(id);
    if (!row) throw new Error(`Data backup not found: ${id}`);
    return mapDataBackupRecord(row as Record<string, unknown>);
  }

  private requireRollbackRecord(id: string): RollbackRecord {
    const row = this.db.prepare('SELECT * FROM rollback_records WHERE id = ?').get(id);
    if (!row) throw new Error(`Rollback record not found: ${id}`);
    return mapRollbackRecord(row as Record<string, unknown>);
  }

  private requireImportExportResult(id: string): ImportExportResult {
    const row = this.db.prepare('SELECT * FROM config_snapshots WHERE id = ?').get(id);
    if (!row) throw new Error(`Import/export result not found: ${id}`);
    return mapImportExportResult(row as Record<string, unknown>);
  }

  private requireConversationExport(id: string): ConversationExport {
    const row = this.db.prepare('SELECT * FROM conversation_exports WHERE id = ?').get(id);
    if (!row) throw new Error(`Conversation export not found: ${id}`);
    return mapConversationExport(row as Record<string, unknown>);
  }
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

export const store = new NexaStore();
