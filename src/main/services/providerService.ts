import { redactSensitive } from '../security/redaction.js';
import { createId, now } from '../utils/ids.js';
import { translate } from '../../shared/i18n.js';
import { PROVIDER_RUNTIME_ERROR_CODES, PROVIDER_RUNTIME_POLICY, getProviderAdapterName } from '../../shared/providerRuntime.js';
import { SECURITY_ACTION_PERMISSIONS } from '../../shared/securityRuntime.js';
import type {
  Provider,
  ProviderDiscoveryRequest,
  ProviderDiscoveryResult,
  ProviderHealthRecord,
  ProviderInput,
  ProviderSaveFromDiscoveryRequest,
  ProviderSaveFromDiscoveryResult,
  Model,
  ModelInput,
} from '../../shared/types.js';
import { testOpenAiCompatibleProvider } from '../adapters/openAiCompatibleAdapter.js';
import { discoverProvider } from './providerDiscovery.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);



export function ProviderService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ProviderService extends Base {
  getProviders(): Provider[] {
    return this.repositories.provider.listProviders();
  }


  getProviderHealthRecords(): ProviderHealthRecord[] {
    return this.repositories.provider.listProviderHealthRecords();
  }


  createProvider(input: ProviderInput): Provider {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerWrite, 'provider', null);
    if (!/^https?:\/\//i.test(input.baseUrl.trim())) {
      throw new Error(t('models.errors.invalidBaseUrl'));
    }
    const timestamp = now();
    const providerId = createId('provider');
    const secretRef = input.apiKey ? this.saveSecret(`${input.name} API Key`, input.apiKey) : null;
    this.db
      .prepare(
        `INSERT INTO providers (id, name, type, base_url, proxy_url, auth_type, secret_ref, custom_headers_json, enabled, health_status, last_checked_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'unknown', NULL, ?, ?)`,
      )
      .run(
        providerId,
        input.name.trim(),
        input.type,
        this.normalizeBaseUrl(input.baseUrl),
        input.proxyUrl?.trim() || null,
        input.apiKey ? 'api-key' : 'none',
        secretRef,
        input.customHeadersJson?.trim() || null,
        timestamp,
        timestamp,
      );
    this.audit('provider.created', 'provider', providerId, { name: input.name, baseUrl: this.normalizeBaseUrl(input.baseUrl) });
    return this.requireProvider(providerId);
  }

  async discoverProvider(input: ProviderDiscoveryRequest): Promise<ProviderDiscoveryResult> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerTest, 'provider', null);
    return discoverProvider(input);
  }


  async saveProviderFromDiscovery(input: ProviderSaveFromDiscoveryRequest): Promise<ProviderSaveFromDiscoveryResult> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerWrite, 'provider', null);
    const uniqueModelNames = Array.from(new Set(input.modelNames.map((name) => name.trim()).filter(Boolean))).slice(0, 200);
    if (uniqueModelNames.length > 0) {
      this.requirePermission(SECURITY_ACTION_PERMISSIONS.modelWrite, 'model', null);
    }
    const provider = this.createProvider({
      name: input.providerName,
      type: input.providerType,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      customHeadersJson: input.customHeadersJson,
    });
    const modelCreator = this as ServiceContext & { createModel(input: ModelInput): Model };
    const models = uniqueModelNames.map((name) => modelCreator.createModel({
      providerId: provider.id,
      name,
      supportsStreaming: input.capabilities?.streaming === 'unsupported' ? false : true,
      supportsEmbeddings: input.capabilities?.embeddings === 'supported',
    }));
    this.audit('provider.discovery.saved', 'provider', provider.id, {
      modelCount: models.length,
      baseUrl: provider.baseUrl,
    }, SECURITY_ACTION_PERMISSIONS.providerWrite);
    return { provider, models };
  }


  deleteProvider(providerId: string): Provider {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerWrite, 'provider', providerId);
    const provider = this.requireProvider(providerId);
    const timestamp = now();
    const disabledModelIds = this.db
      .prepare('SELECT id FROM models WHERE provider_id = ? AND enabled = 1')
      .all(providerId)
      .map((row) => String((row as { id: unknown }).id));

    try {
      this.db.exec('BEGIN IMMEDIATE');
      this.db
        .prepare('UPDATE providers SET enabled = 0, health_status = ?, updated_at = ? WHERE id = ?')
        .run('unknown', timestamp, providerId);
      this.db
        .prepare('UPDATE models SET enabled = 0, health_status = ?, latency_ms = NULL, updated_at = ? WHERE provider_id = ?')
        .run('unknown', timestamp, providerId);
      this.db
        .prepare(
          `UPDATE workspaces
           SET default_provider_id = CASE WHEN default_provider_id = ? THEN NULL ELSE default_provider_id END,
               default_model_id = CASE WHEN default_model_id IN (SELECT id FROM models WHERE provider_id = ?) THEN NULL ELSE default_model_id END,
               updated_at = ?
           WHERE default_provider_id = ? OR default_model_id IN (SELECT id FROM models WHERE provider_id = ?)`,
        )
        .run(providerId, providerId, timestamp, providerId, providerId);
      this.db
        .prepare(
          `UPDATE conversations
           SET default_provider_id = CASE WHEN default_provider_id = ? THEN NULL ELSE default_provider_id END,
               default_model_id = CASE WHEN default_model_id IN (SELECT id FROM models WHERE provider_id = ?) THEN NULL ELSE default_model_id END,
               updated_at = ?
           WHERE default_provider_id = ? OR default_model_id IN (SELECT id FROM models WHERE provider_id = ?)`,
        )
        .run(providerId, providerId, timestamp, providerId, providerId);
      if (disabledModelIds.length > 0) {
        const placeholders = disabledModelIds.map(() => '?').join(', ');
        this.db
          .prepare(`UPDATE model_aliases SET enabled = 0, updated_at = ? WHERE model_id IN (${placeholders})`)
          .run(timestamp, ...disabledModelIds);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    this.audit('provider.deleted', 'provider', providerId, {
      name: provider.name,
      disabledModelCount: disabledModelIds.length,
      mode: 'soft-delete',
    });
    return this.requireProvider(providerId);
  }


  async testProvider(providerId: string): Promise<Provider> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerTest, 'provider', providerId);
    const provider = this.requireProvider(providerId);
    const start = now();
    const adapterName = getProviderAdapterName(provider.type);
    const apiKey = this.getProviderSecret(provider);
    const health = adapterName === 'openai-compatible'
      ? await testOpenAiCompatibleProvider(provider, apiKey)
      : {
          ok: false,
          latencyMs: Math.max(1, now() - start),
          status: null,
          errorCode: PROVIDER_RUNTIME_ERROR_CODES.unsupportedProvider,
          errorMessage: t('models.errors.unsupportedProvider'),
          modelNames: [],
        };
    const status = health.ok ? 'healthy' : 'error';
    this.db
      .prepare('UPDATE providers SET health_status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?')
      .run(status, start, start, providerId);
    this.db
      .prepare('UPDATE models SET health_status = ?, latency_ms = ?, updated_at = ? WHERE provider_id = ?')
      .run(status, health.ok ? health.latencyMs : null, now(), providerId);
    this.db
      .prepare(
        `INSERT INTO request_logs (id, conversation_id, message_id, provider_id, model_id, model_name_snapshot, route_id, gateway_request_id, status, endpoint, request_summary_json, response_summary_json, input_tokens, output_tokens, latency_ms, finish_reason, error_code, error_message, started_at, completed_at, created_at)
         VALUES (?, NULL, NULL, ?, NULL, NULL, NULL, NULL, ?, '/provider/test', ?, ?, NULL, NULL, ?, NULL, ?, ?, ?, ?, ?)`,
      )
      .run(
        createId('req'),
        providerId,
        health.ok ? 'completed' : 'failed',
        JSON.stringify({
          adapter: adapterName,
          baseUrl: provider.baseUrl,
          authType: provider.authType,
          timeoutMs: PROVIDER_RUNTIME_POLICY.healthTimeoutMs,
        }),
        JSON.stringify({
          status: health.status,
          modelCount: health.modelNames.length,
          models: health.modelNames.slice(0, 20),
        }),
        health.latencyMs,
        health.errorCode,
        health.errorMessage ? redactSensitive(health.errorMessage) : null,
        start,
        now(),
        start,
      );
    this.audit('provider.tested', 'provider', providerId, {
      status,
      baseUrl: provider.baseUrl,
      adapter: adapterName,
      modelCount: health.modelNames.length,
      errorCode: health.errorCode,
    });
    this.recordProviderHealth(providerId, null, status, health.latencyMs, 'provider-test', health.errorCode, health.errorMessage);
    return this.requireProvider(providerId);
  }

  };
}
