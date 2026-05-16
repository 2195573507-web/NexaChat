import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { getDefaultTab, getTabRoute, navModules, resolveNavigation } from '../shared/navigation';
import type { AppApi } from '../shared/api';
import type { AppSnapshot, ModuleId, NavTab } from '../shared/types';
import { AppShell } from './AppShell';
import { getAppApi } from './api';
import { I18nProvider, translateModule, translateTab, useI18n } from './i18n';
import { modulePageRegistry } from './modules/modulePageRegistry';
import type { OpenModuleTarget } from './modules/shared';
import { copyText, getDefaultModel, statusLabel } from './modules/shared';
import './styles.css';

type ActionNotice = {
  type: 'success' | 'error';
  message: string;
  detail?: string;
};

function App() {
  const [api] = useState<AppApi>(() => getAppApi());
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [navigationState, setNavigationState] = useState(() => resolveNavigation(window.location.pathname));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ActionNotice | null>(null);

  const refresh = async () => {
    setSnapshot(await api.getSnapshot());
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const current = resolveNavigation(window.location.pathname);
    if (current.replaced) {
      window.history.replaceState(null, '', current.route);
    }
    setNavigationState(current);

    const handlePopState = () => {
      const next = resolveNavigation(window.location.pathname);
      if (next.replaced) {
        window.history.replaceState(null, '', next.route);
      }
      setNavigationState(next);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (moduleId: ModuleId, tabId?: string) => {
    const module = navModules.find((candidate) => candidate.id === moduleId) ?? navModules[0];
    const defaultTab = getDefaultTab(module);
    const tab = module.tabs.find((candidate) => candidate.id === tabId) ?? defaultTab;
    const route = getTabRoute(module.id, tab.id);
    window.history.pushState(null, '', route);
    setNavigationState({ module, tab, route, replaced: false });
  };

  const openModule = (target: OpenModuleTarget) => {
    if (typeof target === 'string') {
      navigateTo(target);
      return;
    }
    navigateTo(target.moduleId, target.tabId);
  };

  const activeModule = navigationState.module;
  const activeModuleId = activeModule.id;
  const activeTab = navigationState.tab;

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await refresh();
      setNotice({ type: 'success', message: label });
    } catch (error) {
      setNotice({ type: 'error', message: 'app.action.failed', detail: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot) {
    return <LoadingScreen />;
  }

  return (
    <I18nProvider locale={snapshot.uiPreferences.language}>
      <AppContent
        activeModule={activeModule}
        activeModuleId={activeModuleId}
        activeTab={activeTab}
        api={api}
        busy={busy}
        navigateTo={navigateTo}
        notice={notice}
        openModule={openModule}
        refresh={refresh}
        runAction={runAction}
        snapshot={snapshot}
      />
    </I18nProvider>
  );
}

function LoadingScreen() {
  const { t } = useI18n();
  return <div className="boot-screen">{t('app.loading')}</div>;
}

function AppContent({
  activeModule,
  activeModuleId,
  activeTab,
  api,
  busy,
  navigateTo,
  notice,
  openModule,
  runAction,
  snapshot,
}: {
  activeModule: ReturnType<typeof resolveNavigation>['module'];
  activeModuleId: ModuleId;
  activeTab: NavTab;
  api: AppApi;
  busy: boolean;
  navigateTo: (moduleId: ModuleId, tabId?: string) => void;
  notice: ActionNotice | null;
  openModule: (target: OpenModuleTarget) => void;
  refresh: () => Promise<void>;
  runAction: (label: string, action: () => Promise<unknown>) => Promise<void>;
  snapshot: AppSnapshot;
}) {
  const { t } = useI18n();
  const translatedActiveModule = translateModule(activeModule, t);
  const translatedActiveTab = translateTab(activeTab, t);
  const ActivePage = modulePageRegistry[activeModuleId];
  const page = (
    <ActivePage
      activeTab={translatedActiveTab}
      snapshot={snapshot}
      api={api}
      onAction={(label, action) => runAction(label, action)}
      onOpenModule={openModule}
    />
  );

  return (
    <AppShell
      activeModule={translatedActiveModule}
      activeModuleId={activeModuleId}
      activeTab={translatedActiveTab}
      onModuleChange={(moduleId) => navigateTo(moduleId)}
      onTabChange={(tabId, moduleId = activeModuleId) => navigateTo(moduleId, tabId)}
      snapshot={snapshot}
      rightRail={<RightRail activeModuleId={activeModuleId} activeTab={translatedActiveTab} snapshot={snapshot} busy={busy} notice={notice} api={api} onOpenModule={openModule} />}
    >
      {page}
    </AppShell>
  );
}

function RightRail({
  activeModuleId,
  activeTab,
  snapshot,
  busy,
  notice,
  api,
  onOpenModule,
}: {
  activeModuleId: ModuleId;
  activeTab: NavTab;
  snapshot: AppSnapshot;
  busy: boolean;
  notice: ActionNotice | null;
  api: AppApi;
  onOpenModule: (target: OpenModuleTarget) => void;
}) {
  const { t } = useI18n();
  const latestRequest = snapshot.requestLogs[0];
  const tabContext = getRailContext(activeModuleId, activeTab, snapshot, t);
  return (
    <div className="rail-stack">
      <section>
        <h2>{t('app.status.title')}</h2>
        <p>{busy ? t('app.status.busy') : t('app.status.idle')}</p>
        {notice ? (
          <div className={`notice notice-${notice.type}`}>
            <strong>{notice.message === 'app.action.failed' ? t('app.action.failed') : notice.message}</strong>
            {notice.detail ? <p>{notice.detail}</p> : null}
            {notice.type === 'error' ? (
              <div className="button-row">
                <button type="button" onClick={() => copyText(notice.detail ?? notice.message)}>
                  <Copy size={16} /> {t('app.error.copy')}
                </button>
                <button type="button" onClick={() => void api.openLogs()}>{t('app.logs.open')}</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      <section>
        <h2>{t('app.recent.title')}</h2>
        {latestRequest ? (
          <button type="button" className="rail-link" onClick={() => onOpenModule({ moduleId: 'gateway', tabId: 'logs' })}>
            {t('common.valueSeparator', { left: statusLabel(latestRequest.status, t), right: latestRequest.endpoint })}
          </button>
        ) : (
          <p>{t('app.recent.empty')}</p>
        )}
      </section>
      <section>
        <h2>{tabContext.title}</h2>
        <dl>
          {tabContext.items.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function getRailContext(moduleId: ModuleId, tab: NavTab, snapshot: AppSnapshot, t: ReturnType<typeof useI18n>['t']) {
  if (moduleId === 'chat') {
    return {
      title: t('app.rail.chat.title'),
      items: [
        { label: t('app.rail.conversations'), value: snapshot.conversations.length },
        { label: t('app.rail.messages'), value: snapshot.messages.length },
        { label: t('app.rail.currentTab'), value: tab.label },
        { label: t('app.rail.model'), value: getDefaultModel(snapshot)?.displayName ?? t('app.rail.unconfigured') },
      ],
    };
  }

  if (moduleId === 'gateway') {
    return {
      title: t('app.rail.gateway.title'),
      items: [
        { label: t('app.rail.running'), value: snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped') },
        { label: t('app.rail.port'), value: snapshot.dashboard.gatewayStatus.port },
        { label: t('app.rail.keys'), value: snapshot.gatewayKeys.length },
        { label: t('app.rail.logs'), value: snapshot.gatewayLogs.length },
      ],
    };
  }

  if (moduleId === 'models') {
    return {
      title: t('app.rail.models.title'),
      items: [
        { label: t('app.rail.providers'), value: snapshot.providers.length },
        { label: t('app.rail.models'), value: snapshot.models.length },
        { label: t('app.rail.healthyModels'), value: snapshot.models.filter((model) => model.healthStatus === 'healthy').length },
        { label: t('app.rail.currentTab'), value: tab.label },
      ],
    };
  }

  return {
    title: t('app.rail.module.title'),
    items: [
      { label: t('app.rail.currentTab'), value: tab.label },
      { label: t('app.rail.providers'), value: snapshot.providers.length },
      { label: t('app.rail.models'), value: snapshot.models.length },
      { label: t('app.rail.logs'), value: snapshot.requestLogs.length },
    ],
  };
}

export default App;
