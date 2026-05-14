import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProviderType } from '../../shared/types';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel, healthTone, providerTypes } from './shared';

export function ModelsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const [providerName, setProviderName] = useState('OpenAI-compatible Provider');
  const [providerType, setProviderType] = useState<ProviderType>('openai-compatible');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-compatible-model');
  const [selectedProviderId, setSelectedProviderId] = useState(snapshot.providers[0]?.id ?? '');

  useEffect(() => {
    if (!selectedProviderId && snapshot.providers[0]) {
      setSelectedProviderId(snapshot.providers[0].id);
    }
  }, [selectedProviderId, snapshot.providers]);

  if (activeTab.id === 'models') {
    return (
      <TabPanel moduleId="models" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>Model Hub</h2>
            <div className="form-grid">
              <label>
                Provider
                <select value={selectedProviderId} onChange={(event) => setSelectedProviderId(event.target.value)}>
                  {snapshot.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Model Name
                <input value={modelName} onChange={(event) => setModelName(event.target.value)} />
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                onAction('模型已添加并可被 Router 选择', () =>
                  api.createModel({ providerId: selectedProviderId || snapshot.providers[0]?.id, name: modelName, supportsStreaming: true }),
                )
              }
            >
              添加模型
            </button>
          </div>
          <div className="panel">
            <h2>模型列表</h2>
            <DataTable
              columns={['模型', 'Provider', 'Context', 'Enabled', 'Health']}
              rows={snapshot.models.map((model) => [
                model.displayName,
                snapshot.providers.find((provider) => provider.id === model.providerId)?.name ?? model.providerId,
                model.contextWindow,
                model.enabled ? 'yes' : 'no',
                <StateBadge key={`${model.id}-health`} label={model.healthStatus} tone={healthTone(model.healthStatus)} />,
              ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'capabilities') {
    return (
      <TabPanel moduleId="models" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>密钥管理</h2>
            <p>Renderer 只显示 secret_ref 状态，不展示 API Key 明文；连接测试仍通过主进程 IPC 执行。</p>
            <DataTable
              columns={['提供商', '类型', 'Secret Ref', '健康', '测试']}
              rows={snapshot.providers.map((provider) => [
                provider.name,
                provider.type,
                provider.secretRef ? '已保存' : '未配置',
                <StateBadge key={`${provider.id}-health`} label={provider.healthStatus} tone={healthTone(provider.healthStatus)} />,
                <button type="button" key={provider.id} onClick={() => onAction('连接测试已记录并脱敏', () => api.testProvider(provider.id))}>
                  测试连接
                </button>,
              ])}
            />
          </div>
          <div className="panel">
            <h2>模型能力摘要</h2>
            <DataTable
              columns={['模型', 'Streaming', 'Tools', 'Vision', 'Embeddings']}
              rows={snapshot.models.map((model) => [
                model.displayName,
                model.supportsStreaming ? 'yes' : 'no',
                model.supportsTools ? 'yes' : 'no',
                model.supportsVision ? 'yes' : 'no',
                model.supportsEmbeddings ? 'yes' : 'no',
              ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'templates') {
    return (
      <TabPanel moduleId="models" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={{ ...activeTab, stage: 'environment-limited' }}
          featureName="路由规则"
          why="model_routes 表存在，但当前还没有规则编辑、冲突验证和请求级路由快照 UI。"
          dependency="先增加规则编辑器、匹配 schema 校验、fallback 顺序和审计事件。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'health') {
    return (
      <TabPanel moduleId="models" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>Provider 健康检测</h2>
            <DataTable
              columns={['名称', '类型', '健康', '最近检查', '操作']}
              rows={snapshot.providers.map((provider) => [
                provider.name,
                provider.type,
                <StateBadge key={`${provider.id}-health`} label={provider.healthStatus} tone={healthTone(provider.healthStatus)} />,
                provider.lastCheckedAt ? new Date(provider.lastCheckedAt).toLocaleString() : '未检查',
                <button type="button" key={provider.id} onClick={() => onAction('连接测试已记录并脱敏', () => api.testProvider(provider.id))}>
                  测试连接
                </button>,
              ])}
            />
          </div>
          <div className="panel">
            <h2>模型健康</h2>
            <DataTable
              columns={['模型', '延迟', '健康', '来源']}
              rows={snapshot.models.map((model) => [
                model.displayName,
                model.latencyMs ? `${model.latencyMs}ms` : '-',
                <StateBadge key={`${model.id}-health`} label={model.healthStatus} tone={healthTone(model.healthStatus)} />,
                snapshot.providers.find((provider) => provider.id === model.providerId)?.name ?? model.providerId,
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
          <h2>Provider Hub</h2>
          <div className="form-grid">
            <label>
              名称
              <input value={providerName} onChange={(event) => setProviderName(event.target.value)} />
            </label>
            <label>
              类型
              <select value={providerType} onChange={(event) => setProviderType(event.target.value as ProviderType)}>
                {providerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Base URL
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
            </label>
            <label>
              API Key
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                placeholder="保存后只保留 secret_ref"
              />
            </label>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                onAction('Provider 已保存，密钥字段默认走 secret_ref', () =>
                  api.createProvider({ name: providerName, type: providerType, baseUrl, apiKey: apiKey || undefined }),
                )
              }
            >
              <Plus size={16} /> 添加 Provider
            </button>
          </div>
        </div>
        <div className="panel">
          <h2>供应商列表</h2>
          <DataTable
            columns={['名称', '类型', 'Base URL', '健康', '操作']}
            rows={snapshot.providers.map((provider) => [
              provider.name,
              provider.type,
              provider.baseUrl,
              <StateBadge key={`${provider.id}-health`} label={provider.healthStatus} tone={healthTone(provider.healthStatus)} />,
              <button type="button" key={provider.id} onClick={() => onAction('连接测试已记录并脱敏', () => api.testProvider(provider.id))}>
                测试连接
              </button>,
            ])}
          />
        </div>
      </section>
    </TabPanel>
  );
}
