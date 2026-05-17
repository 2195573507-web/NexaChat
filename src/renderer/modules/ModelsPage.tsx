import { Activity, DownloadCloud, Plus, Server, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ProviderModelOption, ProviderType } from '../../shared/types';
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
import { useLocalPending } from './useLocalPending';

export function ModelsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [providerName, setProviderName] = useState(DEFAULT_PROVIDER_FORM.name);
  const [providerType, setProviderType] = useState<ProviderType>(DEFAULT_PROVIDER_FORM.type);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_PROVIDER_FORM.baseUrl);
  const [apiKey, setApiKey] = useState(DEFAULT_PROVIDER_FORM.apiKey);
  const [modelName, setModelName] = useState(DEFAULT_MODEL_FORM.name);
  const [selectedProviderId, setSelectedProviderId] = useState(snapshot.providers[0]?.id ?? '');
  const [modelOptions, setModelOptions] = useState<ProviderModelOption[]>([]);
  const [modelFetchState, setModelFetchState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [modelFetchError, setModelFetchError] = useState('');
  const [pendingDeleteProviderId, setPendingDeleteProviderId] = useState<string | null>(null);
  const pending = useLocalPending();
  const defaultModel = getDefaultModel(snapshot);
  const defaultProvider = getDefaultProvider(snapshot);
  const selectedProvider = snapshot.providers.find((provider) => provider.id === selectedProviderId) ?? snapshot.providers[0];
  const selectedProviderName = selectedProvider?.name;
  const providerModels = useMemo(
    () => snapshot.models.filter((model) => model.providerId === selectedProviderId),
    [selectedProviderId, snapshot.models],
  );
  const existingModelNames = useMemo(() => new Set(providerModels.map((model) => model.name)), [providerModels]);
  const selectableModelOptions = useMemo(
    () => modelOptions.filter((option) => !existingModelNames.has(option.id)),
    [existingModelNames, modelOptions],
  );

  useEffect(() => {
    if (!selectedProviderId && snapshot.providers[0]) {
      setSelectedProviderId(snapshot.providers[0].id);
      return;
    }
    if (selectedProviderId && !snapshot.providers.some((provider) => provider.id === selectedProviderId)) {
      setSelectedProviderId(snapshot.providers[0]?.id ?? '');
    }
  }, [selectedProviderId, snapshot.providers]);

  useEffect(() => {
    setPendingDeleteProviderId(null);
  }, [snapshot.providers]);

  useEffect(() => {
    let cancelled = false;
    const providerModelNames = new Set(providerModels.map((model) => model.name));
    setModelOptions([]);
    setModelFetchError('');
    setModelName('');
    if (!selectedProviderId) {
      setModelFetchState('idle');
      return undefined;
    }

    setModelFetchState('loading');
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setModelFetchState('loading');
      }
    }, 0);
    api.fetchProviderModels(selectedProviderId)
      .then((options) => {
        if (cancelled) return;
        window.clearTimeout(timer);
        setModelOptions(options);
        setModelFetchState('ready');
        const firstNewModel = options.find((option) => !providerModelNames.has(option.id)) ?? options[0];
        if (firstNewModel) {
          setModelName(firstNewModel.id);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        window.clearTimeout(timer);
        setModelFetchState('error');
        setModelFetchError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api, selectedProviderId, providerModels]);

  const createSelectedModel = async () => {
    await api.createModel({ providerId: selectedProviderId, name: modelName.trim() });
    setModelName('');
  };

  if (activeTab.id === 'catalog') {
    return (
      <TabPanel moduleId="models" tab={activeTab}>
        <PageHeader
          eyebrow={t('models.providerList')}
          title={t('models.create.title')}
          description={activeTab.description}
          status={<StatusPillLite label={selectedProvider?.name ?? t('common.notConfigured')} state={selectedProvider ? 'ready' : 'warning'} />}
          actions={<CommandButton variant="primary" icon={<Plus size={15} />} disabled={!selectedProviderId || !modelName.trim()} onClick={() => onAction(t('models.toast.added'), createSelectedModel)}>{t('models.create.title')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('models.create.title')} description={activeTab.description}>
          <ToolSection title={t('models.modelName')} description={t('models.modelName.help')}>
            <div className="form-stack">
              <div className="field-action-row">
                <Field label={t('models.columns.provider')}>
                  <select value={selectedProviderId} onChange={(event) => setSelectedProviderId(event.target.value)}>
                    {snapshot.providers.map((provider) => (
                      <option value={provider.id} key={provider.id}>{provider.name}</option>
                    ))}
                  </select>
                </Field>
                <CommandButton icon={<DownloadCloud size={14} />} disabled={!selectedProviderId || modelFetchState === 'loading' || pending.isPending(`models.fetch.${selectedProviderId}`)} onClick={() => onAction(t('models.toast.fetched'), () => pending.runPending(`models.fetch.${selectedProviderId}`, async () => {
                  setModelFetchState('loading');
                  setModelFetchError('');
                  try {
                    const options = await api.fetchProviderModels(selectedProviderId);
                    setModelOptions(options);
                    setModelFetchState('ready');
                    const firstNewModel = options.find((option) => !existingModelNames.has(option.id)) ?? options[0];
                    if (firstNewModel) setModelName(firstNewModel.id);
                  } catch (error) {
                    setModelOptions([]);
                    setModelFetchState('error');
                    setModelFetchError(error instanceof Error ? error.message : String(error));
                    throw error;
                  }
                }))}>{t('models.fetchModels')}</CommandButton>
              </div>
              {pending.isPending(`models.fetch.${selectedProviderId}`) ? <InlineNotice tone="info" title={t('app.status.busy')} detail={t('models.fetch.loading')} /> : null}
              {pending.errorFor(`models.fetch.${selectedProviderId}`) ? <InlineNotice tone="warning" title={t('models.fetch.failed')} detail={pending.errorFor(`models.fetch.${selectedProviderId}`)} /> : null}
              {selectableModelOptions.length > 0 ? (
                <Field label={t('models.availableModels')}>
                  <select value={modelName} onChange={(event) => setModelName(event.target.value)}>
                    {selectableModelOptions.map((option) => (
                      <option value={option.id} key={option.id}>{option.name}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label={t('models.modelName')}>
                <input value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder={t('models.modelName.placeholder')} />
              </Field>
              <ModelFetchNotice state={modelFetchState} error={modelFetchError} options={modelOptions} providerName={selectedProviderName} />
            </div>
          </ToolSection>

          <div className="config-items">
            {snapshot.models.length > 0 ? snapshot.models.map((model) => (
              <div className={`config-row ${model.id === defaultModel?.id ? 'is-active' : ''}`} key={model.id}>
                <span>
                  <strong>{model.displayName}</strong>
                  <small>{modelCapabilityLabels(model, t)}</small>
                </span>
                <StatusPillLite label={statusLabel(model.healthStatus, t)} state={healthState(model.healthStatus)} />
              </div>
            )) : <EmptyBlock title={t('common.notConfigured')} detail={t('models.create.note')} />}
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
            <ProviderRow
              key={provider.id}
              provider={provider}
              relatedModelCount={snapshot.models.filter((model) => model.providerId === provider.id).length}
              isDefault={provider.id === defaultProvider?.id}
              pendingDeleteProviderId={pendingDeleteProviderId}
              setPendingDeleteProviderId={setPendingDeleteProviderId}
              pending={pending}
              api={api}
              onAction={onAction}
            />
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

function ModelFetchNotice({
  state,
  error,
  options,
  providerName,
}: {
  state: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  options: ProviderModelOption[];
  providerName?: string;
}) {
  const { t } = useI18n();
  if (state === 'loading') {
    return <InlineNotice tone="info" title={t('models.fetch.loading')} detail={providerName} />;
  }
  if (state === 'error') {
    return <InlineNotice tone="warning" title={t('models.fetch.failed')} detail={error} />;
  }
  if (state === 'ready') {
    return <InlineNotice tone={options.length > 0 ? 'success' : 'muted'} title={t(options.length > 0 ? 'models.fetch.ready' : 'models.fetch.empty', { count: options.length })} />;
  }
  return null;
}

function ProviderRow({
  provider,
  relatedModelCount,
  isDefault,
  pendingDeleteProviderId,
  setPendingDeleteProviderId,
  pending,
  api,
  onAction,
}: {
  provider: TabPageProps['snapshot']['providers'][number];
  relatedModelCount: number;
  isDefault: boolean;
  pendingDeleteProviderId: string | null;
  setPendingDeleteProviderId: (id: string | null) => void;
  pending: ReturnType<typeof useLocalPending>;
  api: TabPageProps['api'];
  onAction: TabPageProps['onAction'];
}) {
  const { t } = useI18n();
  const confirming = pendingDeleteProviderId === provider.id;
  const fetchKey = `provider.fetch.${provider.id}`;
  const testKey = `provider.test.${provider.id}`;
  const deleteKey = `provider.delete.${provider.id}`;
  return (
    <div className={`config-row provider-row ${isDefault ? 'is-active' : ''}`}>
      <div className="provider-row-main">
        <span>
          <strong>{provider.name}</strong>
          <small>{providerTypeLabel(provider.type, t)} / {provider.baseUrl || t('common.notConfigured')}</small>
        </span>
        <span className="provider-row-status">
          <StatusPillLite label={provider.secretRef ? t('common.saved') : t('common.notConfigured')} state={provider.secretRef ? 'ready' : 'warning'} />
          <StatusPillLite label={statusLabel(provider.healthStatus, t)} state={healthState(provider.healthStatus)} />
        </span>
      </div>
      <span className="provider-row-actions" aria-label={`${provider.name} ${t('chat.message.actions.aria')}`}>
        <CommandButton icon={<DownloadCloud size={14} />} disabled={pending.isPending(fetchKey)} onClick={() => onAction(t('models.toast.fetched'), () => pending.runPending(fetchKey, () => api.fetchProviderModels(provider.id)))}>{pending.isPending(fetchKey) ? t('app.status.busy') : t('models.fetchModels')}</CommandButton>
        <CommandButton icon={<Activity size={14} />} disabled={pending.isPending(testKey)} onClick={() => onAction(t('models.toast.tested'), () => pending.runPending(testKey, () => api.testProvider(provider.id)))}>{pending.isPending(testKey) ? t('app.status.busy') : t('models.testConnection')}</CommandButton>
        <CommandButton
          variant={confirming ? 'danger' : 'default'}
          icon={<Trash2 size={14} />}
          disabled={pending.isPending(deleteKey)}
          onClick={() => {
            if (!confirming) {
              setPendingDeleteProviderId(provider.id);
              return;
            }
            onAction(t('models.toast.deleted'), () => pending.runPending(deleteKey, () => api.deleteProvider(provider.id)));
          }}
        >
          {pending.isPending(deleteKey) ? t('app.status.busy') : confirming ? t('models.delete.confirm') : t('models.deleteProvider')}
        </CommandButton>
        {confirming ? (
          <CommandButton variant="ghost" onClick={() => setPendingDeleteProviderId(null)}>{t('models.delete.cancel')}</CommandButton>
        ) : null}
      </span>
      {confirming ? (
        <InlineNotice
          tone="warning"
          title={t('models.delete.warningTitle')}
          detail={t('models.delete.warningDetail', { models: relatedModelCount })}
        />
      ) : null}
      {[fetchKey, testKey, deleteKey].map((key) => pending.errorFor(key) ? <InlineNotice key={key} tone="warning" title={t('app.action.failed')} detail={pending.errorFor(key)} /> : null)}
    </div>
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
