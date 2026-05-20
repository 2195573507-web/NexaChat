export const GATEWAY_BIND_HOST = '127.0.0.1';
export const GATEWAY_PORT = 8787;
export const GATEWAY_RATE_WINDOW_MS = 60_000;
export const GATEWAY_BODY_LIMIT_BYTES = 2_000_000;

export const GATEWAY_SCOPES = ['models:read', 'chat:write', 'embeddings:write'] as const;
export type GatewayScope = (typeof GATEWAY_SCOPES)[number];

export const GATEWAY_ENDPOINT = {
  models: '/v1/models',
  chatCompletions: '/v1/chat/completions',
  embeddings: '/v1/embeddings',
  responses: '/v1/responses',
} as const;

export const GATEWAY_ENDPOINTS = [
  GATEWAY_ENDPOINT.models,
  GATEWAY_ENDPOINT.chatCompletions,
  GATEWAY_ENDPOINT.embeddings,
  GATEWAY_ENDPOINT.responses,
] as const;
export type GatewayEndpoint = (typeof GATEWAY_ENDPOINTS)[number];

export const GATEWAY_AVAILABLE_ENDPOINTS = [
  GATEWAY_ENDPOINT.models,
  GATEWAY_ENDPOINT.chatCompletions,
  GATEWAY_ENDPOINT.embeddings,
  GATEWAY_ENDPOINT.responses,
] as const;

export const GATEWAY_RESERVED_ENDPOINTS = [] as const;

export const GATEWAY_ENDPOINT_SCOPES = {
  '/v1/models': 'models:read',
  '/v1/chat/completions': 'chat:write',
  '/v1/embeddings': 'embeddings:write',
  '/v1/responses': 'chat:write',
} as const satisfies Record<GatewayEndpoint, GatewayScope>;

export const GATEWAY_KEY_STATES = ['active', 'disabled', 'revoked', 'expired', 'quota_exceeded'] as const;
export type GatewayKeyState = (typeof GATEWAY_KEY_STATES)[number];

export const GATEWAY_IMPORT_SOURCES = ['openai-compatible', 'sub2api', 'ccs', 'ollama', 'lm-studio', 'nexachat'] as const;
export type GatewayImportSource = (typeof GATEWAY_IMPORT_SOURCES)[number];

export const GATEWAY_ERROR_CODES = [
  'missing_key',
  'invalid_key',
  'disabled_key',
  'revoked_key',
  'expired_key',
  'scope_denied',
  'quota_exceeded',
  'rate_limited',
  'body_too_large',
  'invalid_json',
  'invalid_request',
  'not_found',
  'unsupported_field',
  'provider_error',
  'internal_error',
] as const;
export type GatewayErrorCode = (typeof GATEWAY_ERROR_CODES)[number];

export const GATEWAY_ERROR_STATUS: Record<GatewayErrorCode, number> = {
  missing_key: 401,
  invalid_key: 401,
  disabled_key: 403,
  revoked_key: 401,
  expired_key: 401,
  scope_denied: 403,
  quota_exceeded: 429,
  rate_limited: 429,
  body_too_large: 413,
  invalid_json: 400,
  invalid_request: 400,
  not_found: 404,
  unsupported_field: 400,
  provider_error: 502,
  internal_error: 500,
};

export const GATEWAY_ERROR_MESSAGES: Record<GatewayErrorCode, string> = {
  missing_key: 'Missing bearer token.',
  invalid_key: 'Invalid gateway API key.',
  disabled_key: 'Gateway API key is disabled.',
  revoked_key: 'Gateway API key was revoked.',
  expired_key: 'Gateway API key expired.',
  scope_denied: 'Gateway API key does not include the required scope.',
  quota_exceeded: 'Gateway API key quota is exhausted.',
  rate_limited: 'Gateway API key rate limit was reached.',
  body_too_large: 'Request body is too large.',
  invalid_json: 'Request body is not valid JSON.',
  invalid_request: 'Request body did not match this endpoint contract.',
  not_found: 'Endpoint not found.',
  unsupported_field: 'Request uses fields that are outside the current basic gateway contract.',
  provider_error: 'Provider invocation failed.',
  internal_error: 'Internal gateway error.',
};

export const GATEWAY_DEFAULT_KEY_POLICY = {
  scopes: GATEWAY_SCOPES,
  quotaLimit: 1_000,
  rateLimitPerMinute: 60,
  expiresAt: null,
} as const;

export interface GatewayKeyPolicyInput {
  scopes?: readonly string[];
  quotaLimit?: number | null;
  rateLimitPerMinute?: number | null;
  expiresAt?: number | null;
}

export function isGatewayScope(value: string): value is GatewayScope {
  return (GATEWAY_SCOPES as readonly string[]).includes(value);
}

export function normalizeGatewayScopes(scopes: readonly string[] | null | undefined): GatewayScope[] {
  const normalized = Array.from(new Set((scopes ?? []).filter(isGatewayScope)));
  return normalized.length > 0 ? normalized : [...GATEWAY_DEFAULT_KEY_POLICY.scopes];
}

export function normalizeGatewayLimit(value: number | null | undefined): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return GATEWAY_DEFAULT_KEY_POLICY.quotaLimit;
  }
  return Math.max(0, Math.floor(value));
}

export function normalizeGatewayRateLimit(value: number | null | undefined): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return GATEWAY_DEFAULT_KEY_POLICY.rateLimitPerMinute;
  }
  return Math.max(0, Math.floor(value));
}

export function resolveGatewayKeyState(input: {
  disabled: boolean;
  revokedAt: number | null;
  expiresAt: number | null;
  quotaLimit: number | null;
  quotaUsed: number;
}, timestamp = Date.now()): GatewayKeyState {
  if (input.revokedAt) return 'revoked';
  if (input.disabled) return 'disabled';
  if (input.expiresAt && input.expiresAt < timestamp) return 'expired';
  if (input.quotaLimit !== null && input.quotaUsed >= input.quotaLimit) return 'quota_exceeded';
  return 'active';
}
