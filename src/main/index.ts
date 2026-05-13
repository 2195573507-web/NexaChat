import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc.js';
import { closeDatabase } from './database/connection.js';
import { stopLocalGateway } from './services/localGateway.js';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const currentDir = fileURLToPath(new URL('.', import.meta.url));

registerIpcHandlers();

async function createMainWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    title: 'NexaChat',
    show: false,
    backgroundColor: '#F7F8FA',
    webPreferences: {
      preload: join(currentDir, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    await window.loadFile(join(currentDir, '../../dist/index.html'));
  }
}

app.setName('NexaChat');

app.whenReady().then(async () => {
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  void stopLocalGateway();
  closeDatabase();
});
