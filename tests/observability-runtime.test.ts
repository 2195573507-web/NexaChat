import { describe, expect, it } from 'vitest';
import {
  buildObservabilitySummary,
  buildUsageTrend,
  buildRedactedObservabilityExport,
  filterObservabilityRequestLogs,
  normalizeObservabilityQuery,
  normalizeObservabilityPrivacySettings,
} from '../src/shared/observabilityRuntime';
import type { AuditLog, ExecutionTraceEvent, GatewayLog, KnowledgeRetrievalTrace, Provider, RequestLog, UsageRecord } from '../src/shared/types';

describe('Round 13 observability runtime', () => {
  it('normalizes observability query privacy flags to metadata-only defaults', () => {
    expect(normalizeObservabilityQuery()).toMatchObject({
      includeAudit: false,
      includeTrace: false,
    });
    expect(normalizeObservabilityQuery({ includeAudit: true, includeTrace: true })).toMatchObject({
      includeAudit: true,
      includeTrace: true,
    });
    expect(normalizeObservabilityQuery({ includeAudit: false, includeTrace: false })).toMatchObject({
      includeAudit: false,
      includeTrace: false,
    });
  });

  it('filters request logs and builds usage health and error summaries without duplicate log stores', () => {
    const requestLogs: RequestLog[] = [
      requestLog({ id: 'req_1', providerId: 'provider_1', modelId: 'model_1', status: 'completed', inputTokens: 8, outputTokens: 13, latencyMs: 40 }),
      requestLog({ id: 'req_2', providerId: 'provider_1', modelId: 'model_1', status: 'failed', errorCode: 'timeout', errorMessage: 'timeout', latencyMs: 200 }),
    ];
    const gatewayLogs: GatewayLog[] = [
      gatewayLog({ id: 'gateway_1', requestLogId: 'req_2', statusCode: 502, errorCode: 'provider_error' }),
    ];
    const providers: Provider[] = [provider({ id: 'provider_1', name: 'Runtime Provider', healthStatus: 'healthy' })];
    const usageRecords: UsageRecord[] = [usageRecord({ requestLogId: 'req_1', inputTokens: 8, outputTokens: 13 })];
    const filtered = filterObservabilityRequestLogs(requestLogs, { status: 'failed', query: 'timeout' });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('req_2');

    const summary = buildObservabilitySummary({
      providers,
      requestLogs,
      gatewayLogs,
      usageRecords,
      auditLogs: [auditLog()],
      executionTraceEvents: [traceEvent()],
      knowledgeRetrievals: [retrievalTrace()],
      feedbackCount: 2,
      evalResultCount: 1,
    });

    expect(summary.requestCount).toBe(2);
    expect(summary.failedRequestCount).toBe(1);
    expect(summary.inputTokens).toBe(8);
    expect(summary.outputTokens).toBe(13);
    expect(summary.providerHealth[0].requestCount).toBe(2);
    expect(summary.topErrors.map((item) => item.code)).toContain('timeout');
    expect(summary.topErrors.map((item) => item.code)).toContain('provider_error');
  });

  it('aggregates real usage records into token trend buckets without synthetic data', () => {
    const day = 24 * 60 * 60 * 1000;
    const usageRecords: UsageRecord[] = [
      usageRecord({ requestLogId: 'req_1', inputTokens: 8, outputTokens: 13, createdAt: day + 1000 }),
      usageRecord({ requestLogId: 'req_2', inputTokens: 5, outputTokens: 7, createdAt: day + 2000 }),
      usageRecord({ requestLogId: 'req_3', inputTokens: 3, outputTokens: 2, createdAt: day * 2 + 1000 }),
    ];

    const trend = buildUsageTrend(usageRecords, { bucketSize: 'day' });

    expect(trend.hasData).toBe(true);
    expect(trend.points).toHaveLength(2);
    expect(trend.points[0]).toMatchObject({
      inputTokens: 13,
      outputTokens: 20,
      totalTokens: 33,
      requestCount: 2,
      hasTokenData: true,
    });
    expect(trend.totals).toEqual({
      inputTokens: 16,
      outputTokens: 22,
      totalTokens: 38,
      requestCount: 3,
    });
    expect(buildUsageTrend([], { bucketSize: 'day' })).toMatchObject({ hasData: false, points: [] });
  });

  it('does not treat request-only usage records as drawable token trend data', () => {
    const trend = buildUsageTrend([
      usageRecord({ requestLogId: 'req_without_tokens', inputTokens: 0, outputTokens: 0 }),
    ]);

    expect(trend.hasData).toBe(false);
    expect(trend.totals).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      requestCount: 1,
    });
    expect(trend.points[0]).toMatchObject({ requestCount: 1, hasTokenData: false });
  });

  it('redacts keys prompts and local paths from observability exports by default', () => {
    const settings = normalizeObservabilityPrivacySettings({
      includePromptSnippets: false,
      includeLocalPaths: false,
      updatedAt: 1,
    });
    const content = buildRedactedObservabilityExport({
      authorization: 'Bearer sk-round-13-secret',
      gatewayKey: 'nxk_observability_secret',
      requestSummaryJson: '{"message":"hello secret","redactedPreview":"nxk_preview_secret"}',
      prompt: 'private eval prompt',
      input: 'private input',
      content: 'private content',
      notes: 'private notes',
      query: 'private query',
      outputPreview: 'private output',
      localPath: 'C:\\Users\\Example\\secret.txt',
    }, settings);

    expect(content).not.toContain('sk-round-13-secret');
    expect(content).not.toContain('nxk_observability_secret');
    expect(content).not.toContain('nxk_preview_secret');
    expect(content).not.toContain('hello secret');
    expect(content).not.toContain('private eval prompt');
    expect(content).not.toContain('private input');
    expect(content).not.toContain('private content');
    expect(content).not.toContain('private notes');
    expect(content).not.toContain('private query');
    expect(content).not.toContain('private output');
    expect(content).not.toContain('C:\\Users\\Example');
    expect(content).toContain('[REDACTED]');
  });

  it('can include benign prompt snippets while still redacting secrets', () => {
    const settings = normalizeObservabilityPrivacySettings({
      includePromptSnippets: true,
      includeLocalPaths: false,
      updatedAt: 1,
    });
    const content = buildRedactedObservabilityExport({
      prompt: 'benign prompt snippet',
      apiKey: 'sk-round-13-secret',
      localPath: 'C:\\Users\\Example\\secret.txt',
    }, settings);

    expect(content).toContain('benign prompt snippet');
    expect(content).not.toContain('sk-round-13-secret');
    expect(content).not.toContain('C:\\Users\\Example');
  });
});

function requestLog(input: Partial<RequestLog>): RequestLog {
  return {
    id: input.id ?? 'req',
    conversationId: null,
    messageId: null,
    providerId: input.providerId ?? null,
    modelId: input.modelId ?? null,
    modelNameSnapshot: 'model',
    routeId: null,
    gatewayRequestId: null,
    status: input.status ?? 'completed',
    endpoint: '/v1/chat/completions',
    requestSummaryJson: null,
    responseSummaryJson: null,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    latencyMs: input.latencyMs ?? null,
    finishReason: 'stop',
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
    startedAt: 1,
    completedAt: 2,
    createdAt: 1,
  };
}

function gatewayLog(input: Partial<GatewayLog>): GatewayLog {
  return {
    id: input.id ?? 'gateway',
    requestLogId: input.requestLogId ?? null,
    gatewayKeyId: null,
    keyPreview: null,
    scope: null,
    errorCode: input.errorCode ?? null,
    latencyMs: null,
    remoteAddress: null,
    method: 'POST',
    path: '/v1/chat/completions',
    statusCode: input.statusCode ?? 200,
    redactedHeadersJson: null,
    createdAt: 1,
  };
}

function provider(input: Pick<Provider, 'id' | 'name' | 'healthStatus'>): Provider {
  return {
    id: input.id,
    name: input.name,
    type: 'openai-compatible',
    baseUrl: 'http://127.0.0.1:11434/v1',
    proxyUrl: null,
    authType: 'none',
    secretRef: null,
    customHeadersJson: null,
    enabled: true,
    healthStatus: input.healthStatus,
    lastCheckedAt: 1,
    createdAt: 1,
    updatedAt: 1,
  };
}

function usageRecord(input: Partial<UsageRecord>): UsageRecord {
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  return {
    id: 'usage_1',
    workspaceId: 'ws_default',
    providerId: 'provider_1',
    modelId: 'model_1',
    requestLogId: input.requestLogId ?? null,
    requestType: input.requestType ?? 'chat',
    inputTokens,
    outputTokens,
    totalTokens: input.totalTokens ?? inputTokens + outputTokens,
    tokenUsageEstimated: input.tokenUsageEstimated ?? false,
    latencyMs: input.latencyMs ?? null,
    status: input.status ?? 'completed',
    errorCode: input.errorCode ?? null,
    costEstimate: 0,
    createdAt: input.createdAt ?? 1,
  };
}

function auditLog(): AuditLog {
  return {
    id: 'audit_1',
    action: 'test',
    actor: 'test',
    targetType: 'request',
    targetId: 'req_1',
    detailsJson: null,
    permissionKey: null,
    previousHash: null,
    entryHash: null,
    integrityState: 'verified',
    createdAt: 1,
  };
}

function traceEvent(): ExecutionTraceEvent {
  return {
    id: 'trace_1',
    runId: 'run_1',
    stepId: null,
    eventType: 'run_planned',
    message: 'started',
    metadataJson: null,
    createdAt: 1,
  };
}

function retrievalTrace(): KnowledgeRetrievalTrace {
  return {
    id: 'retrieval_1',
    query: 'local',
    strategy: 'lexical',
    topK: 3,
    providerId: null,
    modelId: null,
    modelNameSnapshot: null,
    knowledgeScopeJson: JSON.stringify({ test: true }),
    candidateCount: 1,
    vectorCandidateCount: 0,
    lexicalCandidateCount: 1,
    finalCitationCount: 1,
    scoreSummaryJson: JSON.stringify({ rerank: 'disabled' }),
    timingsJson: JSON.stringify({ totalMs: 1 }),
    errorCode: null,
    errorMessage: null,
    selectedChunkIdsJson: JSON.stringify(['chunk_1']),
    resultCount: 1,
    fallbackReason: null,
    createdAt: 1,
  };
}
