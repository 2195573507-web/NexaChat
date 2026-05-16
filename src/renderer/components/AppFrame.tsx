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
  History,
  KeyRound,
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
import { translateModule, useI18n } from '../i18n';

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

const moduleIcons: Record<ModuleId, LucideIcon> = {
  chat: MessageSquareText,
  models: ServerCog,
  knowledge: BrainCircuit,
  tools: Bot,
  gateway: KeyRound,
  data: Database,
  settings: Settings,
};

const tabIcons: Record<string, LucideIcon> = {
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
  gauge: Activity,
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
      className={`app-frame ${themeClass} density-${snapshot.uiPreferences.density} font-${snapshot.uiPreferences.fontMode} ${snapshot.uiPreferences.advancedMode ? 'mode-advanced' : 'mode-ordinary'}`}
      data-theme-mode={snapshot.uiPreferences.theme}
      data-resolved-theme={resolvedTheme}
      data-user-mode={snapshot.uiPreferences.advancedMode ? 'advanced' : 'ordinary'}
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
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="work-surface">
        <header className="command-bar">
          <div className="command-context">
            <span>{t('shell.defaultModel', { model: getDefaultModelLabel(snapshot, t('app.rail.unconfigured')) })}</span>
            <span>{snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')}</span>
          </div>
          <div className="command-actions">
            {translatedActiveModule.tabs.length > 1 ? (
              <nav className="top-tabs" aria-label={translatedActiveModule.label}>
                {translatedActiveModule.tabs.map((tab) => {
                  const Icon = tabIcons[tab.icon ?? ''] ?? ChevronRight;
                  const isActive = tab.id === translatedActiveTab.id;
                  return (
                    <button
                      type="button"
                      className={`top-tab ${isActive ? 'is-active' : ''}`}
                      key={tab.id}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onTabChange(tab.id, activeModuleId)}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            ) : null}
            <button type="button" className="ghost-button" aria-label={resolvedTheme === 'dark' ? t('settings.preferences.theme.dark') : t('settings.preferences.theme.light')}>
              {resolvedTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button type="button" className="primary-button" onClick={() => onModuleChange('chat')}>
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
  disabledReason,
  variant = 'default',
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
}) {
  return (
    <button type="button" className={`${variant}-button`} onClick={onClick} disabled={disabled || !onClick} title={disabled ? disabledReason : undefined}>
      {icon}
      {children}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions || status ? (
        <div className="page-primary-actions">
          {status}
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  if (!title && !description && !actions) {
    return null;
  }
  return (
    <div className="section-head">
      <div>
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
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
    <section className={['config-list task-panel', className].filter(Boolean).join(' ')}>
      <SectionHeader title={title} description={description} actions={actions} />
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
    <aside className={['config-detail detail-panel', className].filter(Boolean).join(' ')}>
      <SectionHeader title={title} description={description} actions={actions} />
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
      <SectionHeader title={title} description={description} actions={actions} />
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
      <input type="checkbox" checked={checked} aria-label={title} onChange={(event) => onChange(event.target.checked)} />
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

export function ErrorState({ title, detail, action }: { title: ReactNode; detail?: ReactNode; action?: ReactNode }) {
  return <InlineNotice tone="danger" title={title} detail={detail ? <span>{detail}</span> : action ? <span>{action}</span> : undefined} />;
}

export function LoadingState({ title }: { title: ReactNode }) {
  return <InlineNotice tone="info" title={title} />;
}

export function CheckIcon() {
  return <Check size={14} />;
}

export function ChatInput({
  value,
  placeholder,
  contextControl,
  disabled,
  disabledReason,
  sendLabel,
  sendIcon,
  utilityActions,
  onChange,
  onSend,
}: {
  value: string;
  placeholder: string;
  contextControl?: ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  sendLabel: string;
  sendIcon?: ReactNode;
  utilityActions?: ReactNode;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="chat-composer">
      {contextControl || utilityActions ? (
        <div className="composer-context">
          {contextControl}
          {utilityActions ? <span className="composer-utility-actions">{utilityActions}</span> : null}
        </div>
      ) : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && value.trim() && !disabled) {
            event.preventDefault();
            onSend();
          }
        }}
        rows={1}
      />
      <button type="button" className="primary-button composer-send" disabled={disabled || !value.trim()} title={disabled ? disabledReason : undefined} onClick={onSend}>
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
