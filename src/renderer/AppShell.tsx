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
import type { AppSnapshot, ModuleId, NavModule } from '../shared/types';
import { StatusPill } from './components/StatusPill';

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
  onModuleChange: (moduleId: ModuleId) => void;
  snapshot: AppSnapshot;
  children: ReactNode;
  rightRail?: ReactNode;
}

export function AppShell({ activeModule, activeModuleId, onModuleChange, snapshot, children, rightRail }: AppShellProps) {
  return (
    <div className="app-shell">
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
                <span>{module.label}</span>
                <span className={`stage-dot stage-${module.stage}`} />
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div>
            <strong>{snapshot.dashboard.workspace.name}</strong>
            <span>默认模型：{snapshot.models[0]?.displayName ?? '未配置'}</span>
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

        <div className="module-header">
          <div>
            <h1>{activeModule.label}</h1>
            <p>{activeModule.route}</p>
          </div>
          <StatusPill stage={activeModule.stage} />
        </div>

        <div className="module-tabs" role="tablist" aria-label={`${activeModule.label} 二级标签`}>
          {activeModule.tabs.map((tab) => (
            <button type="button" role="tab" key={tab.id} className={tab.stage === 'implemented' ? 'tab-ready' : 'tab-muted'}>
              {tab.label}
              <StatusPill stage={tab.stage} />
            </button>
          ))}
        </div>

        <div className="content-grid">
          <main className="content-area">{children}</main>
          {rightRail ? <aside className="right-rail">{rightRail}</aside> : null}
        </div>
      </div>
    </div>
  );
}
