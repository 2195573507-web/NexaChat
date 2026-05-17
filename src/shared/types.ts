import type { ThemeMode } from './theme.js';
import type { GatewayErrorCode, GatewayImportSource, GatewayKeyState, GatewayScope } from './gatewayRuntime.js';
import type {
  KnowledgeChunkStatus,
  KnowledgeEmbeddingStatus,
  KnowledgeIndexStatus,
  KnowledgeParseStatus,
  KnowledgeParserType,
  KnowledgeRetrievalStrategy,
} from './knowledgeRuntime.js';
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
import type {
  AuditIntegrityStatus,
  SecurityPermissionKey,
  SecurityRoleId,
  SecuritySessionState,
  SecurityUserStatus,
} from './securityRuntime.js';
import type {
  DataBackupProfile,
  DataConflictStrategy,
  DataConflictType,
  DataJobStatus,
  DataMigrationVersion,
  DataOperationKind,
  DataRollbackState,
} from './dataRuntime.js';
import type {
  ObservabilityEvalStatus,
  ObservabilityFeedbackLabel,
  ObservabilityPrivacySettings,
  ObservabilityQueryInput,
  ObservabilitySummary,
} from './observabilityRuntime.js';

export type {
  ObservabilityEvalStatus,
  ObservabilityFeedbackLabel,
  ObservabilityPrivacySettings,
  ObservabilityQueryInput,
  ObservabilitySummary,
} from './observabilityRuntime.js';

export type ModuleStage = 'ready' | 'implemented' | 'planned' | 'reserved' | 'environment-limited';
export type UiStatusState = 'ready' | 'empty' | 'loading' | 'error' | 'preview' | 'planned' | 'unavailable';

export interface SecurityUser {
  id: string;
  displayName: string;
  status: SecurityUserStatus;
  createdAt: number;
  updatedAt: number;
}

export interface SecurityRole {
  id: SecurityRoleId;
  name: string;
  description: string;
  permissionKeys: SecurityPermissionKey[];
  createdAt: number;
  updatedAt: number;
}

export interface SecuritySession {
  id: string;
  userId: string;
  roleId: SecurityRoleId;
  state: SecuritySessionState;
  createdAt: number;
  expiresAt: number | null;
  lastSeenAt: number;
  revokedAt: number | null;
}

export interface SecurityAclGrant {
  id: string;
  subjectType: 'user' | 'role';
  subjectId: string;
  resourceType: string;
  resourceId: string | null;
  permissionKey: SecurityPermissionKey;
  effect: 'allow' | 'deny';
  createdAt: number;
  expiresAt: number | null;
}

export interface SecurityState {
  activeUser: SecurityUser;
  activeSession: SecuritySession;
  activeRole: SecurityRole;
  roles: SecurityRole[];
  aclGrants: SecurityAclGrant[];
  permissionKeys: SecurityPermissionKey[];
  deniedCount: number;
}

export interface NavTab {
  id: string;
  label: string;
  title?: string;
  stage: ModuleStage;
  status?: ModuleStage;
  uiState?: UiStatusState;
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
  uiState?: UiStatusState;
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
  | 'chat'
  | 'models'
  | 'knowledge'
  | 'tools'
  | 'gateway'
  | 'data'
  | 'settings';

export type TranslationParams = Record<string, string | number | boolean | null | undefined>;

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

export interface ProviderModelOption {
  id: string;
  name: string;
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
  clientRequestId?: string;
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

export interface ProviderHealthRecord {
  id: string;
  providerId: string;
  modelId: string | null;
  status: HealthStatus;
  latencyMs: number | null;
  source: 'provider-test' | 'chat' | 'gateway' | 'manual';
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: number;
}

export interface FeedbackItem {
  id: string;
  label: ObservabilityFeedbackLabel;
  messageId: string | null;
  requestLogId: string | null;
  notes: string | null;
  metadataJson: string | null;
  createdAt: number;
}

export interface FeedbackCreateInput {
  label: ObservabilityFeedbackLabel;
  messageId?: string | null;
  requestLogId?: string | null;
  notes?: string | null;
}

export interface EvalSet {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  expectedKeywordsJson: string;
  status: ObservabilityEvalStatus;
  createdAt: number;
  updatedAt: number;
}

export interface EvalResult {
  id: string;
  evalSetId: string;
  providerId: string | null;
  modelId: string | null;
  requestLogId: string | null;
  status: ObservabilityEvalStatus;
  score: number | null;
  latencyMs: number | null;
  outputPreview: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: number;
}

export interface EvalRunInput {
  evalSetId: string;
  modelId?: string | null;
}

export interface ObservabilityExportResult {
  id: string;
  redacted: boolean;
  content: string;
  summary: ObservabilitySummary;
  createdAt: number;
}

export interface ObservabilitySnapshot {
  summary: ObservabilitySummary;
  query: Required<ObservabilityQueryInput>;
  requestLogs: RequestLog[];
  gatewayLogs: GatewayLog[];
  usageRecords: UsageRecord[];
  auditLogs: AuditLog[];
  executionTraceEvents: ExecutionTraceEvent[];
  knowledgeRetrievals: KnowledgeRetrievalTrace[];
  providerHealthRecords: ProviderHealthRecord[];
  feedbackItems: FeedbackItem[];
  evalSets: EvalSet[];
  evalResults: EvalResult[];
  privacy: ObservabilityPrivacySettings;
}

export interface GatewayStatus {
  enabled: boolean;
  running: boolean;
  listenerState: 'stopped' | 'starting' | 'listening' | 'error';
  port: number;
  bindHost: string;
  endpoints: string[];
  recentError: string | null;
  lastStartError: string | null;
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
  conflictStrategy?: DataConflictStrategy;
  confirmationPhrase?: string;
}

export interface RestoreSnapshotOptions {
  mode?: 'preflight' | 'rollback';
  confirmationPhrase?: string;
}

export interface DataExportOptions {
  profile?: DataBackupProfile;
}

export interface DataBackupCreateInput {
  profile?: DataBackupProfile;
  passphrase: string;
}

export interface DataRestorePreflightInput {
  backupId?: string;
  packageText?: string;
  passphrase?: string;
}

export interface DataRollbackInput {
  rollbackId: string;
  confirmationPhrase?: string;
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
  parseStatus: KnowledgeParseStatus;
  indexStatus: KnowledgeIndexStatus;
  embeddingStatus: KnowledgeEmbeddingStatus;
  parserType: KnowledgeParserType;
  chunkCount: number;
  tokenCount: number;
  contentHash: string | null;
  storageRef: string | null;
  metadataJson: string | null;
  errorMessage: string | null;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeChunk {
  id: string;
  fileId: string;
  knowledgeBaseId: string | null;
  content: string;
  citation: string;
  position: number;
  tokenCount: number;
  contentHash: string | null;
  sourceStart: number | null;
  sourceEnd: number | null;
  pageNumber: number | null;
  sectionTitle: string | null;
  status: KnowledgeChunkStatus;
  embeddingId: string | null;
  metadataJson: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeEmbedding {
  id: string;
  chunkId: string;
  providerId: string | null;
  modelId: string | null;
  modelNameSnapshot: string;
  strategy: KnowledgeRetrievalStrategy;
  dimension: number;
  vectorJson: string;
  vectorHash: string;
  status: KnowledgeEmbeddingStatus;
  createdAt: number;
}

export interface KnowledgeRetrievalTrace {
  id: string;
  query: string;
  strategy: KnowledgeRetrievalStrategy;
  topK: number;
  selectedChunkIdsJson: string;
  resultCount: number;
  fallbackReason: string | null;
  createdAt: number;
}

export interface KnowledgeCitation {
  id: string;
  retrievalId: string | null;
  messageId: string | null;
  requestLogId: string | null;
  fileId: string;
  chunkId: string;
  fileName: string;
  citation: string;
  snippet: string;
  score: number;
  strategy: KnowledgeRetrievalStrategy;
  fallbackReason: string | null;
  createdAt: number;
}

export interface KnowledgeImportInput {
  name: string;
  type?: string;
  size?: number;
  content: string;
}

export interface KnowledgeRebuildInput {
  fileId: string;
}

export interface KnowledgeDeleteInput {
  fileId: string;
}

export interface KnowledgeRetrievalInput {
  query: string;
  topK?: number;
  strategy?: KnowledgeRetrievalStrategy;
}

export interface KnowledgeRetrievalResult {
  trace: KnowledgeRetrievalTrace;
  citations: KnowledgeCitation[];
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

export type ToolKind = 'fixture' | 'mcp' | 'workflow';
export type ToolRiskLevel = 'read' | 'write' | 'dangerous';
export type ExecutionRunKind = 'agent' | 'tool' | 'mcp-tool' | 'workflow';
export type ExecutionRunStatus = 'planned' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
export type ExecutionStepStatus = 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
export type ExecutionMode = 'preview' | 'execute';
export type ExecutionTraceEventType =
  | 'run_planned'
  | 'permission_checked'
  | 'approval_requested'
  | 'approval_decided'
  | 'step_started'
  | 'tool_called'
  | 'step_completed'
  | 'step_failed'
  | 'run_completed'
  | 'run_failed'
  | 'run_cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  kind: ToolKind;
  permissionKey: string;
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
  enabled: boolean;
  inputSchemaJson: string;
  outputSchemaJson: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionRun {
  id: string;
  kind: ExecutionRunKind;
  status: ExecutionRunStatus;
  mode: ExecutionMode;
  title: string;
  agentId: string | null;
  toolId: string | null;
  mcpServerId: string | null;
  workflowId: string | null;
  inputJson: string | null;
  outputJson: string | null;
  errorMessage: string | null;
  approvalStatus: ApprovalStatus | null;
  sandboxMode: 'read-only' | 'fixture-only' | 'blocked';
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface ExecutionStep {
  id: string;
  runId: string;
  parentStepId: string | null;
  kind: 'plan' | 'permission' | 'approval' | 'tool' | 'workflow-node' | 'recovery';
  title: string;
  status: ExecutionStepStatus;
  toolId: string | null;
  mcpServerId: string | null;
  inputJson: string | null;
  outputJson: string | null;
  errorMessage: string | null;
  position: number;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionTraceEvent {
  id: string;
  runId: string;
  stepId: string | null;
  eventType: ExecutionTraceEventType;
  message: string;
  metadataJson: string | null;
  createdAt: number;
}

export interface ApprovalRequest {
  id: string;
  runId: string;
  stepId: string | null;
  status: ApprovalStatus;
  requestedAction: string;
  riskLevel: ToolRiskLevel;
  reason: string;
  decisionReason: string | null;
  decidedAt: number | null;
  createdAt: number;
  expiresAt: number | null;
}

export interface ExecutionStartInput {
  kind: ExecutionRunKind;
  mode?: ExecutionMode;
  agentId?: string;
  toolId?: string;
  mcpServerId?: string;
  workflowId?: string;
  inputJson?: string;
}

export interface ApprovalDecisionInput {
  approvalId: string;
  decision: 'approved' | 'denied';
  reason?: string | null;
}

export interface ImportExportResult {
  id: string;
  action: 'import' | 'export' | 'snapshot' | 'cleanup-preview' | 'encrypted-backup' | 'restore-preflight' | 'rollback' | 'migration';
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

export interface DataConflictRecord {
  id: string;
  jobId: string;
  type: DataConflictType;
  entityKind: 'provider' | 'model' | 'workspace' | 'secret';
  localId: string | null;
  importName: string;
  strategy: DataConflictStrategy;
  resolved: boolean;
  createdAt: number;
}

export interface DataMobilityJob {
  id: string;
  operationKind: DataOperationKind;
  status: DataJobStatus;
  source: string | null;
  manifestVersion: string;
  profile: DataBackupProfile | null;
  summary: string;
  manifestHash: string | null;
  manifestJson: string | null;
  conflictCount: number;
  requiresConfirmation: boolean;
  encrypted: boolean;
  redacted: boolean;
  rollbackRecordId: string | null;
  relatedSnapshotId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DataBackupRecord {
  id: string;
  jobId: string;
  profile: DataBackupProfile;
  encrypted: boolean;
  redacted: boolean;
  manifestHash: string;
  packageJson: string;
  createdAt: number;
}

export interface MigrationRun {
  id: string;
  version: DataMigrationVersion;
  status: DataJobStatus;
  summary: string;
  createdAt: number;
  completedAt: number | null;
}

export interface RollbackRecord {
  id: string;
  jobId: string;
  rollbackSnapshotId: string | null;
  state: DataRollbackState;
  affectedEntityIdsJson: string;
  appliedAt: number | null;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  targetType: string;
  targetId: string | null;
  detailsJson: string | null;
  permissionKey: SecurityPermissionKey | null;
  previousHash: string | null;
  entryHash: string | null;
  integrityState: AuditIntegrityStatus;
  createdAt: number;
}

export interface AuditIntegrityReport {
  status: AuditIntegrityStatus;
  checkedAt: number;
  checkedCount: number;
  firstBrokenAuditId: string | null;
  lastHash: string | null;
}

export interface AuditExportResult {
  id: string;
  redacted: boolean;
  content: string;
  integrity: AuditIntegrityReport;
  createdAt: number;
}

export interface UiPreferences {
  theme: ThemeMode;
  density: 'comfortable' | 'compact';
  fontMode: 'system' | 'kaiti';
  language: 'zh-CN' | 'en-US';
  reducedMotion: boolean;
  advancedMode: boolean;
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
  providerHealthRecords: ProviderHealthRecord[];
  feedbackItems: FeedbackItem[];
  evalSets: EvalSet[];
  evalResults: EvalResult[];
  observability: ObservabilitySnapshot;
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
  security: SecurityState;
  auditIntegrity: AuditIntegrityReport;
  uiPreferences: UiPreferences;
}
