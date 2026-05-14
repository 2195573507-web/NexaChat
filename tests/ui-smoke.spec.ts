import { expect, test, type Page } from '@playwright/test';
import { getDefaultTab, getTabRoute, navModules } from '../src/shared/navigation';
import type { NavModule, NavTab } from '../src/shared/types';

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

async function clickModule(page: Page, module: NavModule) {
  await page.locator('.module-nav-item').filter({ hasText: module.label }).first().click();
}

async function openFeature(page: Page, module: NavModule, tab: NavTab) {
  const expandButton = page.getByRole('button', { name: new RegExp(`展开${module.label}|收起${module.label}`) });
  if ((await expandButton.getAttribute('aria-expanded')) === 'false') {
    await expandButton.click();
  }
  await page.locator(`#sidebar-children-${module.id}`).getByRole('button', { name: new RegExp(tab.label) }).click();
}

async function expectActiveRouteAndPanel(page: Page, module: NavModule, tab: NavTab) {
  await expect(page.locator('.module-subnav-panel')).toHaveCount(0);
  await expect(page.locator('.module-tabs')).toHaveCount(0);
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
  await page.getByPlaceholder('输入消息，本地保存后再路由到模型...').fill('浏览器模式发送测试');
  await page.getByRole('button', { name: /发送/ }).click();

  await expect(page.getByText('浏览器模式发送测试', { exact: true })).toBeVisible();
  await expect(page.getByText(/Mock response from nexachat-mock/)).toBeVisible();
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
  await expect(page.locator('main [data-tab="providers"]').getByRole('heading', { name: 'Provider 管理' }).first()).toBeVisible();
  await openFeature(page, models, models.tabs.find((tab) => tab.id === 'catalog')!);
  await expect(page.locator('main [data-tab="catalog"]').getByRole('heading', { name: '模型创建' }).first()).toBeVisible();

  await openFeature(page, gateway, gateway.tabs.find((tab) => tab.id === 'keys')!);
  await expect(page.locator('main [data-tab="keys"]').getByRole('heading', { name: 'Gateway API Key' }).first()).toBeVisible();
  await page.getByRole('button', { name: /生成 Key/ }).click();
  await expect(page.getByText('一次性完整 Key')).toBeVisible();
  await page.getByRole('button', { name: /撤销/ }).first().click();
  await expect(page.getByText('已撤销').first()).toBeVisible();

  await openFeature(page, data, data.tabs.find((tab) => tab.id === 'diagnostics')!);
  await page.getByRole('button', { name: /导出诊断预览/ }).click();
  await expect(page.locator('main [data-tab="diagnostics"]').getByRole('cell', { name: /Exported browser mock diagnostics/ })).toBeVisible();

  await openFeature(page, settings, settings.tabs.find((tab) => tab.id === 'security')!);
  await expect(page.locator('main [data-tab="security"]').getByRole('heading', { name: '安全存储与 IPC 边界' }).first()).toBeVisible();
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

  await expect(page.getByRole('region', { name: '工作台首页' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '当前概览' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '核心指标' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '操作入口' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '最近活动' })).toBeVisible();
  await expect(page.getByText('系统总览')).toHaveCount(0);
  await expect(page.getByText('真实快速入口')).toHaveCount(0);
  await expect(page.getByText('启动状态与下一步')).toHaveCount(0);
  await expect(page.locator('.module-child-link.is-active')).toContainText('工作台首页');

  const quickEntries = [
    { label: '打开聊天', path: '/chat/playground', moduleId: 'chat', tabId: 'playground' },
    { label: '管理 Provider', path: '/models/providers', moduleId: 'models', tabId: 'providers' },
    { label: '管理 Model', path: '/models/catalog', moduleId: 'models', tabId: 'catalog' },
    { label: '管理 Gateway Key', path: '/gateway/keys', moduleId: 'gateway', tabId: 'keys' },
    { label: '导入配置', path: '/data/import', moduleId: 'data', tabId: 'import' },
    { label: '查看日志', path: '/gateway/logs', moduleId: 'gateway', tabId: 'logs' },
  ];

  for (const entry of quickEntries) {
    await page.goto('/workspace/overview');
    await page.getByLabel('操作入口').getByRole('button', { name: new RegExp(entry.label) }).click();
    await expect(page).toHaveURL(new RegExp(`${entry.path}$`));
    const panel = page.locator(`main [role="tabpanel"][data-module="${entry.moduleId}"][data-tab="${entry.tabId}"]`);
    await expect(panel).toBeVisible();
  }
});

test('sidebar expansion persists and never exposes route paths', async ({ page }) => {
  await page.goto('/workspace/overview');
  const gateway = navModules.find((module) => module.id === 'gateway')!;
  const expandButton = page.getByRole('button', { name: new RegExp(`展开${gateway.label}|收起${gateway.label}`) });

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
  await expect(page.getByRole('button', { name: new RegExp(`收起${gateway.label}`) })).toHaveAttribute('aria-expanded', 'true');
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
    await expect(page.locator('.module-tabs')).toHaveCount(0);
  }

  await page.goto('/chat/playground');
  await expect(page.getByPlaceholder('输入消息，本地保存后再路由到模型...')).toBeVisible();
  await expect(page.locator('.chat-context')).toBeHidden();
  await expectNoHorizontalOverflow(page, '.chat-layout');
});

test('shell stays readable at 1280 1440 and 1920 widths', async ({ page }) => {
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 820 });
    await page.goto('/workspace/overview');
    await expect(page.getByRole('heading', { name: '当前概览' })).toBeVisible();
    await expectNoHorizontalOverflow(page, '.app-shell');
    await expectNoHorizontalOverflow(page, '.topbar');
    await expectNoHorizontalOverflow(page, '.content-grid');
    await expectNoHorizontalOverflow(page, '.workbench-overview');
    await expect(page.locator('.topbar-context')).toContainText('默认模型');
    await expect(page.locator('.topbar-actions')).toContainText('打开聊天');
    await expectNoVisibleRouteLeak(page);
  }
});

test('data import rejects invalid manifests and records the failure visibly', async ({ page }) => {
  await page.goto('/data/import');
  await page.getByLabel('导入清单 JSON').fill('{"bad":true}');
  await page.getByRole('button', { name: /预检清单/ }).click();
  await expect(page.getByText(/导入清单被拒绝/)).toBeVisible();
});

test('theme and language preferences can change without breaking the shell', async ({ page }) => {
  await page.goto('/settings/preferences');

  await page.getByLabel('Theme').selectOption('dark');
  await page.getByLabel('Language').selectOption('en-US');
  await page.getByLabel('Motion').selectOption('reduced');
  await page.getByRole('button', { name: /保存界面偏好/ }).click();

  await expect(page.locator('.app-shell')).toHaveClass(/theme-dark/);
  await expect(page.locator('.module-child-link.is-active')).toContainText('界面偏好');
  await expectNoHorizontalOverflow(page, '.app-shell');
});
