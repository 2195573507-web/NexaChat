import type { ReactNode } from 'react';
import { UI_STATUS_DEFINITIONS, type UiStatusTone } from '../../shared/uiStatus';
import type { UiStatusState } from '../../shared/types';
import { useI18n } from '../i18n';

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
  return (
    <article className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
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
