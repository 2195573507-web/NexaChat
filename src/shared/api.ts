import type {
  AgentDefinition,
  AppSnapshot,
  ChatResponse,
  Conversation,
  GatewayApiKey,
  GatewayKeyCreated,
  GatewayStatus,
  ImportExportResult,
  KnowledgeFile,
  McpServer,
  Model,
  ModelInput,
  Provider,
  ProviderInput,
  SendMessageInput,
  UiPreferences,
} from './types.js';

export interface AppApi {
  getSnapshot(): Promise<AppSnapshot>;
  createProvider(input: ProviderInput): Promise<Provider>;
  createModel(input: ModelInput): Promise<Model>;
  testProvider(providerId: string): Promise<Provider>;
  sendMessage(input: SendMessageInput): Promise<ChatResponse>;
  createConversation(title?: string): Promise<Conversation>;
  updateConversationFlags(
    conversationId: string,
    flags: Partial<Pick<Conversation, 'isPinned' | 'isFavorite' | 'status'>>,
  ): Promise<Conversation>;
  createGatewayKey(name: string): Promise<GatewayKeyCreated>;
  revokeGatewayKey(gatewayKeyId: string): Promise<GatewayApiKey>;
  toggleGateway(enabled: boolean): Promise<GatewayStatus>;
  saveUiPreferences(preferences: UiPreferences): Promise<UiPreferences>;
  createKnowledgeFile(name: string, type: string, size: number): Promise<KnowledgeFile>;
  retryKnowledgeFile(fileId: string): Promise<KnowledgeFile>;
  createMcpServer(name: string, transport: McpServer['transport'], commandOrUrl: string): Promise<McpServer>;
  updateMcpPermission(serverId: string, permissionState: McpServer['permissionState']): Promise<McpServer>;
  createAgent(name: string, goal: string): Promise<AgentDefinition>;
  previewAgentRun(agentId: string): Promise<ImportExportResult>;
  validateImportManifest(manifestText: string): Promise<ImportExportResult>;
  applyImportPlan(resultId: string): Promise<ImportExportResult>;
  restoreSnapshot(snapshotId: string): Promise<ImportExportResult>;
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
  'createConversation',
  'updateConversationFlags',
  'createGatewayKey',
  'revokeGatewayKey',
  'toggleGateway',
  'saveUiPreferences',
  'createKnowledgeFile',
  'retryKnowledgeFile',
  'createMcpServer',
  'updateMcpPermission',
  'createAgent',
  'previewAgentRun',
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
