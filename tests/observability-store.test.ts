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
  dataDir = join(process.cwd(), 'test-results', `round-13-observability-${Date.now()}-${Math.random().toString(16).slice(2)}`);
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

describe('Round 13 observability store chain', () => {
  it('records provider health, feedback, eval results, usage, and redacted local exports', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({
      name: 'Round 13 Mock Upstream',
      type: 'openai-compatible',
      baseUrl,
      apiKey: 'sk-round-13-secret',
    });
    const model = store.createModel({
      providerId: provider.id,
      name: 'round-13-chat',
      supportsStreaming: false,
    });

    await store.testProvider(provider.id);
    expect(store.getProviderHealthRecords().some((record) => record.providerId === provider.id && record.source === 'provider-test')).toBe(true);

    const conversation = store.createConversation('Round 13');
    const chat = await store.sendMessage({
      conversationId: conversation.id,
      content: 'collect local observability',
      modelId: model.id,
      contextStrategy: 'recent_n',
    });

    const feedback = store.createFeedback({
      label: 'bug',
      requestLogId: chat.requestLog.id,
      notes: 'The local path C:\\Users\\Example\\secret.txt and sk-round-13-secret must be redacted.',
    });
    expect(feedback.requestLogId).toBe(chat.requestLog.id);
    expect(feedback.notes).not.toContain('sk-round-13-secret');

    const evalSet = store.getEvalSets()[0];
    const evalResult = await store.runEvaluation({ evalSetId: evalSet.id, modelId: model.id });
    expect(evalResult.status).toBe('completed');
    expect(evalResult.requestLogId).toBeTruthy();
    expect(store.getUsageRecords().length).toBeGreaterThanOrEqual(2);

    const snapshot = store.queryObservability({ providerId: provider.id });
    expect(snapshot.summary.requestCount).toBeGreaterThanOrEqual(2);
    expect(snapshot.feedbackItems.some((item) => item.id === feedback.id)).toBe(true);
    expect(snapshot.evalResults.some((item) => item.id === evalResult.id)).toBe(true);

    const privacy = store.saveObservabilityPrivacy({ includePromptSnippets: false, includeLocalPaths: false });
    expect(privacy.cloudTelemetryEnabled).toBe(false);
    const exported = store.exportObservability({ providerId: provider.id });
    expect(exported.redacted).toBe(true);
    expect(exported.content).not.toContain('sk-round-13-secret');
    expect(exported.content).not.toContain('C:\\Users\\Example');
    expect(store.getAuditLogs().some((entry) => entry.action === 'observability.exported')).toBe(true);
  });
});

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  if (request.url === '/v1/models') {
    writeJson(response, 200, { object: 'list', data: [{ id: 'round-13-chat', object: 'model' }] });
    return;
  }
  if (request.url === '/v1/chat/completions') {
    writeJson(response, 200, {
      id: 'round13_chatcmpl_test',
      object: 'chat.completion',
      model: 'round-13-chat',
      choices: [{ index: 0, message: { role: 'assistant', content: 'NexaChat local observability response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 6, completion_tokens: 8, total_tokens: 14 },
    });
    return;
  }
  writeJson(response, 404, { error: { message: 'not found' } });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
