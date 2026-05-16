import type { ReactNode } from 'react';
import { UI_STATUS_DEFINITIONS, type UiStatusTone } from '../../shared/uiStatus';
import type { AppSnapshot, UiStatusState } from '../../shared/types';
import { useI18n } from '../i18n';

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={['page-header', className].filter(Boolean).join(' ')}>
      <div>
        {eyebrow ? <span className="page-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {meta || actions ? (
        <div className="page-header-aside">
          {meta ? <div className="page-header-meta">{meta}</div> : null}
          {actions ? <Toolbar>{actions}</Toolbar> : null}
        </div>
      ) : null}
    </header>
  );
}

export function Toolbar({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' | 'between' }) {
  return <div className={`toolbar toolbar-${align}`}>{children}</div>;
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={['page-section', className].filter(Boolean).join(' ')}>
      {title || description || actions ? (
        <div className="section-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="toolbar">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ActionCard({
  title,
  description,
  icon,
  meta,
  onClick,
  disabled,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="action-card" onClick={onClick} disabled={disabled || !onClick}>
      {icon ? <span className="action-card-icon">{icon}</span> : null}
      <span className="action-card-copy">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </span>
      {meta ? <span className="action-card-meta">{meta}</span> : null}
    </button>
  );
}

export function MetricTile({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  return (
    <article className={`metric-tile metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={['card', className].filter(Boolean).join(' ')}>
      {title || description || actions ? (
        <div className="card-header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="toolbar">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </article>
  );
}

export function MetricCard({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <MetricTile label={title} value={value} detail={detail} />;
}

export function StatusBadge({
  state,
  label,
  tone,
}: {
  state?: UiStatusState;
  label?: string;
  tone?: UiStatusTone;
}) {
  const { t } = useI18n();
  const definition = state ? UI_STATUS_DEFINITIONS[state] : null;
  const resolvedTone = tone ?? definition?.tone ?? 'muted';
  const resolvedLabel = label ?? (definition ? t(definition.labelKey) : t('status.unavailable'));
  return <span className={`status-badge status-tone-${resolvedTone}`}>{resolvedLabel}</span>;
}

export function CapabilityBadge({
  state,
  label,
  detail,
}: {
  state: UiStatusState;
  label: string;
  detail?: string;
}) {
  return (
    <span className={`capability-badge capability-${state}`} title={detail}>
      <StatusBadge state={state} />
      <span>{label}</span>
    </span>
  );
}

export function SidePanel({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <aside className={['side-panel', className].filter(Boolean).join(' ')}>
      <div className="side-panel-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <Toolbar>{actions}</Toolbar> : null}
      </div>
      {children}
    </aside>
  );
}

export function DataPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['data-panel', className].filter(Boolean).join(' ')}>{children}</div>;
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
    <div className="chat-input">
      {contextControl ? <div className="chat-input-context">{contextControl}</div> : null}
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

export function ProviderCard({
  name,
  type,
  baseUrl,
  secretState,
  health,
  secretLabel,
  baseUrlLabel,
  healthLabel,
  actions,
}: {
  name: string;
  type: string;
  baseUrl: string;
  secretState: string;
  health: ReactNode;
  secretLabel: string;
  baseUrlLabel: string;
  healthLabel: string;
  actions?: ReactNode;
}) {
  return (
    <article className="provider-card">
      <div>
        <h3>{name}</h3>
        <p>{type}</p>
      </div>
      <dl>
        <div>
          <dt>{secretLabel}</dt>
          <dd>{secretState}</dd>
        </div>
        <div>
          <dt>{baseUrlLabel}</dt>
          <dd>{baseUrl}</dd>
        </div>
        <div>
          <dt>{healthLabel}</dt>
          <dd>{health}</dd>
        </div>
      </dl>
      {actions ? <Toolbar align="start">{actions}</Toolbar> : null}
    </article>
  );
}

export function GatewayStatusCard({
  status,
  defaultModel,
  keyCount,
  actions,
}: {
  status: AppSnapshot['dashboard']['gatewayStatus'];
  defaultModel: string;
  keyCount: string;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <article className="gateway-status-card">
      <div>
        <span className="page-eyebrow">{t('nav.gateway.overview.label')}</span>
        <h2>{status.running ? t('shell.gateway.running') : t('shell.gateway.stopped')}</h2>
        <p>
          {status.bindHost}:{status.port}
        </p>
      </div>
      <dl>
        <div>
          <dt>{t('gateway.defaultModel')}</dt>
          <dd>{defaultModel}</dd>
        </div>
        <div>
          <dt>{t('gateway.keyCount')}</dt>
          <dd>{keyCount}</dd>
        </div>
        <div>
          <dt>{t('gateway.recentError')}</dt>
          <dd>{status.recentError ?? t('common.none')}</dd>
        </div>
      </dl>
      {actions ? <Toolbar align="start">{actions}</Toolbar> : null}
    </article>
  );
}

export function LoadingState({ title, detail }: { title: string; detail?: string }) {
  return (
    <section className="loading-state" aria-live="polite">
      <div className="skeleton-line" />
      <div>
        <h3>{title}</h3>
        {detail ? <p>{detail}</p> : null}
      </div>
    </section>
  );
}

export function ErrorState({ title, detail, actions }: { title: string; detail?: string; actions?: ReactNode }) {
  return (
    <section className="error-state" role="alert">
      <div>
        <h3>{title}</h3>
        {detail ? <p>{detail}</p> : null}
      </div>
      {actions ? <div className="toolbar">{actions}</div> : null}
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div>
        <strong>{label}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <div>{control}</div>
    </div>
  );
}

export function FormField({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : help ? <small>{help}</small> : null}
    </label>
  );
}

export function ConfirmDangerZone({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="danger-zone">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="toolbar">{children}</div>
    </section>
  );
}
