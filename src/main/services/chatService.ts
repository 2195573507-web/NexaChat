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

export function ChatService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ChatService extends Base {
  getConversations(): Conversation[] {
    return this.repositories.chat.listConversations();
  }


  getMessages(conversationId?: string): Message[] {
    return this.repositories.chat.listMessages(conversationId);
  }


  getMessageChunks(messageId?: string): MessageChunk[] {
    return this.repositories.chat.listMessageChunks(messageId);
  }


  getMessageAttachments(conversationId?: string): MessageAttachment[] {
    return this.repositories.chat.listMessageAttachments(conversationId);
  }


  getPromptTemplates(): PromptTemplate[] {
    return this.repositories.chat.listPromptTemplates();
  }


  getConversationExports(conversationId?: string): ConversationExport[] {
    return this.repositories.chat.listConversationExports(conversationId);
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
    const requestLogId = input.clientRequestId?.trim() || createId('req');
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
