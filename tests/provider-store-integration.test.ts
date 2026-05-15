import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let server: Server | null = null;
let baseUrl = '';
let dataDir = '';

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
  dataDir = join(process.cwd(), 'test-results', `round-06-store-${Date.now()}-${Math.random().toString(16).slice(2)}`);
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

describe('provider invocation through NexaStore', () => {
  it('does not seed a fake production provider or model', async () => {
    const { store } = await import('../src/main/services/store');

    expect(store.getProviders()).toEqual([]);
    expect(store.getModels()).toEqual([]);
    expect(store.getConversations()).toHaveLength(1);
  });

  it('uses one real provider chain for health, chat, request logs, usage, and audit', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({
      name: 'Round 6 Mock Upstream',
      type: 'openai-compatible',
      baseUrl,
      apiKey: 'sk-round-06-secret',
    });
    const model = store.createModel({
      providerId: provider.id,
      name: 'round-06-chat',
      supportsStreaming: false,
    });

    const tested = await store.testProvider(provider.id);
    expect(tested.healthStatus).toBe('healthy');

    const conversation = store.createConversation('Round 6');
    const result = await store.sendMessage({
      conversationId: conversation.id,
      content: 'call the upstream',
      modelId: model.id,
      contextStrategy: 'recent_n',
    });

    expect(result.assistantMessage.content).toBe('store upstream response');
    expect(result.assistantMessage.status).toBe('completed');
    expect(result.requestLog.status).toBe('completed');
    expect(result.requestLog.responseSummaryJson).toContain('store upstream response');
    expect(result.requestLog.requestSummaryJson).not.toContain('sk-round-06-secret');
    expect(store.getUsageRecords()).toHaveLength(1);
    expect(store.getAuditLogs().some((entry) => entry.action === 'chat.completed')).toBe(true);
  });
});

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  if (request.url === '/v1/models') {
    writeJson(response, 200, { object: 'list', data: [{ id: 'round-06-chat', object: 'model' }] });
    return;
  }
  if (request.url === '/v1/chat/completions') {
    writeJson(response, 200, {
      id: 'store_chatcmpl_test',
      object: 'chat.completion',
      model: 'round-06-chat',
      choices: [{ index: 0, message: { role: 'assistant', content: 'store upstream response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 7, completion_tokens: 11, total_tokens: 18 },
    });
    return;
  }
  writeJson(response, 404, { error: { message: 'not found' } });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
