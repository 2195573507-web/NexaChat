import { ipcMain } from 'electron';
import { store } from './services/store.js';
import { startLocalGateway, stopLocalGateway } from './services/localGateway.js';
import type { ModelInput, ProviderInput, SendMessageInput, UiPreferences } from '../shared/types.js';

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
  ipcMain.handle('mcp:createServer', (_event, name: string, transport, commandOrUrl: string) =>
    store.createMcpServer(name, transport, commandOrUrl),
  );
  ipcMain.handle('agent:create', (_event, name: string, goal: string) => store.createAgent(name, goal));
  ipcMain.handle('data:createSnapshot', () => store.createSnapshot());
  ipcMain.handle('data:exportDiagnostics', () => store.exportDiagnostics());
}
