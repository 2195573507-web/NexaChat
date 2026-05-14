import {
  Activity,
  Clock3,
  Database,
  FileInput,
  KeyRound,
  MessageSquareText,
  ScrollText,
  ServerCog,
  Settings2,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import type { TabPageProps } from './shared';
import { DataTable, ListRows, Metric, StateBadge, TabPanel, getDefaultModel, healthTone } from './shared';

function formatTime(value: number | null | undefined) {
  return value ? new Date(value).toLocaleString() : '暂无记录';
}

function countHealthy(snapshot: TabPageProps['snapshot']) {
  const healthyProviders = snapshot.providers.filter((provider) => provider.healthStatus === 'healthy').length;
  const healthyModels = snapshot.models.filter((model) => model.healthStatus === 'healthy').length;
  return `${healthyProviders}/${snapshot.providers.length} Provider · ${healthyModels}/${snapshot.models.length} Model`;
}

export function DashboardPage({ activeTab, snapshot, onOpenModule }: TabPageProps) {
  const { dashboard } = snapshot;
  const defaultModel = getDefaultModel(snapshot);
  const defaultProvider = snapshot.providers.find((provider) => provider.id === dashboard.workspace.defaultProviderId) ?? snapshot.providers[0];
  const latestRequest = snapshot.requestLogs[0];
  const latestAudit = snapshot.auditLogs[0];
  const latestImport = snapshot.importExportResults[0];
  const tokenTotal = dashboard.usageToday.inputTokens + dashboard.usageToday.outputTokens;

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
              empty={
                <EmptyState
                  title="没有会话"
                  reason="本地历史还是空的。"
                  actionLabel="新建会话"
                  onAction={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })}
                />
              }
            />
          </div>
          <div className="panel">
            <h2>请求与审计</h2>
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
                  meta: `${log.statusCode} · ${formatTime(log.createdAt)}`,
                })),
              ]}
              empty={
                <EmptyState
                  title="暂无活动"
                  reason="发送消息、测试 Provider 或生成 Gateway Key 后会显示最近事件。"
                  actionLabel="去发送消息"
                  onAction={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })}
                />
              }
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
                provider.id === dashboard.workspace.defaultProviderId ? '是' : '否',
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

  const actionEntries = [
    { label: '打开聊天', icon: MessageSquareText, target: { moduleId: 'chat' as const, tabId: 'playground' } },
    { label: '管理 Provider', icon: ServerCog, target: { moduleId: 'models' as const, tabId: 'providers' } },
    { label: '管理 Model', icon: Settings2, target: { moduleId: 'models' as const, tabId: 'catalog' } },
    { label: '管理 Gateway Key', icon: KeyRound, target: { moduleId: 'gateway' as const, tabId: 'keys' } },
    { label: '导入配置', icon: FileInput, target: { moduleId: 'data' as const, tabId: 'import' } },
    { label: '查看日志', icon: ScrollText, target: { moduleId: 'gateway' as const, tabId: 'logs' } },
  ];

  return (
    <TabPanel moduleId="workspace" tab={activeTab} className="workbench-page">
      <section className="workbench-overview" aria-label="工作台首页">
        <section className="workbench-section workbench-summary" aria-labelledby="workbench-summary-title">
          <div className="section-header">
            <div>
              <h2 id="workbench-summary-title">当前概览</h2>
              <p>工作台只汇总状态和入口，具体配置留在对应模块完成。</p>
            </div>
            <StateBadge label={dashboard.gatewayStatus.running ? '网关运行中' : '网关未启用'} tone={dashboard.gatewayStatus.running ? 'success' : 'warning'} />
          </div>
          <div className="summary-grid">
            <article>
              <span>当前工作区</span>
              <strong>{dashboard.workspace.name}</strong>
              <p>本地会话和配置的默认上下文。</p>
            </article>
            <article>
              <span>默认模型</span>
              <strong>{defaultModel?.displayName ?? '未配置'}</strong>
              <p>{defaultProvider?.name ?? '先添加 Provider 与 Model'}</p>
            </article>
            <article>
              <span>本地网关</span>
              <strong>{dashboard.gatewayStatus.running ? '运行中' : '未启用'}</strong>
              <p>
                {dashboard.gatewayStatus.bindHost}:{dashboard.gatewayStatus.port}
              </p>
            </article>
          </div>
        </section>

        <section className="workbench-section" aria-labelledby="workbench-metrics-title">
          <div className="section-header">
            <div>
              <h2 id="workbench-metrics-title">核心指标</h2>
              <p>来自本地 store、请求日志、用量记录和审计日志。</p>
            </div>
          </div>
          <div className="overview-grid">
            <Metric title="本地会话" value={snapshot.conversations.length} detail={`${snapshot.messages.length} 条消息`} />
            <Metric title="今日请求" value={dashboard.usageToday.requests} detail={latestRequest ? latestRequest.status : '暂无请求'} />
            <Metric title="Token 用量" value={tokenTotal} detail={`${dashboard.usageToday.inputTokens} in / ${dashboard.usageToday.outputTokens} out`} />
            <Metric title="审计与健康" value={latestAudit?.action ?? '暂无审计'} detail={countHealthy(snapshot)} />
          </div>
        </section>

        <section className="workbench-section" aria-labelledby="workbench-actions-title">
          <div className="section-header">
            <div>
              <h2 id="workbench-actions-title">操作入口</h2>
              <p>这些入口都跳转到现有真实功能页，不在工作台重复配置表单。</p>
            </div>
          </div>
          <div className="action-grid workbench-action-grid">
            {actionEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <button type="button" key={entry.label} onClick={() => onOpenModule(entry.target)}>
                  <Icon size={16} /> {entry.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="workbench-section" aria-labelledby="workbench-activity-title">
          <div className="section-header">
            <div>
              <h2 id="workbench-activity-title">最近活动</h2>
              <p>聚合最近请求、导入、审计和会话，便于快速回到上下文。</p>
            </div>
            <button type="button" onClick={() => onOpenModule({ moduleId: 'workspace', tabId: 'activity' })}>
              <Clock3 size={16} /> 查看全部
            </button>
          </div>
          <div className="recent-activity-grid">
            <article>
              <span>最近请求</span>
              <strong>{latestRequest ? `${latestRequest.status} · ${latestRequest.endpoint}` : '暂无请求'}</strong>
              <p>{latestRequest?.modelNameSnapshot ?? latestRequest?.errorMessage ?? '发送消息后会显示请求记录。'}</p>
            </article>
            <article>
              <span>最近导入</span>
              <strong>{latestImport?.summary ?? '暂无导入记录'}</strong>
              <p>{latestImport ? `${latestImport.status} · ${formatTime(latestImport.createdAt)}` : '导入预检后会显示结果。'}</p>
            </article>
            <article>
              <span>最近审计</span>
              <strong>{latestAudit?.action ?? '暂无审计记录'}</strong>
              <p>{latestAudit ? `${latestAudit.targetType} · ${formatTime(latestAudit.createdAt)}` : '关键操作会写入审计日志。'}</p>
            </article>
            <article>
              <span>最近会话</span>
              <strong>{dashboard.recentConversations[0]?.title ?? '暂无会话'}</strong>
              <p>
                {dashboard.recentConversations[0]
                  ? `${dashboard.recentConversations[0].messageCount} 条消息 · ${formatTime(dashboard.recentConversations[0].lastMessageAt)}`
                  : '打开聊天后会创建本地会话。'}
              </p>
            </article>
          </div>
        </section>
      </section>
    </TabPanel>
  );
}
