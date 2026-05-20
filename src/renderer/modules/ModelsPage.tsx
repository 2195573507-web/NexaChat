import { Activity, ChevronDown, DownloadCloud, Pencil, Plus, Power, SearchCheck, Server, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AppSnapshot, Model, ProviderDiscoveryResult, ProviderModelOption, ProviderType } from '../../shared/types';
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
  const [customHeadersJson, setCustomHeadersJson] = useState('');
  const [advancedProviderSettingsOpen, setAdvancedProviderSettingsOpen] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<ProviderDiscoveryResult | null>(null);
  const [discoveryState, setDiscoveryState] = useState<'idle' | 'detecting' | 'success' | 'partial' | 'failed'>('idle');
  const [discoveryError, setDiscoveryError] = useState('');
  const [modelName, setModelName] = useState(DEFAULT_MODEL_FORM.name);
  const [selectedProviderId, setSelectedProviderId] = useState(snapshot.providers[0]?.id ?? '');
  const [modelOptions, setModelOptions] = useState<ProviderModelOption[]>([]);
  const [modelFetchState, setModelFetchState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [modelFetchError, setModelFetchError] = useState('');
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState('');
  const [editingModelDisplayName, setEditingModelDisplayName] = useState('');
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

  const beginEditModel = (model: Model) => {
    setEditingModelId(model.id);
    setEditingModelName(model.name);
    setEditingModelDisplayName(model.displayName);
  };

  const saveEditedModel = async (modelId: string) => {
    const updated = await api.updateModel({
      modelId,
      name: editingModelName.trim(),
      displayName: editingModelDisplayName.trim() || editingModelName.trim(),
    });
    setEditingModelId(null);
    return updated;
  };

  const detectProvider = async () => {
    setDiscoveryState('detecting');
    setDiscoveryError('');
    setDiscoveryResult(null);
    const result = await api.discoverProvider({
      address: baseUrl.trim(),
      apiKey: apiKey.trim() || undefined,
      providerName: providerName.trim() || undefined,
      providerType,
      baseUrl: baseUrl.trim() || undefined,
      customHeadersJson: customHeadersJson.trim() || undefined,
    });
    setDiscoveryResult(result);
    setDiscoveryState(result.status);
    if (result.normalizedBaseUrl) {
      setBaseUrl(result.normalizedBaseUrl);
    }
    if (result.suggestedProviderName && !providerName.trim()) {
      setProviderName(result.suggestedProviderName);
    }
    if (result.errors[0]) {
      setDiscoveryError(result.errors[0].message);
    }
    if (result.status === 'failed') {
      setAdvancedProviderSettingsOpen(true);
    }
  };

  const saveDetectedProvider = async () => {
    if (!discoveryResult?.normalizedBaseUrl) return;
    await api.saveProviderFromDiscovery({
      providerName: providerName.trim() || discoveryResult.suggestedProviderName,
      providerType,
      baseUrl: discoveryResult.normalizedBaseUrl,
      apiKey: apiKey.trim() || undefined,
      customHeadersJson: customHeadersJson.trim() || undefined,
      modelNames: discoveryResult.models.map((model) => model.id),
      capabilities: discoveryResult.capabilities,
    });
    setProviderName('');
    setBaseUrl('');
    setApiKey('');
    setCustomHeadersJson('');
    setDiscoveryResult(null);
    setDiscoveryState('idle');
    setDiscoveryError('');
  };

  const saveManualProvider = async () => {
    await api.createProvider({
      name: providerName.trim() || t('models.smartAdd.untitledProvider'),
      type: providerType,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim() || undefined,
      customHeadersJson: customHeadersJson.trim() || undefined,
    });
    setProviderName('');
    setBaseUrl('');
    setApiKey('');
    setCustomHeadersJson('');
    setDiscoveryResult(null);
    setDiscoveryState('idle');
    setDiscoveryError('');
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
              <ModelRow
                key={model.id}
                model={model}
                isDefault={model.id === defaultModel?.id}
                editingModelId={editingModelId}
                editingModelName={editingModelName}
                editingModelDisplayName={editingModelDisplayName}
                setEditingModelName={setEditingModelName}
                setEditingModelDisplayName={setEditingModelDisplayName}
                onBeginEdit={beginEditModel}
                onCancelEdit={() => setEditingModelId(null)}
                onSaveEdit={saveEditedModel}
                api={api}
                pending={pending}
                onAction={onAction}
              />
            )) : <EmptyBlock title={t('common.notConfigured')} detail={t('models.create.note')} />}
          </div>
          {snapshot.disabledModels.length > 0 ? (
            <ToolSection title={t('models.disabled.title')} description={t('models.disabled.note')}>
              <div className="config-items">
                {snapshot.disabledModels.map((model) => (
                  <DisabledModelRow key={model.id} model={model} api={api} pending={pending} onAction={onAction} />
                ))}
              </div>
            </ToolSection>
          ) : null}
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
        actions={<CommandButton variant="primary" icon={<SearchCheck size={15} />} disabled={!baseUrl.trim() || discoveryState === 'detecting'} onClick={() => onAction(t('models.smartAdd.detected'), detectProvider)}>{discoveryState === 'detecting' ? t('app.status.busy') : t('models.smartAdd.detect')}</CommandButton>}
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

        <ToolSection title={t('models.smartAdd.title')} description={t('models.smartAdd.note')}>
          <div className="form-stack">
            <Field label={t('models.smartAdd.address')}>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={t('models.baseUrl.placeholder')} />
            </Field>
            <Field label={t('models.apiKey')}>
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={t('models.apiKey.placeholder')} type="password" />
            </Field>
            <div className="field-action-row">
              <CommandButton variant="primary" icon={<SearchCheck size={14} />} disabled={!baseUrl.trim() || discoveryState === 'detecting'} onClick={() => onAction(t('models.smartAdd.detected'), detectProvider)}>{discoveryState === 'detecting' ? t('app.status.busy') : t('models.smartAdd.detect')}</CommandButton>
              <CommandButton variant="ghost" icon={<ChevronDown size={14} />} onClick={() => setAdvancedProviderSettingsOpen(!advancedProviderSettingsOpen)}>{advancedProviderSettingsOpen ? t('models.smartAdd.advancedHide') : t('models.smartAdd.advancedShow')}</CommandButton>
            </div>
            {discoveryState === 'detecting' ? <InlineNotice tone="info" title={t('models.smartAdd.detecting')} detail={t('models.smartAdd.detecting.detail')} /> : null}
            {discoveryState === 'failed' ? <InlineNotice tone="warning" title={t('models.smartAdd.failed')} detail={discoveryError || t('models.fetch.failed')} /> : null}
            {advancedProviderSettingsOpen ? (
              <section className="advanced-settings-block">
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
                <Field label={t('models.smartAdd.customHeaders')}>
                  <textarea value={customHeadersJson} onChange={(event) => setCustomHeadersJson(event.target.value)} placeholder={t('models.smartAdd.customHeaders.placeholder')} rows={3} />
                </Field>
                <CommandButton icon={<Server size={14} />} disabled={!baseUrl.trim()} onClick={() => onAction(t('models.toast.saved'), saveManualProvider)}>{t('models.smartAdd.manualSave')}</CommandButton>
              </section>
            ) : null}
            {discoveryResult ? (
              <ProviderDiscoveryPreview
                result={discoveryResult}
                saveDisabled={!discoveryResult.normalizedBaseUrl || discoveryResult.models.length === 0}
                onSave={() => onAction(t('models.toast.saved'), saveDetectedProvider)}
              />
            ) : null}
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
            { label: t('provider.type.anthropic'), value: t('common.available') },
            { label: t('provider.type.gemini'), value: t('common.available') },
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

function isModelResult(result: unknown): result is Model {
  return typeof result === 'object' && result !== null && 'id' in result && 'providerId' in result && 'deletedAt' in result;
}

function patchModelSnapshot(snapshot: AppSnapshot, result: unknown): AppSnapshot {
  if (!isModelResult(result)) {
    return snapshot;
  }

  const activeModels = result.enabled && !result.deletedAt
    ? [result, ...snapshot.models.filter((model) => model.id !== result.id)]
    : snapshot.models.filter((model) => model.id !== result.id);
  const disabledModels = !result.enabled || result.deletedAt
    ? [result, ...snapshot.disabledModels.filter((model) => model.id !== result.id)]
    : snapshot.disabledModels.filter((model) => model.id !== result.id);
  const dashboardModels = result.enabled && !result.deletedAt
    ? [result, ...snapshot.dashboard.models.filter((model) => model.id !== result.id)]
    : snapshot.dashboard.models.filter((model) => model.id !== result.id);
  const shouldClearDefaultModel = snapshot.dashboard.workspace.defaultModelId === result.id && (!result.enabled || result.deletedAt);
  const workspace = shouldClearDefaultModel
    ? {
        ...snapshot.dashboard.workspace,
        defaultModelId: null,
      }
    : snapshot.dashboard.workspace;
  const conversations = shouldClearDefaultModel
    ? snapshot.conversations.map((conversation) => (
        conversation.defaultModelId === result.id
          ? { ...conversation, defaultModelId: null }
          : conversation
      ))
    : snapshot.conversations;

  return {
    ...snapshot,
    conversations,
    models: activeModels,
    disabledModels,
    dashboard: {
      ...snapshot.dashboard,
      workspace,
      models: dashboardModels,
    },
  };
}

function ProviderDiscoveryPreview({
  result,
  saveDisabled,
  onSave,
}: {
  result: ProviderDiscoveryResult;
  saveDisabled: boolean;
  onSave: () => void;
}) {
  const { t } = useI18n();
  const capabilityRows = [
    { label: t('models.smartAdd.capability.compatible'), value: t(`models.smartAdd.capability.${result.capabilities.openAiCompatible}`) },
    { label: t('models.smartAdd.capability.chat'), value: t(`models.smartAdd.capability.${result.capabilities.chatCompletions}`) },
    { label: t('models.smartAdd.capability.embeddings'), value: t(`models.smartAdd.capability.${result.capabilities.embeddings}`) },
    { label: t('models.smartAdd.capability.streaming'), value: t(`models.smartAdd.capability.${result.capabilities.streaming}`) },
    { label: t('models.smartAdd.capability.usage'), value: t(`models.smartAdd.capability.${result.capabilities.tokenUsage}`) },
  ];
  const issues = [...result.warnings, ...result.errors];
  return (
    <section className={`discovery-preview discovery-${result.status}`}>
      <div className="discovery-preview-head">
        <span>
          <strong>{t(result.status === 'failed' ? 'models.smartAdd.previewFailed' : 'models.smartAdd.previewReady')}</strong>
          <small>{result.normalizedBaseUrl ?? t('common.notConfigured')}</small>
        </span>
        <StatusPillLite label={t(`models.smartAdd.status.${result.status}`)} state={result.status === 'success' ? 'ready' : result.status === 'partial' ? 'warning' : 'danger'} />
      </div>
      <DataRows
        rows={[
          { label: t('models.smartAdd.normalizedBaseUrl'), value: result.normalizedBaseUrl ?? t('common.notConfigured') },
          { label: t('models.smartAdd.providerName'), value: result.suggestedProviderName },
          { label: t('models.smartAdd.compatibility'), value: result.compatibility },
          { label: t('models.smartAdd.modelCount'), value: result.models.length },
          { label: t('models.smartAdd.modelExamples'), value: result.modelExamples.length ? result.modelExamples.join(', ') : t('models.fetch.empty') },
          ...capabilityRows,
        ]}
      />
      {issues.length > 0 ? (
        <div className="discovery-issues">
          {issues.slice(0, 4).map((issue, index) => (
            <InlineNotice key={`${issue.code}-${index}`} tone={result.status === 'failed' ? 'warning' : 'muted'} title={issue.code} detail={issue.message} />
          ))}
        </div>
      ) : null}
      {result.status !== 'failed' ? (
        <CommandButton variant="primary" icon={<Plus size={14} />} disabled={saveDisabled} onClick={onSave}>{t('models.smartAdd.saveDetected')}</CommandButton>
      ) : (
        <InlineNotice tone="warning" title={t('models.smartAdd.nextAction')} detail={t('models.smartAdd.nextAction.detail')} />
      )}
    </section>
  );
}

function ModelRow({
  model,
  isDefault,
  editingModelId,
  editingModelName,
  editingModelDisplayName,
  setEditingModelName,
  setEditingModelDisplayName,
  onBeginEdit,
  onCancelEdit,
  onSaveEdit,
  api,
  pending,
  onAction,
}: {
  model: Model;
  isDefault: boolean;
  editingModelId: string | null;
  editingModelName: string;
  editingModelDisplayName: string;
  setEditingModelName: (value: string) => void;
  setEditingModelDisplayName: (value: string) => void;
  onBeginEdit: (model: Model) => void;
  onCancelEdit: () => void;
  onSaveEdit: (modelId: string) => Promise<Model>;
  api: TabPageProps['api'];
  pending: ReturnType<typeof useLocalPending>;
  onAction: TabPageProps['onAction'];
}) {
  const { t } = useI18n();
  const editing = editingModelId === model.id;
  const updateKey = `model.update.${model.id}`;
  const disableKey = `model.disable.${model.id}`;
  const deleteKey = `model.delete.${model.id}`;
  return (
    <div className={`config-row model-row ${isDefault ? 'is-active' : ''}`} key={model.id}>
      {editing ? (
        <span className="model-edit-fields">
          <input value={editingModelName} onChange={(event) => setEditingModelName(event.target.value)} aria-label={t('models.modelName')} />
          <input value={editingModelDisplayName} onChange={(event) => setEditingModelDisplayName(event.target.value)} aria-label={t('models.displayName')} />
        </span>
      ) : (
        <span>
          <strong>{model.displayName}</strong>
          <small>{model.name} / {modelCapabilityLabels(model, t)}</small>
        </span>
      )}
      <span className="provider-row-status">
        <StatusPillLite label={statusLabel(model.healthStatus, t)} state={healthState(model.healthStatus)} />
      </span>
      <span className="provider-row-actions" aria-label={`${model.displayName} ${t('chat.message.actions.aria')}`}>
        {editing ? (
          <>
            <CommandButton
              icon={<Pencil size={14} />}
              disabled={!editingModelName.trim() || pending.isPending(updateKey)}
              onClick={() => onAction(t('models.toast.updated'), () => pending.runPending(updateKey, () => onSaveEdit(model.id)), { refresh: 'patch', patch: patchModelSnapshot })}
            >
              {pending.isPending(updateKey) ? t('app.status.busy') : t('common.saved')}
            </CommandButton>
            <CommandButton variant="ghost" onClick={onCancelEdit}>{t('models.edit.cancel')}</CommandButton>
          </>
        ) : (
          <>
            <CommandButton icon={<Pencil size={14} />} onClick={() => onBeginEdit(model)}>{t('models.edit')}</CommandButton>
            <CommandButton icon={<Power size={14} />} disabled={pending.isPending(disableKey)} onClick={() => onAction(t('models.toast.disabled'), () => pending.runPending(disableKey, () => api.disableModel({ modelId: model.id })), { refresh: 'patch', patch: patchModelSnapshot })}>{pending.isPending(disableKey) ? t('app.status.busy') : t('models.disable')}</CommandButton>
            <CommandButton variant="danger" icon={<Trash2 size={14} />} disabled={pending.isPending(deleteKey)} onClick={() => onAction(t('models.toast.modelDeleted'), () => pending.runPending(deleteKey, () => api.deleteModel({ modelId: model.id })), { refresh: 'patch', patch: patchModelSnapshot })}>{pending.isPending(deleteKey) ? t('app.status.busy') : t('models.deleteModel')}</CommandButton>
          </>
        )}
      </span>
      {[updateKey, disableKey, deleteKey].map((key) => pending.errorFor(key) ? <InlineNotice key={key} tone="warning" title={t('app.action.failed')} detail={pending.errorFor(key)} /> : null)}
    </div>
  );
}

function DisabledModelRow({
  model,
  api,
  pending,
  onAction,
}: {
  model: Model;
  api: TabPageProps['api'];
  pending: ReturnType<typeof useLocalPending>;
  onAction: TabPageProps['onAction'];
}) {
  const { t } = useI18n();
  const enableKey = `model.enable.${model.id}`;
  const isDeleted = Boolean(model.deletedAt);
  return (
    <div className="config-row model-row is-disabled">
      <span>
        <strong>{model.displayName}</strong>
        <small>{isDeleted ? t('models.deleted') : t('models.disabled')} / {model.modelNameSnapshot}</small>
      </span>
      <StatusPillLite label={isDeleted ? t('common.deleted') : t('gateway.keyState.disabled')} state="warning" />
      <span className="provider-row-actions" aria-label={`${model.displayName} ${t('chat.message.actions.aria')}`}>
        <CommandButton
          icon={<Power size={14} />}
          disabled={isDeleted || pending.isPending(enableKey)}
          disabledReason={isDeleted ? t('models.deleted.restoreBlocked') : undefined}
          onClick={() => onAction(t('models.toast.enabled'), () => pending.runPending(enableKey, () => api.enableModel({ modelId: model.id })), { refresh: 'patch', patch: patchModelSnapshot })}
        >
          {pending.isPending(enableKey) ? t('app.status.busy') : t('models.enable')}
        </CommandButton>
      </span>
      {pending.errorFor(enableKey) ? <InlineNotice tone="warning" title={t('app.action.failed')} detail={pending.errorFor(enableKey)} /> : null}
    </div>
  );
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
