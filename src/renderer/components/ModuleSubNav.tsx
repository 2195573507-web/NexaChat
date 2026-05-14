import {
  Activity,
  Archive,
  Bot,
  Box,
  Boxes,
  BookOpen,
  Braces,
  Brain,
  Brackets,
  Bug,
  Camera,
  ChartNoAxesColumn,
  ClipboardCheck,
  Columns3,
  FileBox,
  FileCheck,
  FileText,
  Gauge,
  GitBranch,
  HardDriveDownload,
  History,
  Import,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  MessagesSquare,
  PlugZap,
  Route,
  ScrollText,
  SearchCheck,
  Server,
  ShieldCheck,
  Settings,
  SlidersHorizontal,
  Send,
  Trash2,
  TriangleAlert,
  Users,
  Wrench,
  Workflow,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { NavModule, NavTab } from '../../shared/types';
import { StatusPill } from './StatusPill';

const tabIcons: Record<string, ComponentType<{ size?: number }>> = {
  activity: Activity,
  archive: Archive,
  bot: Bot,
  box: Box,
  boxes: Boxes,
  'book-open': BookOpen,
  braces: Braces,
  brain: Brain,
  brackets: Brackets,
  bug: Bug,
  camera: Camera,
  'chart-no-axes-column': ChartNoAxesColumn,
  'clipboard-check': ClipboardCheck,
  'columns-3': Columns3,
  'file-box': FileBox,
  'file-check': FileCheck,
  'file-text': FileText,
  gauge: Gauge,
  'git-branch': GitBranch,
  'hard-drive-download': HardDriveDownload,
  history: History,
  import: Import,
  'key-round': KeyRound,
  'layout-dashboard': LayoutDashboard,
  'list-checks': ListChecks,
  'message-square-text': MessageSquareText,
  'messages-square': MessagesSquare,
  'plug-zap': PlugZap,
  route: Route,
  'scroll-text': ScrollText,
  'search-check': SearchCheck,
  send: Send,
  server: Server,
  'shield-check': ShieldCheck,
  settings: Settings,
  'sliders-horizontal': SlidersHorizontal,
  'trash-2': Trash2,
  'triangle-alert': TriangleAlert,
  users: Users,
  wrench: Wrench,
  workflow: Workflow,
  zap: Zap,
};

interface ModuleSubNavProps {
  module: NavModule;
  activeTab: NavTab;
  onTabChange: (tabId: string) => void;
}

export function ModuleSubNav({ module, activeTab, onTabChange }: ModuleSubNavProps) {
  return (
    <section className="module-subnav-panel" aria-label={`${module.label} 二级导航`}>
      <div className="module-subnav-summary">
        <span>二级导航</span>
        <strong>{activeTab.label}</strong>
        <p>{activeTab.description ?? module.description}</p>
      </div>

      <div className="module-tabs" role="tablist" aria-label={`${module.label} 二级导航`}>
        {module.tabs.map((tab) => {
          const Icon = tab.icon ? tabIcons[tab.icon] : undefined;
          return (
            <button
              type="button"
              role="tab"
              key={tab.id}
              id={`tab-${module.id}-${tab.id}`}
              aria-selected={activeTab.id === tab.id}
              aria-controls={`panel-${module.id}-${tab.id}`}
              data-route={tab.route}
              data-label-key={tab.labelKey}
              data-description-key={tab.descriptionKey}
              data-permission={tab.permission}
              title={tab.permission ? `${tab.description ?? tab.label} · permission: ${tab.permission}` : tab.description ?? tab.label}
              className={[
                tab.stage === 'implemented' ? 'tab-ready' : 'tab-muted',
                activeTab.id === tab.id ? 'is-active' : '',
                tab.stage === 'reserved' ? 'is-reserved' : '',
                tab.permission ? 'has-permission-note' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="tab-icon">{Icon ? <Icon size={16} /> : null}</span>
              <span className="tab-copy">
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </span>
              <StatusPill stage={tab.stage} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
