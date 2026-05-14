import { contextBridge, ipcRenderer } from 'electron';
import type { AppApi, ModelInput, ProviderInput, SendMessageInput, UiPreferences } from '../shared/types.js';

const api: AppApi = {
  getSnapshot: () => ipcRenderer.invoke('app:getSnapshot'),
  createProvider: (input: ProviderInput) => ipcRenderer.invoke('provider:create', input),
  createModel: (input: ModelInput) => ipcRenderer.invoke('model:create', input),
  testProvider: (providerId: string) => ipcRenderer.invoke('provider:test', providerId),
  sendMessage: (input: SendMessageInput) => ipcRenderer.invoke('chat:sendMessage', input),
  createConversation: (title?: string) => ipcRenderer.invoke('chat:createConversation', title),
  updateConversationFlags: (conversationId, flags) => ipcRenderer.invoke('chat:updateConversationFlags', conversationId, flags),
  createGatewayKey: (name: string) => ipcRenderer.invoke('gateway:createKey', name),
  revokeGatewayKey: (gatewayKeyId: string) => ipcRenderer.invoke('gateway:revokeKey', gatewayKeyId),
  toggleGateway: (enabled: boolean) => ipcRenderer.invoke('gateway:toggle', enabled),
  saveUiPreferences: (preferences: UiPreferences) => ipcRenderer.invoke('settings:saveUiPreferences', preferences),
  createKnowledgeFile: (name: string, type: string, size: number) => ipcRenderer.invoke('knowledge:createFile', name, type, size),
  retryKnowledgeFile: (fileId: string) => ipcRenderer.invoke('knowledge:retryFile', fileId),
  createMcpServer: (name, transport, commandOrUrl) => ipcRenderer.invoke('mcp:createServer', name, transport, commandOrUrl),
  updateMcpPermission: (serverId, permissionState) => ipcRenderer.invoke('mcp:updatePermission', serverId, permissionState),
  createAgent: (name: string, goal: string) => ipcRenderer.invoke('agent:create', name, goal),
  previewAgentRun: (agentId: string) => ipcRenderer.invoke('agent:previewRun', agentId),
  validateImportManifest: (manifestText: string) => ipcRenderer.invoke('data:validateImportManifest', manifestText),
  applyImportPlan: (resultId: string) => ipcRenderer.invoke('data:applyImportPlan', resultId),
  restoreSnapshot: (snapshotId: string) => ipcRenderer.invoke('data:restoreSnapshot', snapshotId),
  createSnapshot: () => ipcRenderer.invoke('data:createSnapshot'),
  exportDiagnostics: () => ipcRenderer.invoke('data:exportDiagnostics'),
  openLogs: () => ipcRenderer.invoke('system:openLogs'),
};

contextBridge.exposeInMainWorld('nexachat', api);
