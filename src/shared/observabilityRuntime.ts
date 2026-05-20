import type {
  AuditLog,
  ExecutionTraceEvent,
  GatewayLog,
  KnowledgeRetrievalTrace,
  Provider,
  RequestLog,
  UsageRecord,
} from './types.js';

export const OBSERVABILITY_METRIC_NAMES = [
  'requests',
  'failed_requests',
  'gateway_events',
  'input_tokens',
  'output_tokens',
  'estimated_cost',
  'audit_events',
  'trace_events',
  'feedback_items',
  'eval_results',
] as const;

export type ObservabilityMetricName = (typeof OBSERVABILITY_METRIC_NAMES)[number];

export const OBSERVABILITY_LOG_EVENT_TYPES = [
  'request',
  'gateway',
  'audit',
  'trace',
  'retrieval',
  'feedback',
  'evaluation',
  'health',
] as const;

export type ObservabilityLogEventType = (typeof OBSERVABILITY_LOG_EVENT_TYPES)[number];

export const OBSERVABILITY_FEEDBACK_LABELS = ['thumbs_up', 'thumbs_down', 'bug', 'unsafe', 'other'] as const;
export type ObservabilityFeedbackLabel = (typeof OBSERVABILITY_FEEDBACK_LABELS)[number];

export const OBSERVABILITY_EVAL_STATUSES = ['draft', 'running', 'completed', 'failed'] as const;
export type ObservabilityEvalStatus = (typeof OBSERVABILITY_EVAL_STATUSES)[number];

export const OBSERVABILITY_RETENTION_POLICIES = ['seven_days', 'thirty_days', 'ninety_days', 'forever'] as const;
export type ObservabilityRetentionPolicy = (typeof OBSERVABILITY_RETENTION_POLICIES)[number];

export const OBSERVABILITY_EXPORT_SCOPES = ['summary', 'redacted_details'] as const;
export type ObservabilityExportScope = (typeof OBSERVABILITY_EXPORT_SCOPES)[number];

export interface ObservabilityQueryInput {
  query?: string;
  status?: RequestLog['status'] | 'all';
  providerId?: string | null;
  modelId?: string | null;
  endpoint?: string | null;
  includeAudit?: boolean;
  includeTrace?: boolean;
  since?: number | null;
  until?: number | null;
}

export interface ObservabilityPrivacySettings {
  retentionPolicy: ObservabilityRetentionPolicy;
  exportScope: ObservabilityExportScope;
  includePromptSnippets: boolean;
  includeLocalPaths: boolean;
  cloudTelemetryEnabled: boolean;
  updatedAt: number;
}

export interface ObservabilitySummary {
  requestCount: number;
  failedRequestCount: number;
  successRate: number;
  gatewayEventCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  averageLatencyMs: number | null;
  p95LatencyMs: number | null;
  auditEventCount: number;
  traceEventCount: number;
  retrievalCount: number;
  feedbackCount: number;
  evalResultCount: number;
  providerHealth: Array<{
    providerId: string;
    providerName: string;
    status: Provider['healthStatus'];
    lastCheckedAt: number | null;
    requestCount: number;
    failureCount: number;
    averageLatencyMs: number | null;
  }>;
  topErrors: Array<{ code: string; count: number }>;
}

export interface ObservabilitySourceData {
  providers: Provider[];
  requestLogs: RequestLog[];
  gatewayLogs: GatewayLog[];
  usageRecords: UsageRecord[];
  auditLogs: AuditLog[];
  executionTraceEvents: ExecutionTraceEvent[];
  knowledgeRetrievals: KnowledgeRetrievalTrace[];
  feedbackCount: number;
  evalResultCount: number;
}

export type UsageTrendBucketSize = 'hour' | 'day';

export interface UsageTrendPoint {
  bucketStart: number;
  bucketEnd: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
  hasTokenData: boolean;
}

export interface UsageTrendSummary {
  bucketSize: UsageTrendBucketSize;
  points: UsageTrendPoint[];
  totals: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    requestCount: number;
  };
  hasData: boolean;
}

export const DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS: ObservabilityPrivacySettings = {
  retentionPolicy: 'ninety_days',
  exportScope: 'redacted_details',
  includePromptSnippets: false,
  includeLocalPaths: false,
  cloudTelemetryEnabled: false,
  updatedAt: 0,
};

export const OBSERVABILITY_REDACTION_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /sk-[A-Za-z0-9._-]{8,}/gi,
  /nxk_[A-Za-z0-9]+/gi,
  /[A-Za-z]:\\[^"\n\r\t]+/g,
  /\/Users\/[^"\n\r\t]+/g,
] as const;

export function normalizeObservabilityQuery(input: ObservabilityQueryInput = {}): Required<ObservabilityQueryInput> {
  return {
    query: input.query?.trim() ?? '',
    status: input.status ?? 'all',
    providerId: input.providerId ?? null,
    modelId: input.modelId ?? null,
    endpoint: input.endpoint ?? null,
    includeAudit: input.includeAudit === true,
    includeTrace: input.includeTrace === true,
    since: input.since ?? null,
    until: input.until ?? null,
  };
}

export function normalizeObservabilityPrivacySettings(input: Partial<ObservabilityPrivacySettings> = {}): ObservabilityPrivacySettings {
  return {
    retentionPolicy: isRetentionPolicy(input.retentionPolicy) ? input.retentionPolicy : DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS.retentionPolicy,
    exportScope: isExportScope(input.exportScope) ? input.exportScope : DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS.exportScope,
    includePromptSnippets: input.includePromptSnippets === true,
    includeLocalPaths: input.includeLocalPaths === true,
    cloudTelemetryEnabled: input.cloudTelemetryEnabled === true,
    updatedAt: Number.isFinite(input.updatedAt) ? Number(input.updatedAt) : Date.now(),
  };
}

export function filterObservabilityRequestLogs(requestLogs: RequestLog[], input: ObservabilityQueryInput = {}): RequestLog[] {
  const query = normalizeObservabilityQuery(input);
  const text = query.query.toLowerCase();
  return requestLogs.filter((log) => {
    if (query.status !== 'all' && log.status !== query.status) return false;
    if (query.providerId && log.providerId !== query.providerId) return false;
    if (query.modelId && log.modelId !== query.modelId) return false;
    if (query.endpoint && log.endpoint !== query.endpoint) return false;
    if (query.since && log.createdAt < query.since) return false;
    if (query.until && log.createdAt > query.until) return false;
    if (!text) return true;
    return [
      log.id,
      log.gatewayRequestId,
      log.endpoint,
      log.modelNameSnapshot,
      log.status,
      log.errorCode,
      log.errorMessage,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(text);
  });
}

export function buildObservabilitySummary(data: ObservabilitySourceData): ObservabilitySummary {
  const completed = data.requestLogs.filter((log) => log.status === 'completed');
  const failed = data.requestLogs.filter((log) => log.status === 'failed' || log.status === 'cancelled');
  const latencies = data.requestLogs
    .map((log) => log.latencyMs)
    .filter((latency): latency is number => typeof latency === 'number' && Number.isFinite(latency))
    .sort((a, b) => a - b);
  const totalRequests = data.requestLogs.length;
  const providerHealth = data.providers.map((provider) => {
    const providerLogs = data.requestLogs.filter((log) => log.providerId === provider.id);
    const providerLatencies = providerLogs
      .map((log) => log.latencyMs)
      .filter((latency): latency is number => typeof latency === 'number' && Number.isFinite(latency));
    const failureCount = providerLogs.filter((log) => log.status === 'failed' || log.status === 'cancelled').length;
    return {
      providerId: provider.id,
      providerName: provider.name,
      status: provider.healthStatus,
      lastCheckedAt: provider.lastCheckedAt,
      requestCount: providerLogs.length,
      failureCount,
      averageLatencyMs: average(providerLatencies),
    };
  });

  return {
    requestCount: totalRequests,
    failedRequestCount: failed.length,
    successRate: totalRequests > 0 ? completed.length / totalRequests : 1,
    gatewayEventCount: data.gatewayLogs.length,
    inputTokens: data.usageRecords.reduce((sum, record) => sum + record.inputTokens, 0),
    outputTokens: data.usageRecords.reduce((sum, record) => sum + record.outputTokens, 0),
    estimatedCost: data.usageRecords.reduce((sum, record) => sum + record.costEstimate, 0),
    averageLatencyMs: average(latencies),
    p95LatencyMs: percentile(latencies, 0.95),
    auditEventCount: data.auditLogs.length,
    traceEventCount: data.executionTraceEvents.length,
    retrievalCount: data.knowledgeRetrievals.length,
    feedbackCount: data.feedbackCount,
    evalResultCount: data.evalResultCount,
    providerHealth,
    topErrors: topErrors(data.requestLogs, data.gatewayLogs),
  };
}

export function buildUsageTrend(
  usageRecords: UsageRecord[],
  options: { bucketSize?: UsageTrendBucketSize; since?: number; until?: number } = {},
): UsageTrendSummary {
  const bucketSize = options.bucketSize ?? 'day';
  const intervalMs = bucketSize === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const records = usageRecords
    .filter((record) => Number.isFinite(record.createdAt))
    .filter((record) => options.since === undefined || record.createdAt >= options.since!)
    .filter((record) => options.until === undefined || record.createdAt <= options.until!)
    .sort((left, right) => left.createdAt - right.createdAt);
  const buckets = new Map<number, UsageTrendPoint>();

  for (const record of records) {
    const bucketStart = Math.floor(record.createdAt / intervalMs) * intervalMs;
    const existing = buckets.get(bucketStart) ?? {
      bucketStart,
      bucketEnd: bucketStart + intervalMs - 1,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      requestCount: 0,
      hasTokenData: false,
    };
    const inputTokens = safeTokenCount(record.inputTokens);
    const outputTokens = safeTokenCount(record.outputTokens);
    existing.inputTokens += inputTokens;
    existing.outputTokens += outputTokens;
    existing.totalTokens += inputTokens + outputTokens;
    existing.requestCount += 1;
    existing.hasTokenData = existing.hasTokenData || inputTokens > 0 || outputTokens > 0;
    buckets.set(bucketStart, existing);
  }

  const points = [...buckets.values()].sort((left, right) => left.bucketStart - right.bucketStart);
  const totals = points.reduce(
    (summary, point) => ({
      inputTokens: summary.inputTokens + point.inputTokens,
      outputTokens: summary.outputTokens + point.outputTokens,
      totalTokens: summary.totalTokens + point.totalTokens,
      requestCount: summary.requestCount + point.requestCount,
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, requestCount: 0 },
  );

  return {
    bucketSize,
    points,
    totals,
    hasData: points.some((point) => point.hasTokenData),
  };
}

export function redactObservabilityValue(value: unknown, settings: ObservabilityPrivacySettings = DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    let next = settings.includePromptSnippets
      ? value
      : value
        .replace(/"(message|messages|prompt|input|content|notes|query|outputPreview|redactedPreview)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"')
        .replace(/"(prompt|input|content|notes|query)"\s*:\s*\[[\s\S]*?\]/gi, '"$1":["[REDACTED]"]');
    if (!settings.includeLocalPaths) {
      next = next.replace(/[A-Za-z]:\\[^"\n\r\t]+/g, '[LOCAL_PATH_REDACTED]').replace(/\/Users\/[^"\n\r\t]+/g, '[LOCAL_PATH_REDACTED]');
    }
    return OBSERVABILITY_REDACTION_PATTERNS.reduce((current, pattern) => current.replace(pattern, '[REDACTED]'), next);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactObservabilityValue(item, settings));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        /authorization|api.?key|secret|token|password|credential/i.test(key)
          ? '[REDACTED]'
          : !settings.includePromptSnippets && /prompt|input|content|messages?|notes|query|outputPreview|redactedPreview/i.test(key)
          ? '[REDACTED]'
          : redactObservabilityValue(item, settings),
      ]),
    );
  }
  return value;
}

export function buildRedactedObservabilityExport(data: unknown, settings: ObservabilityPrivacySettings): string {
  return JSON.stringify(
    {
      exportedAt: Date.now(),
      redacted: true,
      retentionPolicy: settings.retentionPolicy,
      exportScope: settings.exportScope,
      cloudTelemetryEnabled: false,
      data: redactObservabilityValue(data, settings),
    },
    null,
    2,
  );
}

function safeTokenCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1));
  return values[index];
}

function topErrors(requestLogs: RequestLog[], gatewayLogs: GatewayLog[]): Array<{ code: string; count: number }> {
  const counts = new Map<string, number>();
  const codes: string[] = [
    ...requestLogs.flatMap((log) => isString(log.errorCode) ? [log.errorCode] : []),
    ...gatewayLogs.flatMap((log) => isString(log.errorCode) ? [log.errorCode] : []),
  ];
  for (const code of codes) {
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRetentionPolicy(value: unknown): value is ObservabilityRetentionPolicy {
  return (OBSERVABILITY_RETENTION_POLICIES as readonly unknown[]).includes(value);
}

function isExportScope(value: unknown): value is ObservabilityExportScope {
  return (OBSERVABILITY_EXPORT_SCOPES as readonly unknown[]).includes(value);
}
