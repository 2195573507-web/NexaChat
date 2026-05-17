import { createId, now } from '../utils/ids.js';
import { translate } from '../../shared/i18n.js';
import { PROVIDER_RUNTIME_ERROR_CODES, getProviderAdapterName } from '../../shared/providerRuntime.js';
import { SECURITY_ACTION_PERMISSIONS } from '../../shared/securityRuntime.js';
import type {
  Model,
  ModelInput,
  Provider,
  ProviderModelOption
} from '../../shared/types.js';
import { ProviderRuntimeError, fetchOpenAiCompatibleModels } from '../adapters/openAiCompatibleAdapter.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);



export function ModelService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ModelService extends Base {
  getModels(): Model[] {
    return this.repositories.model.listModels();
  }


  async fetchProviderModels(providerId: string): Promise<ProviderModelOption[]> {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.providerTest, 'provider', providerId);
    const provider = this.requireProvider(providerId);
    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${providerId}`);
    }
    const adapterName = getProviderAdapterName(provider.type);
    if (adapterName !== 'openai-compatible') {
      this.recordProviderHealth(
        providerId,
        null,
        'error',
        null,
        'provider-test',
        PROVIDER_RUNTIME_ERROR_CODES.unsupportedProvider,
        t('models.errors.unsupportedProvider'),
      );
      throw new ProviderRuntimeError(t('models.errors.unsupportedProvider'), PROVIDER_RUNTIME_ERROR_CODES.unsupportedProvider);
    }

    const start = now();
    try {
      const result = await fetchOpenAiCompatibleModels(provider, this.getProviderSecret(provider));
      this.db
        .prepare('UPDATE providers SET health_status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?')
        .run('healthy', start, now(), providerId);
      this.recordProviderHealth(providerId, null, 'healthy', result.latencyMs, 'provider-test', null, null);
      this.audit('provider.models.fetched', 'provider', providerId, {
        status: result.status,
        modelCount: result.modelNames.length,
        models: result.modelNames.slice(0, 20),
      }, SECURITY_ACTION_PERMISSIONS.providerTest);
      return result.modelNames.map((name) => ({ id: name, name }));
    } catch (error) {
      const normalized = this.normalizeProviderError(error);
      this.db
        .prepare('UPDATE providers SET health_status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?')
        .run('error', start, now(), providerId);
      this.recordProviderHealth(providerId, null, 'error', Math.max(1, now() - start), 'provider-test', normalized.code, normalized.message);
      this.audit('provider.models.fetch_failed', 'provider', providerId, {
        errorCode: normalized.code,
        errorMessage: normalized.message,
      }, SECURITY_ACTION_PERMISSIONS.providerTest);
      throw error;
    }
  }


  createModel(input: ModelInput): Model {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.modelWrite, 'model', null);
    const provider = this.requireProvider(input.providerId);
    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${provider.id}`);
    }
    const timestamp = now();
    const id = createId('model');
    const displayName = input.displayName?.trim() || input.name.trim();
    this.db
      .prepare(
        `INSERT INTO models (id, provider_id, name, display_name, model_name_snapshot, context_window, supports_streaming, supports_tools, supports_vision, supports_embeddings, input_price, output_price, health_status, latency_ms, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'unknown', NULL, 1, ?, ?)`,
      )
      .run(
        id,
        provider.id,
        input.name.trim(),
        displayName,
        input.name.trim(),
        input.contextWindow ?? 128000,
        input.supportsStreaming === false ? 0 : 1,
        input.supportsTools ? 1 : 0,
        input.supportsVision ? 1 : 0,
        input.supportsEmbeddings ? 1 : 0,
        timestamp,
        timestamp,
      );

    const aliasCount = Number(
      (this.db.prepare('SELECT COUNT(*) AS count FROM model_aliases').get() as { count: number }).count,
    );
    if (aliasCount === 0) {
      this.db
        .prepare('INSERT INTO model_aliases (id, alias, model_id, enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
        .run(createId('alias'), 'nexachat-default', id, timestamp, timestamp);
    }

    this.audit('model.created', 'model', id, { providerId: provider.id, model: input.name });
    return this.requireModel(id);
  }


  resolveGatewayModelId(modelName: string | undefined): string | undefined {
    if (!modelName) {
      return undefined;
    }
    const alias = this.db
      .prepare('SELECT model_id FROM model_aliases WHERE alias = ? AND enabled = 1')
      .get(modelName) as { model_id: string } | undefined;
    if (alias) {
      return alias.model_id;
    }
    const model = this.getModels().find((item) => item.name === modelName || item.displayName === modelName || item.id === modelName);
    return model?.id;
  }

  };
}
