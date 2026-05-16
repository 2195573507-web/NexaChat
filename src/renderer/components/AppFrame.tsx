import {
  Activity,
  Archive,
  Bot,
  Boxes,
  BrainCircuit,
  Braces,
  Check,
  ChevronRight,
  Copy,
  Database,
  FileCheck,
  FileText,
  Gauge,
  History,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  MessagesSquare,
  Moon,
  PlugZap,
  Route,
  RotateCcw,
  ScrollText,
  SearchCheck,
  Send,
  Server,
  ServerCog,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { navModules } from '../../shared/navigation';
import { getThemeClass, resolveThemeMode } from '../../shared/theme';
import type { AppSnapshot, ModuleId, NavModule, NavTab } from '../../shared/types';
import { stageLabel, stageState } from './stageStatus';
import type { Translate } from '../i18n';
import { translateModule, useI18n } from '../i18n';

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

const tabIcons: Record<string, LucideIcon> = {
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
  archive: Archive,
  'rotate-ccw': RotateCcw,
  'triangle-alert': TriangleAlert,
  'trash-2': Trash2,
  'sliders-horizontal': SlidersHorizontal,
  'shield-check': ShieldCheck,
  settings: Settings,
  'message-square-text': MessageSquareText,
};

interface AppFrameProps {
  activeModule: NavModule;
  activeModuleId: ModuleId;
  activeTab: NavTab;
  onModuleChange: (moduleId: ModuleId) => void;
  onTabChange: (tabId: string, moduleId?: ModuleId) => void;
  snapshot: AppSnapshot;
  busy: boolean;
  notice: { type: 'success' | 'error'; message: string; detail?: string } | null;
  children: ReactNode;
}

function getInitialSystemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(SYSTEM_DARK_QUERY).matches === true;
}

function getDefaultModelLabel(snapshot: AppSnapshot, fallback: string) {
  return (
    snapshot.models.find((model) => model.id === snapshot.dashboard.workspace.defaultModelId)?.displayName ??
    snapshot.models.find((model) => model.enabled)?.displayName ??
    snapshot.models[0]?.displayName ??
    fallback
  );
}

function getModuleSignal(moduleId: ModuleId, snapshot: AppSnapshot): 'ready' | 'warning' | 'danger' | 'muted' {
  if (moduleId === 'models') {
    return snapshot.providers.some((provider) => provider.secretRef && provider.enabled) ? 'ready' : 'warning';
  }
  if (moduleId === 'gateway') {
    return snapshot.dashboard.gatewayStatus.running ? 'ready' : 'muted';
  }
  if (moduleId === 'knowledge') {
    return snapshot.knowledgeFiles.some((file) => file.indexStatus === 'indexed' && !file.deletedAt) ? 'ready' : 'warning';
  }
  if (moduleId === 'tools') {
    return snapshot.executionRuns.some((run) => run.status === 'failed') ? 'danger' : snapshot.mcpServers.length > 0 ? 'ready' : 'muted';
  }
  return 'ready';
}

function statusTextForModule(moduleId: ModuleId, snapshot: AppSnapshot, t: Translate) {
  if (moduleId === 'models') {
    const readyProviders = snapshot.providers.filter((provider) => provider.enabled && provider.secretRef).length;
    return readyProviders > 0 ? t('common.countAvailable', { count: readyProviders }) : t('common.notConfigured');
  }
  if (moduleId === 'gateway') {
    return snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped');
  }
  if (moduleId === 'knowledge') {
    return snapshot.knowledgeFiles.some((file) => file.indexStatus === 'indexed' && !file.deletedAt) ? t('common.indexed') : t('common.notConfigured');
  }
  if (moduleId === 'tools') {
    return snapshot.mcpServers.length > 0 ? t('common.countGranted', { count: snapshot.mcpServers.filter((server) => server.permissionState === 'granted').length }) : t('tools.columns.dryRun');
  }
  return t('stage.implemented');
}

export function AppFrame({
  activeModule,
  activeModuleId,
  activeTab,
  onModuleChange,
  onTabChange,
  snapshot,
  busy,
  notice,
  children,
}: AppFrameProps) {
  const { t } = useI18n();
  const [systemPrefersDark, setSystemPrefersDark] = useState(getInitialSystemPrefersDark);
  const translatedModules = useMemo(() => navModules.map((module) => translateModule(module, t)), [t]);
  const translatedActiveModule = translateModule(activeModule, t);
  const translatedActiveTab = translatedActiveModule.tabs.find((tab) => tab.id === activeTab.id) ?? activeTab;
  const themeClass = getThemeClass(snapshot.uiPreferences.theme, systemPrefersDark);
  const resolvedTheme = resolveThemeMode(snapshot.uiPreferences.theme, systemPrefersDark);

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

  return (
    <div
      className={`app-frame ${themeClass} density-${snapshot.uiPreferences.density} font-${snapshot.uiPreferences.fontMode}`}
      data-theme-mode={snapshot.uiPreferences.theme}
      data-resolved-theme={resolvedTheme}
    >
      <aside className="module-rail" aria-label={t('shell.sidebar.aria')}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">N</div>
          <div>
            <strong>NexaChat</strong>
            <span>{t('shell.brand.subtitle')}</span>
          </div>
        </div>

        <nav className="rail-list" aria-label={t('shell.productModules.aria')}>
          {translatedModules.map((module) => {
            const Icon = moduleIcons[module.id] ?? Activity;
            const isActive = module.id === activeModuleId;
            const signal = getModuleSignal(module.id, snapshot);
            return (
              <button
                type="button"
                className={`rail-item ${isActive ? 'is-active' : ''}`}
                key={module.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onModuleChange(module.id)}
              >
                <Icon size={18} />
                <span>{module.shortLabel}</span>
                <i className={`status-light status-${signal}`} aria-hidden="true" />
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="module-switcher" aria-label={translatedActiveModule.label}>
        <div className="switcher-head">
          <div>
            <span className="eyebrow">{translatedActiveModule.label}</span>
            <h1>{translatedActiveTab.label}</h1>
          </div>
          <StatusPillLite label={stageLabel(translatedActiveTab.stage, t)} state={stageState(translatedActiveTab.stage)} />
        </div>
        <div className="module-summary">
          <span>{translatedActiveModule.description}</span>
          <strong>{statusTextForModule(activeModuleId, snapshot, t)}</strong>
        </div>
        <div className="feature-list" id={`feature-list-${activeModuleId}`}>
          {translatedActiveModule.tabs.map((tab) => {
            const Icon = tabIcons[tab.icon ?? ''] ?? ChevronRight;
            const isActive = tab.id === translatedActiveTab.id;
            return (
              <button
                type="button"
                className={`feature-row ${isActive ? 'is-active' : ''}`}
                key={tab.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onTabChange(tab.id, activeModuleId)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <small>{stageLabel(tab.stage, t)}</small>
              </button>
            );
          })}
        </div>
      </section>

      <main className="work-surface">
        <header className="command-bar">
          <div className="command-context">
            <StatusDot state={snapshot.dashboard.gatewayStatus.running ? 'ready' : 'muted'} />
            <span>{t('shell.defaultModel', { model: getDefaultModelLabel(snapshot, t('app.rail.unconfigured')) })}</span>
            <span>{snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')}</span>
          </div>
          <div className="command-actions">
            <button type="button" className="ghost-button" aria-label={resolvedTheme === 'dark' ? t('settings.preferences.theme.dark') : t('settings.preferences.theme.light')}>
              {resolvedTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button type="button" className="primary-button" onClick={() => onTabChange('playground', 'chat')}>
              <Send size={15} />
              {t('shell.openChat')}
            </button>
          </div>
        </header>

        <section className="module-page" aria-label={translatedActiveTab.label}>
          {notice ? (
            <InlineNotice tone={notice.type === 'success' ? 'success' : 'danger'} title={notice.message === 'app.action.failed' ? t('app.action.failed') : notice.message} detail={notice.detail} />
          ) : busy ? (
            <InlineNotice tone="info" title={t('app.status.busy')} />
          ) : null}
          {children}
        </section>
      </main>
    </div>
  );
}

export function StatusDot({ state = 'muted' }: { state?: 'ready' | 'warning' | 'danger' | 'info' | 'muted' }) {
  return <span className={`status-dot status-${state}`} aria-hidden="true" />;
}

export function StatusPillLite({ label, state = 'muted' }: { label: ReactNode; state?: 'ready' | 'warning' | 'danger' | 'info' | 'muted' }) {
  return (
    <span className={`tool-pill status-${state}`}>
      <StatusDot state={state} />
      {label}
    </span>
  );
}

export function InlineNotice({
  tone = 'info',
  title,
  detail,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'muted';
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className={`inline-notice notice-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}

export function CommandButton({
  children,
  icon,
  onClick,
  disabled,
  variant = 'default',
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
}) {
  return (
    <button type="button" className={`${variant}-button`} onClick={onClick} disabled={disabled || !onClick}>
      {icon}
      {children}
    </button>
  );
}

export function ConfigList({
  title,
  description,
  children,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={['config-list', className].filter(Boolean).join(' ')}>
      {title || description || actions ? (
        <div className="section-head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="section-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ConfigDetail({
  title,
  description,
  children,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <aside className={['config-detail', className].filter(Boolean).join(' ')}>
      {title || description || actions ? (
        <div className="section-head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="section-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </aside>
  );
}

export function ToolSection({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="tool-section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <label className="field-row">
      <span>{label}</span>
      {children}
      {help ? <small>{help}</small> : null}
    </label>
  );
}

export function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <div>{control}</div>
    </div>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <strong>{title}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}

export function CopyableCommand({ value, label }: { value: string; label: string }) {
  return (
    <div className="copy-command">
      <code>{value}</code>
      <button type="button" className="ghost-button" onClick={() => void navigator.clipboard?.writeText(value)}>
        <Copy size={14} />
        {label}
      </button>
    </div>
  );
}

export function DataRows({ rows }: { rows: Array<{ label: ReactNode; value: ReactNode }> }) {
  return (
    <dl className="data-rows">
      {rows.map((row, index) => (
        <div key={index}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ActivityList({
  items,
  empty,
}: {
  items: Array<{ title: ReactNode; meta?: ReactNode; state?: 'ready' | 'warning' | 'danger' | 'info' | 'muted' }>;
  empty: ReactNode;
}) {
  if (items.length === 0) {
    return <div className="empty-line">{empty}</div>;
  }
  return (
    <div className="activity-list">
      {items.map((item, index) => (
        <div className="activity-row" key={index}>
          <StatusDot state={item.state ?? 'muted'} />
          <span>{item.title}</span>
          {item.meta ? <small>{item.meta}</small> : null}
        </div>
      ))}
    </div>
  );
}

export function EmptyBlock({
  title,
  detail,
  action,
}: {
  title: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="empty-block">
      <strong>{title}</strong>
      {detail ? <p>{detail}</p> : null}
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export function CheckIcon() {
  return <Check size={14} />;
}

export function ChatInput({
  value,
  placeholder,
  contextControl,
  disabled,
  sendLabel,
  sendIcon,
  onChange,
  onSend,
}: {
  value: string;
  placeholder: string;
  contextControl?: ReactNode;
  disabled?: boolean;
  sendLabel: string;
  sendIcon?: ReactNode;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="chat-composer">
      {contextControl ? <div className="composer-context">{contextControl}</div> : null}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && value.trim() && !disabled) {
            onSend();
          }
        }}
      />
      <button type="button" className="primary-button" disabled={disabled || !value.trim()} onClick={onSend}>
        {sendIcon}
        {sendLabel}
      </button>
    </div>
  );
}

export function MessageBubble({
  role,
  status,
  meta,
  children,
  actions,
  actionsLabel,
}: {
  role: 'user' | 'assistant' | string;
  status: string;
  meta?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  actionsLabel?: string;
}) {
  return (
    <article className={`message-bubble role-${role} status-${status}`}>
      {meta ? <div className="message-meta">{meta}</div> : null}
      <div className="message-content">{children}</div>
      {actions ? <div className="message-actions" aria-label={actionsLabel}>{actions}</div> : null}
    </article>
  );
}
