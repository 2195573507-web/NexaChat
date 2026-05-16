import { _electron as electron } from 'playwright';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  assertExists,
  desktopEntry,
  fromRoot,
  getRepoRoot,
} from './desktop-entry.mjs';

const repoRoot = getRepoRoot();
const executablePath = fromRoot(desktopEntry.relativePaths.packagedExecutable);
const smokeUserDataDir = fromRoot(desktopEntry.relativePaths.packageSmokeUserData);

assertExists(executablePath, 'Packaged executable');
mkdirSync(smokeUserDataDir, { recursive: true });

const app = await electron.launch({
  executablePath,
  args: ['--disable-gpu', '--disable-gpu-sandbox', `--user-data-dir=${smokeUserDataDir}`],
  cwd: dirname(executablePath),
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    NEXACHAT_ELECTRON_SMOKE: '1',
    NEXACHAT_ELECTRON_SMOKE_USER_DATA_DIR: smokeUserDataDir,
  },
});

const consoleMessages = [];
const pageErrors = [];

try {
  const window = await app.firstWindow();
  window.on('console', (message) => {
    if (message.type() === 'error') {
      consoleMessages.push(message.text());
    }
  });
  window.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await window.locator('.app-shell').waitFor({ timeout: 20_000 });
  await window.getByText(desktopEntry.productName, { exact: true }).first().waitFor({ timeout: 5_000 });
  await window.locator('.module-nav-item').first().waitFor({ timeout: 5_000 });
  await window.locator('main [role="tabpanel"][data-module="workspace"][data-tab="overview"]').waitFor({ timeout: 5_000 });
  if (app.windows().length !== 1) {
    throw new Error(`Expected one packaged app window, got ${app.windows().length}.`);
  }

  const state = await window.evaluate(async () => {
    const api = window.nexachat;
    const snapshot = api && typeof api.getSnapshot === 'function' ? await api.getSnapshot() : null;
    return {
      hasApi: Boolean(api?.getSnapshot),
      workspaceId: snapshot?.dashboard?.workspace?.id ?? null,
      moduleCount: document.querySelectorAll('.module-nav-item').length,
      body: document.body.innerText,
    };
  });

  if (!state.hasApi || !state.workspaceId) {
    throw new Error(`Packaged preload API check failed: ${JSON.stringify(state)}`);
  }
  if (state.moduleCount !== 8) {
    throw new Error(`Expected 8 first-level modules, got ${state.moduleCount}.`);
  }
  if (/(^|\s)\/(workspace|chat|models|knowledge|tools|gateway|data|settings)\//.test(state.body)) {
    throw new Error('Visible route path leaked into the packaged shell.');
  }
  if (pageErrors.length || consoleMessages.length) {
    throw new Error(`Packaged renderer emitted errors: ${[...pageErrors, ...consoleMessages].join('\n')}`);
  }

  const startupLogPath = join(smokeUserDataDir, 'logs', 'startup.jsonl');
  if (!existsSync(startupLogPath)) {
    throw new Error(`Packaged startup diagnostics log is missing: ${startupLogPath}`);
  }
  const startupLog = readFileSync(startupLogPath, 'utf8');
  if (!startupLog.includes('window.ready-to-show')) {
    throw new Error('Packaged startup diagnostics did not record window.ready-to-show.');
  }

  console.log(`Packaged smoke passed for ${executablePath.replace(repoRoot, '.')} with one main window.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (pageErrors.length) {
    console.error(`Page errors:\n${pageErrors.join('\n')}`);
  }
  if (consoleMessages.length) {
    console.error(`Console errors:\n${consoleMessages.join('\n')}`);
  }
  process.exitCode = 1;
} finally {
  await app.close();
}
