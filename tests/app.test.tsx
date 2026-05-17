import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/renderer/App';
import { createMockApi } from '../src/renderer/mockApi';
import { modulePageRegistry } from '../src/renderer/modules/modulePageRegistry';
import { IPC_CHANNELS, IPC_CHANNEL_LIST, IPC_EVENT_CHANNELS, type ChatStreamEventPayload, type TaskEventPayload, assertIpcPayload, isIpcChannel } from '../src/shared/ipc';
import { translate } from '../src/shared/i18n';
import { navModules, resolveNavigation, routeAliasRegistry } from '../src/shared/navigation';
import { DEFAULT_MODEL_FORM, DEFAULT_PROVIDER_FORM, PROVIDER_CATALOG } from '../src/shared/providerCatalog';
import { GATEWAY_AVAILABLE_ENDPOINTS, GATEWAY_RESERVED_ENDPOINTS } from '../src/shared/gatewayRuntime';
import { DATA_CONFIRMATION_PHRASES } from '../src/shared/dataRuntime';
import type { AppApi } from '../src/shared/api';
import type { ChatResponse, Conversation, Message, NavModule, NavTab, PageResult } from '../src/shared/types';

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

function pageResult<T>(items: T[], limit: number, offset: number): PageResult<T> {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
    hasMore: offset + limit < items.length,
  };
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
    expect(document.querySelector('.module-page')).toHaveClass('module-page');

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

  it('renders an optimistic user bubble before the send response resolves', async () => {
    const baseApi = createMockApi();
    const pending = deferred<ChatResponse>();
    window.nexachat = {
      ...baseApi,
      async sendMessage() {
        return pending.promise;
      },
    };
    await renderApp();

    fireEvent.change(screen.getByPlaceholderText(translate('zh-CN', 'chat.composer.placeholder')), { target: { value: 'optimistic now' } });
    fireEvent.click(screen.getByRole('button', { name: translate('zh-CN', 'chat.send') }));

    expect(screen.getByText('optimistic now')).toBeInTheDocument();
    expect(document.querySelector('.generation-progress')).toHaveAttribute('data-generation-phase', expect.stringMatching(/queued|sending/));
  });

  it('updates the assistant bubble from typed stream chunks and ignores late chunks after cancel', async () => {
    const baseApi = createMockApi();
    let streamHandler: ((payload: ChatStreamEventPayload) => void) | null = null;
    let capturedRequestId = '';
    const pending = deferred<ChatResponse>();
    window.nexachat = {
      ...baseApi,
      subscribe(channel, handler) {
        if (channel === IPC_EVENT_CHANNELS.chatStream) {
          streamHandler = handler as (payload: ChatStreamEventPayload) => void;
        }
        return () => {
          streamHandler = null;
        };
      },
      async sendMessage(input) {
        capturedRequestId = input.clientRequestId ?? '';
        streamHandler?.({
          type: 'chat.stream.started',
          phase: 'started',
          requestId: capturedRequestId,
          clientRequestId: capturedRequestId,
          timestamp: Date.now(),
        });
        streamHandler?.({
          type: 'chat.stream.chunk',
          phase: 'streaming',
          requestId: capturedRequestId,
          clientRequestId: capturedRequestId,
          chunk: 'first chunk',
          timestamp: Date.now(),
        });
        return pending.promise;
      },
      async cancelMessage(input) {
        streamHandler?.({
          type: 'chat.stream.canceled',
          phase: 'canceled',
          requestId: input.requestLogId,
          clientRequestId: input.requestLogId,
          message: translate('zh-CN', 'chat.cancelled.message'),
          timestamp: Date.now(),
        });
        streamHandler?.({
          type: 'chat.stream.chunk',
          phase: 'streaming',
          requestId: input.requestLogId,
          clientRequestId: input.requestLogId,
          chunk: 'late chunk',
          timestamp: Date.now(),
        });
        const response = await baseApi.sendMessage({ content: 'cancel source', clientRequestId: input.requestLogId });
        return {
          ...response,
          requestLog: { ...response.requestLog, id: input.requestLogId, status: 'cancelled' },
          assistantMessage: { ...response.assistantMessage, requestLogId: input.requestLogId, status: 'cancelled' },
        };
      },
    };
    await renderApp();

    fireEvent.change(screen.getByPlaceholderText(translate('zh-CN', 'chat.composer.placeholder')), { target: { value: 'stream me' } });
    fireEvent.click(screen.getByRole('button', { name: translate('zh-CN', 'chat.send') }));

    await waitFor(() => {
      expect(screen.getByText(/first chunk/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole('button', { name: translate('zh-CN', 'chat.message.cancel') }).at(-1)!);

    await waitFor(() => {
      expect(document.querySelector('.generation-progress')).toHaveAttribute('data-generation-phase', 'canceled');
    });
    expect(capturedRequestId).toBeTruthy();
    expect(screen.queryByText(/late chunk/)).not.toBeInTheDocument();
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

  it('shows provider row-local pending without locking the whole model page', async () => {
    const baseApi = createMockApi();
    const pending = deferred<Awaited<ReturnType<AppApi['testProvider']>>>();
    window.nexachat = {
      ...baseApi,
      testProvider() {
        return pending.promise;
      },
    };
    await renderApp();

    const models = navModules.find((module) => module.id === 'models')!;
    openFeature(models, models.tabs.find((tab) => tab.id === 'providers')!);
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'models.testConnection') }));

    expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'app.status.busy') })).toBeDisabled();
    expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'models.fetchModels') })).not.toBeDisabled();

    const provider = (await baseApi.getSnapshot()).providers[0];
    pending.resolve(provider);
    await waitFor(() => {
      expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'models.testConnection') })).not.toBeDisabled();
    });
  });

  it('shows gateway toggle pending near the gateway control', async () => {
    const baseApi = createMockApi();
    const pending = deferred<Awaited<ReturnType<AppApi['toggleGateway']>>>();
    window.nexachat = {
      ...baseApi,
      toggleGateway() {
        return pending.promise;
      },
    };
    await renderApp();

    const gateway = navModules.find((module) => module.id === 'gateway')!;
    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'overview')!);
    const gatewayButtonLabel = activePanel().textContent?.includes(translate('zh-CN', 'shell.gateway.running'))
      ? translate('zh-CN', 'gateway.stop')
      : translate('zh-CN', 'gateway.start');
    fireEvent.click(within(activePanel()).getByRole('button', { name: gatewayButtonLabel }));

    expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'app.status.busy') })).toBeDisabled();
    expect(activePanel()).toHaveTextContent(gatewayButtonLabel);

    pending.resolve((await baseApi.getSnapshot()).dashboard.gatewayStatus);
    await waitFor(() => {
      expect(within(activePanel()).queryByRole('button', { name: translate('zh-CN', 'app.status.busy') })).not.toBeInTheDocument();
    });
  });

  it('shows knowledge import and data backup pending next to their controls', async () => {
    const baseApi = createMockApi();
    const knowledgePending = deferred<Awaited<ReturnType<AppApi['createKnowledgeFile']>>>();
    const backupPending = deferred<Awaited<ReturnType<AppApi['createEncryptedBackup']>>>();
    window.nexachat = {
      ...baseApi,
      createKnowledgeFile() {
        return knowledgePending.promise;
      },
      createEncryptedBackup() {
        return backupPending.promise;
      },
    };
    await renderApp();

    const knowledge = navModules.find((module) => module.id === 'knowledge')!;
    openFeature(knowledge, knowledge.tabs.find((tab) => tab.id === 'files')!);
    fireEvent.change(within(activePanel()).getByLabelText(translate('zh-CN', 'knowledge.import.name')), { target: { value: 'pending.md' } });
    fireEvent.change(within(activePanel()).getByLabelText(translate('zh-CN', 'knowledge.import.content')), { target: { value: 'pending content' } });
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'knowledge.import.create') }));
    await waitFor(() => {
      expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'app.status.busy') })).toBeDisabled();
    });
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'app.status.busy'));

    knowledgePending.resolve((await baseApi.createKnowledgeFile({ name: 'pending.md', type: 'text/markdown', content: 'pending content' })));
    await waitFor(() => {
      expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'knowledge.import.create') })).not.toBeDisabled();
    });

    const data = navModules.find((module) => module.id === 'data')!;
    openFeature(data, data.tabs.find((tab) => tab.id === 'backup')!);
    fireEvent.change(within(activePanel()).getByLabelText(translate('zh-CN', 'data.backup.passphrase')), { target: { value: 'mock-passphrase' } });
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'data.backup.create') }));
    await waitFor(() => {
      expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'app.status.busy') })).toBeDisabled();
    });
    expect(activePanel()).toHaveTextContent(translate('zh-CN', 'data.backup.create'));

    backupPending.resolve(await baseApi.createEncryptedBackup({ profile: 'encrypted-full', passphrase: 'mock-passphrase' }));
    await waitFor(() => {
      expect(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'data.backup.create') })).not.toBeDisabled();
    });
  });

  it('maps compare model partial failures without blocking successful models', async () => {
    const baseApi = createMockApi();
    const initialSnapshot = await baseApi.getSnapshot();
    await baseApi.createModel({
      providerId: initialSnapshot.providers[0].id,
      name: 'nexachat-second',
      displayName: 'NexaChat Second',
    });
    const snapshot = await baseApi.getSnapshot();
    const [firstModel, secondModel] = snapshot.models;
    window.nexachat = {
      ...baseApi,
      async compareModels(input) {
        const response = await baseApi.sendMessage({
          conversationId: input.conversationId,
          content: input.content,
          modelId: firstModel.id,
          contextStrategy: input.contextStrategy,
        });
        return {
          conversation: response.conversation,
          responses: [response],
          failures: [{ modelId: secondModel.id, error: 'upstream failed' }],
        };
      },
    };
    await renderApp();

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

    fireEvent.change(screen.getByPlaceholderText(translate('zh-CN', 'chat.composer.placeholder')), { target: { value: 'compare partial' } });
    const compareList = document.querySelector('.compare-model-list') as HTMLElement;
    const compareCheckboxes = within(compareList).getAllByRole('checkbox');
    for (const checkbox of compareCheckboxes.slice(0, 2)) {
      fireEvent.click(checkbox);
    }
    fireEvent.click(screen.getByRole('button', { name: translate('zh-CN', 'chat.compare.run') }));

    await waitFor(() => {
      expect(screen.getByText(`${firstModel.displayName} / completed`)).toBeInTheDocument();
      expect(screen.getByText(`${secondModel.displayName} / failed`)).toBeInTheDocument();
    });
    expect(screen.getByText('upstream failed')).toBeInTheDocument();
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

  it('loads chat history through paged message APIs, virtualizes long timelines, and exports the full conversation', async () => {
    const baseApi = createMockApi();
    const snapshot = await baseApi.getSnapshot();
    const conversation = snapshot.conversations[0];
    const longMessages: Message[] = Array.from({ length: 140 }, (_, index) => ({
      ...snapshot.messages[0],
      id: `long_message_${index}`,
      conversationId: conversation.id,
      parentMessageId: index > 0 ? `long_message_${index - 1}` : null,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `long message ${index}`,
      status: 'completed',
      createdAt: index + 1,
      updatedAt: index + 1,
    }));
    const pagedConversation: Conversation = {
      ...conversation,
      messageCount: longMessages.length,
      lastMessageAt: longMessages.at(-1)?.createdAt ?? conversation.lastMessageAt,
    };
    const listMessages = vi.fn(async (input: { conversationId: string; limit?: number; offset?: number }) => {
      const newestFirst = [...longMessages].reverse();
      const page = pageResult(newestFirst, input.limit ?? 60, input.offset ?? 0);
      return { ...page, items: [...page.items].reverse() };
    });
    const exportConversation = vi.fn(async () => ({
      id: 'export_full_history',
      conversationId: conversation.id,
      format: 'json',
      redacted: true,
      status: 'completed',
      content: JSON.stringify({ messages: longMessages }),
      summaryJson: JSON.stringify({ messageCount: longMessages.length }),
      createdAt: Date.now(),
    }));
    window.nexachat = {
      ...baseApi,
      async getSnapshot() {
        const current = await baseApi.getSnapshot();
        return {
          ...current,
          conversations: [pagedConversation],
          messages: [],
        };
      },
      async listConversations(input) {
        return pageResult([pagedConversation], input?.limit ?? 30, input?.offset ?? 0);
      },
      listMessages,
      exportConversation: exportConversation as AppApi['exportConversation'],
    };
    await renderApp();

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(expect.objectContaining({ conversationId: conversation.id, limit: 60, offset: 0 }));
    });
    await waitFor(() => {
      expect(screen.getByText('long message 139')).toBeInTheDocument();
    });
    expect(screen.queryByText('long message 0')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: translate('zh-CN', 'common.loadOlder') }));
    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith(expect.objectContaining({ conversationId: conversation.id, limit: 60, offset: 60 }));
    });
    await waitFor(() => {
      expect(activePanel()).toHaveTextContent(translate('zh-CN', 'chat.virtualized.hidden', { count: 30 }));
    });
    expect(screen.getByText('long message 50')).toBeInTheDocument();
    expect(screen.queryByText('long message 49')).not.toBeInTheDocument();

    await window.nexachat.exportConversation({ conversationId: conversation.id, format: 'json', redacted: true });
    expect(exportConversation).toHaveBeenCalledWith({ conversationId: conversation.id, format: 'json', redacted: true });
    const exported = await exportConversation.mock.results[exportConversation.mock.results.length - 1].value;
    expect(JSON.parse(exported.content).messages).toHaveLength(140);
  });

  it('loads gateway and audit logs through paged module APIs', async () => {
    const baseApi = createMockApi();
    const baseSnapshot = await baseApi.getSnapshot();
    const timestamp = Date.now();
    const gatewayLogs = Array.from({ length: 55 }, (_, index) => ({
      id: `gateway_log_${index}`,
      requestLogId: null,
      gatewayKeyId: null,
      keyPreview: null,
      scope: null,
      errorCode: null,
      latencyMs: 10,
      remoteAddress: '127.0.0.1',
      method: 'POST',
      path: `/v1/chat/completions/${index}`,
      statusCode: index % 2 === 0 ? 200 : 502,
      redactedHeadersJson: null,
      createdAt: timestamp - index,
    }));
    const auditLogs = Array.from({ length: 64 }, (_, index) => ({
      id: `audit_log_${index}`,
      action: `audit.action.${index}`,
      actor: 'browser-mock',
      targetType: 'test',
      targetId: null,
      detailsJson: null,
      permissionKey: null,
      previousHash: null,
      entryHash: `hash_${index}`,
      integrityState: 'verified' as const,
      createdAt: timestamp - index,
    }));
    const listGatewayLogs = vi.fn(async (input?: { limit?: number; offset?: number }) => pageResult(gatewayLogs, input?.limit ?? 24, input?.offset ?? 0));
    const listAuditLogs = vi.fn(async (input?: { limit?: number; offset?: number }) => pageResult(auditLogs, input?.limit ?? 30, input?.offset ?? 0));
    window.nexachat = {
      ...baseApi,
      async getSnapshot() {
        const current = await baseApi.getSnapshot();
        return {
          ...current,
          gatewayLogs: gatewayLogs.slice(0, 24),
          auditLogs: auditLogs.slice(0, 30),
          auditIntegrity: baseSnapshot.auditIntegrity,
        };
      },
      listGatewayLogs,
      listAuditLogs,
    };
    await renderApp();

    const gateway = navModules.find((module) => module.id === 'gateway')!;
    openFeature(gateway, gateway.tabs.find((tab) => tab.id === 'logs')!);
    await waitFor(() => {
      expect(listGatewayLogs).toHaveBeenCalledWith(expect.objectContaining({ limit: 24, offset: 0 }));
    });
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'common.loadMore') }));
    await waitFor(() => {
      expect(listGatewayLogs).toHaveBeenCalledWith(expect.objectContaining({ limit: 24, offset: 24 }));
    });

    const settings = navModules.find((module) => module.id === 'settings')!;
    openFeature(settings, settings.tabs.find((tab) => tab.id === 'audit')!);
    await waitFor(() => {
      expect(listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ limit: 30, offset: 0 }));
    });
    fireEvent.click(within(activePanel()).getByRole('button', { name: translate('zh-CN', 'common.loadMore') }));
    await waitFor(() => {
      expect(listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ limit: 30, offset: 30 }));
    });
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

  it('receives typed task progress around audit verification and cleans up subscriptions', async () => {
    const baseApi = createMockApi();
    const taskEvents: TaskEventPayload[] = [];
    let taskHandler: ((payload: TaskEventPayload) => void) | null = null;
    const emitTask = (payload: TaskEventPayload) => {
      taskHandler?.(payload);
    };
    let cleanupCalled = false;
    window.nexachat = {
      ...baseApi,
      subscribe(channel, handler) {
        if (channel === IPC_EVENT_CHANNELS.taskProgress) {
          taskHandler = handler as (payload: TaskEventPayload) => void;
        }
        return () => {
          cleanupCalled = true;
          taskHandler = null;
        };
      },
      async verifyAuditIntegrity() {
        emitTask({ type: 'task.started', phase: 'started', taskId: 'task_test', taskKind: 'audit.verify', timestamp: Date.now(), progress: 0 });
        const result = await baseApi.verifyAuditIntegrity();
        emitTask({ type: 'task.completed', phase: 'completed', taskId: 'task_test', taskKind: 'audit.verify', timestamp: Date.now(), progress: 1, message: result.status });
        return result;
      },
    };
    const unsubscribe = window.nexachat.subscribe(IPC_EVENT_CHANNELS.taskProgress, (payload) => {
      taskEvents.push(payload);
    });

    const report = await window.nexachat.verifyAuditIntegrity();
    unsubscribe();
    emitTask({ type: 'task.progress', phase: 'processing', taskId: 'task_test', taskKind: 'audit.verify', timestamp: Date.now(), progress: 0.5 });

    expect(report.status).toBe('verified');
    expect(taskEvents.map((event) => event.type)).toEqual(['task.started', 'task.completed']);
    expect(taskEvents.every((event) => event.taskId && event.phase && typeof event.timestamp === 'number')).toBe(true);
    expect(cleanupCalled).toBe(true);
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
