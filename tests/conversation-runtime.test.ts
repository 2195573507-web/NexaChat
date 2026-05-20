import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let server: Server | null = null;
let baseUrl = '';
let dataDir = '';
let responseCounter = 0;
let responseMode: 'ok' | 'fail' = 'ok';

vi.mock('electron', () => ({
  app: {
    getPath: () => dataDir,
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value, 'utf8'),
    decryptString: (value: Buffer) => value.toString('utf8'),
  },
}));

beforeEach(async () => {
  vi.resetModules();
  responseCounter = 0;
  responseMode = 'ok';
  dataDir = join(process.cwd(), 'test-results', `round-07-conversation-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
  server = createServer(handleRequest);
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address.');
  baseUrl = `http://127.0.0.1:${address.port}/v1`;
});

afterEach(async () => {
  const { closeDatabase } = await import('../src/main/database/connection');
  closeDatabase();
  delete process.env.NEXACHAT_DATA_DIR;
  await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
  server = null;
  vi.resetModules();
});

describe('Round 7 conversation runtime', () => {
  it('creates authoritative conversation tables and persists context ids and chunks', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({ name: 'Round 7 Provider', type: 'openai-compatible', baseUrl, apiKey: 'sk-round-07' });
    const model = store.createModel({ providerId: provider.id, name: 'round-07-chat', supportsStreaming: false });
    const conversation = store.createConversation('Round 7');

    const first = await store.sendMessage({ conversationId: conversation.id, content: 'first context message', modelId: model.id });
    const second = await store.sendMessage({ conversationId: conversation.id, content: 'second context message', modelId: model.id, contextStrategy: 'token_trim' });

    expect(second.assistantMessage.status).toBe('completed');
    expect(second.assistantMessage.contextMessageIdsJson).toContain(first.userMessage.id);
    expect(second.chunks?.length).toBeGreaterThanOrEqual(1);
    expect(store.getSnapshot().messageChunks.some((chunk) => chunk.messageId === second.assistantMessage.id)).toBe(true);

    const { getDatabase } = await import('../src/main/database/connection');
    const db = getDatabase().db;
    for (const tableName of ['message_chunks', 'message_attachments', 'prompt_templates', 'conversation_exports']) {
      const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
      expect(row).toBeTruthy();
    }
  });

  it('keeps chat working when no knowledge files are indexed', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({ name: 'Round 7 No Knowledge Provider', type: 'openai-compatible', baseUrl, apiKey: 'sk-round-07' });
    const model = store.createModel({ providerId: provider.id, name: 'round-07-chat', supportsStreaming: false });
    for (const file of store.getKnowledgeFiles()) {
      store.deleteKnowledgeFile({ fileId: file.id });
    }

    const response = await store.sendMessage({
      content: 'chat should work with no indexed knowledge',
      modelId: model.id,
    });

    expect(response.assistantMessage.status).toBe('completed');
    expect(response.assistantMessage.content).toContain('round 7 upstream');
    expect(store.getKnowledgeCitations(response.assistantMessage.id)).toHaveLength(0);
    expect(response.requestLog.requestSummaryJson).toContain('"knowledgeCitationCount":0');
  });

  it('retries, regenerates, exports, compares models, and cancels failed requests through store methods', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({ name: 'Round 7 Provider', type: 'openai-compatible', baseUrl, apiKey: 'sk-round-07' });
    const primary = store.createModel({ providerId: provider.id, name: 'round-07-chat', supportsStreaming: false });
    const secondary = store.createModel({ providerId: provider.id, name: 'round-07-chat-alt', supportsStreaming: false });
    const conversation = store.createConversation('Round 7 operations');

    const initial = await store.sendMessage({ conversationId: conversation.id, content: 'base message', modelId: primary.id });
    const retry = await store.retryMessage({ messageId: initial.assistantMessage.id });
    const regenerated = await store.regenerateMessage({ assistantMessageId: initial.assistantMessage.id });
    const compared = await store.compareModels({
      conversationId: conversation.id,
      content: 'compare this',
      modelIds: [primary.id, secondary.id],
    });
    const exported = store.exportConversation({ conversationId: conversation.id, format: 'markdown', redacted: true });
    responseMode = 'fail';
    const failed = await store.sendMessage({ conversationId: conversation.id, content: 'fail then cancel', modelId: primary.id });
    const failedUsage = store.getUsageRecords().find((record) => record.requestLogId === failed.requestLog.id);
    const cancelled = store.cancelMessage({ requestLogId: failed.requestLog.id });

    expect(retry.assistantMessage.content).toContain('round 7 upstream');
    expect(regenerated.assistantMessage.metadataJson).toContain('regenerate');
    expect(compared.responses).toHaveLength(2);
    expect(new Set(compared.responses.map((response) => response.requestLog.id)).size).toBe(2);
    expect(exported.content).toContain('# Round 7 operations');
    expect(store.getSnapshot().conversationExports).toHaveLength(1);
    expect(failedUsage).toMatchObject({
      requestType: 'chat',
      status: 'failed',
      errorCode: 'provider_upstream_error',
      inputTokens: expect.any(Number),
      outputTokens: 0,
      tokenUsageEstimated: true,
    });
    expect(cancelled.requestLog.status).toBe('cancelled');
  });

  it('uses clientRequestId as the cancellable request log id for in-flight UI cancellation', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({ name: 'Round 7 Provider', type: 'openai-compatible', baseUrl, apiKey: 'sk-round-07' });
    const model = store.createModel({ providerId: provider.id, name: 'round-07-chat', supportsStreaming: false });
    const conversation = store.createConversation('Client request id cancel');
    const clientRequestId = 'req_ui_cancel_contract';
    responseMode = 'fail';

    const result = await store.sendMessage({
      conversationId: conversation.id,
      content: 'fail then cancel by client id',
      modelId: model.id,
      clientRequestId,
    });

    expect(result.requestLog.id).toBe(clientRequestId);
    const cancelled = store.cancelMessage({ requestLogId: clientRequestId });
    expect(cancelled.requestLog.id).toBe(clientRequestId);
    expect(cancelled.requestLog.status).toBe('cancelled');
  });
});

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  if (request.url === '/v1/models') {
    writeJson(response, 200, { object: 'list', data: [{ id: 'round-07-chat', object: 'model' }] });
    return;
  }
  if (request.url === '/v1/chat/completions') {
    responseCounter += 1;
    if (responseMode === 'fail') {
      writeJson(response, 500, { error: { message: 'round 7 upstream failure' } });
      return;
    }
    writeJson(response, 200, {
      id: `round_07_${responseCounter}`,
      object: 'chat.completion',
      model: 'round-07-chat',
      choices: [{ index: 0, message: { role: 'assistant', content: `round 7 upstream ${responseCounter}` }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5 + responseCounter, completion_tokens: 7, total_tokens: 12 + responseCounter },
    });
    return;
  }
  writeJson(response, 404, { error: { message: 'not found' } });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
