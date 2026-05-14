import { CheckCircle2, Database, KeyRound, MessageSquareText, ServerCog } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import type { TabPageProps } from './shared';
import { DataTable, ListRows, Metric, StateBadge, TabPanel, getDefaultModel, healthTone } from './shared';

export function DashboardPage({ activeTab, snapshot, onOpenModule }: TabPageProps) {
  const { dashboard } = snapshot;
  const defaultModel = getDefaultModel(snapshot);
  const defaultProvider = snapshot.providers.find((provider) => provider.id === dashboard.workspace.defaultProviderId) ?? snapshot.providers[0];
  const latestRequest = snapshot.requestLogs[0];
  const latestAudit = snapshot.auditLogs[0];

  if (activeTab.id === 'activity') {
    return (
      <TabPanel moduleId="workspace" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>最近会话</h2>
            <ListRows
              rows={dashboard.recentConversations.map((conversation) => ({
                title: conversation.title,
                meta: `${conversation.messageCount} 条消息 · ${conversation.isPinned ? '已置顶' : '普通'}`,
              }))}
              empty={<EmptyState title="没有会话" reason="本地历史还是空的。" actionLabel="新建会话" onAction={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })} />}
            />
          </div>
          <div className="panel">
            <h2>最近请求与审计</h2>
            <ListRows
              rows={[
                ...snapshot.requestLogs.slice(0, 4).map((request) => ({
                  title: `${request.status} · ${request.endpoint}`,
                  meta: request.errorMessage ?? request.modelNameSnapshot ?? '请求日志已记录',
                })),
                ...snapshot.auditLogs.slice(0, 4).map((audit) => ({
                  title: audit.action,
                  meta: `${audit.targetType}:${audit.targetId ?? '-'}`,
                })),
                ...snapshot.gatewayLogs.slice(0, 4).map((log) => ({
                  title: `${log.method} ${log.path}`,
                  meta: `${log.statusCode} · ${new Date(log.createdAt).toLocaleString()}`,
                })),
              ]}
              empty={<EmptyState title="暂无活动" reason="发送消息、测试 Provider 或生成 Gateway Key 后会显示最近事件。" actionLabel="去发送消息" onAction={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })} />}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'health') {
    return (
      <TabPanel moduleId="workspace" tab={activeTab}>
        <section className="overview-grid">
          <Metric title="Provider" value={snapshot.providers.length} detail={`${snapshot.providers.filter((provider) => provider.enabled).length} 个启用`} />
          <Metric title="Model" value={snapshot.models.length} detail={`${snapshot.models.filter((model) => model.healthStatus === 'healthy').length} 个健康`} />
          <Metric title="知识文件" value={snapshot.knowledgeFiles.length} detail={`${snapshot.knowledgeFiles.reduce((sum, file) => sum + file.chunkCount, 0)} chunks`} />
          <Metric title="网关日志" value={snapshot.gatewayLogs.length} detail={`${dashboard.gatewayStatus.bindHost}:${dashboard.gatewayStatus.port}`} />
        </section>
        <section className="two-column">
          <div className="panel">
            <h2>模型与 Provider 状态</h2>
            <DataTable
              columns={['Provider', '类型', '健康', '默认']}
              rows={snapshot.providers.map((provider) => [
                provider.name,
                provider.type,
                <StateBadge key={`${provider.id}-health`} label={provider.healthStatus} tone={healthTone(provider.healthStatus)} />,
                provider.id === dashboard.workspace.defaultProviderId ? 'yes' : 'no',
              ])}
            />
          </div>
          <div className="panel">
            <h2>本地数据状态</h2>
            <dl className="detail-list">
              <div><dt>会话</dt><dd>{snapshot.conversations.length}</dd></div>
              <div><dt>消息</dt><dd>{snapshot.messages.length}</dd></div>
              <div><dt>请求日志</dt><dd>{snapshot.requestLogs.length}</dd></div>
              <div><dt>审计日志</dt><dd>{snapshot.auditLogs.length}</dd></div>
              <div><dt>网关运行</dt><dd>{dashboard.gatewayStatus.running ? '运行中' : '未启用'}</dd></div>
            </dl>
          </div>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="workspace" tab={activeTab}>
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
            <p>工作台只汇总状态并提供真实入口，具体配置在各自模块完成。</p>
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
          <span>Provider：{defaultProvider?.name ?? '未配置'}</span>
          <span>模型：{defaultModel?.displayName ?? '未配置'}</span>
          <span>最近请求：{latestRequest ? `${latestRequest.status} / ${latestRequest.endpoint}` : '暂无'}</span>
          <span>最近审计：{latestAudit ? latestAudit.action : '暂无'}</span>
        </div>
      </section>

      <section className="panel">
        <h2>真实快速入口</h2>
        <div className="action-grid">
          <button type="button" onClick={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })}>
            <MessageSquareText size={16} /> 打开聊天运行
          </button>
          <button type="button" onClick={() => onOpenModule({ moduleId: 'models', tabId: 'providers' })}>
            <ServerCog size={16} /> 管理 Provider
          </button>
          <button type="button" onClick={() => onOpenModule({ moduleId: 'gateway', tabId: 'keys' })}>
            <KeyRound size={16} /> 管理 Gateway Key
          </button>
          <button type="button" onClick={() => onOpenModule({ moduleId: 'data', tabId: 'import' })}>
            <Database size={16} /> 导入预检
          </button>
        </div>
      </section>
    </TabPanel>
  );
}
