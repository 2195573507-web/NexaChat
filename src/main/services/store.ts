import { randomBytes } from 'node:crypto';
import { safeStorage } from 'electron';
import type { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../database/connection.js';
import {
  mapAgent,
  mapAuditLog,
  mapConversation,
  mapConversationExport,
  mapGatewayKey,
  mapGatewayLog,
  mapImportExportResult,
  mapKnowledgeFile,
  mapMcpServer,
  mapMessage,
  mapMessageAttachment,
  mapMessageChunk,
  mapModel,
  mapPromptTemplate,
  mapProvider,
  mapRequestLog,
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
import type {
  AgentDefinition,
  AppSnapshot,
  AuditLog,
  CancelMessageInput,
  ChatResponse,
  CompareModelsInput,
  CompareModelsResponse,
  Conversation,
  ConversationExport,
  DashboardSummary,
  ExportConversationInput,
  GatewayApiKey,
  GatewayKeyCreated,
  GatewayLog,
  GatewayStatus,
  ImportExportResult,
  KnowledgeFile,
  McpServer,
  Message,
  MessageAttachment,
  MessageAttachmentInput,
  MessageChunk,
  Model,
  ModelInput,
  PromptTemplate,
  Provider,
  ProviderInput,
  RegenerateMessageInput,
  RequestLog,
  RetryMessageInput,
  RouteDecision,
  SendMessageInput,
  UiPreferences,
  UsageRecord,
  Workspace,
} from '../../shared/types.js';
import {
  ProviderRuntimeError,
  getProviderRequestSummary,
  invokeOpenAiCompatibleChat,
  testOpenAiCompatibleProvider,
  type ChatMessageInput,
} from './openAiCompatibleAdapter.js';

const DEFAULT_WORKSPACE_ID = 'ws_default';
const DEFAULT_PREFS_ID = 'ui_default';
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);

export class NexaStore {
  private readonly db: DatabaseSync;
  private gatewayEnabled = false;
  private gatewayRecentError: string | null = null;

  constructor() {
    this.db = getDatabase().db;
    this.seed();
  }

  getDatabasePath(): string {
    return getDatabase().path;
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
      gatewayKeys: this.getGatewayKeys(),
      knowledgeFiles: this.getKnowledgeFiles(),
      mcpServers: this.getMcpServers(),
      agents: this.getAgents(),
      importExportResults: this.getImportExportResults(),
      auditLogs: this.getAuditLogs(),
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
      .prepare('SELECT * FROM providers ORDER BY updated_at DESC')
      .all()
      .map((row) => mapProvider(row as Record<string, unknown>));
  }

  getModels(): Model[] {
    return this.db
      .prepare('SELECT * FROM models ORDER BY updated_at DESC')
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
      running: this.gatewayEnabled,
      port: 8787,
      bindHost: '127.0.0.1',
      endpoints: ['/v1/models', '/v1/chat/completions', '/v1/embeddings', '/v1/responses (reserved)'],
      recentError: this.gatewayRecentError,
    };
  }

  setGatewayRuntime(enabled: boolean, recentError: string | null = null): GatewayStatus {
    this.gatewayEnabled = enabled;
    this.gatewayRecentError = recentError;
    return this.getGatewayStatus();
  }

  getKnowledgeFiles(): KnowledgeFile[] {
    return this.db
      .prepare('SELECT * FROM files ORDER BY updated_at DESC')
      .all()
      .map((row) => mapKnowledgeFile(row as Record<string, unknown>));
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

  getImportExportResults(): ImportExportResult[] {
    return this.db
      .prepare('SELECT * FROM config_snapshots ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapImportExportResult(row as Record<string, unknown>));
  }

  getAuditLogs(): AuditLog[] {
    return this.db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapAuditLog(row as Record<string, unknown>));
  }

  getUiPreferences(): UiPreferences {
    const row = this.db.prepare('SELECT * FROM ui_preferences WHERE id = ?').get(DEFAULT_PREFS_ID);
    if (!row) {
      return { theme: 'system', density: 'comfortable', fontMode: 'system', language: 'zh-CN', reducedMotion: false };
    }
    return mapUiPreferences(row as Record<string, unknown>);
  }

  createProvider(input: ProviderInput): Provider {
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

  createModel(input: ModelInput): Model {
    const provider = this.requireProvider(input.providerId);
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
    return this.requireProvider(providerId);
  }

  createConversation(title = t('chat.seed.newConversation')): Conversation {
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
    const requestLog = this.requireRequestLog(input.requestLogId);
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
    const context = this.buildConversationContext(conversation.id, contextStrategy, trimmedContent, modelForContext.contextWindow);
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
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'started', '/v1/chat/completions', ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?)`,
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
          message: trimmedContent,
          contextStrategy,
          routeReason: routeDecision.reason,
          contextMessageIds: context.contextMessageIds,
          contextTrimReason: context.trimReason,
          attachments: attachmentSummary.summary,
          action: input.metadata?.action ?? 'send',
        }),
        inputTokens,
        timestamp,
        timestamp,
      );

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
      };
      this.db
        .prepare('UPDATE request_logs SET request_summary_json = ? WHERE id = ?')
        .run(JSON.stringify({
          ...getProviderRequestSummary(providerInput),
          contextStrategy,
          routeReason: routeDecision.reason,
          contextMessageIds: context.contextMessageIds,
          contextTrimReason: context.trimReason,
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
        citations: this.getLightweightCitations(trimmedContent),
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
          `INSERT INTO messages (id, conversation_id, workspace_id, parent_message_id, role, content, provider_id, model_id, model_name_snapshot, request_id, request_log_id, input_tokens, output_tokens, latency_ms, finish_reason, error_message, status, content_format, context_strategy, context_message_ids_json, summary_id, artifact_ids_json, error_code, metadata_json, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, 'assistant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'completed', 'markdown', ?, ?, NULL, NULL, NULL, ?, ?, ?, NULL)`,
        )
        .run(
          assistantMessageId,
          conversation.id,
          conversation.workspaceId,
          userMessageId,
          assistantContent,
          routeDecision.providerId,
          routeDecision.modelId,
          routeDecision.modelNameSnapshot,
          requestId,
          requestLogId,
          result.inputTokens ?? inputTokens,
          outputTokens,
          result.latencyMs,
          result.finishReason ?? 'stop',
          contextStrategy,
          JSON.stringify(context.contextMessageIds),
          JSON.stringify(metadata),
          now(),
          now(),
        );
      this.insertMessageChunks({
        messageId: assistantMessageId,
        conversationId: conversation.id,
        requestLogId,
        chunks: result.chunks.length > 0 ? result.chunks : [assistantContent],
        status: 'completed',
      });

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
        .prepare('UPDATE conversations SET title = ?, last_message_at = ?, message_count = message_count + 2, updated_at = ? WHERE id = ?')
        .run(inferTitle(conversation.title, trimmedContent), now(), now(), conversation.id);
      this.audit('chat.completed', 'conversation', conversation.id, {
        requestLogId,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        streamed: result.streamed,
        retryCount: result.retryCount,
      });
    } catch (error) {
      const normalized = this.normalizeProviderError(error);
      this.db
        .prepare(
          `INSERT INTO messages (id, conversation_id, workspace_id, parent_message_id, role, content, provider_id, model_id, model_name_snapshot, request_id, request_log_id, input_tokens, output_tokens, latency_ms, finish_reason, error_message, status, content_format, context_strategy, context_message_ids_json, summary_id, artifact_ids_json, error_code, metadata_json, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, 'assistant', ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, 'failed', 'markdown', ?, ?, NULL, NULL, ?, ?, ?, ?, NULL)`,
        )
        .run(
          assistantMessageId,
          conversation.id,
          conversation.workspaceId,
          userMessageId,
          t('chat.assistant.upstreamFailed'),
          routeDecision.providerId,
          routeDecision.modelId,
          routeDecision.modelNameSnapshot,
          requestId,
          requestLogId,
          inputTokens,
          Math.max(1, now() - timestamp),
          normalized.message,
          contextStrategy,
          JSON.stringify(context.contextMessageIds),
          normalized.code,
          JSON.stringify({
            adapter: getProviderAdapterName(this.requireProvider(routeDecision.providerId).type),
            routeReason: routeDecision.reason,
            fallbackUsed: routeDecision.fallbackUsed,
            retryable: normalized.retryable,
            contextMessageIds: context.contextMessageIds,
            action: input.metadata?.action ?? 'send',
            ...(input.metadata ?? {}),
          }),
          now(),
          now(),
        );
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
           SET status = 'failed', response_summary_json = ?, latency_ms = ?, error_code = ?, error_message = ?, completed_at = ?, message_id = ?
           WHERE id = ?`,
        )
        .run(
          JSON.stringify({ errorCode: normalized.code, retryable: normalized.retryable }),
          Math.max(1, now() - timestamp),
          normalized.code,
          normalized.message,
          now(),
          assistantMessageId,
          requestLogId,
        );
      this.db
        .prepare('UPDATE conversations SET title = ?, last_message_at = ?, message_count = message_count + 2, updated_at = ? WHERE id = ?')
        .run(inferTitle(conversation.title, trimmedContent), now(), now(), conversation.id);
      this.audit('chat.failed', 'conversation', conversation.id, {
        requestLogId,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        errorCode: normalized.code,
      });
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

  createGatewayKey(name: string): GatewayKeyCreated {
    const key = `nxk_${randomBytes(24).toString('hex')}`;
    const secretRef = this.saveSecret(`${name} gateway key`, key);
    const timestamp = now();
    const id = createId('gkey');
    this.db
      .prepare(
        `INSERT INTO gateway_api_keys (id, name, secret_ref, key_preview, scopes_json, quota_limit, quota_used, expires_at, revoked_at, last_used_at, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, 0, NULL, NULL, NULL, ?)`,
      )
      .run(id, name.trim() || 'Local integration key', secretRef, previewSecret(key), JSON.stringify(['models:read', 'chat:write', 'embeddings:write']), timestamp);
    this.audit('gateway.key.created', 'gateway_api_key', id, { name });
    return { key, record: this.requireGatewayKey(id) };
  }

  revokeGatewayKey(gatewayKeyId: string): GatewayApiKey {
    const key = this.requireGatewayKey(gatewayKeyId);
    const timestamp = now();
    this.db
      .prepare('UPDATE gateway_api_keys SET revoked_at = ? WHERE id = ?')
      .run(key.revokedAt ?? timestamp, gatewayKeyId);
    this.audit('gateway.key.revoked', 'gateway_api_key', gatewayKeyId, { keyPreview: key.keyPreview });
    return this.requireGatewayKey(gatewayKeyId);
  }

  toggleGateway(enabled: boolean): GatewayStatus {
    this.gatewayEnabled = enabled;
    this.audit(enabled ? 'gateway.enabled' : 'gateway.disabled', 'gateway', null, { bindHost: '127.0.0.1', port: 8787 });
    return this.getGatewayStatus();
  }

  validateGatewayKey(rawKey: string, scope: 'models:read' | 'chat:write' | 'embeddings:write'): GatewayApiKey | null {
    const rows = this.db
      .prepare(
        `SELECT gateway_api_keys.*, secrets.encrypted_value
         FROM gateway_api_keys
         JOIN secrets ON secrets.id = gateway_api_keys.secret_ref
         WHERE gateway_api_keys.revoked_at IS NULL`,
      )
      .all() as Array<Record<string, unknown> & { encrypted_value: string }>;

    for (const row of rows) {
      const decoded = decodeSecretValue(String(row.encrypted_value));
      if (decoded !== rawKey) {
        continue;
      }
      const record = mapGatewayKey(row);
      const nowValue = now();
      if (record.expiresAt && record.expiresAt < nowValue) {
        return null;
      }
      if (!record.scopes.includes(scope)) {
        return null;
      }
      if (record.quotaLimit !== null && record.quotaUsed >= record.quotaLimit) {
        return null;
      }
      this.db
        .prepare('UPDATE gateway_api_keys SET quota_used = quota_used + 1, last_used_at = ? WHERE id = ?')
        .run(nowValue, record.id);
      return this.requireGatewayKey(record.id);
    }
    return null;
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

  recordGatewayLog(method: string, path: string, statusCode: number, requestLogId: string | null, headers: Record<string, string>): void {
    this.db
      .prepare(
        `INSERT INTO gateway_logs (id, request_log_id, method, path, status_code, redacted_headers_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(createId('gwlog'), requestLogId, method, path, statusCode, JSON.stringify(redactHeaders(headers)), now());
  }

  saveUiPreferences(preferences: UiPreferences): UiPreferences {
    const timestamp = now();
    const normalizedPreferences: UiPreferences = {
      ...preferences,
      theme: normalizeThemeMode(preferences.theme),
    };
    this.db
      .prepare(
        `INSERT INTO ui_preferences (id, theme, density, font_mode, language, reduced_motion, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET theme = excluded.theme, density = excluded.density, font_mode = excluded.font_mode, language = excluded.language, reduced_motion = excluded.reduced_motion, updated_at = excluded.updated_at`,
      )
      .run(
        DEFAULT_PREFS_ID,
        normalizedPreferences.theme,
        normalizedPreferences.density,
        normalizedPreferences.fontMode,
        normalizedPreferences.language,
        normalizedPreferences.reducedMotion ? 1 : 0,
        timestamp,
      );
    this.audit('ui.preferences.updated', 'ui_preferences', DEFAULT_PREFS_ID, normalizedPreferences);
    return this.getUiPreferences();
  }

  createKnowledgeFile(name: string, type: string, size: number): KnowledgeFile {
    const timestamp = now();
    const id = createId('file');
    const textLike = /text|markdown|json|csv|code|txt|md/i.test(`${name} ${type}`);
    const status = textLike ? 'indexed' : 'failed';
    const chunkCount = textLike ? 3 : 0;
    const errorMessage = textLike ? null : t('knowledge.errors.unsupportedParser');
    this.db
      .prepare(
        `INSERT INTO files (id, name, type, size, parse_status, chunk_count, error_message, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, name.trim(), type.trim() || 'text/plain', size, status, chunkCount, errorMessage, timestamp, timestamp);
    if (textLike) {
      for (let index = 0; index < chunkCount; index += 1) {
        this.db
          .prepare(
            'INSERT INTO knowledge_chunks (id, file_id, knowledge_base_id, content, citation, position, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)',
          )
          .run(
            createId('chunk'),
            id,
            t('knowledge.chunkContent', { name, index: index + 1 }),
            `${name}#chunk-${index + 1}`,
            index,
            timestamp,
          );
      }
    }
    this.audit('knowledge.file.created', 'file', id, { name, status, errorMessage });
    return this.requireKnowledgeFile(id);
  }

  retryKnowledgeFile(fileId: string): KnowledgeFile {
    const file = this.requireKnowledgeFile(fileId);
    const timestamp = now();
    const textLike = /text|markdown|json|csv|code|txt|md/i.test(`${file.name} ${file.type}`);
    if (!textLike) {
      this.db
        .prepare('UPDATE files SET parse_status = ?, error_message = ?, updated_at = ? WHERE id = ?')
        .run('failed', t('knowledge.errors.retryRejected'), timestamp, fileId);
      this.audit('knowledge.file.retry.failed', 'file', fileId, { reason: 'unsupported file type' });
      return this.requireKnowledgeFile(fileId);
    }
    this.db
      .prepare('UPDATE files SET parse_status = ?, chunk_count = ?, error_message = NULL, updated_at = ? WHERE id = ?')
      .run('indexed', Math.max(file.chunkCount, 3), timestamp, fileId);
    this.audit('knowledge.file.retry.completed', 'file', fileId, { chunkCount: Math.max(file.chunkCount, 3) });
    return this.requireKnowledgeFile(fileId);
  }

  createMcpServer(name: string, transport: McpServer['transport'], commandOrUrl: string): McpServer {
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
    const timestamp = now();
    const enabled = permissionState === 'granted' ? 1 : 0;
    this.db
      .prepare('UPDATE mcp_servers SET permission_state = ?, enabled = ?, last_status = ?, updated_at = ? WHERE id = ?')
      .run(permissionState, enabled, permissionState === 'granted' ? 'healthy' : 'unknown', timestamp, serverId);
    this.audit('mcp.permission.updated', 'mcp_server', serverId, { permissionState, enabled: Boolean(enabled) });
    return this.requireMcpServer(serverId);
  }

  createAgent(name: string, goal: string): AgentDefinition {
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

  previewAgentRun(agentId: string): ImportExportResult {
    const agent = this.requireAgent(agentId);
    const timestamp = now();
    const id = createId('dryrun');
    const manifest = {
      agentId,
      agentName: agent.name,
      mode: 'dry-run',
      requiresConfirmation: false,
      steps: [t('tools.agent.dryRun.step.read'), t('tools.agent.dryRun.step.check'), t('tools.agent.dryRun.step.suggest')],
    };
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'cleanup-preview', 'ready', ?, 1, ?, ?)`,
      )
      .run(id, t('tools.agent.dryRun.summary', { agent: agent.name }), JSON.stringify(manifest), timestamp);
    this.audit('agent.dry_run.previewed', 'agent', agentId, manifest);
    return this.requireImportExportResult(id);
  }

  validateImportManifest(manifestText: string): ImportExportResult {
    const timestamp = now();
    const id = createId('import');
    let status: ImportExportResult['status'] = 'ready';
    let summary = t('data.import.summary.ready');
    let manifest: Record<string, unknown> = {
      requiresConfirmation: true,
      conflictCount: 0,
      redaction: 'secrets must be supplied interactively and are not imported from plain text',
    };

    try {
      const parsed = JSON.parse(manifestText) as Record<string, unknown>;
      const providers = parsed.providers;
      const models = parsed.models;
      const hasValidList =
        (Array.isArray(providers) && providers.length > 0) ||
        (Array.isArray(models) && models.length > 0) ||
        typeof parsed.workspace === 'object';
      if (!hasValidList) {
        throw new Error(t('data.import.errors.requiredList'));
      }
      const conflictCount = Array.isArray(providers)
        ? providers.filter((provider) =>
            this.getProviders().some((existing) => existing.name === String((provider as { name?: unknown }).name ?? '')),
          ).length
        : 0;
      manifest = {
        ...manifest,
        providerCount: Array.isArray(providers) ? providers.length : 0,
        modelCount: Array.isArray(models) ? models.length : 0,
        conflictCount,
        keys: 'stripped',
      };
      if (conflictCount > 0) {
        summary = t('data.import.summary.conflict', { count: conflictCount });
      }
    } catch (error) {
      status = 'failed';
      summary = t('data.import.summary.rejected', { reason: error instanceof Error ? error.message : String(error) });
      manifest = {
        requiresConfirmation: false,
        conflictCount: 0,
        error: summary,
      };
    }

    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'import', ?, ?, 1, ?, ?)`,
      )
      .run(id, status, summary, JSON.stringify(manifest), timestamp);
    this.audit('import.manifest.validated', 'config_snapshot', id, { status, summary });
    return this.requireImportExportResult(id);
  }

  applyImportPlan(resultId: string): ImportExportResult {
    const result = this.requireImportExportResult(resultId);
    if (result.action !== 'import' || result.status !== 'ready') {
      throw new Error(t('data.import.errors.readyOnly'));
    }
    const timestamp = now();
    this.db
      .prepare('UPDATE config_snapshots SET status = ?, summary = ?, created_at = ? WHERE id = ?')
      .run('completed', t('data.import.summary.applied'), timestamp, resultId);
    this.audit('import.plan.applied', 'config_snapshot', resultId, { mode: 'confirmed preview only' });
    return this.requireImportExportResult(resultId);
  }

  restoreSnapshot(snapshotId: string): ImportExportResult {
    const snapshot = this.requireImportExportResult(snapshotId);
    const timestamp = now();
    const id = createId('restore');
    const manifest = {
      sourceSnapshotId: snapshot.id,
      requiresConfirmation: true,
      conflictCount: 0,
      mode: 'preview-only',
    };
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'cleanup-preview', 'ready', ?, 1, ?, ?)`,
      )
      .run(id, t('data.snapshot.summary.restore'), JSON.stringify(manifest), timestamp);
    this.audit('snapshot.restore.previewed', 'config_snapshot', snapshotId, manifest);
    return this.requireImportExportResult(id);
  }

  createSnapshot(): ImportExportResult {
    const timestamp = now();
    const id = createId('snapshot');
    const manifest = {
      providers: this.getProviders().length,
      models: this.getModels().length,
      conversations: this.getConversations().length,
      redaction: 'secrets excluded by default',
    };
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'snapshot', 'completed', ?, 1, ?, ?)`,
      )
      .run(id, t('data.snapshot.summary.created'), JSON.stringify(manifest), timestamp);
    this.audit('snapshot.created', 'config_snapshot', id, manifest);
    return this.requireImportExportResult(id);
  }

  exportDiagnostics(): ImportExportResult {
    const timestamp = now();
    const id = createId('export');
    const diagnostics = {
      requestLogs: this.getRequestLogs().length,
      auditLogs: this.getAuditLogs().length,
      databasePath: '[REDACTED_LOCAL_PATH]',
      redaction: 'Authorization, API keys, custom sensitive headers and local paths are redacted.',
      diagnoses: diagnoses.map((item) => item.code),
    };
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'export', 'completed', ?, 1, ?, ?)`,
      )
      .run(id, t('data.diagnostics.summary.created'), JSON.stringify(diagnostics), timestamp);
    this.audit('diagnostics.exported', 'diagnostics', id, diagnostics);
    return this.requireImportExportResult(id);
  }

  private seed(): void {
    const timestamp = now();
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
      this.createKnowledgeFile('NexaChat getting-started.md', 'text/markdown', 2048);
    }

    const mcpCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM mcp_servers').get() as { count: number }).count);
    if (mcpCount === 0) {
      this.createMcpServer(t('tools.mcp.seedLocalFile'), 'stdio', 'npx @modelcontextprotocol/server-filesystem');
    }

    const agentCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM agents').get() as { count: number }).count);
    if (agentCount === 0) {
      this.createAgent(t('tools.agent.seedConfigName'), t('tools.agent.seedConfigGoal'));
    }

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
      });
    }

    const keyCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM gateway_api_keys').get() as { count: number }).count);
    if (keyCount === 0) {
      this.createGatewayKey('Local app integration');
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
        const fallback = models[0];
        return {
          providerId: fallback.providerId,
          modelId: fallback.id,
          modelNameSnapshot: fallback.modelNameSnapshot,
          reason: t('chat.route.explicitUnavailable'),
          fallbackUsed: true,
        };
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

  private getLightweightCitations(content: string): Array<{ fileId: string; citation: string; snippet: string }> {
    const firstChunk = this.db
      .prepare('SELECT knowledge_chunks.file_id, knowledge_chunks.citation, knowledge_chunks.content FROM knowledge_chunks ORDER BY created_at DESC LIMIT 1')
      .get() as { file_id: string; citation: string; content: string } | undefined;
    if (!firstChunk || content.length < 2) {
      return [];
    }
    return [{ fileId: firstChunk.file_id, citation: firstChunk.citation, snippet: firstChunk.content.slice(0, 120) }];
  }

  private buildConversationContext(
    conversationId: string,
    strategy: SendMessageInput['contextStrategy'],
    content: string,
    modelContextWindow: number,
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
    const providerMessages: ChatMessageInput[] = [
      ...(prompt ? [{ role: 'system' as const, content: prompt.content }] : []),
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

  private audit(action: string, targetType: string, targetId: string | null, details: unknown): void {
    this.db
      .prepare('INSERT INTO audit_logs (id, action, actor, target_type, target_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(createId('audit'), action, 'local-user', targetType, targetId, redactSensitive(details), now());
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

  private requireGatewayKey(id: string): GatewayApiKey {
    const row = this.db.prepare('SELECT * FROM gateway_api_keys WHERE id = ?').get(id);
    if (!row) throw new Error(`Gateway key not found: ${id}`);
    return mapGatewayKey(row as Record<string, unknown>);
  }

  private requireKnowledgeFile(id: string): KnowledgeFile {
    const row = this.db.prepare('SELECT * FROM files WHERE id = ?').get(id);
    if (!row) throw new Error(`Knowledge file not found: ${id}`);
    return mapKnowledgeFile(row as Record<string, unknown>);
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

export const store = new NexaStore();
