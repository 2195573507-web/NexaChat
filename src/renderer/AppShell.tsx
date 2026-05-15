import {
  Activity,
  Bot,
  Boxes,
  BrainCircuit,
  Braces,
  Camera,
  ChevronDown,
  ChevronRight,
  Database,
  FileCheck,
  FileText,
  Gauge,
  History,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  MessagesSquare,
  PlugZap,
  Route,
  ScrollText,
  Search,
  SearchCheck,
  Send,
  Server,
  ServerCog,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { navModules } from '../shared/navigation';
import { getThemeClass, resolveThemeMode } from '../shared/theme';
import type { AppSnapshot, ModuleId, NavModule, NavTab } from '../shared/types';
import { ModulePageFrame } from './components/ModulePageFrame';
import { stageLabel } from './components/StatusPill';
import { translateModule, useI18n } from './i18n';

const SIDEBAR_EXPANDED_KEY = 'nexachat.sidebar.expandedModuleIds';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

const moduleIcons: Record<ModuleId, LucideIcon> = {
  workspace: Gauge,
  chat: MessageSquareText,
  models: ServerCog,
  knowledge: BrainCircuit,
  tools: Bot,
  gateway: KeyRound,
  data: Database,
  settings: Settings,
};

const childIcons: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  activity: Activity,
  history: History,
  'messages-square': MessagesSquare,
  send: Send,
  braces: Braces,
  server: Server,
  boxes: Boxes,
  route: Route,
  'book-open': FileText,
  'file-text': FileText,
  'search-check': SearchCheck,
  'plug-zap': PlugZap,
  bot: Bot,
  gauge: Gauge,
  'key-round': KeyRound,
  'scroll-text': ScrollText,
  brackets: Braces,
  'file-check': FileCheck,
  camera: Camera,
  'triangle-alert': TriangleAlert,
  'trash-2': Trash2,
  'sliders-horizontal': SlidersHorizontal,
  'shield-check': ShieldCheck,
  settings: Settings,
};

interface AppShellProps {
  activeModule: NavModule;
  activeModuleId: ModuleId;
  activeTab: NavTab;
  onModuleChange: (moduleId: ModuleId) => void;
  onTabChange: (tabId: string, moduleId?: ModuleId) => void;
  snapshot: AppSnapshot;
  children: ReactNode;
  rightRail?: ReactNode;
}

function getStoredExpandedModules(activeModuleId: ModuleId): ModuleId[] {
  if (typeof window === 'undefined') {
    return ['workspace', activeModuleId];
  }

  try {
    const stored = window.localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    const parsed = stored ? (JSON.parse(stored) as unknown) : null;
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((id): id is ModuleId => navModules.some((module) => module.id === id));
      return Array.from(new Set(['workspace', activeModuleId, ...valid]));
    }
  } catch {
    window.localStorage.removeItem(SIDEBAR_EXPANDED_KEY);
  }

  return Array.from(new Set(['workspace', activeModuleId]));
}

function persistExpandedModules(moduleIds: ModuleId[]) {
  try {
    window.localStorage.setItem(SIDEBAR_EXPANDED_KEY, JSON.stringify(moduleIds));
  } catch {
    // localStorage may be unavailable in hardened desktop contexts; the UI still works for this session.
  }
}

function getDefaultModelLabel(snapshot: AppSnapshot, fallback: string) {
  return (
    snapshot.models.find((model) => model.id === snapshot.dashboard.workspace.defaultModelId)?.displayName ??
    snapshot.models.find((model) => model.enabled)?.displayName ??
    snapshot.models[0]?.displayName ??
    fallback
  );
}

function getInitialSystemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(SYSTEM_DARK_QUERY).matches === true;
}

export function AppShell({
  activeModule,
  activeModuleId,
  activeTab,
  onModuleChange,
  onTabChange,
  snapshot,
  children,
  rightRail,
}: AppShellProps) {
  const { t } = useI18n();
  const [systemPrefersDark, setSystemPrefersDark] = useState(getInitialSystemPrefersDark);
  const [expandedModuleIds, setExpandedModuleIds] = useState<ModuleId[]>(() => getStoredExpandedModules(activeModuleId));
  const translatedModules = navModules.map((module) => translateModule(module, t));
  const resolvedTheme = resolveThemeMode(snapshot.uiPreferences.theme, systemPrefersDark);
  const themeClass = getThemeClass(snapshot.uiPreferences.theme, systemPrefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const handleChange = () => setSystemPrefersDark(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    setExpandedModuleIds((current) => {
      if (current.includes(activeModuleId)) {
        return current;
      }
      return [...current, activeModuleId];
    });
  }, [activeModuleId]);

  useEffect(() => {
    persistExpandedModules(expandedModuleIds);
  }, [expandedModuleIds]);

  const toggleModule = (moduleId: ModuleId) => {
    setExpandedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((candidate) => candidate !== moduleId) : [...current, moduleId],
    );
  };

  return (
    <div
      className={`app-shell ${themeClass} density-${snapshot.uiPreferences.density} font-${snapshot.uiPreferences.fontMode}`}
      data-theme-mode={snapshot.uiPreferences.theme}
      data-resolved-theme={resolvedTheme}
    >
      <aside className="sidebar" aria-label={t('shell.sidebar.aria')}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            N
          </div>
          <div className="brand-copy">
            <strong>NexaChat</strong>
            <span>{t('shell.brand.subtitle')}</span>
          </div>
        </div>

        <nav className="module-nav" aria-label={t('shell.productModules.aria')}>
          {translatedModules.map((module) => {
            const Icon = moduleIcons[module.id] ?? Activity;
            const isActive = activeModuleId === module.id;
            const isExpanded = expandedModuleIds.includes(module.id);
            return (
              <section className={`module-nav-group ${isActive ? 'is-active' : ''}`} key={module.id}>
                <div className="module-nav-heading">
                  <button
                    type="button"
                    className="module-expand-button"
                    aria-label={`${isExpanded ? t('shell.collapse') : t('shell.expand')}${module.label}`}
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-children-${module.id}`}
                    onClick={() => toggleModule(module.id)}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <button
                    type="button"
                    className={`module-nav-item ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onModuleChange(module.id)}
                  >
                    <Icon size={18} />
                    <span className="module-label-full">{module.label}</span>
                    <span className="module-label-short">{module.shortLabel}</span>
                    <span className={`stage-dot stage-${module.stage}`} title={stageLabel(module.stage, t)} aria-label={stageLabel(module.stage, t)} />
                  </button>
                </div>

                {isExpanded ? (
                  <div className="module-child-list" id={`sidebar-children-${module.id}`}>
                    {module.tabs.map((tab) => {
                      const isChildActive = activeModuleId === module.id && activeTab.id === tab.id;
                      const TabIcon = childIcons[tab.icon ?? ''] ?? Braces;
                      return (
                        <button
                          type="button"
                          key={tab.id}
                          className={`module-child-link ${isChildActive ? 'is-active' : ''}`}
                          aria-current={isChildActive ? 'page' : undefined}
                          title={tab.label}
                          onClick={() => onTabChange(tab.id, module.id)}
                        >
                          <TabIcon size={15} />
                          <span>{tab.label}</span>
                          <span className={`child-stage child-stage-${tab.stage}`} aria-label={stageLabel(tab.stage, t)} title={stageLabel(tab.stage, t)} />
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
            <span>{t('shell.defaultModel', { model: getDefaultModelLabel(snapshot, t('app.rail.unconfigured')) })}</span>
            <span className={snapshot.dashboard.gatewayStatus.running ? 'gateway-running' : 'gateway-stopped'}>
              {t('shell.gateway', { state: snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped') })}
            </span>
          </div>

          <div className="topbar-actions">
            <button type="button" className="icon-text-button topbar-search" onClick={() => onTabChange('logs', 'gateway')}>
              <Search size={16} /> {t('shell.viewLogs')}
            </button>
            <button type="button" className="primary-button" onClick={() => onTabChange('playground', 'chat')}>
              {t('shell.openChat')}
            </button>
            <button type="button" onClick={() => onTabChange('providers', 'models')}>
              {t('shell.provider')}
            </button>
            <button type="button" onClick={() => onTabChange('catalog', 'models')}>
              {t('shell.model')}
            </button>
          </div>
        </header>

        <ModulePageFrame activeModule={activeModule} activeTab={activeTab} onTabChange={(tabId) => onTabChange(tabId, activeModuleId)}>
          <div className="content-grid">
            <main className="content-area">{children}</main>
            {rightRail ? <aside className="right-rail">{rightRail}</aside> : null}
          </div>
        </ModulePageFrame>
      </div>
    </div>
  );
}
