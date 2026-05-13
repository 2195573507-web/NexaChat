import { expect, test } from '@playwright/test';
import { navModules } from '../src/shared/navigation';

test('browser renderer exposes modules and can send chat through fallback API', async ({ page }) => {
  await page.goto('/');

  for (const module of navModules) {
    await expect(page.getByRole('button', { name: new RegExp(module.label) })).toBeVisible();
  }

  await page.getByRole('button', { name: /对话/ }).click();
  await page.getByPlaceholder('输入消息，本地保存后再路由到模型...').fill('浏览器模式发送测试');
  await page.getByRole('button', { name: /发送/ }).click();

  await expect(page.getByText('浏览器模式发送测试', { exact: true })).toBeVisible();
  await expect(page.getByText(/Mock response from nexachat-mock/)).toBeVisible();
});

test('browser renderer shows model gateway and settings key areas', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /模型/ }).click();
  await expect(page.getByRole('heading', { name: 'Provider Hub' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '能力矩阵' })).toBeVisible();

  await page.getByRole('button', { name: /本地网关/ }).click();
  await expect(page.getByRole('heading', { name: '本地 OpenAI-compatible 网关' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '外部接入生成器' })).toBeVisible();

  await page.getByRole('button', { name: /设置与安全/ }).click();
  await expect(page.getByRole('heading', { name: '请求日志' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '界面设置' })).toBeVisible();
});
