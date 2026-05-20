import { redactSensitive } from '../security/redaction.js';
import { createId, estimateTokens, now } from '../utils/ids.js';
import { translate } from '../../shared/i18n.js';
import { PROVIDER_RUNTIME_ERROR_CODES, getProviderAdapterName } from '../../shared/providerRuntime.js';
import { SECURITY_ACTION_PERMISSIONS } from '../../shared/securityRuntime.js';
import {
  OBSERVABILITY_FEEDBACK_LABELS,
  buildObservabilitySummary,
  buildRedactedObservabilityExport,
  filterObservabilityRequestLogs,
  normalizeObservabilityQuery,
  type ObservabilityQueryInput
} from '../../shared/observabilityRuntime.js';
import type {
  EvalResult,
  EvalRunInput,
  EvalSet,
  FeedbackCreateInput,
  FeedbackItem,
  ObservabilityExportResult,
  ObservabilitySnapshot,
  RequestLog,
  UsageRecord,
  UsageTrendBucket,
  UsageTrendInput
} from '../../shared/types.js';
import { ProviderRuntimeError, invokeOpenAiCompatibleChat } from '../adapters/openAiCompatibleAdapter.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const DEFAULT_WORKSPACE_ID = 'ws_default';
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);



export function ObservabilityService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ObservabilityService extends Base {
  getRequestLogs(): RequestLog[] {
    return this.repositories.observability.listRequestLogs();
  }


  getUsageRecords(): UsageRecord[] {
    return this.repositories.observability.listUsageRecords();
  }

  getUsageTrend(input: UsageTrendInput = {}): UsageTrendBucket[] {
    return this.repositories.observability.aggregateUsageTrend(input);
  }


  getFeedbackItems(): FeedbackItem[] {
    return this.repositories.observability.listFeedbackItems();
  }


  getEvalSets(): EvalSet[] {
    return this.repositories.observability.listEvalSets();
  }


  getEvalResults(evalSetId?: string): EvalResult[] {
    return this.repositories.observability.listEvalResults(evalSetId);
  }


  queryObservability(input: ObservabilityQueryInput = {}): ObservabilitySnapshot {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityRead, 'observability', null);
    const query = normalizeObservabilityQuery(input);
    const requestLogs = filterObservabilityRequestLogs(this.getRequestLogs(), query);
    const requestLogIds = new Set(requestLogs.map((log) => log.id));
    const gatewayLogs = this.getGatewayLogs().filter((log) => !log.requestLogId || requestLogIds.has(log.requestLogId) || !query.query);
    const usageRecords = this.getUsageRecords().filter((record) => !record.requestLogId || requestLogIds.has(record.requestLogId));
    const auditLogs = query.includeAudit ? this.getAuditLogs() : [];
    const executionTraceEvents = query.includeTrace ? this.getExecutionTraceEvents() : [];
    const knowledgeRetrievals = this.getKnowledgeRetrievalTraces();
    const providerHealthRecords = this.getProviderHealthRecords().filter((record) =>
      (!query.providerId || record.providerId === query.providerId) && (!query.modelId || record.modelId === query.modelId),
    );
    const feedbackItems = this.getFeedbackItems().filter((item) => !item.requestLogId || requestLogIds.has(item.requestLogId));
    const evalSets = this.getEvalSets();
    const evalResults = this.getEvalResults().filter((result) =>
      (!query.providerId || result.providerId === query.providerId) && (!query.modelId || result.modelId === query.modelId),
    );
    const privacy = this.getObservabilityPrivacySettings();
    return {
      summary: buildObservabilitySummary({
        providers: this.getProviders(),
        requestLogs,
        gatewayLogs,
        usageRecords,
        auditLogs,
        executionTraceEvents,
        knowledgeRetrievals,
        feedbackCount: feedbackItems.length,
        evalResultCount: evalResults.length,
      }),
      query,
      requestLogs,
      gatewayLogs,
      usageRecords,
      auditLogs,
      executionTraceEvents,
      knowledgeRetrievals,
      providerHealthRecords,
      feedbackItems,
      evalSets,
      evalResults,
      privacy,
    };
  }


  createFeedback(input: FeedbackCreateInput): FeedbackItem {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityWrite, 'feedback', input.requestLogId ?? input.messageId ?? null);
    const label = OBSERVABILITY_FEEDBACK_LABELS.includes(input.label) ? input.label : 'other';
    const requestLog = input.requestLogId ? this.requireRequestLog(input.requestLogId) : null;
    const message = input.messageId ? this.requireMessage(input.messageId) : requestLog?.messageId ? this.requireMessage(requestLog.messageId) : null;
    const timestamp = now();
    const id = createId('feedback');
    this.db
      .prepare(
        `INSERT INTO feedback_items (id, label, message_id, request_log_id, notes, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        label,
        message?.id ?? null,
        requestLog?.id ?? input.requestLogId ?? null,
        input.notes ? redactSensitive(input.notes).slice(0, 500) : null,
        JSON.stringify({
          linkedProviderId: requestLog?.providerId ?? message?.providerId ?? null,
          linkedModelId: requestLog?.modelId ?? message?.modelId ?? null,
        }),
        timestamp,
      );
    this.audit('observability.feedback.created', 'feedback', id, { label, requestLogId: requestLog?.id ?? null }, SECURITY_ACTION_PERMISSIONS.observabilityWrite);
    return this.requireFeedbackItem(id);
  }


  async runEvaluation(input: EvalRunInput): Promise<EvalResult> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityWrite, 'eval_set', input.evalSetId);
    const evalSet = this.requireEvalSet(input.evalSetId);
    const routeDecision = this.route(undefined, input.modelId ?? undefined);
    const provider = this.requireProvider(routeDecision.providerId);
    const model = this.requireModel(routeDecision.modelId);
    const adapterName = getProviderAdapterName(provider.type);
    const timestamp = now();
    const requestLogId = createId('req');
    this.db
      .prepare(
        `INSERT INTO request_logs (id, conversation_id, message_id, provider_id, model_id, model_name_snapshot, route_id, gateway_request_id, status, endpoint, request_summary_json, response_summary_json, input_tokens, output_tokens, latency_ms, finish_reason, error_code, error_message, started_at, completed_at, created_at)
         VALUES (?, NULL, NULL, ?, ?, ?, NULL, NULL, 'started', '/eval/run', ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?)`,
      )
      .run(
        requestLogId,
        provider.id,
        model.id,
        model.modelNameSnapshot,
        JSON.stringify({
          evalSetId: evalSet.id,
          model: model.name,
          expectedKeywords: this.safeStringArray(evalSet.expectedKeywordsJson),
        }),
        estimateTokens(evalSet.prompt),
        timestamp,
        timestamp,
      );

    let resultId = createId('eval_result');
    try {
      if (adapterName !== 'openai-compatible') {
        throw new ProviderRuntimeError(t('models.errors.unsupportedProvider'), PROVIDER_RUNTIME_ERROR_CODES.unsupportedProvider);
      }
      const invocation = await invokeOpenAiCompatibleChat({
        provider,
        model,
        apiKey: this.getProviderSecret(provider),
        messages: [{ role: 'user', content: evalSet.prompt }],
        stream: false,
      });
      const outputTokens = invocation.outputTokens ?? estimateTokens(invocation.content);
      const inputTokens = invocation.inputTokens ?? estimateTokens(evalSet.prompt);
      const expectedKeywords = this.safeStringArray(evalSet.expectedKeywordsJson);
      const score = this.scoreEvaluationOutput(invocation.content, expectedKeywords);
      this.db
        .prepare(
          `UPDATE request_logs
           SET status = 'completed', response_summary_json = ?, input_tokens = ?, output_tokens = ?, latency_ms = ?, finish_reason = ?, completed_at = ?
           WHERE id = ?`,
        )
        .run(
          JSON.stringify({ redactedPreview: redactSensitive(invocation.content).slice(0, 280), score }),
          inputTokens,
          outputTokens,
          invocation.latencyMs,
          invocation.finishReason ?? 'stop',
          now(),
          requestLogId,
        );
      this.recordUsage({
        workspaceId: DEFAULT_WORKSPACE_ID,
        providerId: provider.id,
        modelId: model.id,
        requestLogId,
        requestType: 'eval',
        inputTokens,
        outputTokens,
        totalTokens: invocation.totalTokens ?? inputTokens + outputTokens,
        tokenUsageEstimated: invocation.inputTokens === null || invocation.outputTokens === null || invocation.totalTokens === null,
        latencyMs: invocation.latencyMs,
        status: 'completed',
        errorCode: null,
        costEstimate: this.estimateCost(model.id, inputTokens, outputTokens),
      });
      this.db
        .prepare(
          `INSERT INTO eval_results (id, eval_set_id, provider_id, model_id, request_log_id, status, score, latency_ms, output_preview, error_code, error_message, created_at)
           VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, NULL, NULL, ?)`,
        )
        .run(resultId, evalSet.id, provider.id, model.id, requestLogId, score, invocation.latencyMs, redactSensitive(invocation.content).slice(0, 500), now());
      this.recordProviderHealth(provider.id, model.id, 'healthy', invocation.latencyMs, 'chat', null, null);
      this.audit('observability.eval.completed', 'eval_set', evalSet.id, { resultId, score, requestLogId }, SECURITY_ACTION_PERMISSIONS.observabilityWrite);
    } catch (error) {
      const normalized = this.normalizeProviderError(error);
      this.db
        .prepare(
          `UPDATE request_logs
           SET status = 'failed', response_summary_json = ?, latency_ms = ?, error_code = ?, error_message = ?, completed_at = ?
           WHERE id = ?`,
        )
        .run(JSON.stringify({ retryable: normalized.retryable }), Math.max(1, now() - timestamp), normalized.code, normalized.message, now(), requestLogId);
      this.db
        .prepare(
          `INSERT INTO eval_results (id, eval_set_id, provider_id, model_id, request_log_id, status, score, latency_ms, output_preview, error_code, error_message, created_at)
           VALUES (?, ?, ?, ?, ?, 'failed', NULL, ?, NULL, ?, ?, ?)`,
        )
        .run(resultId, evalSet.id, provider.id, model.id, requestLogId, Math.max(1, now() - timestamp), normalized.code, normalized.message, now());
      this.recordProviderHealth(provider.id, model.id, 'error', Math.max(1, now() - timestamp), 'chat', normalized.code, normalized.message);
      this.audit('observability.eval.failed', 'eval_set', evalSet.id, { resultId, errorCode: normalized.code, requestLogId }, SECURITY_ACTION_PERMISSIONS.observabilityWrite);
    }
    this.db.prepare('UPDATE eval_sets SET status = ?, updated_at = ? WHERE id = ?').run('completed', now(), evalSet.id);
    return this.requireEvalResult(resultId);
  }


  exportObservability(input: ObservabilityQueryInput = {}): ObservabilityExportResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityExport, 'observability', null);
    const snapshot = this.queryObservability(input);
    const id = createId('observability_export');
    const createdAt = now();
    const exportData = snapshot.privacy.exportScope === 'summary'
      ? {
          summary: snapshot.summary,
          query: snapshot.query,
        }
      : {
          summary: snapshot.summary,
          requestLogs: snapshot.requestLogs,
          gatewayLogs: snapshot.gatewayLogs,
          usageRecords: snapshot.usageRecords,
          providerHealthRecords: snapshot.providerHealthRecords,
          feedbackItems: snapshot.feedbackItems,
          evalSets: snapshot.evalSets,
          evalResults: snapshot.evalResults,
          auditLogs: snapshot.auditLogs,
          executionTraceEvents: snapshot.executionTraceEvents,
          knowledgeRetrievals: snapshot.knowledgeRetrievals,
        };
    const content = buildRedactedObservabilityExport(
      exportData,
      snapshot.privacy,
    );
    this.audit('observability.exported', 'observability', id, { requestCount: snapshot.summary.requestCount, redacted: true }, SECURITY_ACTION_PERMISSIONS.observabilityExport);
    return {
      id,
      redacted: true,
      content,
      summary: snapshot.summary,
      createdAt,
    };
  }

  };
}
