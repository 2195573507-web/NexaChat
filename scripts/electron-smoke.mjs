import { _electron as electron } from 'playwright';

const app = await electron.launch({
  args: ['.'],
  cwd: process.cwd(),
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
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
  await window.waitForLoadState('domcontentloaded');
  await window.locator('.app-shell').waitFor({ timeout: 15_000 });
  await window.getByText('NexaChat', { exact: true }).first().waitFor({ timeout: 5_000 });
  await window.locator('.module-nav-item').filter({ hasText: '对话' }).waitFor({ timeout: 5_000 });
  await window.getByText('当前概览', { exact: true }).waitFor({ timeout: 5_000 });
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
  await app.close();
}
