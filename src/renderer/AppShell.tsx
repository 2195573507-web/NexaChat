import {
  Activity,
  Bot,
  BrainCircuit,
  Braces,
  ChevronDown,
  ChevronRight,
  Database,
  Gauge,
  KeyRound,
  MessageSquareText,
  ServerCog,
  Settings,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { navModules } from '../shared/navigation';
import type { AppSnapshot, ModuleId, NavModule, NavTab } from '../shared/types';
import { ModulePageFrame } from './components/ModulePageFrame';
import { stageLabel } from './components/StatusPill';

const icons: Record<ModuleId, ComponentType<{ size?: number }>> = {
  workspace: Gauge,
  chat: MessageSquareText,
  models: ServerCog,
  knowledge: BrainCircuit,
  tools: Bot,
  gateway: KeyRound,
  data: Database,
  settings: Settings,
};

interface AppShellProps {
  activeModule: NavModule;
  activeModuleId: ModuleId;
  activeTab: NavTab;
  activeRoute: string;
  onModuleChange: (moduleId: ModuleId) => void;
  onTabChange: (tabId: string, moduleId?: ModuleId) => void;
  snapshot: AppSnapshot;
  children: ReactNode;
  rightRail?: ReactNode;
}

export function AppShell({
  activeModule,
  activeModuleId,
  activeTab,
  activeRoute,
  onModuleChange,
  onTabChange,
  snapshot,
  children,
  rightRail,
}: AppShellProps) {
  const themeClass = snapshot.uiPreferences.theme === 'dark' ? 'theme-dark' : 'theme-light';
  const [expandedModuleIds, setExpandedModuleIds] = useState<ModuleId[]>(() => [activeModuleId]);

  useEffect(() => {
    setExpandedModuleIds((current) => (current.includes(activeModuleId) ? current : [...current, activeModuleId]));
  }, [activeModuleId]);

  const toggleModule = (moduleId: ModuleId) => {
    setExpandedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((candidate) => candidate !== moduleId) : [...current, moduleId],
    );
  };

  return (
    <div className={`app-shell ${themeClass} density-${snapshot.uiPreferences.density} font-${snapshot.uiPreferences.fontMode}`}>
      <aside className="sidebar" aria-label="一级模块导航">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <strong>NexaChat</strong>
            <span>本地优先 AI 中枢</span>
          </div>
        </div>
        <nav className="module-nav" aria-label="八个一级模块">
          {navModules.map((module) => {
            const Icon = icons[module.id] ?? Activity;
            const isActive = activeModuleId === module.id;
            const isExpanded = expandedModuleIds.includes(module.id);
            return (
              <section className={`module-nav-group ${isActive ? 'is-active' : ''}`} key={module.id}>
                <div className="module-nav-heading">
                  <button
                    type="button"
                    className="module-expand-button"
                    aria-label={`${isExpanded ? '收起' : '展开'}${module.label}`}
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-children-${module.id}`}
                    onClick={() => toggleModule(module.id)}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <button
                    type="button"
                    className={`module-nav-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => onModuleChange(module.id)}
                  >
                    <Icon size={18} />
                    <span className="module-label-full">{module.label}</span>
                    <span className="module-label-short">{module.shortLabel}</span>
                    <span className={`stage-dot stage-${module.stage}`} title={stageLabel(module.stage)} aria-label={stageLabel(module.stage)} />
                  </button>
                </div>
                {isExpanded ? (
                  <div className="module-child-list" id={`sidebar-children-${module.id}`}>
                    {module.tabs.map((tab) => {
                      const isChildActive = activeModuleId === module.id && activeTab.id === tab.id;
                      return (
                        <button
                          type="button"
                          key={tab.id}
                          className={`module-child-link ${isChildActive ? 'is-active' : ''}`}
                          aria-current={isChildActive ? 'page' : undefined}
                          title={tab.featureBoundary ?? tab.description}
                          onClick={() => onTabChange(tab.id, module.id)}
                        >
                          <Braces size={14} />
                          <span>{tab.label}</span>
                          <small>{tab.route}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-context">
            <strong>{snapshot.dashboard.workspace.name}</strong>
            <span>
              默认模型：
              {snapshot.models.find((model) => model.id === snapshot.dashboard.workspace.defaultModelId)?.displayName ??
                snapshot.models[0]?.displayName ??
                '未配置'}
            </span>
          </div>
          <div className="topbar-actions">
            <button type="button" onClick={() => onTabChange('playground', 'chat')}>
              打开聊天
            </button>
            <button type="button" onClick={() => onTabChange('providers', 'models')}>
              Provider 管理
            </button>
            <span className={snapshot.dashboard.gatewayStatus.running ? 'gateway-running' : 'gateway-stopped'}>
              网关 {snapshot.dashboard.gatewayStatus.running ? '运行中' : '未启用'}
            </span>
          </div>
        </header>

        <ModulePageFrame activeModule={activeModule} activeTab={activeTab} activeRoute={activeRoute} onTabChange={onTabChange}>
          <div className="content-grid">
            <main className="content-area">{children}</main>
            {rightRail ? <aside className="right-rail">{rightRail}</aside> : null}
          </div>
        </ModulePageFrame>
      </div>
    </div>
  );
}
