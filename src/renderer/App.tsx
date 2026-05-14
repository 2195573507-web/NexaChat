import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { getDefaultTab, getTabRoute, navModules, resolveNavigation } from '../shared/navigation';
import type { AppApi } from '../shared/api';
import type { AppSnapshot, ModuleId, NavTab } from '../shared/types';
import { AppShell } from './AppShell';
import { getAppApi } from './api';
import { modulePageRegistry } from './modules/modulePageRegistry';
import type { OpenModuleTarget } from './modules/shared';
import { copyText, getDefaultModel } from './modules/shared';
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
      setNotice({ type: 'error', message: '操作失败', detail: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot) {
    return <div className="boot-screen">NexaChat 正在加载本地数据...</div>;
  }

  const ActivePage = modulePageRegistry[activeModuleId];
  const page = (
    <ActivePage
      activeTab={activeTab}
      snapshot={snapshot}
      api={api}
      onAction={(label, action) => runAction(label, action)}
      onOpenModule={openModule}
    />
  );

  return (
    <AppShell
      activeModule={activeModule}
      activeModuleId={activeModuleId}
      activeTab={activeTab}
      onModuleChange={(moduleId) => navigateTo(moduleId)}
      onTabChange={(tabId, moduleId = activeModuleId) => navigateTo(moduleId, tabId)}
      snapshot={snapshot}
      rightRail={<RightRail activeModuleId={activeModuleId} activeTab={activeTab} snapshot={snapshot} busy={busy} notice={notice} api={api} onOpenModule={openModule} />}
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
  const latestRequest = snapshot.requestLogs[0];
  const tabContext = getRailContext(activeModuleId, activeTab, snapshot);
  return (
    <div className="rail-stack">
      <section>
        <h2>运行状态</h2>
        <p>{busy ? '操作执行中...' : '空闲'}</p>
        {notice ? (
          <div className={`notice notice-${notice.type}`}>
            <strong>{notice.message}</strong>
            {notice.detail ? <p>{notice.detail}</p> : null}
            {notice.type === 'error' ? (
              <div className="button-row">
                <button type="button" onClick={() => copyText(notice.detail ?? notice.message)}>
                  <Copy size={16} /> 复制错误
                </button>
                <button type="button" onClick={() => void api.openLogs()}>打开日志</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      <section>
        <h2>最近操作</h2>
        {latestRequest ? (
          <button type="button" className="rail-link" onClick={() => onOpenModule({ moduleId: 'gateway', tabId: 'logs' })}>
            {latestRequest.status} · {latestRequest.endpoint}
          </button>
        ) : (
          <p>暂无请求日志</p>
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

function getRailContext(moduleId: ModuleId, tab: NavTab, snapshot: AppSnapshot) {
  if (moduleId === 'chat') {
    return {
      title: '对话上下文',
      items: [
        { label: '会话', value: snapshot.conversations.length },
        { label: '消息', value: snapshot.messages.length },
        { label: '当前标签', value: tab.label },
        { label: '模型', value: getDefaultModel(snapshot)?.displayName ?? '未配置' },
      ],
    };
  }

  if (moduleId === 'gateway') {
    return {
      title: '网关上下文',
      items: [
        { label: '运行', value: snapshot.dashboard.gatewayStatus.running ? 'on' : 'off' },
        { label: '端口', value: snapshot.dashboard.gatewayStatus.port },
        { label: 'Keys', value: snapshot.gatewayKeys.length },
        { label: '日志', value: snapshot.gatewayLogs.length },
      ],
    };
  }

  if (moduleId === 'models') {
    return {
      title: '模型上下文',
      items: [
        { label: 'Providers', value: snapshot.providers.length },
        { label: 'Models', value: snapshot.models.length },
        { label: '健康模型', value: snapshot.models.filter((model) => model.healthStatus === 'healthy').length },
        { label: '当前标签', value: tab.label },
      ],
    };
  }

  return {
    title: '模块上下文',
    items: [
      { label: '当前标签', value: tab.label },
      { label: 'Providers', value: snapshot.providers.length },
      { label: 'Models', value: snapshot.models.length },
      { label: 'Logs', value: snapshot.requestLogs.length },
    ],
  };
}

export default App;
