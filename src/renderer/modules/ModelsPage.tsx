import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { DEFAULT_MODEL_FORM, DEFAULT_PROVIDER_FORM } from '../../shared/providerCatalog';
import type { ProviderType } from '../../shared/types';
import { FormField, MetricTile, PageSection, ProviderCard } from '../components/ui';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, getDefaultModel, healthTone, modelCapabilityLabels, providerTypeLabel, providerTypes, statusLabel } from './shared';

export function ModelsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [providerName, setProviderName] = useState(DEFAULT_PROVIDER_FORM.name);
  const [providerType, setProviderType] = useState<ProviderType>(DEFAULT_PROVIDER_FORM.type);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_PROVIDER_FORM.baseUrl);
  const [apiKey, setApiKey] = useState(DEFAULT_PROVIDER_FORM.apiKey);
  const [modelName, setModelName] = useState(DEFAULT_MODEL_FORM.name);
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
              <FormField label={t('models.columns.provider')}>
                <select value={selectedProviderId} onChange={(event) => setSelectedProviderId(event.target.value)}>
                  {snapshot.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t('models.modelName')} help={t('models.modelName.help')}>
                <input value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder={t('models.modelName.placeholder')} />
              </FormField>
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
      <section className="models-command-center">
        <MetricTile label={t('models.providerList')} value={snapshot.providers.length} detail={t('dashboard.metric.enabled', { count: snapshot.providers.filter((provider) => provider.enabled).length })} tone="info" />
        <MetricTile label={t('models.catalog.title')} value={snapshot.models.length} detail={t('dashboard.metric.healthy', { count: snapshot.models.filter((model) => model.healthStatus === 'healthy').length })} tone="success" />
        <MetricTile label={t('models.defaultModel')} value={defaultModel?.displayName ?? t('common.notConfigured')} detail={snapshot.providers.find((provider) => provider.id === snapshot.dashboard.workspace.defaultProviderId)?.name ?? t('common.notConfigured')} tone={defaultModel ? 'neutral' : 'warning'} />
      </section>

      <section className="two-column models-two-column">
        <PageSection title={t('models.provider.title')} description={t('models.provider.note')} className="provider-setup-panel">
          <div className="form-grid">
            <FormField label={t('models.name')} help={t('models.name.help')}>
              <input value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder={t('models.name.placeholder')} />
            </FormField>
            <FormField label={t('models.type')}>
              <select value={providerType} onChange={(event) => setProviderType(event.target.value as ProviderType)}>
                {providerTypes.map((type) => (
                  <option key={type} value={type}>
                    {providerTypeLabel(type, t)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('models.baseUrl')} help={t('models.baseUrl.help')}>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={t('models.baseUrl.placeholder')} />
            </FormField>
            <FormField label={t('models.apiKey')} help={t('models.apiKey.help')}>
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" placeholder={t('models.apiKey.placeholder')} />
            </FormField>
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
        </PageSection>
        <PageSection title={t('models.providerList')} description={t('models.router.note')} className="provider-list-panel">
          <div className="provider-card-list">
            {snapshot.providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                name={provider.name}
                type={providerTypeLabel(provider.type, t)}
                baseUrl={provider.baseUrl}
                secretState={provider.secretRef ? t('common.saved') : t('common.notConfigured')}
                secretLabel={t('models.columns.secretRef')}
                baseUrlLabel={t('models.columns.baseUrl')}
                healthLabel={t('models.columns.health')}
                health={<StateBadge label={provider.healthStatus} tone={healthTone(provider.healthStatus)} />}
                actions={
                  <button type="button" onClick={() => onAction(t('models.toast.tested'), () => api.testProvider(provider.id))}>
                    {t('models.testConnection')}
                  </button>
                }
              />
            ))}
          </div>
          {snapshot.providers.length === 0 ? (
            <div className="empty-state">
              <h3>{t('dashboard.setup.providerMissing')}</h3>
              <p>{t('dashboard.defaultModel.missing')}</p>
            </div>
          ) : null}
        </PageSection>
      </section>
    </TabPanel>
  );
}
