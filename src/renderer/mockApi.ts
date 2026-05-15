import type {
  AgentDefinition,
  AppSnapshot,
  AuditLog,
  ChatResponse,
  ContextStrategy,
  Conversation,
  GatewayApiKey,
  GatewayKeyCreated,
  GatewayLog,
  GatewayStatus,
  HealthStatus,
  ImportExportResult,
  KnowledgeFile,
  McpServer,
  Message,
  Model,
  ModelInput,
  Provider,
  ProviderInput,
  RequestLog,
  RouteDecision,
  SendMessageInput,
  UiPreferences,
  UsageRecord,
  Workspace,
} from '../shared/types';
import type { AppApi } from '../shared/api';
import { translate } from '../shared/i18n';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);

interface MockState {
  workspace: Workspace;
  providers: Provider[];
  models: Model[];
  conversations: Conversation[];
  messages: Message[];
  requestLogs: RequestLog[];
  gatewayLogs: GatewayLog[];
  usageRecords: UsageRecord[];
  gatewayStatus: GatewayStatus;
  gatewayKeys: GatewayApiKey[];
  knowledgeFiles: KnowledgeFile[];
  mcpServers: McpServer[];
  agents: AgentDefinition[];
  importExportResults: ImportExportResult[];
  auditLogs: AuditLog[];
  uiPreferences: UiPreferences;
}

let idCounter = 0;

function now(): number {
  return Date.now();
}

function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function findById<T extends { id: string }>(items: T[], id: string, label: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    throw new Error(`${label} not found: ${id}`);
  }
  return item;
}

function estimateTokens(content: string): number {
  return Math.max(1, Math.ceil(content.trim().length / 4));
}

function createAuditLog(action: string, targetType: string, targetId: string | null, details?: unknown): AuditLog {
  return {
    id: createId('audit'),
    action,
    actor: 'browser-mock',
    targetType,
    targetId,
    detailsJson: details === undefined ? null : JSON.stringify(details),
    createdAt: now(),
  };
}

function createSeedState(): MockState {
  const timestamp = now();
  const workspaceId = 'workspace_browser_mock';
  const providerId = 'provider_local_mock';
  const modelId = 'model_local_mock';
  const conversationId = 'conversation_welcome';
  const assistantMessageId = 'message_welcome_assistant';

  const workspace: Workspace = {
    id: workspaceId,
    name: 'NexaChat Browser Dev Workspace',
    defaultProviderId: providerId,
    defaultModelId: modelId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const providers: Provider[] = [
    {
      id: providerId,
      name: 'Local Mock Provider',
      type: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:11434/v1',
      proxyUrl: null,
      authType: 'none',
      secretRef: null,
      customHeadersJson: null,
      enabled: true,
      healthStatus: 'healthy',
      lastCheckedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const models: Model[] = [
    {
      id: modelId,
      providerId,
      name: 'nexachat-mock',
      displayName: 'NexaChat Mock',
      modelNameSnapshot: 'nexachat-mock',
      contextWindow: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: false,
      supportsEmbeddings: true,
      inputPrice: 0,
      outputPrice: 0,
      healthStatus: 'healthy',
      latencyMs: 42,
      enabled: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const conversations: Conversation[] = [
    {
      id: conversationId,
      workspaceId,
      title: 'Browser mock conversation',
      assistantId: null,
      defaultProviderId: providerId,
      defaultModelId: modelId,
      defaultRouterId: null,
      groupName: 'Development',
      isPinned: true,
      isFavorite: false,
      status: 'active',
      summary: 'Browser development and UI testing without Electron preload.',
      lastMessageAt: timestamp,
      messageCount: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const messages: Message[] = [
    {
      id: assistantMessageId,
      conversationId,
      workspaceId,
      parentMessageId: null,
      role: 'assistant',
      content: 'This is in-memory browser fallback data. You can create providers, models, conversations, and other resources for UI testing.',
      providerId,
      modelId,
      modelNameSnapshot: 'nexachat-mock',
      requestId: null,
      requestLogId: null,
      inputTokens: null,
      outputTokens: estimateTokens('This is in-memory browser fallback data.'),
      latencyMs: 0,
      finishReason: 'stop',
      errorMessage: null,
      status: 'completed',
      contentFormat: 'markdown',
      contextStrategy: 'recent_n',
      contextMessageIdsJson: null,
      summaryId: null,
      artifactIdsJson: null,
      errorCode: null,
      metadataJson: JSON.stringify({ source: 'mock-seed' }),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  return {
    workspace,
    providers,
    models,
    conversations,
    messages,
    requestLogs: [],
    gatewayLogs: [],
    usageRecords: [],
    gatewayStatus: {
      enabled: true,
      running: true,
      port: 8787,
      bindHost: '127.0.0.1',
      endpoints: ['/v1/chat/completions', '/v1/responses', '/v1/embeddings'],
      recentError: null,
    },
    gatewayKeys: [
      {
        id: 'gateway_key_browser_mock',
        name: 'Browser dev key',
        keyPreview: 'nexa_...mock',
        scopes: ['chat:write', 'models:read', 'embeddings:write'],
        quotaLimit: 1000,
        quotaUsed: 0,
        expiresAt: null,
        revokedAt: null,
        lastUsedAt: null,
        createdAt: timestamp,
      },
    ],
    knowledgeFiles: [
      {
        id: 'knowledge_browser_mock',
        name: 'getting-started.md',
        type: 'text/markdown',
        size: 2048,
        parseStatus: 'indexed',
        chunkCount: 8,
        errorMessage: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    mcpServers: [
      {
        id: 'mcp_browser_mock',
        name: 'Filesystem mock',
        transport: 'stdio',
        commandOrUrl: 'npx @modelcontextprotocol/server-filesystem .',
        enabled: true,
        permissionState: 'granted',
        lastStatus: 'healthy',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    agents: [
      {
        id: 'agent_browser_mock',
        name: 'UI Test Assistant',
        goal: 'Help validate core NexaChat interface flows in browser development mode.',
        defaultModelId: modelId,
        approvalPolicy: 'destructive-only',
        stage: 'implemented',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    importExportResults: [],
    auditLogs: [createAuditLog('mock.init', 'workspace', workspaceId, { runtime: 'browser' })],
    uiPreferences: {
      theme: 'system',
      density: 'comfortable',
      fontMode: 'system',
      language: 'zh-CN',
      reducedMotion: false,
    },
  };
}

function resolveRoute(state: MockState, input: SendMessageInput): RouteDecision {
  const requestedModel = input.modelId ? state.models.find((model) => model.id === input.modelId) : null;
  const model =
    requestedModel ??
    state.models.find((candidate) => candidate.id === state.workspace.defaultModelId && candidate.enabled) ??
    state.models.find((candidate) => candidate.enabled) ??
    state.models[0];

  if (!model) {
    throw new Error(t('models.errors.noBrowserModel'));
  }

  const requestedProvider = input.providerId ? state.providers.find((provider) => provider.id === input.providerId) : null;
  const provider =
    requestedProvider ??
    state.providers.find((candidate) => candidate.id === model.providerId && candidate.enabled) ??
    state.providers.find((candidate) => candidate.id === state.workspace.defaultProviderId && candidate.enabled) ??
    state.providers.find((candidate) => candidate.enabled) ??
    state.providers[0];

  if (!provider) {
    throw new Error(t('models.errors.noBrowserProvider'));
  }

  return {
    providerId: provider.id,
    modelId: model.id,
    modelNameSnapshot: model.name,
    reason: requestedModel || requestedProvider ? t('chat.route.browserRequested') : t('chat.route.browserDefault'),
    fallbackUsed: !requestedModel || (input.providerId ? !requestedProvider : false),
  };
}

function createMessage(input: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Message {
  const timestamp = now();
  return {
    ...input,
    id: createId('message'),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildAssistantContent(content: string, routeDecision: RouteDecision): string {
  return [
    t('chat.assistant.browserResponse', { model: routeDecision.modelNameSnapshot }),
    '',
    t('chat.assistant.browserReceived', { content }),
    '',
    t('chat.assistant.browserRuntime'),
  ].join('\n');
}

function buildSnapshot(state: MockState): AppSnapshot {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const usageToday = state.usageRecords
    .filter((record) => record.createdAt >= dayStart.getTime())
    .reduce(
      (summary, record) => ({
        requests: summary.requests + 1,
        inputTokens: summary.inputTokens + record.inputTokens,
        outputTokens: summary.outputTokens + record.outputTokens,
        costEstimate: summary.costEstimate + record.costEstimate,
      }),
      { requests: 0, inputTokens: 0, outputTokens: 0, costEstimate: 0 },
    );

  const setupGaps: string[] = [];
  if (state.providers.length === 0) {
    setupGaps.push(t('dashboard.setup.browserProviderMissing'));
  }
  if (state.models.length === 0) {
    setupGaps.push(t('dashboard.setup.browserModelMissing'));
  }
  if (!state.gatewayStatus.running) {
    setupGaps.push(t('dashboard.setup.browserGatewayDisabled'));
  }

  return {
    dashboard: {
      workspace: state.workspace,
      recentConversations: [...state.conversations]
        .filter((conversation) => conversation.status !== 'deleted')
        .sort((left, right) => (right.lastMessageAt ?? right.updatedAt) - (left.lastMessageAt ?? left.updatedAt))
        .slice(0, 5),
      providers: state.providers,
      models: state.models,
      gatewayStatus: state.gatewayStatus,
      usageToday,
      setupGaps,
    },
    conversations: state.conversations,
    messages: state.messages,
    providers: state.providers,
    models: state.models,
    requestLogs: state.requestLogs,
    gatewayLogs: state.gatewayLogs,
    usageRecords: state.usageRecords,
    gatewayKeys: state.gatewayKeys,
    knowledgeFiles: state.knowledgeFiles,
    mcpServers: state.mcpServers,
    agents: state.agents,
    importExportResults: state.importExportResults,
    auditLogs: state.auditLogs,
    uiPreferences: state.uiPreferences,
  };
}

export function createMockApi(): AppApi {
  const state = createSeedState();

  function pushAudit(action: string, targetType: string, targetId: string | null, details?: unknown): void {
    state.auditLogs.unshift(createAuditLog(action, targetType, targetId, details));
  }

  function touchWorkspace(): void {
    state.workspace.updatedAt = now();
  }

  function createResult(action: ImportExportResult['action'], summary: string, redacted: boolean, options: { failed?: boolean; conflictCount?: number } = {}): ImportExportResult {
    const timestamp = now();
    const status: ImportExportResult['status'] = options.failed ? 'failed' : action === 'import' || action === 'cleanup-preview' ? 'ready' : 'completed';
    const conflictCount = options.conflictCount ?? 0;
    const result: ImportExportResult = {
      id: createId(action.replace('-', '_')),
      action,
      status,
      summary,
      redacted,
      manifestJson: JSON.stringify({
        requiresConfirmation: status === 'ready',
        conflictCount,
        source: 'browser-mock',
      }),
      errorMessage: status === 'failed' ? summary : null,
      conflictCount,
      requiresConfirmation: status === 'ready',
      createdAt: timestamp,
    };
    state.importExportResults.unshift(result);
    pushAudit(`data.${action}`, 'importExportResult', result.id);
    return result;
  }

  const api: AppApi = {
    async getSnapshot() {
      return clone(buildSnapshot(state));
    },

    async createProvider(input: ProviderInput) {
      if (!/^https?:\/\//i.test(input.baseUrl.trim())) {
        throw new Error(t('models.errors.invalidBaseUrl'));
      }
      const timestamp = now();
      const provider: Provider = {
        id: createId('provider'),
        name: input.name.trim() || 'Untitled Provider',
        type: input.type,
        baseUrl: input.baseUrl.trim(),
        proxyUrl: input.proxyUrl?.trim() || null,
        authType: input.apiKey ? 'api-key' : 'none',
        secretRef: input.apiKey ? createId('secret') : null,
        customHeadersJson: input.customHeadersJson?.trim() || null,
        enabled: true,
        healthStatus: 'unknown',
        lastCheckedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.providers.unshift(provider);
      if (!state.workspace.defaultProviderId) {
        state.workspace.defaultProviderId = provider.id;
      }
      touchWorkspace();
      pushAudit('provider.create', 'provider', provider.id, { type: provider.type });
      return clone(provider);
    },

    async createModel(input: ModelInput) {
      findById(state.providers, input.providerId, 'Provider');

      const timestamp = now();
      const model: Model = {
        id: createId('model'),
        providerId: input.providerId,
        name: input.name.trim() || 'mock-model',
        displayName: input.displayName?.trim() || input.name.trim() || 'Mock Model',
        modelNameSnapshot: input.name.trim() || 'mock-model',
        contextWindow: input.contextWindow ?? 8192,
        supportsStreaming: input.supportsStreaming ?? true,
        supportsTools: input.supportsTools ?? false,
        supportsVision: input.supportsVision ?? false,
        supportsEmbeddings: input.supportsEmbeddings ?? false,
        inputPrice: 0,
        outputPrice: 0,
        healthStatus: 'unknown',
        latencyMs: null,
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.models.unshift(model);
      if (!state.workspace.defaultModelId) {
        state.workspace.defaultModelId = model.id;
      }
      touchWorkspace();
      pushAudit('model.create', 'model', model.id, { providerId: model.providerId });
      return clone(model);
    },

    async testProvider(providerId: string) {
      const provider = findById(state.providers, providerId, 'Provider');
      const timestamp = now();
      const status: HealthStatus = /^https?:\/\//i.test(provider.baseUrl) && provider.enabled ? 'healthy' : 'error';
      provider.healthStatus = status;
      provider.lastCheckedAt = timestamp;
      provider.updatedAt = timestamp;

      state.models
        .filter((model) => model.providerId === provider.id)
        .forEach((model) => {
          model.healthStatus = status;
          model.latencyMs = status === 'healthy' ? 35 + Math.floor(Math.random() * 65) : null;
          model.updatedAt = timestamp;
        });

      pushAudit('provider.test', 'provider', provider.id, { status });
      if (status === 'error') {
        state.requestLogs.unshift({
          id: createId('request'),
          conversationId: null,
          messageId: null,
          providerId: provider.id,
          modelId: null,
          modelNameSnapshot: null,
          routeId: null,
          gatewayRequestId: null,
          status: 'failed',
          endpoint: '/provider/test',
          requestSummaryJson: JSON.stringify({ baseUrl: provider.baseUrl }),
          responseSummaryJson: null,
          inputTokens: null,
          outputTokens: null,
          latencyMs: 1,
          finishReason: null,
          errorCode: 'invalid_base_url',
          errorMessage: t('models.errors.invalidBaseUrl'),
          startedAt: timestamp,
          completedAt: timestamp,
          createdAt: timestamp,
        });
      }
      return clone(provider);
    },

    async sendMessage(input: SendMessageInput) {
      const timestamp = now();
      const conversation =
        input.conversationId === undefined
          ? await api.createConversation(input.content.slice(0, 32) || 'New mock conversation')
          : clone(findById(state.conversations, input.conversationId, 'Conversation'));
      const storedConversation = findById(state.conversations, conversation.id, 'Conversation');
      const routeDecision = resolveRoute(state, input);
      const contextStrategy: ContextStrategy = input.contextStrategy ?? 'recent_n';
      const userInputTokens = estimateTokens(input.content);
      const assistantContent = buildAssistantContent(input.content, routeDecision);
      const assistantOutputTokens = estimateTokens(assistantContent);
      const requestLogId = createId('request');

      const previousMessage = [...state.messages]
        .reverse()
        .find((message) => message.conversationId === storedConversation.id && message.status !== 'deleted');

      const userMessage = createMessage({
        conversationId: storedConversation.id,
        workspaceId: state.workspace.id,
        parentMessageId: previousMessage?.id ?? null,
        role: 'user',
        content: input.content,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        modelNameSnapshot: routeDecision.modelNameSnapshot,
        requestId: requestLogId,
        requestLogId,
        inputTokens: userInputTokens,
        outputTokens: null,
        latencyMs: null,
        finishReason: null,
        errorMessage: null,
        status: 'completed',
        contentFormat: 'markdown',
        contextStrategy,
        contextMessageIdsJson: null,
        summaryId: null,
        artifactIdsJson: null,
        errorCode: null,
        metadataJson: JSON.stringify({ source: 'browser-mock' }),
      });

      const assistantMessage = createMessage({
        conversationId: storedConversation.id,
        workspaceId: state.workspace.id,
        parentMessageId: userMessage.id,
        role: 'assistant',
        content: assistantContent,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        modelNameSnapshot: routeDecision.modelNameSnapshot,
        requestId: requestLogId,
        requestLogId,
        inputTokens: userInputTokens,
        outputTokens: assistantOutputTokens,
        latencyMs: 90,
        finishReason: 'stop',
        errorMessage: null,
        status: 'completed',
        contentFormat: 'markdown',
        contextStrategy,
        contextMessageIdsJson: JSON.stringify([userMessage.id]),
        summaryId: null,
        artifactIdsJson: null,
        errorCode: null,
        metadataJson: JSON.stringify({ source: 'browser-mock' }),
      });

      const requestLog: RequestLog = {
        id: requestLogId,
        conversationId: storedConversation.id,
        messageId: assistantMessage.id,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        modelNameSnapshot: routeDecision.modelNameSnapshot,
        routeId: null,
        gatewayRequestId: state.gatewayStatus.running ? createId('gateway_request') : null,
        status: 'completed',
        endpoint: '/v1/chat/completions',
        requestSummaryJson: JSON.stringify({ contentLength: input.content.length, contextStrategy }),
        responseSummaryJson: JSON.stringify({ finishReason: 'stop', fallbackUsed: routeDecision.fallbackUsed }),
        inputTokens: userInputTokens,
        outputTokens: assistantOutputTokens,
        latencyMs: assistantMessage.latencyMs,
        finishReason: 'stop',
        errorCode: null,
        errorMessage: null,
        startedAt: timestamp,
        completedAt: now(),
        createdAt: timestamp,
      };

      const usageRecord: UsageRecord = {
        id: createId('usage'),
        workspaceId: state.workspace.id,
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        requestLogId,
        inputTokens: userInputTokens,
        outputTokens: assistantOutputTokens,
        costEstimate: 0,
        createdAt: now(),
      };

      state.messages.push(userMessage, assistantMessage);
      state.requestLogs.unshift(requestLog);
      state.usageRecords.unshift(usageRecord);

      storedConversation.defaultProviderId = routeDecision.providerId;
      storedConversation.defaultModelId = routeDecision.modelId;
      storedConversation.lastMessageAt = assistantMessage.createdAt;
      storedConversation.messageCount += 2;
      storedConversation.updatedAt = assistantMessage.createdAt;
      if (storedConversation.title === 'New mock conversation') {
        storedConversation.title = input.content.slice(0, 32) || storedConversation.title;
      }
      touchWorkspace();
      pushAudit('chat.sendMessage', 'conversation', storedConversation.id, { requestLogId });

      const response: ChatResponse = {
        conversation: storedConversation,
        userMessage,
        assistantMessage,
        requestLog,
        routeDecision,
      };
      return clone(response);
    },

    async createConversation(title?: string) {
      const timestamp = now();
      const conversation: Conversation = {
        id: createId('conversation'),
        workspaceId: state.workspace.id,
        title: title?.trim() || 'New mock conversation',
        assistantId: null,
        defaultProviderId: state.workspace.defaultProviderId,
        defaultModelId: state.workspace.defaultModelId,
        defaultRouterId: null,
        groupName: null,
        isPinned: false,
        isFavorite: false,
        status: 'active',
        summary: null,
        lastMessageAt: null,
        messageCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.conversations.unshift(conversation);
      touchWorkspace();
      pushAudit('chat.createConversation', 'conversation', conversation.id);
      return clone(conversation);
    },

    async updateConversationFlags(conversationId, flags) {
      const conversation = findById(state.conversations, conversationId, 'Conversation');
      if (flags.isPinned !== undefined) {
        conversation.isPinned = flags.isPinned;
      }
      if (flags.isFavorite !== undefined) {
        conversation.isFavorite = flags.isFavorite;
      }
      if (flags.status !== undefined) {
        conversation.status = flags.status;
      }
      conversation.updatedAt = now();
      pushAudit('chat.updateConversationFlags', 'conversation', conversation.id, flags);
      return clone(conversation);
    },

    async createGatewayKey(name: string) {
      const timestamp = now();
      const rawKey = `nexa_mock_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      const record: GatewayApiKey = {
        id: createId('gateway_key'),
        name: name.trim() || 'Untitled key',
        keyPreview: `${rawKey.slice(0, 8)}...${rawKey.slice(-4)}`,
        scopes: ['chat:write', 'models:read', 'embeddings:write'],
        quotaLimit: null,
        quotaUsed: 0,
        expiresAt: null,
        revokedAt: null,
        lastUsedAt: null,
        createdAt: timestamp,
      };

      state.gatewayKeys.unshift(record);
      pushAudit('gateway.createKey', 'gatewayKey', record.id);
      const created: GatewayKeyCreated = { key: rawKey, record };
      return clone(created);
    },

    async revokeGatewayKey(gatewayKeyId: string) {
      const key = findById(state.gatewayKeys, gatewayKeyId, 'Gateway key');
      key.revokedAt = key.revokedAt ?? now();
      pushAudit('gateway.revokeKey', 'gatewayKey', key.id, { keyPreview: key.keyPreview });
      return clone(key);
    },

    async toggleGateway(enabled: boolean) {
      state.gatewayStatus = {
        ...state.gatewayStatus,
        enabled,
        running: enabled,
        recentError: enabled ? null : 'Gateway stopped by browser mock user action.',
      };
      pushAudit('gateway.toggle', 'gateway', null, { enabled });
      return clone(state.gatewayStatus);
    },

    async saveUiPreferences(preferences: UiPreferences) {
      state.uiPreferences = { ...preferences };
      pushAudit('settings.saveUiPreferences', 'settings', 'uiPreferences', preferences);
      return clone(state.uiPreferences);
    },

    async createKnowledgeFile(name: string, type: string, size: number) {
      const timestamp = now();
      const textLike = /text|markdown|json|csv|code|txt|md/i.test(`${name} ${type}`);
      const file: KnowledgeFile = {
        id: createId('knowledge'),
        name: name.trim() || 'untitled.txt',
        type: type.trim() || 'text/plain',
        size: Math.max(0, Math.floor(size)),
        parseStatus: textLike ? 'indexed' : 'failed',
        chunkCount: textLike ? Math.max(1, Math.ceil(Math.max(0, size) / 1024)) : 0,
        errorMessage: textLike ? null : t('knowledge.errors.unsupportedFallback'),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.knowledgeFiles.unshift(file);
      pushAudit('knowledge.createFile', 'knowledgeFile', file.id, { type: file.type, size: file.size });
      return clone(file);
    },

    async retryKnowledgeFile(fileId: string) {
      const file = findById(state.knowledgeFiles, fileId, 'Knowledge file');
      const timestamp = now();
      const textLike = /text|markdown|json|csv|code|txt|md/i.test(`${file.name} ${file.type}`);
      if (textLike) {
        file.parseStatus = 'indexed';
        file.chunkCount = Math.max(file.chunkCount, 1);
        file.errorMessage = null;
        pushAudit('knowledge.retry.completed', 'knowledgeFile', file.id);
      } else {
        file.parseStatus = 'failed';
        file.errorMessage = t('knowledge.errors.retryRejected');
        pushAudit('knowledge.retry.failed', 'knowledgeFile', file.id);
      }
      file.updatedAt = timestamp;
      return clone(file);
    },

    async createMcpServer(name: string, transport: McpServer['transport'], commandOrUrl: string) {
      const timestamp = now();
      const server: McpServer = {
        id: createId('mcp'),
        name: name.trim() || 'Untitled MCP server',
        transport,
        commandOrUrl: commandOrUrl.trim(),
        enabled: false,
        permissionState: 'discovered',
        lastStatus: 'unknown',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.mcpServers.unshift(server);
      pushAudit('mcp.createServer', 'mcpServer', server.id, { transport });
      return clone(server);
    },

    async updateMcpPermission(serverId: string, permissionState: McpServer['permissionState']) {
      const server = findById(state.mcpServers, serverId, 'MCP server');
      server.permissionState = permissionState;
      server.enabled = permissionState === 'granted';
      server.lastStatus = permissionState === 'granted' ? 'healthy' : 'unknown';
      server.updatedAt = now();
      pushAudit('mcp.updatePermission', 'mcpServer', server.id, { permissionState });
      return clone(server);
    },

    async createAgent(name: string, goal: string) {
      const timestamp = now();
      const agent: AgentDefinition = {
        id: createId('agent'),
        name: name.trim() || 'Untitled Agent',
        goal: goal.trim() || 'Assist with NexaChat browser mock testing.',
        defaultModelId: state.workspace.defaultModelId,
        approvalPolicy: 'destructive-only',
        stage: 'planned',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.agents.unshift(agent);
      pushAudit('agent.create', 'agent', agent.id);
      return clone(agent);
    },

    async previewAgentRun(agentId: string) {
      const agent = findById(state.agents, agentId, 'Agent');
      const result = createResult('cleanup-preview', t('tools.agent.dryRun.summary', { agent: agent.name }), true);
      pushAudit('agent.previewRun', 'agent', agent.id, { resultId: result.id });
      return clone(result);
    },

    async validateImportManifest(manifestText: string) {
      try {
        const parsed = JSON.parse(manifestText) as Record<string, unknown>;
        if (!Array.isArray(parsed.providers) && !Array.isArray(parsed.models) && typeof parsed.workspace !== 'object') {
          throw new Error(t('data.import.errors.requiredList'));
        }
        const result = createResult('import', t('data.import.summary.ready'), true);
        return clone(result);
      } catch (error) {
        const result = createResult('import', t('data.import.summary.rejected', { reason: error instanceof Error ? error.message : String(error) }), true, { failed: true });
        return clone(result);
      }
    },

    async applyImportPlan(resultId: string) {
      const result = findById(state.importExportResults, resultId, 'Import result');
      if (result.action !== 'import' || result.status !== 'ready') {
        throw new Error(t('data.import.errors.readyOnly'));
      }
      result.status = 'completed';
      result.summary = t('data.import.summary.browserApplied');
      pushAudit('data.applyImportPlan', 'importExportResult', result.id);
      return clone(result);
    },

    async restoreSnapshot(snapshotId: string) {
      findById(state.importExportResults, snapshotId, 'Snapshot');
      const result = createResult('cleanup-preview', t('data.snapshot.summary.browserRestore'), true);
      return clone(result);
    },

    async createSnapshot() {
      const result = createResult(
        'snapshot',
        t('data.snapshot.summary.browserCreated', { conversations: state.conversations.length, messages: state.messages.length }),
        true,
      );
      return clone(result);
    },

    async exportDiagnostics() {
      const result = createResult(
        'export',
        t('data.diagnostics.summary.browserCreated', { requests: state.requestLogs.length, audits: state.auditLogs.length }),
        true,
      );
      return clone(result);
    },

    async openLogs() {
      pushAudit('system.openLogs', 'system', 'logs');
    },
  };

  return api;
}
