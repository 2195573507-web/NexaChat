import type { ThemeMode } from './theme.js';
import type { GatewayErrorCode, GatewayImportSource, GatewayKeyState, GatewayScope } from './gatewayRuntime.js';
import type {
  ConversationExportFormat,
  ConversationStatus,
  MessageChunkStatus,
  MessageChunkType,
  MessageContentFormat,
  MessageRole,
  MessageStatus,
  PromptTemplateScope,
} from './conversationRuntime.js';

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
  featureBoundaryKey?: string;
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
  status: ConversationStatus;
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
  role: MessageRole;
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
  status: MessageStatus;
  contentFormat: MessageContentFormat;
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

export interface MessageChunk {
  id: string;
  messageId: string;
  conversationId: string;
  requestLogId: string | null;
  sequence: number;
  chunkType: MessageChunkType;
  content: string;
  tokenCount: number | null;
  status: MessageChunkStatus;
  createdAt: number;
}

export interface MessageAttachment {
  id: string;
  messageId: string | null;
  conversationId: string;
  name: string;
  mimeType: string;
  size: number;
  status: 'accepted' | 'rejected' | 'deleted';
  storageRef: string | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MessageAttachmentInput {
  name: string;
  mimeType: string;
  size: number;
}

export interface PromptTemplate {
  id: string;
  scope: PromptTemplateScope;
  name: string;
  content: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationExport {
  id: string;
  conversationId: string;
  format: ConversationExportFormat;
  redacted: boolean;
  status: 'completed' | 'failed';
  content: string;
  summaryJson: string | null;
  createdAt: number;
}

export interface RetryMessageInput {
  messageId: string;
  modelId?: string;
  contextStrategy?: ContextStrategy;
}

export interface RegenerateMessageInput {
  assistantMessageId: string;
  modelId?: string;
  contextStrategy?: ContextStrategy;
}

export interface CancelMessageInput {
  requestLogId: string;
}

export interface CompareModelsInput {
  conversationId?: string;
  content: string;
  modelIds: string[];
  contextStrategy?: ContextStrategy;
}

export interface ExportConversationInput {
  conversationId: string;
  format: ConversationExportFormat;
  redacted?: boolean;
}

export interface SendMessageInput {
  conversationId?: string;
  content: string;
  providerId?: string;
  modelId?: string;
  contextStrategy?: ContextStrategy;
  parentMessageId?: string;
  attachments?: MessageAttachmentInput[];
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  conversation: Conversation;
  userMessage: Message;
  assistantMessage: Message;
  requestLog: RequestLog;
  routeDecision: RouteDecision;
  chunks?: MessageChunk[];
}

export interface CompareModelsResponse {
  conversation: Conversation;
  responses: ChatResponse[];
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
  gatewayKeyId: string | null;
  keyPreview: string | null;
  scope: GatewayScope | null;
  errorCode: GatewayErrorCode | null;
  latencyMs: number | null;
  remoteAddress: string | null;
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
  scopes: GatewayScope[];
  state: GatewayKeyState;
  disabledAt: number | null;
  rotatedFromId: string | null;
  lastErrorCode: GatewayErrorCode | null;
  rateLimitPerMinute: number | null;
  rateWindowStartedAt: number | null;
  rateWindowCount: number;
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

export interface GatewayKeyCreateInput {
  name: string;
  scopes?: GatewayScope[];
  quotaLimit?: number | null;
  rateLimitPerMinute?: number | null;
  expiresAt?: number | null;
}

export interface GatewayKeyUpdateInput {
  gatewayKeyId: string;
  name?: string;
  disabled?: boolean;
  scopes?: GatewayScope[];
  quotaLimit?: number | null;
  rateLimitPerMinute?: number | null;
  expiresAt?: number | null;
}

export interface GatewayKeyRotateInput {
  gatewayKeyId: string;
}

export interface ImportPlanApplyOptions {
  mode?: 'record-only' | 'apply-metadata';
}

export interface RestoreSnapshotOptions {
  mode?: 'preflight' | 'rollback';
}

export interface GatewayImportPlan {
  source: GatewayImportSource;
  providerCount: number;
  modelCount: number;
  gatewayKeyTemplateCount: number;
  conflictCount: number;
  rollbackSnapshotId: string | null;
  appliedProviderIds: string[];
  appliedModelIds: string[];
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
  rollbackSnapshotId: string | null;
  source: string | null;
  appliedEntityIdsJson: string | null;
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
  theme: ThemeMode;
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
  messageChunks: MessageChunk[];
  messageAttachments: MessageAttachment[];
  promptTemplates: PromptTemplate[];
  conversationExports: ConversationExport[];
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
