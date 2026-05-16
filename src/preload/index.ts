import { contextBridge, ipcRenderer } from 'electron';
import type { AppApi } from '../shared/api.js';
import { IPC_CHANNELS, type IpcChannel, type IpcInvokeArgs } from '../shared/ipc.js';
import type {
  CancelMessageInput,
  CompareModelsInput,
  ExportConversationInput,
  GatewayKeyCreateInput,
  GatewayKeyRotateInput,
  GatewayKeyUpdateInput,
  KnowledgeDeleteInput,
  KnowledgeImportInput,
  KnowledgeRebuildInput,
  KnowledgeRetrievalInput,
  ModelInput,
  ProviderInput,
  RegenerateMessageInput,
  RetryMessageInput,
  SendMessageInput,
  UiPreferences,
  ImportPlanApplyOptions,
  RestoreSnapshotOptions,
} from '../shared/types.js';

function invoke<C extends IpcChannel>(channel: C, ...args: IpcInvokeArgs[C]) {
  return ipcRenderer.invoke(channel, ...args);
}

const api: AppApi = {
  getSnapshot: () => invoke(IPC_CHANNELS.appGetSnapshot),
  createProvider: (input: ProviderInput) => invoke(IPC_CHANNELS.providerCreate, input),
  createModel: (input: ModelInput) => invoke(IPC_CHANNELS.modelCreate, input),
  testProvider: (providerId: string) => invoke(IPC_CHANNELS.providerTest, providerId),
  sendMessage: (input: SendMessageInput) => invoke(IPC_CHANNELS.chatSendMessage, input),
  retryMessage: (input: RetryMessageInput) => invoke(IPC_CHANNELS.chatRetryMessage, input),
  regenerateMessage: (input: RegenerateMessageInput) => invoke(IPC_CHANNELS.chatRegenerateMessage, input),
  cancelMessage: (input: CancelMessageInput) => invoke(IPC_CHANNELS.chatCancelMessage, input),
  compareModels: (input: CompareModelsInput) => invoke(IPC_CHANNELS.chatCompareModels, input),
  exportConversation: (input: ExportConversationInput) => invoke(IPC_CHANNELS.chatExportConversation, input),
  createConversation: (title?: string) => invoke(IPC_CHANNELS.chatCreateConversation, title),
  updateConversationFlags: (conversationId, flags) => invoke(IPC_CHANNELS.chatUpdateConversationFlags, conversationId, flags),
  createGatewayKey: (input: GatewayKeyCreateInput) => invoke(IPC_CHANNELS.gatewayCreateKey, input),
  updateGatewayKey: (input: GatewayKeyUpdateInput) => invoke(IPC_CHANNELS.gatewayUpdateKey, input),
  rotateGatewayKey: (input: GatewayKeyRotateInput) => invoke(IPC_CHANNELS.gatewayRotateKey, input),
  revokeGatewayKey: (gatewayKeyId: string) => invoke(IPC_CHANNELS.gatewayRevokeKey, gatewayKeyId),
  toggleGateway: (enabled: boolean) => invoke(IPC_CHANNELS.gatewayToggle, enabled),
  saveUiPreferences: (preferences: UiPreferences) => invoke(IPC_CHANNELS.settingsSaveUiPreferences, preferences),
  createKnowledgeFile: (input: KnowledgeImportInput) => invoke(IPC_CHANNELS.knowledgeCreateFile, input),
  retryKnowledgeFile: (input: KnowledgeRebuildInput) => invoke(IPC_CHANNELS.knowledgeRetryFile, input),
  rebuildKnowledgeFile: (input: KnowledgeRebuildInput) => invoke(IPC_CHANNELS.knowledgeRebuildFile, input),
  deleteKnowledgeFile: (input: KnowledgeDeleteInput) => invoke(IPC_CHANNELS.knowledgeDeleteFile, input),
  previewKnowledgeRetrieval: (input: KnowledgeRetrievalInput) => invoke(IPC_CHANNELS.knowledgePreviewRetrieval, input),
  createMcpServer: (name, transport, commandOrUrl) => invoke(IPC_CHANNELS.mcpCreateServer, name, transport, commandOrUrl),
  updateMcpPermission: (serverId, permissionState) => invoke(IPC_CHANNELS.mcpUpdatePermission, serverId, permissionState),
  createAgent: (name: string, goal: string) => invoke(IPC_CHANNELS.agentCreate, name, goal),
  previewAgentRun: (agentId: string) => invoke(IPC_CHANNELS.agentPreviewRun, agentId),
  validateImportManifest: (manifestText: string) => invoke(IPC_CHANNELS.dataValidateImportManifest, manifestText),
  applyImportPlan: (resultId: string, options?: ImportPlanApplyOptions) => invoke(IPC_CHANNELS.dataApplyImportPlan, resultId, options),
  restoreSnapshot: (snapshotId: string, options?: RestoreSnapshotOptions) => invoke(IPC_CHANNELS.dataRestoreSnapshot, snapshotId, options),
  createSnapshot: () => invoke(IPC_CHANNELS.dataCreateSnapshot),
  exportDiagnostics: () => invoke(IPC_CHANNELS.dataExportDiagnostics),
  openLogs: () => invoke(IPC_CHANNELS.systemOpenLogs),
};

contextBridge.exposeInMainWorld('nexachat', api);
