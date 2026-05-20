import type { ReactNode } from 'react';
import { PROVIDER_CATALOG, type ProviderCatalogEntry } from '../../shared/providerCatalog';
import type { AppApi } from '../../shared/api';
import type { AppSnapshot, ContextStrategy, ModuleId, NavTab, ProviderType } from '../../shared/types';
import type { Translate } from '../i18n';

export const providerTypes: ProviderType[] = PROVIDER_CATALOG.map((entry) => entry.type);

export const contextStrategies: Array<{ value: ContextStrategy; labelKey: Parameters<Translate>[0] }> = [
  { value: 'recent_n', labelKey: 'shared.context.recentN' },
  { value: 'summary_recent_n', labelKey: 'shared.context.summaryRecentN' },
  { value: 'manual', labelKey: 'shared.context.manual' },
  { value: 'token_trim', labelKey: 'shared.context.tokenTrim' },
];

export type OpenModuleTarget = ModuleId | { moduleId: ModuleId; tabId?: string };

export type ActionRefreshMode = 'none' | 'module' | 'full' | 'patch';

export type ActionRunOptions = {
  refresh?: ActionRefreshMode;
  patch?: (snapshot: AppSnapshot, result: unknown) => AppSnapshot;
};

export type TabPageProps = {
  activeTab: NavTab;
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>, options?: ActionRunOptions) => void;
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
  return (
    <div
      id={`panel-${moduleId}-${tab.id}`}
      className={['page-stack', className].filter(Boolean).join(' ')}
      role="region"
      aria-label={tab.label}
      data-module={moduleId}
      data-tab={tab.id}
    >
      {children}
    </div>
  );
}

export function providerTypeLabel(type: ProviderType, t: Translate): string {
  const entry = getProviderCatalogEntry(type);
  return t(entry.labelKey);
}

export function getProviderCatalogEntry(type: ProviderType): ProviderCatalogEntry {
  return PROVIDER_CATALOG.find((entry) => entry.type === type) ?? PROVIDER_CATALOG[0];
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

export function getDefaultProvider(snapshot: AppSnapshot) {
  const model = getDefaultModel(snapshot);
  return snapshot.providers.find((provider) => provider.id === model?.providerId) ?? snapshot.providers.find((provider) => provider.enabled) ?? null;
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
  if (status === 'planned') return t('stage.planned');
  if (status === 'running') return t('common.running');
  if (status === 'waiting_approval') return t('tools.execution.step.approval');
  if (status === 'pending') return t('common.queued');
  if (status === 'approved') return t('tools.approve');
  if (status === 'started') return t('common.started');
  if (status === 'streaming') return t('common.streaming');
  if (status === 'cancelled') return t('common.cancelled');
  if (status === 'draft') return t('common.draft');
  if (status === 'deleted') return t('common.deleted');
  if (status === 'active') return t('common.active');
  if (status === 'archived') return t('common.archived');
  if (status === 'available') return t('common.available');
  if (status === 'revoked') return t('common.revoked');
  if (status === 'disabled') return t('gateway.keyState.disabled');
  if (status === 'expired') return t('gateway.keyState.expired');
  if (status === 'quota_exceeded') return t('gateway.keyState.quota_exceeded');
  return status;
}

export function healthState(status: string): 'ready' | 'warning' | 'danger' | 'muted' {
  if (status === 'healthy' || status === 'completed' || status === 'active' || status === 'indexed') return 'ready';
  if (status === 'warning' || status === 'queued' || status === 'pending' || status === 'waiting_approval' || status === 'disabled' || status === 'quota_exceeded') return 'warning';
  if (status === 'error' || status === 'failed' || status === 'revoked' || status === 'denied') return 'danger';
  return 'muted';
}

export function formatDate(value: number | null | undefined, t: Translate): string {
  if (!value) {
    return t('common.none');
  }
  return new Intl.DateTimeFormat(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(value);
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
      .join(' / ');
  } catch {
    return t('shared.metadata.localTrace');
  }
}

export function truncate(value: string, max = 96) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
