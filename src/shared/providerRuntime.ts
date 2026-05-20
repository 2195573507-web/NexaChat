import type { ProviderType } from './types.js';

export const PROVIDER_ADAPTER_NAMES = {
  openAiCompatible: 'openai-compatible',
  anthropic: 'anthropic-native',
  gemini: 'gemini-native',
} as const;

export type ProviderAdapterName = (typeof PROVIDER_ADAPTER_NAMES)[keyof typeof PROVIDER_ADAPTER_NAMES];
export type ProviderNativeAdapterName = (typeof PROVIDER_ADAPTER_NAMES)[keyof typeof PROVIDER_ADAPTER_NAMES];

export const OPENAI_COMPATIBLE_ENDPOINTS = {
  models: '/models',
  chatCompletions: '/chat/completions',
} as const;

export const PROVIDER_RUNTIME_POLICY = {
  chatTimeoutMs: 30_000,
  healthTimeoutMs: 10_000,
  maxRetries: 1,
  retryBackoffMs: 150,
} as const;

export const PROVIDER_RUNTIME_ERROR_CODES = {
  unsupportedProvider: 'provider_unsupported',
  invalidBaseUrl: 'provider_invalid_base_url',
  missingSecret: 'provider_secret_missing',
  authFailed: 'provider_auth_failed',
  forbidden: 'provider_forbidden',
  modelNotFound: 'provider_model_not_found',
  rateLimited: 'provider_rate_limited',
  upstreamError: 'provider_upstream_error',
  invalidResponse: 'provider_invalid_response',
  networkError: 'provider_network_error',
  timeout: 'provider_timeout',
  cancelled: 'provider_cancelled',
} as const;

export type ProviderRuntimeErrorCode =
  (typeof PROVIDER_RUNTIME_ERROR_CODES)[keyof typeof PROVIDER_RUNTIME_ERROR_CODES];

const openAiCompatibleTypes: ProviderType[] = [
  'openai-compatible',
  'openai',
  'deepseek',
  'qwen',
  'ollama',
  'lm-studio',
  'custom',
];

export function getProviderAdapterName(providerType: ProviderType): ProviderAdapterName | null {
  if (openAiCompatibleTypes.includes(providerType)) return PROVIDER_ADAPTER_NAMES.openAiCompatible;
  if (providerType === 'anthropic') return PROVIDER_ADAPTER_NAMES.anthropic;
  if (providerType === 'gemini') return PROVIDER_ADAPTER_NAMES.gemini;
  return null;
}

export function isRetryableProviderStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export function normalizeProviderHttpErrorCode(status: number): ProviderRuntimeErrorCode {
  if (status === 401) return PROVIDER_RUNTIME_ERROR_CODES.authFailed;
  if (status === 403) return PROVIDER_RUNTIME_ERROR_CODES.forbidden;
  if (status === 404) return PROVIDER_RUNTIME_ERROR_CODES.modelNotFound;
  if (status === 429) return PROVIDER_RUNTIME_ERROR_CODES.rateLimited;
  if (status >= 500) return PROVIDER_RUNTIME_ERROR_CODES.upstreamError;
  return PROVIDER_RUNTIME_ERROR_CODES.upstreamError;
}
