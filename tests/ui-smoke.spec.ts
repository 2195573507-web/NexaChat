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

async function expectHorizontalScrollContainer(page: Page, selector: string) {
  const box = await page.locator(selector).first().evaluate((element) => ({
    clientWidth: element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
  }));
  expect(box.clientWidth, `${selector} should keep a usable visible width`).toBeGreaterThan(320);
  expect(['auto', 'scroll']).toContain(box.overflowX);
}

async function clickModule(page: Page, module: NavModule) {
  await page.locator('.module-nav-item').filter({ hasText: module.label }).first().click();
}

async function clickFeature(page: Page, tab: NavTab) {
  await page.locator('.module-child-link').getByRole('button', { name: new RegExp(tab.label) }).first().click();
}

async function openFeature(page: Page, module: NavModule, tab: NavTab) {
  const expandButton = page.getByRole('button', { name: new RegExp(`展开${module.label}|收起${module.label}`) });
  if ((await expandButton.getAttribute('aria-expanded')) === 'false') {
    await expandButton.click();
  }
  await page.locator(`#sidebar-children-${module.id}`).getByRole('button', { name: new RegExp(tab.label) }).click();
}

async function clickTab(page: Page, module: NavModule, tab: NavTab) {
  await page.locator(`#tab-${module.id}-${tab.id}`).click();
}

async function expectActiveRouteAndPanel(page: Page, module: NavModule, tab: NavTab) {
  await expect(page.locator(`#tab-${module.id}-${tab.id}`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.module-subnav-panel')).toContainText('二级导航');
  await expect(page.locator('.module-subnav-summary')).toContainText(tab.label);
  await expect(page.locator('.module-child-link.is-active')).toContainText(tab.label);
  await expect(page).toHaveURL(new RegExp(`${getTabRoute(module.id, tab.id)}$`));
  const panel = page.locator(`main [role="tabpanel"][data-module="${module.id}"][data-tab="${tab.id}"]`);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: tab.label }).first()).toBeVisible();
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
});

test('model gateway data and settings key flows stay real on new routes', async ({ page }) => {
  await page.goto('/');

  const models = navModules.find((module) => module.id === 'models')!;
  const gateway = navModules.find((module) => module.id === 'gateway')!;
  const data = navModules.find((module) => module.id === 'data')!;
  const settings = navModules.find((module) => module.id === 'settings')!;

  await openFeature(page, models, models.tabs.find((tab) => tab.id === 'providers')!);
  await expect(page.locator('main [data-tab="providers"]').getByRole('heading', { name: 'Provider 管理' }).first()).toBeVisible();
  await clickTab(page, models, models.tabs.find((tab) => tab.id === 'catalog')!);
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
      await clickTab(page, module, tab);
      await expectActiveRouteAndPanel(page, module, tab);
    }
  }
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
    await expectHorizontalScrollContainer(page, '.module-tabs');
  }

  await page.goto('/chat/playground');
  await expect(page.getByPlaceholder('输入消息，本地保存后再路由到模型...')).toBeVisible();
  await expect(page.locator('.chat-context')).toBeHidden();
  await expectNoHorizontalOverflow(page, '.chat-layout');
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
  await expect(page.locator('.module-tabs').getByRole('tab', { name: /界面偏好/ })).toHaveAttribute('aria-selected', 'true');
  await expectNoHorizontalOverflow(page, '.app-shell');
});
