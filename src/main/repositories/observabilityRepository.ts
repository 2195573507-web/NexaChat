import type { DatabaseSync } from 'node:sqlite';
import type {
  EvalResult,
  EvalSet,
  FeedbackItem,
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
