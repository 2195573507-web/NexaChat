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
import { ActionCard, MetricTile, PageSection, Toolbar } from '../components/ui';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, ListRows, Metric, StateBadge, TabPanel, getDefaultModel, healthTone } from './shared';

function formatTime(value: number | null | undefined, fallback: string) {
  return value ? new Date(value).toLocaleString() : fallback;
}

function countHealthy(snapshot: TabPageProps['snapshot'], t: ReturnType<typeof useI18n>['t']) {
  const healthyProviders = snapshot.providers.filter((provider) => provider.healthStatus === 'healthy').length;
  const healthyModels = snapshot.models.filter((model) => model.healthStatus === 'healthy').length;
  return t('dashboard.healthSummary', { providers: healthyProviders, providerTotal: snapshot.providers.length, models: healthyModels, modelTotal: snapshot.models.length });
}

export function DashboardPage({ activeTab, snapshot, onOpenModule }: TabPageProps) {
  const { t } = useI18n();
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
            <h2>{t('dashboard.recentConversations')}</h2>
            <ListRows
              rows={dashboard.recentConversations.map((conversation) => ({
                title: conversation.title,
                meta: t('common.valueSeparator', { left: t('common.messageCount', { count: conversation.messageCount }), right: conversation.isPinned ? t('common.pinned') : t('common.normal') }),
              }))}
              empty={
                <EmptyState
                  title={t('dashboard.noConversation.title')}
                  reason={t('dashboard.noConversation.reason')}
                  actionLabel={t('chat.newConversation')}
                  onAction={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })}
                />
              }
            />
          </div>
          <div className="panel">
            <h2>{t('dashboard.requestAudit')}</h2>
            <ListRows
              rows={[
                ...snapshot.requestLogs.slice(0, 4).map((request) => ({
                  title: t('common.valueSeparator', { left: request.status, right: request.endpoint }),
                  meta: request.errorMessage ?? request.modelNameSnapshot ?? t('dashboard.requestLogged'),
                })),
                ...snapshot.auditLogs.slice(0, 4).map((audit) => ({
                  title: audit.action,
                  meta: `${audit.targetType}:${audit.targetId ?? '-'}`,
                })),
                ...snapshot.gatewayLogs.slice(0, 4).map((log) => ({
                  title: `${log.method} ${log.path}`,
                  meta: t('common.valueSeparator', { left: log.statusCode, right: formatTime(log.createdAt, t('dashboard.noRecord')) }),
                })),
              ]}
              empty={
                <EmptyState
                  title={t('dashboard.noActivity.title')}
                  reason={t('dashboard.noActivity.reason')}
                  actionLabel={t('dashboard.sendMessage')}
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
          <Metric title={t('dashboard.metric.provider')} value={snapshot.providers.length} detail={t('dashboard.metric.enabled', { count: snapshot.providers.filter((provider) => provider.enabled).length })} />
          <Metric title={t('dashboard.metric.model')} value={snapshot.models.length} detail={t('dashboard.metric.healthy', { count: snapshot.models.filter((model) => model.healthStatus === 'healthy').length })} />
          <Metric title={t('dashboard.metric.knowledgeFiles')} value={snapshot.knowledgeFiles.length} detail={t('dashboard.metric.chunks', { count: snapshot.knowledgeFiles.reduce((sum, file) => sum + file.chunkCount, 0) })} />
          <Metric title={t('dashboard.metric.gatewayLogs')} value={snapshot.gatewayLogs.length} detail={`${dashboard.gatewayStatus.bindHost}:${dashboard.gatewayStatus.port}`} />
        </section>
        <section className="two-column">
          <div className="panel">
            <h2>{t('dashboard.modelProviderStatus')}</h2>
            <DataTable
              columns={[t('dashboard.columns.provider'), t('dashboard.columns.type'), t('dashboard.columns.health'), t('dashboard.columns.default')]}
              rows={snapshot.providers.map((provider) => [
                provider.name,
                provider.type,
                <StateBadge key={`${provider.id}-health`} label={provider.healthStatus} tone={healthTone(provider.healthStatus)} />,
                provider.id === dashboard.workspace.defaultProviderId ? t('common.yes') : t('common.no'),
              ])}
            />
          </div>
          <div className="panel">
            <h2>{t('dashboard.localDataStatus')}</h2>
            <dl className="detail-list">
              <div><dt>{t('dashboard.local.conversations')}</dt><dd>{snapshot.conversations.length}</dd></div>
              <div><dt>{t('dashboard.local.messages')}</dt><dd>{snapshot.messages.length}</dd></div>
              <div><dt>{t('dashboard.local.requestLogs')}</dt><dd>{snapshot.requestLogs.length}</dd></div>
              <div><dt>{t('dashboard.local.auditLogs')}</dt><dd>{snapshot.auditLogs.length}</dd></div>
              <div><dt>{t('dashboard.local.gatewayRunning')}</dt><dd>{dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')}</dd></div>
            </dl>
          </div>
        </section>
      </TabPanel>
    );
  }

  const actionEntries = [
    { label: t('dashboard.action.chat'), icon: MessageSquareText, target: { moduleId: 'chat' as const, tabId: 'playground' } },
    { label: t('dashboard.action.provider'), icon: ServerCog, target: { moduleId: 'models' as const, tabId: 'providers' } },
    { label: t('dashboard.action.model'), icon: Settings2, target: { moduleId: 'models' as const, tabId: 'catalog' } },
    { label: t('dashboard.action.gatewayKey'), icon: KeyRound, target: { moduleId: 'gateway' as const, tabId: 'keys' } },
    { label: t('dashboard.action.import'), icon: FileInput, target: { moduleId: 'data' as const, tabId: 'import' } },
    { label: t('dashboard.action.logs'), icon: ScrollText, target: { moduleId: 'gateway' as const, tabId: 'logs' } },
  ];

  return (
    <TabPanel moduleId="workspace" tab={activeTab} className="workbench-page">
      <section className="workbench-overview" aria-label={t('dashboard.home.aria')}>
        <section className="workbench-hero" aria-labelledby="workbench-summary-title">
          <div className="workbench-hero-main">
            <div className="section-header">
              <div>
                <span className="page-eyebrow">{dashboard.workspace.name}</span>
                <h2 id="workbench-summary-title">{t('dashboard.overview.title')}</h2>
                <p>{t('dashboard.overview.note')}</p>
              </div>
              <StateBadge label={dashboard.gatewayStatus.running ? t('dashboard.gateway.running') : t('dashboard.gateway.stopped')} tone={dashboard.gatewayStatus.running ? 'success' : 'warning'} />
            </div>
            <div className="readiness-list">
              <div>
                <span>{t('dashboard.defaultModel')}</span>
                <strong>{defaultModel?.displayName ?? t('common.notConfigured')}</strong>
                <p>{defaultProvider?.name ?? t('dashboard.defaultModel.missing')}</p>
              </div>
              <div>
                <span>{t('dashboard.localGateway')}</span>
                <strong>{dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')}</strong>
                <p>
                  {dashboard.gatewayStatus.bindHost}:{dashboard.gatewayStatus.port}
                </p>
              </div>
              <div>
                <span>{t('dashboard.metric.auditHealth')}</span>
                <strong>{countHealthy(snapshot, t)}</strong>
                <p>{latestAudit?.action ?? t('dashboard.activity.noAudit')}</p>
              </div>
            </div>
          </div>
          <div className="next-step-panel">
            <div>
              <span className="page-eyebrow">{t('dashboard.actions.title')}</span>
              <h3>{defaultModel ? t('dashboard.action.chat') : t('dashboard.action.provider')}</h3>
              <p>{defaultModel ? t('dashboard.actions.note') : t('dashboard.defaultModel.missing')}</p>
            </div>
            <Toolbar align="start">
              <button type="button" className="primary-button" onClick={() => onOpenModule({ moduleId: defaultModel ? 'chat' : 'models', tabId: defaultModel ? 'playground' : 'providers' })}>
                {defaultModel ? <MessageSquareText size={16} /> : <ServerCog size={16} />}
                {defaultModel ? t('dashboard.action.chat') : t('dashboard.action.provider')}
              </button>
            </Toolbar>
          </div>
        </section>

        <PageSection title={t('dashboard.metrics.title')} description={t('dashboard.metrics.note')} className="workbench-section">
          <div className="metric-river">
            <MetricTile label={t('dashboard.metric.localConversations')} value={snapshot.conversations.length} detail={t('common.messageCount', { count: snapshot.messages.length })} tone="info" />
            <MetricTile label={t('dashboard.metric.todayRequests')} value={dashboard.usageToday.requests} detail={latestRequest ? latestRequest.status : t('dashboard.noRequest')} tone={latestRequest?.status === 'failed' ? 'danger' : 'neutral'} />
            <MetricTile label={t('dashboard.metric.tokenUsage')} value={tokenTotal} detail={t('observability.summary.tokenBreakdown', { input: dashboard.usageToday.inputTokens, output: dashboard.usageToday.outputTokens })} />
            <MetricTile label={t('dashboard.metric.knowledgeFiles')} value={snapshot.knowledgeFiles.length} detail={t('dashboard.metric.chunks', { count: snapshot.knowledgeFiles.reduce((sum, file) => sum + file.chunkCount, 0) })} tone="success" />
          </div>
        </PageSection>

        <section className="workbench-section" aria-labelledby="workbench-actions-title">
          <div className="section-header">
            <div>
              <h2 id="workbench-actions-title">{t('dashboard.actions.title')}</h2>
              <p>{t('dashboard.actions.note')}</p>
            </div>
          </div>
          <div className="action-grid workbench-action-grid">
            {actionEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <ActionCard
                  key={entry.label}
                  title={entry.label}
                  description={t('dashboard.actions.note')}
                  icon={<Icon size={17} />}
                  onClick={() => onOpenModule(entry.target)}
                />
              );
            })}
          </div>
        </section>

        <section className="workbench-section" aria-labelledby="workbench-activity-title">
          <div className="section-header">
            <div>
              <h2 id="workbench-activity-title">{t('dashboard.activity.title')}</h2>
              <p>{t('dashboard.activity.note')}</p>
            </div>
            <button type="button" onClick={() => onOpenModule({ moduleId: 'workspace', tabId: 'activity' })}>
              <Clock3 size={16} /> {t('dashboard.activity.all')}
            </button>
          </div>
          <div className="recent-activity-grid">
            <article>
              <span>{t('dashboard.activity.request')}</span>
              <strong>{latestRequest ? t('common.valueSeparator', { left: latestRequest.status, right: latestRequest.endpoint }) : t('dashboard.noRequest')}</strong>
              <p>{latestRequest?.modelNameSnapshot ?? latestRequest?.errorMessage ?? t('dashboard.activity.requestHint')}</p>
            </article>
            <article>
              <span>{t('dashboard.activity.import')}</span>
              <strong>{latestImport?.summary ?? t('dashboard.activity.noImport')}</strong>
              <p>{latestImport ? t('common.valueSeparator', { left: latestImport.status, right: formatTime(latestImport.createdAt, t('dashboard.noRecord')) }) : t('dashboard.activity.importHint')}</p>
            </article>
            <article>
              <span>{t('dashboard.activity.audit')}</span>
              <strong>{latestAudit?.action ?? t('dashboard.activity.noAudit')}</strong>
              <p>{latestAudit ? t('common.valueSeparator', { left: latestAudit.targetType, right: formatTime(latestAudit.createdAt, t('dashboard.noRecord')) }) : t('dashboard.activity.auditHint')}</p>
            </article>
            <article>
              <span>{t('dashboard.activity.conversation')}</span>
              <strong>{dashboard.recentConversations[0]?.title ?? t('dashboard.activity.noConversation')}</strong>
              <p>
                {dashboard.recentConversations[0]
                  ? t('common.valueSeparator', { left: t('common.messageCount', { count: dashboard.recentConversations[0].messageCount }), right: formatTime(dashboard.recentConversations[0].lastMessageAt, t('dashboard.noRecord')) })
                  : t('dashboard.activity.conversationHint')}
              </p>
            </article>
          </div>
        </section>
      </section>
    </TabPanel>
  );
}
