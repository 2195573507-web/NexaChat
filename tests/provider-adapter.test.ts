import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ProviderRuntimeError,
  invokeOpenAiCompatibleChat,
  testOpenAiCompatibleProvider,
} from '../src/main/adapters/openAiCompatibleAdapter';
import {
  PROVIDER_RUNTIME_ERROR_CODES,
  PROVIDER_RUNTIME_POLICY,
} from '../src/shared/providerRuntime';
import type { Model, Provider } from '../src/shared/types';

let server: Server | null = null;
let baseUrl = '';
let lastAuth = '';
let chatAttempts = 0;
let mode: 'json' | 'stream' | 'retry' | 'timeout' | 'unauthorized' = 'json';

const provider: Provider = {
  id: 'provider_test',
  name: 'Test Provider',
  type: 'openai-compatible',
  baseUrl: '',
  proxyUrl: null,
  authType: 'api-key',
  secretRef: 'secret_test',
  customHeadersJson: null,
  enabled: true,
  healthStatus: 'unknown',
  lastCheckedAt: null,
  createdAt: 1,
  updatedAt: 1,
};

const model: Model = {
  id: 'model_test',
  providerId: 'provider_test',
  name: 'test-chat',
  displayName: 'Test Chat',
  modelNameSnapshot: 'test-chat',
  contextWindow: 128000,
  supportsStreaming: true,
  supportsTools: false,
  supportsVision: false,
  supportsEmbeddings: false,
  inputPrice: null,
  outputPrice: null,
  healthStatus: 'unknown',
  latencyMs: null,
  enabled: true,
  deletedAt: null,
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(async () => {
  chatAttempts = 0;
  mode = 'json';
  server = createServer(handleRequest);
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address.');
  baseUrl = `http://127.0.0.1:${address.port}/v1`;
  provider.baseUrl = baseUrl;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
  server = null;
});

describe('OpenAI-compatible provider adapter', () => {
  it('calls a real OpenAI-compatible upstream and normalizes content, usage, and auth', async () => {
    const result = await invokeOpenAiCompatibleChat({
      provider,
      model,
      apiKey: 'sk-test-secret',
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });

    expect(lastAuth).toBe('Bearer sk-test-secret');
    expect(result.content).toBe('adapter json response');
    expect(result.inputTokens).toBe(3);
    expect(result.outputTokens).toBe(5);
    expect(result.finishReason).toBe('stop');
    expect(result.streamed).toBe(false);
  });

  it('parses streaming chunks through the same adapter contract', async () => {
    mode = 'stream';
    const result = await invokeOpenAiCompatibleChat({
      provider,
      model,
      apiKey: 'sk-test-secret',
      messages: [{ role: 'user', content: 'stream please' }],
      stream: true,
    });

    expect(result.content).toBe('streamed response');
    expect(result.streamed).toBe(true);
    expect(result.finishReason).toBe('stop');
  });

  it('retries retryable upstream failures once', async () => {
    mode = 'retry';
    const result = await invokeOpenAiCompatibleChat({
      provider,
      model,
      apiKey: 'sk-test-secret',
      messages: [{ role: 'user', content: 'retry please' }],
      stream: false,
      maxRetries: 1,
    });

    expect(chatAttempts).toBe(2);
    expect(result.retryCount).toBe(1);
    expect(result.content).toBe('adapter json response');
  });

  it('normalizes timeout and cancellation errors', async () => {
    mode = 'timeout';
    await expect(
      invokeOpenAiCompatibleChat({
        provider,
        model,
        apiKey: 'sk-test-secret',
        messages: [{ role: 'user', content: 'slow' }],
        stream: false,
        timeoutMs: 25,
        maxRetries: 0,
      }),
    ).rejects.toMatchObject({ code: PROVIDER_RUNTIME_ERROR_CODES.timeout });

    const controller = new AbortController();
    controller.abort();
    await expect(
      invokeOpenAiCompatibleChat({
        provider,
        model,
        apiKey: 'sk-test-secret',
        messages: [{ role: 'user', content: 'cancel' }],
        signal: controller.signal,
        timeoutMs: PROVIDER_RUNTIME_POLICY.chatTimeoutMs,
        maxRetries: 0,
      }),
    ).rejects.toBeInstanceOf(ProviderRuntimeError);
  });

  it('tests provider health with a real /models request', async () => {
    const result = await testOpenAiCompatibleProvider(provider, 'sk-test-secret');

    expect(result.ok).toBe(true);
    expect(result.modelNames).toEqual(['test-chat']);
  });
});

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  lastAuth = String(request.headers.authorization ?? '');
  if (request.url === '/v1/models') {
    writeJson(response, 200, { object: 'list', data: [{ id: 'test-chat', object: 'model' }] });
    return;
  }
  if (request.url === '/v1/chat/completions') {
    chatAttempts += 1;
    if (mode === 'unauthorized') {
      writeJson(response, 401, { error: { message: 'bad key' } });
      return;
    }
    if (mode === 'retry' && chatAttempts === 1) {
      writeJson(response, 500, { error: { message: 'temporary failure' } });
      return;
    }
    if (mode === 'timeout') {
      setTimeout(() => writeJson(response, 200, jsonPayload()), 100);
      return;
    }
    if (mode === 'stream') {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.write('data: {"choices":[{"delta":{"content":"streamed "}}]}\n\n');
      response.write('data: {"choices":[{"delta":{"content":"response"},"finish_reason":"stop"}]}\n\n');
      response.end('data: [DONE]\n\n');
      return;
    }
    writeJson(response, 200, jsonPayload());
    return;
  }
  writeJson(response, 404, { error: { message: 'not found' } });
}

function jsonPayload() {
  return {
    id: 'chatcmpl_test',
    object: 'chat.completion',
    model: 'test-chat',
    choices: [{ index: 0, message: { role: 'assistant', content: 'adapter json response' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 },
  };
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
