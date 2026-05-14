import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../src/renderer/App';
import { createMockApi } from '../src/renderer/mockApi';
import { modulePageRegistry } from '../src/renderer/modules/modulePageRegistry';
import { IPC_CHANNELS, IPC_CHANNEL_LIST, assertIpcPayload, isIpcChannel } from '../src/shared/ipc';
import { navModules, resolveNavigation, routeAliasRegistry } from '../src/shared/navigation';
import type { NavModule, NavTab } from '../src/shared/types';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.nexachat = createMockApi();
});

async function renderApp() {
  render(<App />);
  await screen.findByText('NexaChat');
}

function activePanel() {
  return document.querySelector('main [role="tabpanel"]') as HTMLElement;
}

function openFeature(module: NavModule, tab: NavTab) {
  const expandButton = screen.getByRole('button', { name: new RegExp(`展开${module.label}|收起${module.label}`) });
  if (expandButton.getAttribute('aria-expanded') === 'false') {
    fireEvent.click(expandButton);
  }
  const childList = document.getElementById(`sidebar-children-${module.id}`);
  if (!childList) {
    throw new Error(`Missing child list for ${module.id}`);
  }
  fireEvent.click(within(childList).getByRole('button', { name: new RegExp(tab.label) }));
}

describe('NexaChat renderer', () => {
  it('renders all eight first-level modules with expandable feature links', async () => {
    await renderApp();

    expect(document.querySelectorAll('.module-nav-group')).toHaveLength(navModules.length);
    expect(document.querySelectorAll('.module-nav-item')).toHaveLength(navModules.length);

    for (const module of navModules) {
      const expandButton = document.querySelector(`button[aria-controls="sidebar-children-${module.id}"]`) as HTMLButtonElement | null;
      if (!expandButton) {
        throw new Error(`Missing expand button for ${module.id}`);
      }
      const moduleButton = expandButton.parentElement?.querySelector('.module-nav-item');
      expect(moduleButton?.textContent).toContain(module.label);

      if (expandButton.getAttribute('aria-expanded') === 'false') {
        fireEvent.click(expandButton);
      }
      const childList = document.getElementById(`sidebar-children-${module.id}`);
      expect(childList).toBeTruthy();
      expect(childList?.textContent).toContain(module.tabs[0].label);
    }
  });

  it('can input and send a chat message through the browser fallback API', async () => {
    await renderApp();

    const chat = navModules.find((module) => module.id === 'chat')!;
    openFeature(chat, chat.tabs.find((tab) => tab.id === 'playground')!);
    const input = screen.getByPlaceholderText('输入消息，本地保存后再路由到模型...');
    fireEvent.change(input, { target: { value: '测试本地 fallback 发送' } });
    fireEvent.click(screen.getByRole('button', { name: /发送/ }));

    await waitFor(() => {
      expect(screen.getByText('测试本地 fallback 发送')).toBeInTheDocument();
    });
    expect(screen.getByText(/Mock response from nexachat-mock/)).toBeInTheDocument();
  });

  it('shows model gateway and settings key areas on new canonical routes', async () => {
    await renderApp();

    const models = navModules.find((module) => module.id === 'models')!;
    const gateway = navModules.find((module) => module.id === 'gateway')!;
    const settings = navModules.find((module) => module.id === 'settings')!;

    openFeature(models, models.tabs.find((tab) => tab.id === 'providers')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'providers');
    expect(activePanel()).toHaveTextContent('Provider 管理');
    openFeature(models, models.tabs.find((tab) => tab.id === 'catalog')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'catalog');
    expect(activePanel()).toHaveTextContent('模型创建');

    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'keys')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'keys');
    expect(activePanel()).toHaveTextContent('Gateway API Key');

    openFeature(settings, settings.tabs.find((tab) => tab.id === 'preferences')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'preferences');
    expect(activePanel()).toHaveTextContent('界面偏好');
    openFeature(settings, settings.tabs.find((tab) => tab.id === 'security')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'security');
    expect(activePanel()).toHaveTextContent('安全存储与 IPC 边界');
  });
});

describe('IPC authority', () => {
  it('keeps IPC channels unique and validates payload arity', () => {
    expect(new Set(IPC_CHANNEL_LIST).size).toBe(IPC_CHANNEL_LIST.length);
    expect(isIpcChannel(IPC_CHANNELS.chatSendMessage)).toBe(true);
    expect(isIpcChannel('chat:unknown')).toBe(false);

    expect(() => assertIpcPayload(IPC_CHANNELS.appGetSnapshot, [])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.chatSendMessage, [])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeCreateFile, ['name.md', 'text/markdown', 1])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeCreateFile, ['name.md'])).toThrow(/Invalid IPC payload/);
  });
});

describe('navigation authority', () => {
  it('keeps route aliases owned, milestone-bound, and resolvable', () => {
    for (const alias of routeAliasRegistry) {
      expect(alias.owner).toBeTruthy();
      expect(alias.deleteAfterMilestone).toBe('round-15-quality-gates');
      expect(alias.reason.length).toBeGreaterThan(8);
      expect(resolveNavigation(alias.from).route).toBe(alias.target);
    }
  });

  it('keeps every module tab route unique and every module has a page renderer', () => {
    const routes = navModules.flatMap((module) => module.tabs.map((tab) => tab.route));
    expect(new Set(routes).size).toBe(routes.length);
    expect(Object.keys(modulePageRegistry).sort()).toEqual(navModules.map((module) => module.id).sort());
  });
});
