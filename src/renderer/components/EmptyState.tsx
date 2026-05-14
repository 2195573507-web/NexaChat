import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  reason: string;
  actionLabel?: string;
  onAction?: () => void;
  secondary?: ReactNode;
}

export function EmptyState({ title, reason, actionLabel, onAction, secondary }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <div>
        <h3>{title}</h3>
        <p>{reason}</p>
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
      {secondary ? <div className="empty-secondary">{secondary}</div> : null}
    </section>
  );
}
