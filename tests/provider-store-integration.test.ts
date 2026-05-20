import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let server: Server | null = null;
let baseUrl = '';
let dataDir = '';
let modelListMode: 'success' | 'empty' | 'error' = 'success';

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
  modelListMode = 'success';
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
    const sensitivePrompt = 'call the upstream with nxk_request_log_secret and private plan text';
    const result = await store.sendMessage({
      conversationId: conversation.id,
      content: sensitivePrompt,
      modelId: model.id,
      contextStrategy: 'recent_n',
    });
    const requestSummary = JSON.parse(result.requestLog.requestSummaryJson ?? '{}') as {
      message?: string;
      promptLength?: number;
      promptHash?: string;
      redactedPreview?: string;
    };

    expect(result.assistantMessage.content).toBe('store upstream response');
    expect(result.assistantMessage.status).toBe('completed');
    expect(result.requestLog.status).toBe('completed');
    expect(result.requestLog.responseSummaryJson).toContain('store upstream response');
    expect(result.requestLog.requestSummaryJson).not.toContain('sk-round-06-secret');
    expect(result.requestLog.requestSummaryJson).not.toContain(sensitivePrompt);
    expect(result.requestLog.requestSummaryJson).not.toContain('nxk_request_log_secret');
    expect(requestSummary.message).toBeUndefined();
    expect(requestSummary.promptLength).toBe(sensitivePrompt.length);
    expect(requestSummary.promptHash).toMatch(/^[a-f0-9]{16}$/);
    expect(requestSummary.redactedPreview).toContain('[REDACTED]');
    expect(store.getUsageRecords()).toHaveLength(1);
    expect(store.getUsageRecords()[0]).toMatchObject({ requestType: 'chat', totalTokens: 18, tokenUsageEstimated: false, status: 'completed' });
    expect(store.getAuditLogs().some((entry) => entry.action === 'chat.completed')).toBe(true);
  });

  it('fetches provider model options and soft-deletes providers without losing history', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({
      name: 'Round 6 Model List Upstream',
      type: 'openai-compatible',
      baseUrl,
      apiKey: 'sk-round-06-secret',
    });

    await expect(store.fetchProviderModels(provider.id)).resolves.toEqual([{ id: 'round-06-chat', name: 'round-06-chat' }]);
    const model = store.createModel({ providerId: provider.id, name: 'round-06-chat', supportsStreaming: false });
    const conversation = store.createConversation('Soft delete trace');
    const rawDb = store.getRawDatabaseForTesting();
    rawDb
      .prepare('UPDATE workspaces SET default_provider_id = ?, default_model_id = ?, updated_at = ? WHERE id = ?')
      .run(provider.id, model.id, Date.now(), conversation.workspaceId);
    await store.sendMessage({
      conversationId: conversation.id,
      content: 'keep provider trace',
      modelId: model.id,
    });

    const deleted = store.deleteProvider(provider.id);

    expect(deleted.enabled).toBe(false);
    expect(store.getProviders().some((item) => item.id === provider.id)).toBe(false);
    expect(store.getModels().some((item) => item.id === model.id)).toBe(false);
    expect(store.getDashboardSummary().gatewayStatus.endpoints).toContain('/v1/models');
    expect(store.resolveGatewayModelId(model.name)).toBeUndefined();
    expect(store.getDashboardSummary().workspace.defaultProviderId).toBeNull();
    expect(store.getDashboardSummary().workspace.defaultModelId).toBeNull();
    expect(store.getMessages(conversation.id).some((message) => message.providerId === provider.id && message.modelId === model.id)).toBe(true);
    expect(store.getAuditLogs().some((entry) => entry.action === 'provider.deleted')).toBe(true);
  });

  it('updates, disables, re-enables, and soft-deletes models without breaking historical records', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({
      name: 'Round 6 Model Lifecycle Upstream',
      type: 'openai-compatible',
      baseUrl,
      apiKey: 'sk-round-06-secret',
    });
    const model = store.createModel({
      providerId: provider.id,
      name: 'round-06-lifecycle',
      displayName: 'Round 6 Lifecycle',
      supportsStreaming: false,
    });
    const conversation = store.createConversation('Model lifecycle history');
    const rawDb = store.getRawDatabaseForTesting();
    rawDb
      .prepare('UPDATE workspaces SET default_provider_id = ?, default_model_id = ?, updated_at = ? WHERE id = ?')
      .run(provider.id, model.id, Date.now(), conversation.workspaceId);
    rawDb
      .prepare('UPDATE conversations SET default_provider_id = ?, default_model_id = ?, updated_at = ? WHERE id = ?')
      .run(provider.id, model.id, Date.now(), conversation.id);
    await store.sendMessage({
      conversationId: conversation.id,
      content: 'keep model lifecycle trace',
      modelId: model.id,
    });

    const updated = store.updateModel({
      modelId: model.id,
      name: 'round-06-renamed',
      displayName: 'Round 6 Renamed',
      supportsStreaming: true,
      supportsTools: true,
    });

    expect(updated.name).toBe('round-06-renamed');
    expect(updated.displayName).toBe('Round 6 Renamed');
    expect(updated.modelNameSnapshot).toBe('round-06-lifecycle');
    expect(store.getMessages(conversation.id).some((message) => message.modelId === model.id && message.modelNameSnapshot === 'round-06-lifecycle')).toBe(true);

    const disabled = store.disableModel({ modelId: model.id });

    expect(disabled.enabled).toBe(false);
    expect(disabled.deletedAt).toBeNull();
    expect(store.getModels().some((item) => item.id === model.id)).toBe(false);
    expect(store.getDisabledModels().some((item) => item.id === model.id && !item.enabled)).toBe(true);
    expect(store.resolveGatewayModelId(updated.name)).toBeUndefined();
    expect(store.resolveGatewayModelId('nexachat-default')).toBeUndefined();
    expect(store.getDashboardSummary().workspace.defaultModelId).toBeNull();
    expect(store.getConversations().find((item) => item.id === conversation.id)?.defaultModelId).toBeNull();
    expect(store.getMessages(conversation.id).some((message) => message.modelId === model.id && message.modelNameSnapshot === 'round-06-lifecycle')).toBe(true);

    const enabled = store.enableModel({ modelId: model.id });

    expect(enabled.enabled).toBe(true);
    expect(enabled.deletedAt).toBeNull();
    expect(store.getModels().some((item) => item.id === model.id)).toBe(true);
    expect(store.resolveGatewayModelId(updated.name)).toBe(model.id);

    const deleted = store.deleteModel({ modelId: model.id });

    expect(deleted.enabled).toBe(false);
    expect(deleted.deletedAt).toEqual(expect.any(Number));
    expect(store.getModels().some((item) => item.id === model.id)).toBe(false);
    expect(store.getDisabledModels().some((item) => item.id === model.id && item.deletedAt !== null)).toBe(true);
    expect(store.resolveGatewayModelId(updated.name)).toBeUndefined();
    expect(() => store.enableModel({ modelId: model.id })).toThrow(/cannot be enabled/i);
    expect(store.getMessages(conversation.id).some((message) => message.modelId === model.id && message.modelNameSnapshot === 'round-06-lifecycle')).toBe(true);
    expect(store.getAuditLogs().map((entry) => entry.action)).toEqual(expect.arrayContaining(['model.updated', 'model.disabled', 'model.enabled', 'model.deleted']));
  });

  it('keeps provider model discovery failures visible and supports native provider model-list fallback', async () => {
    const { store } = await import('../src/main/services/store');
    const provider = store.createProvider({
      name: 'Round 6 Empty Models',
      type: 'openai-compatible',
      baseUrl,
      apiKey: 'sk-round-06-secret',
    });

    modelListMode = 'empty';
    await expect(store.fetchProviderModels(provider.id)).resolves.toEqual([]);
    expect(store.getProviderHealthRecords()[0]).toMatchObject({ providerId: provider.id, status: 'healthy' });

    modelListMode = 'error';
    await expect(store.fetchProviderModels(provider.id)).rejects.toThrow(/upstream failed/i);
    expect(store.getProviderHealthRecords()[0]).toMatchObject({ providerId: provider.id, status: 'error' });

    const native = store.createProvider({
      name: 'Round 6 Native Provider',
      type: 'anthropic',
      baseUrl,
      apiKey: 'sk-round-06-secret',
    });
    modelListMode = 'empty';
    await expect(store.fetchProviderModels(native.id)).resolves.toEqual([
      { id: 'claude-3-5-sonnet-latest', name: 'claude-3-5-sonnet-latest' },
      { id: 'claude-3-5-haiku-latest', name: 'claude-3-5-haiku-latest' },
    ]);
    expect(store.getProviderHealthRecords()[0]).toMatchObject({ providerId: native.id, status: 'healthy' });
  });

  it('routes Anthropic and Gemini chat through native adapters without leaking secrets', async () => {
    const { store } = await import('../src/main/services/store');
    const anthropicProvider = store.createProvider({
      name: 'Round Native Anthropic Provider',
      type: 'anthropic',
      baseUrl,
      apiKey: 'sk-native-anthropic-secret',
    });
    const anthropicModel = store.createModel({
      providerId: anthropicProvider.id,
      name: 'claude-test',
      supportsStreaming: false,
    });

    const anthropic = await store.sendMessage({
      content: 'call anthropic native adapter',
      modelId: anthropicModel.id,
    });

    expect(anthropic.assistantMessage.content).toBe('native anthropic store response');
    expect(anthropic.assistantMessage.metadataJson).toContain('anthropic-native');
    expect(anthropic.requestLog.requestSummaryJson).toContain('anthropic-native');
    expect(anthropic.requestLog.requestSummaryJson).not.toContain('sk-native-anthropic-secret');

    const geminiProvider = store.createProvider({
      name: 'Round Native Gemini Provider',
      type: 'gemini',
      baseUrl,
      apiKey: 'sk-native-gemini-secret',
    });
    const geminiModel = store.createModel({
      providerId: geminiProvider.id,
      name: 'gemini-1.5-pro',
      supportsStreaming: false,
    });

    const gemini = await store.sendMessage({
      content: 'call gemini native adapter',
      modelId: geminiModel.id,
    });

    expect(gemini.assistantMessage.content).toBe('native gemini store response');
    expect(gemini.assistantMessage.metadataJson).toContain('gemini-native');
    expect(gemini.requestLog.requestSummaryJson).toContain('gemini-native');
    expect(gemini.requestLog.requestSummaryJson).not.toContain('sk-native-gemini-secret');
    expect(store.getUsageRecords()).toHaveLength(2);
  });

  it('saves Provider and discovered models through the canonical creation paths without leaking API keys', async () => {
    const { store } = await import('../src/main/services/store');
    const discovery = await store.discoverProvider({
      address: baseUrl,
      apiKey: 'sk-smart-add-secret',
      providerName: 'Smart Add Upstream',
    });

    expect(discovery.models.map((model) => model.id)).toEqual(['round-06-chat']);
    expect(JSON.stringify(discovery)).not.toContain('sk-smart-add-secret');

    const saved = await store.saveProviderFromDiscovery({
      providerName: discovery.suggestedProviderName,
      providerType: discovery.providerType,
      baseUrl: discovery.normalizedBaseUrl ?? baseUrl,
      apiKey: 'sk-smart-add-secret',
      modelNames: discovery.models.map((model) => model.id),
      capabilities: discovery.capabilities,
    });

    expect(saved.provider.secretRef).toMatch(/^secret_/);
    expect(saved.models.map((model) => model.name)).toEqual(['round-06-chat']);
    expect(store.getProviders().some((provider) => provider.id === saved.provider.id)).toBe(true);
    expect(store.getModels().some((model) => model.providerId === saved.provider.id && model.name === 'round-06-chat')).toBe(true);
    expect(JSON.stringify(store.exportDiagnostics())).not.toContain('sk-smart-add-secret');
  });
});

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  if (request.url === '/v1/models') {
    if (modelListMode === 'error') {
      writeJson(response, 502, { error: { message: 'upstream failed while listing models' } });
      return;
    }
    if (modelListMode === 'empty') {
      writeJson(response, 200, { object: 'list', data: [] });
      return;
    }
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
  if (request.url === '/v1/messages') {
    writeJson(response, 200, {
      id: 'msg_store_native',
      type: 'message',
      role: 'assistant',
      model: 'claude-test',
      content: [{ type: 'text', text: 'native anthropic store response' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 4, output_tokens: 6 },
    });
    return;
  }
  if (request.url?.startsWith('/v1/models/gemini-1.5-pro:generateContent')) {
    writeJson(response, 200, {
      candidates: [{ content: { parts: [{ text: 'native gemini store response' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7, totalTokenCount: 12 },
    });
    return;
  }
  writeJson(response, 404, { error: { message: 'not found' } });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
