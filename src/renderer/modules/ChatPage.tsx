import { useEffect, useMemo, useState } from 'react';
import { Archive, Copy, Plus, Send, Star } from 'lucide-react';
import type { ContextStrategy } from '../../shared/types';
import { EmptyState } from '../components/EmptyState';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, contextStrategies, copyText, formatMessageMetadata, getDefaultModel } from './shared';

export function ChatPage({ activeTab, snapshot, api, onAction, onOpenModule }: TabPageProps) {
  const conversations = snapshot.conversations;
  const defaultModel = getDefaultModel(snapshot);
  const [conversationId, setConversationId] = useState<string>(conversations[0]?.id ?? '');
  const [content, setContent] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [modelId, setModelId] = useState(defaultModel?.id ?? snapshot.models[0]?.id ?? '');
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
    onAction('已创建并切换到新会话', async () => {
      const created = await api.createConversation('新的本地会话');
      setConversationId(created.id);
    });

  const sendCurrentMessage = () =>
    onAction('消息已发送并写入本地历史', async () => {
      await api.sendMessage({ conversationId: activeConversation?.id, content, modelId, contextStrategy });
      setContent('');
    });

  if (activeTab.id === 'playground') {
    return (
      <TabPanel moduleId="chat" tab={activeTab} className="chat-panel">
        <div className="chat-layout">
          <aside className="conversation-list">
            <div className="list-header">
              <h2>本地会话</h2>
              <button type="button" aria-label="新建本地会话" onClick={createConversation}>
                <Plus size={16} />
              </button>
            </div>
            <input className="search-input" placeholder="搜索标题、分组、状态" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} />
            {filteredConversations.map((conversation) => (
              <button
                type="button"
                className={`conversation-row ${activeConversation?.id === conversation.id ? 'is-active' : ''}`}
                key={conversation.id}
                onClick={() => setConversationId(conversation.id)}
              >
                <strong>{conversation.title}</strong>
                <span>{conversation.messageCount} 条 · {conversation.isFavorite ? '收藏' : conversation.status}</span>
              </button>
            ))}
          </aside>

          <section className="message-column">
            <div className="chat-topline">
              <div>
                <h2>{activeConversation?.title ?? '会话'}</h2>
                <p>Provider 与 Gateway Key 配置留在模型/网关模块；本页只负责聊天运行。</p>
              </div>
              <select value={modelId} onChange={(event) => setModelId(event.target.value)} aria-label="模型选择">
                {snapshot.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.displayName} · {model.healthStatus}
                  </option>
                ))}
              </select>
            </div>

            <div className="message-timeline">
              {messages.length === 0 ? (
                <EmptyState title="没有消息" reason="当前会话还没有本地消息。输入内容后可以通过现有 Chat -> Router -> 本地响应闭环发送。" />
              ) : (
                messages.map((message) => (
                  <article className={`message-bubble role-${message.role}`} key={message.id}>
                    <div className="message-meta">
                      <strong>{message.role === 'user' ? '你' : 'NexaChat'}</strong>
                      {message.modelNameSnapshot ? <span>{message.modelNameSnapshot}</span> : null}
                      {message.latencyMs ? <span>{message.latencyMs}ms</span> : null}
                      <span>{message.contextStrategy}</span>
                    </div>
                    <p>{message.content}</p>
                    {message.metadataJson ? <small>{formatMessageMetadata(message.metadataJson)}</small> : null}
                  </article>
                ))
              )}
            </div>

            <div className="composer">
              <select value={contextStrategy} onChange={(event) => setContextStrategy(event.target.value as ContextStrategy)} aria-label="上下文策略">
                {contextStrategies.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
              <input
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="输入消息，本地保存后再路由到模型..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && content.trim()) {
                    sendCurrentMessage();
                  }
                }}
              />
              <button type="button" className="primary-button" disabled={!content.trim()} onClick={sendCurrentMessage}>
                <Send size={16} /> 发送
              </button>
            </div>
          </section>

          <aside className="chat-context">
            <h2>当前上下文</h2>
            <p>Context strategy 会写入 request log，便于之后审计模型实际看到的上下文。</p>
            <dl>
              <div><dt>知识文件</dt><dd>{snapshot.knowledgeFiles.length} 个</dd></div>
              <div><dt>工具权限</dt><dd>{snapshot.mcpServers.filter((server) => server.permissionState === 'granted').length} 个已授权</dd></div>
              <div><dt>历史状态</dt><dd>SQLite 本地持久化</dd></div>
              <div><dt>当前模型</dt><dd>{snapshot.models.find((model) => model.id === modelId)?.displayName ?? '未配置'}</dd></div>
            </dl>
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
            <h2>上下文策略</h2>
            <p>本页只展示聊天上下文策略和当前会话状态；完整 RAG、Artifacts、多模型对比保留在 Roadmap 说明中。</p>
            <DataTable
              columns={['策略', '值', '当前']}
              rows={contextStrategies.map((strategy) => [
                strategy.label,
                strategy.value,
                strategy.value === contextStrategy ? <StateBadge key={strategy.value} label="当前选择" tone="success" /> : '-',
              ])}
            />
          </div>
          <div className="panel">
            <h2>当前会话状态</h2>
            <dl className="detail-list">
              <div><dt>会话</dt><dd>{activeConversation?.title ?? '未选择'}</dd></div>
              <div><dt>消息数</dt><dd>{messages.length}</dd></div>
              <div><dt>模型</dt><dd>{snapshot.models.find((model) => model.id === modelId)?.displayName ?? defaultModel?.displayName ?? '未配置'}</dd></div>
              <div><dt>知识文件</dt><dd>{snapshot.knowledgeFiles.length}</dd></div>
              <div><dt>引用线索</dt><dd>当前版本保存 metadata 线索，不声明完整向量引用链。</dd></div>
            </dl>
          </div>
        </section>
        <section className="panel roadmap-panel">
          <h2>未暴露到主流程的高级能力</h2>
          <p>多模型对比、Artifacts、Prompt 模板版本库、完整向量 RAG 均未作为可点击主功能出现；需要完成数据模型和执行链路后再进入侧边栏。</p>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="chat" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>会话列表</h2>
            <p>会话、收藏、置顶、归档和本地历史都属于对话模块；Provider 与 Gateway Key 不在这里配置。</p>
          </div>
          <button type="button" className="primary-button" onClick={createConversation}>
            <Plus size={16} /> 新建会话
          </button>
        </div>
        <input className="search-input" placeholder="搜索标题、分组、状态" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} />
        <DataTable
          columns={['标题', '消息数', '置顶', '收藏', '状态', '操作']}
          rows={filteredConversations.map((conversation) => [
            conversation.title,
            conversation.messageCount,
            conversation.isPinned ? 'yes' : 'no',
            conversation.isFavorite ? 'yes' : 'no',
            conversation.status,
            <div className="button-row" key={conversation.id}>
              <button type="button" onClick={() => onAction('会话置顶状态已更新', () => api.updateConversationFlags(conversation.id, { isPinned: !conversation.isPinned }))}>
                <Archive size={16} /> {conversation.isPinned ? '取消置顶' : '置顶'}
              </button>
              <button type="button" onClick={() => onAction('会话收藏状态已更新', () => api.updateConversationFlags(conversation.id, { isFavorite: !conversation.isFavorite }))}>
                <Star size={16} /> {conversation.isFavorite ? '取消收藏' : '收藏'}
              </button>
            </div>,
          ])}
        />
        <div className="button-row">
          <button type="button" onClick={() => copyText(JSON.stringify(conversations, null, 2))}>
            <Copy size={16} /> 复制本地历史预览
          </button>
          <button type="button" onClick={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })}>
            <Send size={16} /> 打开聊天运行
          </button>
        </div>
      </section>
    </TabPanel>
  );
}
