import { app, ipcMain, shell } from 'electron';
import { store } from './services/store.js';
import { startLocalGateway, stopLocalGateway } from './services/localGateway.js';
import { assertIpcPayload, IPC_CHANNELS, type IpcChannel } from '../shared/ipc.js';
import type { McpServer, ModelInput, ProviderInput, SendMessageInput, UiPreferences } from '../shared/types.js';

function handleIpc<C extends IpcChannel>(channel: C, handler: (...args: any[]) => unknown): void {
  ipcMain.handle(channel, (_event, ...args: unknown[]) => {
    assertIpcPayload(channel, args);
    return handler(...args);
  });
}

export function registerIpcHandlers(): void {
  handleIpc(IPC_CHANNELS.appGetSnapshot, () => store.getSnapshot());
  handleIpc(IPC_CHANNELS.providerCreate, (input: ProviderInput) => store.createProvider(input));
  handleIpc(IPC_CHANNELS.providerTest, (providerId: string) => store.testProvider(providerId));
  handleIpc(IPC_CHANNELS.modelCreate, (input: ModelInput) => store.createModel(input));
  handleIpc(IPC_CHANNELS.chatCreateConversation, (title?: string) => store.createConversation(title));
  handleIpc(IPC_CHANNELS.chatSendMessage, (input: SendMessageInput) => store.sendMessage(input));
  handleIpc(IPC_CHANNELS.chatUpdateConversationFlags, (conversationId: string, flags) =>
    store.updateConversationFlags(conversationId, flags),
  );
  handleIpc(IPC_CHANNELS.gatewayCreateKey, (name: string) => store.createGatewayKey(name));
  handleIpc(IPC_CHANNELS.gatewayRevokeKey, (gatewayKeyId: string) => store.revokeGatewayKey(gatewayKeyId));
  handleIpc(IPC_CHANNELS.gatewayToggle, async (enabled: boolean) => {
    if (enabled) {
      await startLocalGateway();
      store.toggleGateway(true);
    } else {
      await stopLocalGateway();
      store.toggleGateway(false);
    }
    return store.getGatewayStatus();
  });
  handleIpc(IPC_CHANNELS.settingsSaveUiPreferences, (preferences: UiPreferences) => store.saveUiPreferences(preferences));
  handleIpc(IPC_CHANNELS.knowledgeCreateFile, (name: string, type: string, size: number) =>
    store.createKnowledgeFile(name, type, size),
  );
  handleIpc(IPC_CHANNELS.knowledgeRetryFile, (fileId: string) => store.retryKnowledgeFile(fileId));
  handleIpc(IPC_CHANNELS.mcpCreateServer, (name: string, transport, commandOrUrl: string) =>
    store.createMcpServer(name, transport, commandOrUrl),
  );
  handleIpc(IPC_CHANNELS.mcpUpdatePermission, (serverId: string, permissionState: McpServer['permissionState']) =>
    store.updateMcpPermission(serverId, permissionState),
  );
  handleIpc(IPC_CHANNELS.agentCreate, (name: string, goal: string) => store.createAgent(name, goal));
  handleIpc(IPC_CHANNELS.agentPreviewRun, (agentId: string) => store.previewAgentRun(agentId));
  handleIpc(IPC_CHANNELS.dataValidateImportManifest, (manifestText: string) => store.validateImportManifest(manifestText));
  handleIpc(IPC_CHANNELS.dataApplyImportPlan, (resultId: string) => store.applyImportPlan(resultId));
  handleIpc(IPC_CHANNELS.dataRestoreSnapshot, (snapshotId: string) => store.restoreSnapshot(snapshotId));
  handleIpc(IPC_CHANNELS.dataCreateSnapshot, () => store.createSnapshot());
  handleIpc(IPC_CHANNELS.dataExportDiagnostics, () => store.exportDiagnostics());
  handleIpc(IPC_CHANNELS.systemOpenLogs, async () => {
    await shell.openPath(app.getPath('logs'));
  });
}
