import { useEffect, useState } from 'react';
import { getDefaultTab, getTabRoute, navModules, resolveNavigation } from '../shared/navigation';
import type { AppApi } from '../shared/api';
import type { AppSnapshot, ModuleId, NavTab } from '../shared/types';
import { AppFrame } from './components/AppFrame';
import { getAppApi } from './api';
import { I18nProvider, translateModule, translateTab, useI18n } from './i18n';
import { modulePageRegistry } from './modules/modulePageRegistry';
import type { OpenModuleTarget } from './modules/shared';
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
        activeModule={navigationState.module}
        activeModuleId={navigationState.module.id}
        activeTab={navigationState.tab}
        api={api}
        busy={busy}
        navigateTo={navigateTo}
        notice={notice}
        openModule={openModule}
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
    <AppFrame
      activeModule={translatedActiveModule}
      activeModuleId={activeModuleId}
      activeTab={translatedActiveTab}
      onModuleChange={(moduleId) => navigateTo(moduleId)}
      onTabChange={(tabId, moduleId = activeModuleId) => navigateTo(moduleId, tabId)}
      snapshot={snapshot}
      busy={busy}
      notice={notice}
    >
      {page}
    </AppFrame>
  );
}

export default App;
