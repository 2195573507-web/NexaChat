import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildProviderDiscoveryHeadersForTesting,
  createProviderDiscoveryCandidates,
  discoverProvider,
  normalizeProviderDiscoveryAddress,
  parseOpenAiCompatibleModelsResponse,
  redactProviderDiscoveryIssue,
} from '../src/main/services/providerDiscovery';

let server: Server | null = null;
let baseUrl = '';
let mode: 'success' | 'root-models' | 'auth' | 'missing' | 'timeout' | 'invalid-json' = 'success';
let lastAuth = '';

beforeEach(async () => {
  mode = 'success';
  lastAuth = '';
  server = createServer(handleRequest);
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
  server = null;
});

describe('Provider discovery URL handling', () => {
  it('normalizes bare domains https URLs trailing slashes and v1 paths', () => {
    expect(normalizeProviderDiscoveryAddress('api.example.com')).toBe('https://api.example.com');
    expect(normalizeProviderDiscoveryAddress('https://api.example.com///')).toBe('https://api.example.com');
    expect(normalizeProviderDiscoveryAddress('https://api.example.com/v1')).toBe('https://api.example.com/v1');
    expect(() => normalizeProviderDiscoveryAddress('not a url with spaces')).toThrow(/valid URL/);
  });

  it('generates candidates without double v1 paths', () => {
    const candidates = createProviderDiscoveryCandidates('https://api.example.com/v1/');

    expect(candidates.map((candidate) => candidate.baseUrl)).toContain('https://api.example.com/v1');
    expect(candidates.map((candidate) => candidate.baseUrl)).not.toContain('https://api.example.com/v1/v1');
    expect(candidates.every((candidate) => !candidate.modelsEndpoint.includes('/v1/v1'))).toBe(true);
  });

  it('strips endpoint input into reusable base candidates', () => {
    const candidates = createProviderDiscoveryCandidates('https://api.example.com/v1/models');

    expect(candidates.map((candidate) => candidate.baseUrl)).toContain('https://api.example.com/v1');
    expect(candidates.every((candidate) => !candidate.baseUrl.endsWith('/models'))).toBe(true);
  });
});

describe('Provider discovery probing', () => {
  it('parses OpenAI-compatible model responses and redacts secrets', () => {
    expect(parseOpenAiCompatibleModelsResponse({ object: 'list', data: [{ id: 'chat-a' }, { id: 'chat-a' }, { id: 'chat-b' }] }))
      .toEqual([{ id: 'chat-a', name: 'chat-a' }, { id: 'chat-b', name: 'chat-b' }]);
    expect(() => parseOpenAiCompatibleModelsResponse({ data: {} })).toThrow(/data array/);
    expect(redactProviderDiscoveryIssue({ code: 'x', message: 'Bearer sk-test-secret failed' }).message).toBe('Bearer [REDACTED] failed');
    expect(buildProviderDiscoveryHeadersForTesting('sk-test-secret').authorization).toBe('Bearer sk-test-secret');
  });

  it('detects an OpenAI-compatible provider and chat usage through main-process probing', async () => {
    const result = await discoverProvider({ address: `${baseUrl}/v1`, apiKey: 'sk-test-secret' });

    expect(lastAuth).toBe('Bearer sk-test-secret');
    expect(result.status).toBe('success');
    expect(result.normalizedBaseUrl).toBe(`${baseUrl}/v1`);
    expect(result.models).toEqual([{ id: 'test-chat', name: 'test-chat' }]);
    expect(result.capabilities.chatCompletions).toBe('supported');
    expect(result.capabilities.tokenUsage).toBe('supported');
    expect(JSON.stringify(result)).not.toContain('sk-test-secret');
  });

  it('chooses a root /models provider without forcing /v1', async () => {
    mode = 'root-models';
    const result = await discoverProvider({ address: baseUrl, apiKey: 'sk-test-secret' });

    expect(result.status).toBe('success');
    expect(result.normalizedBaseUrl).toBe(baseUrl);
    expect(result.models.map((model) => model.id)).toEqual(['root-chat']);
  });

  it('returns structured failures for auth missing path timeout and invalid JSON', async () => {
    mode = 'auth';
    await expect(discoverProvider({ address: baseUrl, apiKey: 'sk-test-secret' })).resolves.toMatchObject({
      status: 'failed',
      compatibility: 'failed',
    });

    mode = 'missing';
    const missing = await discoverProvider({ address: baseUrl, apiKey: 'sk-test-secret' });
    expect(missing.errors.some((error) => error.status === 404)).toBe(true);

    mode = 'timeout';
    const timeout = await discoverProvider({ address: baseUrl, apiKey: 'sk-test-secret', timeoutMs: 20 });
    expect(timeout.errors.some((error) => error.code === 'provider_timeout')).toBe(true);

    mode = 'invalid-json';
    const invalid = await discoverProvider({ address: baseUrl, apiKey: 'sk-test-secret' });
    expect(invalid.errors.some((error) => error.code === 'provider_invalid_response')).toBe(true);
  });
});

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  lastAuth = String(request.headers.authorization ?? '');
  if (mode === 'timeout') {
    setTimeout(() => writeJson(response, 200, { data: [{ id: 'slow-chat' }] }), 100);
    return;
  }
  if (mode === 'invalid-json') {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<html>not json</html>');
    return;
  }
  if (mode === 'auth') {
    writeJson(response, 401, { error: { message: 'bad sk-test-secret' } });
    return;
  }
  if (mode === 'missing') {
    writeJson(response, 404, { error: { message: 'not found' } });
    return;
  }
  if (mode === 'root-models' && request.url === '/models') {
    writeJson(response, 200, { object: 'list', data: [{ id: 'root-chat', object: 'model' }] });
    return;
  }
  if (mode !== 'root-models' && request.url === '/v1/models') {
    writeJson(response, 200, { object: 'list', data: [{ id: 'test-chat', object: 'model' }] });
    return;
  }
  if (request.url === '/v1/chat/completions') {
    writeJson(response, 200, {
      id: 'chatcmpl_discovery',
      object: 'chat.completion',
      model: 'test-chat',
      choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    return;
  }
  writeJson(response, 404, { error: { message: 'not found' } });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
