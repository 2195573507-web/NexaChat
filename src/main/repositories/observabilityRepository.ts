import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type {
  EvalResult,
  EvalSet,
  FeedbackItem,
  UsageTrendBucket,
  UsageTrendInput,
  RequestLog,
  UsageRecord,
} from '../../shared/types.js';
import {
  mapEvalResult,
  mapEvalSet,
  mapFeedbackItem,
  mapRequestLog,
  mapUsageRecord,
} from './mappers.js';

export class ObservabilityRepository {
  constructor(private readonly db: DatabaseSync) {}

  listRequestLogs(): RequestLog[] {
    return this.db
      .prepare('SELECT * FROM request_logs ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapRequestLog(row as Record<string, unknown>));
  }

  listUsageRecords(): UsageRecord[] {
    return this.db
      .prepare('SELECT * FROM usage_records ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapUsageRecord(row as Record<string, unknown>));
  }

  aggregateUsageTrend(input: UsageTrendInput = {}): UsageTrendBucket[] {
    const bucketMs = normalizeBucketMs(input.bucketMs);
    const limit = normalizeLimit(input.limit, 48, 366);
    const where: string[] = [];
    const params: SQLInputValue[] = [];
    if (input.workspaceId) {
      where.push('workspace_id = ?');
      params.push(input.workspaceId);
    }
    if (input.providerId) {
      where.push('provider_id = ?');
      params.push(input.providerId);
    }
    if (input.modelId) {
      where.push('model_id = ?');
      params.push(input.modelId);
    }
    if (input.since !== undefined) {
      where.push('created_at >= ?');
      params.push(input.since);
    }
    if (input.until !== undefined) {
      where.push('created_at <= ?');
      params.push(input.until);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = this.db
      .prepare(
        `SELECT
           CAST((created_at / ?) AS INTEGER) * ? AS bucket_start,
           COUNT(*) AS request_count,
           COALESCE(SUM(input_tokens), 0) AS input_tokens,
           COALESCE(SUM(output_tokens), 0) AS output_tokens,
           COALESCE(SUM(cost_estimate), 0) AS cost_estimate
         FROM usage_records
         ${whereSql}
         GROUP BY bucket_start
         ORDER BY bucket_start DESC
         LIMIT ?`,
      )
      .all(bucketMs, bucketMs, ...params, limit) as Array<Record<string, unknown>>;
    return rows
      .map((row) => ({
        bucketStart: Number(row.bucket_start),
        requestCount: Number(row.request_count),
        inputTokens: Number(row.input_tokens),
        outputTokens: Number(row.output_tokens),
        costEstimate: Number(row.cost_estimate),
      }))
      .reverse();
  }

  listFeedbackItems(): FeedbackItem[] {
    return this.db
      .prepare('SELECT * FROM feedback_items ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapFeedbackItem(row as Record<string, unknown>));
  }

  listEvalSets(): EvalSet[] {
    return this.db
      .prepare('SELECT * FROM eval_sets ORDER BY updated_at DESC')
      .all()
      .map((row) => mapEvalSet(row as Record<string, unknown>));
  }

  listEvalResults(evalSetId?: string): EvalResult[] {
    const rows = evalSetId
      ? this.db.prepare('SELECT * FROM eval_results WHERE eval_set_id = ? ORDER BY created_at DESC LIMIT 200').all(evalSetId)
      : this.db.prepare('SELECT * FROM eval_results ORDER BY created_at DESC LIMIT 200').all();
    return rows.map((row) => mapEvalResult(row as Record<string, unknown>));
  }
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const parsed = Math.floor(Number(value ?? fallback));
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function normalizeBucketMs(value: number | undefined): number {
  const parsed = Math.floor(Number(value ?? 60 * 60 * 1000));
  return Number.isFinite(parsed) && parsed >= 60 * 1000 ? parsed : 60 * 60 * 1000;
}
