import { app, BrowserWindow, protocol, shell } from 'electron';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc.js';
import { closeDatabase } from './database/connection.js';
import { stopLocalGateway } from './services/localGateway.js';
import { DESKTOP_ENTRY } from '../shared/desktopEntry.js';
import { installDesktopDiagnostics, recordDesktopDiagnostic } from './desktopDiagnostics.js';

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
  const smokeUserDataDir =
    process.env.NEXACHAT_ELECTRON_SMOKE_USER_DATA_DIR || join(process.cwd(), DESKTOP_ENTRY.relativePaths.electronSmokeUserData);
  app.setPath('userData', smokeUserDataDir);
}

installDesktopDiagnostics();
registerIpcHandlers();

let mainWindow: BrowserWindow | null = null;

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
    width: DESKTOP_ENTRY.window.width,
    height: DESKTOP_ENTRY.window.height,
    minWidth: DESKTOP_ENTRY.window.minWidth,
    minHeight: DESKTOP_ENTRY.window.minHeight,
    title: DESKTOP_ENTRY.productName,
    show: false,
    backgroundColor: DESKTOP_ENTRY.window.backgroundColor,
    webPreferences: {
      preload: join(currentDir, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow = window;

  window.once('ready-to-show', () => {
    recordDesktopDiagnostic('window.ready-to-show', { mode: isDev ? 'dev' : 'production' });
    window.show();
  });

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

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

app.setName(DESKTOP_ENTRY.appName);

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  recordDesktopDiagnostic('app.second-instance-quit');
  app.quit();
} else {
  app.whenReady().then(async () => {
    recordDesktopDiagnostic('app.ready', { mode: isDev ? 'dev' : 'production' });
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

  app.on('second-instance', () => {
    recordDesktopDiagnostic('app.second-instance-focus');
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  void stopLocalGateway();
  closeDatabase();
});
