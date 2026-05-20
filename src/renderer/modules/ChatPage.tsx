import { BookOpenText, DatabaseBackup, GitCompareArrows, KeyRound, MessageSquarePlus, Pin, Search, Send, ServerCog, Settings, SlidersHorizontal, Star, XCircle } from 'lucide-react';
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { I18nKey } from '../../shared/i18n';
import { IPC_EVENT_CHANNELS } from '../../shared/ipc';
import type { ChatResponse, ContextStrategy, Conversation, Message, Model } from '../../shared/types';
import { ChatInput, CommandButton, EmptyBlock, InlineNotice, MessageBubble, StatusPillLite } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { markPerformance, measurePerformance } from '../performanceMarks';
import {
  contextStrategies,
  formatDate,
  getDefaultModel,
  healthState,
  modelCapabilityLabels,
  statusLabel,
  TabPanel,
  type TabPageProps,
} from './shared';
import { buildProgressiveRevealFrames } from './progressiveReveal';
import { ChatMessageBubble } from './chat/ChatMessageBubble';

function getConversationMessages(messages: Message[], conversationId: string | undefined) {
  if (!conversationId) {
    return [];
  }
  return messages.filter((message) => message.conversationId === conversationId);
}

function getGroupedConversations(conversations: Conversation[], query: string) {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? conversations.filter((conversation) =>
        `${conversation.title} ${conversation.groupName ?? ''} ${conversation.summary ?? ''}`.toLowerCase().includes(normalized),
      )
    : conversations;
  return [
    { key: 'pinned', conversations: filtered.filter((conversation) => conversation.isPinned) },
    { key: 'recent', conversations: filtered.filter((conversation) => !conversation.isPinned) },
  ];
}

const CHAT_MESSAGE_PAGE_SIZE = 60;
const CHAT_CONVERSATION_PAGE_SIZE = 30;
const VIRTUAL_MESSAGE_WINDOW = 90;

type GenerationPhase = 'queued' | 'retrieving' | 'sending' | 'generating' | 'completed' | 'failed' | 'canceled';

const generationLabelKeys: Record<GenerationPhase, I18nKey> = {
  queued: 'chat.generation.queued',
  retrieving: 'chat.generation.retrieving',
  sending: 'chat.generation.sending',
  generating: 'chat.generation.generating',
  completed: 'chat.generation.completed',
  failed: 'chat.generation.failed',
  canceled: 'chat.generation.canceled',
};

type LocalGenerationState = {
  requestLogId: string;
  conversationId: string;
  content: string;
  optimisticUserContent: string;
  modelId?: string;
  modelName: string;
  phase: GenerationPhase;
  visibleContent: string;
  response?: ChatResponse;
  error?: string;
  source: 'ipc-stream' | 'send-message-fallback';
};

type CompareModelStatus = 'queued' | 'sending' | 'streaming' | 'completed' | 'failed' | 'canceled';

type CompareModelState = {
  modelId: string;
  label: string;
  status: CompareModelStatus;
  error?: string;
};

function createClientRequestId() {
  return `req_ui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function splitProgressiveSegments(value: string) {
  const paragraphs = value.split(/\n{2,}/).map((segment) => segment.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    return paragraphs.map((segment, index) => (index === 0 ? segment : `\n\n${segment}`));
  }
  const sentences = value.match(/[^.!?。！？]+[.!?。！？]?\s*/g)?.map((segment) => segment.trim()).filter(Boolean) ?? [value];
  return sentences.length > 0 ? sentences : [value];
}

export function ChatPage({ activeTab, snapshot, api, onAction, onOpenModule }: TabPageProps) {
  const { t } = useI18n();
  const [activeConversationId, setActiveConversationId] = useState(snapshot.conversations[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contextStrategy, setContextStrategy] = useState<ContextStrategy>(snapshot.conversations[0]?.summary ? 'summary_recent_n' : 'recent_n');
  const [selectedModelId, setSelectedModelId] = useState(getDefaultModel(snapshot)?.id ?? '');
  const [compareModelIds, setCompareModelIds] = useState<string[]>([]);
  const [compareStates, setCompareStates] = useState<CompareModelState[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [generation, setGeneration] = useState<LocalGenerationState | null>(null);
  const [conversationPage, setConversationPage] = useState(() => ({
    items: snapshot.conversations,
    total: snapshot.conversations.length,
    offset: 0,
    hasMore: snapshot.conversations.length >= CHAT_CONVERSATION_PAGE_SIZE,
    loading: false,
    error: null as string | null,
  }));
  const [messagePage, setMessagePage] = useState(() => ({
    conversationId: snapshot.conversations[0]?.id ?? '',
    items: getConversationMessages(snapshot.messages, snapshot.conversations[0]?.id),
    total: snapshot.messages.length,
    offset: 0,
    hasMore: false,
    loading: false,
    error: null as string | null,
  }));
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const canceledRequestIds = useRef(new Set<string>());
  const conversationItemCountRef = useRef(snapshot.conversations.length);
  const messageItemCountRef = useRef({
    conversationId: snapshot.conversations[0]?.id ?? '',
    count: getConversationMessages(snapshot.messages, snapshot.conversations[0]?.id).length,
  });
  const conversationRequestSeqRef = useRef(0);
  const messageRequestSeqRef = useRef(0);

  const defaultModel = getDefaultModel(snapshot);
  const advancedMode = snapshot.uiPreferences.advancedMode;
  const reducedMotion = snapshot.uiPreferences.reducedMotion;
  const selectedModel = snapshot.models.find((model) => model.id === selectedModelId) ?? defaultModel;
  const activeConversation = conversationPage.items.find((conversation) => conversation.id === activeConversationId) ?? conversationPage.items[0] ?? snapshot.conversations[0];
  const deferredMessageItems = useDeferredValue(messagePage.items);
  const messages = activeConversation?.id === messagePage.conversationId ? deferredMessageItems : getConversationMessages(snapshot.messages, activeConversation?.id);
  const visibleMessages = messages.filter((message) => message.requestLogId !== generation?.requestLogId);
  const windowedMessages = visibleMessages.length > VIRTUAL_MESSAGE_WINDOW ? visibleMessages.slice(-VIRTUAL_MESSAGE_WINDOW) : visibleMessages;
  const hiddenMessageCount = Math.max(0, visibleMessages.length - windowedMessages.length);
  const generationInActiveConversation = generation && generation.conversationId === activeConversation?.id ? generation : null;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const groupedConversations = useMemo(() => getGroupedConversations(conversationPage.items, deferredSearchQuery), [conversationPage.items, deferredSearchQuery]);

  const loadConversationPage = useCallback(async ({ reset = false, query = searchQuery }: { reset?: boolean; query?: string } = {}) => {
    const requestSeq = conversationRequestSeqRef.current + 1;
    conversationRequestSeqRef.current = requestSeq;
    setConversationPage((current) => ({ ...current, loading: true, error: null }));
    try {
      const offset = reset ? 0 : conversationItemCountRef.current;
      const page = await api.listConversations({ limit: CHAT_CONVERSATION_PAGE_SIZE, offset, query: query.trim() || undefined });
      if (conversationRequestSeqRef.current !== requestSeq) {
        return;
      }
      setConversationPage((current) => ({
        items: reset ? page.items : [...current.items, ...page.items],
        total: page.total,
        offset: page.offset,
        hasMore: page.hasMore,
        loading: false,
        error: null,
      }));
      conversationItemCountRef.current = reset ? page.items.length : conversationItemCountRef.current + page.items.length;
    } catch (error) {
      if (conversationRequestSeqRef.current !== requestSeq) {
        return;
      }
      setConversationPage((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [api, searchQuery]);

  const loadMessagePage = useCallback(async (conversationId: string, { reset = false } = {}) => {
    if (!conversationId) {
      return;
    }
    const requestSeq = messageRequestSeqRef.current + 1;
    messageRequestSeqRef.current = requestSeq;
    setMessagePage((current) => ({ ...current, conversationId, loading: true, error: null }));
    try {
      const offset = reset || messageItemCountRef.current.conversationId !== conversationId ? 0 : messageItemCountRef.current.count;
      const page = await api.listMessages({ conversationId, limit: CHAT_MESSAGE_PAGE_SIZE, offset });
      if (messageRequestSeqRef.current !== requestSeq) {
        return;
      }
      setMessagePage((current) => {
        const currentItems = reset || current.conversationId !== conversationId ? [] : current.items;
        const items = reset ? page.items : [...page.items, ...currentItems];
        messageItemCountRef.current = { conversationId, count: items.length };
        return {
          conversationId,
          items,
          total: page.total,
          offset: page.offset,
          hasMore: page.hasMore,
          loading: false,
          error: null,
        };
      });
    } catch (error) {
      if (messageRequestSeqRef.current !== requestSeq) {
        return;
      }
      setMessagePage((current) => ({
        ...current,
        conversationId,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [api]);

  useEffect(() => {
    conversationItemCountRef.current = snapshot.conversations.length;
    setConversationPage((current) => ({
      items: snapshot.conversations,
      total: Math.max(snapshot.conversations.length, current.total),
      offset: 0,
      hasMore: snapshot.conversations.length >= CHAT_CONVERSATION_PAGE_SIZE,
      loading: false,
      error: null,
    }));
  }, [snapshot.conversations]);

  useEffect(() => {
    void loadConversationPage({ reset: true, query: searchQuery });
  }, [loadConversationPage, searchQuery]);

  useEffect(() => {
    if (!activeConversation?.id) {
      return;
    }
    void loadMessagePage(activeConversation.id, { reset: true });
  }, [activeConversation?.id, loadMessagePage]);

  useEffect(() => {
    markPerformance('chat page interactive');
    return api.subscribe(IPC_EVENT_CHANNELS.chatStream, (event) => {
      setGeneration((current) => {
        if (!current || event.requestId !== current.requestLogId || canceledRequestIds.current.has(event.requestId)) {
          return current;
        }
        if (event.type === 'chat.stream.retrieving') {
          return {
            ...current,
            phase: 'retrieving',
            conversationId: event.conversationId ?? current.conversationId,
          };
        }
        if (event.type === 'chat.stream.started') {
          return {
            ...current,
            phase: 'sending',
            conversationId: event.conversationId ?? current.conversationId,
          };
        }
        if (event.type === 'chat.stream.chunk' && typeof event.chunk === 'string') {
          if (current.visibleContent.length === 0) {
            markPerformance('assistant first chunk rendered');
            measurePerformance('send click to first chunk', 'send click', 'assistant first chunk rendered');
          }
          return {
            ...current,
            phase: 'generating',
            conversationId: event.conversationId ?? current.conversationId,
            visibleContent: `${current.visibleContent}${event.chunk}`,
            source: 'ipc-stream',
          };
        }
        if (event.type === 'chat.stream.progress') {
          return {
            ...current,
            phase: 'generating',
            conversationId: event.conversationId ?? current.conversationId,
          };
        }
        if (event.type === 'chat.stream.completed') {
          return {
            ...current,
            phase: 'completed',
            conversationId: event.conversationId ?? current.conversationId,
            visibleContent: event.visibleContent ?? current.visibleContent,
            response: event.response ?? current.response,
          };
        }
        if (event.type === 'chat.stream.canceled') {
          canceledRequestIds.current.add(event.requestId);
          return {
            ...current,
            phase: 'canceled',
            conversationId: event.conversationId ?? current.conversationId,
            error: event.message ?? event.error ?? t('chat.cancelled.message'),
          };
        }
        if (event.type === 'chat.stream.failed') {
          return {
            ...current,
            phase: 'failed',
            conversationId: event.conversationId ?? current.conversationId,
            error: event.error ?? event.message,
          };
        }
        return current;
      });
    });
  }, [api, t]);

  useEffect(() => {
    if (!activeConversationId && conversationPage.items[0]) {
      setActiveConversationId(conversationPage.items[0].id);
      return;
    }
    if (activeConversationId && !conversationPage.items.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(conversationPage.items[0]?.id ?? '');
    }
  }, [activeConversationId, conversationPage.items]);

  useEffect(() => {
    if (!selectedModelId && defaultModel) {
      setSelectedModelId(defaultModel.id);
    }
  }, [defaultModel, selectedModelId]);

  const createConversationAndSelect = async () => {
    const conversation = await api.createConversation(t('chat.seed.newConversation'));
    setActiveConversationId(conversation.id);
  };

  const createConversationFromQuickAction = () => onAction(t('chat.toast.created'), createConversationAndSelect);

  useEffect(() => {
    if (!generation || generation.phase !== 'completed') {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setGeneration((current) => current?.requestLogId === generation.requestLogId && current.phase === 'completed' ? null : current);
    }, reducedMotion ? 0 : 350);
    return () => window.clearTimeout(timer);
  }, [generation?.requestLogId, generation?.phase, reducedMotion]);

  const sendCurrentMessage = async () => {
    const content = draft.trim();
    if (!content || !selectedModel || generation?.phase === 'sending' || generation?.phase === 'generating' || generation?.phase === 'queued' || generation?.phase === 'retrieving') {
      return;
    }
    const requestLogId = createClientRequestId();
    canceledRequestIds.current.delete(requestLogId);
    const targetConversationId = activeConversation?.id ?? '';
    setGeneration({
      requestLogId,
      conversationId: targetConversationId,
      content,
      optimisticUserContent: content,
      modelId: selectedModel.id,
      modelName: selectedModel.displayName,
      phase: 'queued',
      visibleContent: '',
      source: 'send-message-fallback',
    });
    markPerformance('send click');
    window.requestAnimationFrame(() => markPerformance('optimistic user bubble rendered'));
    setDraft('');
    try {
      setGeneration((current) => current?.requestLogId === requestLogId ? { ...current, phase: 'sending' } : current);
      const response = await api.sendMessage({
        conversationId: activeConversation?.id,
        content,
        modelId: selectedModel.id,
        clientRequestId: requestLogId,
        contextStrategy,
      });
      if (!targetConversationId && response.conversation.id) {
        setActiveConversationId(response.conversation.id);
      }
      if (canceledRequestIds.current.has(requestLogId)) {
        return;
      }
      setGeneration((current) => current?.requestLogId === requestLogId ? { ...current, conversationId: response.conversation.id, phase: 'generating', response } : current);
      await revealResponse(requestLogId, response);
      void loadConversationPage({ reset: true });
      void loadMessagePage(response.conversation.id, { reset: true });
    } catch (error) {
      setGeneration((current) => current?.requestLogId === requestLogId
        ? { ...current, phase: 'failed', error: error instanceof Error ? error.message : String(error) }
        : current);
      throw error;
    }
  };

  const revealResponse = async (requestLogId: string, response: ChatResponse) => {
    let shouldFallbackReveal = false;
    setGeneration((current) => {
      shouldFallbackReveal = Boolean(current?.requestLogId === requestLogId && current.visibleContent.length === 0);
      return current;
    });
    if (!shouldFallbackReveal) {
      setGeneration((current) => current?.requestLogId === requestLogId ? {
        ...current,
        phase: response.requestLog.status === 'cancelled' ? 'canceled' : 'completed',
        response,
      } : current);
      window.setTimeout(() => {
        setGeneration((current) => current?.requestLogId === requestLogId && current.phase === 'completed' ? null : current);
      }, reducedMotion ? 0 : 350);
      return;
    }
    const frames = buildProgressiveRevealFrames(response.assistantMessage.content, { reducedMotion });
    for (const frame of frames) {
      if (canceledRequestIds.current.has(requestLogId)) {
        return;
      }
      setGeneration((current) => current?.requestLogId === requestLogId ? { ...current, phase: 'generating', visibleContent: frame.visibleContent, response } : current);
      await new Promise((resolve) => setTimeout(resolve, frame.delayMs));
    }
    setGeneration((current) => current?.requestLogId === requestLogId ? { ...current, phase: response.requestLog.status === 'cancelled' ? 'canceled' : 'completed', visibleContent: response.assistantMessage.content, response } : current);
    window.setTimeout(() => {
      setGeneration((current) => current?.requestLogId === requestLogId && current.phase === 'completed' ? null : current);
    }, reducedMotion ? 0 : 350);
  };

  const cancelGeneration = () => {
    if (!generation) {
      return;
    }
    canceledRequestIds.current.add(generation.requestLogId);
    setGeneration({ ...generation, phase: 'canceled', error: t('chat.cancelled.message') });
    onAction(t('chat.toast.cancelled'), () => api.cancelMessage({ requestLogId: generation.response?.requestLog.id ?? generation.requestLogId }), { refresh: 'none' });
  };

  const runCompareModels = async () => {
    const modelStates = compareModelIds.map((modelId) => ({
      modelId,
      label: snapshot.models.find((model) => model.id === modelId)?.displayName ?? modelId,
      status: 'queued' as CompareModelStatus,
    }));
    setCompareStates(modelStates);
    setCompareStates((current) => current.map((item) => ({ ...item, status: 'sending' })));
    const result = await api.compareModels({
      conversationId: activeConversation?.id,
      content: draft,
      modelIds: compareModelIds,
      contextStrategy,
    });
    const completedModelIds = new Set(result.responses.map((response) => response.assistantMessage.modelId).filter(Boolean));
    const failures = new Map((result.failures ?? []).map((failure) => [failure.modelId, failure.error]));
    setCompareStates((current) => current.map((item) => {
      const error = failures.get(item.modelId);
      if (error) {
        return { ...item, status: 'failed', error };
      }
      return completedModelIds.has(item.modelId) ? { ...item, status: 'completed' } : { ...item, status: 'canceled' };
    }));
  };

  const updateAutoScrollPreference = () => {
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }
    const distanceFromBottom = timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 96;
  };

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline || !shouldAutoScrollRef.current) {
      return;
    }
    if (typeof timeline.scrollTo === 'function') {
      timeline.scrollTo({ top: timeline.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    timeline.scrollTop = timeline.scrollHeight;
  }, [visibleMessages.length, generationInActiveConversation?.visibleContent, generationInActiveConversation?.phase, reducedMotion]);

  return (
    <TabPanel moduleId="chat" tab={activeTab} className="chat-first-page">
      <div className={`chat-first-layout ${detailOpen ? 'detail-open' : ''}`}>
        <aside className="chat-sidebar" aria-label={t('chat.localConversations')}>
          <div className="chat-sidebar-head">
            <button type="button" className="primary-button" onClick={() => onAction(t('chat.toast.created'), createConversationAndSelect)}>
              <MessageSquarePlus size={15} />
              {t('chat.newConversation')}
            </button>
            <label className="search-box">
              <Search size={14} aria-hidden="true" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('chat.search.placeholder')} />
            </label>
          </div>
          <div className="conversation-groups">
            {groupedConversations.map((group) =>
              group.conversations.length > 0 ? (
                <section key={group.key} className="conversation-group">
                  <h2>{group.key === 'pinned' ? t('common.pinned') : t('dashboard.recentConversations')}</h2>
                  <div className="conversation-scroll">
                    {group.conversations.map((conversation) => (
                      <button
                        type="button"
                        className={`conversation-tile ${conversation.id === activeConversation?.id ? 'is-active' : ''}`}
                        key={conversation.id}
                        onClick={() => setActiveConversationId(conversation.id)}
                      >
                        <strong>{conversation.title}</strong>
                        <small>{formatDate(conversation.lastMessageAt ?? conversation.updatedAt, t)} · {t('common.messageCount', { count: conversation.messageCount })}</small>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null,
            )}
            {conversationPage.error ? <InlineNotice tone="warning" title={t('app.action.failed')} detail={conversationPage.error} /> : null}
            {conversationPage.hasMore ? (
              <button type="button" className="ghost-button" disabled={conversationPage.loading} onClick={() => void loadConversationPage()}>
                {conversationPage.loading ? t('app.status.busy') : t('common.loadMore')}
              </button>
            ) : null}
            {conversationPage.items.length === 0 ? (
              <EmptyBlock title={t('chat.empty.title')} detail={t('chat.empty.reason')} />
            ) : null}
          </div>
        </aside>

        <section className="chat-main">
          <header className="chat-topbar">
            <div className="chat-title-block">
              <h1>{activeConversation?.title ?? t('chat.seed.newConversation')}</h1>
              <span>{generationInActiveConversation ? t(generationLabelKeys[generationInActiveConversation.phase]) : messages.length > 0 ? t('common.messageCount', { count: messages.length }) : t('chat.empty.title')}</span>
            </div>
            <div className="chat-runtime-controls">
              <ModelPicker models={snapshot.models} selectedModel={selectedModel} onChange={setSelectedModelId} />
              <select aria-label={t('chat.contextSelect.aria')} value={contextStrategy} onChange={(event) => setContextStrategy(event.target.value as typeof contextStrategy)}>
                {contextStrategies.map((strategy) => (
                  <option value={strategy.value} key={strategy.value}>{t(strategy.labelKey)}</option>
                ))}
              </select>
              {advancedMode ? (
                <button type="button" className="ghost-button" onClick={() => setDetailOpen((current) => !current)} aria-pressed={detailOpen}>
                  <SlidersHorizontal size={15} />
                  {t('chat.context.title')}
                </button>
              ) : null}
            </div>
          </header>

          <div className="chat-quick-actions" aria-label={t('chat.quickActions.aria')}>
            <QuickAction primary icon={<ServerCog size={16} />} title={t('chat.quickActions.chooseModel')} detail={t('chat.quickActions.chooseModel.detail')} onClick={() => onOpenModule({ moduleId: 'models', tabId: 'providers' })} />
            <QuickAction primary icon={<MessageSquarePlus size={16} />} title={t('chat.quickActions.newChat')} detail={t('chat.quickActions.newChat.detail')} onClick={createConversationFromQuickAction} />
            <QuickAction icon={<BookOpenText size={16} />} title={t('chat.quickActions.knowledge')} detail={t('chat.quickActions.knowledge.detail')} onClick={() => onOpenModule({ moduleId: 'knowledge', tabId: 'files' })} />
            <QuickAction icon={<KeyRound size={16} />} title={t('chat.quickActions.gateway')} detail={t('chat.quickActions.gateway.detail')} onClick={() => onOpenModule({ moduleId: 'gateway', tabId: 'overview' })} />
            <QuickAction icon={<DatabaseBackup size={16} />} title={t('chat.quickActions.importConfig')} detail={t('chat.quickActions.importConfig.detail')} onClick={() => onOpenModule({ moduleId: 'data', tabId: 'import' })} />
            <QuickAction icon={<Settings size={16} />} title={t('chat.quickActions.settings')} detail={t('chat.quickActions.settings.detail')} onClick={() => onOpenModule({ moduleId: 'settings', tabId: 'preferences' })} />
          </div>

          <div className="message-timeline" ref={timelineRef} onScroll={updateAutoScrollPreference}>
            {visibleMessages.length > 0 || generationInActiveConversation ? (
              <>
              {messagePage.hasMore ? (
                <button type="button" className="ghost-button" disabled={messagePage.loading} onClick={() => void loadMessagePage(activeConversation?.id ?? '')}>
                  {messagePage.loading ? t('app.status.busy') : t('common.loadOlder')}
                </button>
              ) : null}
              {messagePage.error ? <InlineNotice tone="warning" title={t('app.action.failed')} detail={messagePage.error} /> : null}
              {hiddenMessageCount > 0 ? (
                <InlineNotice tone="muted" title={t('chat.virtualized.hidden', { count: hiddenMessageCount })} detail={t('chat.virtualized.window', { count: windowedMessages.length })} />
              ) : null}
              {windowedMessages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  snapshot={snapshot}
                  api={api}
                  onAction={onAction}
                  contextStrategy={contextStrategy}
                  modelId={selectedModel?.id}
                />
              ))}
              {generationInActiveConversation && !generationInActiveConversation.response?.userMessage ? (
                <MessageBubble
                  role="user"
                  status="completed"
                  meta={<span>{t('chat.generation.sending')} / {formatDate(Date.now(), t)}</span>}
                >
                  <p>{generationInActiveConversation.optimisticUserContent}</p>
                </MessageBubble>
              ) : null}
              {generationInActiveConversation ? <GenerationBubble generation={generationInActiveConversation} onCancel={cancelGeneration} /> : null}
              </>
            ) : (
              <div className="chat-welcome">
                <strong>NexaChat</strong>
                <p>{t('chat.empty.reason')}</p>
                {!selectedModel ? (
                  <>
                    <StatusPillLite label={t('common.notConfigured')} state="warning" />
                    <CommandButton variant="primary" icon={<ServerCog size={15} />} onClick={() => onOpenModule({ moduleId: 'models', tabId: 'providers' })}>{t('chat.setup.start')}</CommandButton>
                  </>
                ) : null}
              </div>
            )}
          </div>

          <ChatInput
            value={draft}
            placeholder={t('chat.composer.placeholder')}
            contextControl={<span>{selectedModel ? `${selectedModel.displayName} / ${generationInActiveConversation ? t(generationLabelKeys[generationInActiveConversation.phase]) : t('app.status.idle')}` : t('common.notConfigured')}</span>}
            utilityActions={
              generationInActiveConversation && (generationInActiveConversation.phase === 'sending' || generationInActiveConversation.phase === 'generating' || generationInActiveConversation.phase === 'queued' || generationInActiveConversation.phase === 'retrieving') ? (
                <button type="button" className="ghost-button" onClick={cancelGeneration}><XCircle size={14} />{t('chat.message.cancel')}</button>
              ) : (
                <ConversationTools
                  conversation={activeConversation}
                  api={api}
                  onAction={onAction}
                />
              )
            }
            sendLabel={t('chat.send')}
            sendIcon={<Send size={15} />}
            disabled={!selectedModel || Boolean(generationInActiveConversation && ['queued', 'retrieving', 'sending', 'generating'].includes(generationInActiveConversation.phase))}
            disabledReason={!selectedModel ? t('common.notConfigured') : t('chat.generation.generating')}
            onChange={setDraft}
            onSend={() => onAction(t('chat.toast.sent'), sendCurrentMessage, { refresh: 'none' })}
          />
        </section>

        {advancedMode && detailOpen ? (
          <aside className="chat-detail-panel">
            <section>
              <h2>{t('chat.context.title')}</h2>
              <dl className="data-rows">
                <div><dt>{t('chat.context.currentModel')}</dt><dd>{selectedModel?.displayName ?? t('common.notConfigured')}</dd></div>
                <div><dt>{t('chat.context.knowledgeFiles')}</dt><dd>{snapshot.knowledgeFiles.filter((file) => !file.deletedAt).length}</dd></div>
                <div><dt>{t('chat.context.toolPermissions')}</dt><dd>{snapshot.mcpServers.filter((server) => server.permissionState === 'granted').length}</dd></div>
                <div><dt>{t('chat.context.historyState')}</dt><dd>{activeConversation ? statusLabel(activeConversation.status, t) : t('common.none')}</dd></div>
              </dl>
            </section>
            <section>
              <h2>{t('chat.compare.title')}</h2>
              <div className="compare-model-list">
                {snapshot.models.slice(0, 4).map((model) => (
                  <label key={model.id}>
                    <input
                      type="checkbox"
                      checked={compareModelIds.includes(model.id)}
                      onChange={(event) => {
                        setCompareModelIds((current) => event.target.checked ? [...current, model.id].slice(0, 3) : current.filter((id) => id !== model.id));
                      }}
                    />
                    <span>
                      <strong>{model.displayName}</strong>
                      <small>{modelCapabilityLabels(model, t)}</small>
                    </span>
                  </label>
                ))}
              </div>
              <CommandButton
                variant="default"
                icon={<GitCompareArrows size={15} />}
                disabled={!draft.trim() || compareModelIds.length < 2}
                onClick={() => onAction(t('chat.toast.compare'), runCompareModels)}
              >
                {t('chat.compare.run')}
              </CommandButton>
              {compareStates.length > 0 ? (
                <div className="compare-progress-list">
                  {compareStates.map((item) => (
                    <InlineNotice
                      key={item.modelId}
                      tone={item.status === 'failed' ? 'warning' : item.status === 'completed' ? 'success' : 'info'}
                      title={`${item.label} / ${item.status}`}
                      detail={item.error}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          </aside>
        ) : null}
      </div>
    </TabPanel>
  );
}

const QuickAction = memo(function QuickAction({ icon, title, detail, onClick, primary = false }: { icon: ReactNode; title: string; detail: string; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" className={`chat-quick-action ${primary ? 'is-primary' : ''}`} onClick={onClick}>
      <span className="quick-action-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
});

function GenerationBubble({ generation, onCancel }: { generation: LocalGenerationState; onCancel: () => void }) {
  const { t } = useI18n();
  const isBusy = generation.phase === 'queued' || generation.phase === 'retrieving' || generation.phase === 'sending' || generation.phase === 'generating';
  return (
    <MessageBubble
      role="assistant"
      status={generation.phase === 'canceled' ? 'cancelled' : generation.phase === 'failed' ? 'failed' : 'streaming'}
      meta={<span>{generation.modelName} / {t(generationLabelKeys[generation.phase])}</span>}
      actionsLabel={t('chat.message.actions.aria')}
      actions={isBusy ? (
        <button type="button" className="ghost-button" onClick={onCancel}><XCircle size={14} />{t('chat.message.cancel')}</button>
      ) : null}
    >
      <div className="generation-progress" data-generation-phase={generation.phase} role="status" aria-live="polite" aria-atomic="true">
        <StatusPillLite label={t(generationLabelKeys[generation.phase])} state={generation.phase === 'failed' ? 'danger' : generation.phase === 'canceled' ? 'warning' : 'info'} />
        <p>{generation.visibleContent || t('chat.generation.placeholder')}</p>
        {generation.error ? <small>{generation.error}</small> : null}
        {generation.source === 'send-message-fallback' ? (
          <InlineNotice tone="muted" title={t('chat.generation.progressiveReveal')} detail={t('chat.generation.progressiveReveal.detail')} />
        ) : null}
      </div>
    </MessageBubble>
  );
}

function ModelPicker({ models, selectedModel, onChange }: { models: Model[]; selectedModel: Model | null | undefined; onChange: (modelId: string) => void }) {
  const { t } = useI18n();
  return (
    <select aria-label={t('chat.modelSelect.aria')} value={selectedModel?.id ?? ''} onChange={(event) => onChange(event.target.value)}>
      {models.length > 0 ? (
        models.map((model) => (
          <option value={model.id} key={model.id}>{model.displayName}</option>
        ))
      ) : (
        <option value="">{t('common.notConfigured')}</option>
      )}
    </select>
  );
}

function ConversationTools({
  conversation,
  api,
  onAction,
}: {
  conversation: Conversation | undefined;
  api: TabPageProps['api'];
  onAction: TabPageProps['onAction'];
}) {
  const { t } = useI18n();
  if (!conversation) {
    return null;
  }
  return (
    <>
      <button type="button" className="ghost-button" onClick={() => onAction(t('chat.toast.pinned'), () => api.updateConversationFlags(conversation.id, { isPinned: !conversation.isPinned }))}>
        <Pin size={14} />
        {conversation.isPinned ? t('common.cancelPin') : t('common.pin')}
      </button>
      <button type="button" className="ghost-button" onClick={() => onAction(t('chat.toast.favorite'), () => api.updateConversationFlags(conversation.id, { isFavorite: !conversation.isFavorite }))}>
        <Star size={14} />
        {conversation.isFavorite ? t('common.cancelFavorite') : t('common.favorite')}
      </button>
    </>
  );
}
