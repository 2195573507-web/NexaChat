import { contextBridge, ipcRenderer } from 'electron';
import type { AppApi } from '../shared/api.js';
import { IPC_CHANNELS, type IpcChannel, type IpcInvokeArgs } from '../shared/ipc.js';
import type { ModelInput, ProviderInput, SendMessageInput, UiPreferences } from '../shared/types.js';

function invoke<C extends IpcChannel>(channel: C, ...args: IpcInvokeArgs[C]) {
  return ipcRenderer.invoke(channel, ...args);
}

const api: AppApi = {
  getSnapshot: () => invoke(IPC_CHANNELS.appGetSnapshot),
  createProvider: (input: ProviderInput) => invoke(IPC_CHANNELS.providerCreate, input),
  createModel: (input: ModelInput) => invoke(IPC_CHANNELS.modelCreate, input),
  testProvider: (providerId: string) => invoke(IPC_CHANNELS.providerTest, providerId),
  sendMessage: (input: SendMessageInput) => invoke(IPC_CHANNELS.chatSendMessage, input),
  createConversation: (title?: string) => invoke(IPC_CHANNELS.chatCreateConversation, title),
  updateConversationFlags: (conversationId, flags) => invoke(IPC_CHANNELS.chatUpdateConversationFlags, conversationId, flags),
  createGatewayKey: (name: string) => invoke(IPC_CHANNELS.gatewayCreateKey, name),
  revokeGatewayKey: (gatewayKeyId: string) => invoke(IPC_CHANNELS.gatewayRevokeKey, gatewayKeyId),
  toggleGateway: (enabled: boolean) => invoke(IPC_CHANNELS.gatewayToggle, enabled),
  saveUiPreferences: (preferences: UiPreferences) => invoke(IPC_CHANNELS.settingsSaveUiPreferences, preferences),
  createKnowledgeFile: (name: string, type: string, size: number) => invoke(IPC_CHANNELS.knowledgeCreateFile, name, type, size),
  retryKnowledgeFile: (fileId: string) => invoke(IPC_CHANNELS.knowledgeRetryFile, fileId),
  createMcpServer: (name, transport, commandOrUrl) => invoke(IPC_CHANNELS.mcpCreateServer, name, transport, commandOrUrl),
  updateMcpPermission: (serverId, permissionState) => invoke(IPC_CHANNELS.mcpUpdatePermission, serverId, permissionState),
  createAgent: (name: string, goal: string) => invoke(IPC_CHANNELS.agentCreate, name, goal),
  previewAgentRun: (agentId: string) => invoke(IPC_CHANNELS.agentPreviewRun, agentId),
  validateImportManifest: (manifestText: string) => invoke(IPC_CHANNELS.dataValidateImportManifest, manifestText),
  applyImportPlan: (resultId: string) => invoke(IPC_CHANNELS.dataApplyImportPlan, resultId),
  restoreSnapshot: (snapshotId: string) => invoke(IPC_CHANNELS.dataRestoreSnapshot, snapshotId),
  createSnapshot: () => invoke(IPC_CHANNELS.dataCreateSnapshot),
  exportDiagnostics: () => invoke(IPC_CHANNELS.dataExportDiagnostics),
  openLogs: () => invoke(IPC_CHANNELS.systemOpenLogs),
};

contextBridge.exposeInMainWorld('nexachat', api);
