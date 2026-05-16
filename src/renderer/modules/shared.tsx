import type { ReactNode } from 'react';
import type { AppApi } from '../../shared/api';
import type { AppSnapshot, ContextStrategy, ModuleId, NavTab, ProviderType } from '../../shared/types';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/StatusPill';
import { useI18n, type Translate } from '../i18n';

export const providerTypes: ProviderType[] = ['openai-compatible', 'openai', 'anthropic', 'gemini', 'deepseek', 'qwen', 'ollama', 'lm-studio', 'custom'];
export const contextStrategies: Array<{ value: ContextStrategy; labelKey: Parameters<Translate>[0] }> = [
  { value: 'recent_n', labelKey: 'shared.context.recentN' },
  { value: 'summary_recent_n', labelKey: 'shared.context.summaryRecentN' },
  { value: 'manual', labelKey: 'shared.context.manual' },
  { value: 'token_trim', labelKey: 'shared.context.tokenTrim' },
];

export type OpenModuleTarget = ModuleId | { moduleId: ModuleId; tabId?: string };
export type TabPageProps = {
  activeTab: NavTab;
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
  onOpenModule: (target: OpenModuleTarget) => void;
};

export function TabPanel({
  moduleId,
  tab,
  className,
  children,
}: {
  moduleId: ModuleId;
  tab: NavTab;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div
      id={`panel-${moduleId}-${tab.id}`}
      className={['page-stack', className].filter(Boolean).join(' ')}
      role="tabpanel"
      aria-label={tab.label}
      data-module={moduleId}
      data-tab={tab.id}
    >
      <section className="tab-title">
        <div>
          <h2>{tab.label}</h2>
          {tab.description ? <p>{tab.description}</p> : null}
        </div>
        <StateBadge label={stageLabelForUi(tab.stage, t)} tone={tab.stage === 'implemented' ? 'success' : tab.stage === 'reserved' ? 'muted' : 'warning'} />
      </section>
      {children}
    </div>
  );
}

export function PlannedTabPlaceholder({
  tab,
  featureName,
  why,
  dependency,
}: {
  tab: NavTab;
  featureName: string;
  why: string;
  dependency: string;
}) {
  const { t } = useI18n();
  return (
    <section className="panel planned-panel placeholder-panel">
      <div className="panel-header">
        <div>
          <h2>{featureName}</h2>
          <p>{t('shared.planned.currentStage', { stage: stageLabelForUi(tab.stage, t) })}</p>
        </div>
        <StatusPill stage={tab.stage} />
      </div>
      <dl className="detail-list">
        <div>
          <dt>{t('shared.planned.why')}</dt>
          <dd>{why}</dd>
        </div>
        <div>
          <dt>{t('shared.planned.dependency')}</dt>
          <dd>{dependency}</dd>
        </div>
      </dl>
    </section>
  );
}

export function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return (
    <article className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export function StateBadge({ label, tone }: { label: string; tone: 'success' | 'warning' | 'error' | 'muted' }) {
  return <span className={`state-badge state-${tone}`}>{label}</span>;
}

export function stageLabelForUi(stage: NavTab['stage'], t: Translate): string {
  if (stage === 'implemented') return t('stage.implemented');
  if (stage === 'planned') return t('stage.planned');
  if (stage === 'reserved') return t('stage.reserved');
  if (stage === 'environment-limited') return t('stage.environment-limited');
  return t('stage.ready');
}

export function healthTone(status: string): 'success' | 'warning' | 'error' | 'muted' {
  if (status === 'healthy') return 'success';
  if (status === 'error') return 'error';
  if (status === 'warning') return 'warning';
  return 'muted';
}

export function statusLabel(status: string, t: Translate): string {
  if (status === 'healthy') return t('common.available');
  if (status === 'error') return t('common.error');
  if (status === 'warning') return t('common.warning');
  if (status === 'unknown') return t('common.unknown');
  if (status === 'queued') return t('common.queued');
  if (status === 'parsing') return t('common.parsing');
  if (status === 'indexed') return t('common.indexed');
  if (status === 'indexing') return t('common.indexing');
  if (status === 'embedded') return t('common.embedded');
  if (status === 'failed') return t('common.failed');
  if (status === 'stale') return t('common.stale');
  if (status === 'discovered') return t('common.discovered');
  if (status === 'granted') return t('common.granted');
  if (status === 'denied') return t('common.denied');
  if (status === 'always') return t('common.always');
  if (status === 'destructive-only') return t('common.destructiveOnly');
  if (status === 'never') return t('common.never');
  if (status === 'ready') return t('stage.ready');
  if (status === 'completed') return t('common.completed');
  if (status === 'started') return t('common.started');
  if (status === 'streaming') return t('common.streaming');
  if (status === 'cancelled') return t('common.cancelled');
  if (status === 'draft') return t('common.draft');
  if (status === 'deleted') return t('common.deleted');
  if (status === 'active') return t('common.active');
  if (status === 'archived') return t('common.archived');
  if (status === 'unknown') return t('common.unknown');
  return status;
}

export function providerTypeLabel(type: ProviderType, t: Translate): string {
  if (type === 'openai-compatible') return t('provider.type.openaiCompatible');
  if (type === 'openai') return t('provider.type.openai');
  if (type === 'anthropic') return t('provider.type.anthropic');
  if (type === 'gemini') return t('provider.type.gemini');
  if (type === 'deepseek') return t('provider.type.deepseek');
  if (type === 'qwen') return t('provider.type.qwen');
  if (type === 'ollama') return t('provider.type.ollama');
  if (type === 'lm-studio') return t('provider.type.lmStudio');
  return t('provider.type.custom');
}

export function modelCapabilityLabels(model: AppSnapshot['models'][number], t: Translate): string {
  const labels = [
    model.supportsStreaming ? t('common.streaming') : null,
    model.supportsTools ? t('common.tools') : null,
    model.supportsVision ? t('common.vision') : null,
    model.supportsEmbeddings ? t('common.embeddings') : null,
  ].filter(Boolean);
  return labels.length > 0 ? labels.join(', ') : t('common.none');
}

export function getDefaultModel(snapshot: AppSnapshot) {
  return (
    snapshot.models.find((model) => model.id === snapshot.dashboard.workspace.defaultModelId) ??
    snapshot.models.find((model) => model.enabled) ??
    snapshot.models[0] ??
    null
  );
}

export function formatMessageMetadata(metadataJson: string, t: Translate): string {
  try {
    const metadata = JSON.parse(metadataJson) as { routeReason?: string; fallbackUsed?: boolean; contextStrategy?: string; citations?: unknown[]; retrievalId?: string };
    return [
      metadata.routeReason ? t('shared.metadata.route', { reason: metadata.routeReason }) : t('shared.metadata.localTrace'),
      metadata.fallbackUsed ? t('shared.metadata.fallback') : null,
      metadata.contextStrategy ? t('shared.metadata.context', { strategy: metadata.contextStrategy }) : null,
      metadata.retrievalId ? t('shared.metadata.retrieval', { id: metadata.retrievalId }) : null,
      Array.isArray(metadata.citations) ? t('shared.metadata.citations', { count: metadata.citations.length }) : null,
    ]
      .filter(Boolean)
      .join(' · ');
  } catch {
    return t('shared.metadata.localTrace');
  }
}

export function formatRequestLog(log: AppSnapshot['requestLogs'][number]): string {
  return [
    `status=${log.status}`,
    `endpoint=${log.endpoint}`,
    `model=${log.modelNameSnapshot ?? '-'}`,
    `error=${log.errorMessage ?? '-'}`,
    `request=${log.requestSummaryJson ?? '-'}`,
  ].join('\n');
}

export function copyText(value: string): void {
  void navigator.clipboard?.writeText(value);
}

export function ListRows({
  rows,
  empty,
}: {
  rows: Array<{ title: string; meta: string }>;
  empty: ReactNode;
}) {
  if (rows.length === 0) {
    return <>{empty}</>;
  }
  return (
    <div className="rows">
      {rows.map((row) => (
        <div className="basic-row" key={`${row.title}-${row.meta}`}>
          <strong>{row.title}</strong>
          <span>{row.meta}</span>
        </div>
      ))}
    </div>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<ReactNode>> }) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return (
      <EmptyState
        title={t('shared.empty.title')}
        reason={t('shared.empty.reason')}
        actionLabel={t('shared.empty.action')}
      />
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
