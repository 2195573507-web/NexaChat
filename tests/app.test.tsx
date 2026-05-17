import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/renderer/App';
import { createMockApi } from '../src/renderer/mockApi';
import { modulePageRegistry } from '../src/renderer/modules/modulePageRegistry';
import { IPC_CHANNELS, IPC_CHANNEL_LIST, assertIpcPayload, isIpcChannel } from '../src/shared/ipc';
import { translate } from '../src/shared/i18n';
import { navModules, resolveNavigation, routeAliasRegistry } from '../src/shared/navigation';
import { DEFAULT_MODEL_FORM, DEFAULT_PROVIDER_FORM, PROVIDER_CATALOG } from '../src/shared/providerCatalog';
import { GATEWAY_AVAILABLE_ENDPOINTS, GATEWAY_RESERVED_ENDPOINTS } from '../src/shared/gatewayRuntime';
import { DATA_CONFIRMATION_PHRASES } from '../src/shared/dataRuntime';
import type { AppApi } from '../src/shared/api';
import type { ChatResponse, NavModule, NavTab } from '../src/shared/types';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
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

  it('shows generation state immediately and supports cancellation during a slow response', async () => {
    const baseApi = createMockApi();
    const pending = deferred<ChatResponse>();
    let capturedRequestId = '';
    let cancelledResponse: ChatResponse | null = null;
    const slowApi: AppApi = {
      ...baseApi,
      async sendMessage(input) {
        capturedRequestId = input.clientRequestId ?? '';
        return pending.promise;
      },
      async cancelMessage(input) {
        expect(input.requestLogId).toBe(capturedRequestId);
        const response = await baseApi.sendMessage({
          content: 'cancel source',
          clientRequestId: input.requestLogId,
        });
        cancelledResponse = {
          ...response,
          requestLog: { ...response.requestLog, id: input.requestLogId, status: 'cancelled' },
          assistantMessage: { ...response.assistantMessage, requestLogId: input.requestLogId, status: 'cancelled' },
        };
        return cancelledResponse;
      },
    };
    window.nexachat = slowApi;
    await renderApp();

    fireEvent.change(screen.getByPlaceholderText(translate('zh-CN', 'chat.composer.placeholder')), { target: { value: 'slow response' } });
    fireEvent.click(screen.getByRole('button', { name: translate('zh-CN', 'chat.send') }));

    await waitFor(() => {
      expect(document.querySelector('.generation-progress')).toBeInTheDocument();
    });
    expect(document.querySelector('.generation-progress')).toHaveAttribute('data-generation-phase', expect.stringMatching(/queued|sending|generating/));
    expect(screen.getByText(translate('zh-CN', 'chat.generation.progressiveReveal'))).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: translate('zh-CN', 'chat.message.cancel') }).at(-1)!);
    await waitFor(() => {
      expect(document.querySelector('.generation-progress')).toHaveAttribute('data-generation-phase', 'canceled');
    });

    if (!cancelledResponse) {
      throw new Error('Expected cancellation response before resolving slow send.');
    }
    const lateResponse = cancelledResponse as ChatResponse;
    pending.resolve({
      ...lateResponse,
      assistantMessage: { ...lateResponse.assistantMessage, content: 'late response' },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText(/late response/)).not.toBeInTheDocument();
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
    await waitFor(() => {
      expect(screen.getByText((content) => /line one\s*line two/.test(content))).toBeInTheDocument();
    });
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
    fireEvent.change(within(activePanel()).getByLabelText(`${translate('zh-CN', 'gateway.quotaLimit')} Browser dev key`), { target: { value: '42' } });
    fireEvent.change(within(activePanel()).getByLabelText(`${translate('zh-CN', 'gateway.rateLimit')} Browser dev key`), { target: { value: '7' } });
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'common.saved') }));
    await waitFor(() => {
      expect(activePanel()).toHaveTextContent('quota 42 / rate 7/min');
    });
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'gateway.disableKey') }));
    await waitFor(() => {
      expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.keyState.disabled'));
    });
    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'docs')!);
    expect(activePanel()).toHaveTextContent(GATEWAY_AVAILABLE_ENDPOINTS[0]);
    expect(activePanel()).toHaveTextContent(GATEWAY_RESERVED_ENDPOINTS[0]);
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.chatNotRequired'));
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.alias.boundary'));

    openFeature(settings, settings.tabs.find((tab) => tab.id === 'preferences')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'preferences');
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'settings.preferences.title'));
    expect(within(activePanel()).getByText(translate('zh-CN', 'settings.preferences.advancedMode'))).toBeInTheDocument();
    openFeature(settings, settings.tabs.find((tab) => tab.id === 'security')!);
    expect(activePanel()).toHaveAttribute('data-tab', 'security');
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'settings.security.title'));
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'settings.security.auditIntegrity'));
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'settings.security.permissionsMatrix'));
  });

  it('loads model choices automatically and supports provider deletion from the model page', async () => {
    await renderApp();

    const models = navModules.find((module) => module.id === 'models')!;
    openFeature(models, models.tabs.find((tab) => tab.id === 'catalog')!);

    await waitFor(() => {
      expect(activePanel()).toHaveTextContent(translate('zh-CN', 'models.fetch.ready', { count: 3 }));
    });
    expect(within(activePanel()).getByLabelText(translate('zh-CN', 'models.availableModels'))).toBeInTheDocument();

    openFeature(models, models.tabs.find((tab) => tab.id === 'providers')!);
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'models.deleteProvider') }));
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'models.delete.warningTitle'));
    expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'models.delete.cancel') })).toBeInTheDocument();
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'models.delete.cancel') }));
    expect(activePanel()).not.toHaveTextContent(translate('zh-CN', 'models.delete.warningTitle'));

    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'models.deleteProvider') }));
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'models.delete.confirm') }));

    await waitFor(() => {
      expect(activePanel()).toHaveTextContent(translate('zh-CN', 'common.notConfigured'));
    });
    expect(activePanel()).not.toHaveTextContent('Local Mock Provider');

    openFeature(models, models.tabs.find((tab) => tab.id === 'catalog')!);
    expect(activePanel()).not.toHaveTextContent('Local Mock Provider');
  });

  it('renders gateway token usage trend from real usage records and keeps empty state honest', async () => {
    const baseApi = createMockApi();
    window.nexachat = {
      ...baseApi,
      async getSnapshot() {
        const snapshot = await baseApi.getSnapshot();
        return {
          ...snapshot,
          usageRecords: [],
          dashboard: {
            ...snapshot.dashboard,
            usageToday: {
              requests: 0,
              inputTokens: 0,
              outputTokens: 0,
              costEstimate: 0,
            },
          },
        };
      },
    };
    await renderApp();

    const gateway = navModules.find((module) => module.id === 'gateway')!;
    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'usage')!);
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.usage.empty'));
    expect(document.querySelector('.usage-trend-chart')).not.toBeInTheDocument();

    await baseApi.sendMessage({ content: 'usage trend source' });
    cleanup();
    window.nexachat = baseApi;
    await renderApp();

    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'usage')!);
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.usage.trendTitle'));
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.usage.inputTokens'));
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.usage.outputTokens'));
    expect(document.querySelector('.usage-trend-chart')).toBeInTheDocument();
  });

  it('does not draw a gateway token trend when usage records lack token counts', async () => {
    const baseApi = createMockApi();
    window.nexachat = {
      ...baseApi,
      async getSnapshot() {
        const snapshot = await baseApi.getSnapshot();
        return {
          ...snapshot,
          usageRecords: [
            {
              id: 'usage_without_tokens',
              requestLogId: 'req_without_tokens',
              workspaceId: snapshot.dashboard.workspace.id,
              providerId: snapshot.providers[0]?.id ?? 'provider_missing',
              modelId: snapshot.models[0]?.id ?? null,
              inputTokens: 0,
              outputTokens: 0,
              costEstimate: 0,
              createdAt: Date.now(),
            },
          ],
        };
      },
    };
    await renderApp();

    const gateway = navModules.find((module) => module.id === 'gateway')!;
    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'usage')!);
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.usage.noTokenData'));
    expect(document.querySelector('.usage-trend-chart')).not.toBeInTheDocument();
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

  it('applies reduced motion shell state and disables smooth chat autoscroll', async () => {
    const baseApi = createMockApi();
    window.nexachat = {
      ...baseApi,
      async getSnapshot() {
        const snapshot = await baseApi.getSnapshot();
        return {
          ...snapshot,
          uiPreferences: {
            ...snapshot.uiPreferences,
            reducedMotion: true,
          },
        };
      },
    };
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    await renderApp();

    expect(document.querySelector('.app-frame')).toHaveClass('motion-reduced');
    expect(document.querySelector('.app-frame')).toHaveAttribute('data-motion-mode', 'reduced');

    fireEvent.change(screen.getByPlaceholderText(translate('zh-CN', 'chat.composer.placeholder')), { target: { value: 'reduced motion send' } });
    fireEvent.click(screen.getByRole('button', { name: translate('zh-CN', 'chat.send') }));

    await waitFor(() => {
      expect(screen.getByText('reduced motion send')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalled();
    });
    expect(scrollTo.mock.calls.some(([options]) => options?.behavior === 'smooth')).toBe(false);
    expect(scrollTo.mock.calls.some(([options]) => options?.behavior === 'auto')).toBe(true);
  });

  it('surfaces cross-module feedback boundaries without pretending reserved features are done', async () => {
    await renderApp();

    const knowledge = navModules.find((module) => module.id === 'knowledge')!;
    const tools = navModules.find((module) => module.id === 'tools')!;
    const gateway = navModules.find((module) => module.id === 'gateway')!;
    const data = navModules.find((module) => module.id === 'data')!;
    const settings = navModules.find((module) => module.id === 'settings')!;

    openFeature(knowledge, knowledge.tabs.find((tab) => tab.id === 'files')!);
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'knowledge.import.unsupportedNote'));
    expect(within(activePanel()).getByLabelText(translate('zh-CN', 'knowledge.import.file'))).toBeInTheDocument();

    openFeature(tools, tools.tabs.find((tab) => tab.id === 'mcp')!);
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'tools.mcp.authorizationUnchecked'));
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'tools.execution.reservedKinds'));

    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'overview')!);
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.listenerState'));
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'gateway.chatNotRequired'));

    openFeature(data, data.tabs.find((tab) => tab.id === 'import')!);
    const applyButton = within(activePanel()).getByRole('button', { name: translate('zh-CN', 'data.import.apply') });
    expect(applyButton).toBeDisabled();
    fireEvent.change(within(activePanel()).getByLabelText(translate('zh-CN', 'data.import.confirmTitle')), { target: { value: DATA_CONFIRMATION_PHRASES.applyImport } });
    expect(applyButton).toBeDisabled();

    openFeature(settings, settings.tabs.find((tab) => tab.id === 'feedback')!);
    expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'observability.feedback.create') })).toBeDisabled();
    fireEvent.change(within(activePanel()).getByLabelText(translate('zh-CN', 'observability.feedback.notes')), { target: { value: 'Generation state should be clearer.' } });
    expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'observability.feedback.create') })).not.toBeDisabled();
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
