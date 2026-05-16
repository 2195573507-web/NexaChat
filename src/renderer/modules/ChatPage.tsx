import { Copy, GitCompareArrows, MessageSquarePlus, Pin, Send, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ContextStrategy, Conversation, Message } from '../../shared/types';
import { ChatInput, MessageBubble } from '../components/AppFrame';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, DataRows, EmptyBlock, StatusPillLite, ToolSection } from '../components/AppFrame';
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

export function ChatPage({ activeTab, snapshot, api, onAction, onOpenModule }: TabPageProps) {
  const { t } = useI18n();
  const [activeConversationId, setActiveConversationId] = useState(snapshot.conversations[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const [contextStrategy, setContextStrategy] = useState<ContextStrategy>(snapshot.conversations[0]?.summary ? 'summary_recent_n' : 'recent_n');
  const [compareModelIds, setCompareModelIds] = useState<string[]>([]);
  const defaultModel = getDefaultModel(snapshot);
  const activeConversation = snapshot.conversations.find((conversation) => conversation.id === activeConversationId) ?? snapshot.conversations[0];
  const messages = getConversationMessages(snapshot.messages, activeConversation?.id);
  const selectedModelIds = compareModelIds.length > 0 ? compareModelIds : defaultModel ? [defaultModel.id] : [];

  const sendCurrentMessage = async () => {
    const content = draft.trim();
    if (!content) {
      return;
    }
    await api.sendMessage({
      conversationId: activeConversation?.id,
      content,
      modelId: selectedModelIds[0],
      contextStrategy,
    });
    setDraft('');
  };

  if (activeTab.id === 'conversations') {
    return (
      <TabPanel moduleId="chat" tab={activeTab} className="tool-layout">
        <ConfigList
          title={t('chat.list.title')}
          description={activeTab.description}
          actions={<CommandButton variant="primary" icon={<MessageSquarePlus size={15} />} onClick={() => onAction(t('chat.toast.created'), () => api.createConversation(t('chat.seed.newConversation')))}>{t('chat.newConversation')}</CommandButton>}
        >
          <div className="config-items">
            {snapshot.conversations.map((conversation) => (
              <button type="button" className={`config-row ${conversation.id === activeConversation?.id ? 'is-active' : ''}`} key={conversation.id} onClick={() => setActiveConversationId(conversation.id)}>
                <span>
                  <strong>{conversation.title}</strong>
                  <small>{t('common.messageCount', { count: conversation.messageCount })} / {formatDate(conversation.lastMessageAt, t)}</small>
                </span>
                <StatusPillLite label={statusLabel(conversation.status, t)} state={conversation.status === 'active' ? 'ready' : 'muted'} />
              </button>
            ))}
          </div>
        </ConfigList>
        <ConfigDetail title={t('chat.session.title')} description={t('chat.list.note')}>
          {activeConversation ? <ConversationTools conversation={activeConversation} api={api} onAction={onAction} /> : <EmptyBlock title={t('chat.empty.title')} detail={t('chat.empty.reason')} />}
        </ConfigDetail>
      </TabPanel>
    );
  }

  if (activeTab.id === 'context') {
    return (
      <TabPanel moduleId="chat" tab={activeTab} className="tool-layout">
        <ConfigList title={t('chat.context.title')} description={activeTab.featureBoundary}>
          <DataRows
            rows={[
              { label: t('chat.context.knowledgeFiles'), value: snapshot.knowledgeFiles.filter((file) => !file.deletedAt).length },
              { label: t('chat.context.toolPermissions'), value: snapshot.mcpServers.filter((server) => server.permissionState === 'granted').length },
              { label: t('chat.context.historyState'), value: activeConversation ? statusLabel(activeConversation.status, t) : t('common.none') },
              { label: t('chat.context.currentModel'), value: defaultModel?.displayName ?? t('common.notConfigured') },
            ]}
          />
          <ToolSection title={t('chat.strategy.title')} description={t('chat.strategy.note')}>
            <div className="segmented-list">
              {contextStrategies.map((strategy) => (
                <button type="button" className={contextStrategy === strategy.value ? 'is-active' : ''} key={strategy.value} onClick={() => setContextStrategy(strategy.value)}>
                  {t(strategy.labelKey)}
                </button>
              ))}
            </div>
          </ToolSection>
        </ConfigList>
        <ConfigDetail title={t('chat.advanced.title')} description={t('chat.advanced.note')}>
          <StatusPillLite label={t('tools.columns.dryRun')} state="warning" />
          <DataRows
            rows={[
              { label: t('chat.compare.title'), value: t('stage.environment-limited') },
              { label: t('knowledge.retrieval.title'), value: snapshot.knowledgeRetrievals.length },
            ]}
          />
        </ConfigDetail>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="chat" tab={activeTab} className="chat-workspace">
      <aside className="conversation-strip">
        <div className="section-head">
          <div>
            <h2>{t('chat.localConversations')}</h2>
            <p>{t('chat.playground.note')}</p>
          </div>
        </div>
        <div className="conversation-scroll">
          {snapshot.conversations.map((conversation) => (
            <button type="button" className={`conversation-tile ${conversation.id === activeConversation?.id ? 'is-active' : ''}`} key={conversation.id} onClick={() => setActiveConversationId(conversation.id)}>
              <strong>{conversation.title}</strong>
              <small>{t('common.messageCount', { count: conversation.messageCount })}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-column">
        <header className="chat-header">
          <div>
            <span className="eyebrow">{activeConversation?.title ?? t('chat.seed.newConversation')}</span>
            <h2>{defaultModel?.displayName ?? t('common.notConfigured')}</h2>
          </div>
          <select aria-label={t('chat.modelSelect.aria')} value={selectedModelIds[0] ?? ''} onChange={(event) => setCompareModelIds(event.target.value ? [event.target.value] : [])}>
            {snapshot.models.map((model) => (
              <option value={model.id} key={model.id}>{model.displayName}</option>
            ))}
          </select>
        </header>

        <div className="message-timeline">
          {messages.length > 0 ? (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                status={message.status}
                meta={<span>{statusLabel(message.status, t)} / {message.metadataJson ? formatMessageMetadata(message.metadataJson, t) : formatDate(message.createdAt, t)}</span>}
                actionsLabel={t('chat.message.actions.aria')}
                actions={<button type="button" className="ghost-button" onClick={() => copyText(message.content)}><Copy size={14} />{t('chat.message.copy')}</button>}
              >
                <p>{message.content}</p>
              </MessageBubble>
            ))
          ) : (
            <EmptyBlock title={t('chat.empty.title')} detail={t('chat.empty.reason')} />
          )}
        </div>

        <ChatInput
          value={draft}
          placeholder={t('chat.composer.placeholder')}
          contextControl={
            <select aria-label={t('chat.contextSelect.aria')} value={contextStrategy} onChange={(event) => setContextStrategy(event.target.value as typeof contextStrategy)}>
              {contextStrategies.map((strategy) => (
                <option value={strategy.value} key={strategy.value}>{t(strategy.labelKey)}</option>
              ))}
            </select>
          }
          sendLabel={t('chat.send')}
          sendIcon={<Send size={15} />}
          disabled={!defaultModel}
          onChange={setDraft}
          onSend={() => onAction(t('chat.toast.sent'), sendCurrentMessage)}
        />
      </section>

      <ConfigDetail title={t('chat.compare.title')} description={t('chat.compare.note')} className="chat-detail">
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
        <ActivityList
          empty={t('app.recent.empty')}
          items={snapshot.requestLogs.slice(0, 5).map((log) => ({
            title: log.modelNameSnapshot ?? log.endpoint,
            meta: statusLabel(log.status, t),
            state: healthState(log.status),
          }))}
        />
      </ConfigDetail>
    </TabPanel>
  );
}

function ConversationTools({
  conversation,
  api,
  onAction,
}: {
  conversation: Conversation;
  api: TabPageProps['api'];
  onAction: TabPageProps['onAction'];
}) {
  const { t } = useI18n();
  return (
    <div className="vertical-actions">
      <CommandButton icon={<Pin size={15} />} onClick={() => onAction(t('chat.toast.pinned'), () => api.updateConversationFlags(conversation.id, { isPinned: !conversation.isPinned }))}>
        {conversation.isPinned ? t('common.cancelPin') : t('common.pin')}
      </CommandButton>
      <CommandButton icon={<Star size={15} />} onClick={() => onAction(t('chat.toast.favorite'), () => api.updateConversationFlags(conversation.id, { isFavorite: !conversation.isFavorite }))}>
        {conversation.isFavorite ? t('common.cancelFavorite') : t('common.favorite')}
      </CommandButton>
      <CommandButton onClick={() => onAction(t('chat.toast.exported'), () => api.exportConversation({ conversationId: conversation.id, format: 'markdown', redacted: true }))}>
        {t('chat.exportConversation')}
      </CommandButton>
    </div>
  );
}
