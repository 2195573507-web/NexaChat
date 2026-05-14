import { useEffect, useState } from 'react';
import { Copy, Plus, Send } from 'lucide-react';
import type { ContextStrategy } from '../../shared/types';
import { EmptyState } from '../components/EmptyState';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel, contextStrategies, copyText, formatMessageMetadata, getDefaultModel } from './shared';

export function ChatPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const conversations = snapshot.conversations;
  const defaultModel = getDefaultModel(snapshot);
  const [conversationId, setConversationId] = useState<string>(conversations[0]?.id ?? '');
  const [content, setContent] = useState('');
  const [modelId, setModelId] = useState(defaultModel?.id ?? snapshot.models[0]?.id ?? '');
  const [contextStrategy, setContextStrategy] = useState<ContextStrategy>('recent_n');
  const activeConversation = conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0];
  const messages = activeConversation ? snapshot.messages.filter((message) => message.conversationId === activeConversation.id) : [];

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

  if (activeTab.id === 'comparison') {
    return (
      <TabPanel moduleId="chat" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="多模型对比"
          why="当前 Router 只执行单次请求，尚未实现多模型 fan-out、并发取消、结果对齐和对比记录落库。"
          dependency="先完成多请求调度、统一响应 schema、成本归集和失败隔离。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'artifacts') {
    return (
      <TabPanel moduleId="chat" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="Artifacts"
          why="生成文件、预览元数据和编辑器存储模型还没有落库，当前不能提供空编辑器外壳。"
          dependency="先补齐 artifact 表、文件沙箱、预览渲染和导出权限边界。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'assistants') {
    return (
      <TabPanel moduleId="chat" tab={activeTab}>
        <section className="panel">
          <h2>助手定义</h2>
          <p>当前助手能力复用 Tools / Agent 定义的数据路径，本页展示默认模型、审批策略和可用范围，不提供未落库的假编辑器。</p>
          <DataTable
            columns={['名称', '目标', '默认模型', '审批策略', '阶段']}
            rows={snapshot.agents.map((agent) => [
              agent.name,
              agent.goal,
              snapshot.models.find((model) => model.id === agent.defaultModelId)?.displayName ?? defaultModel?.displayName ?? '未配置',
              agent.approvalPolicy,
              <StateBadge key={`${agent.id}-stage`} label={agent.stage} tone={agent.stage === 'implemented' ? 'success' : 'warning'} />,
            ])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'prompt-lab') {
    return (
      <TabPanel moduleId="chat" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>Prompt Lab</h2>
            <p>使用现有 Chat 路由发送测试 prompt；模板版本库尚未单独落库，因此这里保留为轻量预览。</p>
            <div className="form-grid single-column">
              <label>
                测试 Prompt
                <input value={content} onChange={(event) => setContent(event.target.value)} placeholder="输入要通过当前模型测试的 prompt" />
              </label>
              <label>
                模型
                <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                  {snapshot.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.displayName} · {model.healthStatus}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={!content.trim()}
              onClick={() =>
                onAction('Prompt Lab 已通过现有路由发送', async () => {
                  await api.sendMessage({ conversationId: activeConversation?.id, content, modelId, contextStrategy });
                  setContent('');
                })
              }
            >
              <Send size={16} /> 测试发送
            </button>
          </div>
          <div className="panel">
            <h2>版本边界</h2>
            <p>Prompt 模板、版本 diff、批量评测和回滚仍需单独数据模型；本轮只复用已验证的本地聊天闭环。</p>
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'local-history') {
    return (
      <TabPanel moduleId="chat" tab={activeTab}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>本地历史</h2>
              <p>会话保存在 SQLite；搜索、收藏、归档筛选作为本地历史入口呈现。</p>
            </div>
            <button type="button" onClick={() => copyText(JSON.stringify(conversations, null, 2))}>
              <Copy size={16} /> 复制导出预览
            </button>
          </div>
          <input className="search-input" placeholder="搜索标题、模型、收藏" />
          <DataTable
            columns={['标题', '消息数', '置顶', '收藏', '状态']}
            rows={conversations.map((conversation) => [
              conversation.title,
              conversation.messageCount,
              conversation.isPinned ? 'yes' : 'no',
              conversation.isFavorite ? 'yes' : 'no',
              conversation.status,
            ])}
          />
        </section>
      </TabPanel>
    );
  }

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
        <input className="search-input" placeholder="搜索标题、模型、收藏" />
        {conversations.map((conversation) => (
          <button
            type="button"
            className={`conversation-row ${activeConversation?.id === conversation.id ? 'is-active' : ''}`}
            key={conversation.id}
            onClick={() => setConversationId(conversation.id)}
          >
            <strong>{conversation.title}</strong>
            <span>{conversation.messageCount} 条 · {conversation.isFavorite ? '收藏' : '本地历史'}</span>
          </button>
        ))}
      </aside>

      <section className="message-column">
        <div className="chat-topline">
          <div>
            <h2>{activeConversation?.title ?? '会话'}</h2>
            <p>切换 Provider / Model / API Key 不会删除或隐藏本地历史。</p>
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
            <EmptyState title="没有消息" reason="当前会话还没有本地消息。" actionLabel="发送第一条消息" />
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
          <select value={contextStrategy} onChange={(event) => setContextStrategy(event.target.value as ContextStrategy)}>
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
                onAction('消息已发送并写入本地历史', async () => {
                  await api.sendMessage({ conversationId: activeConversation?.id, content, modelId, contextStrategy });
                  setContent('');
                });
              }
            }}
          />
          <button
            type="button"
            className="primary-button"
            disabled={!content.trim()}
            onClick={() =>
              onAction('消息已发送并写入本地历史', async () => {
                await api.sendMessage({ conversationId: activeConversation?.id, content, modelId, contextStrategy });
                setContent('');
              })
            }
          >
            <Send size={16} /> 发送
          </button>
        </div>
      </section>

      <aside className="chat-context">
        <h2>参数与上下文</h2>
        <p>Context strategy 会写入 request log，便于之后审计模型实际看到的上下文。</p>
        <dl>
          <div>
            <dt>知识文件</dt>
            <dd>{snapshot.knowledgeFiles.length} 个</dd>
          </div>
          <div>
            <dt>工具权限</dt>
            <dd>MCP 默认未授权</dd>
          </div>
          <div>
            <dt>历史状态</dt>
            <dd>SQLite 本地持久化</dd>
          </div>
          <div>
            <dt>当前模型</dt>
            <dd>{snapshot.models.find((model) => model.id === modelId)?.displayName ?? '未配置'}</dd>
          </div>
        </dl>
      </aside>
    </div>
    </TabPanel>
  );
}
