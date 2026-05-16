import type {
  AgentDefinition,
  ApprovalDecisionInput,
  AppSnapshot,
  ChatResponse,
  CompareModelsInput,
  CompareModelsResponse,
  Conversation,
  ConversationExport,
  ExportConversationInput,
  ExecutionRun,
  ExecutionStartInput,
  GatewayApiKey,
  GatewayKeyCreated,
  GatewayKeyCreateInput,
  GatewayKeyRotateInput,
  GatewayKeyUpdateInput,
  GatewayStatus,
  ImportExportResult,
  KnowledgeDeleteInput,
  KnowledgeFile,
  KnowledgeImportInput,
  KnowledgeRebuildInput,
  KnowledgeRetrievalInput,
  KnowledgeRetrievalResult,
  McpServer,
  Model,
  ModelInput,
  Provider,
  ProviderInput,
  SendMessageInput,
  UiPreferences,
  CancelMessageInput,
  RegenerateMessageInput,
  RestoreSnapshotOptions,
  RetryMessageInput,
  ImportPlanApplyOptions,
} from './types.js';

export interface AppApi {
  getSnapshot(): Promise<AppSnapshot>;
  createProvider(input: ProviderInput): Promise<Provider>;
  createModel(input: ModelInput): Promise<Model>;
  testProvider(providerId: string): Promise<Provider>;
  sendMessage(input: SendMessageInput): Promise<ChatResponse>;
  retryMessage(input: RetryMessageInput): Promise<ChatResponse>;
  regenerateMessage(input: RegenerateMessageInput): Promise<ChatResponse>;
  cancelMessage(input: CancelMessageInput): Promise<ChatResponse>;
  compareModels(input: CompareModelsInput): Promise<CompareModelsResponse>;
  exportConversation(input: ExportConversationInput): Promise<ConversationExport>;
  createConversation(title?: string): Promise<Conversation>;
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
  openLogs(): Promise<void>;
}

export const APP_API_METHODS = [
  'getSnapshot',
  'createProvider',
  'createModel',
  'testProvider',
  'sendMessage',
  'retryMessage',
  'regenerateMessage',
  'cancelMessage',
  'compareModels',
  'exportConversation',
  'createConversation',
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
  'openLogs',
] as const satisfies readonly (keyof AppApi)[];

declare global {
  interface Window {
    nexachat?: AppApi;
  }
}
