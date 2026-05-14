import {
  Activity,
  Bot,
  BrainCircuit,
  Database,
  Gauge,
  KeyRound,
  MessageSquareText,
  ServerCog,
  Settings,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { navModules } from '../shared/navigation';
import type { AppSnapshot, ModuleId, NavModule, NavTab } from '../shared/types';
import { ModulePageFrame } from './components/ModulePageFrame';
import { stageLabel } from './components/StatusPill';

const icons: Record<ModuleId, ComponentType<{ size?: number }>> = {
  dashboard: Gauge,
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
  onTabChange: (tabId: string) => void;
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
        <nav className="module-nav">
          {navModules.map((module) => {
            const Icon = icons[module.id] ?? Activity;
            return (
              <button
                type="button"
                key={module.id}
                className={`module-nav-item ${activeModuleId === module.id ? 'is-active' : ''}`}
                onClick={() => onModuleChange(module.id)}
              >
                <Icon size={18} />
                <span className="module-label-full">{module.label}</span>
                <span className="module-label-short">{module.shortLabel}</span>
                <span className={`stage-dot stage-${module.stage}`} title={stageLabel(module.stage)} aria-label={stageLabel(module.stage)} />
              </button>
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
            <button type="button" onClick={() => onModuleChange('chat')}>
              新会话
            </button>
            <button type="button" onClick={() => onModuleChange('models')}>
              添加 Provider
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
