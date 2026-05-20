import { redactSensitive } from '../security/redaction.js';
import { createId, estimateTokens, now } from '../utils/ids.js';
import { translate } from '../../shared/i18n.js';
import { PROVIDER_RUNTIME_ERROR_CODES, getProviderAdapterName } from '../../shared/providerRuntime.js';
import { isConversationExportFormat } from '../../shared/conversationRuntime.js';
import { SECURITY_ACTION_PERMISSIONS } from '../../shared/securityRuntime.js';
import type {
  CancelMessageInput,
  ChatResponse,
  CompareModelsInput,
  CompareModelsResponse,
  Conversation,
  ConversationExport,
  ConversationPageInput,
  ExportConversationInput,
  Message,
  MessagePageInput,
  MessageAttachment,
  MessageChunk,
  PageResult,
  PromptTemplate,
  RegenerateMessageInput,
  RetryMessageInput,
  SendMessageInput
} from '../../shared/types.js';
import type { ChatStreamEventPayload } from '../../shared/ipc.js';
import { ProviderRuntimeError } from '../adapters/openAiCompatibleAdapter.js';
import { getProviderAdapter } from '../adapters/providerAdapterRegistry.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);

type ChatEventEmitter = (payload: Omit<ChatStreamEventPayload, 'requestId'>) => void;



export function ChatService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ChatService extends Base {
  getConversations(): Conversation[] {
    return this.repositories.chat.listConversations();
  }

  listConversations(input: ConversationPageInput = {}): PageResult<Conversation> {
    return this.repositories.chat.pageConversations(input);
  }


  getMessages(conversationId?: string): Message[] {
    return this.repositories.chat.listMessages(conversationId);
  }

  listMessages(input: MessagePageInput): PageResult<Message> {
    return this.repositories.chat.pageMessages(input);
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
    const failures: Array<{ modelId: string; error: string }> = [];
    const queue = [...uniqueModelIds];
    const runNext = async () => {
      const modelId = queue.shift();
      if (!modelId) {
        return;
      }
      try {
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
      } catch (error) {
        failures.push({ modelId, error: error instanceof Error ? error.message : String(error) });
      }
      await runNext();
    };
    await Promise.all(Array.from({ length: Math.min(2, queue.length) }, () => runNext()));
    if (responses.length === 0) {
      throw new Error(failures[0]?.error ?? t('chat.errors.compareNeedsModels'));
    }
    this.audit('chat.compare.completed', 'conversation', conversation.id, {
      modelIds: uniqueModelIds,
      requestLogIds: responses.map((response) => response.requestLog.id),
      failures,
    });
    return { conversation: this.requireConversation(conversation.id), responses, failures };
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


  async sendMessage(input: SendMessageInput, options: { onEvent?: ChatEventEmitter } = {}): Promise<ChatResponse> {
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
    const requestType = input.metadata?.gatewayEndpoint === '/v1/responses'
      ? 'gateway_responses'
      : input.metadata?.gatewayEndpoint === '/v1/chat/completions'
        ? 'gateway_chat'
        : 'chat';
    const requestEndpoint = input.metadata?.gatewayEndpoint === '/v1/responses' ? '/v1/responses' : '/v1/chat/completions';
    const emit = options.onEvent ?? (() => {});
    const modelForContext = this.requireModel(routeDecision.modelId);
    emit({
      type: 'chat.stream.retrieving',
      phase: 'retrieving',
      timestamp,
      clientRequestId: input.clientRequestId,
      conversationId: conversation.id,
      message: t('chat.generation.retrieving'),
      progress: 0.05,
    });
    const retrieval = await this.retrieveKnowledge(trimmedContent, { persistCitations: false });
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
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'streaming', ?, ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?)`,
      )
      .run(
        requestLogId,
        conversation.id,
        assistantMessageId,
        routeDecision.providerId,
        routeDecision.modelId,
        routeDecision.modelNameSnapshot,
        requestId,
        requestEndpoint,
        JSON.stringify({
          ...this.buildChatRequestSummary(trimmedContent),
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
    emit({
      type: 'chat.stream.started',
      phase: 'started',
      timestamp,
      clientRequestId: input.clientRequestId,
      conversationId: conversation.id,
      userMessageId,
      assistantMessageId,
      message: t('chat.generation.sending'),
      progress: 0,
    });
    this.db
      .prepare('UPDATE conversations SET title = ?, last_message_at = ?, message_count = message_count + 2, updated_at = ? WHERE id = ?')
      .run(this.inferConversationTitle(conversation.title, trimmedContent), timestamp, timestamp, conversation.id);
    const abortController = new AbortController();
    this.activeChatControllers.set(requestLogId, abortController);

    try {
      const provider = this.requireProvider(routeDecision.providerId);
      const model = modelForContext;
      const adapter = getProviderAdapter(provider.type);
      const adapterName = adapter?.name ?? getProviderAdapterName(provider.type);
      if (!adapter) {
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
        onChunk: (chunk: string) => {
          emit({
            type: 'chat.stream.chunk',
            phase: 'streaming',
            timestamp: now(),
            clientRequestId: input.clientRequestId,
            conversationId: conversation.id,
            userMessageId,
            assistantMessageId,
            chunk,
            progress: undefined,
          });
        },
        onProgress: () => {
          emit({
            type: 'chat.stream.progress',
            phase: 'streaming',
            timestamp: now(),
            clientRequestId: input.clientRequestId,
            conversationId: conversation.id,
            userMessageId,
            assistantMessageId,
            message: t('chat.generation.generating'),
          });
        },
      };
      this.db
        .prepare('UPDATE request_logs SET request_summary_json = ? WHERE id = ?')
        .run(JSON.stringify({
          ...adapter.getRequestSummary(providerInput),
          ...this.buildChatRequestSummary(trimmedContent),
          contextStrategy,
          routeReason: routeDecision.reason,
          contextMessageIds: context.contextMessageIds,
          contextTrimReason: context.trimReason,
          knowledgeRetrievalId: retrieval.trace.id,
          knowledgeCitationCount: retrieval.citations.length,
          action: input.metadata?.action ?? 'send',
        }), requestLogId);
      const result = await adapter.invokeChat(providerInput);
      const activeRequest = this.requireRequestLog(requestLogId);
      const activeAssistant = this.requireMessage(assistantMessageId);
      if (activeRequest.status === 'cancelled' || activeAssistant.status === 'cancelled') {
        throw new ProviderRuntimeError(t('chat.cancelled.message'), PROVIDER_RUNTIME_ERROR_CODES.cancelled);
      }
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

      this.recordUsage({
        workspaceId: conversation.workspaceId,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        requestLogId,
        requestType,
        inputTokens: result.inputTokens ?? inputTokens,
        outputTokens,
        totalTokens: result.totalTokens ?? (result.inputTokens ?? inputTokens) + outputTokens,
        tokenUsageEstimated: result.inputTokens === null || result.outputTokens === null || result.totalTokens === null,
        latencyMs: result.latencyMs,
        status: 'completed',
        errorCode: null,
        costEstimate: this.estimateCost(routeDecision.modelId, result.inputTokens ?? inputTokens, outputTokens),
      });

      this.db
        .prepare('UPDATE conversations SET title = ?, last_message_at = ?, updated_at = ? WHERE id = ?')
        .run(this.inferConversationTitle(conversation.title, trimmedContent), now(), now(), conversation.id);
      this.audit('chat.completed', 'conversation', conversation.id, {
        requestLogId,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        streamed: result.streamed,
        retryCount: result.retryCount,
      });
      this.recordProviderHealth(routeDecision.providerId, routeDecision.modelId, 'healthy', result.latencyMs, 'chat', null, null);
      const completedResponse: ChatResponse = {
        conversation: this.requireConversation(conversation.id),
        userMessage: this.requireMessage(userMessageId),
        assistantMessage: this.requireMessage(assistantMessageId),
        requestLog: this.requireRequestLog(requestLogId),
        routeDecision,
        chunks: this.getMessageChunks(assistantMessageId),
      };
      emit({
        type: 'chat.stream.completed',
        phase: 'completed',
        timestamp: now(),
        clientRequestId: input.clientRequestId,
        conversationId: conversation.id,
        userMessageId,
        assistantMessageId,
        message: t('chat.generation.completed'),
        progress: 1,
        response: completedResponse,
      });
    } catch (error) {
      const normalized = this.normalizeProviderError(error);
      const failedStatus = normalized.code === PROVIDER_RUNTIME_ERROR_CODES.cancelled ? 'cancelled' : 'failed';
      const latencyMs = Math.max(1, now() - timestamp);
      const currentRequest = this.requireRequestLog(requestLogId);
      const currentAssistant = this.requireMessage(assistantMessageId);
      const alreadyCancelled = currentRequest.status === 'cancelled' || currentAssistant.status === 'cancelled';
      this.db
        .prepare(
          `UPDATE messages
           SET content = ?, input_tokens = ?, latency_ms = ?, error_message = ?, status = ?, error_code = ?, metadata_json = ?, updated_at = ?
           WHERE id = ? AND status IN ('draft', 'streaming')`,
        )
        .run(
          normalized.code === PROVIDER_RUNTIME_ERROR_CODES.cancelled ? t('chat.cancelled.message') : t('chat.assistant.upstreamFailed'),
          inputTokens,
          latencyMs,
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
      if (!alreadyCancelled) {
        this.insertMessageChunks({
          messageId: assistantMessageId,
          conversationId: conversation.id,
          requestLogId,
          chunks: [normalized.message],
          status: failedStatus,
          chunkType: 'error',
        });
      }
      this.db
        .prepare(
          `UPDATE request_logs
           SET status = ?, response_summary_json = ?, latency_ms = ?, error_code = ?, error_message = ?, completed_at = ?, message_id = ?
           WHERE id = ? AND status IN ('started', 'streaming')`,
        )
        .run(
          failedStatus,
          JSON.stringify({ errorCode: normalized.code, retryable: normalized.retryable }),
          latencyMs,
          normalized.code,
          normalized.message,
          now(),
          assistantMessageId,
          requestLogId,
        );
      this.db
        .prepare('UPDATE conversations SET title = ?, last_message_at = ?, updated_at = ? WHERE id = ?')
        .run(this.inferConversationTitle(conversation.title, trimmedContent), now(), now(), conversation.id);
      this.audit('chat.failed', 'conversation', conversation.id, {
        requestLogId,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        errorCode: normalized.code,
      });
      this.recordUsage({
        workspaceId: conversation.workspaceId,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        requestLogId,
        requestType,
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        tokenUsageEstimated: true,
        latencyMs,
        status: failedStatus,
        errorCode: normalized.code,
        costEstimate: 0,
      });
      this.recordProviderHealth(routeDecision.providerId, routeDecision.modelId, 'error', latencyMs, 'chat', normalized.code, normalized.message);
      emit({
        type: normalized.code === PROVIDER_RUNTIME_ERROR_CODES.cancelled ? 'chat.stream.canceled' : 'chat.stream.failed',
        phase: normalized.code === PROVIDER_RUNTIME_ERROR_CODES.cancelled ? 'canceled' : 'failed',
        timestamp: now(),
        clientRequestId: input.clientRequestId,
        conversationId: conversation.id,
        userMessageId,
        assistantMessageId,
        message: normalized.code === PROVIDER_RUNTIME_ERROR_CODES.cancelled ? t('chat.generation.canceled') : t('chat.generation.failed'),
        error: normalized.message,
        progress: 1,
      });
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
