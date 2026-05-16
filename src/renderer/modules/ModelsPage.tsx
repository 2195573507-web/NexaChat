import { Activity, Plus, Server, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProviderType } from '../../shared/types';
import { DEFAULT_MODEL_FORM, DEFAULT_PROVIDER_FORM, PROVIDER_CATALOG } from '../../shared/providerCatalog';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, DataRows, EmptyBlock, Field, InlineNotice, PageHeader, StatusPillLite, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import {
  getDefaultModel,
  getDefaultProvider,
  healthState,
  modelCapabilityLabels,
  providerTypeLabel,
  statusLabel,
  TabPanel,
  type TabPageProps,
} from './shared';

export function ModelsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [providerName, setProviderName] = useState(DEFAULT_PROVIDER_FORM.name);
  const [providerType, setProviderType] = useState<ProviderType>(DEFAULT_PROVIDER_FORM.type);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_PROVIDER_FORM.baseUrl);
  const [apiKey, setApiKey] = useState(DEFAULT_PROVIDER_FORM.apiKey);
  const [modelName, setModelName] = useState(DEFAULT_MODEL_FORM.name);
  const [selectedProviderId, setSelectedProviderId] = useState(snapshot.providers[0]?.id ?? '');
  const defaultModel = getDefaultModel(snapshot);
  const defaultProvider = getDefaultProvider(snapshot);
  const selectedProvider = snapshot.providers.find((provider) => provider.id === selectedProviderId) ?? snapshot.providers[0];

  useEffect(() => {
    if (!selectedProviderId && snapshot.providers[0]) {
      setSelectedProviderId(snapshot.providers[0].id);
    }
  }, [selectedProviderId, snapshot.providers]);

  if (activeTab.id === 'catalog') {
    return (
      <TabPanel moduleId="models" tab={activeTab}>
        <PageHeader
          eyebrow={t('models.providerList')}
          title={t('models.create.title')}
          description={activeTab.description}
          status={<StatusPillLite label={selectedProvider?.name ?? t('common.notConfigured')} state={selectedProvider ? 'ready' : 'warning'} />}
          actions={<CommandButton variant="primary" icon={<Plus size={15} />} disabled={!selectedProviderId || !modelName.trim()} onClick={() => onAction(t('models.toast.added'), () => api.createModel({ providerId: selectedProviderId, name: modelName.trim() }))}>{t('models.create.title')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('models.create.title')} description={activeTab.description}>
          <ToolSection title={t('models.modelName')} description={t('models.modelName.help')}>
            <div className="form-stack">
            <Field label={t('models.columns.provider')}>
                <select value={selectedProviderId} onChange={(event) => setSelectedProviderId(event.target.value)}>
                  {snapshot.providers.map((provider) => (
                  <option value={provider.id} key={provider.id}>{provider.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('models.modelName')}>
                <input value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder={t('models.modelName.placeholder')} />
              </Field>
            </div>
          </ToolSection>

          <div className="config-items">
            {snapshot.models.map((model) => (
              <div className={`config-row ${model.id === defaultModel?.id ? 'is-active' : ''}`} key={model.id}>
                <span>
                  <strong>{model.displayName}</strong>
                  <small>{modelCapabilityLabels(model, t)}</small>
                </span>
                <StatusPillLite label={statusLabel(model.healthStatus, t)} state={healthState(model.healthStatus)} />
              </div>
            ))}
          </div>
        </ConfigList>
        <ConfigDetail title={t('models.router.title')} description={t('models.router.note')}>
          <DataRows
            rows={[
              { label: t('gateway.defaultModel'), value: defaultModel?.displayName ?? t('common.notConfigured') },
              { label: t('models.providerList'), value: selectedProvider?.name ?? t('common.notConfigured') },
              { label: t('stage.environment-limited'), value: t('models.router.note') },
            ]}
          />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'router') {
    return (
      <TabPanel moduleId="models" tab={activeTab}>
        <PageHeader
          eyebrow={t('chat.modelSelect.aria')}
          title={t('models.router.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={t('stage.environment-limited')} state="warning" />}
          actions={<CommandButton icon={<Activity size={15} />} onClick={defaultProvider ? () => onAction(t('models.toast.tested'), () => api.testProvider(defaultProvider.id)) : undefined}>{t('models.testConnection')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('models.router.title')} description={activeTab.featureBoundary}>
          <div className="workflow-chain">
            <div><span>1</span><strong>{t('chat.modelSelect.aria')}</strong><small>{defaultModel?.displayName ?? t('common.notConfigured')}</small></div>
            <div><span>2</span><strong>{t('models.providerList')}</strong><small>{defaultProvider?.name ?? t('common.notConfigured')}</small></div>
            <div><span>3</span><strong>{t('gateway.overview.title')}</strong><small>{snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')}</small></div>
          </div>
          <InlineNotice tone="warning" title={t('stage.environment-limited')} detail={t('models.router.note')} />
        </ConfigList>
        <ConfigDetail title={t('observability.health.title')} description={t('nav.models.router.description')}>
          <ActivityRows snapshot={snapshot} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="models" tab={activeTab}>
      <PageHeader
        eyebrow={t('models.providerList')}
        title={t('models.provider.title')}
        description={activeTab.featureBoundary}
        status={<StatusPillLite label={defaultProvider?.name ?? t('common.notConfigured')} state={defaultProvider?.secretRef ? 'ready' : 'warning'} />}
        actions={<CommandButton variant="primary" icon={<Server size={15} />} disabled={!providerName.trim() || !baseUrl.trim()} onClick={() => onAction(t('models.toast.saved'), () => api.createProvider({ name: providerName.trim(), type: providerType, baseUrl: baseUrl.trim(), apiKey: apiKey.trim() || undefined }))}>{t('models.addProvider')}</CommandButton>}
      />
      <div className="tool-layout">
      <ConfigList title={t('models.provider.title')} description={activeTab.featureBoundary}>
        <section className="current-config-strip">
          <div>
            <span className="eyebrow">{t('dashboard.defaultModel')}</span>
            <strong>{defaultModel?.displayName ?? t('common.notConfigured')}</strong>
            <small>{defaultProvider?.name ?? t('common.notConfigured')}</small>
          </div>
          <div>
            <span className="eyebrow">{t('models.providerList')}</span>
            <strong>{snapshot.providers.length}</strong>
            <small>{t('common.countConfigured', { count: snapshot.providers.filter((provider) => provider.secretRef).length })}</small>
          </div>
          <div>
            <span className="eyebrow">{t('observability.columns.status')}</span>
            <strong>{snapshot.providers.filter((provider) => provider.healthStatus === 'healthy').length}</strong>
            <small>{t('common.countAvailable', { count: snapshot.models.filter((model) => model.enabled).length })}</small>
          </div>
        </section>

        <ToolSection title={t('models.provider.title')} description={t('models.provider.note')}>
          <div className="form-stack">
            <Field label={t('models.name')}>
              <input value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder={t('models.name.placeholder')} />
            </Field>
            <Field label={t('models.type')}>
              <select value={providerType} onChange={(event) => setProviderType(event.target.value as ProviderType)}>
                {PROVIDER_CATALOG.map((entry) => (
                  <option key={entry.type} value={entry.type}>{t(entry.labelKey)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('models.baseUrl')}>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={t('models.baseUrl.placeholder')} />
            </Field>
            <Field label={t('models.apiKey')}>
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={t('models.apiKey.placeholder')} type="password" />
            </Field>
          </div>
        </ToolSection>

        <div className="config-items provider-switch-list">
          {snapshot.providers.length > 0 ? snapshot.providers.map((provider) => (
            <div className={`config-row ${provider.id === defaultProvider?.id ? 'is-active' : ''}`} key={provider.id}>
              <span>
                <strong>{provider.name}</strong>
                <small>{providerTypeLabel(provider.type, t)} / {provider.baseUrl || t('common.notConfigured')}</small>
              </span>
              <span className="row-actions">
                <StatusPillLite label={provider.secretRef ? t('common.saved') : t('common.notConfigured')} state={provider.secretRef ? 'ready' : 'warning'} />
                <StatusPillLite label={statusLabel(provider.healthStatus, t)} state={healthState(provider.healthStatus)} />
                <CommandButton icon={<Activity size={14} />} onClick={() => onAction(t('models.toast.tested'), () => api.testProvider(provider.id))}>{t('models.testConnection')}</CommandButton>
              </span>
            </div>
          )) : <EmptyBlock title={t('common.notConfigured')} detail={t('models.provider.note')} />}
        </div>
      </ConfigList>

      <ConfigDetail title={t('models.providerList')} description={t('nav.models.providers.boundary')}>
        <DataRows
          rows={[
            { label: t('provider.type.openaiCompatible'), value: PROVIDER_CATALOG.find((entry) => entry.type === 'openai-compatible') ? t('common.available') : t('common.unsupported') },
            { label: t('provider.type.deepseek'), value: t('stage.environment-limited') },
            { label: t('provider.type.anthropic'), value: t('stage.reserved') },
            { label: t('provider.type.ollama'), value: t('stage.environment-limited') },
          ]}
        />
        <InlineNotice tone="info" title={t('common.required')} detail={t('models.apiKey.help')} />
      </ConfigDetail>
      </div>
    </TabPanel>
  );
}

function ActivityRows({ snapshot }: { snapshot: TabPageProps['snapshot'] }) {
  const { t } = useI18n();
  return (
    <ActivityList
      empty={t('app.recent.empty')}
      items={snapshot.providerHealthRecords.slice(0, 8).map((record) => ({
        title: statusLabel(record.status, t),
        meta: record.errorMessage ?? `${record.latencyMs ?? 0}ms`,
        state: healthState(record.status),
      }))}
    />
  );
}
