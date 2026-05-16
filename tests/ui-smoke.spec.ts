import { expect, test, type Page } from '@playwright/test';
import { translate } from '../src/shared/i18n';
import { getDefaultTab, getTabRoute, navModules } from '../src/shared/navigation';
import type { NavModule, NavTab } from '../src/shared/types';

declare global {
  interface Window {
    __setNexaChatSystemDark(nextDark: boolean): void;
  }
}

async function expectNoHorizontalOverflow(page: Page, selector: string) {
  const box = await page.locator(selector).first().evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(box.scrollWidth, `${selector} should not overflow horizontally`).toBeLessThanOrEqual(box.clientWidth + 1);
}

async function expectNoVisibleRouteLeak(page: Page) {
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toMatch(/(^|\s)\/(workspace|chat|models|knowledge|tools|gateway|data|settings)\//);
}

async function mockSystemTheme(page: Page, initialDark: boolean) {
  await page.addInitScript((dark) => {
    type Listener = (event: MediaQueryListEvent) => void;
    let matches = dark;
    const listeners = new Set<Listener>();
    window.matchMedia = (query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.add(listener as Listener);
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener as Listener);
      },
      addListener: (listener: Listener) => listeners.add(listener),
      removeListener: (listener: Listener) => listeners.delete(listener),
      dispatchEvent: () => true,
    });
    window.__setNexaChatSystemDark = (nextDark: boolean) => {
      matches = nextDark;
      const event = { matches, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    };
  }, initialDark);
}

async function clickModule(page: Page, module: NavModule) {
  await page.locator('.module-nav-item').filter({ hasText: module.label }).first().click();
}

async function openFeature(page: Page, module: NavModule, tab: NavTab) {
  const expandButton = page.getByRole('button', { name: new RegExp(`${translate('zh-CN', 'shell.expand')}${module.label}|${translate('zh-CN', 'shell.collapse')}${module.label}`) });
  if ((await expandButton.getAttribute('aria-expanded')) === 'false') {
    await expandButton.click();
  }
  await page.locator(`#sidebar-children-${module.id}`).getByRole('button', { name: new RegExp(tab.label) }).click();
}

async function expectActiveRouteAndPanel(page: Page, module: NavModule, tab: NavTab) {
  await expect(page.locator('.module-subnav-panel')).toBeVisible();
  await expect(page.locator('.module-subnav-panel')).toContainText(tab.label);
  await expect(page.locator('.module-tabs')).toBeVisible();
  await expect(page.locator('.module-tabs').getByRole('tab', { name: new RegExp(tab.label) })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.module-child-link.is-active')).toContainText(tab.label);
  await expect(page).toHaveURL(new RegExp(`${getTabRoute(module.id, tab.id)}$`));
  const panel = page.locator(`main [role="tabpanel"][data-module="${module.id}"][data-tab="${tab.id}"]`);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('aria-label', tab.label);
  await expect(panel.getByRole('heading', { name: tab.label }).first()).toBeVisible();
  await expectNoVisibleRouteLeak(page);
}

test('browser renderer exposes eight expandable modules and can send chat through fallback API', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/workspace\/overview$/);

  for (const module of navModules) {
    await expect(page.locator('.module-nav').getByRole('button', { name: new RegExp(module.label) }).first()).toBeVisible();
  }

  const chat = navModules.find((module) => module.id === 'chat')!;
  await openFeature(page, chat, chat.tabs.find((tab) => tab.id === 'playground')!);
  const message = 'browser mode send test';
  await page.getByPlaceholder(translate('zh-CN', 'chat.composer.placeholder')).fill(message);
  await page.getByRole('button', { name: translate('zh-CN', 'chat.send') }).click();

  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByText(/Mock response from nexachat-mock/)).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(translate('zh-CN', 'chat.exportConversation')) })).toBeVisible();
  await expect(page.getByText(translate('zh-CN', 'chat.message.copy')).first()).toBeVisible();
  await expect(page.getByText(translate('zh-CN', 'chat.compare.title'))).toBeVisible();
  await expectNoHorizontalOverflow(page, '.app-shell');
  await expectNoHorizontalOverflow(page, '.content-grid');
  await expectNoHorizontalOverflow(page, '.chat-layout');
  await expectNoVisibleRouteLeak(page);
});

test('model gateway data and settings key flows stay real on new routes', async ({ page }) => {
  await page.goto('/');

  const models = navModules.find((module) => module.id === 'models')!;
  const gateway = navModules.find((module) => module.id === 'gateway')!;
  const data = navModules.find((module) => module.id === 'data')!;
  const settings = navModules.find((module) => module.id === 'settings')!;

  await openFeature(page, models, models.tabs.find((tab) => tab.id === 'providers')!);
  await expect(page.locator('main [data-tab="providers"]').getByRole('heading', { name: translate('zh-CN', 'models.provider.title') }).first()).toBeVisible();
  await openFeature(page, models, models.tabs.find((tab) => tab.id === 'catalog')!);
  await expect(page.locator('main [data-tab="catalog"]').getByRole('heading', { name: translate('zh-CN', 'models.create.title') }).first()).toBeVisible();

  await openFeature(page, gateway, gateway.tabs.find((tab) => tab.id === 'keys')!);
  await expect(page.locator('main [data-tab="keys"]').getByRole('heading', { name: 'Gateway API Key' }).first()).toBeVisible();
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'gateway.generateKey')) }).click();
  await expect(page.getByText(translate('zh-CN', 'gateway.oneTimeKey'))).toBeVisible();
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'gateway.revoke')) }).first().click();
  await expect(page.getByText(translate('zh-CN', 'common.revoked')).first()).toBeVisible();

  await openFeature(page, data, data.tabs.find((tab) => tab.id === 'diagnostics')!);
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'data.diagnostics.export')) }).click();
  await expect(page.locator('main [data-tab="diagnostics"]').getByRole('cell', { name: /Exported browser mock diagnostics/ })).toBeVisible();

  await openFeature(page, settings, settings.tabs.find((tab) => tab.id === 'security')!);
  await expect(page.locator('main [data-tab="security"]').getByRole('heading', { name: translate('zh-CN', 'settings.security.title') }).first()).toBeVisible();
  await expect(page.locator('main [data-tab="security"]').getByRole('heading', { name: translate('zh-CN', 'settings.security.auditIntegrity') }).first()).toBeVisible();
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'settings.audit.verify')) }).first().click();
  await expect(page.locator('main [data-tab="security"]').getByText(translate('zh-CN', 'settings.audit.integrity')).first()).toBeVisible();
});

test('security audit tab verifies integrity and exports redacted audit data', async ({ page }) => {
  await page.goto('/settings/audit');
  await expect(page.locator('main [data-tab="audit"]').getByRole('heading', { name: translate('zh-CN', 'settings.audit.title') }).first()).toBeVisible();
  await expect(page.locator('main [data-tab="audit"]').getByText(translate('zh-CN', 'settings.audit.integrity')).first()).toBeVisible();
  await page.getByLabel(translate('zh-CN', 'settings.audit.search')).fill('gateway');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'settings.audit.verify')) }).click();
  await expect(page.locator('main [data-tab="audit"]').getByText(translate('zh-CN', 'settings.audit.integrity')).first()).toBeVisible();
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'settings.audit.export')) }).click();
  await page.getByLabel(translate('zh-CN', 'settings.audit.search')).fill('');
  await expect(page.locator('main [data-tab="audit"]').getByRole('cell', { name: 'audit.export' }).first()).toBeVisible();
});

test('all modules and feature routes sync sidebar subnav route and panel', async ({ page }) => {
  await page.goto('/');

  for (const module of navModules) {
    await clickModule(page, module);
    await expectActiveRouteAndPanel(page, module, getDefaultTab(module));

    for (const tab of module.tabs) {
      await openFeature(page, module, tab);
      await expectActiveRouteAndPanel(page, module, tab);
    }
  }
});

test('workspace home has four clean product areas and real quick entries', async ({ page }) => {
  await page.goto('/workspace/overview');

  await expect(page.getByRole('region', { name: translate('zh-CN', 'dashboard.home.aria') })).toBeVisible();
  await expect(page.getByRole('heading', { name: translate('zh-CN', 'dashboard.overview.title') })).toBeVisible();
  await expect(page.getByRole('heading', { name: translate('zh-CN', 'dashboard.metrics.title') })).toBeVisible();
  await expect(page.getByRole('heading', { name: translate('zh-CN', 'dashboard.actions.title') })).toBeVisible();
  await expect(page.getByRole('heading', { name: translate('zh-CN', 'dashboard.activity.title') })).toBeVisible();
  await expect(page.getByText('System overview')).toHaveCount(0);
  await expect(page.getByText('Real quick entries')).toHaveCount(0);
  await expect(page.getByText('Startup status and next steps')).toHaveCount(0);
  await expect(page.locator('.module-child-link.is-active')).toContainText(translate('zh-CN', 'nav.workspace.overview.label'));

  const quickEntries = [
    { label: translate('zh-CN', 'dashboard.action.chat'), path: '/chat/playground', moduleId: 'chat', tabId: 'playground' },
    { label: translate('zh-CN', 'dashboard.action.provider'), path: '/models/providers', moduleId: 'models', tabId: 'providers' },
    { label: translate('zh-CN', 'dashboard.action.model'), path: '/models/catalog', moduleId: 'models', tabId: 'catalog' },
    { label: translate('zh-CN', 'dashboard.action.gatewayKey'), path: '/gateway/keys', moduleId: 'gateway', tabId: 'keys' },
    { label: translate('zh-CN', 'dashboard.action.import'), path: '/data/import', moduleId: 'data', tabId: 'import' },
    { label: translate('zh-CN', 'dashboard.action.logs'), path: '/gateway/logs', moduleId: 'gateway', tabId: 'logs' },
  ];

  for (const entry of quickEntries) {
    await page.goto('/workspace/overview');
    await page.getByLabel(translate('zh-CN', 'dashboard.actions.title')).getByRole('button', { name: new RegExp(entry.label) }).click();
    await expect(page).toHaveURL(new RegExp(`${entry.path}$`));
    const panel = page.locator(`main [role="tabpanel"][data-module="${entry.moduleId}"][data-tab="${entry.tabId}"]`);
    await expect(panel).toBeVisible();
  }
});

test('sidebar expansion persists and never exposes route paths', async ({ page }) => {
  await page.goto('/workspace/overview');
  const gateway = navModules.find((module) => module.id === 'gateway')!;
  const expandButton = page.getByRole('button', { name: new RegExp(`${translate('zh-CN', 'shell.expand')}${gateway.label}|${translate('zh-CN', 'shell.collapse')}${gateway.label}`) });

  if ((await expandButton.getAttribute('aria-expanded')) === 'true') {
    await expandButton.click();
  }
  await expect(expandButton).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator(`#sidebar-children-${gateway.id}`)).toHaveCount(0);

  await expandButton.click();
  await expect(expandButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`#sidebar-children-${gateway.id}`)).toBeVisible();
  await expectNoVisibleRouteLeak(page);

  await page.reload();
  await expect(page.getByRole('button', { name: new RegExp(`${translate('zh-CN', 'shell.collapse')}${gateway.label}`) })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`#sidebar-children-${gateway.id}`)).toBeVisible();
});

test('legacy routes fall back to new canonical routes', async ({ page }) => {
  await page.goto('/dashboard/overview');
  await expectActiveRouteAndPanel(page, navModules.find((module) => module.id === 'workspace')!, navModules.find((module) => module.id === 'workspace')!.tabs[0]);

  await page.goto('/settings/request-logs');
  await expectActiveRouteAndPanel(page, navModules.find((module) => module.id === 'gateway')!, navModules.find((module) => module.id === 'gateway')!.tabs.find((tab) => tab.id === 'logs')!);

  await page.goto('/models/not-real');
  await expectActiveRouteAndPanel(page, navModules.find((module) => module.id === 'models')!, navModules.find((module) => module.id === 'models')!.tabs[0]);
});

test('renderer keeps the 1040x680 desktop floor usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1040, height: 680 });
  for (const path of ['/chat/playground', '/models/providers', '/gateway/keys', '/settings/preferences']) {
    await page.goto(path);
    await expect(page.locator('.right-rail')).toBeHidden();
    await expectNoHorizontalOverflow(page, '.app-shell');
    await expectNoHorizontalOverflow(page, '.content-grid');
    await expect(page.locator('.module-tabs')).toBeVisible();
    await expectNoHorizontalOverflow(page, '.module-subnav-panel');
  }

  await page.goto('/chat/playground');
  await expect(page.getByPlaceholder(translate('zh-CN', 'chat.composer.placeholder'))).toBeVisible();
  await expect(page.locator('.chat-context')).toBeHidden();
  await expectNoHorizontalOverflow(page, '.chat-layout');
});

test('shell stays readable at 1040 1280 1440 and 1920 widths', async ({ page }) => {
  for (const width of [1040, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 820 });
    await page.goto('/workspace/overview');
    await expect(page.getByRole('heading', { name: translate('zh-CN', 'dashboard.overview.title') })).toBeVisible();
    await expectNoHorizontalOverflow(page, '.app-shell');
    await expectNoHorizontalOverflow(page, '.topbar');
    await expectNoHorizontalOverflow(page, '.content-grid');
    await expectNoHorizontalOverflow(page, '.workbench-overview');
    await expect(page.locator('.topbar-context')).toContainText(translate('zh-CN', 'dashboard.defaultModel'));
    await expect(page.locator('.topbar-actions')).toContainText(translate('zh-CN', 'shell.openChat'));
    await expectNoVisibleRouteLeak(page);
    await page.screenshot({ path: `test-results/round-03-design-system/workspace-${width}.png`, fullPage: true });
  }
});

test('data import rejects invalid manifests and records the failure visibly', async ({ page }) => {
  await page.goto('/data/import');
  await page.getByLabel(translate('zh-CN', 'data.import.aria')).fill('{"bad":true}');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'data.import.preflight')) }).click();
  await expect(page.getByText(/rejected|refused|invalid|Import/i)).toBeVisible();
});

test('knowledge import retrieval rebuild delete and chat citations use one RAG chain', async ({ page }) => {
  const knowledge = navModules.find((module) => module.id === 'knowledge')!;
  await page.goto('/knowledge/files');
  await page.getByLabel(translate('zh-CN', 'knowledge.import.name')).fill('round-09-smoke.md');
  await page.getByLabel(translate('zh-CN', 'knowledge.import.content')).fill('Round 9 smoke verifies retrieval citations, rebuild, and delete in one knowledge pipeline.');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'knowledge.import.create')) }).click();
  await expect(page.locator('main [data-tab="files"]').getByRole('cell', { name: 'round-09-smoke.md' })).toBeVisible();
  await expect(page.locator('main [data-tab="files"]').getByText(translate('zh-CN', 'common.indexed')).first()).toBeVisible();

  await openFeature(page, knowledge, knowledge.tabs.find((tab) => tab.id === 'retrieval')!);
  await page.getByLabel(translate('zh-CN', 'knowledge.retrieval.query')).fill('retrieval citations smoke');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'knowledge.retrieval.run')) }).click();
  await expect(page.locator('main [data-tab="retrieval"]').getByRole('cell', { name: 'round-09-smoke.md', exact: true })).toBeVisible();

  const chat = navModules.find((module) => module.id === 'chat')!;
  await openFeature(page, chat, chat.tabs.find((tab) => tab.id === 'playground')!);
  await page.getByPlaceholder(translate('zh-CN', 'chat.composer.placeholder')).fill('How does retrieval citations smoke work?');
  await page.getByRole('button', { name: translate('zh-CN', 'chat.send') }).click();
  await expect(page.getByLabel(translate('zh-CN', 'chat.citations.aria')).first()).toBeVisible();

  await openFeature(page, knowledge, knowledge.tabs.find((tab) => tab.id === 'files')!);
  await page.locator('tr', { hasText: 'round-09-smoke.md' }).getByRole('button', { name: new RegExp(translate('zh-CN', 'knowledge.rebuild')) }).click();
  await expect(page.locator('main [data-tab="files"]').getByRole('cell', { name: 'round-09-smoke.md' })).toBeVisible();
  await page.locator('tr', { hasText: 'round-09-smoke.md' }).getByRole('button', { name: new RegExp(translate('zh-CN', 'knowledge.delete')) }).click();
  await expect(page.locator('main [data-tab="files"]').getByRole('cell', { name: 'round-09-smoke.md' })).toHaveCount(0);
});

test('tools run center uses unified execution trace approval chain', async ({ page }) => {
  const tools = navModules.find((module) => module.id === 'tools')!;
  await page.goto('/tools/runs');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'tools.execution.runStatusRead')) }).click();
  await expect(page.locator('main [data-tab="runs"]').getByRole('cell', { name: /Agent|工具|Tool|运行|run/i }).first()).toBeVisible();
  await expect(page.locator('main [data-tab="runs"]').getByText(translate('zh-CN', 'tools.execution.trace')).first()).toBeVisible();

  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'tools.execution.runEchoApproval')) }).click();
  await expect(page.locator('main [data-tab="runs"]').getByText(translate('zh-CN', 'tools.execution.approvals')).first()).toBeVisible();
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'tools.approve')) }).first().click();
  await expect(page.locator('main [data-tab="runs"]').getByText(translate('zh-CN', 'tools.execution.trace')).first()).toBeVisible();

  await openFeature(page, tools, tools.tabs.find((tab) => tab.id === 'agents')!);
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'tools.dryRun.generate')) }).first().click();
  await openFeature(page, tools, tools.tabs.find((tab) => tab.id === 'runs')!);
  await expect(page.locator('main [data-tab="runs"]').getByText(/Agent/).first()).toBeVisible();
});

test('theme and language preferences can change without breaking the shell', async ({ page }) => {
  await page.goto('/settings/preferences');

  await page.getByLabel(translate('zh-CN', 'settings.preferences.theme')).selectOption('dark');
  await page.getByLabel(translate('zh-CN', 'settings.preferences.language')).selectOption('en-US');
  await page.getByLabel(translate('zh-CN', 'settings.preferences.motion')).selectOption('reduced');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'settings.preferences.save')) }).click();

  await expect(page.locator('.app-shell')).toHaveClass(/theme-dark/);
  await expect(page.locator('.module-child-link.is-active')).toContainText(translate('en-US', 'nav.settings.preferences.label'));
  await expect(page.locator('.topbar-actions')).toContainText(translate('en-US', 'shell.openChat'));
  await expect(page.locator('main [data-tab="preferences"]').getByRole('heading', { name: translate('en-US', 'settings.preferences.title') }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, '.app-shell');
  await page.screenshot({ path: 'test-results/round-05-theme-runtime/dark-en-preferences.png', fullPage: true });

  await page.getByLabel(translate('en-US', 'settings.preferences.theme')).selectOption('light');
  await page.getByRole('button', { name: new RegExp(translate('en-US', 'settings.preferences.save')) }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/theme-light/);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme-mode', 'light');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-resolved-theme', 'light');
  await expectNoHorizontalOverflow(page, '.app-shell');
  await page.screenshot({ path: 'test-results/round-05-theme-runtime/light-en-preferences.png', fullPage: true });
});

test('system theme follows OS preference changes without resetting saved preferences', async ({ page }) => {
  await mockSystemTheme(page, true);
  await page.goto('/settings/preferences');

  await expect(page.locator('.app-shell')).toHaveClass(/theme-dark/);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme-mode', 'system');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-resolved-theme', 'dark');

  await page.getByLabel(translate('zh-CN', 'settings.preferences.language')).selectOption('en-US');
  await page.getByLabel(translate('zh-CN', 'settings.preferences.density')).selectOption('compact');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'settings.preferences.save')) }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/density-compact/);
  await expect(page.locator('.topbar-actions')).toContainText(translate('en-US', 'shell.openChat'));
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme-mode', 'system');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-resolved-theme', 'dark');

  await page.evaluate(() => window.__setNexaChatSystemDark(false));
  await expect(page.locator('.app-shell')).toHaveClass(/theme-light/);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-resolved-theme', 'light');
  await expect(page.locator('.app-shell')).toHaveClass(/density-compact/);
  await expect(page.locator('.topbar-actions')).toContainText(translate('en-US', 'shell.openChat'));
  await page.screenshot({ path: 'test-results/round-05-theme-runtime/system-light-en-preferences.png', fullPage: true });
});
