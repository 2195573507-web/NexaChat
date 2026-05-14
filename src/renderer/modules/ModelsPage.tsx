import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProviderType } from '../../shared/types';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, getDefaultModel, healthTone, providerTypes } from './shared';

export function ModelsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
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
            <h2>模型创建</h2>
            <p>Model 只记录模型能力和路由可用性；Provider API Key 留在 Provider 管理。</p>
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
              className="primary-button"
              disabled={!modelName.trim() || !(selectedProviderId || snapshot.providers[0]?.id)}
              onClick={() =>
                onAction('模型已添加并可被 Router 选择', () =>
                  api.createModel({ providerId: selectedProviderId || snapshot.providers[0]?.id, name: modelName, supportsStreaming: true }),
                )
              }
            >
              <Plus size={16} /> 添加模型
            </button>
          </div>
          <div className="panel">
            <h2>模型目录</h2>
            <DataTable
              columns={['模型', 'Provider', 'Context', '能力', 'Health']}
              rows={snapshot.models.map((model) => [
                model.displayName,
                snapshot.providers.find((provider) => provider.id === model.providerId)?.name ?? model.providerId,
                model.contextWindow,
                [
                  model.supportsStreaming ? 'streaming' : null,
                  model.supportsTools ? 'tools' : null,
                  model.supportsVision ? 'vision' : null,
                  model.supportsEmbeddings ? 'embeddings' : null,
                ].filter(Boolean).join(', ') || '-',
                <StateBadge key={`${model.id}-health`} label={model.healthStatus} tone={healthTone(model.healthStatus)} />,
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
            <h2>Router 决策边界</h2>
            <p>当前 Router 使用请求指定模型、工作区默认模型或第一个启用模型。规则编辑、冲突校验和请求级路由快照尚未作为可执行功能开放。</p>
            <dl className="detail-list">
              <div><dt>默认 Provider</dt><dd>{snapshot.providers.find((provider) => provider.id === snapshot.dashboard.workspace.defaultProviderId)?.name ?? '未配置'}</dd></div>
              <div><dt>默认模型</dt><dd>{defaultModel?.displayName ?? '未配置'}</dd></div>
              <div><dt>Fallback</dt><dd>{'请求模型 -> 工作区默认 -> 第一个启用模型。'}</dd></div>
              <div><dt>规则编辑器</dt><dd>未暴露为主功能；等待 schema、fallback 顺序和审计事件。</dd></div>
            </dl>
          </div>
          <div className="panel">
            <h2>健康测试</h2>
            <DataTable
              columns={['Provider', '健康', '最近检查', '操作']}
              rows={snapshot.providers.map((provider) => [
                provider.name,
                <StateBadge key={`${provider.id}-health`} label={provider.healthStatus} tone={healthTone(provider.healthStatus)} />,
                provider.lastCheckedAt ? new Date(provider.lastCheckedAt).toLocaleString() : '未检查',
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

  return (
    <TabPanel moduleId="models" tab={activeTab}>
      <section className="two-column">
        <div className="panel">
          <h2>Provider 管理</h2>
          <p>Provider API Key 保存在主进程 secret_ref；本页不管理 Gateway API Key。</p>
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
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" placeholder="保存后只保留 secret_ref" />
            </label>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              disabled={!providerName.trim() || !baseUrl.trim()}
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
            columns={['名称', '类型', 'Secret Ref', 'Base URL', '健康', '操作']}
            rows={snapshot.providers.map((provider) => [
              provider.name,
              provider.type,
              provider.secretRef ? '已保存' : '未配置',
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
