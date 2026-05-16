import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../src/renderer/App';
import { createMockApi } from '../src/renderer/mockApi';
import { modulePageRegistry } from '../src/renderer/modules/modulePageRegistry';
import { IPC_CHANNELS, IPC_CHANNEL_LIST, assertIpcPayload, isIpcChannel } from '../src/shared/ipc';
import { translate } from '../src/shared/i18n';
import { navModules, resolveNavigation, routeAliasRegistry } from '../src/shared/navigation';
import { DEFAULT_MODEL_FORM, DEFAULT_PROVIDER_FORM, PROVIDER_CATALOG } from '../src/shared/providerCatalog';
import { GATEWAY_AVAILABLE_ENDPOINTS, GATEWAY_RESERVED_ENDPOINTS } from '../src/shared/gatewayRuntime';
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

function openModule(module: NavModule) {
  const rail = document.querySelector('.module-rail') as HTMLElement;
  fireEvent.click(within(rail).getByRole('button', { name: new RegExp(module.shortLabel) }));
}

function openFeature(module: NavModule, tab: NavTab) {
  openModule(module);
  const tabs = document.querySelector('.top-tabs');
  if (!tabs) {
    throw new Error(`Missing top tabs for ${module.id}`);
  }
  fireEvent.click(within(tabs as HTMLElement).getByRole('button', { name: new RegExp(tab.label) }));
}

describe('NexaChat renderer', () => {
  it('renders the chat-first shell without old dashboard structures', async () => {
    await renderApp();

    expect(document.querySelectorAll('.app-frame')).toHaveLength(1);
    expect(document.querySelectorAll('.module-rail')).toHaveLength(1);
    expect(document.querySelectorAll('.module-switcher')).toHaveLength(0);
    expect(document.querySelectorAll('.work-surface')).toHaveLength(1);
    expect(document.querySelectorAll('.rail-item')).toHaveLength(navModules.length);
    expect(document.querySelectorAll('.app-shell')).toHaveLength(0);
    expect(document.querySelectorAll('.module-nav-item')).toHaveLength(0);
    expect(document.querySelectorAll('.module-tabs')).toHaveLength(0);
    expect(document.querySelectorAll('.module-subnav-panel')).toHaveLength(0);
    expect(activePanel()).toHaveAttribute('data-module', 'chat');
    expect(activePanel()).toHaveAttribute('data-tab', 'conversations');
    expect(document.querySelector('.chat-quick-actions')).toBeInTheDocument();
    expect(document.querySelector('.chat-detail-panel')).not.toBeInTheDocument();
    expect(document.querySelector('.app-frame')).toHaveAttribute('data-user-mode', 'ordinary');

    for (const module of navModules) {
      const rail = document.querySelector('.module-rail') as HTMLElement;
      expect(within(rail).getByRole('button', { name: new RegExp(module.shortLabel) })).toBeInTheDocument();
    }
  });

  it('can input and send a chat message through the browser fallback API', async () => {
    await renderApp();

    const message = 'local fallback send test';
    const input = screen.getByPlaceholderText(translate('zh-CN', 'chat.composer.placeholder'));
    fireEvent.change(input, { target: { value: message } });
    fireEvent.click(screen.getByRole('button', { name: translate('zh-CN', 'chat.send') }));

    await waitFor(() => {
      expect(screen.getByText(message)).toBeInTheDocument();
    });
    expect(screen.getByText(/Mock response from nexachat-mock/)).toBeInTheDocument();
    expect(screen.getAllByText(translate('zh-CN', 'chat.message.copy')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(translate('zh-CN', 'chat.message.retry')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(translate('zh-CN', 'chat.message.regenerate')).length).toBeGreaterThan(0);
  });

  it('keeps chat composer multiline and sends only plain Enter', async () => {
    await renderApp();

    const composer = screen.getByPlaceholderText(translate('zh-CN', 'chat.composer.placeholder')) as HTMLTextAreaElement;
    expect(composer.tagName).toBe('TEXTAREA');

    const initialMessageCount = document.querySelectorAll('.message-bubble').length;
    fireEvent.change(composer, { target: { value: 'line one' } });
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: true });
    expect(document.querySelectorAll('.message-bubble')).toHaveLength(initialMessageCount);

    fireEvent.change(composer, { target: { value: 'line one\nline two' } });
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(document.querySelectorAll('.message-bubble').length).toBeGreaterThan(initialMessageCount);
    });
    expect(Array.from(document.querySelectorAll('.message-bubble.role-user p')).some((element) => element.textContent === 'line one\nline two')).toBe(true);
  });

  it('shows model gateway and settings key areas on canonical routes', async () => {
    await renderApp();

    const models = navModules.find((module) => module.id === 'models')!;
    const gateway = navModules.find((module) => module.id === 'gateway')!;
    const settings = navModules.find((module) => module.id === 'settings')!;

    openFeature(models, models.tabs.find((tab) => tab.id === 'providers')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'providers');
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'models.provider.title'));
    openFeature(models, models.tabs.find((tab) => tab.id === 'catalog')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'catalog');
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'models.create.title'));

    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'keys')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'keys');
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.keys.title'));
    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'docs')!);
    expect(activePanel()).toHaveTextContent(GATEWAY_AVAILABLE_ENDPOINTS[0]);
    expect(activePanel()).toHaveTextContent(GATEWAY_RESERVED_ENDPOINTS[0]);

    openFeature(settings, settings.tabs.find((tab) => tab.id === 'preferences')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'preferences');
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'settings.preferences.title'));
    expect(within(activePanel()).getByText(translate('zh-CN', 'settings.preferences.advancedMode'))).toBeInTheDocument();
    openFeature(settings, settings.tabs.find((tab) => tab.id === 'security')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'security');
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'settings.security.title'));
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'settings.security.auditIntegrity'));
  });

  it('keeps each module route backed by the registry', async () => {
    await renderApp();

    for (const module of navModules) {
      for (const tab of module.tabs) {
        openFeature(module, tab);
        const panel = activePanel();
        expect(panel).toHaveAttribute('aria-label', tab.label);
        expect(panel).toHaveAttribute('data-module', module.id);
        expect(panel).toHaveAttribute('data-tab', tab.id);
      }
    }
  });

  it('persists advanced mode and reveals chat technical detail only when enabled', async () => {
    await renderApp();

    expect(document.querySelector('.app-frame')).toHaveAttribute('data-user-mode', 'ordinary');
    expect(screen.queryByRole('button', { name: translate('zh-CN', 'chat.context.title') })).not.toBeInTheDocument();

    const settings = navModules.find((module) => module.id === 'settings')!;
    openFeature(settings, settings.tabs.find((tab) => tab.id === 'preferences')!);
    fireEvent.click(within(activePanel()).getByLabelText(translate('zh-CN', 'settings.preferences.advancedMode')));
    fireEvent.click(screen.getByRole('button', { name: translate('zh-CN', 'settings.preferences.save') }));

    await waitFor(() => {
      expect(document.querySelector('.app-frame')).toHaveAttribute('data-user-mode', 'advanced');
    });

    const chat = navModules.find((module) => module.id === 'chat')!;
    openFeature(chat, chat.tabs.find((tab) => tab.id === 'conversations')!);
    fireEvent.click(screen.getByRole('button', { name: translate('zh-CN', 'chat.context.title') }));
    expect(document.querySelector('.chat-detail-panel')).toBeInTheDocument();
  });
});

describe('IPC authority', () => {
  it('keeps IPC channels unique and validates payload arity', () => {
    expect(new Set(IPC_CHANNEL_LIST).size).toBe(IPC_CHANNEL_LIST.length);
    expect(isIpcChannel(IPC_CHANNELS.chatSendMessage)).toBe(true);
    expect(isIpcChannel('chat:unknown')).toBe(false);

    expect(() => assertIpcPayload(IPC_CHANNELS.appGetSnapshot, [])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.chatSendMessage, [])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeCreateFile, [{ name: 'name.md', type: 'text/markdown', content: 'hello' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeCreateFile, ['name.md', 'text/markdown', 1])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeDeleteFile, [{ fileId: 'file_1' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.executionStartRun, [{ kind: 'tool', toolId: 'nexachat.status.read' }])).not.toThrow();
  });
});

describe('navigation authority', () => {
  it('normalizes root and unknown paths to the chat-first default', () => {
    expect(routeAliasRegistry).toEqual([
      expect.objectContaining({
        from: '/',
        target: '/chat/conversations',
        owner: 'root',
        deleteAfterMilestone: 'round-15-quality-gates',
      }),
    ]);
    expect(resolveNavigation('/').route).toBe('/chat/conversations');
    expect(resolveNavigation('/dashboard/overview').route).toBe('/chat/conversations');
    expect(resolveNavigation('/settings/request-logs').route).toBe('/settings/preferences');
  });

  it('keeps every module tab route unique and every module has a page renderer', () => {
    const routes = navModules.flatMap((module) => module.tabs.map((tab) => tab.route));
    expect(new Set(routes).size).toBe(routes.length);
    expect(Object.keys(modulePageRegistry).sort()).toEqual(navModules.map((module) => module.id).sort());
  });

  it('keeps navigation state and provider defaults centralized without fake configured values', () => {
    expect(navModules.map((module) => module.id)).toEqual(['chat', 'models', 'knowledge', 'tools', 'gateway', 'data', 'settings']);
    for (const module of navModules) {
      expect(module.uiState).toBeTruthy();
      for (const tab of module.tabs) {
        expect(tab.uiState).toBeTruthy();
        expect(tab.route).toBe(`/${module.id}/${tab.id}`);
      }
    }

    expect(PROVIDER_CATALOG.map((entry) => entry.type)).toEqual([
      'openai-compatible',
      'openai',
      'anthropic',
      'gemini',
      'deepseek',
      'qwen',
      'ollama',
      'lm-studio',
      'custom',
    ]);
    expect(DEFAULT_PROVIDER_FORM).toEqual({
      type: 'openai-compatible',
      name: '',
      baseUrl: '',
      apiKey: '',
    });
    expect(DEFAULT_MODEL_FORM).toEqual({ name: '' });
    expect(GATEWAY_AVAILABLE_ENDPOINTS).toEqual(['/v1/models', '/v1/chat/completions', '/v1/embeddings']);
    expect(GATEWAY_RESERVED_ENDPOINTS).toEqual(['/v1/responses']);
  });
});
