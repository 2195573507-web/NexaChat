import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Copy, Database, FilePlus2, KeyRound, Play, Plus, Send, Settings2, ShieldCheck } from 'lucide-react';
import { navModules } from '../shared/navigation';
import type {
  AppApi,
  AppSnapshot,
  ContextStrategy,
  ModuleId,
  ProviderType,
  UiPreferences,
} from '../shared/types';
import { AppShell } from './AppShell';
import { getAppApi } from './api';
import { EmptyState } from './components/EmptyState';
import { ErrorDiagnosisPanel } from './components/ErrorDiagnosisPanel';
import './styles.css';

const providerTypes: ProviderType[] = ['openai-compatible', 'openai', 'anthropic', 'gemini', 'deepseek', 'qwen', 'ollama', 'lm-studio', 'custom'];
const contextStrategies: Array<{ value: ContextStrategy; label: string }> = [
  { value: 'recent_n', label: '最近 N 轮' },
  { value: 'summary_recent_n', label: '摘要 + 最近' },
  { value: 'manual', label: '手动选择' },
  { value: 'token_trim', label: 'Token 自动裁剪' },
];

function App() {
  const [api] = useState<AppApi>(() => getAppApi());
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<ModuleId>('dashboard');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    setSnapshot(await api.getSnapshot());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const activeModule = useMemo(
    () => navModules.find((module) => module.id === activeModuleId) ?? navModules[0],
    [activeModuleId],
  );

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await refresh();
      setNotice(label);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot) {
    return <div className="boot-screen">NexaChat 正在加载本地数据...</div>;
  }

  const page = {
    dashboard: (
      <DashboardPage
        snapshot={snapshot}
        onOpenModule={setActiveModuleId}
        onAction={(label, action) => runAction(label, action)}
        api={api}
      />
    ),
    chat: <ChatPage snapshot={snapshot} api={api} onAction={(label, action) => runAction(label, action)} />,
    models: <ModelsPage snapshot={snapshot} api={api} onAction={(label, action) => runAction(label, action)} />,
    knowledge: <KnowledgePage snapshot={snapshot} api={api} onAction={(label, action) => runAction(label, action)} />,
    tools: <ToolsPage snapshot={snapshot} api={api} onAction={(label, action) => runAction(label, action)} />,
    gateway: <GatewayPage snapshot={snapshot} api={api} onAction={(label, action) => runAction(label, action)} />,
    data: <DataPage snapshot={snapshot} api={api} onAction={(label, action) => runAction(label, action)} />,
    settings: <SettingsPage snapshot={snapshot} api={api} onAction={(label, action) => runAction(label, action)} />,
  }[activeModuleId];

  return (
    <AppShell
      activeModule={activeModule}
      activeModuleId={activeModuleId}
      onModuleChange={setActiveModuleId}
      snapshot={snapshot}
      rightRail={<RightRail snapshot={snapshot} busy={busy} notice={notice} />}
    >
      {page}
    </AppShell>
  );
}

function DashboardPage({
  snapshot,
  api,
  onAction,
  onOpenModule,
}: {
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
  onOpenModule: (moduleId: ModuleId) => void;
}) {
  const { dashboard } = snapshot;
  return (
    <div className="page-stack">
      <section className="overview-grid">
        <Metric title="本地会话" value={snapshot.conversations.length} detail="SQLite 本地历史" />
        <Metric title="供应商" value={snapshot.providers.length} detail="Provider 与 Model 分离" />
        <Metric title="今日请求" value={dashboard.usageToday.requests} detail={`${dashboard.usageToday.inputTokens + dashboard.usageToday.outputTokens} tokens`} />
        <Metric title="本地网关" value={dashboard.gatewayStatus.running ? '运行中' : '未启用'} detail="默认只绑定 127.0.0.1" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>启动状态</h2>
            <p>进入工作前需要看到的最小状态。</p>
          </div>
          <CheckCircle2 size={20} />
        </div>
        {dashboard.setupGaps.length === 0 ? (
          <p className="success-text">核心闭环已可用：Provider、Model、Chat、Gateway Key 与本地历史均存在。</p>
        ) : (
          <ul className="setup-list">
            {dashboard.setupGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="two-column">
        <div className="panel">
          <h2>最近会话</h2>
          <ListRows
            rows={dashboard.recentConversations.map((conversation) => ({
              title: conversation.title,
              meta: `${conversation.messageCount} 条消息 · ${conversation.isPinned ? '已置顶' : '普通'}`,
            }))}
            empty={<EmptyState title="没有会话" reason="本地历史还是空的。" actionLabel="新建会话" onAction={() => onOpenModule('chat')} />}
          />
        </div>
        <div className="panel">
          <h2>快捷操作</h2>
          <div className="action-grid">
            <button type="button" onClick={() => onOpenModule('chat')}>
              <Plus size={16} /> 新会话
            </button>
            <button type="button" onClick={() => onOpenModule('models')}>
              <Settings2 size={16} /> 添加 Provider
            </button>
            <button type="button" onClick={() => onOpenModule('data')}>
              <Database size={16} /> 导入配置
            </button>
            <button type="button" onClick={() => onOpenModule('gateway')}>
              <KeyRound size={16} /> 网关接入
            </button>
            <button type="button" onClick={() => onAction('已创建示例知识文件', () => api.createKnowledgeFile('quick-note.md', 'text/markdown', 1024))}>
              <FilePlus2 size={16} /> 上传文件
            </button>
            <button type="button" onClick={() => onOpenModule('settings')}>
              <ShieldCheck size={16} /> 查看诊断
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChatPage({
  snapshot,
  api,
  onAction,
}: {
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
}) {
  const conversations = snapshot.conversations;
  const [conversationId, setConversationId] = useState<string>(conversations[0]?.id ?? '');
  const [content, setContent] = useState('');
  const [modelId, setModelId] = useState(snapshot.models[0]?.id ?? '');
  const [contextStrategy, setContextStrategy] = useState<ContextStrategy>('recent_n');
  const activeConversation = conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0];
  const messages = activeConversation ? snapshot.messages.filter((message) => message.conversationId === activeConversation.id) : [];

  useEffect(() => {
    if (!conversationId && conversations[0]) {
      setConversationId(conversations[0].id);
    }
  }, [conversationId, conversations]);

  return (
    <div className="chat-layout">
      <aside className="conversation-list">
        <div className="list-header">
          <h2>本地会话</h2>
          <button type="button" onClick={() => onAction('已创建新会话', () => api.createConversation('新的本地会话'))}>
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
                </div>
                <p>{message.content}</p>
                {message.metadataJson ? <small>metadata: citations / route / local history trace 已保存</small> : null}
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
        </dl>
      </aside>
    </div>
  );
}

function ModelsPage({
  snapshot,
  api,
  onAction,
}: {
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
}) {
  const [providerName, setProviderName] = useState('OpenAI-compatible Provider');
  const [providerType, setProviderType] = useState<ProviderType>('openai-compatible');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [modelName, setModelName] = useState('gpt-compatible-model');
  const [selectedProviderId, setSelectedProviderId] = useState(snapshot.providers[0]?.id ?? '');

  useEffect(() => {
    if (!selectedProviderId && snapshot.providers[0]) {
      setSelectedProviderId(snapshot.providers[0].id);
    }
  }, [selectedProviderId, snapshot.providers]);

  return (
    <div className="page-stack">
      <section className="two-column">
        <div className="panel">
          <h2>Provider Hub</h2>
          <div className="form-grid">
            <label>
              名称
              <input value={providerName} onChange={(event) => setProviderName(event.target.value)} />
            </label>
            <label>
              类型
              <select value={providerType} onChange={(event) => setProviderType(event.target.value as ProviderType)}>
                {providerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Base URL
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
            </label>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                onAction('Provider 已保存，密钥字段默认走 secret_ref', () =>
                  api.createProvider({ name: providerName, type: providerType, baseUrl, apiKey: 'masked-demo-key' }),
                )
              }
            >
              <Plus size={16} /> 添加 Provider
            </button>
          </div>
        </div>
        <div className="panel">
          <h2>Model Hub</h2>
          <div className="form-grid">
            <label>
              Provider
              <select value={selectedProviderId} onChange={(event) => setSelectedProviderId(event.target.value)}>
                {snapshot.providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Model Name
              <input value={modelName} onChange={(event) => setModelName(event.target.value)} />
            </label>
          </div>
          <button
            type="button"
            onClick={() =>
              onAction('模型已添加并可被 Router 选择', () =>
                api.createModel({ providerId: selectedProviderId || snapshot.providers[0]?.id, name: modelName, supportsStreaming: true }),
              )
            }
          >
            添加模型
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>供应商列表</h2>
        <DataTable
          columns={['名称', '类型', 'Base URL', '健康', '操作']}
          rows={snapshot.providers.map((provider) => [
            provider.name,
            provider.type,
            provider.baseUrl,
            provider.healthStatus,
            <button type="button" key={provider.id} onClick={() => onAction('连接测试已记录并脱敏', () => api.testProvider(provider.id))}>
              测试连接
            </button>,
          ])}
        />
      </section>

      <section className="panel">
        <h2>能力矩阵</h2>
        <DataTable
          columns={['模型', 'Provider', 'Context', 'Streaming', 'Tools', 'Vision', 'Embeddings', 'Health']}
          rows={snapshot.models.map((model) => [
            model.displayName,
            snapshot.providers.find((provider) => provider.id === model.providerId)?.name ?? model.providerId,
            model.contextWindow,
            model.supportsStreaming ? 'yes' : 'no',
            model.supportsTools ? 'yes' : 'no',
            model.supportsVision ? 'yes' : 'no',
            model.supportsEmbeddings ? 'yes' : 'no',
            model.healthStatus,
          ])}
        />
      </section>
    </div>
  );
}

function KnowledgePage({
  snapshot,
  api,
  onAction,
}: {
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
}) {
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>文件与索引状态</h2>
            <p>首版实现 TXT / MD / 文本类 lexical fallback；PDF/Office/OCR/embedding 实调标为 planned。</p>
          </div>
          <button type="button" onClick={() => onAction('文本文件已加入知识库索引', () => api.createKnowledgeFile('notes.md', 'text/markdown', 4096))}>
            <FilePlus2 size={16} /> 添加文本文件
          </button>
        </div>
        <DataTable
          columns={['文件', '类型', '大小', '解析状态', 'Chunks', '错误']}
          rows={snapshot.knowledgeFiles.map((file) => [file.name, file.type, file.size, file.parseStatus, file.chunkCount, file.errorMessage ?? '-'])}
        />
      </section>
      <section className="two-column">
        <div className="panel">
          <h2>检索测试</h2>
          <p>Chat 会在 assistant message metadata 中保存 citation 线索，避免假装完整向量 RAG 已完成。</p>
          <button type="button">运行 lexical 检索测试</button>
        </div>
        <div className="panel planned-panel">
          <h2>Planned / Reserved</h2>
          <p>PDF、Word、Excel、PPT、OCR、embedding/rerank、自动摘要记忆、上下文压缩将在核心闭环稳定后实现。</p>
        </div>
      </section>
    </div>
  );
}

function ToolsPage({
  snapshot,
  api,
  onAction,
}: {
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
}) {
  return (
    <div className="page-stack">
      <section className="two-column">
        <div className="panel">
          <h2>MCP Server Registry</h2>
          <p>Discovery 与 grant 分离；注册不等于授权，Chat 不能调用未授权工具。</p>
          <button type="button" onClick={() => onAction('MCP Server 已注册，默认未授权', () => api.createMcpServer('HTTP MCP 示例', 'http', 'http://127.0.0.1:9000/mcp'))}>
            注册 MCP Server
          </button>
          <DataTable
            columns={['名称', 'Transport', '状态', '权限']}
            rows={snapshot.mcpServers.map((server) => [server.name, server.transport, server.lastStatus, server.permissionState])}
          />
        </div>
        <div className="panel">
          <h2>Agent Studio</h2>
          <p>首版真实保存 Agent 定义，但运行中心是 dry-run plan，不启动自治后台任务。</p>
          <button type="button" onClick={() => onAction('Agent 定义已保存，stage=planned', () => api.createAgent('文档检查 Agent', '检查构建计划和实现闭环差异'))}>
            创建 Agent 定义
          </button>
          <DataTable
            columns={['名称', '目标', '审批', '阶段']}
            rows={snapshot.agents.map((agent) => [agent.name, agent.goal, agent.approvalPolicy, agent.stage])}
          />
        </div>
      </section>
      <section className="panel planned-panel">
        <h2>工作流与代码沙箱</h2>
        <p>Workflow canvas、真实 trace replay、人类审批驱动的危险操作、任意代码执行均为 reserved；本页不提供不可用执行按钮。</p>
      </section>
    </div>
  );
}

function GatewayPage({
  snapshot,
  api,
  onAction,
}: {
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
}) {
  const status = snapshot.dashboard.gatewayStatus;
  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>本地 OpenAI-compatible 网关</h2>
            <p>默认关闭；启用后只监听 127.0.0.1:8787，并复用 Chat 的 Router/Gateway。</p>
          </div>
          <button type="button" className="primary-button" onClick={() => onAction(status.running ? '本地网关已停止' : '本地网关已启动', () => api.toggleGateway(!status.running))}>
            <Play size={16} /> {status.running ? '停止网关' : '启用网关'}
          </button>
        </div>
        <div className="endpoint-list">
          {status.endpoints.map((endpoint) => (
            <code key={endpoint}>{endpoint}</code>
          ))}
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <h2>API Key</h2>
          <button type="button" onClick={() => onAction('API Key 已生成，完整值只返回一次', () => api.createGatewayKey('Local app integration'))}>
            <KeyRound size={16} /> 生成 Key
          </button>
          <DataTable
            columns={['名称', '预览', 'Scopes', '使用量', '最后使用']}
            rows={snapshot.gatewayKeys.map((key) => [key.name, key.keyPreview, key.scopes.join(', '), key.quotaUsed, key.lastUsedAt ?? '-'])}
          />
        </div>
        <div className="panel">
          <h2>外部接入生成器</h2>
          <pre className="snippet">{`base_url: http://127.0.0.1:8787/v1
api_key: <generated once>
model: ${snapshot.models[0]?.name ?? 'nexachat-default'}`}</pre>
          <button type="button">
            <Copy size={16} /> 复制 curl / Python / Node 模板
          </button>
        </div>
      </section>
    </div>
  );
}

function DataPage({
  snapshot,
  api,
  onAction,
}: {
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
}) {
  return (
    <div className="page-stack">
      <section className="panel">
        <h2>智能导入向导</h2>
        <div className="wizard-steps">
          {['detect', 'preview', 'map fields', 'conflict review', 'secret handling', 'confirm', 'result'].map((step, index) => (
            <span key={step}>{index + 1}. {step}</span>
          ))}
        </div>
        <p>CCS、sub2api、OpenAI-compatible、Ollama、LM Studio 会先生成 review plan；不会静默覆盖或明文落库 secrets。</p>
      </section>
      <section className="two-column">
        <div className="panel">
          <h2>快照与导出</h2>
          <div className="button-row">
            <button type="button" onClick={() => onAction('脱敏快照已创建', () => api.createSnapshot())}>
              创建配置快照
            </button>
            <button type="button" onClick={() => onAction('诊断包预览已生成', () => api.exportDiagnostics())}>
              导出诊断包
            </button>
          </div>
        </div>
        <div className="panel">
          <h2>记录</h2>
          <DataTable
            columns={['动作', '状态', '摘要', '脱敏', '时间']}
            rows={snapshot.importExportResults.map((item) => [item.action, item.status, item.summary, item.redacted ? 'yes' : 'no', new Date(item.createdAt).toLocaleString()])}
          />
        </div>
      </section>
    </div>
  );
}

function SettingsPage({
  snapshot,
  api,
  onAction,
}: {
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
}) {
  const [prefs, setPrefs] = useState<UiPreferences>(snapshot.uiPreferences);
  useEffect(() => setPrefs(snapshot.uiPreferences), [snapshot.uiPreferences]);

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>请求日志</h2>
        <DataTable
          columns={['状态', 'Endpoint', '模型', 'Tokens', 'Latency', '错误']}
          rows={snapshot.requestLogs.map((log) => [
            log.status,
            log.endpoint,
            log.modelNameSnapshot ?? '-',
            `${log.inputTokens ?? 0}/${log.outputTokens ?? 0}`,
            log.latencyMs ?? '-',
            log.errorMessage ?? '-',
          ])}
        />
      </section>
      <section className="panel">
        <h2>错误诊断</h2>
        <ErrorDiagnosisPanel />
      </section>
      <section className="two-column">
        <div className="panel">
          <h2>密钥安全</h2>
          <p>Renderer 只能看到 secret_ref 和预览；API Key、Authorization、自定义敏感 Header 在日志和导出中默认脱敏。</p>
          <DataTable
            columns={['Gateway Key', '预览', 'Scopes', 'Revoked']}
            rows={snapshot.gatewayKeys.map((key) => [key.name, key.keyPreview, key.scopes.join(', '), key.revokedAt ? 'yes' : 'no'])}
          />
        </div>
        <div className="panel">
          <h2>界面设置</h2>
          <div className="form-grid">
            <label>
              Theme
              <select value={prefs.theme} onChange={(event) => setPrefs({ ...prefs, theme: event.target.value as UiPreferences['theme'] })}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Density
              <select value={prefs.density} onChange={(event) => setPrefs({ ...prefs, density: event.target.value as UiPreferences['density'] })}>
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>
            <label>
              Font
              <select value={prefs.fontMode} onChange={(event) => setPrefs({ ...prefs, fontMode: event.target.value as UiPreferences['fontMode'] })}>
                <option value="system">System</option>
                <option value="kaiti">KaiTi for message preview</option>
              </select>
            </label>
          </div>
          <button type="button" className="primary-button" onClick={() => onAction('界面偏好已持久化', () => api.saveUiPreferences(prefs))}>
            保存界面设置
          </button>
        </div>
      </section>
      <section className="panel">
        <h2>审计</h2>
        <DataTable
          columns={['动作', '目标', '详情', '时间']}
          rows={snapshot.auditLogs.map((log) => [log.action, `${log.targetType}:${log.targetId ?? '-'}`, log.detailsJson ?? '-', new Date(log.createdAt).toLocaleString()])}
        />
      </section>
    </div>
  );
}

function RightRail({ snapshot, busy, notice }: { snapshot: AppSnapshot; busy: boolean; notice: string | null }) {
  return (
    <div className="rail-stack">
      <section>
        <h2>运行状态</h2>
        <p>{busy ? '操作执行中...' : '空闲'}</p>
        {notice ? <p className="notice">{notice}</p> : null}
      </section>
      <section>
        <h2>当前边界</h2>
        <ul>
          <li>Chat / Provider / Router / Gateway 已接入本地数据。</li>
          <li>Knowledge 首版是文本 lexical fallback。</li>
          <li>MCP 和 Agent 保存配置，执行能力标 planned/dry-run。</li>
        </ul>
      </section>
      <section>
        <h2>健康概览</h2>
        <dl>
          <div>
            <dt>Providers</dt>
            <dd>{snapshot.providers.length}</dd>
          </div>
          <div>
            <dt>Models</dt>
            <dd>{snapshot.models.length}</dd>
          </div>
          <div>
            <dt>Logs</dt>
            <dd>{snapshot.requestLogs.length}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return (
    <article className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ListRows({
  rows,
  empty,
}: {
  rows: Array<{ title: string; meta: string }>;
  empty: ReactNode;
}) {
  if (rows.length === 0) {
    return <>{empty}</>;
  }
  return (
    <div className="rows">
      {rows.map((row) => (
        <div className="basic-row" key={`${row.title}-${row.meta}`}>
          <strong>{row.title}</strong>
          <span>{row.meta}</span>
        </div>
      ))}
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<ReactNode>> }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="暂无数据"
        reason="此模块还没有本地记录。"
        actionLabel="使用上方操作创建"
      />
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
