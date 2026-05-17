import { Copy, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { memo } from 'react';
import type { ContextStrategy, KnowledgeCitation, Message } from '../../../shared/types';
import { MessageBubble } from '../../components/AppFrame';
import { useI18n } from '../../i18n';
import { copyText, formatDate, formatMessageMetadata, statusLabel, type TabPageProps } from '../shared';

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  snapshot,
  api,
  onAction,
  contextStrategy,
  modelId,
}: {
  message: Message;
  snapshot: TabPageProps['snapshot'];
  api: TabPageProps['api'];
  onAction: TabPageProps['onAction'];
  contextStrategy: ContextStrategy;
  modelId?: string;
}) {
  const { t } = useI18n();
  return (
    <MessageBubble
      role={message.role}
      status={message.status}
      meta={<span>{message.modelNameSnapshot ?? statusLabel(message.status, t)} / {message.metadataJson ? formatMessageMetadata(message.metadataJson, t) : formatDate(message.createdAt, t)}</span>}
      actionsLabel={t('chat.message.actions.aria')}
      actions={
        <MessageActions
          message={message}
          api={api}
          onAction={onAction}
          contextStrategy={contextStrategy}
          modelId={modelId}
        />
      }
    >
      <p>{message.content}</p>
      {message.role === 'assistant' ? <CitationList citations={getMessageCitations(snapshot, message)} /> : null}
      {message.errorMessage ? <small>{message.errorMessage}</small> : null}
    </MessageBubble>
  );
});

function getMessageCitations(snapshot: TabPageProps['snapshot'], message: Message) {
  return snapshot.knowledgeCitations.filter((citation) => citation.messageId === message.id);
}

function CitationList({ citations }: { citations: KnowledgeCitation[] }) {
  const { t } = useI18n();
  if (citations.length === 0) {
    return null;
  }
  return (
    <div className="message-citations" aria-label={t('chat.citations.aria')}>
      <strong>{t('chat.citations.title', { count: citations.length })}</strong>
      {citations.slice(0, 4).map((citation) => (
        <span key={citation.id}>{t('chat.citations.source', { file: citation.fileName, score: citation.score.toFixed(2) })} / {citation.snippet}</span>
      ))}
    </div>
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
