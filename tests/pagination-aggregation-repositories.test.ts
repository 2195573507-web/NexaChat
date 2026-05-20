import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { schemaSql } from '../src/main/database/schema';
import { ChatRepository } from '../src/main/repositories/chatRepository';
import { GatewayRepository } from '../src/main/repositories/gatewayRepository';
import { AuditRepository } from '../src/main/repositories/auditRepository';
import { ObservabilityRepository } from '../src/main/repositories/observabilityRepository';

let db: DatabaseSync;

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(schemaSql);
  seedRepositoryFixture(db);
});

afterEach(() => {
  db.close();
});

describe('pagination and aggregation repositories', () => {
  it('pages conversations and messages without requiring full snapshot payloads', () => {
    const chat = new ChatRepository(db);

    const conversations = chat.pageConversations({ limit: 2 });
    expect(conversations.total).toBe(4);
    expect(conversations.items.map((item) => item.id)).toEqual(['conversation_3', 'conversation_2']);
    expect(conversations.hasMore).toBe(true);

    const pageOne = chat.pageMessages({ conversationId: 'conversation_0', limit: 2, offset: 0 });
    const pageTwo = chat.pageMessages({ conversationId: 'conversation_0', limit: 2, offset: 2 });
    expect(pageOne.items.map((item) => item.content)).toEqual(['message 4', 'message 5']);
    expect(pageTwo.items.map((item) => item.content)).toEqual(['message 2', 'message 3']);
    expect(pageOne.hasMore).toBe(true);
    expect(pageTwo.hasMore).toBe(true);
  });

  it('pages gateway and audit logs and aggregates usage trend in SQL buckets', () => {
    const gateway = new GatewayRepository(db);
    const audit = new AuditRepository(db);
    const observability = new ObservabilityRepository(db);

    const gatewayPage = gateway.pageGatewayLogs({ limit: 2, statusCode: 200 });
    expect(gatewayPage.total).toBe(3);
    expect(gatewayPage.items).toHaveLength(2);
    expect(gatewayPage.items.every((item) => item.statusCode === 200)).toBe(true);

    const auditPage = audit.pageAuditLogs({ limit: 2, query: 'chat' });
    expect(auditPage.total).toBe(3);
    expect(auditPage.items.every((item) => item.action.includes('chat'))).toBe(true);

    const trend = observability.aggregateUsageTrend({ bucketMs: 60_000, limit: 4 });
    expect(trend).toEqual([
      expect.objectContaining({ bucketStart: 120_000, requestCount: 1, inputTokens: 7, outputTokens: 8 }),
      expect.objectContaining({ bucketStart: 180_000, requestCount: 2, inputTokens: 11, outputTokens: 13 }),
    ]);
  });
});

function seedRepositoryFixture(database: DatabaseSync): void {
  database.prepare('INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('workspace_1', 'Workspace', 1, 1);
  for (let index = 0; index < 4; index += 1) {
    database.prepare(
      `INSERT INTO conversations (id, workspace_id, title, is_pinned, is_favorite, status, message_count, created_at, updated_at)
       VALUES (?, 'workspace_1', ?, ?, 0, 'active', 0, ?, ?)`,
    ).run(`conversation_${index}`, `Conversation ${index}`, index === 3 ? 1 : 0, index, index);
  }
  for (let index = 0; index < 6; index += 1) {
    database.prepare(
      `INSERT INTO messages (id, conversation_id, workspace_id, role, content, status, content_format, context_strategy, created_at, updated_at)
       VALUES (?, 'conversation_0', 'workspace_1', ?, ?, 'completed', 'markdown', 'recent_n', ?, ?)`,
    ).run(`message_${index}`, index % 2 === 0 ? 'user' : 'assistant', `message ${index}`, index, index);
  }
  for (let index = 0; index < 5; index += 1) {
    database.prepare(
      `INSERT INTO gateway_logs (id, method, path, status_code, created_at)
       VALUES (?, 'POST', ?, ?, ?)`,
    ).run(`gateway_log_${index}`, `/v1/${index}`, index % 2 === 0 ? 200 : 502, index);
  }
  for (let index = 0; index < 5; index += 1) {
    database.prepare(
      `INSERT INTO audit_logs (id, action, actor, target_type, integrity_state, created_at)
       VALUES (?, ?, 'tester', 'message', 'verified', ?)`,
    ).run(`audit_${index}`, index % 2 === 0 ? `chat.action.${index}` : `data.action.${index}`, index);
  }
  for (const [id, createdAt, inputTokens, outputTokens] of [
    ['usage_1', 125_000, 7, 8],
    ['usage_2', 181_000, 5, 6],
    ['usage_3', 199_000, 6, 7],
  ] as const) {
    database.prepare(
      `INSERT INTO usage_records (id, workspace_id, provider_id, model_id, request_log_id, request_type, input_tokens, output_tokens, total_tokens, token_usage_estimated, latency_ms, status, error_code, cost_estimate, created_at)
       VALUES (?, 'workspace_1', 'provider_1', 'model_1', NULL, 'chat', ?, ?, ?, 1, 12, 'completed', NULL, 0, ?)`,
    ).run(id, inputTokens, outputTokens, inputTokens + outputTokens, createdAt);
  }
}
