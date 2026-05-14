import { useState } from 'react';
import { Copy, KeyRound, Play, XCircle } from 'lucide-react';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, copyText, getDefaultModel } from './shared';

export function GatewayPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const status = snapshot.dashboard.gatewayStatus;
  const defaultModel = getDefaultModel(snapshot);
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);

  if (activeTab.id === 'keys') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="panel">
          <h2>Gateway API Key</h2>
          <p>这里管理外部调用本地 Gateway 的 Key；Provider API Key 留在模型模块。</p>
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              onAction('Gateway API Key 已生成，完整值只显示一次', async () => {
                const created = await api.createGatewayKey('Local app integration');
                setLastCreatedKey(created.key);
              })
            }
          >
            <KeyRound size={16} /> 生成 Key
          </button>
          {lastCreatedKey ? (
            <div className="secret-once">
              <strong>一次性完整 Key</strong>
              <code>{lastCreatedKey}</code>
              <button type="button" onClick={() => copyText(lastCreatedKey)}>
                <Copy size={16} /> 复制
              </button>
            </div>
          ) : null}
          <DataTable
            columns={['名称', '预览', 'Scopes', '状态', '使用量', 'Last used', '操作']}
            rows={snapshot.gatewayKeys.map((key) => [
              key.name,
              key.keyPreview,
              key.scopes.join(', '),
              <StateBadge key={`${key.id}-state`} label={key.revokedAt ? '已撤销' : '可用'} tone={key.revokedAt ? 'muted' : 'success'} />,
              key.quotaUsed,
              key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : '-',
              <button type="button" key={key.id} disabled={Boolean(key.revokedAt)} onClick={() => onAction('Gateway API Key 已撤销', () => api.revokeGatewayKey(key.id))}>
                <XCircle size={16} /> 撤销
              </button>,
            ])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'logs') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>请求日志</h2>
            <DataTable
              columns={['状态', 'Endpoint', '模型', 'Tokens', 'Latency', '错误']}
              rows={snapshot.requestLogs.map((log) => [
                <StateBadge key={`${log.id}-status`} label={log.status} tone={log.status === 'failed' ? 'error' : log.status === 'completed' ? 'success' : 'warning'} />,
                log.endpoint,
                log.modelNameSnapshot ?? '-',
                `${log.inputTokens ?? 0}/${log.outputTokens ?? 0}`,
                log.latencyMs ?? '-',
                log.errorMessage ?? '-',
              ])}
            />
          </div>
          <div className="panel">
            <h2>网关事件</h2>
            <DataTable
              columns={['方法', '路径', '状态', '关联请求', '时间']}
              rows={snapshot.gatewayLogs.map((log) => [
                log.method,
                log.path,
                <StateBadge key={log.id} label={String(log.statusCode)} tone={log.statusCode >= 400 ? 'error' : 'success'} />,
                log.requestLogId ?? '-',
                new Date(log.createdAt).toLocaleString(),
              ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'docs') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>本地调用示例</h2>
            <p>本地 Gateway 只监听 {status.bindHost}:{status.port}，scope 在主进程校验。`/v1/responses` 保留并返回 501。</p>
            <pre className="snippet">{`curl http://${status.bindHost}:${status.port}/v1/models \\
  -H "Authorization: Bearer <one-time-key>"

curl http://${status.bindHost}:${status.port}/v1/chat/completions \\
  -H "Authorization: Bearer <one-time-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${defaultModel?.name ?? 'nexachat-model'}","messages":[{"role":"user","content":"hello"}]}'`}</pre>
          </div>
          <div className="panel">
            <h2>端点与安全说明</h2>
            <div className="endpoint-list">
              {status.endpoints.map((endpoint) => (
                <code key={endpoint}>{endpoint}</code>
              ))}
            </div>
            <dl className="detail-list">
              <div><dt>Scope</dt><dd>models:read、chat:write、embeddings:write。</dd></div>
              <div><dt>脱敏</dt><dd>Authorization、API Key 和自定义敏感 Header 默认脱敏。</dd></div>
              <div><dt>Provider 路由</dt><dd>只展示当前 Router 结果，不在此编辑 Provider 密钥。</dd></div>
            </dl>
          </div>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="gateway" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>本地 OpenAI-compatible 网关</h2>
            <p>启用后只监听 {status.bindHost}:{status.port}，并复用 Chat 的 Router/Gateway。</p>
          </div>
          <button type="button" className="primary-button" onClick={() => onAction(status.running ? '本地网关已停止' : '本地网关已启动', () => api.toggleGateway(!status.running))}>
            <Play size={16} /> {status.running ? '停止网关' : '启用网关'}
          </button>
        </div>
        <div className="endpoint-list">
          {status.endpoints.map((endpoint) => (
            <code key={endpoint}>{endpoint}</code>
          ))}
        </div>
        <dl className="detail-list">
          <div><dt>默认模型</dt><dd>{defaultModel?.displayName ?? '未配置'}</dd></div>
          <div><dt>Provider</dt><dd>{defaultModel ? snapshot.providers.find((provider) => provider.id === defaultModel.providerId)?.name ?? defaultModel.providerId : '未配置'}</dd></div>
          <div><dt>Gateway Key</dt><dd>{snapshot.gatewayKeys.filter((key) => !key.revokedAt).length} 个可用</dd></div>
          <div><dt>最近错误</dt><dd>{status.recentError ?? '无'}</dd></div>
        </dl>
      </section>
    </TabPanel>
  );
}
