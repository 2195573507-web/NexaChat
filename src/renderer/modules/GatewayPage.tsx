import { useState } from 'react';
import { Copy, KeyRound, Play, XCircle } from 'lucide-react';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, copyText, getDefaultModel, healthTone } from './shared';

export function GatewayPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const status = snapshot.dashboard.gatewayStatus;
  const defaultModel = getDefaultModel(snapshot);
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
  if (activeTab.id === 'keys') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="panel">
          <h2>API Key</h2>
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              onAction('API Key 已生成，完整值只显示一次', async () => {
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
              <button
                type="button"
                key={key.id}
                disabled={Boolean(key.revokedAt)}
                onClick={() => onAction('API Key 已撤销', () => api.revokeGatewayKey(key.id))}
              >
                <XCircle size={16} /> 撤销
              </button>,
            ])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'virtual-models') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>兼容接口</h2>
            <p>本地网关复用 Chat 的 Router/Gateway，当前展示已经接入的 OpenAI-compatible 入口；`/v1/responses` 明确保留。</p>
            <div className="endpoint-list">
              {status.endpoints.map((endpoint) => (
                <code key={endpoint}>{endpoint}</code>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2>默认模型映射</h2>
            <dl className="detail-list">
              <div><dt>默认模型</dt><dd>{defaultModel?.displayName ?? '未配置'}</dd></div>
              <div><dt>Provider</dt><dd>{defaultModel ? snapshot.providers.find((provider) => provider.id === defaultModel.providerId)?.name ?? defaultModel.providerId : '未配置'}</dd></div>
              <div><dt>Gateway</dt><dd>{status.bindHost}:{status.port}</dd></div>
            </dl>
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'routes') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>安全策略</h2>
            <p>前端不持久化明文 Key；Gateway scope 在主进程校验，敏感 headers 和导出默认脱敏。</p>
            <dl className="detail-list">
              <div><dt>限流</dt><dd>Key 记录有 quota 字段；完整速率限制仍待接入。</dd></div>
              <div><dt>IP 限制</dt><dd>当前仅监听 {status.bindHost}，不开放公网绑定。</dd></div>
              <div><dt>敏感过滤</dt><dd>Authorization、API Key、自定义敏感 Header 默认脱敏。</dd></div>
              <div><dt>审计</dt><dd>Key、导入、诊断和 MCP 权限动作均写入审计日志。</dd></div>
            </dl>
          </div>
          <div className="panel">
            <h2>路由边界</h2>
            <DataTable
              columns={['模型', 'Provider', '健康']}
              rows={snapshot.models.map((model) => [
                model.displayName,
                snapshot.providers.find((provider) => provider.id === model.providerId)?.name ?? model.providerId,
                <StateBadge key={`${model.id}-health`} label={model.healthStatus} tone={healthTone(model.healthStatus)} />,
              ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'integrations') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>导入配置预览</h2>
            <p>负责兼容配置的解析、校验和预览。实际应用复用“数据配置 / 智能导入预检”，不在这里重复写入 secrets。</p>
            <pre className="snippet">{`{
  "providers": [
    { "name": "Imported Provider", "baseUrl": "http://127.0.0.1:11434/v1" }
  ]
}`}</pre>
          </div>
          <div className="panel">
            <h2>校验结果预览</h2>
            <DataTable
              columns={['动作', '状态', '摘要', '脱敏']}
              rows={snapshot.importExportResults.slice(0, 6).map((item) => [
                item.action,
                <StateBadge key={item.id} label={item.status} tone={item.status === 'failed' ? 'error' : item.status === 'ready' ? 'warning' : 'success'} />,
                item.summary,
                item.redacted ? 'yes' : 'no',
              ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'logs') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="panel">
          <h2>调用日志</h2>
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
            <p>默认关闭；启用后只监听 {status.bindHost}:{status.port}，并复用 Chat 的 Router/Gateway。</p>
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
        {status.recentError ? <p className="error-text">最近错误：{status.recentError}</p> : null}
      </section>
    </TabPanel>
  );
}
