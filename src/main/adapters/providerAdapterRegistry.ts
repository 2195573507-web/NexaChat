import type { Model, Provider, ProviderModelOption, ProviderType } from '../../shared/types.js';
import {
  OPENAI_COMPATIBLE_ENDPOINTS,
  PROVIDER_ADAPTER_NAMES,
  PROVIDER_RUNTIME_ERROR_CODES,
  PROVIDER_RUNTIME_POLICY,
  type ProviderAdapterName,
  type ProviderNativeAdapterName,
  type ProviderRuntimeErrorCode,
  isRetryableProviderStatus,
  normalizeProviderHttpErrorCode,
} from '../../shared/providerRuntime.js';
import { redactHeaders, redactSensitive } from '../security/redaction.js';
import {
  ProviderRuntimeError,
  fetchOpenAiCompatibleModels,
  getEmbeddingRequestSummary as getOpenAiCompatibleEmbeddingRequestSummary,
  getProviderRequestSummary as getOpenAiCompatibleRequestSummary,
  invokeOpenAiCompatibleEmbeddings,
  invokeOpenAiCompatibleChat,
  testOpenAiCompatibleProvider,
  type ChatMessageInput,
  type ProviderEmbeddingInput,
  type ProviderEmbeddingResult,
  type ProviderHealthResult,
  type ProviderInvocationInput,
  type ProviderInvocationResult,
  type ProviderModelListResult,
} from './openAiCompatibleAdapter.js';

export type ProviderAdapterCapabilities = {
  supportsChat: boolean;
  supportsStreaming: boolean;
  supportsModels: boolean;
  supportsEmbeddings: boolean;
  supportsResponses: boolean;
  chat: boolean;
  streaming: boolean;
  modelList: boolean;
  embeddings: boolean;
  tools: boolean;
  vision: boolean;
};

export interface ProviderAdapter {
  name: ProviderAdapterName;
  protocol: 'openai-compatible' | 'anthropic-native' | 'gemini-native';
  capabilities: ProviderAdapterCapabilities;
  invokeChat(input: ProviderInvocationInput): Promise<ProviderInvocationResult>;
  invokeEmbeddings(input: ProviderEmbeddingInput): Promise<ProviderEmbeddingResult>;
  testProvider(provider: Provider, apiKey: string | null): Promise<ProviderHealthResult>;
  fetchModels(provider: Provider, apiKey: string | null): Promise<ProviderModelListResult>;
  getRequestSummary(input: ProviderInvocationInput): Record<string, unknown>;
  getEmbeddingRequestSummary(input: ProviderEmbeddingInput): Record<string, unknown>;
}

type NativeChatEndpoint = {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

const OPENAI_COMPATIBLE_TYPES: ProviderType[] = [
  'openai-compatible',
  'openai',
  'deepseek',
  'qwen',
  'ollama',
  'lm-studio',
  'custom',
];

const OPENAI_COMPATIBLE_ADAPTER: ProviderAdapter = {
  name: PROVIDER_ADAPTER_NAMES.openAiCompatible,
  protocol: 'openai-compatible',
  capabilities: {
    supportsChat: true,
    supportsStreaming: true,
    supportsModels: true,
    supportsEmbeddings: true,
    supportsResponses: true,
    chat: true,
    streaming: true,
    modelList: true,
    embeddings: true,
    tools: false,
    vision: false,
  },
  invokeChat: invokeOpenAiCompatibleChat,
  invokeEmbeddings: invokeOpenAiCompatibleEmbeddings,
  testProvider: testOpenAiCompatibleProvider,
  fetchModels: fetchOpenAiCompatibleModels,
  getRequestSummary: getOpenAiCompatibleRequestSummary,
  getEmbeddingRequestSummary: getOpenAiCompatibleEmbeddingRequestSummary,
};

const ANTHROPIC_ADAPTER: ProviderAdapter = createNativeAdapter({
  name: PROVIDER_ADAPTER_NAMES.anthropic,
  protocol: 'anthropic-native',
  capabilities: {
    supportsChat: true,
    supportsStreaming: true,
    supportsModels: true,
    supportsEmbeddings: false,
    supportsResponses: false,
    chat: true,
    streaming: true,
    modelList: true,
    embeddings: false,
    tools: false,
    vision: false,
  },
  buildEndpoint(input) {
    const messages = input.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      }));
    const system = input.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n')
      .trim();
    return {
      url: joinEndpoint(input.provider.baseUrl, '/messages'),
      headers: {
        'content-type': 'application/json',
        accept: input.stream === true ? 'text/event-stream' : 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': input.apiKey ?? '',
        ...parseCustomHeaders(input.provider),
      },
      body: {
        model: input.model.name,
        max_tokens: 1024,
        messages,
        stream: input.stream === true,
        ...(system ? { system } : {}),
      },
    };
  },
  parseJson(body) {
    const content = Array.isArray((body as { content?: unknown }).content)
      ? ((body as { content: Array<Record<string, unknown>> }).content)
          .map((item) => typeof item.text === 'string' ? item.text : '')
          .filter(Boolean)
          .join('')
      : '';
    const usage = (body as { usage?: { input_tokens?: unknown; output_tokens?: unknown } }).usage;
    return {
      content,
      chunks: [content],
      inputTokens: toNullableNumber(usage?.input_tokens),
      outputTokens: toNullableNumber(usage?.output_tokens),
      totalTokens: sumNullable(toNullableNumber(usage?.input_tokens), toNullableNumber(usage?.output_tokens)),
      finishReason: typeof (body as { stop_reason?: unknown }).stop_reason === 'string' ? String((body as { stop_reason: string }).stop_reason) : null,
      streamed: false,
      responseSummary: {
        id: typeof (body as { id?: unknown }).id === 'string' ? (body as { id: string }).id : null,
        model: typeof (body as { model?: unknown }).model === 'string' ? (body as { model: string }).model : null,
        native: 'anthropic',
        usage: usage ?? null,
      },
    };
  },
  parseStreamData(data, state) {
    const event = JSON.parse(data) as {
      type?: unknown;
      delta?: { text?: unknown; stop_reason?: unknown };
      usage?: { input_tokens?: unknown; output_tokens?: unknown };
    };
    if (event.type === 'content_block_delta' && typeof event.delta?.text === 'string') {
      state.pushChunk(event.delta.text);
    }
    if (typeof event.delta?.stop_reason === 'string') {
      state.finishReason = event.delta.stop_reason;
    }
    if (event.usage) {
      state.inputTokens = toNullableNumber(event.usage.input_tokens) ?? state.inputTokens;
      state.outputTokens = toNullableNumber(event.usage.output_tokens) ?? state.outputTokens;
    }
  },
  async fetchModels(provider, apiKey) {
    const startedAt = Date.now();
    assertProviderReady(provider, apiKey);
    const response = await fetch(joinEndpoint(provider.baseUrl, '/models'), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey ?? '',
        ...parseCustomHeaders(provider),
      },
      signal: AbortSignal.timeout(PROVIDER_RUNTIME_POLICY.healthTimeoutMs),
    });
    return parseNativeModelsResponse(response, startedAt);
  },
  fallbackModels: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
});

const GEMINI_ADAPTER: ProviderAdapter = createNativeAdapter({
  name: PROVIDER_ADAPTER_NAMES.gemini,
  protocol: 'gemini-native',
  capabilities: {
    supportsChat: true,
    supportsStreaming: true,
    supportsModels: true,
    supportsEmbeddings: false,
    supportsResponses: false,
    chat: true,
    streaming: true,
    modelList: true,
    embeddings: false,
    tools: false,
    vision: false,
  },
  buildEndpoint(input) {
    const endpoint = buildGeminiModelEndpoint(
      input.model.name,
      input.stream === true ? 'streamGenerateContent?alt=sse' : 'generateContent',
    );
    return {
      url: joinEndpoint(input.provider.baseUrl, endpoint),
      headers: {
        'content-type': 'application/json',
        accept: input.stream === true ? 'text/event-stream' : 'application/json',
        'x-goog-api-key': input.apiKey ?? '',
        ...parseCustomHeaders(input.provider),
      },
      body: {
        contents: messagesToGeminiContents(input.messages),
      },
    };
  },
  parseJson(body) {
    const candidates = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> }; finishReason?: unknown }> }).candidates;
    const first = Array.isArray(candidates) ? candidates[0] : null;
    const content = first?.content?.parts?.map((part) => typeof part.text === 'string' ? part.text : '').filter(Boolean).join('') ?? '';
    const usage = (body as {
      usageMetadata?: {
        promptTokenCount?: unknown;
        candidatesTokenCount?: unknown;
        totalTokenCount?: unknown;
      };
    }).usageMetadata;
    return {
      content,
      chunks: [content],
      inputTokens: toNullableNumber(usage?.promptTokenCount),
      outputTokens: toNullableNumber(usage?.candidatesTokenCount),
      totalTokens: toNullableNumber(usage?.totalTokenCount),
      finishReason: typeof first?.finishReason === 'string' ? first.finishReason : null,
      streamed: false,
      responseSummary: {
        native: 'gemini',
        finishReason: typeof first?.finishReason === 'string' ? first.finishReason : null,
        usage: usage ?? null,
      },
    };
  },
  parseStreamData(data, state) {
    const event = JSON.parse(data) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> }; finishReason?: unknown }>;
      usageMetadata?: {
        promptTokenCount?: unknown;
        candidatesTokenCount?: unknown;
        totalTokenCount?: unknown;
      };
    };
    const first = Array.isArray(event.candidates) ? event.candidates[0] : null;
    const content = first?.content?.parts?.map((part) => typeof part.text === 'string' ? part.text : '').filter(Boolean).join('') ?? '';
    if (content) {
      state.pushChunk(content);
    }
    if (typeof first?.finishReason === 'string') {
      state.finishReason = first.finishReason;
    }
    if (event.usageMetadata) {
      state.inputTokens = toNullableNumber(event.usageMetadata.promptTokenCount) ?? state.inputTokens;
      state.outputTokens = toNullableNumber(event.usageMetadata.candidatesTokenCount) ?? state.outputTokens;
      state.totalTokens = toNullableNumber(event.usageMetadata.totalTokenCount) ?? state.totalTokens;
    }
  },
  async fetchModels(provider, apiKey) {
    const startedAt = Date.now();
    assertProviderReady(provider, apiKey);
    const response = await fetch(joinEndpoint(provider.baseUrl, '/models'), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-goog-api-key': apiKey ?? '',
        ...parseCustomHeaders(provider),
      },
      signal: AbortSignal.timeout(PROVIDER_RUNTIME_POLICY.healthTimeoutMs),
    });
    return parseNativeModelsResponse(response, startedAt, (body) => {
      const models = (body as { models?: Array<{ name?: unknown; supportedGenerationMethods?: unknown }> }).models;
      return Array.isArray(models)
        ? models
            .filter((model) => {
              const methods = Array.isArray(model.supportedGenerationMethods) ? model.supportedGenerationMethods : [];
              return methods.length === 0 || methods.includes('generateContent');
            })
            .map((model) => String(model.name ?? '').replace(/^models\//, ''))
            .filter(Boolean)
        : [];
    });
  },
  fallbackModels: ['gemini-1.5-pro', 'gemini-1.5-flash'],
});

const ADAPTERS: Record<ProviderNativeAdapterName, ProviderAdapter> = {
  [PROVIDER_ADAPTER_NAMES.openAiCompatible]: OPENAI_COMPATIBLE_ADAPTER,
  [PROVIDER_ADAPTER_NAMES.anthropic]: ANTHROPIC_ADAPTER,
  [PROVIDER_ADAPTER_NAMES.gemini]: GEMINI_ADAPTER,
};

export function getProviderAdapter(providerType: ProviderType): ProviderAdapter | null {
  if (OPENAI_COMPATIBLE_TYPES.includes(providerType)) {
    return OPENAI_COMPATIBLE_ADAPTER;
  }
  if (providerType === 'anthropic') {
    return ANTHROPIC_ADAPTER;
  }
  if (providerType === 'gemini') {
    return GEMINI_ADAPTER;
  }
  return null;
}

export function getProviderAdapterCapabilities(providerType: ProviderType): ProviderAdapterCapabilities | null {
  return getProviderAdapter(providerType)?.capabilities ?? null;
}

export function listProviderAdapters(): ProviderAdapter[] {
  return Object.values(ADAPTERS);
}

function createNativeAdapter(input: {
  name: ProviderNativeAdapterName;
  protocol: ProviderAdapter['protocol'];
  capabilities: ProviderAdapterCapabilities;
  buildEndpoint(input: ProviderInvocationInput): NativeChatEndpoint;
  parseJson(body: unknown): Omit<ProviderInvocationResult, 'latencyMs' | 'retryCount'>;
  parseStreamData(data: string, state: NativeStreamState): void;
  fetchModels(provider: Provider, apiKey: string | null): Promise<ProviderModelListResult>;
  fallbackModels: string[];
}): ProviderAdapter {
  return {
    name: input.name,
    protocol: input.protocol,
    capabilities: input.capabilities,
    invokeChat: (invocation) => invokeNativeChat(invocation, input),
    invokeEmbeddings: async () => {
      throw new ProviderRuntimeError('This provider adapter does not support embeddings.', PROVIDER_RUNTIME_ERROR_CODES.embeddingsUnsupported);
    },
    testProvider: (provider, apiKey) => testNativeProvider(provider, apiKey, input.fetchModels, input.fallbackModels),
    fetchModels: (provider, apiKey) => input.fetchModels(provider, apiKey).catch((error) => {
      const normalized = normalizeInvocationError(error);
      if (normalized.code === PROVIDER_RUNTIME_ERROR_CODES.modelNotFound || normalized.code === PROVIDER_RUNTIME_ERROR_CODES.invalidResponse) {
        return {
          modelNames: input.fallbackModels,
          status: normalized.status ?? 0,
          latencyMs: 1,
        };
      }
      throw normalized;
    }),
    getRequestSummary(invocation) {
      return {
        providerId: invocation.provider.id,
        providerType: invocation.provider.type,
        adapter: input.name,
        protocol: input.protocol,
        baseUrl: invocation.provider.baseUrl,
        model: invocation.model.name,
        messageCount: invocation.messages.length,
        stream: invocation.stream === true,
        timeoutMs: invocation.timeoutMs ?? PROVIDER_RUNTIME_POLICY.chatTimeoutMs,
        maxRetries: invocation.maxRetries ?? PROVIDER_RUNTIME_POLICY.maxRetries,
        headers: redactHeaders(input.buildEndpoint(invocation).headers),
      };
    },
    getEmbeddingRequestSummary(invocation) {
      return {
        providerId: invocation.provider.id,
        providerType: invocation.provider.type,
        adapter: input.name,
        protocol: input.protocol,
        baseUrl: invocation.provider.baseUrl,
        model: invocation.model.name,
        inputCount: invocation.input.length,
        supported: false,
      };
    },
  };
}

async function invokeNativeChat(
  invocation: ProviderInvocationInput,
  adapter: {
    buildEndpoint(input: ProviderInvocationInput): NativeChatEndpoint;
    parseJson(body: unknown): Omit<ProviderInvocationResult, 'latencyMs' | 'retryCount'>;
    parseStreamData(data: string, state: NativeStreamState): void;
  },
): Promise<ProviderInvocationResult> {
  assertProviderReady(invocation.provider, invocation.apiKey);
  const startedAt = Date.now();
  const timeoutMs = invocation.timeoutMs ?? PROVIDER_RUNTIME_POLICY.chatTimeoutMs;
  const maxRetries = invocation.maxRetries ?? PROVIDER_RUNTIME_POLICY.maxRetries;
  let attempt = 0;
  let lastError: ProviderRuntimeError | null = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const upstreamAbort = () => controller.abort(invocation.signal?.reason);
    const timer = setTimeout(() => controller.abort(new Error('provider_timeout')), timeoutMs);
    invocation.signal?.addEventListener('abort', upstreamAbort, { once: true });
    try {
      const endpoint = adapter.buildEndpoint(invocation);
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: endpoint.headers,
        body: JSON.stringify(endpoint.body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      invocation.signal?.removeEventListener('abort', upstreamAbort);
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
      const parsed = invocation.stream === true
        ? await parseNativeStreamingResponse(response, adapter.parseStreamData, invocation)
        : adapter.parseJson(await response.json());
      if (!parsed.content) {
        throw new ProviderRuntimeError('Provider response did not include assistant content.', PROVIDER_RUNTIME_ERROR_CODES.invalidResponse);
      }
      return {
        ...parsed,
        latencyMs: Math.max(1, Date.now() - startedAt),
        retryCount: attempt,
      };
    } catch (error) {
      clearTimeout(timer);
      invocation.signal?.removeEventListener('abort', upstreamAbort);
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

async function testNativeProvider(
  provider: Provider,
  apiKey: string | null,
  fetchModels: (provider: Provider, apiKey: string | null) => Promise<ProviderModelListResult>,
  fallbackModels: string[],
): Promise<ProviderHealthResult> {
  const startedAt = Date.now();
  try {
    const result = await fetchModels(provider, apiKey).catch((error) => {
      const normalized = normalizeInvocationError(error);
      if (normalized.code === PROVIDER_RUNTIME_ERROR_CODES.modelNotFound || normalized.code === PROVIDER_RUNTIME_ERROR_CODES.invalidResponse) {
        return {
          modelNames: fallbackModels,
          status: normalized.status ?? 0,
          latencyMs: Math.max(1, Date.now() - startedAt),
        };
      }
      throw normalized;
    });
    return {
      ok: true,
      latencyMs: result.latencyMs,
      status: result.status,
      errorCode: null,
      errorMessage: null,
      modelNames: result.modelNames,
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

class NativeStreamState {
  chunks: string[] = [];
  content = '';
  inputTokens: number | null = null;
  outputTokens: number | null = null;
  totalTokens: number | null = null;
  finishReason: string | null = null;

  constructor(private readonly onChunk?: (chunk: string) => void) {}

  pushChunk(chunk: string): void {
    this.chunks.push(chunk);
    this.content += chunk;
    this.onChunk?.(chunk);
  }
}

async function parseNativeStreamingResponse(
  response: Response,
  parseData: (data: string, state: NativeStreamState) => void,
  invocation: Pick<ProviderInvocationInput, 'onChunk' | 'onProgress'>,
): Promise<Omit<ProviderInvocationResult, 'latencyMs' | 'retryCount'>> {
  if (!response.body) {
    throw new ProviderRuntimeError('Provider streaming response did not include a body.', PROVIDER_RUNTIME_ERROR_CODES.invalidResponse);
  }
  const state = new NativeStreamState(invocation.onChunk);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
      if (data === '[DONE]') continue;
      parseData(data, state);
      invocation.onProgress?.('stream');
    }
  }
  return {
    content: state.content,
    chunks: state.chunks,
    inputTokens: state.inputTokens,
    outputTokens: state.outputTokens,
    totalTokens: state.totalTokens ?? sumNullable(state.inputTokens, state.outputTokens),
    finishReason: state.finishReason,
    streamed: true,
    responseSummary: {
      streamed: true,
      finishReason: state.finishReason,
      usage: {
        inputTokens: state.inputTokens,
        outputTokens: state.outputTokens,
        totalTokens: state.totalTokens,
      },
    },
  };
}

function messagesToGeminiContents(messages: ChatMessageInput[]): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: message.content }],
    }));
  const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n').trim();
  return system ? [{ role: 'user', parts: [{ text: system }] }, ...contents] : contents;
}

async function parseNativeModelsResponse(
  response: Response,
  startedAt: number,
  parser: (body: unknown) => string[] = (body) => {
    const data = (body as { data?: Array<{ id?: unknown }> }).data;
    return Array.isArray(data) ? data.map((item) => String(item.id ?? '')).filter(Boolean) : [];
  },
): Promise<ProviderModelListResult> {
  const latencyMs = Math.max(1, Date.now() - startedAt);
  if (!response.ok) {
    throw await buildHttpError(response);
  }
  const body = await response.json();
  const modelNames = Array.from(new Set(parser(body)));
  if (modelNames.length === 0) {
    throw new ProviderRuntimeError('Provider models response did not include model names.', PROVIDER_RUNTIME_ERROR_CODES.invalidResponse, { status: response.status });
  }
  return {
    modelNames,
    status: response.status,
    latencyMs,
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

function parseCustomHeaders(provider: Provider): Record<string, string> {
  if (!provider.customHeadersJson) {
    return {};
  }
  try {
    const headers = JSON.parse(provider.customHeadersJson) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(headers).filter(([key, value]) => /^[A-Za-z0-9-]+$/.test(key) && typeof value === 'string').map(([key, value]) => [key.toLowerCase(), value as string]));
  } catch {
    throw new ProviderRuntimeError('Provider custom headers JSON is invalid.', PROVIDER_RUNTIME_ERROR_CODES.invalidResponse);
  }
}

function joinEndpoint(baseUrl: string, endpoint: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${endpoint}`;
}

function buildGeminiModelEndpoint(modelName: string, method: string): string {
  const modelPath = ['models', encodeURIComponent(modelName)].join('/');
  return `/${modelPath}:${method}`;
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
    // Use plain text below for non-JSON provider errors.
  }
  const cleaned = text.trim();
  return cleaned ? cleaned.slice(0, 500) : null;
}

function normalizeInvocationError(error: unknown): ProviderRuntimeError {
  if (error instanceof ProviderRuntimeError) {
    return error;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ProviderRuntimeError('Provider request was cancelled or timed out.', PROVIDER_RUNTIME_ERROR_CODES.cancelled);
  }
  if (error instanceof Error && /cancelled|aborted/i.test(error.message)) {
    return new ProviderRuntimeError('Provider request was cancelled.', PROVIDER_RUNTIME_ERROR_CODES.cancelled);
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

function sumNullable(left: number | null, right: number | null): number | null {
  return left === null && right === null ? null : (left ?? 0) + (right ?? 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
