import type { ReactNode } from 'react';
import type { AppApi, AppSnapshot, ContextStrategy, ModuleId, NavTab, ProviderType } from '../../shared/types';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/StatusPill';

export const providerTypes: ProviderType[] = ['openai-compatible', 'openai', 'anthropic', 'gemini', 'deepseek', 'qwen', 'ollama', 'lm-studio', 'custom'];
export const contextStrategies: Array<{ value: ContextStrategy; label: string }> = [
  { value: 'recent_n', label: '最近 N 轮' },
  { value: 'summary_recent_n', label: '摘要 + 最近' },
  { value: 'manual', label: '手动选择' },
  { value: 'token_trim', label: 'Token 自动裁剪' },
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
        <StateBadge label={stageLabelForUi(tab.stage)} tone={tab.stage === 'implemented' ? 'success' : tab.stage === 'reserved' ? 'muted' : 'warning'} />
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
  return (
    <section className="panel planned-panel placeholder-panel">
      <div className="panel-header">
        <div>
          <h2>{featureName}</h2>
          <p>当前阶段：{stageLabelForUi(tab.stage)}</p>
        </div>
        <StatusPill stage={tab.stage} />
      </div>
      <dl className="detail-list">
        <div>
          <dt>为什么未开放</dt>
          <dd>{why}</dd>
        </div>
        <div>
          <dt>下一实现依赖</dt>
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

export function stageLabelForUi(stage: NavTab['stage']): string {
  if (stage === 'implemented') return '已实现';
  if (stage === 'planned') return '计划中';
  if (stage === 'reserved') return '预留';
  if (stage === 'environment-limited') return '环境受限';
  return 'Ready';
}

export function healthTone(status: string): 'success' | 'warning' | 'error' | 'muted' {
  if (status === 'healthy') return 'success';
  if (status === 'error') return 'error';
  if (status === 'warning') return 'warning';
  return 'muted';
}

export function getDefaultModel(snapshot: AppSnapshot) {
  return (
    snapshot.models.find((model) => model.id === snapshot.dashboard.workspace.defaultModelId) ??
    snapshot.models.find((model) => model.enabled) ??
    snapshot.models[0] ??
    null
  );
}

export function formatMessageMetadata(metadataJson: string): string {
  try {
    const metadata = JSON.parse(metadataJson) as { routeReason?: string; fallbackUsed?: boolean; contextStrategy?: string; citations?: unknown[] };
    return [
      metadata.routeReason ? `路由：${metadata.routeReason}` : 'metadata: local trace 已保存',
      metadata.fallbackUsed ? '使用 fallback' : null,
      metadata.contextStrategy ? `上下文：${metadata.contextStrategy}` : null,
      Array.isArray(metadata.citations) ? `引用线索：${metadata.citations.length}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  } catch {
    return 'metadata: local trace 已保存';
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
  if (rows.length === 0) {
    return (
      <EmptyState
        title="暂无数据"
        reason="此模块还没有本地记录。"
        actionLabel="使用上方操作创建"
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
