import { Copy, GitCompareArrows, MessageSquarePlus, Pin, RefreshCw, RotateCcw, Search, Send, SlidersHorizontal, Star, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ContextStrategy, Conversation, Message, Model } from '../../shared/types';
import { ChatInput, CommandButton, EmptyBlock, MessageBubble, StatusPillLite } from '../components/AppFrame';
import { useI18n } from '../i18n';
import {
  contextStrategies,
  copyText,
  formatDate,
  formatMessageMetadata,
  getDefaultModel,
  healthState,
  modelCapabilityLabels,
  statusLabel,
  TabPanel,
  type TabPageProps,
} from './shared';

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

export function ChatPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [activeConversationId, setActiveConversationId] = useState(snapshot.conversations[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contextStrategy, setContextStrategy] = useState<ContextStrategy>(snapshot.conversations[0]?.summary ? 'summary_recent_n' : 'recent_n');
  const [selectedModelId, setSelectedModelId] = useState(getDefaultModel(snapshot)?.id ?? '');
  const [compareModelIds, setCompareModelIds] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const defaultModel = getDefaultModel(snapshot);
  const selectedModel = snapshot.models.find((model) => model.id === selectedModelId) ?? defaultModel;
  const activeConversation = snapshot.conversations.find((conversation) => conversation.id === activeConversationId) ?? snapshot.conversations[0];
  const messages = getConversationMessages(snapshot.messages, activeConversation?.id);
  const groupedConversations = useMemo(() => getGroupedConversations(snapshot.conversations, searchQuery), [snapshot.conversations, searchQuery]);

  useEffect(() => {
    if (!activeConversationId && snapshot.conversations[0]) {
      setActiveConversationId(snapshot.conversations[0].id);
    }
  }, [activeConversationId, snapshot.conversations]);

  useEffect(() => {
    if (!selectedModelId && defaultModel) {
      setSelectedModelId(defaultModel.id);
    }
  }, [defaultModel, selectedModelId]);

  const createConversationAndSelect = async () => {
    const conversation = await api.createConversation(t('chat.seed.newConversation'));
    setActiveConversationId(conversation.id);
  };

  const sendCurrentMessage = async () => {
    const content = draft.trim();
    if (!content) {
      return;
    }
    await api.sendMessage({
      conversationId: activeConversation?.id,
      content,
      modelId: selectedModel?.id,
      contextStrategy,
    });
    setDraft('');
  };

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
            {snapshot.conversations.length === 0 ? (
              <EmptyBlock title={t('chat.empty.title')} detail={t('chat.empty.reason')} />
            ) : null}
          </div>
        </aside>

        <section className="chat-main">
          <header className="chat-topbar">
            <div className="chat-title-block">
              <h1>{activeConversation?.title ?? t('chat.seed.newConversation')}</h1>
              <span>{messages.length > 0 ? t('common.messageCount', { count: messages.length }) : t('chat.empty.title')}</span>
            </div>
            <div className="chat-runtime-controls">
              <ModelPicker models={snapshot.models} selectedModel={selectedModel} onChange={setSelectedModelId} />
              <select aria-label={t('chat.contextSelect.aria')} value={contextStrategy} onChange={(event) => setContextStrategy(event.target.value as typeof contextStrategy)}>
                {contextStrategies.map((strategy) => (
                  <option value={strategy.value} key={strategy.value}>{t(strategy.labelKey)}</option>
                ))}
              </select>
              <button type="button" className="ghost-button" onClick={() => setDetailOpen((current) => !current)} aria-pressed={detailOpen}>
                <SlidersHorizontal size={15} />
                {t('chat.context.title')}
              </button>
            </div>
          </header>

          <div className="message-timeline">
            {messages.length > 0 ? (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  status={message.status}
                  meta={<span>{message.modelNameSnapshot ?? statusLabel(message.status, t)} · {message.metadataJson ? formatMessageMetadata(message.metadataJson, t) : formatDate(message.createdAt, t)}</span>}
                  actionsLabel={t('chat.message.actions.aria')}
                  actions={
                    <MessageActions
                      message={message}
                      api={api}
                      onAction={onAction}
                      contextStrategy={contextStrategy}
                      modelId={selectedModel?.id}
                    />
                  }
                >
                  <p>{message.content}</p>
                  {message.errorMessage ? <small>{message.errorMessage}</small> : null}
                </MessageBubble>
              ))
            ) : (
              <div className="chat-welcome">
                <strong>NexaChat</strong>
                <p>{t('chat.empty.reason')}</p>
                {!selectedModel ? <StatusPillLite label={t('common.notConfigured')} state="warning" /> : null}
              </div>
            )}
          </div>

          <ChatInput
            value={draft}
            placeholder={t('chat.composer.placeholder')}
            contextControl={<span>{selectedModel?.displayName ?? t('common.notConfigured')}</span>}
            utilityActions={
              <ConversationTools
                conversation={activeConversation}
                api={api}
                onAction={onAction}
              />
            }
            sendLabel={t('chat.send')}
            sendIcon={<Send size={15} />}
            disabled={!selectedModel}
            disabledReason={t('common.notConfigured')}
            onChange={setDraft}
            onSend={() => onAction(t('chat.toast.sent'), sendCurrentMessage)}
          />
        </section>

        {detailOpen ? (
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
                onClick={() => onAction(t('chat.toast.compare'), () => api.compareModels({ conversationId: activeConversation?.id, content: draft, modelIds: compareModelIds, contextStrategy }))}
              >
                {t('chat.compare.run')}
              </CommandButton>
            </section>
          </aside>
        ) : null}
      </div>
    </TabPanel>
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

function MessageActions({
  message,
  api,
  onAction,
  contextStrategy,
  modelId,
}: {
  message: Message;
  api: TabPageProps['api'];
  onAction: TabPageProps['onAction'];
  contextStrategy: ContextStrategy;
  modelId?: string;
}) {
  const { t } = useI18n();
  const cancellable = Boolean(message.requestLogId && (message.status === 'streaming' || message.status === 'draft' || message.status === 'failed'));
  return (
    <>
      <button type="button" className="ghost-button" onClick={() => copyText(message.content)}><Copy size={14} />{t('chat.message.copy')}</button>
      {message.role === 'assistant' ? (
        <button type="button" className="ghost-button" onClick={() => onAction(t('chat.toast.regenerate'), () => api.regenerateMessage({ assistantMessageId: message.id, modelId, contextStrategy }))}>
          <RefreshCw size={14} />
          {t('chat.message.regenerate')}
        </button>
      ) : null}
      <button type="button" className="ghost-button" onClick={() => onAction(t('chat.toast.retry'), () => api.retryMessage({ messageId: message.id, modelId, contextStrategy }))}>
        <RotateCcw size={14} />
        {t('chat.message.retry')}
      </button>
      {cancellable && message.requestLogId ? (
        <button type="button" className="ghost-button" onClick={() => onAction(t('chat.toast.cancelled'), () => api.cancelMessage({ requestLogId: message.requestLogId! }))}>
          <XCircle size={14} />
          {t('chat.message.cancel')}
        </button>
      ) : null}
    </>
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
