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
  await expect(page.locator(selector).first()).toBeVisible();
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

async function openModule(page: Page, module: NavModule) {
  await page.locator('.rail-item').filter({ hasText: module.shortLabel }).click();
}

async function openFeature(page: Page, module: NavModule, tab: NavTab) {
  await openModule(page, module);
  await page.locator('.top-tabs').getByRole('button', { name: new RegExp(tab.label) }).click();
}

async function expectActiveRouteAndPanel(page: Page, module: NavModule, tab: NavTab) {
  await expect(page.locator('.app-shell')).toHaveCount(0);
  await expect(page.locator('.module-switcher')).toHaveCount(0);
  await expect(page.locator('.module-nav-item')).toHaveCount(0);
  await expect(page.locator('.module-tabs')).toHaveCount(0);
  await expect(page.locator('.module-subnav-panel')).toHaveCount(0);
  await expect(page.locator('.top-tab.is-active')).toContainText(tab.label);
  await expect(page).toHaveURL(new RegExp(`${getTabRoute(module.id, tab.id)}$`));
  const panel = page.locator(`main [role="tabpanel"][data-module="${module.id}"][data-tab="${tab.id}"]`);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('aria-label', tab.label);
  await expectNoVisibleRouteLeak(page);
}

test('browser renderer opens as chat-first app and can send a message', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/chat\/conversations$/);
  await expect(page.locator('.app-frame')).toBeVisible();
  await expect(page.locator('.module-rail')).toBeVisible();
  await expect(page.locator('.module-switcher')).toHaveCount(0);
  await expect(page.locator('.work-surface')).toBeVisible();
  await expect(page.locator('.rail-item')).toHaveCount(navModules.length);
  await expect(page.locator('main [data-module="chat"][data-tab="conversations"]')).toBeVisible();
  await expect(page.locator('.chat-first-layout')).toBeVisible();
  await expect(page.locator('.chat-sidebar')).toBeVisible();
  await expect(page.locator('.chat-main')).toBeVisible();

  for (const module of navModules) {
    await expect(page.locator('.rail-item').filter({ hasText: module.shortLabel })).toBeVisible();
  }

  const message = 'browser mode send test';
  const composer = page.getByPlaceholder(translate('zh-CN', 'chat.composer.placeholder'));
  await expect(composer).toHaveJSProperty('tagName', 'TEXTAREA');
  await composer.fill(message);
  await page.getByRole('button', { name: translate('zh-CN', 'chat.send') }).click();

  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByText(/Mock response from nexachat-mock/)).toBeVisible();
  await expect(page.getByText(translate('zh-CN', 'chat.message.copy')).first()).toBeVisible();
  await expect(page.getByText(translate('zh-CN', 'chat.message.retry')).first()).toBeVisible();
  await expect(page.getByText(translate('zh-CN', 'chat.message.regenerate')).first()).toBeVisible();
  await expect(page.locator('.chat-composer')).toBeVisible();
  await expect(page.locator('.message-bubble').first()).toBeVisible();
  await expectNoHorizontalOverflow(page, '.app-frame');
  await expectNoHorizontalOverflow(page, '.work-surface');
  await expectNoHorizontalOverflow(page, '.chat-first-layout');
  await expectNoVisibleRouteLeak(page);
});

test('core management pages keep real contracts behind lightweight tabs', async ({ page }) => {
  await page.goto('/');

  const models = navModules.find((module) => module.id === 'models')!;
  const gateway = navModules.find((module) => module.id === 'gateway')!;
  const knowledge = navModules.find((module) => module.id === 'knowledge')!;
  const tools = navModules.find((module) => module.id === 'tools')!;
  const data = navModules.find((module) => module.id === 'data')!;
  const settings = navModules.find((module) => module.id === 'settings')!;

  await openFeature(page, models, models.tabs.find((tab) => tab.id === 'providers')!);
  await expect(page.locator('main [data-tab="providers"] .current-config-strip')).toBeVisible();
  await expect(page.locator('main [data-tab="providers"] .provider-switch-list')).toBeVisible();

  await openFeature(page, gateway, gateway.tabs.find((tab) => tab.id === 'overview')!);
  await expect(page.locator('main [data-tab="overview"] .gateway-console')).toBeVisible();
  await expect(page.locator('main [data-tab="overview"] .endpoint-list')).toBeVisible();
  await openFeature(page, gateway, gateway.tabs.find((tab) => tab.id === 'keys')!);
  await expect(page.locator('main [data-tab="keys"]').getByRole('heading', { name: translate('zh-CN', 'gateway.keys.title') }).first()).toBeVisible();
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'gateway.generateKey')) }).click();
  await expect(page.locator('main [data-tab="keys"] .inline-notice').getByText(translate('zh-CN', 'gateway.oneTimeKey'))).toBeVisible();

  await openFeature(page, knowledge, knowledge.tabs.find((tab) => tab.id === 'files')!);
  await expect(page.locator('main [data-tab="files"] .current-config-strip')).toBeVisible();
  await expect(page.locator('main [data-tab="files"]').getByLabel(translate('zh-CN', 'knowledge.import.content'))).toBeVisible();

  await openFeature(page, tools, tools.tabs.find((tab) => tab.id === 'mcp')!);
  await expect(page.locator('main [data-tab="mcp"] .current-config-strip')).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(translate('zh-CN', 'tools.mcp.register')) })).toBeDisabled();

  await openFeature(page, data, data.tabs.find((tab) => tab.id === 'diagnostics')!);
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'data.diagnostics.export')) }).click();
  await expect(page.locator('.module-page > .inline-notice').getByText(translate('zh-CN', 'data.toast.diagnosticsExported'))).toBeVisible();

  await openFeature(page, settings, settings.tabs.find((tab) => tab.id === 'security')!);
  await expect(page.locator('main [data-tab="security"] .current-config-strip')).toBeVisible();
  await expect(page.locator('main [data-tab="security"]').getByRole('heading', { name: translate('zh-CN', 'settings.security.title') }).first()).toBeVisible();

  await expect(page.locator('table')).toHaveCount(0);
  await expectNoHorizontalOverflow(page, '.app-frame');
  await expectNoVisibleRouteLeak(page);
});

test('all modules and feature routes sync the top tabs and panel', async ({ page }) => {
  await page.goto('/');

  for (const module of navModules) {
    await openModule(page, module);
    await expectActiveRouteAndPanel(page, module, getDefaultTab(module));

    for (const tab of module.tabs) {
      await openFeature(page, module, tab);
      await expectActiveRouteAndPanel(page, module, tab);
    }
  }
});

test('route fallback and desktop floor stay overflow-free', async ({ page }) => {
  await page.setViewportSize({ width: 1040, height: 680 });
  const chat = navModules.find((module) => module.id === 'chat')!;
  const settings = navModules.find((module) => module.id === 'settings')!;
  const models = navModules.find((module) => module.id === 'models')!;

  await page.goto('/');
  await expectActiveRouteAndPanel(page, chat, chat.tabs[0]);

  await page.goto('/settings/request-logs');
  await expectActiveRouteAndPanel(page, settings, settings.tabs[0]);

  await page.goto('/models/not-real');
  await expectActiveRouteAndPanel(page, models, models.tabs[0]);

  for (const path of ['/chat/conversations', '/models/providers', '/gateway/keys', '/settings/preferences']) {
    await page.goto(path);
    await expect(page.locator('.app-frame')).toBeVisible();
    await expectNoHorizontalOverflow(page, '.app-frame');
    await expectNoHorizontalOverflow(page, '.work-surface');
    await expect(page.locator('.app-shell')).toHaveCount(0);
    await expect(page.locator('.module-tabs')).toHaveCount(0);
    await expect(page.locator('.module-subnav-panel')).toHaveCount(0);
    await expectNoVisibleRouteLeak(page);
  }
});

test('knowledge data and tools flows keep real contracts in the new panels', async ({ page }) => {
  const knowledge = navModules.find((module) => module.id === 'knowledge')!;
  const tools = navModules.find((module) => module.id === 'tools')!;
  await page.goto('/knowledge/files');
  await expect(page.getByLabel(translate('zh-CN', 'knowledge.import.name'))).toHaveValue('');
  await expect(page.getByLabel(translate('zh-CN', 'knowledge.import.content'))).toHaveValue('');
  await page.getByLabel(translate('zh-CN', 'knowledge.import.name')).fill('round-redesign-smoke.md');
  await page.getByLabel(translate('zh-CN', 'knowledge.import.content')).fill('The redesign smoke verifies retrieval citations in the lightweight tool panels.');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'knowledge.import.create')) }).click();
  await expect(page.locator('main [data-tab="files"]').getByText('round-redesign-smoke.md')).toBeVisible();
  await expect(page.locator('main [data-tab="files"]').getByText(translate('zh-CN', 'common.indexed')).first()).toBeVisible();

  await openFeature(page, knowledge, knowledge.tabs.find((tab) => tab.id === 'retrieval')!);
  await page.getByLabel(translate('zh-CN', 'knowledge.retrieval.query')).fill('retrieval citations smoke');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'knowledge.retrieval.run')) }).click();
  await expect(page.locator('main [data-tab="retrieval"]').getByText('round-redesign-smoke.md')).toBeVisible();

  await openFeature(page, tools, tools.tabs.find((tab) => tab.id === 'runs')!);
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'tools.execution.runStatusRead')) }).click();
  await expect(page.locator('main [data-tab="runs"]').getByText(/NexaChat status read/).first()).toBeVisible();

  await openFeature(page, tools, tools.tabs.find((tab) => tab.id === 'agents')!);
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'tools.dryRun.generate')) }).first().click();
  await openFeature(page, tools, tools.tabs.find((tab) => tab.id === 'runs')!);
  await expect(page.locator('main [data-tab="runs"]').getByText(/Agent/).first()).toBeVisible();
});

test('theme and language preferences keep light dark and system modes usable', async ({ page }) => {
  await page.goto('/settings/preferences');

  await page.getByLabel(translate('zh-CN', 'settings.preferences.theme')).selectOption('dark');
  await page.getByLabel(translate('zh-CN', 'settings.preferences.language')).selectOption('en-US');
  await page.getByLabel(translate('zh-CN', 'settings.preferences.motion')).selectOption('reduced');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'settings.preferences.save')) }).click();

  await expect(page.locator('.app-frame')).toHaveClass(/theme-dark/);
  await expect(page.locator('.top-tab.is-active')).toContainText(translate('en-US', 'nav.settings.preferences.label'));
  await expect(page.locator('.command-actions')).toContainText(translate('en-US', 'shell.openChat'));
  await expect(page.locator('main [data-tab="preferences"]').getByRole('heading', { name: translate('en-US', 'settings.preferences.title') }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, '.app-frame');
  await page.screenshot({ path: 'test-results/ui-full-redesign/dark-en-preferences.png', fullPage: true });

  await page.getByLabel(translate('en-US', 'settings.preferences.theme')).selectOption('light');
  await page.getByRole('button', { name: new RegExp(translate('en-US', 'settings.preferences.save')) }).click();
  await expect(page.locator('.app-frame')).toHaveClass(/theme-light/);
  await expect(page.locator('.app-frame')).toHaveAttribute('data-theme-mode', 'light');
  await expect(page.locator('.app-frame')).toHaveAttribute('data-resolved-theme', 'light');
  await expectNoHorizontalOverflow(page, '.app-frame');
  await page.screenshot({ path: 'test-results/ui-full-redesign/light-en-preferences.png', fullPage: true });
});

test('system theme follows OS preference changes without resetting saved preferences', async ({ page }) => {
  await mockSystemTheme(page, true);
  await page.goto('/settings/preferences');

  await expect(page.locator('.app-frame')).toHaveClass(/theme-dark/);
  await expect(page.locator('.app-frame')).toHaveAttribute('data-theme-mode', 'system');
  await expect(page.locator('.app-frame')).toHaveAttribute('data-resolved-theme', 'dark');

  await page.getByLabel(translate('zh-CN', 'settings.preferences.language')).selectOption('en-US');
  await page.getByLabel(translate('zh-CN', 'settings.preferences.density')).selectOption('compact');
  await page.getByRole('button', { name: new RegExp(translate('zh-CN', 'settings.preferences.save')) }).click();
  await expect(page.locator('.app-frame')).toHaveClass(/density-compact/);
  await expect(page.locator('.command-actions')).toContainText(translate('en-US', 'shell.openChat'));
  await expect(page.locator('.app-frame')).toHaveAttribute('data-theme-mode', 'system');
  await expect(page.locator('.app-frame')).toHaveAttribute('data-resolved-theme', 'dark');

  await page.evaluate(() => window.__setNexaChatSystemDark(false));
  await expect(page.locator('.app-frame')).toHaveClass(/theme-light/);
  await expect(page.locator('.app-frame')).toHaveAttribute('data-resolved-theme', 'light');
  await expect(page.locator('.app-frame')).toHaveClass(/density-compact/);
  await expect(page.locator('.command-actions')).toContainText(translate('en-US', 'shell.openChat'));
  await page.screenshot({ path: 'test-results/ui-full-redesign/system-light-en-preferences.png', fullPage: true });
});
