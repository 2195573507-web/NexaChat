import { app, ipcMain, shell } from 'electron';
import { store } from './services/store.js';
import { startLocalGateway, stopLocalGateway } from './services/localGateway.js';
import type { McpServer, ModelInput, ProviderInput, SendMessageInput, UiPreferences } from '../shared/types.js';

export function registerIpcHandlers(): void {
  ipcMain.handle('app:getSnapshot', () => store.getSnapshot());
  ipcMain.handle('provider:create', (_event, input: ProviderInput) => store.createProvider(input));
  ipcMain.handle('provider:test', (_event, providerId: string) => store.testProvider(providerId));
  ipcMain.handle('model:create', (_event, input: ModelInput) => store.createModel(input));
  ipcMain.handle('chat:createConversation', (_event, title?: string) => store.createConversation(title));
  ipcMain.handle('chat:sendMessage', (_event, input: SendMessageInput) => store.sendMessage(input));
  ipcMain.handle('chat:updateConversationFlags', (_event, conversationId: string, flags) =>
    store.updateConversationFlags(conversationId, flags),
  );
  ipcMain.handle('gateway:createKey', (_event, name: string) => store.createGatewayKey(name));
  ipcMain.handle('gateway:revokeKey', (_event, gatewayKeyId: string) => store.revokeGatewayKey(gatewayKeyId));
  ipcMain.handle('gateway:toggle', async (_event, enabled: boolean) => {
    if (enabled) {
      await startLocalGateway();
      store.toggleGateway(true);
    } else {
      await stopLocalGateway();
      store.toggleGateway(false);
    }
    return store.getGatewayStatus();
  });
  ipcMain.handle('settings:saveUiPreferences', (_event, preferences: UiPreferences) => store.saveUiPreferences(preferences));
  ipcMain.handle('knowledge:createFile', (_event, name: string, type: string, size: number) =>
    store.createKnowledgeFile(name, type, size),
  );
  ipcMain.handle('knowledge:retryFile', (_event, fileId: string) => store.retryKnowledgeFile(fileId));
  ipcMain.handle('mcp:createServer', (_event, name: string, transport, commandOrUrl: string) =>
    store.createMcpServer(name, transport, commandOrUrl),
  );
  ipcMain.handle('mcp:updatePermission', (_event, serverId: string, permissionState: McpServer['permissionState']) =>
    store.updateMcpPermission(serverId, permissionState),
  );
  ipcMain.handle('agent:create', (_event, name: string, goal: string) => store.createAgent(name, goal));
  ipcMain.handle('agent:previewRun', (_event, agentId: string) => store.previewAgentRun(agentId));
  ipcMain.handle('data:validateImportManifest', (_event, manifestText: string) => store.validateImportManifest(manifestText));
  ipcMain.handle('data:applyImportPlan', (_event, resultId: string) => store.applyImportPlan(resultId));
  ipcMain.handle('data:restoreSnapshot', (_event, snapshotId: string) => store.restoreSnapshot(snapshotId));
  ipcMain.handle('data:createSnapshot', () => store.createSnapshot());
  ipcMain.handle('data:exportDiagnostics', () => store.exportDiagnostics());
  ipcMain.handle('system:openLogs', async () => {
    await shell.openPath(app.getPath('logs'));
  });
}
