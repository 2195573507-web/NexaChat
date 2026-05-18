import type {
  AgentDefinition,
  ApprovalDecisionInput,
  ApprovalRequest,
  AppSnapshot,
  AuditLog,
  CancelMessageInput,
  ChatResponse,
  CompareModelsInput,
  CompareModelsResponse,
  ContextStrategy,
  Conversation,
  ConversationExport,
  ConversationPageInput,
  ExecutionRun,
  ExecutionStartInput,
  ExecutionStep,
  ExecutionTraceEvent,
  ExportConversationInput,
  GatewayApiKey,
  GatewayKeyCreated,
  GatewayLog,
  GatewayLogPageInput,
  GatewayStatus,
  HealthStatus,
  ImportExportResult,
  DataBackupRecord,
  DataConflictRecord,
  DataMobilityJob,
  KnowledgeChunk,
  KnowledgeChunkPageInput,
  KnowledgeCitation,
  KnowledgeDeleteInput,
  KnowledgeFile,
  KnowledgeFilePageInput,
  KnowledgeImportInput,
  KnowledgeRebuildInput,
  KnowledgeRetrievalInput,
  KnowledgeRetrievalResult,
  KnowledgeRetrievalTrace,
  McpServer,
  Message,
  MessagePageInput,
  MessageAttachment,
  MessageChunk,
  Model,
  ModelInput,
  PageResult,
  PromptTemplate,
  Provider,
  ProviderDiscoveryRequest,
  ProviderDiscoveryResult,
  ProviderInput,
  ProviderModelOption,
  ProviderSaveFromDiscoveryRequest,
  ProviderSaveFromDiscoveryResult,
  RegenerateMessageInput,
  RequestLog,
  RetryMessageInput,
  RouteDecision,
  SendMessageInput,
  UiPreferences,
  UsageRecord,
  Workspace,
  ToolDefinition,
  SecurityState,
  AuditIntegrityReport,
  AuditExportResult,
  EvalResult,
  EvalRunInput,
  EvalSet,
  FeedbackCreateInput,
  FeedbackItem,
  MigrationRun,
  ObservabilityPrivacySettings,
  ObservabilityQueryInput,
  ObservabilitySnapshot,
  ObservabilityExportResult,
  UsageTrendBucket,
  UsageTrendInput,
  AuditLogPageInput,
  ProviderHealthRecord,
  RollbackRecord,
  TaskCancelResult,
} from '../shared/types';
import type { AppApi } from '../shared/api';
import { IPC_EVENT_CHANNELS, isIpcEventChannel, type IpcEventChannel, type IpcEventPayloads } from '../shared/ipc';
import { translate } from '../shared/i18n';
import { normalizeThemeMode } from '../shared/theme';
import { EXECUTION_TOOL_IDS, TOOL_FIXTURES, normalizeApprovalDecision, normalizeExecutionStartInput } from '../shared/executionRuntime';
import { SECURITY_PERMISSION_KEYS } from '../shared/securityRuntime';
import { DATA_MANIFEST_VERSION, DATA_CONFIRMATION_PHRASES, stableHash } from '../shared/dataRuntime';
import { GATEWAY_AVAILABLE_ENDPOINTS } from '../shared/gatewayRuntime';
import {
  KNOWLEDGE_RUNTIME_POLICY,
  chunkKnowledgeText,
  lexicalEmbedding,
  normalizeKnowledgeImport,
  scoreKnowledgeChunks,
  stableKnowledgeHash,
  type KnowledgeScoredChunkInput,
} from '../shared/knowledgeRuntime';
import {
  DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS,
  OBSERVABILITY_FEEDBACK_LABELS,
  buildObservabilitySummary,
  buildRedactedObservabilityExport,
  filterObservabilityRequestLogs,
  normalizeObservabilityPrivacySettings,
  normalizeObservabilityQuery,
} from '../shared/observabilityRuntime';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);

interface MockState {
  workspace: Workspace;
  providers: Provider[];
  models: Model[];
  conversations: Conversation[];
  messages: Message[];
  messageChunks: MessageChunk[];
  messageAttachments: MessageAttachment[];
  promptTemplates: PromptTemplate[];
  conversationExports: ConversationExport[];
  requestLogs: RequestLog[];
  gatewayLogs: GatewayLog[];
  usageRecords: UsageRecord[];
  providerHealthRecords: ProviderHealthRecord[];
  feedbackItems: FeedbackItem[];
  evalSets: EvalSet[];
  evalResults: EvalResult[];
  observabilityPrivacy: ObservabilityPrivacySettings;
  gatewayStatus: GatewayStatus;
  gatewayKeys: GatewayApiKey[];
  knowledgeFiles: KnowledgeFile[];
  knowledgeChunks: KnowledgeChunk[];
  knowledgeRetrievals: KnowledgeRetrievalTrace[];
  knowledgeCitations: KnowledgeCitation[];
  mcpServers: McpServer[];
  agents: AgentDefinition[];
  tools: ToolDefinition[];
  executionRuns: ExecutionRun[];
  executionSteps: ExecutionStep[];
  executionTraceEvents: ExecutionTraceEvent[];
  approvalRequests: ApprovalRequest[];
  importExportResults: ImportExportResult[];
  dataMobilityJobs: DataMobilityJob[];
  dataConflicts: DataConflictRecord[];
  dataBackups: DataBackupRecord[];
  migrationRuns: MigrationRun[];
  rollbackRecords: RollbackRecord[];
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

function normalizePageLimit(value: number | undefined, fallback: number, max: number): number {
  const parsed = Math.floor(Number(value ?? fallback));
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function normalizePageOffset(value: number | undefined): number {
  const parsed = Math.floor(Number(value ?? 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function pageItems<T>(items: T[], input: { limit?: number; offset?: number } | undefined, fallback = 50, max = 200): PageResult<T> {
  const limit = normalizePageLimit(input?.limit, fallback, max);
  const offset = normalizePageOffset(input?.offset);
  const page = items.slice(offset, offset + limit);
  return {
    items: clone(page),
    total: items.length,
    limit,
    offset,
    hasMore: offset + page.length < items.length,
  };
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
    permissionKey: null,
    previousHash: null,
    entryHash: `mock_hash_${idCounter}`,
    integrityState: 'verified',
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
  const knowledgeFileId = 'knowledge_browser_mock';
  const knowledgeChunkId = 'knowledge_chunk_browser_mock_1';

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
      deletedAt: null,
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
    messageChunks: [],
    messageAttachments: [],
    promptTemplates: [
      {
        id: 'prompt_browser_mock',
        scope: 'global',
        name: t('chat.prompt.defaultName'),
        content: t('chat.prompt.defaultContent'),
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    conversationExports: [],
    requestLogs: [],
    gatewayLogs: [],
    usageRecords: [],
    providerHealthRecords: [
      {
        id: 'provider_health_browser_mock',
        providerId,
        modelId,
        status: 'healthy',
        latencyMs: 42,
        source: 'manual',
        errorCode: null,
        errorMessage: null,
        createdAt: timestamp,
      },
    ],
    feedbackItems: [],
    evalSets: [
      {
        id: 'eval_round13_basic',
        name: t('observability.eval.seed.name'),
        description: t('observability.eval.seed.description'),
        prompt: t('observability.eval.seed.prompt'),
        expectedKeywordsJson: JSON.stringify(['NexaChat', 'local']),
        status: 'draft',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    evalResults: [],
    observabilityPrivacy: normalizeObservabilityPrivacySettings({
      ...DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS,
      updatedAt: timestamp,
    }),
    gatewayStatus: {
      enabled: true,
      running: true,
      listenerState: 'listening',
      port: 8787,
      bindHost: '127.0.0.1',
      endpoints: [...GATEWAY_AVAILABLE_ENDPOINTS],
      recentError: null,
      lastStartError: null,
    },
    gatewayKeys: [
      {
        id: 'gateway_key_browser_mock',
        name: 'Browser dev key',
        keyPreview: 'nexa_...mock',
        scopes: ['chat:write', 'models:read', 'embeddings:write'],
        state: 'active',
        disabledAt: null,
        rotatedFromId: null,
        lastErrorCode: null,
        rateLimitPerMinute: 60,
        rateWindowStartedAt: null,
        rateWindowCount: 0,
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
        id: knowledgeFileId,
        name: 'getting-started.md',
        type: 'text/markdown',
        size: 2048,
        parseStatus: 'indexed',
        indexStatus: 'indexed',
        embeddingStatus: 'embedded',
        parserType: 'markdown',
        chunkCount: 1,
        tokenCount: 26,
        contentHash: 'kh_browser_seed',
        storageRef: null,
        metadataJson: JSON.stringify({ runtime: 'browser-mock' }),
        errorMessage: null,
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    knowledgeChunks: [
      {
        id: knowledgeChunkId,
        fileId: knowledgeFileId,
        knowledgeBaseId: null,
        content: t('knowledge.import.sampleContent'),
        citation: 'getting-started.md#chunk-1',
        position: 0,
        tokenCount: 26,
        contentHash: 'kh_browser_chunk_seed',
        sourceStart: 0,
        sourceEnd: t('knowledge.import.sampleContent').length,
        pageNumber: null,
        sectionTitle: null,
        status: 'indexed',
        embeddingId: 'knowledge_embedding_browser_mock_1',
        metadataJson: JSON.stringify({ strategy: 'lexical' }),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    knowledgeRetrievals: [],
    knowledgeCitations: [],
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
    tools: TOOL_FIXTURES.map((tool) => ({ ...tool, createdAt: timestamp, updatedAt: timestamp })),
    executionRuns: [],
    executionSteps: [],
    executionTraceEvents: [],
    approvalRequests: [],
    importExportResults: [],
    dataMobilityJobs: [],
    dataConflicts: [],
    dataBackups: [],
    migrationRuns: [{
      id: createId('migration'),
      version: 'round-12-data-mobility-v1',
      status: 'completed',
      summary: t('data.migration.summary.round12'),
      createdAt: now(),
      completedAt: now(),
    }],
    rollbackRecords: [],
    auditLogs: [createAuditLog('mock.init', 'workspace', workspaceId, { runtime: 'browser' })],
    uiPreferences: {
      theme: 'system',
      density: 'comfortable',
      fontMode: 'system',
      language: 'zh-CN',
      reducedMotion: false,
      advancedMode: false,
    },
  };
}

function resolveRoute(state: MockState, input: SendMessageInput): RouteDecision {
  const requestedModel = input.modelId ? state.models.find((model) => model.id === input.modelId) : null;
  if (input.modelId && (!requestedModel || !requestedModel.enabled)) {
    throw new Error(t('chat.route.explicitUnavailable'));
  }
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
  const activeKnowledgeFiles = state.knowledgeFiles.filter((file) => !file.deletedAt);
  const activeKnowledgeFileIds = new Set(activeKnowledgeFiles.map((file) => file.id));
  const activeKnowledgeChunks = state.knowledgeChunks.filter((chunk) => chunk.status !== 'deleted' && activeKnowledgeFileIds.has(chunk.fileId));
  const activeKnowledgeCitations = state.knowledgeCitations.filter((citation) => activeKnowledgeFileIds.has(citation.fileId));
  const activeProviders = state.providers.filter((provider) => provider.enabled);
  const activeModels = state.models.filter((model) => model.enabled && !model.deletedAt && activeProviders.some((provider) => provider.id === model.providerId));
  const disabledModels = state.models.filter((model) => !model.enabled || Boolean(model.deletedAt));
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
  if (activeProviders.length === 0) {
    setupGaps.push(t('dashboard.setup.browserProviderMissing'));
  }
  if (activeModels.length === 0) {
    setupGaps.push(t('dashboard.setup.browserModelMissing'));
  }
  if (!state.gatewayStatus.running) {
    setupGaps.push(t('dashboard.setup.browserGatewayDisabled'));
  }
  const auditIntegrity = buildAuditIntegrity(state.auditLogs);
  const snapshotConversations = [...state.conversations]
    .filter((conversation) => conversation.status !== 'deleted')
    .sort((left, right) => {
      if (left.isPinned !== right.isPinned) {
        return left.isPinned ? -1 : 1;
      }
      return (right.lastMessageAt ?? right.updatedAt) - (left.lastMessageAt ?? left.updatedAt);
    });
  const currentConversationId = snapshotConversations[0]?.id;

  return {
    dashboard: {
      workspace: state.workspace,
      recentConversations: [...state.conversations]
        .filter((conversation) => conversation.status !== 'deleted')
        .sort((left, right) => (right.lastMessageAt ?? right.updatedAt) - (left.lastMessageAt ?? left.updatedAt))
        .slice(0, 5),
      providers: activeProviders,
      models: activeModels,
      gatewayStatus: state.gatewayStatus,
      usageToday,
      setupGaps,
    },
    conversations: snapshotConversations.slice(0, 30),
    messages: currentConversationId
      ? state.messages
          .filter((message) => message.conversationId === currentConversationId && message.status !== 'deleted')
          .sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id))
          .slice(0, 60)
          .reverse()
      : [],
    messageChunks: state.messageChunks,
    messageAttachments: state.messageAttachments,
    promptTemplates: state.promptTemplates,
    conversationExports: state.conversationExports,
    providers: activeProviders,
    models: activeModels,
    disabledModels,
    requestLogs: state.requestLogs,
    gatewayLogs: state.gatewayLogs.slice(0, 24),
    usageRecords: state.usageRecords.slice(0, 24),
    providerHealthRecords: state.providerHealthRecords,
    feedbackItems: state.feedbackItems,
    evalSets: state.evalSets,
    evalResults: state.evalResults,
    observability: buildObservabilitySnapshot(state),
    gatewayKeys: state.gatewayKeys,
    knowledgeFiles: activeKnowledgeFiles.slice(0, 30),
    knowledgeChunks: activeKnowledgeChunks.slice(0, 40),
    knowledgeRetrievals: state.knowledgeRetrievals,
    knowledgeCitations: activeKnowledgeCitations,
    mcpServers: state.mcpServers,
    agents: state.agents,
    tools: state.tools,
    executionRuns: state.executionRuns,
    executionSteps: state.executionSteps,
    executionTraceEvents: state.executionTraceEvents,
    approvalRequests: state.approvalRequests,
    importExportResults: state.importExportResults,
    dataMobilityJobs: state.dataMobilityJobs,
    dataConflicts: state.dataConflicts,
    dataBackups: state.dataBackups,
    migrationRuns: state.migrationRuns,
    rollbackRecords: state.rollbackRecords,
    auditLogs: state.auditLogs.slice(0, 30),
    security: buildSecurityState(),
    auditIntegrity,
    uiPreferences: state.uiPreferences,
  };
}

function buildSecurityState(): SecurityState {
  const timestamp = now();
  const activeUser = {
    id: 'browser_user',
    displayName: 'Browser Mock Admin',
    status: 'active' as const,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const activeRole = {
    id: 'owner' as const,
    name: t('settings.security.role.owner'),
    description: t('settings.security.role.owner.note'),
    permissionKeys: [...SECURITY_PERMISSION_KEYS],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return {
    activeUser,
    activeSession: {
      id: 'browser_session',
      userId: activeUser.id,
      roleId: activeRole.id,
      state: 'active',
      createdAt: timestamp,
      expiresAt: null,
      lastSeenAt: timestamp,
      revokedAt: null,
    },
    activeRole,
    roles: [activeRole],
    aclGrants: [],
    permissionKeys: [...SECURITY_PERMISSION_KEYS],
    deniedCount: 0,
  };
}

function buildAuditIntegrity(auditLogs: AuditLog[]): AuditIntegrityReport {
  return {
    status: auditLogs.length > 0 ? 'verified' : 'empty',
    checkedAt: now(),
    checkedCount: auditLogs.length,
    firstBrokenAuditId: null,
    lastHash: auditLogs[0]?.entryHash ?? null,
  };
}

function buildObservabilitySnapshot(state: MockState, input: ObservabilityQueryInput = {}): ObservabilitySnapshot {
  const query = normalizeObservabilityQuery(input);
  const requestLogs = filterObservabilityRequestLogs(state.requestLogs, query);
  const requestLogIds = new Set(requestLogs.map((log) => log.id));
  const gatewayLogs = state.gatewayLogs.filter((log) => !log.requestLogId || requestLogIds.has(log.requestLogId) || !query.query);
  const usageRecords = state.usageRecords.filter((record) => !record.requestLogId || requestLogIds.has(record.requestLogId));
  const auditLogs = query.includeAudit ? state.auditLogs : [];
  const executionTraceEvents = query.includeTrace ? state.executionTraceEvents : [];
  const knowledgeRetrievals = state.knowledgeRetrievals;
  const providerHealthRecords = state.providerHealthRecords.filter((record) =>
    (!query.providerId || record.providerId === query.providerId) && (!query.modelId || record.modelId === query.modelId),
  );
  const feedbackItems = state.feedbackItems.filter((item) => !item.requestLogId || requestLogIds.has(item.requestLogId));
  const evalResults = state.evalResults.filter((result) =>
    (!query.providerId || result.providerId === query.providerId) && (!query.modelId || result.modelId === query.modelId),
  );
  return {
    summary: buildObservabilitySummary({
      providers: state.providers,
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
    evalSets: state.evalSets,
    evalResults,
    privacy: state.observabilityPrivacy,
  };
}

function indexKnowledgeChunks(state: MockState, file: KnowledgeFile, content: string, timestamp: number): void {
  const chunks = chunkKnowledgeText(content);
  for (const chunk of chunks) {
    const chunkId = createId('knowledge_chunk');
    state.knowledgeChunks.push({
      id: chunkId,
      fileId: file.id,
      knowledgeBaseId: null,
      content: chunk.content,
      citation: `${file.name}#chunk-${chunk.position + 1}`,
      position: chunk.position,
      tokenCount: chunk.tokenCount,
      contentHash: chunk.contentHash,
      sourceStart: chunk.sourceStart,
      sourceEnd: chunk.sourceEnd,
      pageNumber: null,
      sectionTitle: null,
      status: 'indexed',
      embeddingId: createId('knowledge_embedding'),
      metadataJson: JSON.stringify({ strategy: 'lexical', indexDirectory: KNOWLEDGE_RUNTIME_POLICY.indexDirectory }),
      createdAt: timestamp + chunk.position,
      updatedAt: timestamp + chunk.position,
    });
  }
}

function retrieveKnowledge(state: MockState, input: KnowledgeRetrievalInput): KnowledgeRetrievalResult {
  const timestamp = now();
  const strategy = input.strategy ?? 'lexical';
  const topK = input.topK ?? KNOWLEDGE_RUNTIME_POLICY.defaultTopK;
  const candidates: KnowledgeScoredChunkInput[] = state.knowledgeChunks
    .filter((chunk) => chunk.status === 'indexed')
    .filter((chunk) => state.knowledgeFiles.some((file) => file.id === chunk.fileId && file.indexStatus === 'indexed' && !file.deletedAt))
    .map((chunk) => {
      const file = findById(state.knowledgeFiles, chunk.fileId, 'Knowledge file');
      return {
        id: chunk.id,
        fileId: chunk.fileId,
        fileName: file.name,
        content: chunk.content,
        citation: chunk.citation,
        position: chunk.position,
        strategy,
        vector: lexicalEmbedding(chunk.content),
      };
    });
  const scored = scoreKnowledgeChunks(input.query, candidates, topK);
  const trace: KnowledgeRetrievalTrace = {
    id: createId('knowledge_retrieval'),
    query: input.query.trim(),
    strategy,
    topK,
    selectedChunkIdsJson: JSON.stringify(scored.map((chunk) => chunk.id)),
    resultCount: scored.length,
    fallbackReason: 'lexical_embedding',
    createdAt: timestamp,
  };
  const citations: KnowledgeCitation[] = scored.map((chunk) => ({
    id: createId('knowledge_citation'),
    retrievalId: trace.id,
    messageId: null,
    requestLogId: null,
    fileId: chunk.fileId,
    chunkId: chunk.id,
    fileName: chunk.fileName,
    citation: chunk.citation,
    snippet: chunk.content.slice(0, 220),
    score: chunk.score,
    strategy,
    fallbackReason: trace.fallbackReason,
    createdAt: timestamp,
  }));
  state.knowledgeRetrievals.unshift(trace);
  state.knowledgeCitations.unshift(...citations);
  return { trace, citations };
}

function addExecutionTrace(
  state: MockState,
  runId: string,
  stepId: string | null,
  eventType: ExecutionTraceEvent['eventType'],
  message: string,
  metadata?: unknown,
): void {
  state.executionTraceEvents.unshift({
    id: createId('trace'),
    runId,
    stepId,
    eventType,
    message,
    metadataJson: metadata ? JSON.stringify(metadata) : null,
    createdAt: now(),
  });
}

function createExecutionRun(state: MockState, input: ExecutionStartInput): ExecutionRun {
  const normalized = normalizeExecutionStartInput(input);
  const timestamp = now();
  const agent = normalized.agentId ? findById(state.agents, normalized.agentId, 'Agent') : null;
  const tool = findById(state.tools, normalized.toolId ?? EXECUTION_TOOL_IDS.statusRead, 'Tool');
  const requiresApproval = normalized.mode === 'execute' && tool.requiresApproval;
  const run: ExecutionRun = {
    id: createId('run'),
    kind: normalized.kind,
    status: requiresApproval ? 'waiting_approval' : 'completed',
    mode: normalized.mode ?? 'preview',
    title: agent ? t('tools.execution.title.agent', { agent: agent.name }) : t('tools.execution.title.tool', { tool: tool.name }),
    agentId: agent?.id ?? null,
    toolId: tool.id,
    mcpServerId: normalized.mcpServerId ?? null,
    workflowId: normalized.workflowId ?? null,
    inputJson: normalized.inputJson ?? '{}',
    outputJson: requiresApproval ? null : JSON.stringify({ summary: t('tools.execution.status.summary', { models: state.models.length, knowledge: state.knowledgeFiles.filter((file) => !file.deletedAt).length, gateway: state.gatewayStatus.running ? 'running' : 'stopped' }) }),
    errorMessage: null,
    approvalStatus: requiresApproval ? 'pending' : null,
    sandboxMode: tool.riskLevel === 'read' ? 'read-only' : 'fixture-only',
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: requiresApproval ? null : timestamp,
  };
  const planStep: ExecutionStep = {
    id: createId('step'),
    runId: run.id,
    parentStepId: null,
    kind: 'plan',
    title: agent ? t('tools.agent.dryRun.step.read') : t('tools.execution.step.plan'),
    status: 'completed',
    toolId: null,
    mcpServerId: null,
    inputJson: null,
    outputJson: null,
    errorMessage: null,
    position: 1,
    startedAt: timestamp,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const permissionStep: ExecutionStep = {
    ...planStep,
    id: createId('step'),
    kind: 'permission',
    title: t('tools.execution.step.permission'),
    toolId: tool.id,
    position: 2,
  };
  state.executionRuns.unshift(run);
  state.executionSteps.unshift(permissionStep, planStep);
  addExecutionTrace(state, run.id, null, 'run_planned', run.title, { kind: run.kind, mode: run.mode });
  addExecutionTrace(state, run.id, permissionStep.id, 'permission_checked', t('tools.execution.trace.permissionChecked'), { toolId: tool.id });
  if (requiresApproval) {
    const approvalStep: ExecutionStep = {
      ...planStep,
      id: createId('step'),
      kind: 'approval',
      title: t('tools.execution.step.approval'),
      status: 'waiting_approval',
      toolId: tool.id,
      position: 3,
      startedAt: null,
      completedAt: null,
    };
    const approval: ApprovalRequest = {
      id: createId('approval'),
      runId: run.id,
      stepId: approvalStep.id,
      status: 'pending',
      requestedAction: tool.name,
      riskLevel: tool.riskLevel,
      reason: t('tools.execution.approval.reason', { tool: tool.name }),
      decisionReason: null,
      decidedAt: null,
      createdAt: timestamp,
      expiresAt: null,
    };
    state.executionSteps.unshift(approvalStep);
    state.approvalRequests.unshift(approval);
    addExecutionTrace(state, run.id, approvalStep.id, 'approval_requested', t('tools.execution.trace.approvalRequested'), { approvalId: approval.id });
  } else {
    const toolStep: ExecutionStep = {
      ...planStep,
      id: createId('step'),
      kind: 'tool',
      title: tool.name,
      toolId: tool.id,
      outputJson: run.outputJson,
      position: 3,
    };
    state.executionSteps.unshift(toolStep);
    addExecutionTrace(state, run.id, toolStep.id, 'tool_called', t('tools.execution.trace.toolCalled'), { toolId: tool.id });
    addExecutionTrace(state, run.id, toolStep.id, 'step_completed', t('tools.execution.trace.stepCompleted'), { outputJson: run.outputJson });
    addExecutionTrace(state, run.id, null, 'run_completed', t('tools.execution.trace.runCompleted'), { runId: run.id });
  }
  return run;
}

export function createMockApi(): AppApi {
  const state = createSeedState();
  const eventHandlers = new Map<IpcEventChannel, Set<(payload: IpcEventPayloads[IpcEventChannel]) => void>>();

  function emitEvent<C extends IpcEventChannel>(channel: C, payload: IpcEventPayloads[C]) {
    for (const handler of eventHandlers.get(channel) ?? []) {
      handler(payload as IpcEventPayloads[IpcEventChannel]);
    }
  }

  function pushAudit(action: string, targetType: string, targetId: string | null, details?: unknown): void {
    state.auditLogs.unshift(createAuditLog(action, targetType, targetId, details));
  }

  function touchWorkspace(): void {
    state.workspace.updatedAt = now();
  }

  function setMockModelAvailability(modelId: string, enabled: boolean, deleted: boolean): Model {
    const model = findById(state.models, modelId, 'Model');
    const provider = findById(state.providers, model.providerId, 'Provider');
    if (enabled && (!provider.enabled || model.deletedAt)) {
      throw new Error(`Model cannot be enabled: ${modelId}`);
    }
    const timestamp = now();
    const previousHealth = model.healthStatus;
    model.enabled = enabled;
    model.deletedAt = deleted ? timestamp : null;
    model.healthStatus = enabled ? previousHealth : 'unknown';
    model.latencyMs = enabled ? model.latencyMs : null;
    model.updatedAt = timestamp;
    if (!enabled) {
      if (state.workspace.defaultModelId === model.id) {
        state.workspace.defaultModelId = null;
      }
      state.conversations.forEach((conversation) => {
        if (conversation.defaultModelId === model.id) {
          conversation.defaultModelId = null;
          conversation.updatedAt = timestamp;
        }
      });
      touchWorkspace();
    }
    pushAudit(deleted ? 'model.deleted' : enabled ? 'model.enabled' : 'model.disabled', 'model', model.id, { providerId: model.providerId });
    return model;
  }

  function createResult(action: ImportExportResult['action'], summary: string, redacted: boolean, options: { failed?: boolean; conflictCount?: number } = {}): ImportExportResult {
    const timestamp = now();
    const status: ImportExportResult['status'] = options.failed ? 'failed' : action === 'import' || action === 'restore-preflight' || action === 'cleanup-preview' ? 'ready' : 'completed';
    const conflictCount = options.conflictCount ?? 0;
    const manifest = {
      version: DATA_MANIFEST_VERSION,
      requiresConfirmation: status === 'ready',
      conflictCount,
      source: 'browser-mock',
    };
    const result: ImportExportResult = {
      id: createId(action.replace('-', '_')),
      action,
      status,
      summary,
      redacted,
      manifestJson: JSON.stringify(manifest),
      rollbackSnapshotId: null,
      source: 'browser-mock',
      appliedEntityIdsJson: JSON.stringify([]),
      errorMessage: status === 'failed' ? summary : null,
      conflictCount,
      requiresConfirmation: status === 'ready',
      createdAt: timestamp,
    };
    state.importExportResults.unshift(result);
    const job: DataMobilityJob = {
      id: result.id,
      operationKind: action === 'cleanup-preview' || action === 'restore-preflight' ? 'restore-preflight' : action === 'encrypted-backup' ? 'encrypted-backup' : action === 'snapshot' ? 'snapshot' : action === 'export' ? 'export' : action === 'rollback' ? 'rollback' : action === 'migration' ? 'migration' : 'import',
      status,
      source: 'browser-mock',
      manifestVersion: DATA_MANIFEST_VERSION,
      profile: action === 'encrypted-backup' ? 'encrypted-full' : 'metadata-redacted',
      summary,
      manifestHash: stableHash(manifest),
      manifestJson: JSON.stringify(manifest),
      conflictCount,
      requiresConfirmation: status === 'ready',
      encrypted: action === 'encrypted-backup',
      redacted,
      rollbackRecordId: null,
      relatedSnapshotId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.dataMobilityJobs.unshift(job);
    pushAudit(`data.${action}`, 'importExportResult', result.id);
    return result;
  }

  const api: AppApi = {
    async getSnapshot() {
      return clone(buildSnapshot(state));
    },

    async discoverProvider(input: ProviderDiscoveryRequest): Promise<ProviderDiscoveryResult> {
      const address = input.baseUrl?.trim() || input.address.trim();
      const capabilities = {
        openAiCompatible: 'unknown' as const,
        models: 'unknown' as const,
        chatCompletions: 'not_tested' as const,
        streaming: 'not_tested' as const,
        tokenUsage: 'not_tested' as const,
        embeddings: 'not_tested' as const,
      };
      if (!address) {
        return clone({
          status: 'failed',
          inputAddress: input.address.trim(),
          normalizedBaseUrl: null,
          suggestedProviderName: input.providerName?.trim() || 'OpenAI-compatible Provider',
          providerType: input.providerType ?? 'openai-compatible',
          compatibility: 'failed',
          capabilities,
          models: [],
          modelExamples: [],
          warnings: [],
          errors: [{ code: 'provider_invalid_base_url', message: t('models.errors.invalidBaseUrl'), status: null }],
          testedCandidates: [],
          selectedCandidateBaseUrl: null,
          latencyMs: 1,
        });
      }
      const normalized = /^https?:\/\//i.test(address) ? address.replace(/\/+$/, '') : `https://${address.replace(/\/+$/, '')}`;
      const baseUrl = normalized.endsWith('/v1') ? normalized : `${normalized}/v1`;
      const providerName = input.providerName?.trim() || `${new URL(baseUrl).hostname.replace(/^api\./, '').split('.')[0] || 'Mock'} Provider`;
      const slug = providerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'provider';
      const models = [`${slug}-chat`, `${slug}-fast`, `${slug}-embed`].map((name) => ({ id: name, name }));
      pushAudit('provider.discovery.preview', 'provider', null, { modelCount: models.length });
      return clone({
        status: 'success',
        inputAddress: input.address.trim(),
        normalizedBaseUrl: baseUrl,
        suggestedProviderName: providerName,
        providerType: input.providerType ?? 'openai-compatible',
        compatibility: 'openai-compatible',
        capabilities: {
          openAiCompatible: 'supported',
          models: 'supported',
          chatCompletions: 'supported',
          streaming: 'unknown',
          tokenUsage: 'supported',
          embeddings: 'not_tested',
        },
        models,
        modelExamples: models.slice(0, 3).map((model) => model.name),
        warnings: [],
        errors: [],
        testedCandidates: [{
          baseUrl,
          modelsEndpoint: '/models',
          chatEndpoint: '/chat/completions',
          embeddingsEndpoint: '/embeddings',
        }],
        selectedCandidateBaseUrl: baseUrl,
        latencyMs: 38,
      });
    },

    async saveProviderFromDiscovery(input: ProviderSaveFromDiscoveryRequest): Promise<ProviderSaveFromDiscoveryResult> {
      const provider = await api.createProvider({
        name: input.providerName,
        type: input.providerType,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        customHeadersJson: input.customHeadersJson,
      });
      const models = [];
      const uniqueModelNames = Array.from(new Set(input.modelNames.map((name) => name.trim()).filter(Boolean))).slice(0, 200);
      for (const name of uniqueModelNames) {
        models.push(await api.createModel({
          providerId: provider.id,
          name,
          supportsStreaming: input.capabilities?.streaming === 'unsupported' ? false : true,
          supportsEmbeddings: input.capabilities?.embeddings === 'supported',
        }));
      }
      pushAudit('provider.discovery.saved', 'provider', provider.id, { modelCount: models.length });
      return clone({ provider, models });
    },

    subscribe(channel, handler) {
      if (!isIpcEventChannel(channel)) {
        throw new Error(`Unsupported IPC event channel: ${channel}`);
      }
      const handlers = eventHandlers.get(channel) ?? new Set();
      handlers.add(handler as (payload: IpcEventPayloads[IpcEventChannel]) => void);
      eventHandlers.set(channel, handlers);
      return () => {
        handlers.delete(handler as (payload: IpcEventPayloads[IpcEventChannel]) => void);
        if (handlers.size === 0) {
          eventHandlers.delete(channel);
        }
      };
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

    async deleteProvider(providerId: string) {
      const provider = findById(state.providers, providerId, 'Provider');
      const timestamp = now();
      provider.enabled = false;
      provider.healthStatus = 'unknown';
      provider.updatedAt = timestamp;
      const disabledModelIds: string[] = [];
      state.models
        .filter((model) => model.providerId === provider.id)
        .forEach((model) => {
          model.enabled = false;
          model.healthStatus = 'unknown';
          model.latencyMs = null;
          model.updatedAt = timestamp;
          disabledModelIds.push(model.id);
        });
      if (state.workspace.defaultProviderId === provider.id) {
        state.workspace.defaultProviderId = null;
      }
      if (state.workspace.defaultModelId && disabledModelIds.includes(state.workspace.defaultModelId)) {
        state.workspace.defaultModelId = null;
      }
      state.conversations.forEach((conversation) => {
        if (conversation.defaultProviderId === provider.id) {
          conversation.defaultProviderId = null;
          conversation.updatedAt = timestamp;
        }
        if (conversation.defaultModelId && disabledModelIds.includes(conversation.defaultModelId)) {
          conversation.defaultModelId = null;
          conversation.updatedAt = timestamp;
        }
      });
      touchWorkspace();
      pushAudit('provider.delete', 'provider', provider.id, { disabledModelCount: disabledModelIds.length });
      return clone(provider);
    },

    async fetchProviderModels(providerId: string): Promise<ProviderModelOption[]> {
      const provider = findById(state.providers, providerId, 'Provider');
      if (!provider.enabled) {
        throw new Error(`Provider is disabled: ${providerId}`);
      }
      const timestamp = now();
      provider.healthStatus = 'healthy';
      provider.lastCheckedAt = timestamp;
      provider.updatedAt = timestamp;
      const slug = provider.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'provider';
      state.providerHealthRecords.unshift({
        id: createId('health'),
        providerId: provider.id,
        modelId: null,
        status: 'healthy',
        latencyMs: 38,
        source: 'provider-test',
        errorCode: null,
        errorMessage: null,
        createdAt: timestamp,
      });
      const options = [
        ...state.models.filter((model) => model.providerId === provider.id && model.enabled && !model.deletedAt).map((model) => model.name),
        `${slug}-chat`,
        `${slug}-fast`,
      ];
      pushAudit('provider.models.fetch', 'provider', provider.id, { modelCount: options.length });
      return clone(Array.from(new Set(options)).map((name) => ({ id: name, name })));
    },

    async createModel(input: ModelInput) {
      const provider = findById(state.providers, input.providerId, 'Provider');
      if (!provider.enabled) {
        throw new Error(`Provider is disabled: ${input.providerId}`);
      }

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
        deletedAt: null,
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

    async updateModel(input) {
      const model = findById(state.models, input.modelId, 'Model');
      if (model.deletedAt) {
        throw new Error(`Model is deleted: ${input.modelId}`);
      }
      const timestamp = now();
      model.name = input.name?.trim() || model.name;
      model.displayName = input.displayName?.trim() || model.displayName;
      model.contextWindow = input.contextWindow ?? model.contextWindow;
      model.supportsStreaming = input.supportsStreaming ?? model.supportsStreaming;
      model.supportsTools = input.supportsTools ?? model.supportsTools;
      model.supportsVision = input.supportsVision ?? model.supportsVision;
      model.supportsEmbeddings = input.supportsEmbeddings ?? model.supportsEmbeddings;
      model.updatedAt = timestamp;
      pushAudit('model.update', 'model', model.id, { providerId: model.providerId });
      return clone(model);
    },

    async disableModel(input) {
      return clone(setMockModelAvailability(input.modelId, false, false));
    },

    async enableModel(input) {
      return clone(setMockModelAvailability(input.modelId, true, false));
    },

    async deleteModel(input) {
      return clone(setMockModelAvailability(input.modelId, false, true));
    },

    async testProvider(providerId: string) {
      const provider = findById(state.providers, providerId, 'Provider');
      const timestamp = now();
      const status: HealthStatus = /^https?:\/\//i.test(provider.baseUrl) && provider.enabled ? 'healthy' : 'error';
      provider.healthStatus = status;
      provider.lastCheckedAt = timestamp;
      provider.updatedAt = timestamp;

      state.providerHealthRecords.unshift({
        id: createId('health'),
        providerId: provider.id,
        modelId: null,
        status,
        latencyMs: status === 'healthy' ? 42 : 1,
        source: 'provider-test',
        errorCode: status === 'healthy' ? null : 'invalid_base_url',
        errorMessage: status === 'healthy' ? null : t('models.errors.invalidBaseUrl'),
        createdAt: timestamp,
      });

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
      const requestLogId = input.clientRequestId?.trim() || createId('request');
      const assistantChunks = assistantContent.split('\n\n').filter(Boolean);
      emitEvent(IPC_EVENT_CHANNELS.chatStream, {
        type: 'chat.stream.started',
        phase: 'started',
        requestId: requestLogId,
        clientRequestId: input.clientRequestId,
        conversationId: storedConversation.id,
        timestamp,
        progress: 0,
        message: t('chat.generation.sending'),
      });

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

      const retrieval = retrieveKnowledge(state, { query: input.content, topK: KNOWLEDGE_RUNTIME_POLICY.defaultTopK, strategy: 'lexical' });
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
        metadataJson: JSON.stringify({ source: 'browser-mock', retrievalId: retrieval.trace.id, citations: retrieval.citations }),
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
      const chunks: MessageChunk[] = assistantChunks.map((chunk, index) => ({
        id: createId('chunk'),
        messageId: assistantMessage.id,
        conversationId: storedConversation.id,
        requestLogId,
        sequence: index,
        chunkType: index === assistantChunks.length - 1 ? 'final' : 'text',
        content: chunk,
        tokenCount: estimateTokens(chunk),
        status: 'completed',
        createdAt: timestamp + index,
      }));

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
      state.messageChunks.push(...chunks);
      if (state.models.find((model) => model.id === routeDecision.modelId)?.supportsStreaming !== false) {
        for (const chunk of chunks) {
          emitEvent(IPC_EVENT_CHANNELS.chatStream, {
            type: 'chat.stream.chunk',
            phase: 'streaming',
            requestId: requestLogId,
            clientRequestId: input.clientRequestId,
            conversationId: storedConversation.id,
            userMessageId: userMessage.id,
            assistantMessageId: assistantMessage.id,
            chunk: chunk.content,
            timestamp: now(),
          });
        }
      }
      const attachedCitations = retrieval.citations.map((citation) => ({
        ...citation,
        id: createId('knowledge_citation'),
        messageId: assistantMessage.id,
        requestLogId,
      }));
      state.knowledgeCitations.unshift(...attachedCitations);
      state.requestLogs.unshift(requestLog);
      state.usageRecords.unshift(usageRecord);
      state.providerHealthRecords.unshift({
        id: createId('health'),
        providerId: routeDecision.providerId,
        modelId: routeDecision.modelId,
        status: 'healthy',
        latencyMs: assistantMessage.latencyMs,
        source: 'chat',
        errorCode: null,
        errorMessage: null,
        createdAt: now(),
      });

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
        chunks,
      };
      emitEvent(IPC_EVENT_CHANNELS.chatStream, {
        type: 'chat.stream.completed',
        phase: 'completed',
        requestId: requestLogId,
        clientRequestId: input.clientRequestId,
        conversationId: storedConversation.id,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        response,
        timestamp: now(),
        progress: 1,
        message: t('chat.generation.completed'),
      });
      return clone(response);
    },

    async retryMessage(input: RetryMessageInput) {
      const message = findById(state.messages, input.messageId, 'Message');
      const sourceUser = message.role === 'user'
        ? message
        : message.parentMessageId
          ? findById(state.messages, message.parentMessageId, 'Parent message')
          : [...state.messages].reverse().find((candidate) => candidate.conversationId === message.conversationId && candidate.role === 'user');
      if (!sourceUser || sourceUser.role !== 'user') {
        throw new Error(t('chat.errors.retrySourceMissing'));
      }
      pushAudit('chat.retryMessage', 'message', message.id);
      return api.sendMessage({
        conversationId: sourceUser.conversationId,
        content: sourceUser.content,
        modelId: input.modelId ?? message.modelId ?? undefined,
        contextStrategy: input.contextStrategy ?? message.contextStrategy,
        parentMessageId: sourceUser.id,
        metadata: { action: 'retry', sourceMessageId: message.id },
      });
    },

    async regenerateMessage(input: RegenerateMessageInput) {
      const assistant = findById(state.messages, input.assistantMessageId, 'Assistant message');
      if (assistant.role !== 'assistant') {
        throw new Error(t('chat.errors.regenerateAssistantOnly'));
      }
      const sourceUser = assistant.parentMessageId
        ? findById(state.messages, assistant.parentMessageId, 'Parent message')
        : [...state.messages].reverse().find((candidate) => candidate.conversationId === assistant.conversationId && candidate.role === 'user');
      if (!sourceUser || sourceUser.role !== 'user') {
        throw new Error(t('chat.errors.regenerateSourceMissing'));
      }
      pushAudit('chat.regenerateMessage', 'message', assistant.id);
      return api.sendMessage({
        conversationId: assistant.conversationId,
        content: sourceUser.content,
        modelId: input.modelId ?? assistant.modelId ?? undefined,
        contextStrategy: input.contextStrategy ?? assistant.contextStrategy,
        parentMessageId: sourceUser.id,
        metadata: { action: 'regenerate', sourceAssistantMessageId: assistant.id },
      });
    },

    async cancelMessage(input: CancelMessageInput) {
      const requestLog = findById(state.requestLogs, input.requestLogId, 'Request log');
      if (!requestLog.messageId) {
        throw new Error(t('chat.errors.cancelRequestMissing'));
      }
      const assistantMessage = findById(state.messages, requestLog.messageId, 'Message');
      assistantMessage.status = 'cancelled';
      assistantMessage.errorMessage = t('chat.cancelled.message');
      assistantMessage.errorCode = 'cancelled_by_user';
      requestLog.status = 'cancelled';
      requestLog.errorMessage = t('chat.cancelled.message');
      requestLog.errorCode = 'cancelled_by_user';
      requestLog.completedAt = now();
      state.messageChunks
        .filter((chunk) => chunk.requestLogId === requestLog.id)
        .forEach((chunk) => {
          chunk.status = 'cancelled';
        });
      pushAudit('chat.cancelMessage', 'requestLog', requestLog.id);
      const conversation = findById(state.conversations, assistantMessage.conversationId, 'Conversation');
      const routeDecision = resolveRoute(state, { content: assistantMessage.content, modelId: assistantMessage.modelId ?? undefined });
      return clone({
        conversation,
        userMessage: assistantMessage.parentMessageId ? findById(state.messages, assistantMessage.parentMessageId, 'Parent message') : assistantMessage,
        assistantMessage,
        requestLog,
        routeDecision,
        chunks: state.messageChunks.filter((chunk) => chunk.messageId === assistantMessage.id),
      });
    },

    async compareModels(input: CompareModelsInput) {
      const modelIds = Array.from(new Set(input.modelIds)).filter(Boolean).slice(0, 3);
      if (modelIds.length < 2) {
        throw new Error(t('chat.errors.compareNeedsModels'));
      }
      const conversation = input.conversationId
        ? findById(state.conversations, input.conversationId, 'Conversation')
        : await api.createConversation(input.content.slice(0, 32) || t('chat.seed.newConversation'));
      const responses: ChatResponse[] = [];
      const failures: Array<{ modelId: string; error: string }> = [];
      const queue = [...modelIds];
      const runNext = async () => {
        const modelId = queue.shift();
        if (!modelId) {
          return;
        }
        try {
          responses.push(await api.sendMessage({
            conversationId: conversation.id,
            content: input.content,
            modelId,
            contextStrategy: input.contextStrategy ?? 'recent_n',
            metadata: { action: 'compare', compareModelIds: modelIds },
          }));
        } catch (error) {
          failures.push({ modelId, error: error instanceof Error ? error.message : String(error) });
        }
        await runNext();
      };
      await Promise.all(Array.from({ length: Math.min(2, queue.length) }, () => runNext()));
      if (responses.length === 0) {
        throw new Error(failures[0]?.error ?? t('chat.errors.compareNeedsModels'));
      }
      pushAudit('chat.compareModels', 'conversation', conversation.id, { modelIds, failures });
      const result: CompareModelsResponse = { conversation, responses, failures };
      return clone(result);
    },

    async exportConversation(input: ExportConversationInput) {
      const conversation = findById(state.conversations, input.conversationId, 'Conversation');
      const messages = state.messages.filter((message) => message.conversationId === conversation.id && message.status !== 'deleted');
      const redacted = input.redacted !== false;
      const content = input.format === 'json'
        ? JSON.stringify({ conversation, messages, redacted, source: 'browser-mock' }, null, 2)
        : [`# ${conversation.title}`, '', ...messages.flatMap((message) => [`## ${message.role} - ${message.status}`, message.content, ''])].join('\n');
      const created: ConversationExport = {
        id: createId('conversation_export'),
        conversationId: conversation.id,
        format: input.format,
        redacted,
        status: 'completed',
        content,
        summaryJson: JSON.stringify({ messageCount: messages.length, redacted }),
        createdAt: now(),
      };
      state.conversationExports.unshift(created);
      pushAudit('chat.exportConversation', 'conversation', conversation.id, { format: input.format, redacted });
      return clone(created);
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

    async listConversations(input?: ConversationPageInput) {
      const query = input?.query?.trim().toLowerCase();
      const conversations = [...state.conversations]
        .filter((conversation) => conversation.status !== 'deleted')
        .filter((conversation) => !query || conversation.title.toLowerCase().includes(query) || (conversation.groupName ?? '').toLowerCase().includes(query))
        .sort((left, right) => {
          if (left.isPinned !== right.isPinned) {
            return left.isPinned ? -1 : 1;
          }
          return (right.lastMessageAt ?? right.updatedAt) - (left.lastMessageAt ?? left.updatedAt);
        });
      return pageItems(conversations, input, 30, 100);
    },

    async listMessages(input: MessagePageInput) {
      const messages = state.messages
        .filter((message) => message.conversationId === input.conversationId && message.status !== 'deleted')
        .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
      const newestFirst = [...messages].reverse();
      const page = pageItems(newestFirst, input, 40, 200);
      return { ...page, items: clone([...page.items].reverse()) };
    },

    async listGatewayLogs(input?: GatewayLogPageInput) {
      const logs = state.gatewayLogs
        .filter((log) => input?.statusCode === undefined || log.statusCode === input.statusCode)
        .filter((log) => input?.since === undefined || log.createdAt >= input.since)
        .filter((log) => input?.until === undefined || log.createdAt <= input.until)
        .sort((left, right) => right.createdAt - left.createdAt);
      return pageItems(logs, input, 50, 200);
    },

    async listAuditLogs(input?: AuditLogPageInput) {
      const query = input?.query?.trim().toLowerCase();
      const logs = state.auditLogs
        .filter((log) => !query || JSON.stringify(log).toLowerCase().includes(query))
        .filter((log) => !input?.action || log.action === input.action)
        .filter((log) => !input?.userId || log.actor === input.userId)
        .filter((log) => input?.since === undefined || log.createdAt >= input.since)
        .filter((log) => input?.until === undefined || log.createdAt <= input.until)
        .sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id));
      return pageItems(logs, input, 50, 200);
    },

    async listKnowledgeFiles(input?: KnowledgeFilePageInput) {
      const files = state.knowledgeFiles
        .filter((file) => !file.deletedAt)
        .filter((file) => !input?.status || file.indexStatus === input.status)
        .sort((left, right) => right.updatedAt - left.updatedAt);
      return pageItems(files, input, 50, 200);
    },

    async listKnowledgeChunks(input?: KnowledgeChunkPageInput) {
      const activeFileIds = new Set(state.knowledgeFiles.filter((file) => !file.deletedAt).map((file) => file.id));
      const chunks = state.knowledgeChunks
        .filter((chunk) => chunk.status !== 'deleted' && activeFileIds.has(chunk.fileId))
        .filter((chunk) => !input?.fileId || chunk.fileId === input.fileId)
        .sort((left, right) => right.createdAt - left.createdAt || left.position - right.position);
      return pageItems(chunks, input, 50, 200);
    },

    async getUsageTrend(input?: UsageTrendInput) {
      const bucketMs = Math.max(60 * 1000, Number(input?.bucketMs ?? 60 * 60 * 1000));
      const limit = normalizePageLimit(input?.limit, 48, 366);
      const buckets = new Map<number, UsageTrendBucket>();
      state.usageRecords
        .filter((record) => !input?.workspaceId || record.workspaceId === input.workspaceId)
        .filter((record) => !input?.providerId || record.providerId === input.providerId)
        .filter((record) => !input?.modelId || record.modelId === input.modelId)
        .filter((record) => input?.since === undefined || record.createdAt >= input.since)
        .filter((record) => input?.until === undefined || record.createdAt <= input.until)
        .forEach((record) => {
          const bucketStart = Math.floor(record.createdAt / bucketMs) * bucketMs;
          const bucket = buckets.get(bucketStart) ?? {
            bucketStart,
            requestCount: 0,
            inputTokens: 0,
            outputTokens: 0,
            costEstimate: 0,
          };
          bucket.requestCount += 1;
          bucket.inputTokens += record.inputTokens;
          bucket.outputTokens += record.outputTokens;
          bucket.costEstimate += record.costEstimate;
          buckets.set(bucketStart, bucket);
        });
      return clone([...buckets.values()].sort((left, right) => left.bucketStart - right.bucketStart).slice(-limit));
    },

    async cancelTask(taskId: string): Promise<TaskCancelResult> {
      emitEvent(IPC_EVENT_CHANNELS.taskProgress, {
        taskId,
        taskKind: 'browser.mock',
        type: 'task.canceled',
        phase: 'canceled',
        timestamp: now(),
        progress: 1,
        message: 'browser mock task canceled',
      });
      return { taskId, canceled: true };
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

    async createGatewayKey(input) {
      const timestamp = now();
      const name = input.name.trim() || 'Untitled key';
      const rawKey = `nexa_mock_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      const record: GatewayApiKey = {
        id: createId('gateway_key'),
        name,
        keyPreview: `${rawKey.slice(0, 8)}...${rawKey.slice(-4)}`,
        scopes: input.scopes?.length ? input.scopes : ['chat:write', 'models:read', 'embeddings:write'],
        state: 'active',
        disabledAt: null,
        rotatedFromId: null,
        lastErrorCode: null,
        rateLimitPerMinute: input.rateLimitPerMinute ?? 60,
        rateWindowStartedAt: null,
        rateWindowCount: 0,
        quotaLimit: input.quotaLimit ?? 1000,
        quotaUsed: 0,
        expiresAt: input.expiresAt ?? null,
        revokedAt: null,
        lastUsedAt: null,
        createdAt: timestamp,
      };

      state.gatewayKeys.unshift(record);
      pushAudit('gateway.createKey', 'gatewayKey', record.id);
      const created: GatewayKeyCreated = { key: rawKey, record };
      return clone(created);
    },

    async updateGatewayKey(input) {
      const key = findById(state.gatewayKeys, input.gatewayKeyId, 'Gateway key');
      if (input.name !== undefined) key.name = input.name.trim() || key.name;
      if (input.scopes !== undefined) key.scopes = input.scopes;
      if (input.quotaLimit !== undefined) key.quotaLimit = input.quotaLimit;
      if (input.rateLimitPerMinute !== undefined) key.rateLimitPerMinute = input.rateLimitPerMinute;
      if (input.expiresAt !== undefined) key.expiresAt = input.expiresAt;
      if (input.disabled !== undefined) {
        key.disabledAt = input.disabled ? key.disabledAt ?? now() : null;
        key.state = input.disabled ? 'disabled' : 'active';
      }
      pushAudit('gateway.updateKey', 'gatewayKey', key.id, { state: key.state });
      return clone(key);
    },

    async rotateGatewayKey(input) {
      const oldKey = findById(state.gatewayKeys, input.gatewayKeyId, 'Gateway key');
      const created = await this.createGatewayKey({
        name: `${oldKey.name} rotated`,
        scopes: oldKey.scopes,
        quotaLimit: oldKey.quotaLimit,
        rateLimitPerMinute: oldKey.rateLimitPerMinute,
        expiresAt: oldKey.expiresAt,
      });
      created.record.rotatedFromId = oldKey.id;
      oldKey.revokedAt = oldKey.revokedAt ?? now();
      oldKey.state = 'revoked';
      pushAudit('gateway.rotateKey', 'gatewayKey', oldKey.id, { newKeyId: created.record.id });
      return clone(created);
    },

    async revokeGatewayKey(gatewayKeyId: string) {
      const key = findById(state.gatewayKeys, gatewayKeyId, 'Gateway key');
      key.revokedAt = key.revokedAt ?? now();
      key.state = 'revoked';
      pushAudit('gateway.revokeKey', 'gatewayKey', key.id, { keyPreview: key.keyPreview });
      return clone(key);
    },

    async toggleGateway(enabled: boolean) {
      state.gatewayStatus = {
        ...state.gatewayStatus,
        enabled,
        running: enabled,
        listenerState: enabled ? 'listening' : 'stopped',
        recentError: enabled ? null : 'Gateway stopped by browser mock user action.',
        lastStartError: null,
      };
      pushAudit('gateway.toggle', 'gateway', null, { enabled });
      return clone(state.gatewayStatus);
    },

    async saveUiPreferences(preferences: UiPreferences) {
      state.uiPreferences = { ...preferences, theme: normalizeThemeMode(preferences.theme), advancedMode: Boolean(preferences.advancedMode) };
      pushAudit('settings.saveUiPreferences', 'settings', 'uiPreferences', state.uiPreferences);
      return clone(state.uiPreferences);
    },

    async createKnowledgeFile(input: KnowledgeImportInput) {
      const timestamp = now();
      const normalized = normalizeKnowledgeImport(input);
      const chunks = normalized.supported ? chunkKnowledgeText(normalized.content) : [];
      const file: KnowledgeFile = {
        id: createId('knowledge'),
        name: normalized.name,
        type: normalized.type,
        size: normalized.size,
        parseStatus: normalized.supported ? 'indexed' : 'failed',
        indexStatus: normalized.supported ? 'indexed' : 'failed',
        embeddingStatus: normalized.supported ? 'embedded' : 'failed',
        parserType: normalized.parserType,
        chunkCount: chunks.length,
        tokenCount: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
        contentHash: normalized.contentHash,
        storageRef: null,
        metadataJson: JSON.stringify({ runtime: 'browser-mock', maxImportBytes: KNOWLEDGE_RUNTIME_POLICY.maxImportBytes }),
        errorMessage: normalized.errorKey ? t(normalized.errorKey as Parameters<typeof t>[0]) : null,
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.knowledgeFiles.unshift(file);
      if (normalized.supported) {
        indexKnowledgeChunks(state, file, normalized.content, timestamp);
      }
      pushAudit('knowledge.createFile', 'knowledgeFile', file.id, { type: file.type, size: file.size });
      return clone(file);
    },

    async retryKnowledgeFile(input: KnowledgeRebuildInput) {
      return api.rebuildKnowledgeFile(input);
    },

    async rebuildKnowledgeFile(input: KnowledgeRebuildInput) {
      const file = findById(state.knowledgeFiles, input.fileId, 'Knowledge file');
      const timestamp = now();
      const sourceChunks = state.knowledgeChunks.filter((chunk) => chunk.fileId === file.id && chunk.status === 'indexed');
      if (sourceChunks.length === 0) {
        file.parseStatus = 'failed';
        file.indexStatus = 'failed';
        file.embeddingStatus = 'failed';
        file.errorMessage = t('knowledge.errors.rebuildNoSource');
        file.updatedAt = timestamp;
        pushAudit('knowledge.rebuild.failed', 'knowledgeFile', file.id);
        return clone(file);
      }
      state.knowledgeChunks
        .filter((chunk) => chunk.fileId === file.id)
        .forEach((chunk) => {
          chunk.status = 'deleted';
          chunk.updatedAt = timestamp;
        });
      const content = sourceChunks.map((chunk) => chunk.content).join('\n\n');
      indexKnowledgeChunks(state, file, content, timestamp);
      const activeChunks = state.knowledgeChunks.filter((chunk) => chunk.fileId === file.id && chunk.status === 'indexed');
      file.parseStatus = 'indexed';
      file.indexStatus = 'indexed';
      file.embeddingStatus = 'embedded';
      file.chunkCount = activeChunks.length;
      file.tokenCount = activeChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
      file.errorMessage = null;
      file.updatedAt = timestamp;
      pushAudit('knowledge.rebuild.completed', 'knowledgeFile', file.id);
      return clone(file);
    },

    async deleteKnowledgeFile(input: KnowledgeDeleteInput) {
      const file = findById(state.knowledgeFiles, input.fileId, 'Knowledge file');
      const timestamp = now();
      state.knowledgeChunks
        .filter((chunk) => chunk.fileId === file.id)
        .forEach((chunk) => {
          chunk.status = 'deleted';
          chunk.updatedAt = timestamp;
        });
      file.parseStatus = 'stale';
      file.indexStatus = 'deleted';
      file.embeddingStatus = 'deleted';
      file.chunkCount = 0;
      file.deletedAt = timestamp;
      file.updatedAt = timestamp;
      pushAudit('knowledge.deleteFile', 'knowledgeFile', file.id);
      return clone(file);
    },

    async previewKnowledgeRetrieval(input: KnowledgeRetrievalInput) {
      const result = retrieveKnowledge(state, input);
      pushAudit('knowledge.retrieve', 'knowledgeRetrieval', result.trace.id, { resultCount: result.citations.length });
      return clone(result);
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
      server.lastStatus = permissionState === 'granted' ? 'warning' : 'unknown';
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
      const run = createExecutionRun(state, { kind: 'agent', mode: 'preview', agentId: agent.id, toolId: EXECUTION_TOOL_IDS.statusRead });
      pushAudit('agent.previewRun', 'agent', agent.id, { runId: run.id });
      return clone(run);
    },

    async startExecutionRun(input: ExecutionStartInput) {
      const run = createExecutionRun(state, input);
      pushAudit('execution.startRun', 'executionRun', run.id, { kind: run.kind, mode: run.mode });
      return clone(run);
    },

    async decideApproval(input: ApprovalDecisionInput) {
      const decision = normalizeApprovalDecision(input);
      const approval = findById(state.approvalRequests, decision.approvalId, 'Approval');
      const run = findById(state.executionRuns, approval.runId, 'Execution run');
      const timestamp = now();
      const decisionReason = decision.reason ?? null;
      approval.status = decision.decision;
      approval.decisionReason = decisionReason;
      approval.decidedAt = timestamp;
      run.approvalStatus = decision.decision;
      run.status = decision.decision === 'approved' ? 'completed' : 'cancelled';
      run.updatedAt = timestamp;
      run.completedAt = timestamp;
      run.outputJson = decision.decision === 'approved' ? JSON.stringify({ echo: t('tools.execution.echo.default') }) : null;
      run.errorMessage = decision.decision === 'denied' ? (decisionReason ?? t('tools.execution.error.denied')) : null;
      state.executionSteps
        .filter((step) => step.id === approval.stepId)
        .forEach((step) => {
          step.status = decision.decision === 'approved' ? 'completed' : 'cancelled';
          step.outputJson = JSON.stringify({ decision: decision.decision });
          step.completedAt = timestamp;
          step.updatedAt = timestamp;
        });
      addExecutionTrace(state, run.id, approval.stepId, 'approval_decided', t('tools.execution.trace.approvalDecided'), decision);
      addExecutionTrace(state, run.id, null, decision.decision === 'approved' ? 'run_completed' : 'run_cancelled', decision.decision === 'approved' ? t('tools.execution.trace.runCompleted') : t('tools.execution.trace.runCancelled'), { runId: run.id });
      pushAudit(`execution.approval.${decision.decision}`, 'executionRun', run.id, { approvalId: approval.id });
      return clone(run);
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

    async applyImportPlan(resultId: string, options) {
      if (options?.confirmationPhrase !== DATA_CONFIRMATION_PHRASES.applyImport) {
        throw new Error(t('data.import.errors.confirmation'));
      }
      const result = findById(state.importExportResults, resultId, 'Import result');
      if (result.action !== 'import' || result.status !== 'ready') {
        throw new Error(t('data.import.errors.readyOnly'));
      }
      result.status = 'completed';
      result.summary = t('data.import.summary.browserApplied');
      const job = state.dataMobilityJobs.find((item) => item.id === result.id);
      const rollbackId = createId('rollback_record');
      if (job) {
        job.status = 'completed';
        job.summary = result.summary;
        job.rollbackRecordId = rollbackId;
        job.updatedAt = now();
      }
      state.rollbackRecords.unshift({
        id: rollbackId,
        jobId: result.id,
        rollbackSnapshotId: result.rollbackSnapshotId,
        state: 'available',
        affectedEntityIdsJson: JSON.stringify(['provider_mock_import']),
        appliedAt: null,
        createdAt: now(),
      });
      pushAudit('data.applyImportPlan', 'importExportResult', result.id);
      return clone(result);
    },

    async restoreSnapshot(snapshotId: string, options) {
      const snapshot = findById(state.importExportResults, snapshotId, 'Snapshot');
      if (options?.mode === 'rollback') {
        const result = createResult('rollback', t('data.snapshot.summary.rollbackApplied', { count: 1 }), true);
        state.rollbackRecords
          .filter((record) => record.jobId === snapshot.id && record.state === 'available')
          .forEach((record) => {
            record.state = 'applied';
            record.appliedAt = now();
          });
        return clone(result);
      }
      const result = createResult('restore-preflight', t('data.snapshot.summary.browserRestore'), true);
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

    async exportDataPackage() {
      const result = createResult('export', t('data.export.summary.created'), true);
      return clone(result);
    },

    async createEncryptedBackup(input) {
      if (input.passphrase.trim().length < 8) {
        throw new Error(t('data.backup.errors.passphrase'));
      }
      const result = createResult('encrypted-backup', t('data.backup.summary.created'), true);
      const backup: DataBackupRecord = {
        id: createId('backup'),
        jobId: result.id,
        profile: 'encrypted-full',
        encrypted: true,
        redacted: true,
        manifestHash: stableHash(result.manifestJson ?? result.id),
        packageJson: JSON.stringify({ version: DATA_MANIFEST_VERSION, encrypted: true, payload: '[ENCRYPTED_PAYLOAD]' }),
        createdAt: now(),
      };
      state.dataBackups.unshift(backup);
      pushAudit('data.backup.encrypted.created', 'dataBackup', backup.id);
      return clone(backup);
    },

    async createRestorePreflight(input) {
      if (!input.backupId && !input.packageText) {
        throw new Error(t('data.restore.errors.backupRequired'));
      }
      const result = createResult('restore-preflight', t('data.restore.summary.preflight', { added: 1, changed: 0 }), true);
      return clone(findById(state.dataMobilityJobs, result.id, 'Data mobility job'));
    },

    async applyDataRollback(input) {
      if (input.confirmationPhrase !== DATA_CONFIRMATION_PHRASES.rollback) {
        throw new Error(t('data.restore.errors.confirmation'));
      }
      const rollback = findById(state.rollbackRecords, input.rollbackId, 'Rollback record');
      rollback.state = 'applied';
      rollback.appliedAt = now();
      const result = createResult('rollback', t('data.snapshot.summary.rollbackApplied', { count: 1 }), true);
      return clone(findById(state.dataMobilityJobs, result.id, 'Data mobility job'));
    },

    async queryObservability(input?: ObservabilityQueryInput) {
      return clone(buildObservabilitySnapshot(state, input));
    },

    async createFeedback(input: FeedbackCreateInput) {
      const timestamp = now();
      const requestLog = input.requestLogId
        ? findById(state.requestLogs, input.requestLogId, 'Request log')
        : state.requestLogs[0] ?? null;
      const message = input.messageId
        ? findById(state.messages, input.messageId, 'Message')
        : requestLog?.messageId
          ? state.messages.find((item) => item.id === requestLog.messageId) ?? null
          : null;
      const label = OBSERVABILITY_FEEDBACK_LABELS.includes(input.label) ? input.label : 'other';
      const feedback: FeedbackItem = {
        id: createId('feedback'),
        label,
        messageId: message?.id ?? null,
        requestLogId: requestLog?.id ?? input.requestLogId ?? null,
        notes: input.notes?.slice(0, 500) ?? null,
        metadataJson: JSON.stringify({ runtime: 'browser-mock', providerId: requestLog?.providerId ?? message?.providerId ?? null }),
        createdAt: timestamp,
      };
      state.feedbackItems.unshift(feedback);
      pushAudit('observability.feedback.created', 'feedback', feedback.id, { label });
      return clone(feedback);
    },

    async runEvaluation(input: EvalRunInput) {
      const evalSet = findById(state.evalSets, input.evalSetId, 'Eval set');
      const model = input.modelId
        ? findById(state.models, input.modelId, 'Model')
        : state.models.find((candidate) => candidate.id === state.workspace.defaultModelId) ?? state.models[0];
      const provider = findById(state.providers, model.providerId, 'Provider');
      const timestamp = now();
      const requestLogId = createId('request');
      const output = t('observability.eval.mockOutput', { prompt: evalSet.prompt });
      let expectedKeywords: string[] = [];
      try {
        const parsed = JSON.parse(evalSet.expectedKeywordsJson) as unknown;
        expectedKeywords = Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
      } catch {
        expectedKeywords = [];
      }
      const score = expectedKeywords.length === 0
        ? 1
        : expectedKeywords.filter((keyword) => output.toLowerCase().includes(String(keyword).toLowerCase())).length / expectedKeywords.length;
      const inputTokens = estimateTokens(evalSet.prompt);
      const outputTokens = estimateTokens(output);
      const requestLog: RequestLog = {
        id: requestLogId,
        conversationId: null,
        messageId: null,
        providerId: provider.id,
        modelId: model.id,
        modelNameSnapshot: model.name,
        routeId: null,
        gatewayRequestId: null,
        status: 'completed',
        endpoint: '/eval/run',
        requestSummaryJson: JSON.stringify({ evalSetId: evalSet.id, expectedKeywords }),
        responseSummaryJson: JSON.stringify({ score }),
        inputTokens,
        outputTokens,
        latencyMs: 55,
        finishReason: 'stop',
        errorCode: null,
        errorMessage: null,
        startedAt: timestamp,
        completedAt: timestamp,
        createdAt: timestamp,
      };
      const usageRecord: UsageRecord = {
        id: createId('usage'),
        workspaceId: state.workspace.id,
        providerId: provider.id,
        modelId: model.id,
        requestLogId,
        inputTokens,
        outputTokens,
        costEstimate: 0,
        createdAt: timestamp,
      };
      const result: EvalResult = {
        id: createId('eval_result'),
        evalSetId: evalSet.id,
        providerId: provider.id,
        modelId: model.id,
        requestLogId,
        status: 'completed',
        score: Number(score.toFixed(3)),
        latencyMs: 55,
        outputPreview: output.slice(0, 500),
        errorCode: null,
        errorMessage: null,
        createdAt: timestamp,
      };
      evalSet.status = 'completed';
      evalSet.updatedAt = timestamp;
      state.requestLogs.unshift(requestLog);
      state.usageRecords.unshift(usageRecord);
      state.evalResults.unshift(result);
      state.providerHealthRecords.unshift({
        id: createId('health'),
        providerId: provider.id,
        modelId: model.id,
        status: 'healthy',
        latencyMs: 55,
        source: 'chat',
        errorCode: null,
        errorMessage: null,
        createdAt: timestamp,
      });
      pushAudit('observability.eval.completed', 'eval_set', evalSet.id, { resultId: result.id, score: result.score });
      return clone(result);
    },

    async saveObservabilityPrivacy(input) {
      state.observabilityPrivacy = normalizeObservabilityPrivacySettings({
        ...state.observabilityPrivacy,
        ...input,
        updatedAt: now(),
      });
      pushAudit('observability.privacy.updated', 'observability_privacy', null, state.observabilityPrivacy);
      return clone(state.observabilityPrivacy);
    },

    async exportObservability(input?: ObservabilityQueryInput) {
      const snapshot = buildObservabilitySnapshot(state, input);
      const result: ObservabilityExportResult = {
        id: createId('observability_export'),
        redacted: true,
        content: buildRedactedObservabilityExport({
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
        }, snapshot.privacy),
        summary: snapshot.summary,
        createdAt: now(),
      };
      pushAudit('observability.exported', 'observability', result.id, { requestCount: result.summary.requestCount, redacted: true });
      return clone(result);
    },

    async searchAuditLogs(query?: string) {
      const normalized = query?.trim().toLowerCase() ?? '';
      const logs = normalized
        ? state.auditLogs.filter((log) => JSON.stringify(log).toLowerCase().includes(normalized))
        : state.auditLogs;
      pushAudit('audit.search', 'auditLog', null, { resultCount: logs.length });
      return clone(logs);
    },

    async verifyAuditIntegrity() {
      const report = buildAuditIntegrity(state.auditLogs);
      pushAudit('audit.verify', 'auditLog', null, { status: report.status });
      return clone(report);
    },

    async exportAuditLogs() {
      const integrity = buildAuditIntegrity(state.auditLogs);
      const result: AuditExportResult = {
        id: createId('audit_export'),
        redacted: true,
        content: JSON.stringify({ redacted: true, integrity, auditLogs: state.auditLogs }, null, 2),
        integrity,
        createdAt: now(),
      };
      pushAudit('audit.export', 'auditLog', result.id, { status: integrity.status });
      return clone(result);
    },

    async openLogs() {
      pushAudit('system.openLogs', 'system', 'logs');
    },
  };

  return api;
}
