export type ModuleStage = 'ready' | 'implemented' | 'planned' | 'reserved' | 'environment-limited';

export interface NavTab {
  id: string;
  label: string;
  title?: string;
  stage: ModuleStage;
  status?: ModuleStage;
  route?: string;
  description?: string;
  default?: boolean;
  permission?: string;
  labelKey?: string;
  descriptionKey?: string;
  icon?: string;
  featureBoundary?: string;
}

export interface NavModule {
  id: ModuleId;
  moduleId?: ModuleId;
  label: string;
  moduleName?: string;
  shortLabel: string;
  route: string;
  defaultRoute?: string;
  stage: ModuleStage;
  status?: ModuleStage;
  tabs: NavTab[];
  children?: NavTab[];
  description?: string;
  moduleDescription?: string;
  permission?: string;
  labelKey?: string;
  shortLabelKey?: string;
  descriptionKey?: string;
  icon?: string;
}

export type ModuleId =
  | 'workspace'
  | 'chat'
  | 'models'
  | 'knowledge'
  | 'tools'
  | 'gateway'
  | 'data'
  | 'settings';

export interface Workspace {
  id: string;
  name: string;
  defaultProviderId: string | null;
  defaultModelId: string | null;
  createdAt: number;
  updatedAt: number;
}

export type ProviderType =
  | 'openai-compatible'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'qwen'
  | 'ollama'
  | 'lm-studio'
  | 'custom';

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  proxyUrl: string | null;
  authType: 'api-key' | 'none';
  secretRef: string | null;
  customHeadersJson: string | null;
  enabled: boolean;
  healthStatus: HealthStatus;
  lastCheckedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProviderInput {
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  proxyUrl?: string;
  customHeadersJson?: string;
}

export interface Model {
  id: string;
  providerId: string;
  name: string;
  displayName: string;
  modelNameSnapshot: string;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsEmbeddings: boolean;
  inputPrice: number | null;
  outputPrice: number | null;
  healthStatus: HealthStatus;
  latencyMs: number | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ModelInput {
  providerId: string;
  name: string;
  displayName?: string;
  contextWindow?: number;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsEmbeddings?: boolean;
}

export type HealthStatus = 'unknown' | 'healthy' | 'warning' | 'error';

export interface Conversation {
  id: string;
  workspaceId: string;
  title: string;
  assistantId: string | null;
  defaultProviderId: string | null;
  defaultModelId: string | null;
  defaultRouterId: string | null;
  groupName: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  status: 'active' | 'archived' | 'deleted';
  summary: string | null;
  lastMessageAt: number | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  workspaceId: string;
  parentMessageId: string | null;
  role: 'system' | 'user' | 'assistant' | 'tool' | 'error';
  content: string;
  providerId: string | null;
  modelId: string | null;
  modelNameSnapshot: string | null;
  requestId: string | null;
  requestLogId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  finishReason: string | null;
  errorMessage: string | null;
  status: 'draft' | 'streaming' | 'completed' | 'failed' | 'cancelled' | 'deleted';
  contentFormat: 'markdown' | 'plain_text' | 'json' | 'tool_result';
  contextStrategy: ContextStrategy;
  contextMessageIdsJson: string | null;
  summaryId: string | null;
  artifactIdsJson: string | null;
  errorCode: string | null;
  metadataJson: string | null;
  createdAt: number;
  updatedAt: number;
}

export type ContextStrategy = 'recent_n' | 'summary_recent_n' | 'manual' | 'token_trim';

export interface SendMessageInput {
  conversationId?: string;
  content: string;
  providerId?: string;
  modelId?: string;
  contextStrategy?: ContextStrategy;
}

export interface ChatResponse {
  conversation: Conversation;
  userMessage: Message;
  assistantMessage: Message;
  requestLog: RequestLog;
  routeDecision: RouteDecision;
}

export interface RouteDecision {
  providerId: string;
  modelId: string;
  modelNameSnapshot: string;
  reason: string;
  fallbackUsed: boolean;
}

export interface RequestLog {
  id: string;
  conversationId: string | null;
  messageId: string | null;
  providerId: string | null;
  modelId: string | null;
  modelNameSnapshot: string | null;
  routeId: string | null;
  gatewayRequestId: string | null;
  status: 'started' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  endpoint: string;
  requestSummaryJson: string | null;
  responseSummaryJson: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  finishReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: number;
  completedAt: number | null;
  createdAt: number;
}

export interface GatewayLog {
  id: string;
  requestLogId: string | null;
  method: string;
  path: string;
  statusCode: number;
  redactedHeadersJson: string | null;
  createdAt: number;
}

export interface UsageRecord {
  id: string;
  workspaceId: string;
  providerId: string | null;
  modelId: string | null;
  requestLogId: string | null;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
  createdAt: number;
}

export interface GatewayStatus {
  enabled: boolean;
  running: boolean;
  port: number;
  bindHost: string;
  endpoints: string[];
  recentError: string | null;
}

export interface GatewayApiKey {
  id: string;
  name: string;
  keyPreview: string;
  scopes: string[];
  quotaLimit: number | null;
  quotaUsed: number;
  expiresAt: number | null;
  revokedAt: number | null;
  lastUsedAt: number | null;
  createdAt: number;
}

export interface GatewayKeyCreated {
  key: string;
  record: GatewayApiKey;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  size: number;
  parseStatus: 'queued' | 'parsing' | 'indexed' | 'failed' | 'stale';
  chunkCount: number;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface McpServer {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'http';
  commandOrUrl: string;
  enabled: boolean;
  permissionState: 'discovered' | 'denied' | 'granted';
  lastStatus: HealthStatus;
  createdAt: number;
  updatedAt: number;
}

export interface AgentDefinition {
  id: string;
  name: string;
  goal: string;
  defaultModelId: string | null;
  approvalPolicy: 'always' | 'destructive-only' | 'never';
  stage: ModuleStage;
  createdAt: number;
  updatedAt: number;
}

export interface ImportExportResult {
  id: string;
  action: 'import' | 'export' | 'snapshot' | 'cleanup-preview';
  status: 'ready' | 'completed' | 'failed';
  summary: string;
  redacted: boolean;
  manifestJson: string | null;
  errorMessage: string | null;
  conflictCount: number;
  requiresConfirmation: boolean;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  targetType: string;
  targetId: string | null;
  detailsJson: string | null;
  createdAt: number;
}

export interface UiPreferences {
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
  fontMode: 'system' | 'kaiti';
  language: 'zh-CN' | 'en-US';
  reducedMotion: boolean;
}

export interface DashboardSummary {
  workspace: Workspace;
  recentConversations: Conversation[];
  providers: Provider[];
  models: Model[];
  gatewayStatus: GatewayStatus;
  usageToday: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costEstimate: number;
  };
  setupGaps: string[];
}

export interface AppSnapshot {
  dashboard: DashboardSummary;
  conversations: Conversation[];
  messages: Message[];
  providers: Provider[];
  models: Model[];
  requestLogs: RequestLog[];
  gatewayLogs: GatewayLog[];
  usageRecords: UsageRecord[];
  gatewayKeys: GatewayApiKey[];
  knowledgeFiles: KnowledgeFile[];
  mcpServers: McpServer[];
  agents: AgentDefinition[];
  importExportResults: ImportExportResult[];
  auditLogs: AuditLog[];
  uiPreferences: UiPreferences;
}
