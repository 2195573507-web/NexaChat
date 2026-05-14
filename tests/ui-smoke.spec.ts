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
  await page.locator('.module-nav').getByRole('button', { name: new RegExp(module.label) }).click();
}

async function clickTab(page: Page, tab: NavTab) {
  await page.locator('.module-tabs').getByRole('tab', { name: new RegExp(tab.label) }).click();
}

async function expectActiveRouteAndPanel(page: Page, module: NavModule, tab: NavTab) {
  await expect(page.locator('.module-tabs').getByRole('tab', { name: new RegExp(tab.label) })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(new RegExp(`${getTabRoute(module.id, tab.id)}$`));
  const panel = page.locator(`main [role="tabpanel"][data-module="${module.id}"][data-tab="${tab.id}"]`);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: tab.label }).first()).toBeVisible();
}

async function expectPlaceholderIsNonExecutable(page: Page, module: NavModule, tab: NavTab) {
  const panel = page.locator(`main [role="tabpanel"][data-module="${module.id}"][data-tab="${tab.id}"]`);
  await expect(panel.getByText(/当前阶段/)).toBeVisible();
  await expect(panel.getByText(/下一实现依赖/)).toBeVisible();
  await expect(panel.getByRole('button')).toHaveCount(0);
}

test('browser renderer exposes modules and can send chat through fallback API', async ({ page }) => {
  await page.goto('/');

  for (const module of navModules) {
    await expect(page.locator('.module-nav').getByRole('button', { name: new RegExp(module.label) })).toBeVisible();
  }

  await clickModule(page, navModules.find((module) => module.id === 'chat')!);
  await page.getByPlaceholder('输入消息，本地保存后再路由到模型...').fill('浏览器模式发送测试');
  await page.getByRole('button', { name: /发送/ }).click();

  await expect(page.getByText('浏览器模式发送测试', { exact: true })).toBeVisible();
  await expect(page.getByText(/Mock response from nexachat-mock/)).toBeVisible();
  await expectNoHorizontalOverflow(page, '.app-shell');
  await expectNoHorizontalOverflow(page, '.content-grid');
  await expectNoHorizontalOverflow(page, '.chat-layout');
});

test('browser renderer shows model gateway and settings key areas', async ({ page }) => {
  await page.goto('/');
  const models = navModules.find((module) => module.id === 'models')!;
  const gateway = navModules.find((module) => module.id === 'gateway')!;
  const settings = navModules.find((module) => module.id === 'settings')!;

  await clickModule(page, models);
  await expect(page.getByRole('heading', { name: 'Provider Hub' })).toBeVisible();
  await clickTab(page, models.tabs.find((tab) => tab.id === 'capabilities')!);
  await expect(page.locator('main [data-tab="capabilities"]').getByRole('heading', { name: '密钥管理' }).first()).toBeVisible();

  await clickModule(page, gateway);
  await expect(page.getByRole('heading', { name: '本地 OpenAI-compatible 网关' })).toBeVisible();
  await clickTab(page, gateway.tabs.find((tab) => tab.id === 'integrations')!);
  await expect(page.getByRole('heading', { name: '导入配置预览' })).toBeVisible();
  await clickTab(page, gateway.tabs.find((tab) => tab.id === 'keys')!);
  await page.getByRole('button', { name: /生成 Key/ }).click();
  await expect(page.getByText('一次性完整 Key')).toBeVisible();
  await page.getByRole('button', { name: /撤销/ }).first().click();
  await expect(page.getByText('已撤销').first()).toBeVisible();

  await clickModule(page, settings);
  await expect(page.locator('main [data-tab="request-logs"]').getByRole('heading', { name: '运行监控' }).first()).toBeVisible();
  await clickTab(page, settings.tabs.find((tab) => tab.id === 'ui')!);
  await expect(page.locator('main [data-tab="ui"]').getByRole('heading', { name: '系统设置' }).first()).toBeVisible();
});

test('all modules and secondary tabs sync active state route and panel', async ({ page }) => {
  await page.goto('/');

  for (const module of navModules) {
    await clickModule(page, module);
    await expectActiveRouteAndPanel(page, module, getDefaultTab(module));

    for (const tab of module.tabs) {
      await clickTab(page, tab);
      await expectActiveRouteAndPanel(page, module, tab);

      if (tab.stage === 'planned' || tab.stage === 'reserved') {
        await expectPlaceholderIsNonExecutable(page, module, tab);
      }
    }
  }
});

test('unknown tab routes fall back to module defaults', async ({ page }) => {
  await page.goto('/models/not-real');
  await expectActiveRouteAndPanel(page, navModules.find((module) => module.id === 'models')!, navModules.find((module) => module.id === 'models')!.tabs[0]);
});

test('renderer keeps the 1040x680 desktop floor usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1040, height: 680 });
  for (const path of ['/chat/conversations', '/models/capabilities', '/gateway/keys', '/settings/request-logs']) {
    await page.goto(path);
    await expect(page.locator('.right-rail')).toBeHidden();
    await expectNoHorizontalOverflow(page, '.app-shell');
    await expectNoHorizontalOverflow(page, '.content-grid');
    await expectHorizontalScrollContainer(page, '.module-tabs');
  }

  await page.goto('/chat/conversations');
  await expect(page.getByPlaceholder('输入消息，本地保存后再路由到模型...')).toBeVisible();
  await expect(page.locator('.chat-context')).toBeHidden();
  await expectNoHorizontalOverflow(page, '.chat-layout');
});

test('data import rejects invalid manifests and records the failure visibly', async ({ page }) => {
  await page.goto('/');
  await clickModule(page, navModules.find((module) => module.id === 'data')!);
  await page.getByLabel('导入清单 JSON').fill('{"bad":true}');
  await page.getByRole('button', { name: /预检清单/ }).click();
  await expect(page.getByText(/导入清单被拒绝/)).toBeVisible();
});

test('theme and language preferences can change without breaking the shell', async ({ page }) => {
  await page.goto('/settings/ui');

  await page.getByLabel('Theme').selectOption('dark');
  await page.getByLabel('Language').selectOption('en-US');
  await page.getByLabel('Motion').selectOption('reduced');
  await page.getByRole('button', { name: /保存系统设置/ }).click();

  await expect(page.locator('.app-shell')).toHaveClass(/theme-dark/);
  await expect(page.locator('.module-tabs').getByRole('tab', { name: /系统设置/ })).toHaveAttribute('aria-selected', 'true');
  await expectNoHorizontalOverflow(page, '.app-shell');
});
