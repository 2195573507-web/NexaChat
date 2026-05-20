import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const MODULES = [
  { id: 'chat', rail: 0, tabs: ['conversations', 'playground', 'context'] },
  { id: 'models', rail: 1, tabs: ['providers', 'catalog', 'router'] },
  { id: 'knowledge', rail: 2, tabs: ['files', 'chunks', 'retrieval'] },
  { id: 'tools', rail: 3, tabs: ['mcp', 'agents', 'runs'] },
  { id: 'gateway', rail: 4, tabs: ['overview', 'keys', 'logs', 'usage', 'docs'] },
  { id: 'data', rail: 5, tabs: ['import', 'backup', 'restore', 'rollback', 'diagnostics', 'cleanup'] },
  { id: 'settings', rail: 6, tabs: ['preferences', 'security', 'audit', 'feedback', 'evals', 'observability', 'about'] },
];

const DEFAULT_AGENT_COUNT = 6;
const DEFAULT_MINUTES = 121;
const INTERACTION_DELAY_MS = 120;
const HEARTBEAT_MS = 30_000;
const APP_READY_TIMEOUT_MS = 45_000;
const RECOVERY_TIMEOUT_MS = 30_000;
const CONTROLLED_COMMANDS = new Map([
  ['node', new Set(['./node_modules/vite/bin/vite.js'])],
]);

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();
const runId = args.runId ?? stampForPath(new Date());
const requestedMinutes = Number(args.minutes ?? DEFAULT_MINUTES);
const requestedAgents = Math.max(1, Math.min(Number(args.agents ?? DEFAULT_AGENT_COUNT), DEFAULT_AGENT_COUNT));
const testDurationMs = Math.max(1, requestedMinutes) * 60_000;
const outputDir = resolve(repoRoot, 'test-results', 'long-click', runId);
const fixturesDir = join(outputDir, 'fixtures');
const progressPath = join(outputDir, 'progress.json');
const resultJsonPath = join(outputDir, 'results.json');
const resultMdPath = join(outputDir, 'results.md');

const runState = {
  projectRoot: repoRoot.replaceAll('\\', '/'),
  runId,
  requestedMinutes,
  requestedAgents,
  maximumParallelAgents: requestedAgents,
  serverUrl: '',
  startedAt: '',
  endedAt: '',
  activeDurationMs: 0,
  agentsReleased: false,
  modulesCovered: new Set(),
  functionsCovered: new Set(),
  unavailableFunctions: new Map(),
  issues: [],
  bugsFixedDuringRun: [],
  agents: [],
};

function parseArgs(items) {
  const parsed = {};
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = items[index + 1] && !items[index + 1].startsWith('--') ? items[++index] : 'true';
    parsed[key] = value;
  }
  return parsed;
}

function stampForPath(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function localTime(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function assertControlledCommand(command, commandArgs) {
  const allowedFirstArgs = CONTROLLED_COMMANDS.get(command);
  if (!allowedFirstArgs || !allowedFirstArgs.has(commandArgs[0])) {
    throw new Error(`Refusing uncontrolled command: ${command} ${commandArgs.join(' ')}`);
  }
}

function runControlled(command, commandArgs, options = {}) {
  assertControlledCommand(command, commandArgs);
  return spawn(command, commandArgs, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...options.env,
    },
    shell: false,
    stdio: options.stdio ?? 'pipe',
    windowsHide: true,
  });
}

async function findFreePort(startAt) {
  for (let port = startAt; port < startAt + 100; port += 1) {
    const available = await new Promise((resolveAvailable) => {
      const server = createServer();
      server.once('error', () => resolveAvailable(false));
      server.once('listening', () => {
        server.close(() => resolveAvailable(true));
      });
      server.listen(port, '127.0.0.1');
    });
    if (available) return port;
  }
  throw new Error(`No free port found from ${startAt}`);
}

async function waitForServer(url, timeoutMs = 60_000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`Unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function terminate(child) {
  if (!child?.pid || child.killed) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], {
      shell: false,
      stdio: 'ignore',
      windowsHide: true,
    });
    await new Promise((resolveKill) => {
      killer.on('exit', () => resolveKill(undefined));
      killer.on('error', () => resolveKill(undefined));
    });
    return;
  }
  child.kill('SIGTERM');
  await new Promise((resolveKill) => {
    child.on('exit', () => resolveKill(undefined));
    setTimeout(resolveKill, 2_000);
  });
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

function serializeRunState() {
  return {
    ...runState,
    modulesCovered: [...runState.modulesCovered].sort(),
    functionsCovered: [...runState.functionsCovered].sort(),
    unavailableFunctions: Object.fromEntries(runState.unavailableFunctions),
  };
}

async function writeProgress() {
  await mkdir(outputDir, { recursive: true });
  await writeFile(progressPath, JSON.stringify(serializeRunState(), null, 2));
}

function createAgentRecord(id, persona, skillLevel, scope) {
  const record = {
    id,
    persona,
    skillLevel,
    assignedScope: scope,
    startedAt: '',
    endedAt: '',
    iterations: 0,
    interactions: 0,
    result: 'running',
    coveredModules: new Set(),
    coveredFunctions: new Set(),
    unavailable: [],
    issues: [],
    consoleErrors: [],
  };
  runState.agents.push(record);
  return record;
}

function addIssue(agentRecord, severity, area, message, detail = '') {
  const issue = {
    severity,
    area,
    message,
    detail: sanitize(detail),
    timestamp: new Date().toISOString(),
    agentId: agentRecord.id,
    persona: agentRecord.persona,
  };
  agentRecord.issues.push(issue);
  runState.issues.push(issue);
}

function sanitize(value) {
  return String(value ?? '')
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-REDACTED')
    .replace(/nxk_[A-Za-z0-9_-]+/g, 'nxk_REDACTED')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer REDACTED');
}

function markCoverage(agentRecord, moduleId, functionName) {
  runState.modulesCovered.add(moduleId);
  runState.functionsCovered.add(functionName);
  agentRecord.coveredModules.add(moduleId);
  agentRecord.coveredFunctions.add(functionName);
}

function markUnavailable(agentRecord, moduleId, functionName, reason) {
  runState.modulesCovered.add(moduleId);
  runState.unavailableFunctions.set(functionName, reason);
  agentRecord.unavailable.push({ moduleId, functionName, reason });
}

function moduleById(id) {
  return MODULES.find((module) => module.id === id);
}

async function pace() {
  await wait(INTERACTION_DELAY_MS);
}

async function safeStep(agentRecord, page, moduleId, functionName, action) {
  try {
    await action();
    markCoverage(agentRecord, moduleId, functionName);
    agentRecord.interactions += 1;
    await pace();
  } catch (error) {
    addIssue(agentRecord, classifyError(error), `${moduleId}.${functionName}`, error instanceof Error ? error.message : String(error));
    await recoverPage(agentRecord, page, `${moduleId}.${functionName}`);
  }
}

function classifyError(error) {
  const message = String(error instanceof Error ? error.message : error);
  if (/crash|closed|Target page|cannot start|net::ERR/i.test(message)) return 'P0';
  if (/Timeout|not visible|not enabled|strict mode violation/i.test(message)) return 'P1';
  if (/contrast|overflow|route leak|disabled|placeholder|unreadable/i.test(message)) return 'P2';
  return 'P3';
}

async function captureLifecycleFailure(page, agentRecord, area, error) {
  const safeArea = area.replace(/[^a-z0-9_.-]+/gi, '-');
  const screenshotPath = join(outputDir, `${agentRecord.id}-${safeArea}-${stampForPath(new Date())}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  addIssue(agentRecord, classifyError(error), area, error instanceof Error ? error.message : String(error), screenshotPath.replaceAll('\\', '/'));
}

async function waitForAppReady(page, timeoutMs = APP_READY_TIMEOUT_MS) {
  await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs });
  await page.locator('.app-frame').waitFor({ state: 'visible', timeout: timeoutMs });
  await page.locator('.module-rail .rail-item').first().waitFor({ state: 'visible', timeout: timeoutMs });
  await page.locator('main [role="region"]').first().waitFor({ state: 'visible', timeout: timeoutMs });
  const ready = await page.locator('.app-frame').evaluate((element) => {
    const railItems = document.querySelectorAll('.module-rail .rail-item').length;
    const panel = document.querySelector('main [role="region"]');
    const style = getComputedStyle(element);
    return {
      railItems,
      hasPanel: Boolean(panel),
      width: element.clientWidth,
      height: element.clientHeight,
      visibility: style.visibility,
      display: style.display,
    };
  });
  if (ready.railItems < MODULES.length || !ready.hasPanel || ready.width <= 0 || ready.height <= 0 || ready.visibility === 'hidden' || ready.display === 'none') {
    throw new Error(`App shell not ready: ${JSON.stringify(ready)}`);
  }
}

async function recoverPage(agentRecord, page, area) {
  try {
    if (page.isClosed()) return;
    await page.reload({ waitUntil: 'domcontentloaded', timeout: RECOVERY_TIMEOUT_MS });
    await waitForAppReady(page, RECOVERY_TIMEOUT_MS);
  } catch (reloadError) {
    try {
      const origin = new URL(page.url()).origin;
      await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: RECOVERY_TIMEOUT_MS });
      await waitForAppReady(page, RECOVERY_TIMEOUT_MS);
    } catch (gotoError) {
      await captureLifecycleFailure(page, agentRecord, `${area}.recovery`, gotoError);
      if (reloadError instanceof Error) {
        addIssue(agentRecord, classifyError(reloadError), `${area}.reload`, reloadError.message);
      }
    }
  }
}

async function openTab(page, moduleId, tabId) {
  const module = moduleById(moduleId);
  if (!module) throw new Error(`Unknown module ${moduleId}`);
  const tabIndex = module.tabs.indexOf(tabId);
  if (tabIndex < 0) throw new Error(`Unknown tab ${moduleId}.${tabId}`);
  await page.locator('.rail-item').nth(module.rail).click({ timeout: 10_000 });
  await page.locator(`main [role="region"][data-module="${moduleId}"]`).waitFor({ state: 'visible', timeout: 10_000 });
  if (module.tabs.length > 1) {
    await page.locator('.top-tabs .top-tab').nth(tabIndex).click({ timeout: 10_000 });
  }
  await page.locator(`main [role="region"][data-module="${moduleId}"][data-tab="${tabId}"]`).waitFor({ state: 'visible', timeout: 10_000 });
  await assertSharedShell(page);
}

async function assertSharedShell(page) {
  await waitForAppReady(page, 10_000);
  const overflow = await page.locator('.app-frame').evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  if (overflow.scrollWidth > overflow.clientWidth + 1) {
    throw new Error(`horizontal overflow ${overflow.scrollWidth}/${overflow.clientWidth}`);
  }
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 });
  if (/(^|\s)\/(workspace|chat|models|knowledge|tools|gateway|data|settings)\//.test(bodyText)) {
    throw new Error('visible route leak detected');
  }
}

async function clickIfAvailable(agentRecord, page, moduleId, functionName, locator, reason = 'control not available in current UI') {
  const count = await locator.count();
  if (count === 0) {
    markUnavailable(agentRecord, moduleId, functionName, reason);
    return false;
  }
  const target = locator.first();
  if (!(await target.isVisible().catch(() => false))) {
    markUnavailable(agentRecord, moduleId, functionName, reason);
    return false;
  }
  if (await target.isDisabled().catch(() => false)) {
    markCoverage(agentRecord, moduleId, `${functionName}.disabled-state`);
    return false;
  }
  await target.click({ timeout: 10_000 });
  markCoverage(agentRecord, moduleId, functionName);
  agentRecord.interactions += 1;
  await pace();
  return true;
}

async function fillIfAvailable(agentRecord, page, moduleId, functionName, locator, value, reason = 'field not available in current UI') {
  const count = await locator.count();
  if (count === 0) {
    markUnavailable(agentRecord, moduleId, functionName, reason);
    return false;
  }
  await locator.first().fill(value, { timeout: 10_000 });
  markCoverage(agentRecord, moduleId, functionName);
  agentRecord.interactions += 1;
  await pace();
  return true;
}

async function selectIfAvailable(agentRecord, moduleId, functionName, locator, value) {
  const count = await locator.count();
  if (count === 0) {
    markUnavailable(agentRecord, moduleId, functionName, 'select not available in current UI');
    return false;
  }
  await locator.first().selectOption(value, { timeout: 10_000 });
  markCoverage(agentRecord, moduleId, functionName);
  agentRecord.interactions += 1;
  await pace();
  return true;
}

function panel(page, moduleId, tabId) {
  return page.locator(`main [role="region"][data-module="${moduleId}"][data-tab="${tabId}"]`);
}

async function chatWorkflow(agent, page) {
  await openTab(page, 'chat', 'conversations');
  await safeStep(agent, page, 'chat', 'chat.new-conversation', async () => {
    await page.locator('.chat-sidebar .primary-button').click();
    await page.locator('.chat-title-block h1').waitFor({ state: 'visible', timeout: 10_000 });
  });
  await safeStep(agent, page, 'chat', 'chat.search-conversations', async () => {
    await page.locator('.search-box input').fill(`agent ${agent.id}`);
    await page.locator('.search-box input').press('Control+A');
    await page.locator('.search-box input').fill('');
  });
  await safeStep(agent, page, 'chat', 'chat.select-model', async () => {
    const modelSelect = page.locator('.chat-runtime-controls select').first();
    const values = await modelSelect.locator('option').evaluateAll((options) => options.map((option) => option.value));
    if (values[0]) await modelSelect.selectOption(values[0]);
  });
  await safeStep(agent, page, 'chat', 'chat.send-message-long-text', async () => {
    const longText = `long real-click ${agent.id} ${Date.now()}\n`.repeat(6);
    await page.locator('.chat-composer textarea').fill(longText);
    await page.locator('.composer-send').click();
    await page.locator('.message-bubble').first().waitFor({ state: 'visible', timeout: 15_000 });
  });
  await clickIfAvailable(agent, page, 'chat', 'chat.copy-message', page.locator('.message-actions button').nth(0));
  await clickIfAvailable(agent, page, 'chat', 'chat.retry-message', page.locator('.message-actions button').nth(2));
  await clickIfAvailable(agent, page, 'chat', 'chat.regenerate-message', page.locator('.message-actions button').nth(1));
  await clickIfAvailable(agent, page, 'chat', 'chat.pin-conversation', page.locator('.composer-utility-actions button').nth(0));
  await clickIfAvailable(agent, page, 'chat', 'chat.favorite-conversation', page.locator('.composer-utility-actions button').nth(1));
  markUnavailable(agent, 'chat', 'chat.export-conversation', 'No visible export control exists in the current Chat UI; export is API-backed in tests.');
  await openTab(page, 'chat', 'playground');
  markCoverage(agent, 'chat', 'chat.playground-route');
  await openTab(page, 'chat', 'context');
  markCoverage(agent, 'chat', 'chat.context-route');
}

async function chatCancelWorkflow(agent, page) {
  await openTab(page, 'chat', 'conversations');
  await safeStep(agent, page, 'chat', 'chat.cancel-generation-if-available', async () => {
    await page.locator('.chat-composer textarea').fill(`cancel attempt ${agent.id} ${Date.now()}`);
    await page.locator('.composer-send').click();
    const cancel = page.locator('.composer-utility-actions button').first();
    if (await cancel.isVisible({ timeout: 500 }).catch(() => false)) {
      await cancel.click();
    } else {
      markUnavailable(agent, 'chat', 'chat.cancel-generation', 'Mock response often completes before a cancel control remains visible.');
    }
  });
}

async function modelsWorkflow(agent, page) {
  await openTab(page, 'models', 'providers');
  const providers = panel(page, 'models', 'providers');
  await safeStep(agent, page, 'models', 'models.required-fields', async () => {
    await providers.locator('input').nth(0).fill('');
    const detectButton = providers.locator('.field-action-row .primary-button').first();
    if (!(await detectButton.isDisabled())) throw new Error('Detect button should be disabled without an address.');
  });
  await safeStep(agent, page, 'models', 'models.provider-invalid-url-feedback', async () => {
    await providers.locator('input').nth(0).fill('http://');
    await providers.locator('.field-action-row .primary-button').first().click();
    await page.locator('.inline-notice').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
  });
  await safeStep(agent, page, 'models', 'models.smart-add-provider', async () => {
    await providers.locator('input').nth(0).fill(`api.${agent.id}.${Date.now()}.test`);
    await providers.locator('input').nth(1).fill(`sk-test-${agent.id}-${Date.now()}`);
    await providers.locator('.field-action-row .primary-button').first().click();
    await providers.locator('.discovery-preview').waitFor({ state: 'visible', timeout: 15_000 });
    const save = providers.locator('.discovery-preview .primary-button').first();
    if (await save.isVisible().catch(() => false)) await save.click();
  });
  await clickIfAvailable(agent, page, 'models', 'models.advanced-provider-settings', providers.locator('.field-action-row .ghost-button').first());
  await clickIfAvailable(agent, page, 'models', 'models.fetch-provider-models', providers.locator('.provider-row-actions button').nth(0));
  await clickIfAvailable(agent, page, 'models', 'models.test-provider', providers.locator('.provider-row-actions button').nth(1));
  await clickIfAvailable(agent, page, 'models', 'models.delete-provider-cancel', providers.locator('.provider-row-actions button').nth(2));
  await clickIfAvailable(agent, page, 'models', 'models.delete-provider-cancel-confirmation', providers.locator('.provider-row-actions .ghost-button').first());
  await openTab(page, 'models', 'catalog');
  const catalog = panel(page, 'models', 'catalog');
  await clickIfAvailable(agent, page, 'models', 'models.catalog-fetch-models', catalog.locator('.field-action-row button').first());
  await fillIfAvailable(agent, page, 'models', 'models.create-model-name', catalog.locator('input').first(), `agent-model-${agent.id}-${Date.now()}`);
  await clickIfAvailable(agent, page, 'models', 'models.create-model', page.locator('.page-header .primary-button').first());
  await openTab(page, 'models', 'router');
  markCoverage(agent, 'models', 'models.router-health');
}

async function knowledgeWorkflow(agent, page) {
  await openTab(page, 'knowledge', 'files');
  const files = panel(page, 'knowledge', 'files');
  const name = `long-click-${agent.id}-${Date.now()}.md`;
  const content = `NexaChat long click test file ${agent.id}. This safe disposable text checks parsing, indexing, chunks, retrieval, citations, and readability.`;
  await safeStep(agent, page, 'knowledge', 'knowledge.import-text-record', async () => {
    await files.locator('input').nth(0).fill(name);
    await files.locator('textarea').first().fill(content);
    await page.locator('.page-header .primary-button').first().click();
    await files.getByText(name).waitFor({ state: 'visible', timeout: 15_000 });
  });
  await safeStep(agent, page, 'knowledge', 'knowledge.import-file-input', async () => {
    const filePath = join(fixturesDir, `file-input-${agent.id}.md`);
    await writeFile(filePath, content);
    await files.locator('input[type="file"]').setInputFiles(filePath);
    await files.locator('textarea').first().waitFor({ state: 'visible', timeout: 10_000 });
  });
  const row = files.locator('.config-row').filter({ hasText: name }).first();
  await clickIfAvailable(agent, page, 'knowledge', 'knowledge.rebuild-file', row.locator('button').nth(0));
  await clickIfAvailable(agent, page, 'knowledge', 'knowledge.delete-safe-file-step-1', row.locator('button').nth(1));
  await clickIfAvailable(agent, page, 'knowledge', 'knowledge.delete-safe-file-step-2', row.locator('button').nth(1));
  await openTab(page, 'knowledge', 'chunks');
  markCoverage(agent, 'knowledge', 'knowledge.chunk-preview');
  await openTab(page, 'knowledge', 'retrieval');
  await safeStep(agent, page, 'knowledge', 'knowledge.retrieval-preview', async () => {
    const retrievalPanel = panel(page, 'knowledge', 'retrieval');
    await retrievalPanel.locator('textarea').first().fill('long click retrieval citations');
    const runButton = page.locator('.page-header .primary-button').first();
    if (await runButton.isDisabled().catch(() => false)) {
      markCoverage(agent, 'knowledge', 'knowledge.retrieval-disabled-state');
      return;
    }
    await runButton.click();
    await page.locator('.activity-list, .inline-notice').first().waitFor({ state: 'visible', timeout: 10_000 });
  });
}

async function toolsWorkflow(agent, page) {
  await openTab(page, 'tools', 'mcp');
  const mcp = panel(page, 'tools', 'mcp');
  await safeStep(agent, page, 'tools', 'tools.mcp-register', async () => {
    await mcp.locator('input').nth(0).fill(`agent-mcp-${agent.id}-${Date.now()}`);
    await mcp.locator('input').nth(1).fill('http://127.0.0.1:9/mcp');
    await page.locator('.page-header .primary-button').first().click();
  });
  await clickIfAvailable(agent, page, 'tools', 'tools.mcp-grant-or-deny', mcp.locator('.config-row button').first());
  await openTab(page, 'tools', 'agents');
  const agents = panel(page, 'tools', 'agents');
  await safeStep(agent, page, 'tools', 'tools.agent-create', async () => {
    await agents.locator('input').first().fill(`agent-definition-${agent.id}-${Date.now()}`);
    await agents.locator('textarea').first().fill('Run safe fixture-only checks and summarize trace readability.');
    await page.locator('.page-header .primary-button').first().click();
  });
  await clickIfAvailable(agent, page, 'tools', 'tools.agent-dry-run', agents.locator('.config-row button').first());
  await openTab(page, 'tools', 'runs');
  const runs = panel(page, 'tools', 'runs');
  await clickIfAvailable(agent, page, 'tools', 'tools.run-status-read', page.locator('.page-header .primary-button').first());
  await clickIfAvailable(agent, page, 'tools', 'tools.run-echo-approval', runs.locator('.switch-grid button').first());
  await clickIfAvailable(agent, page, 'tools', 'tools.approval-approve', runs.locator('.approval-row button').nth(0), 'approval may already be resolved');
  await clickIfAvailable(agent, page, 'tools', 'tools.approval-deny-state', runs.locator('.approval-row button').nth(1), 'approval deny control may not remain after approval');
}

async function gatewayWorkflow(agent, page) {
  await openTab(page, 'gateway', 'overview');
  await clickIfAvailable(agent, page, 'gateway', 'gateway.toggle-start-stop', page.locator('.page-header button').first());
  await openTab(page, 'gateway', 'keys');
  const keys = panel(page, 'gateway', 'keys');
  await safeStep(agent, page, 'gateway', 'gateway.create-test-key', async () => {
    await keys.locator('input').first().fill(`long-click-key-${agent.id}-${Date.now()}`);
    await page.locator('.page-header .primary-button').first().click();
    await keys.locator('.inline-notice, .config-row').first().waitFor({ state: 'visible', timeout: 10_000 });
  });
  await safeStep(agent, page, 'gateway', 'gateway.update-quota-rate', async () => {
    const row = keys.locator('.config-row').first();
    await row.locator('input').nth(0).fill('42');
    await row.locator('input').nth(1).fill('7');
    await row.locator('button').nth(1).click();
  });
  await clickIfAvailable(agent, page, 'gateway', 'gateway.disable-enable-key', keys.locator('.config-row button').nth(2));
  await clickIfAvailable(agent, page, 'gateway', 'gateway.rotate-key', keys.locator('.config-row button').nth(3));
  await clickIfAvailable(agent, page, 'gateway', 'gateway.revoke-safe-key', keys.locator('.config-row button').nth(4));
  await openTab(page, 'gateway', 'logs');
  markCoverage(agent, 'gateway', 'gateway.logs-inspected');
  await clickIfAvailable(agent, page, 'gateway', 'gateway.logs-pagination', panel(page, 'gateway', 'logs').locator('button').last(), 'no additional gateway log page available');
  await openTab(page, 'gateway', 'usage');
  markCoverage(agent, 'gateway', 'gateway.usage-token-sections');
  await openTab(page, 'gateway', 'docs');
  await clickIfAvailable(agent, page, 'gateway', 'gateway.copy-docs-curl', page.locator('.page-header button').first());
}

async function dataWorkflow(agent, page) {
  await openTab(page, 'data', 'import');
  const imports = panel(page, 'data', 'import');
  await safeStep(agent, page, 'data', 'data.import-invalid-precheck', async () => {
    await imports.locator('textarea').first().fill('{}');
    await page.locator('.page-header .primary-button').first().click();
    await page.locator('.inline-notice').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
  });
  await safeStep(agent, page, 'data', 'data.import-valid-precheck', async () => {
    const manifest = { providers: [{ name: `Long Click Provider ${agent.id}`, baseUrl: 'http://127.0.0.1:11434/v1' }] };
    await imports.locator('textarea').first().fill(JSON.stringify(manifest));
    await page.locator('.page-header .primary-button').first().click();
    await page.locator('.activity-list, .inline-notice').first().waitFor({ state: 'visible', timeout: 10_000 });
  });
  await safeStep(agent, page, 'data', 'data.import-apply-confirmation', async () => {
    await imports.locator('input').first().fill('APPLY IMPORT');
    const apply = imports.locator('.row-actions button').first();
    if (await apply.isDisabled().catch(() => false)) {
      markCoverage(agent, 'data', 'data.import-apply-disabled-state');
      return;
    }
    await apply.click();
  });
  await openTab(page, 'data', 'backup');
  await safeStep(agent, page, 'data', 'data.backup-create', async () => {
    await panel(page, 'data', 'backup').locator('input').first().fill(`safe-passphrase-${agent.id}`);
    await page.locator('.page-header .primary-button').first().click();
  });
  await clickIfAvailable(agent, page, 'data', 'data.export-flow', panel(page, 'data', 'backup').locator('.config-detail button').first());
  await openTab(page, 'data', 'restore');
  await safeStep(agent, page, 'data', 'data.restore-precheck', async () => {
    await panel(page, 'data', 'restore').locator('input').first().fill(`safe-passphrase-${agent.id}`);
    await page.locator('.page-header .primary-button').first().click();
  });
  await openTab(page, 'data', 'rollback');
  await safeStep(agent, page, 'data', 'data.rollback-disposable-record', async () => {
    await panel(page, 'data', 'rollback').locator('input').first().fill('ROLLBACK DATA');
    const rollback = page.locator('.page-header .danger-button').first();
    if (await rollback.isDisabled().catch(() => false)) {
      markCoverage(agent, 'data', 'data.rollback-disabled-state');
      return;
    }
    await rollback.click();
  });
  await openTab(page, 'data', 'diagnostics');
  await clickIfAvailable(agent, page, 'data', 'data.diagnostics-export', page.locator('.page-header .primary-button').first());
  await openTab(page, 'data', 'cleanup');
  markCoverage(agent, 'data', 'data.cleanup-risk-view');
}

async function settingsWorkflow(agent, page) {
  await openTab(page, 'settings', 'preferences');
  const preferences = panel(page, 'settings', 'preferences');
  await safeStep(agent, page, 'settings', 'settings.theme-language-density-motion', async () => {
    const selects = preferences.locator('select');
    await selects.nth(0).selectOption('dark');
    await selects.nth(0).selectOption('light');
    await selects.nth(0).selectOption('system');
    await selects.nth(1).selectOption('en-US');
    await selects.nth(2).selectOption('compact');
    await selects.nth(3).selectOption('reduced');
    const advanced = preferences.locator('input[type="checkbox"]').first();
    await advanced.click();
    await page.locator('.page-header .primary-button').first().click();
  });
  await openTab(page, 'settings', 'security');
  await clickIfAvailable(agent, page, 'settings', 'settings.security-verify-audit', page.locator('.page-header button').first());
  await openTab(page, 'settings', 'audit');
  await safeStep(agent, page, 'settings', 'settings.audit-search', async () => {
    await panel(page, 'settings', 'audit').locator('input').first().fill('provider');
  });
  await clickIfAvailable(agent, page, 'settings', 'settings.audit-export', page.locator('.page-header button').first());
  await openTab(page, 'settings', 'feedback');
  await safeStep(agent, page, 'settings', 'settings.feedback-create', async () => {
    await panel(page, 'settings', 'feedback').locator('textarea').first().fill(`Feedback from ${agent.id}: contrast and state labels remain readable.`);
    await page.locator('.page-header .primary-button').first().click();
  });
  await openTab(page, 'settings', 'evals');
  await clickIfAvailable(agent, page, 'settings', 'settings.evals-run', page.locator('.page-header button').first());
  await openTab(page, 'settings', 'observability');
  await clickIfAvailable(agent, page, 'settings', 'settings.observability-save', page.locator('.page-header .primary-button').first());
  await clickIfAvailable(agent, page, 'settings', 'settings.observability-export', panel(page, 'settings', 'observability').locator('.row-actions button').first());
  await openTab(page, 'settings', 'about');
  markCoverage(agent, 'settings', 'settings.about-inspected');
}

async function accessibilityWorkflow(agent, page) {
  await openTab(page, 'settings', 'preferences');
  await safeStep(agent, page, 'shared', 'shared.keyboard-tab-focus', async () => {
    for (let index = 0; index < 16; index += 1) {
      await page.keyboard.press('Tab');
      await wait(20);
    }
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? '');
    if (!focused) throw new Error('No focused element after Tab navigation.');
  });
  await safeStep(agent, page, 'shared', 'shared.focus-ring-visible', async () => {
    const boxShadow = await page.locator(':focus').evaluate((element) => getComputedStyle(element).boxShadow).catch(() => '');
    if (!boxShadow || boxShadow === 'none') throw new Error('Focused element has no visible box shadow.');
  });
  await safeStep(agent, page, 'shared', 'shared.theme-contrast-sample', async () => {
    await assertContrast(page, '.command-context', 4.5);
    await assertContrast(page, '.top-tab.is-active', 4.5);
    await assertContrast(page, '.tool-pill.status-info', 4.5);
    await assertContrast(page, 'main [data-tab="preferences"] select', 4.5);
  });
  await openTab(page, 'chat', 'conversations');
  await safeStep(agent, page, 'shared', 'shared.placeholder-readable', async () => {
    await assertPlaceholderContrast(page, '.chat-composer textarea', 4.5);
  });
  await safeStep(agent, page, 'shared', 'shared.hover-selected-state', async () => {
    await page.locator('.rail-item').nth(1).hover();
    await page.locator('.top-tab').first().hover();
    await assertSharedShell(page);
  });
}

async function sweeperWorkflow(agent, page) {
  for (const module of MODULES) {
    for (const tab of module.tabs) {
      await safeStep(agent, page, module.id, `${module.id}.${tab}.route-click`, async () => {
        await openTab(page, module.id, tab);
      });
    }
  }
}

async function assertContrast(page, selector, minimum) {
  const sample = await colorSample(page, selector);
  const ratio = contrastRatio(parseCssColor(sample.foreground), parseCssColor(sample.background));
  if (ratio < minimum) {
    throw new Error(`${selector} contrast ${ratio.toFixed(2)} below ${minimum}`);
  }
}

async function assertPlaceholderContrast(page, selector, minimum) {
  const sample = await page.locator(selector).first().evaluate((element) => ({
    foreground: getComputedStyle(element, '::placeholder').color,
    background: getComputedStyle(element).backgroundColor,
  }));
  const ratio = contrastRatio(parseCssColor(sample.foreground), parseCssColor(sample.background));
  if (ratio < minimum) {
    throw new Error(`${selector} placeholder contrast ${ratio.toFixed(2)} below ${minimum}`);
  }
}

async function colorSample(page, selector) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 10_000 });
  return page.locator(selector).first().evaluate((element) => {
    function visibleBackground(value) {
      return !(value === 'transparent' || value === 'rgba(0, 0, 0, 0)');
    }
    let current = element;
    let background = '';
    while (current) {
      const value = getComputedStyle(current).backgroundColor;
      if (visibleBackground(value)) {
        background = value;
        break;
      }
      current = current.parentElement;
    }
    return { foreground: getComputedStyle(element).color, background };
  });
}

function parseCssColor(value) {
  const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const srgb = value.match(/color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\)/);
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255];
  const oklch = value.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/);
  if (oklch) return oklabToRgb(Number(oklch[1]), Number(oklch[2]) * Math.cos((Number(oklch[3]) * Math.PI) / 180), Number(oklch[2]) * Math.sin((Number(oklch[3]) * Math.PI) / 180));
  const oklab = value.match(/oklab\(\s*([0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s*\)/);
  if (oklab) return oklabToRgb(Number(oklab[1]), Number(oklab[2]), Number(oklab[3]));
  throw new Error(`Unsupported CSS color: ${value}`);
}

function oklabToRgb(l, a, b) {
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;
  const lValue = lPrime ** 3;
  const mValue = mPrime ** 3;
  const sValue = sPrime ** 3;
  return [
    4.0767416621 * lValue - 3.3077115913 * mValue + 0.2309699292 * sValue,
    -1.2684380046 * lValue + 2.6097574011 * mValue - 0.3413193965 * sValue,
    -0.0041960863 * lValue - 0.7034186147 * mValue + 1.707614701 * sValue,
  ].map((channel) => {
    const bounded = Math.min(1, Math.max(0, channel));
    const srgb = bounded <= 0.0031308 ? 12.92 * bounded : 1.055 * (bounded ** (1 / 2.4)) - 0.055;
    return srgb * 255;
  });
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((value) => {
    const channel = Math.min(1, Math.max(0, value / 255));
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const agentDefinitions = [
  {
    id: 'agent-1-beginner',
    persona: 'Beginner user',
    skillLevel: 'beginner',
    scope: 'Chat, obvious navigation, settings, provider form confusion, visible feedback',
    workflows: [chatWorkflow, chatCancelWorkflow, modelsWorkflow, settingsWorkflow],
  },
  {
    id: 'agent-2-daily',
    persona: 'Normal daily user',
    skillLevel: 'normal',
    scope: 'Chat, models, knowledge, gateway logs, data export/import, settings',
    workflows: [chatWorkflow, knowledgeWorkflow, gatewayWorkflow, dataWorkflow, settingsWorkflow],
  },
  {
    id: 'agent-3-power',
    persona: 'Advanced/power user',
    skillLevel: 'advanced',
    scope: 'Provider configuration, model routing, gateway keys, tools dry-run, audit/security',
    workflows: [modelsWorkflow, gatewayWorkflow, toolsWorkflow, settingsWorkflow],
  },
  {
    id: 'agent-4-error',
    persona: 'Error-prone user',
    skillLevel: 'error-prone',
    scope: 'Invalid values, cancellations, delete cancel flows, rapid theme changes',
    workflows: [modelsWorkflow, chatCancelWorkflow, dataWorkflow, toolsWorkflow, settingsWorkflow],
  },
  {
    id: 'agent-5-accessibility',
    persona: 'Accessibility/readability-focused user',
    skillLevel: 'accessibility',
    scope: 'Contrast, disabled states, placeholders, focus rings, keyboard, hover and selected states',
    workflows: [accessibilityWorkflow, settingsWorkflow, chatWorkflow],
  },
  {
    id: 'agent-6-sweeper',
    persona: 'Coverage sweeper',
    skillLevel: 'coverage',
    scope: 'Every route and shared shell state, plus repeated route/overflow/leak checks',
    workflows: [sweeperWorkflow, chatWorkflow, knowledgeWorkflow, toolsWorkflow, gatewayWorkflow, dataWorkflow],
  },
].slice(0, requestedAgents);

async function runAgent(definition, browser, baseUrl, endAt) {
  const record = createAgentRecord(definition.id, definition.persona, definition.skillLevel, definition.scope);
  let context = null;
  let page = null;
  const createFreshPage = async () => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 820 },
      reducedMotion: definition.skillLevel === 'accessibility' ? 'reduce' : 'no-preference',
    });
    page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') {
        record.consoleErrors.push(sanitize(message.text()));
      }
    });
    page.on('pageerror', (error) => {
      addIssue(record, 'P1', 'browser.pageerror', error.message);
    });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: APP_READY_TIMEOUT_MS });
    await waitForAppReady(page);
  };
  const resetPage = async () => {
    if (!page || page.isClosed()) {
      if (context) await context.close().catch(() => undefined);
      await createFreshPage();
      return;
    }
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: APP_READY_TIMEOUT_MS });
      await waitForAppReady(page);
    } catch (error) {
      await captureLifecycleFailure(page, record, 'agent.reset-page', error);
      if (context) await context.close().catch(() => undefined);
      await createFreshPage();
    }
  };
  record.startedAt = new Date().toISOString();
  try {
    await createFreshPage();
    let workflowIndex = 0;
    while (Date.now() < endAt) {
      const workflow = definition.workflows[workflowIndex % definition.workflows.length];
      workflowIndex += 1;
      await workflow(record, page);
      record.iterations += 1;
      if (record.iterations % 25 === 0) {
        await resetPage();
      }
    }
    record.result = record.issues.some((issue) => issue.severity === 'P0' || issue.severity === 'P1') ? 'completed with blocking findings' : 'completed';
  } catch (error) {
    addIssue(record, classifyError(error), 'agent.run', error instanceof Error ? error.message : String(error));
    record.result = 'failed';
  } finally {
    record.endedAt = new Date().toISOString();
    if (context) await context.close().catch(() => undefined);
    record.released = true;
  }
}

function finalizeAgentRecords() {
  for (const agent of runState.agents) {
    agent.coveredModules = [...agent.coveredModules].sort();
    agent.coveredFunctions = [...agent.coveredFunctions].sort();
  }
}

async function writeMarkdownSummary() {
  await mkdir(outputDir, { recursive: true });
  const state = serializeRunState();
  const severityCounts = state.issues.reduce((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    return counts;
  }, {});
  const lines = [
    '# NexaChat long real-click functional test',
    '',
    `- Project root: ${state.projectRoot}`,
    `- Run id: ${state.runId}`,
    `- Server URL: ${state.serverUrl}`,
    `- Start: ${state.startedAt}`,
    `- End: ${state.endedAt}`,
    `- Active duration minutes: ${(state.activeDurationMs / 60000).toFixed(2)}`,
    `- Agents used: ${state.agents.length}`,
    `- Maximum parallel agents: ${state.maximumParallelAgents}`,
    `- Agents released: ${state.agentsReleased}`,
    `- Modules covered: ${state.modulesCovered.join(', ')}`,
    `- Function interactions covered: ${state.functionsCovered.length}`,
    `- Unavailable/unsafe functions recorded: ${Object.keys(state.unavailableFunctions).length}`,
    `- Issue counts: ${JSON.stringify(severityCounts)}`,
    '',
    '## Agents',
    '',
    ...state.agents.flatMap((agent) => [
      `### ${agent.id}`,
      `- Persona: ${agent.persona}`,
      `- Skill level: ${agent.skillLevel}`,
      `- Scope: ${agent.assignedScope}`,
      `- Start: ${agent.startedAt}`,
      `- End: ${agent.endedAt}`,
      `- Iterations: ${agent.iterations}`,
      `- Interactions: ${agent.interactions}`,
      `- Result: ${agent.result}`,
      `- Covered modules: ${agent.coveredModules.join(', ')}`,
      `- Issues: ${agent.issues.length}`,
      `- Released: ${agent.released === true}`,
      '',
    ]),
    '## Issues',
    '',
    ...(state.issues.length > 0
      ? state.issues.map((issue) => `- ${issue.severity} ${issue.area}: ${issue.message}${issue.detail ? ` (${issue.detail})` : ''}`)
      : ['- No P0/P1/P2 issues recorded by the long-click agents.']),
    '',
    '## Unavailable Or Unsafe',
    '',
    ...Object.entries(state.unavailableFunctions).map(([name, reason]) => `- ${name}: ${reason}`),
    '',
  ];
  await writeFile(resultMdPath, `${lines.join('\n')}\n`);
}

async function main() {
  await mkdir(fixturesDir, { recursive: true });
  const port = await findFreePort(5173);
  const baseUrl = `http://127.0.0.1:${port}`;
  runState.serverUrl = baseUrl;
  const server = runControlled('node', ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], {
    env: { VITE_NEXACHAT_BROWSER_MOCK: '1' },
  });
  let stoppingServer = false;
  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));
  server.once('exit', (code) => {
    if (stoppingServer) {
      return;
    }
    if (code !== 0 && process.exitCode === undefined) {
      process.exitCode = code ?? 1;
    }
  });

  let heartbeat = null;
  let browser = null;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });
    const activeStart = new Date();
    runState.startedAt = activeStart.toISOString();
    const endAt = activeStart.getTime() + testDurationMs;
    heartbeat = setInterval(() => {
      runState.activeDurationMs = Date.now() - activeStart.getTime();
      void writeProgress();
    }, HEARTBEAT_MS);
    console.log(`LONG_CLICK_TEST_START runId=${runId} localStart=${localTime(activeStart)} agents=${agentDefinitions.length} minutes=${requestedMinutes} url=${baseUrl}`);
    await Promise.all(agentDefinitions.map((definition) => runAgent(definition, browser, baseUrl, endAt)));
    const activeEnd = new Date();
    runState.endedAt = activeEnd.toISOString();
    runState.activeDurationMs = activeEnd.getTime() - activeStart.getTime();
    runState.agentsReleased = runState.agents.every((agent) => agent.released === true);
    finalizeAgentRecords();
    await mkdir(outputDir, { recursive: true });
    await writeProgress();
    await writeFile(resultJsonPath, JSON.stringify(serializeRunState(), null, 2));
    await writeMarkdownSummary();
    console.log(`LONG_CLICK_TEST_DONE runId=${runId} localEnd=${localTime(activeEnd)} activeMinutes=${(runState.activeDurationMs / 60000).toFixed(2)} agentsReleased=${runState.agentsReleased}`);
    console.log(`LONG_CLICK_TEST_RESULTS ${resultJsonPath}`);
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    if (browser) await browser.close().catch(() => undefined);
    stoppingServer = true;
    await terminate(server);
  }
}

await main();
