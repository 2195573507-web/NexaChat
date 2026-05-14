import { CheckCircle2, Database, FilePlus2, KeyRound, Plus, Settings2, ShieldCheck } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import type { TabPageProps } from './shared';
import { ListRows, Metric, TabPanel, getDefaultModel } from './shared';

export function DashboardPage({ activeTab, snapshot, api, onAction, onOpenModule }: TabPageProps) {
  const { dashboard } = snapshot;
  const defaultModel = getDefaultModel(snapshot);
  const defaultProvider = snapshot.providers.find((provider) => provider.id === dashboard.workspace.defaultProviderId) ?? snapshot.providers[0];
  const latestRequest = snapshot.requestLogs[0];
  const latestAudit = snapshot.auditLogs[0];
  if (activeTab.id === 'workspaces') {
    return (
      <TabPanel moduleId="dashboard" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>待处理任务</h2>
            {dashboard.setupGaps.length === 0 ? (
              <p className="success-text">暂无阻塞任务。核心闭环已具备 Provider、Model、Chat、Gateway Key 与本地历史。</p>
            ) : (
              <ul className="setup-list">
                {dashboard.setupGaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="panel">
            <h2>工作区与构建状态</h2>
            <dl className="detail-list">
              <div><dt>工作区</dt><dd>{dashboard.workspace.name}</dd></div>
              <div><dt>默认 Provider</dt><dd>{defaultProvider?.name ?? '未配置'}</dd></div>
              <div><dt>默认模型</dt><dd>{defaultModel?.displayName ?? '未配置'}</dd></div>
              <div><dt>默认 Router</dt><dd>本地优先默认路由</dd></div>
              <div><dt>构建进度</dt><dd>本轮验证结果会记录在 PROJECT_PROGRESS 和 UI 导航重构文档。</dd></div>
            </dl>
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'activity') {
    return (
      <TabPanel moduleId="dashboard" tab={activeTab}>
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
            <h2>最近请求与审计</h2>
            <ListRows
              rows={[
                ...(snapshot.requestLogs.slice(0, 3).map((request) => ({
                  title: `${request.status} · ${request.endpoint}`,
                  meta: request.errorMessage ?? request.modelNameSnapshot ?? '请求日志已记录',
                }))),
                ...(snapshot.auditLogs.slice(0, 3).map((audit) => ({
                  title: audit.action,
                  meta: `${audit.targetType}:${audit.targetId ?? '-'}`,
                }))),
                ...(snapshot.gatewayLogs.slice(0, 3).map((log) => ({
                  title: `${log.method} ${log.path}`,
                  meta: `${log.statusCode} · ${new Date(log.createdAt).toLocaleString()}`,
                }))),
              ]}
              empty={<EmptyState title="暂无活动" reason="发送消息或修改配置后会显示最近请求、网关与审计事件。" actionLabel="去发送消息" onAction={() => onOpenModule('chat')} />}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'quick-actions') {
    return (
      <TabPanel moduleId="dashboard" tab={activeTab}>
        <section className="panel">
          <h2>一键入口</h2>
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
            <button type="button" onClick={() => onOpenModule({ moduleId: 'settings', tabId: 'diagnostics' })}>
              <ShieldCheck size={16} /> 查看诊断
            </button>
          </div>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="dashboard" tab={activeTab}>
      <section className="overview-grid">
        <Metric title="本地会话" value={snapshot.conversations.length} detail="SQLite 本地历史" />
        <Metric title="默认模型" value={defaultModel?.displayName ?? '未配置'} detail={defaultModel ? '来自工作区默认值' : '先添加 Provider 与 Model'} />
        <Metric title="今日请求" value={dashboard.usageToday.requests} detail={`${dashboard.usageToday.inputTokens + dashboard.usageToday.outputTokens} tokens`} />
        <Metric title="本地网关" value={dashboard.gatewayStatus.running ? '运行中' : '未启用'} detail={`${dashboard.gatewayStatus.bindHost}:${dashboard.gatewayStatus.port}`} />
      </section>

      <section className="panel flow-panel">
        <div className="panel-header">
          <div>
            <h2>启动状态与下一步</h2>
            <p>5 秒内确认工作区、模型、网关和最近活动。</p>
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
        <div className="status-strip">
          <span>工作区：{dashboard.workspace.name}</span>
          <span>模型：{defaultModel?.displayName ?? '未配置'}</span>
          <span>网关：{dashboard.gatewayStatus.running ? '运行中' : '未启用'}</span>
          <span>最近请求：{latestRequest ? `${latestRequest.status} / ${latestRequest.endpoint}` : '暂无'}</span>
          <span>最近审计：{latestAudit ? latestAudit.action : '暂无'}</span>
        </div>
      </section>
    </TabPanel>
  );
}
