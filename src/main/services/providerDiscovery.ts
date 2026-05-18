import type {
  ProviderDiscoveryCandidate,
  ProviderDiscoveryCapability,
  ProviderDiscoveryCapabilities,
  ProviderDiscoveryIssue,
  ProviderDiscoveryRequest,
  ProviderDiscoveryResult,
  ProviderModelOption,
} from '../../shared/types.js';
import { PROVIDER_RUNTIME_ERROR_CODES, PROVIDER_RUNTIME_POLICY, normalizeProviderHttpErrorCode } from '../../shared/providerRuntime.js';
import { redactSensitive } from '../security/redaction.js';

const CANDIDATE_PATHS = ['', '/v1'];
const MODEL_ENDPOINTS = ['/models', '/v1/models'];
const CHAT_ENDPOINTS = ['/chat/completions', '/v1/chat/completions'];
const EMBEDDINGS_ENDPOINTS = ['/embeddings', '/v1/embeddings'];
const MAX_MODEL_EXAMPLES = 5;
const MAX_CANDIDATES = 4;

export interface ProviderDiscoveryOptions {
  fetchImpl?: typeof fetch;
  nowMs?: () => number;
}

interface DiscoveryFetchResult {
  ok: boolean;
  status: number | null;
  body: unknown;
  text: string;
  latencyMs: number;
  error?: ProviderDiscoveryIssue;
}

interface CandidateScore {
  candidate: ProviderDiscoveryCandidate;
  modelEndpoint: string;
  models: ProviderModelOption[];
  latencyMs: number;
  issue: ProviderDiscoveryIssue | null;
  chatSupported: boolean;
  chatResult: DiscoveryFetchResult | null;
}

export function normalizeProviderDiscoveryAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidBaseUrl, 'Provider address is required.');
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidBaseUrl, 'Provider address is not a valid URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidBaseUrl, 'Provider address must use http:// or https://.');
  }
  if (!parsed.hostname || parsed.username || parsed.password) {
    throw discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidBaseUrl, 'Provider address must not include credentials.');
  }
  parsed.hash = '';
  parsed.search = '';
  const pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.pathname = pathname === '/' ? '' : pathname;
  return parsed.toString().replace(/\/+$/, '');
}

export function createProviderDiscoveryCandidates(address: string, manualBaseUrl?: string): ProviderDiscoveryCandidate[] {
  const normalizedInput = normalizeProviderDiscoveryAddress(manualBaseUrl?.trim() || address);
  const bases = new Set<string>();
  const withoutEndpoint = stripKnownEndpoint(normalizedInput);
  bases.add(withoutEndpoint);
  if (withoutEndpoint === normalizedInput) {
    bases.add(normalizedInput);
  }
  for (const path of CANDIDATE_PATHS) {
    bases.add(appendPathAvoidingDuplicate(withoutEndpoint, path));
  }

  return Array.from(bases)
    .filter((baseUrl) => baseUrl.length > 0)
    .slice(0, MAX_CANDIDATES)
    .map((baseUrl) => ({
      baseUrl,
      modelsEndpoint: selectEndpointForBase(baseUrl, MODEL_ENDPOINTS),
      chatEndpoint: selectEndpointForBase(baseUrl, CHAT_ENDPOINTS),
      embeddingsEndpoint: selectEndpointForBase(baseUrl, EMBEDDINGS_ENDPOINTS),
    }));
}

export function parseOpenAiCompatibleModelsResponse(body: unknown): ProviderModelOption[] {
  if (!body || typeof body !== 'object') {
    throw discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidResponse, 'Provider models response was not a JSON object.');
  }
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    throw discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidResponse, 'Provider models response did not include a data array.');
  }
  const names = data
    .map((item) => (item && typeof item === 'object' ? (item as { id?: unknown }).id : null))
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim());
  return Array.from(new Set(names)).map((name) => ({ id: name, name }));
}

export function redactProviderDiscoveryIssue(issue: ProviderDiscoveryIssue): ProviderDiscoveryIssue {
  return {
    ...issue,
    message: redactSensitive(issue.message),
    candidateBaseUrl: issue.candidateBaseUrl ? redactSensitive(issue.candidateBaseUrl) : undefined,
    endpoint: issue.endpoint,
  };
}

export function buildProviderDiscoveryHeadersForTesting(apiKey?: string, customHeadersJson?: string): Record<string, string> {
  return buildDiscoveryHeaders(apiKey, customHeadersJson);
}

export async function discoverProvider(
  input: ProviderDiscoveryRequest,
  options: ProviderDiscoveryOptions = {},
): Promise<ProviderDiscoveryResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const nowMs = options.nowMs ?? Date.now;
  const startedAt = nowMs();
  const warnings: ProviderDiscoveryIssue[] = [];
  const errors: ProviderDiscoveryIssue[] = [];
  let candidates: ProviderDiscoveryCandidate[] = [];

  try {
    candidates = createProviderDiscoveryCandidates(input.address, input.baseUrl);
    buildDiscoveryHeaders(input.apiKey, input.customHeadersJson);
  } catch (error) {
    const issue = normalizeDiscoveryError(error);
    return buildFailedResult(input, nowMs() - startedAt, [issue]);
  }

  const scores: CandidateScore[] = [];
  for (const candidate of candidates) {
    const score = await testModelsForCandidate(candidate, input, fetchImpl);
    if (score.models[0]) {
      score.chatResult = await testChatForCandidate(score.candidate, score.models[0], input, fetchImpl);
      score.chatSupported = score.chatResult.ok;
    }
    scores.push(score);
    if (score.issue) {
      errors.push(score.issue);
    }
  }

  const best = pickBestCandidate(scores);
  if (!best || best.models.length === 0) {
    const issue = errors[0] ?? discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidResponse, 'No candidate returned an OpenAI-compatible model list.');
    return buildFailedResult(input, nowMs() - startedAt, [issue], candidates);
  }

  const capabilities: ProviderDiscoveryCapabilities = {
    openAiCompatible: 'supported',
    models: 'supported',
    chatCompletions: 'not_tested',
    streaming: 'not_tested',
    tokenUsage: 'not_tested',
    embeddings: 'not_tested',
  };

  const chatResult = best.chatResult ?? await testChatForCandidate(best.candidate, best.models[0], input, fetchImpl);
  if (chatResult.ok) {
    capabilities.chatCompletions = 'supported';
    capabilities.tokenUsage = hasTokenUsage(chatResult.body) ? 'supported' : 'unknown';
    capabilities.streaming = 'unknown';
  } else if (chatResult.error) {
    warnings.push(chatResult.error);
    capabilities.chatCompletions = chatResult.status === 404 ? 'unsupported' : 'unknown';
  }

  if (best.models.length === 0) {
    warnings.push(discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidResponse, 'Provider did not return model names.'));
  }

  const status = warnings.length > 0 ? 'partial' : 'success';
  const baseUrl = normalizeSelectedBaseUrl(best.candidate.baseUrl, best.modelEndpoint);
  return {
    status,
    inputAddress: redactSensitive(input.address.trim()),
    normalizedBaseUrl: baseUrl,
    suggestedProviderName: suggestProviderName(input.providerName, input.address, baseUrl),
    providerType: input.providerType ?? 'openai-compatible',
    compatibility: 'openai-compatible',
    capabilities,
    models: best.models,
    modelExamples: best.models.slice(0, MAX_MODEL_EXAMPLES).map((model) => model.name),
    warnings: warnings.map(redactProviderDiscoveryIssue),
    errors: errors.map(redactProviderDiscoveryIssue),
    testedCandidates: candidates,
    selectedCandidateBaseUrl: best.candidate.baseUrl,
    latencyMs: Math.max(1, nowMs() - startedAt),
  };
}

async function testModelsForCandidate(
  candidate: ProviderDiscoveryCandidate,
  input: ProviderDiscoveryRequest,
  fetchImpl: typeof fetch,
): Promise<CandidateScore> {
  let bestModels: ProviderModelOption[] = [];
  let bestLatency = 0;
  let firstIssue: ProviderDiscoveryIssue | null = null;
  for (const endpoint of endpointCandidatesForBase(candidate.baseUrl, MODEL_ENDPOINTS)) {
    const url = joinEndpoint(candidate.baseUrl, endpoint);
    const result = await discoveryFetch(fetchImpl, url, {
      method: 'GET',
      headers: buildDiscoveryHeaders(input.apiKey, input.customHeadersJson),
      timeoutMs: input.timeoutMs ?? PROVIDER_RUNTIME_POLICY.healthTimeoutMs,
      endpoint,
      candidateBaseUrl: candidate.baseUrl,
    });
    bestLatency = result.latencyMs;
    if (!result.ok) {
      firstIssue ??= result.error ?? discoveryError(PROVIDER_RUNTIME_ERROR_CODES.upstreamError, `Provider models check failed with status ${result.status ?? 'unknown'}.`, { status: result.status, candidateBaseUrl: candidate.baseUrl, endpoint });
      continue;
    }
    try {
      bestModels = parseOpenAiCompatibleModelsResponse(result.body);
      return { candidate, modelEndpoint: endpoint, models: bestModels, latencyMs: result.latencyMs, issue: null, chatSupported: false, chatResult: null };
    } catch (error) {
      firstIssue ??= withEndpoint(normalizeDiscoveryError(error), candidate.baseUrl, endpoint);
    }
  }
  return { candidate, modelEndpoint: candidate.modelsEndpoint, models: bestModels, latencyMs: bestLatency, issue: firstIssue, chatSupported: false, chatResult: null };
}

async function testChatForCandidate(
  candidate: ProviderDiscoveryCandidate,
  model: ProviderModelOption,
  input: ProviderDiscoveryRequest,
  fetchImpl: typeof fetch,
): Promise<DiscoveryFetchResult> {
  const endpoint = selectEndpointForBase(candidate.baseUrl, CHAT_ENDPOINTS);
  return discoveryFetch(fetchImpl, joinEndpoint(candidate.baseUrl, endpoint), {
    method: 'POST',
    headers: buildDiscoveryHeaders(input.apiKey, input.customHeadersJson),
    timeoutMs: Math.min(input.timeoutMs ?? PROVIDER_RUNTIME_POLICY.healthTimeoutMs, PROVIDER_RUNTIME_POLICY.healthTimeoutMs),
    body: JSON.stringify({
      model: model.id,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      stream: false,
    }),
    endpoint,
    candidateBaseUrl: candidate.baseUrl,
  });
}

async function discoveryFetch(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit & { timeoutMs: number; endpoint?: string; candidateBaseUrl?: string },
): Promise<DiscoveryFetchResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('provider_timeout')), init.timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
    const text = await response.text();
    const latencyMs = Math.max(1, Date.now() - startedAt);
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      return {
        ok: false,
        status: response.status,
        body: null,
        text: redactSensitive(text).slice(0, 500),
        latencyMs,
        error: discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidResponse, 'Provider returned invalid JSON.', {
          status: response.status,
          candidateBaseUrl: init.candidateBaseUrl,
          endpoint: init.endpoint,
        }),
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        body,
        text: redactSensitive(text).slice(0, 500),
        latencyMs,
        error: discoveryError(normalizeProviderHttpErrorCode(response.status), parseProviderErrorMessage(body) ?? `Provider returned HTTP ${response.status}.`, {
          status: response.status,
          candidateBaseUrl: init.candidateBaseUrl,
          endpoint: init.endpoint,
        }),
      };
    }
    return { ok: true, status: response.status, body, text: '', latencyMs };
  } catch (error) {
    const latencyMs = Math.max(1, Date.now() - startedAt);
    return {
      ok: false,
      status: null,
      body: null,
      text: '',
      latencyMs,
      error: withEndpoint(normalizeDiscoveryError(error), init.candidateBaseUrl, init.endpoint),
    };
  } finally {
    clearTimeout(timer);
  }
}

function pickBestCandidate(scores: CandidateScore[]): CandidateScore | null {
  return scores
    .filter((score) => score.models.length > 0)
    .sort((left, right) =>
      Number(right.chatSupported) - Number(left.chatSupported) ||
      right.models.length - left.models.length ||
      left.latencyMs - right.latencyMs,
    )[0] ?? null;
}

function buildDiscoveryHeaders(apiKey: string | undefined, customHeadersJson: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  };
  const trimmedKey = apiKey?.trim();
  if (trimmedKey) {
    headers.authorization = `Bearer ${trimmedKey}`;
  }
  if (customHeadersJson?.trim()) {
    try {
      const customHeaders = JSON.parse(customHeadersJson) as Record<string, unknown>;
      for (const [key, value] of Object.entries(customHeaders)) {
        if (/^[A-Za-z0-9-]+$/.test(key) && typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        }
      }
    } catch {
      throw discoveryError(PROVIDER_RUNTIME_ERROR_CODES.invalidResponse, 'Provider custom headers JSON is invalid.');
    }
  }
  return headers;
}

function normalizeSelectedBaseUrl(baseUrl: string, modelEndpoint: string): string {
  if (modelEndpoint === '/models') {
    return baseUrl.replace(/\/+$/, '');
  }
  if (modelEndpoint === '/v1/models') {
    return appendPathAvoidingDuplicate(baseUrl, '/v1');
  }
  return baseUrl.replace(/\/+$/, '');
}

function stripKnownEndpoint(value: string): string {
  const url = new URL(value);
  const path = url.pathname.replace(/\/+$/, '');
  for (const endpoint of [...MODEL_ENDPOINTS, ...CHAT_ENDPOINTS, ...EMBEDDINGS_ENDPOINTS]) {
    if (path.toLowerCase().endsWith(endpoint.toLowerCase())) {
      url.pathname = path.slice(0, -endpoint.length) || '';
      return url.toString().replace(/\/+$/, '');
    }
  }
  return value.replace(/\/+$/, '');
}

function selectEndpointForBase(baseUrl: string, endpoints: readonly string[]): string {
  const path = new URL(baseUrl).pathname.replace(/\/+$/, '').toLowerCase();
  const v1Endpoint = endpoints.find((endpoint) => endpoint.startsWith('/v1/'));
  const plainEndpoint = endpoints.find((endpoint) => !endpoint.startsWith('/v1/'));
  if (path.endsWith('/v1') && plainEndpoint) {
    return plainEndpoint;
  }
  return v1Endpoint ?? plainEndpoint ?? endpoints[0];
}

function endpointCandidatesForBase(baseUrl: string, endpoints: readonly string[]): string[] {
  const path = new URL(baseUrl).pathname.replace(/\/+$/, '').toLowerCase();
  const ordered = path.endsWith('/v1')
    ? endpoints.filter((endpoint) => !endpoint.startsWith('/v1/'))
    : endpoints;
  return Array.from(new Set(ordered));
}

function appendPathAvoidingDuplicate(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (!path) {
    return normalizedBase;
  }
  const parsed = new URL(normalizedBase);
  const currentPath = parsed.pathname.replace(/\/+$/, '').toLowerCase();
  const targetPath = path.replace(/\/+$/, '').toLowerCase();
  if (currentPath.endsWith(targetPath)) {
    return normalizedBase;
  }
  parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}${path}`;
  return parsed.toString().replace(/\/+$/, '');
}

function joinEndpoint(baseUrl: string, endpoint: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${endpoint}`;
}

function suggestProviderName(manualName: string | undefined, inputAddress: string, baseUrl: string): string {
  const trimmed = manualName?.trim();
  if (trimmed) {
    return trimmed;
  }
  try {
    const hostname = new URL(baseUrl).hostname.replace(/^api\./i, '');
    const label = hostname.split('.').filter(Boolean)[0] ?? inputAddress.trim();
    return label ? `${label[0]?.toUpperCase() ?? ''}${label.slice(1)} Provider` : 'OpenAI-compatible Provider';
  } catch {
    return 'OpenAI-compatible Provider';
  }
}

function hasTokenUsage(body: unknown): boolean {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const usage = (body as { usage?: unknown }).usage;
  return !!usage && typeof usage === 'object' && (
    typeof (usage as { prompt_tokens?: unknown }).prompt_tokens === 'number' ||
    typeof (usage as { completion_tokens?: unknown }).completion_tokens === 'number' ||
    typeof (usage as { total_tokens?: unknown }).total_tokens === 'number'
  );
}

function parseProviderErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const error = (body as { error?: unknown }).error;
  if (error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  const message = (body as { message?: unknown }).message;
  return typeof message === 'string' ? message : null;
}

function buildFailedResult(
  input: ProviderDiscoveryRequest,
  latencyMs: number,
  issues: ProviderDiscoveryIssue[],
  candidates: ProviderDiscoveryCandidate[] = [],
): ProviderDiscoveryResult {
  const normalizedErrors = issues.map(redactProviderDiscoveryIssue);
  return {
    status: 'failed',
    inputAddress: redactSensitive(input.address.trim()),
    normalizedBaseUrl: null,
    suggestedProviderName: input.providerName?.trim() || 'OpenAI-compatible Provider',
    providerType: input.providerType ?? 'openai-compatible',
    compatibility: 'failed',
    capabilities: unknownCapabilities(),
    models: [],
    modelExamples: [],
    warnings: [],
    errors: normalizedErrors,
    testedCandidates: candidates,
    selectedCandidateBaseUrl: null,
    latencyMs: Math.max(1, latencyMs),
  };
}

function unknownCapabilities(): ProviderDiscoveryCapabilities {
  return {
    openAiCompatible: 'unknown',
    models: 'unknown',
    chatCompletions: 'not_tested',
    streaming: 'not_tested',
    tokenUsage: 'not_tested',
    embeddings: 'not_tested',
  };
}

function discoveryError(
  code: string,
  message: string,
  details: Partial<Pick<ProviderDiscoveryIssue, 'status' | 'candidateBaseUrl' | 'endpoint' | 'retryable'>> = {},
): ProviderDiscoveryIssue {
  return {
    code,
    message: redactSensitive(message),
    status: details.status ?? null,
    candidateBaseUrl: details.candidateBaseUrl,
    endpoint: details.endpoint,
    retryable: details.retryable,
  };
}

function normalizeDiscoveryError(error: unknown): ProviderDiscoveryIssue {
  if (isDiscoveryIssue(error)) {
    return error;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return discoveryError(PROVIDER_RUNTIME_ERROR_CODES.timeout, 'Provider request timed out.', { retryable: true });
  }
  if (error instanceof Error && /timeout/i.test(error.message)) {
    return discoveryError(PROVIDER_RUNTIME_ERROR_CODES.timeout, 'Provider request timed out.', { retryable: true });
  }
  if (error instanceof Error) {
    return discoveryError(PROVIDER_RUNTIME_ERROR_CODES.networkError, error.message, { retryable: true });
  }
  return discoveryError(PROVIDER_RUNTIME_ERROR_CODES.networkError, String(error), { retryable: true });
}

function isDiscoveryIssue(value: unknown): value is ProviderDiscoveryIssue {
  return !!value && typeof value === 'object' && typeof (value as { code?: unknown }).code === 'string' && typeof (value as { message?: unknown }).message === 'string';
}

function withEndpoint(issue: ProviderDiscoveryIssue, candidateBaseUrl?: string, endpoint?: string): ProviderDiscoveryIssue {
  return {
    ...issue,
    candidateBaseUrl: issue.candidateBaseUrl ?? candidateBaseUrl,
    endpoint: issue.endpoint ?? endpoint,
  };
}

export function capabilityLabel(value: ProviderDiscoveryCapability): ProviderDiscoveryCapability {
  return value;
}
