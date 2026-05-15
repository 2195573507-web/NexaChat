import type { Model, Provider } from '../../shared/types.js';
import {
  OPENAI_COMPATIBLE_ENDPOINTS,
  PROVIDER_RUNTIME_ERROR_CODES,
  PROVIDER_RUNTIME_POLICY,
  type ProviderRuntimeErrorCode,
  isRetryableProviderStatus,
  normalizeProviderHttpErrorCode,
} from '../../shared/providerRuntime.js';
import { redactHeaders, redactSensitive } from '../security/redaction.js';

export interface ChatMessageInput {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ProviderInvocationInput {
  provider: Provider;
  model: Model;
  apiKey: string | null;
  messages: ChatMessageInput[];
  stream?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ProviderInvocationResult {
  content: string;
  chunks: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  finishReason: string | null;
  latencyMs: number;
  retryCount: number;
  streamed: boolean;
  responseSummary: Record<string, unknown>;
}

export interface ProviderHealthResult {
  ok: boolean;
  latencyMs: number;
  status: number | null;
  errorCode: ProviderRuntimeErrorCode | null;
  errorMessage: string | null;
  modelNames: string[];
}

export class ProviderRuntimeError extends Error {
  readonly code: ProviderRuntimeErrorCode;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, code: ProviderRuntimeErrorCode, options: { status?: number | null; retryable?: boolean } = {}) {
    super(message);
    this.name = 'ProviderRuntimeError';
    this.code = code;
    this.status = options.status ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export async function invokeOpenAiCompatibleChat(input: ProviderInvocationInput): Promise<ProviderInvocationResult> {
  assertProviderReady(input.provider, input.apiKey);
  if (input.signal?.aborted) {
    throw new ProviderRuntimeError('Provider request was cancelled before it started.', PROVIDER_RUNTIME_ERROR_CODES.cancelled);
  }
  const startedAt = Date.now();
  const timeoutMs = input.timeoutMs ?? PROVIDER_RUNTIME_POLICY.chatTimeoutMs;
  const maxRetries = input.maxRetries ?? PROVIDER_RUNTIME_POLICY.maxRetries;
  let attempt = 0;
  let lastError: ProviderRuntimeError | null = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const upstreamAbort = () => controller.abort(input.signal?.reason);
    const timer = setTimeout(() => controller.abort(new Error('provider_timeout')), timeoutMs);
    input.signal?.addEventListener('abort', upstreamAbort, { once: true });

    try {
      const response = await fetch(joinEndpoint(input.provider.baseUrl, OPENAI_COMPATIBLE_ENDPOINTS.chatCompletions), {
        method: 'POST',
        headers: buildHeaders(input.provider, input.apiKey),
        body: JSON.stringify({
          model: input.model.name,
          messages: input.messages,
          stream: input.stream === true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      input.signal?.removeEventListener('abort', upstreamAbort);

      if (!response.ok) {
        const error = await buildHttpError(response);
        if (attempt < maxRetries && error.retryable) {
          lastError = error;
          attempt += 1;
          await sleep(PROVIDER_RUNTIME_POLICY.retryBackoffMs * attempt);
          continue;
        }
        throw error;
      }

      const result = input.stream === true
        ? await parseStreamingResponse(response)
        : await parseJsonResponse(response);
      return {
        ...result,
        latencyMs: Math.max(1, Date.now() - startedAt),
        retryCount: attempt,
      };
    } catch (error) {
      clearTimeout(timer);
      input.signal?.removeEventListener('abort', upstreamAbort);
      const normalized = normalizeInvocationError(error);
      if (attempt < maxRetries && normalized.retryable) {
        lastError = normalized;
        attempt += 1;
        await sleep(PROVIDER_RUNTIME_POLICY.retryBackoffMs * attempt);
        continue;
      }
      throw normalized;
    }
  }

  throw lastError ?? new ProviderRuntimeError('Provider invocation failed.', PROVIDER_RUNTIME_ERROR_CODES.upstreamError);
}

export async function testOpenAiCompatibleProvider(provider: Provider, apiKey: string | null): Promise<ProviderHealthResult> {
  const startedAt = Date.now();
  try {
    assertProviderReady(provider, apiKey);
    const response = await fetch(joinEndpoint(provider.baseUrl, OPENAI_COMPATIBLE_ENDPOINTS.models), {
      method: 'GET',
      headers: buildHeaders(provider, apiKey),
      signal: AbortSignal.timeout(PROVIDER_RUNTIME_POLICY.healthTimeoutMs),
    });
    const latencyMs = Math.max(1, Date.now() - startedAt);
    if (!response.ok) {
      const error = await buildHttpError(response);
      return {
        ok: false,
        latencyMs,
        status: response.status,
        errorCode: error.code,
        errorMessage: error.message,
        modelNames: [],
      };
    }
    const body = await response.json() as { data?: Array<{ id?: unknown }> };
    return {
      ok: true,
      latencyMs,
      status: response.status,
      errorCode: null,
      errorMessage: null,
      modelNames: Array.isArray(body.data) ? body.data.map((item) => String(item.id ?? '')).filter(Boolean) : [],
    };
  } catch (error) {
    const normalized = normalizeInvocationError(error);
    return {
      ok: false,
      latencyMs: Math.max(1, Date.now() - startedAt),
      status: normalized.status,
      errorCode: normalized.code,
      errorMessage: normalized.message,
      modelNames: [],
    };
  }
}

export function getProviderRequestSummary(input: ProviderInvocationInput): Record<string, unknown> {
  return {
    providerId: input.provider.id,
    providerType: input.provider.type,
    adapter: 'openai-compatible',
    baseUrl: input.provider.baseUrl,
    model: input.model.name,
    messageCount: input.messages.length,
    stream: input.stream === true,
    timeoutMs: input.timeoutMs ?? PROVIDER_RUNTIME_POLICY.chatTimeoutMs,
    maxRetries: input.maxRetries ?? PROVIDER_RUNTIME_POLICY.maxRetries,
    headers: redactHeaders(buildHeaders(input.provider, input.apiKey)),
  };
}

function assertProviderReady(provider: Provider, apiKey: string | null): void {
  if (!/^https?:\/\//i.test(provider.baseUrl)) {
    throw new ProviderRuntimeError('Provider Base URL must start with http:// or https://.', PROVIDER_RUNTIME_ERROR_CODES.invalidBaseUrl);
  }
  if (provider.authType === 'api-key' && !apiKey) {
    throw new ProviderRuntimeError('Provider API key is missing.', PROVIDER_RUNTIME_ERROR_CODES.missingSecret);
  }
}

function buildHeaders(provider: Provider, apiKey: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (provider.authType === 'api-key' && apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  if (provider.customHeadersJson) {
    try {
      const customHeaders = JSON.parse(provider.customHeadersJson) as Record<string, unknown>;
      for (const [key, value] of Object.entries(customHeaders)) {
        if (/^[A-Za-z0-9-]+$/.test(key) && typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        }
      }
    } catch {
      throw new ProviderRuntimeError('Provider custom headers JSON is invalid.', PROVIDER_RUNTIME_ERROR_CODES.invalidResponse);
    }
  }
  return headers;
}

function joinEndpoint(baseUrl: string, endpoint: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${endpoint}`;
}

async function buildHttpError(response: Response): Promise<ProviderRuntimeError> {
  const text = await response.text();
  const message = parseErrorMessage(text) ?? `Provider returned HTTP ${response.status}.`;
  return new ProviderRuntimeError(redactSensitive(message), normalizeProviderHttpErrorCode(response.status), {
    status: response.status,
    retryable: isRetryableProviderStatus(response.status),
  });
}

function parseErrorMessage(text: string): string | null {
  try {
    const body = JSON.parse(text) as { error?: { message?: unknown }; message?: unknown };
    if (typeof body.error?.message === 'string') return body.error.message;
    if (typeof body.message === 'string') return body.message;
  } catch {
    // Use the plain text below when the provider does not return JSON.
  }
  const cleaned = text.trim();
  return cleaned ? cleaned.slice(0, 500) : null;
}

async function parseJsonResponse(response: Response): Promise<Omit<ProviderInvocationResult, 'latencyMs' | 'retryCount'>> {
  const body = await response.json() as {
    choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>;
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown };
    model?: unknown;
    id?: unknown;
  };
  const choice = Array.isArray(body.choices) ? body.choices[0] : null;
  const content = typeof choice?.message?.content === 'string' ? choice.message.content : '';
  if (!content) {
    throw new ProviderRuntimeError('Provider response did not include assistant content.', PROVIDER_RUNTIME_ERROR_CODES.invalidResponse);
  }
  return {
    content,
    chunks: [content],
    inputTokens: toNullableNumber(body.usage?.prompt_tokens),
    outputTokens: toNullableNumber(body.usage?.completion_tokens),
    totalTokens: toNullableNumber(body.usage?.total_tokens),
    finishReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : null,
    streamed: false,
    responseSummary: {
      id: typeof body.id === 'string' ? body.id : null,
      model: typeof body.model === 'string' ? body.model : null,
      finishReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : null,
      usage: body.usage ?? null,
    },
  };
}

async function parseStreamingResponse(response: Response): Promise<Omit<ProviderInvocationResult, 'latencyMs' | 'retryCount'>> {
  if (!response.body) {
    throw new ProviderRuntimeError('Provider streaming response did not include a body.', PROVIDER_RUNTIME_ERROR_CODES.invalidResponse);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const chunks: string[] = [];
  let finishReason: string | null = null;
  let usage: { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown } | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice('data:'.length).trim();
      if (data === '[DONE]') {
        continue;
      }
      const chunk = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: unknown }; finish_reason?: unknown }>;
        usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown };
      };
      const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : null;
      if (typeof choice?.delta?.content === 'string') {
        chunks.push(choice.delta.content);
        content += choice.delta.content;
      }
      if (typeof choice?.finish_reason === 'string') {
        finishReason = choice.finish_reason;
      }
      if (chunk.usage) {
        usage = chunk.usage;
      }
    }
  }

  if (!content) {
    throw new ProviderRuntimeError('Provider stream did not include assistant content.', PROVIDER_RUNTIME_ERROR_CODES.invalidResponse);
  }
  return {
    content,
    chunks,
    inputTokens: toNullableNumber(usage?.prompt_tokens),
    outputTokens: toNullableNumber(usage?.completion_tokens),
    totalTokens: toNullableNumber(usage?.total_tokens),
    finishReason,
    streamed: true,
    responseSummary: {
      finishReason,
      usage,
      streamed: true,
    },
  };
}

function normalizeInvocationError(error: unknown): ProviderRuntimeError {
  if (error instanceof ProviderRuntimeError) {
    return error;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ProviderRuntimeError('Provider request was cancelled or timed out.', PROVIDER_RUNTIME_ERROR_CODES.cancelled, { retryable: false });
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return new ProviderRuntimeError('Provider request timed out.', PROVIDER_RUNTIME_ERROR_CODES.timeout, { retryable: true });
  }
  if (error instanceof Error && /timeout/i.test(error.message)) {
    return new ProviderRuntimeError('Provider request timed out.', PROVIDER_RUNTIME_ERROR_CODES.timeout, { retryable: true });
  }
  if (error instanceof Error) {
    return new ProviderRuntimeError(redactSensitive(error.message), PROVIDER_RUNTIME_ERROR_CODES.networkError, { retryable: true });
  }
  return new ProviderRuntimeError('Provider request failed.', PROVIDER_RUNTIME_ERROR_CODES.networkError, { retryable: true });
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
