import type {
  AgentDefinition,
  ApprovalDecisionInput,
  AppSnapshot,
  AuditExportResult,
  AuditIntegrityReport,
  AuditLog,
  AuditLogPageInput,
  ChatResponse,
  CompareModelsInput,
  CompareModelsResponse,
  Conversation,
  ConversationExport,
  ConversationPageInput,
  ExportConversationInput,
  ExecutionRun,
  ExecutionStartInput,
  GatewayApiKey,
  GatewayKeyCreated,
  GatewayKeyCreateInput,
  GatewayKeyRotateInput,
  GatewayKeyUpdateInput,
  GatewayLog,
  GatewayLogPageInput,
  GatewayStatus,
  ImportExportResult,
  DataBackupCreateInput,
  DataBackupRecord,
  DataExportOptions,
  DataMobilityJob,
  DataRestorePreflightInput,
  DataRollbackInput,
  EvalResult,
  EvalRunInput,
  FeedbackCreateInput,
  FeedbackItem,
  KnowledgeDeleteInput,
  KnowledgeFile,
  KnowledgeFilePageInput,
  KnowledgeChunk,
  KnowledgeChunkPageInput,
  KnowledgeImportInput,
  KnowledgeRebuildInput,
  KnowledgeRetrievalInput,
  KnowledgeRetrievalResult,
  McpServer,
  Message,
  MessagePageInput,
  Model,
  ModelInput,
  Provider,
  ProviderDiscoveryRequest,
  ProviderDiscoveryResult,
  ProviderInput,
  ProviderModelOption,
  ProviderSaveFromDiscoveryRequest,
  ProviderSaveFromDiscoveryResult,
  SendMessageInput,
  UiPreferences,
  CancelMessageInput,
  RegenerateMessageInput,
  RestoreSnapshotOptions,
  RetryMessageInput,
  ImportPlanApplyOptions,
  ObservabilityExportResult,
  ObservabilityPrivacySettings,
  ObservabilityQueryInput,
  ObservabilitySnapshot,
  PageResult,
  TaskCancelResult,
  UsageTrendBucket,
  UsageTrendInput,
} from './types.js';
import type { IpcEventChannel, IpcEventPayloads } from './ipc.js';

export type AppEventHandler<C extends IpcEventChannel = IpcEventChannel> = (payload: IpcEventPayloads[C]) => void;
export type AppEventUnsubscribe = () => void;

export interface AppApi {
  getSnapshot(): Promise<AppSnapshot>;
  discoverProvider(input: ProviderDiscoveryRequest): Promise<ProviderDiscoveryResult>;
  saveProviderFromDiscovery(input: ProviderSaveFromDiscoveryRequest): Promise<ProviderSaveFromDiscoveryResult>;
  createProvider(input: ProviderInput): Promise<Provider>;
  deleteProvider(providerId: string): Promise<Provider>;
  fetchProviderModels(providerId: string): Promise<ProviderModelOption[]>;
  createModel(input: ModelInput): Promise<Model>;
  testProvider(providerId: string): Promise<Provider>;
  sendMessage(input: SendMessageInput): Promise<ChatResponse>;
  retryMessage(input: RetryMessageInput): Promise<ChatResponse>;
  regenerateMessage(input: RegenerateMessageInput): Promise<ChatResponse>;
  cancelMessage(input: CancelMessageInput): Promise<ChatResponse>;
  compareModels(input: CompareModelsInput): Promise<CompareModelsResponse>;
  exportConversation(input: ExportConversationInput): Promise<ConversationExport>;
  createConversation(title?: string): Promise<Conversation>;
  listConversations(input?: ConversationPageInput): Promise<PageResult<Conversation>>;
  listMessages(input: MessagePageInput): Promise<PageResult<Message>>;
  listGatewayLogs(input?: GatewayLogPageInput): Promise<PageResult<GatewayLog>>;
  listAuditLogs(input?: AuditLogPageInput): Promise<PageResult<AuditLog>>;
  listKnowledgeFiles(input?: KnowledgeFilePageInput): Promise<PageResult<KnowledgeFile>>;
  listKnowledgeChunks(input?: KnowledgeChunkPageInput): Promise<PageResult<KnowledgeChunk>>;
  getUsageTrend(input?: UsageTrendInput): Promise<UsageTrendBucket[]>;
  cancelTask(taskId: string): Promise<TaskCancelResult>;
  updateConversationFlags(
    conversationId: string,
    flags: Partial<Pick<Conversation, 'isPinned' | 'isFavorite' | 'status'>>,
  ): Promise<Conversation>;
  createGatewayKey(input: GatewayKeyCreateInput): Promise<GatewayKeyCreated>;
  updateGatewayKey(input: GatewayKeyUpdateInput): Promise<GatewayApiKey>;
  rotateGatewayKey(input: GatewayKeyRotateInput): Promise<GatewayKeyCreated>;
  revokeGatewayKey(gatewayKeyId: string): Promise<GatewayApiKey>;
  toggleGateway(enabled: boolean): Promise<GatewayStatus>;
  saveUiPreferences(preferences: UiPreferences): Promise<UiPreferences>;
  createKnowledgeFile(input: KnowledgeImportInput): Promise<KnowledgeFile>;
  retryKnowledgeFile(input: KnowledgeRebuildInput): Promise<KnowledgeFile>;
  rebuildKnowledgeFile(input: KnowledgeRebuildInput): Promise<KnowledgeFile>;
  deleteKnowledgeFile(input: KnowledgeDeleteInput): Promise<KnowledgeFile>;
  previewKnowledgeRetrieval(input: KnowledgeRetrievalInput): Promise<KnowledgeRetrievalResult>;
  createMcpServer(name: string, transport: McpServer['transport'], commandOrUrl: string): Promise<McpServer>;
  updateMcpPermission(serverId: string, permissionState: McpServer['permissionState']): Promise<McpServer>;
  createAgent(name: string, goal: string): Promise<AgentDefinition>;
  previewAgentRun(agentId: string): Promise<ExecutionRun>;
  startExecutionRun(input: ExecutionStartInput): Promise<ExecutionRun>;
  decideApproval(input: ApprovalDecisionInput): Promise<ExecutionRun>;
  validateImportManifest(manifestText: string): Promise<ImportExportResult>;
  applyImportPlan(resultId: string, options?: ImportPlanApplyOptions): Promise<ImportExportResult>;
  restoreSnapshot(snapshotId: string, options?: RestoreSnapshotOptions): Promise<ImportExportResult>;
  createSnapshot(): Promise<ImportExportResult>;
  exportDiagnostics(): Promise<ImportExportResult>;
  exportDataPackage(options?: DataExportOptions): Promise<ImportExportResult>;
  createEncryptedBackup(input: DataBackupCreateInput): Promise<DataBackupRecord>;
  createRestorePreflight(input: DataRestorePreflightInput): Promise<DataMobilityJob>;
  applyDataRollback(input: DataRollbackInput): Promise<DataMobilityJob>;
  queryObservability(input?: ObservabilityQueryInput): Promise<ObservabilitySnapshot>;
  createFeedback(input: FeedbackCreateInput): Promise<FeedbackItem>;
  runEvaluation(input: EvalRunInput): Promise<EvalResult>;
  saveObservabilityPrivacy(input: Partial<ObservabilityPrivacySettings>): Promise<ObservabilityPrivacySettings>;
  exportObservability(input?: ObservabilityQueryInput): Promise<ObservabilityExportResult>;
  searchAuditLogs(query?: string): Promise<AuditLog[]>;
  verifyAuditIntegrity(): Promise<AuditIntegrityReport>;
  exportAuditLogs(): Promise<AuditExportResult>;
  openLogs(): Promise<void>;
  subscribe<C extends IpcEventChannel>(channel: C, handler: AppEventHandler<C>): AppEventUnsubscribe;
}

export const APP_API_METHODS = [
  'getSnapshot',
  'discoverProvider',
  'saveProviderFromDiscovery',
  'createProvider',
  'deleteProvider',
  'fetchProviderModels',
  'createModel',
  'testProvider',
  'sendMessage',
  'retryMessage',
  'regenerateMessage',
  'cancelMessage',
  'compareModels',
  'exportConversation',
  'createConversation',
  'listConversations',
  'listMessages',
  'listGatewayLogs',
  'listAuditLogs',
  'listKnowledgeFiles',
  'listKnowledgeChunks',
  'getUsageTrend',
  'cancelTask',
  'updateConversationFlags',
  'createGatewayKey',
  'updateGatewayKey',
  'rotateGatewayKey',
  'revokeGatewayKey',
  'toggleGateway',
  'saveUiPreferences',
  'createKnowledgeFile',
  'retryKnowledgeFile',
  'rebuildKnowledgeFile',
  'deleteKnowledgeFile',
  'previewKnowledgeRetrieval',
  'createMcpServer',
  'updateMcpPermission',
  'createAgent',
  'previewAgentRun',
  'startExecutionRun',
  'decideApproval',
  'validateImportManifest',
  'applyImportPlan',
  'restoreSnapshot',
  'createSnapshot',
  'exportDiagnostics',
  'exportDataPackage',
  'createEncryptedBackup',
  'createRestorePreflight',
  'applyDataRollback',
  'queryObservability',
  'createFeedback',
  'runEvaluation',
  'saveObservabilityPrivacy',
  'exportObservability',
  'searchAuditLogs',
  'verifyAuditIntegrity',
  'exportAuditLogs',
  'openLogs',
  'subscribe',
] as const satisfies readonly (keyof AppApi)[];

declare global {
  interface Window {
    nexachat?: AppApi;
  }
}
