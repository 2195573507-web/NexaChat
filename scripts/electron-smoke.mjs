import { _electron as electron } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { closeElectronApp } from './desktop-entry.mjs';

const smokeUserDataDir = join(process.cwd(), 'test-results', 'electron-smoke-user-data');
mkdirSync(smokeUserDataDir, { recursive: true });

const app = await electron.launch({
  args: ['.', '--disable-gpu', '--disable-gpu-sandbox', `--user-data-dir=${smokeUserDataDir}`],
  cwd: process.cwd(),
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    NEXACHAT_ELECTRON_SMOKE: '1',
  },
});

const window = await app.firstWindow();
const consoleMessages = [];
const pageErrors = [];

window.on('console', (message) => {
  if (message.type() === 'error') {
    consoleMessages.push(message.text());
  }
});

window.on('pageerror', (error) => {
  pageErrors.push(error.message);
});

try {
  await window.locator('.app-frame').waitFor({ timeout: 20_000 });
  await window.waitForFunction(() => document.readyState !== 'loading', undefined, { timeout: 5_000 }).catch(() => undefined);
  await window.locator('.brand-mark').waitFor({ timeout: 5_000 });
  await window.locator('.rail-item').first().waitFor({ timeout: 5_000 });
  await window.locator('main [role="region"][data-module="chat"][data-tab="conversations"]').waitFor({ timeout: 5_000 });

  const preloadResult = await window.evaluate(async () => {
    const api = window.nexachat;
    if (!api || typeof api.getSnapshot !== 'function') {
      return { ok: false, reason: 'window.nexachat.getSnapshot is unavailable' };
    }
    const snapshot = await api.getSnapshot();
    return {
      ok: Boolean(snapshot?.dashboard?.workspace?.id),
      workspaceId: snapshot?.dashboard?.workspace?.id ?? null,
      moduleCountHint: document.querySelectorAll('.rail-item').length,
    };
  });
  if (!preloadResult.ok) {
    throw new Error(`Preload API check failed: ${JSON.stringify(preloadResult)}`);
  }
  if (preloadResult.moduleCountHint !== 7) {
    throw new Error(`Expected 7 first-level modules, got ${preloadResult.moduleCountHint}.`);
  }

  const bodyText = await window.locator('body').innerText();
  if (/(^|\s)\/(workspace|chat|models|knowledge|tools|gateway|data|settings)\//.test(bodyText)) {
    throw new Error('Visible route path leaked into the Electron shell.');
  }
  if (pageErrors.length || consoleMessages.length) {
    throw new Error(`Renderer emitted errors: ${[...pageErrors, ...consoleMessages].join('\n')}`);
  }
  console.log('Electron smoke rendered the NexaChat shell.');
} catch (error) {
  const bodyText = await window.locator('body').innerText().catch(() => '');
  console.error(error instanceof Error ? error.message : String(error));
  if (bodyText) {
    console.error(`Rendered body text:\n${bodyText.slice(0, 1000)}`);
  }
  if (pageErrors.length) {
    console.error(`Page errors:\n${pageErrors.join('\n')}`);
  }
  if (consoleMessages.length) {
    console.error(`Console errors:\n${consoleMessages.join('\n')}`);
  }
  process.exitCode = 1;
} finally {
  await closeElectronApp(app);
}
