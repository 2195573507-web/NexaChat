import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProviderType } from '../../shared/types';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, getDefaultModel, healthTone, modelCapabilityLabels, providerTypeLabel, providerTypes, statusLabel } from './shared';

export function ModelsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [providerName, setProviderName] = useState('OpenAI-compatible Provider');
  const [providerType, setProviderType] = useState<ProviderType>('openai-compatible');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-compatible-model');
  const [selectedProviderId, setSelectedProviderId] = useState(snapshot.providers[0]?.id ?? '');
  const defaultModel = getDefaultModel(snapshot);

  useEffect(() => {
    if (!selectedProviderId && snapshot.providers[0]) {
      setSelectedProviderId(snapshot.providers[0].id);
    }
  }, [selectedProviderId, snapshot.providers]);

  if (activeTab.id === 'catalog') {
    return (
      <TabPanel moduleId="models" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('models.create.title')}</h2>
            <p>{t('models.create.note')}</p>
            <div className="form-grid">
              <label>
                {t('models.columns.provider')}
                <select value={selectedProviderId} onChange={(event) => setSelectedProviderId(event.target.value)}>
                  {snapshot.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('models.modelName')}
                <input value={modelName} onChange={(event) => setModelName(event.target.value)} />
              </label>
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={!modelName.trim() || !(selectedProviderId || snapshot.providers[0]?.id)}
              onClick={() =>
                onAction(t('models.toast.added'), () =>
                  api.createModel({ providerId: selectedProviderId || snapshot.providers[0]?.id, name: modelName, supportsStreaming: true }),
                )
              }
            >
              <Plus size={16} /> {t('models.addModel')}
            </button>
          </div>
          <div className="panel">
            <h2>{t('models.catalog.title')}</h2>
            <DataTable
              columns={[t('models.columns.model'), t('models.columns.provider'), t('models.columns.context'), t('models.columns.capabilities'), t('models.columns.health')]}
              rows={snapshot.models.map((model) => [
                model.displayName,
                snapshot.providers.find((provider) => provider.id === model.providerId)?.name ?? model.providerId,
                model.contextWindow,
                modelCapabilityLabels(model, t),
                <StateBadge key={`${model.id}-health`} label={statusLabel(model.healthStatus, t)} tone={healthTone(model.healthStatus)} />,
              ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'router') {
    return (
      <TabPanel moduleId="models" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('models.router.title')}</h2>
            <p>{t('models.router.note')}</p>
            <dl className="detail-list">
              <div><dt>{t('models.defaultProvider')}</dt><dd>{snapshot.providers.find((provider) => provider.id === snapshot.dashboard.workspace.defaultProviderId)?.name ?? t('common.notConfigured')}</dd></div>
              <div><dt>{t('models.defaultModel')}</dt><dd>{defaultModel?.displayName ?? t('common.notConfigured')}</dd></div>
              <div><dt>{t('models.fallbackLabel')}</dt><dd>{t('models.fallback')}</dd></div>
              <div><dt>{t('models.ruleEditor')}</dt><dd>{t('models.ruleEditor.note')}</dd></div>
            </dl>
          </div>
          <div className="panel">
            <h2>{t('models.healthTest')}</h2>
            <DataTable
              columns={[t('models.columns.provider'), t('models.columns.health'), t('models.columns.lastChecked'), t('gateway.columns.actions')]}
              rows={snapshot.providers.map((provider) => [
                provider.name,
                <StateBadge key={`${provider.id}-health`} label={statusLabel(provider.healthStatus, t)} tone={healthTone(provider.healthStatus)} />,
                provider.lastCheckedAt ? new Date(provider.lastCheckedAt).toLocaleString() : t('common.unchecked'),
                <button type="button" key={provider.id} onClick={() => onAction(t('models.toast.tested'), () => api.testProvider(provider.id))}>
                  {t('models.testConnection')}
                </button>,
              ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="models" tab={activeTab}>
      <section className="two-column">
        <div className="panel">
          <h2>{t('models.provider.title')}</h2>
          <p>{t('models.provider.note')}</p>
          <div className="form-grid">
            <label>
              {t('models.name')}
              <input value={providerName} onChange={(event) => setProviderName(event.target.value)} />
            </label>
            <label>
              {t('models.type')}
              <select value={providerType} onChange={(event) => setProviderType(event.target.value as ProviderType)}>
                {providerTypes.map((type) => (
                  <option key={type} value={type}>
                    {providerTypeLabel(type, t)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('models.baseUrl')}
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
            </label>
            <label>
              {t('models.apiKey')}
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" placeholder={t('models.apiKey.placeholder')} />
            </label>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              disabled={!providerName.trim() || !baseUrl.trim()}
              onClick={() =>
                onAction(t('models.toast.saved'), () =>
                  api.createProvider({ name: providerName, type: providerType, baseUrl, apiKey: apiKey || undefined }),
                )
              }
            >
              <Plus size={16} /> {t('models.addProvider')}
            </button>
          </div>
        </div>
        <div className="panel">
          <h2>{t('models.providerList')}</h2>
          <DataTable
            columns={[t('models.name'), t('models.type'), t('models.columns.secretRef'), t('models.columns.baseUrl'), t('models.columns.health'), t('gateway.columns.actions')]}
            rows={snapshot.providers.map((provider) => [
              provider.name,
              providerTypeLabel(provider.type, t),
              provider.secretRef ? t('common.saved') : t('common.notConfigured'),
              provider.baseUrl,
              <StateBadge key={`${provider.id}-health`} label={provider.healthStatus} tone={healthTone(provider.healthStatus)} />,
              <button type="button" key={provider.id} onClick={() => onAction(t('models.toast.tested'), () => api.testProvider(provider.id))}>
                {t('models.testConnection')}
              </button>,
            ])}
          />
        </div>
      </section>
    </TabPanel>
  );
}
