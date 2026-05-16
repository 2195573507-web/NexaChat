import { ArrowRight, KeyRound, MessageSquareText, PlugZap, ServerCog } from 'lucide-react';
import type { ReactNode } from 'react';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, DataRows, EmptyBlock, StatusPillLite, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { formatDate, getDefaultModel, getDefaultProvider, healthState, statusLabel, type TabPageProps } from './shared';
import { TabPanel } from './shared';

function QuickAction({
  title,
  detail,
  icon,
  onClick,
}: {
  title: string;
  detail: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="switch-tile" onClick={onClick}>
      <span className="switch-tile-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ArrowRight size={15} />
    </button>
  );
}

export function DashboardPage({ activeTab, snapshot, onOpenModule }: TabPageProps) {
  const { t } = useI18n();
  const defaultModel = getDefaultModel(snapshot);
  const defaultProvider = getDefaultProvider(snapshot);
  const readyProviders = snapshot.providers.filter((provider) => provider.enabled && provider.secretRef);
  const recentChanges = [
    ...snapshot.providerHealthRecords.map((record) => ({
      title: statusLabel(record.status, t),
      meta: formatDate(record.createdAt, t),
      state: healthState(record.status),
    })),
    ...snapshot.auditLogs.map((log) => ({
      title: log.action,
      meta: formatDate(log.createdAt, t),
      state: log.integrityState === 'verified' ? 'ready' as const : 'warning' as const,
    })),
  ].slice(0, 6);

  if (activeTab.id === 'activity') {
    return (
      <TabPanel moduleId="workspace" tab={activeTab} className="tool-layout">
        <ConfigList title={activeTab.label} description={activeTab.description}>
          <ActivityList
            empty={t('app.recent.empty')}
            items={snapshot.auditLogs.slice(0, 12).map((log) => ({
              title: log.action,
              meta: `${log.actor} / ${formatDate(log.createdAt, t)}`,
              state: log.integrityState === 'verified' ? 'ready' : 'warning',
            }))}
          />
        </ConfigList>
        <ConfigDetail title={t('dashboard.activity.title')} description={activeTab.featureBoundary}>
          <DataRows
            rows={[
              { label: t('app.rail.logs'), value: snapshot.requestLogs.length },
              { label: t('settings.audit.integrity'), value: statusLabel(snapshot.auditIntegrity.status, t) },
              { label: t('app.rail.currentTab'), value: activeTab.label },
            ]}
          />
        </ConfigDetail>
      </TabPanel>
    );
  }

  if (activeTab.id === 'health') {
    return (
      <TabPanel moduleId="workspace" tab={activeTab} className="tool-layout">
        <ConfigList title={activeTab.label} description={activeTab.description}>
          <div className="status-stack">
            <StatusPillLite label={defaultModel?.displayName ?? t('app.rail.unconfigured')} state={defaultModel ? healthState(defaultModel.healthStatus) : 'warning'} />
            <StatusPillLite label={snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')} state={snapshot.dashboard.gatewayStatus.running ? 'ready' : 'muted'} />
            <StatusPillLite label={readyProviders.length > 0 ? t('common.countAvailable', { count: readyProviders.length }) : t('common.notConfigured')} state={readyProviders.length > 0 ? 'ready' : 'warning'} />
          </div>
          <ActivityList
            empty={t('shared.empty.reason')}
            items={snapshot.providerHealthRecords.slice(0, 8).map((record) => ({
              title: statusLabel(record.status, t),
              meta: record.errorMessage ?? `${record.latencyMs ?? 0}ms`,
              state: healthState(record.status),
            }))}
          />
        </ConfigList>
        <ConfigDetail title={t('nav.workspace.health.label')} description={t('settings.about.dataLocationValue')}>
          <DataRows
            rows={[
              { label: t('settings.about.bindHost'), value: `${snapshot.dashboard.gatewayStatus.bindHost}:${snapshot.dashboard.gatewayStatus.port}` },
              { label: t('models.providerList'), value: snapshot.providers.length },
              { label: t('app.rail.models'), value: snapshot.models.length },
            ]}
          />
        </ConfigDetail>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="workspace" tab={activeTab} className="tool-layout workbench-home">
      <ConfigList title={t('dashboard.overview.title')} description={activeTab.featureBoundary}>
        <section className="current-config-strip" aria-label={t('dashboard.home.aria')}>
          <div>
            <span className="eyebrow">{t('dashboard.defaultModel')}</span>
            <strong>{defaultModel?.displayName ?? t('app.rail.unconfigured')}</strong>
            <small>{defaultProvider?.name ?? t('common.notConfigured')}</small>
          </div>
          <div>
            <span className="eyebrow">{t('shell.gateway')}</span>
            <strong>{snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')}</strong>
            <small>{`${snapshot.dashboard.gatewayStatus.bindHost}:${snapshot.dashboard.gatewayStatus.port}`}</small>
          </div>
          <div>
            <span className="eyebrow">{t('models.providerList')}</span>
            <strong>{readyProviders.length > 0 ? t('common.countAvailable', { count: readyProviders.length }) : t('common.notConfigured')}</strong>
            <small>{t('common.countTotal', { count: snapshot.providers.length })}</small>
          </div>
        </section>

        <ToolSection title={t('dashboard.actions.title')} description={t('dashboard.actions.note')}>
          <div className="switch-grid">
            <QuickAction title={t('dashboard.action.chat')} detail={t('chat.playground.note')} icon={<MessageSquareText size={18} />} onClick={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })} />
            <QuickAction title={t('dashboard.action.provider')} detail={t('models.provider.note')} icon={<ServerCog size={18} />} onClick={() => onOpenModule({ moduleId: 'models', tabId: 'providers' })} />
            <QuickAction title={t('dashboard.action.gatewayKey')} detail={t('gateway.keys.note')} icon={<KeyRound size={18} />} onClick={() => onOpenModule({ moduleId: 'gateway', tabId: 'keys' })} />
            <QuickAction title={t('tools.mcp.title')} detail={t('tools.mcp.note')} icon={<PlugZap size={18} />} onClick={() => onOpenModule({ moduleId: 'tools', tabId: 'mcp' })} />
          </div>
        </ToolSection>

        <ToolSection title={t('chat.localConversations')} description={t('dashboard.recentConversations')}>
          {snapshot.dashboard.recentConversations.length > 0 ? (
            <ActivityList
              empty={t('shared.empty.reason')}
              items={snapshot.dashboard.recentConversations.slice(0, 5).map((conversation) => ({
                title: conversation.title,
                meta: t('common.messageCount', { count: conversation.messageCount }),
                state: conversation.status === 'active' ? 'ready' : 'muted',
              }))}
            />
          ) : (
            <EmptyBlock title={t('chat.empty.title')} detail={t('chat.empty.reason')} action={<CommandButton variant="primary" onClick={() => onOpenModule({ moduleId: 'chat', tabId: 'playground' })}>{t('shell.openChat')}</CommandButton>} />
          )}
        </ToolSection>
      </ConfigList>

      <ConfigDetail title={t('dashboard.activity.title')} description={t('dashboard.activity.note')}>
        <ActivityList empty={t('app.recent.empty')} items={recentChanges} />
        <DataRows
          rows={[
            { label: t('observability.summary.requests'), value: snapshot.dashboard.usageToday.requests },
            { label: t('observability.summary.tokens'), value: snapshot.dashboard.usageToday.inputTokens + snapshot.dashboard.usageToday.outputTokens },
            { label: t('data.migration.summary.round12'), value: snapshot.migrationRuns[0]?.status ?? t('common.none') },
          ]}
        />
      </ConfigDetail>
    </TabPanel>
  );
}
