import { useEffect, useMemo, useState } from 'react';
import { Archive, Copy, Download, Plus, RefreshCcw, RotateCcw, Send, Split, Star, XCircle } from 'lucide-react';
import type { ContextStrategy, KnowledgeCitation } from '../../shared/types';
import { EmptyState } from '../components/EmptyState';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, contextStrategies, copyText, formatMessageMetadata, getDefaultModel } from './shared';

export function ChatPage({ activeTab, snapshot, api, onAction, onOpenModule }: TabPageProps) {
  const { t } = useI18n();
  const conversations = snapshot.conversations;
  const defaultModel = getDefaultModel(snapshot);
  const [conversationId, setConversationId] = useState<string>(conversations[0]?.id ?? '');
  const [content, setContent] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [modelId, setModelId] = useState(defaultModel?.id ?? snapshot.models[0]?.id ?? '');
  const [compareModelIds, setCompareModelIds] = useState<string[]>([]);
  const [contextStrategy, setContextStrategy] = useState<ContextStrategy>('recent_n');
  const activeConversation = conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0];
  const messages = activeConversation ? snapshot.messages.filter((message) => message.conversationId === activeConversation.id) : [];
  const filteredConversations = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    if (!query) {
      return conversations;
    }
    return conversations.filter((conversation) =>
      [conversation.title, conversation.summary ?? '', conversation.groupName ?? '', conversation.status]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [conversations, historyQuery]);

  useEffect(() => {
    if (!conversationId && conversations[0]) {
      setConversationId(conversations[0].id);
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    if (!modelId && defaultModel) {
      setModelId(defaultModel.id);
    }
  }, [defaultModel, modelId]);

  const createConversation = () =>
    onAction(t('chat.toast.created'), async () => {
      const created = await api.createConversation(t('chat.seed.newConversation'));
      setConversationId(created.id);
    });

  const sendCurrentMessage = () =>
    onAction(t('chat.toast.sent'), async () => {
      await api.sendMessage({ conversationId: activeConversation?.id, content, modelId, contextStrategy });
      setContent('');
    });

  const runCompare = () =>
    onAction(t('chat.toast.compare'), async () => {
      await api.compareModels({ conversationId: activeConversation?.id, content, modelIds: compareModelIds, contextStrategy });
      setContent('');
    });

  const exportCurrentConversation = () =>
    onAction(t('chat.toast.exported'), async () => {
      if (!activeConversation) return;
      const exported = await api.exportConversation({ conversationId: activeConversation.id, format: 'markdown', redacted: true });
      copyText(exported.content);
    });

  const toggleCompareModel = (nextModelId: string) => {
    setCompareModelIds((current) => {
      if (current.includes(nextModelId)) {
        return current.filter((id) => id !== nextModelId);
      }
      return [...current, nextModelId].slice(0, 3);
    });
  };

  if (activeTab.id === 'playground') {
    return (
      <TabPanel moduleId="chat" tab={activeTab} className="chat-panel">
        <div className="chat-layout">
          <aside className="conversation-list">
            <div className="list-header">
              <h2>{t('chat.localConversations')}</h2>
              <button type="button" aria-label={t('chat.newConversation.aria')} onClick={createConversation}>
                <Plus size={16} />
              </button>
            </div>
            <input className="search-input" placeholder={t('chat.search.placeholder')} value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} />
            {filteredConversations.map((conversation) => (
              <button
                type="button"
                className={`conversation-row ${activeConversation?.id === conversation.id ? 'is-active' : ''}`}
                key={conversation.id}
                onClick={() => setConversationId(conversation.id)}
              >
                <strong>{conversation.title}</strong>
                <span>
                  {t('common.valueSeparator', {
                    left: t('common.messageCount', { count: conversation.messageCount }),
                    right: conversation.isFavorite ? t('common.favorite') : conversation.status,
                  })}
                </span>
              </button>
            ))}
          </aside>

          <section className="message-column">
            <div className="chat-topline">
              <div>
                <h2>{activeConversation?.title ?? t('chat.fallbackConversation')}</h2>
                <p>{t('chat.playground.note')}</p>
              </div>
              <div className="chat-topline-actions">
                <select value={modelId} onChange={(event) => setModelId(event.target.value)} aria-label={t('chat.modelSelect.aria')}>
                  {snapshot.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {t('common.valueSeparator', { left: model.displayName, right: model.healthStatus })}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={exportCurrentConversation} disabled={!activeConversation}>
                  <Download size={16} /> {t('chat.exportConversation')}
                </button>
              </div>
            </div>

            <div className="message-timeline">
              {messages.length === 0 ? (
                <EmptyState title={t('chat.empty.title')} reason={t('chat.empty.reason')} />
              ) : (
                messages.map((message) => {
                  const chunks = snapshot.messageChunks.filter((chunk) => chunk.messageId === message.id);
                  const citations = snapshot.knowledgeCitations.filter((citation) => citation.messageId === message.id);
                  const parentUser = message.parentMessageId ? messages.find((candidate) => candidate.id === message.parentMessageId) : null;
                  return (
                    <article className={`message-bubble role-${message.role} status-${message.status}`} key={message.id}>
                      <div className="message-meta">
                        <strong>{message.role === 'user' ? t('chat.role.user') : t('chat.role.assistant')}</strong>
                        {message.modelNameSnapshot ? <span>{message.modelNameSnapshot}</span> : null}
                        {message.latencyMs ? <span>{message.latencyMs}ms</span> : null}
                        <span>{message.contextStrategy}</span>
                        <StateBadge label={statusLabelForMessage(message.status, t)} tone={message.status === 'failed' ? 'error' : message.status === 'cancelled' ? 'warning' : 'muted'} />
                      </div>
                      <p>{message.content}</p>
                      {message.errorMessage ? <small>{message.errorMessage}</small> : null}
                      {message.metadataJson ? <small>{formatMessageMetadata(message.metadataJson, t)}</small> : null}
                      {message.contextMessageIdsJson ? <small>{t('chat.message.contextIds', { count: parseJsonArrayCount(message.contextMessageIdsJson) })}</small> : null}
                      {chunks.length > 0 ? <small>{t('chat.message.chunks', { count: chunks.length })}</small> : null}
                      <CitationList citations={citations} />
                      <div className="message-actions" aria-label={t('chat.message.actions.aria')}>
                        <button type="button" onClick={() => copyText(message.content)}>
                          <Copy size={14} /> {t('chat.message.copy')}
                        </button>
                        {message.status === 'failed' ? (
                          <button type="button" onClick={() => onAction(t('chat.toast.retry'), () => api.retryMessage({ messageId: message.id, modelId, contextStrategy }))}>
                            <RefreshCcw size={14} /> {t('chat.message.retry')}
                          </button>
                        ) : null}
                        {message.role === 'assistant' && message.status === 'completed' && parentUser ? (
                          <button type="button" onClick={() => onAction(t('chat.toast.regenerate'), () => api.regenerateMessage({ assistantMessageId: message.id, modelId, contextStrategy }))}>
                            <RotateCcw size={14} /> {t('chat.message.regenerate')}
                          </button>
                        ) : null}
                        {(message.status === 'streaming' || message.status === 'failed') && message.requestLogId ? (
                          <button type="button" onClick={() => onAction(t('chat.toast.cancelled'), () => api.cancelMessage({ requestLogId: message.requestLogId! }))}>
                            <XCircle size={14} /> {t('chat.message.cancel')}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="composer">
              <select value={contextStrategy} onChange={(event) => setContextStrategy(event.target.value as ContextStrategy)} aria-label={t('chat.contextSelect.aria')}>
                {contextStrategies.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {t(strategy.labelKey)}
                  </option>
                ))}
              </select>
              <input
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={t('chat.composer.placeholder')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && content.trim()) {
                    sendCurrentMessage();
                  }
                }}
              />
              <button type="button" className="primary-button" disabled={!content.trim()} onClick={sendCurrentMessage}>
                <Send size={16} /> {t('chat.send')}
              </button>
            </div>
          </section>

          <aside className="chat-context">
            <h2>{t('chat.context.title')}</h2>
            <p>{t('chat.context.note')}</p>
            <dl>
              <div><dt>{t('chat.context.knowledgeFiles')}</dt><dd>{t('common.countItems', { count: snapshot.knowledgeFiles.length })}</dd></div>
              <div><dt>{t('chat.context.toolPermissions')}</dt><dd>{t('common.countGranted', { count: snapshot.mcpServers.filter((server) => server.permissionState === 'granted').length })}</dd></div>
              <div><dt>{t('chat.context.historyState')}</dt><dd>{t('chat.context.sqlite')}</dd></div>
              <div><dt>{t('chat.context.currentModel')}</dt><dd>{snapshot.models.find((model) => model.id === modelId)?.displayName ?? t('common.notConfigured')}</dd></div>
            </dl>
            <div className="compare-panel">
              <h3>{t('chat.compare.title')}</h3>
              <p>{t('chat.compare.note')}</p>
              <div className="compare-model-list" aria-label={t('chat.compare.models')}>
                {snapshot.models.slice(0, 6).map((model) => (
                  <label key={model.id}>
                    <input
                      type="checkbox"
                      checked={compareModelIds.includes(model.id)}
                      onChange={() => toggleCompareModel(model.id)}
                    />
                    <span>{model.displayName}</span>
                  </label>
                ))}
              </div>
              <small>{t('chat.compare.limitHint')}</small>
              <button type="button" disabled={!content.trim() || compareModelIds.length < 2} onClick={runCompare}>
                <Split size={16} /> {t('chat.compare.run')}
              </button>
            </div>
          </aside>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'context') {
    return (
      <TabPanel moduleId="chat" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('chat.strategy.title')}</h2>
            <p>{t('chat.strategy.note')}</p>
            <DataTable
              columns={[t('chat.strategy.columns.strategy'), t('chat.strategy.columns.value'), t('chat.strategy.columns.current')]}
              rows={contextStrategies.map((strategy) => [
                t(strategy.labelKey),
                strategy.value,
                strategy.value === contextStrategy ? <StateBadge key={strategy.value} label={t('common.currentSelection')} tone="success" /> : '-',
              ])}
            />
          </div>
          <div className="panel">
            <h2>{t('chat.session.title')}</h2>
            <dl className="detail-list">
              <div><dt>{t('chat.session.conversation')}</dt><dd>{activeConversation?.title ?? t('common.notSelected')}</dd></div>
              <div><dt>{t('chat.session.messages')}</dt><dd>{messages.length}</dd></div>
              <div><dt>{t('chat.session.model')}</dt><dd>{snapshot.models.find((model) => model.id === modelId)?.displayName ?? defaultModel?.displayName ?? t('common.notConfigured')}</dd></div>
              <div><dt>{t('chat.context.knowledgeFiles')}</dt><dd>{snapshot.knowledgeFiles.length}</dd></div>
              <div><dt>{t('chat.session.citationHints')}</dt><dd>{t('chat.session.citationCopy', { count: snapshot.knowledgeCitations.length })}</dd></div>
            </dl>
          </div>
        </section>
        <section className="panel roadmap-panel">
          <h2>{t('chat.advanced.title')}</h2>
          <p>{t('chat.advanced.note')}</p>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="chat" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{t('chat.list.title')}</h2>
            <p>{t('chat.list.note')}</p>
          </div>
          <button type="button" className="primary-button" onClick={createConversation}>
            <Plus size={16} /> {t('chat.newConversation')}
          </button>
        </div>
        <input className="search-input" placeholder={t('chat.search.placeholder')} value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} />
        <DataTable
          columns={[t('chat.columns.title'), t('chat.columns.messages'), t('chat.columns.pinned'), t('chat.columns.favorite'), t('chat.columns.status'), t('chat.columns.actions')]}
          rows={filteredConversations.map((conversation) => [
            conversation.title,
            conversation.messageCount,
            conversation.isPinned ? t('common.yes') : t('common.no'),
            conversation.isFavorite ? t('common.yes') : t('common.no'),
            conversation.status,
            <div className="button-row" key={conversation.id}>
              <button type="button" onClick={() => onAction(t('chat.toast.pinned'), () => api.updateConversationFlags(conversation.id, { isPinned: !conversation.isPinned }))}>
                <Archive size={16} /> {conversation.isPinned ? t('common.cancelPin') : t('common.pin')}
              </button>
              <button type="button" onClick={() => onAction(t('chat.toast.favorite'), () => api.updateConversationFlags(conversation.id, { isFavorite: !conversation.isFavorite }))}>
                <Star size={16} /> {conversation.isFavorite ? t('common.cancelFavorite') : t('common.favorite')}
              </button>
            </div>,
          ])}
        />
        <div className="button-row">
          <button type="button" onClick={() => copyText(JSON.stringify(conversations, null, 2))}>
            <Copy size={16} /> {t('chat.copyHistory')}
          </button>
          <button type="button" onClick={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })}>
            <Send size={16} /> {t('chat.openRuntime')}
          </button>
        </div>
      </section>
    </TabPanel>
  );
}

function CitationList({ citations }: { citations: KnowledgeCitation[] }) {
  const { t } = useI18n();
  if (citations.length === 0) {
    return null;
  }
  return (
    <div className="citation-list" aria-label={t('chat.citations.aria')}>
      <strong>{t('chat.citations.title', { count: citations.length })}</strong>
      {citations.map((citation) => (
        <div className="citation-item" key={citation.id}>
          <span>{t('chat.citations.source', { file: citation.fileName, score: citation.score.toFixed(2) })}</span>
          <small>{citation.snippet}</small>
        </div>
      ))}
    </div>
  );
}

function parseJsonArrayCount(value: string): number {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function statusLabelForMessage(status: string, t: ReturnType<typeof useI18n>['t']): string {
  if (status === 'streaming') return t('chat.status.streaming');
  if (status === 'failed') return t('chat.status.failed');
  if (status === 'cancelled') return t('chat.status.cancelled');
  if (status === 'draft') return t('common.draft');
  if (status === 'completed') return t('common.completed');
  return status;
}
