import { app, BrowserWindow, protocol, shell } from 'electron';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc.js';
import { closeDatabase } from './database/connection.js';
import { stopLocalGateway } from './services/localGateway.js';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const currentDir = fileURLToPath(new URL('.', import.meta.url));
const rendererDistDir = normalize(join(currentDir, '../../dist'));
const isElectronSmoke = process.env.NEXACHAT_ELECTRON_SMOKE === '1';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'nexachat',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

if (isElectronSmoke) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.setPath('userData', join(process.cwd(), 'test-results/electron-smoke-user-data'));
}

registerIpcHandlers();

function getContentType(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function resolveRendererAsset(requestUrl: string): string {
  const url = new URL(requestUrl);
  const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const assetPath = normalize(join(rendererDistDir, requestedPath));
  const relativePath = relative(rendererDistDir, assetPath);
  if (relativePath.startsWith('..') || relativePath === '' || relativePath.includes('..\\') || relativePath.includes('../')) {
    throw new Error(`Blocked renderer asset path outside dist: ${requestedPath}`);
  }
  return assetPath;
}

function registerRendererProtocol(): void {
  protocol.handle('nexachat', async (request) => {
    const assetPath = resolveRendererAsset(request.url);
    const bytes = await readFile(assetPath);
    return new Response(bytes, {
      headers: {
        'content-type': getContentType(assetPath),
      },
    });
  });
}

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
    await window.loadURL('nexachat://app/index.html');
  }
}

app.setName('NexaChat');

app.whenReady().then(async () => {
  if (!isDev) {
    registerRendererProtocol();
  }
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
