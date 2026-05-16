import { useState } from 'react';
import { Copy, KeyRound, Play, RefreshCw, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { GATEWAY_SCOPES, type GatewayScope } from '../../shared/gatewayRuntime';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, copyText, getDefaultModel, statusLabel } from './shared';

export function GatewayPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const status = snapshot.dashboard.gatewayStatus;
  const defaultModel = getDefaultModel(snapshot);
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState(t('gateway.defaultKeyName'));
  const [quotaLimit, setQuotaLimit] = useState(1000);
  const [rateLimit, setRateLimit] = useState(60);
  const [selectedScopes, setSelectedScopes] = useState<GatewayScope[]>([...GATEWAY_SCOPES]);

  if (activeTab.id === 'keys') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="panel">
          <h2>{t('gateway.keys.title')}</h2>
          <p>{t('gateway.keys.note')}</p>
          <div className="gateway-key-policy">
            <label>
              {t('gateway.keyName')}
              <input value={keyName} onChange={(event) => setKeyName(event.target.value)} />
            </label>
            <label>
              {t('gateway.quotaLimit')}
              <input type="number" min="0" value={quotaLimit} onChange={(event) => setQuotaLimit(Number(event.target.value))} />
            </label>
            <label>
              {t('gateway.rateLimit')}
              <input type="number" min="0" value={rateLimit} onChange={(event) => setRateLimit(Number(event.target.value))} />
            </label>
          </div>
          <div className="scope-toggle-list" aria-label={t('gateway.scopes.aria')}>
            {GATEWAY_SCOPES.map((scope) => (
              <label key={scope}>
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(scope)}
                  onChange={(event) => {
                    setSelectedScopes((current) =>
                      event.target.checked ? Array.from(new Set([...current, scope])) : current.filter((item) => item !== scope),
                    );
                  }}
                />
                {scope}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              onAction(t('gateway.toast.created'), async () => {
                const created = await api.createGatewayKey({
                  name: keyName,
                  scopes: selectedScopes,
                  quotaLimit,
                  rateLimitPerMinute: rateLimit,
                });
                setLastCreatedKey(created.key);
              })
            }
          >
            <KeyRound size={16} /> {t('gateway.generateKey')}
          </button>
          {lastCreatedKey ? (
            <div className="secret-once">
              <strong>{t('gateway.oneTimeKey')}</strong>
              <code>{lastCreatedKey}</code>
              <button type="button" onClick={() => copyText(lastCreatedKey)}>
                <Copy size={16} /> {t('gateway.copy')}
              </button>
            </div>
          ) : null}
          <DataTable
            columns={[t('gateway.columns.name'), t('gateway.columns.preview'), t('gateway.columns.scopes'), t('gateway.columns.state'), t('gateway.columns.usage'), t('gateway.columns.lastUsed'), t('gateway.columns.actions')]}
            rows={snapshot.gatewayKeys.map((key) => [
              key.name,
              key.keyPreview,
              <span key={`${key.id}-scope`}>{key.scopes.join(', ')}<br />{t('gateway.rateLimitValue', { count: key.rateLimitPerMinute ?? 0 })}</span>,
              <StateBadge key={`${key.id}-state`} label={t(`gateway.keyState.${key.state}`)} tone={key.state === 'active' ? 'success' : key.state === 'quota_exceeded' ? 'warning' : 'muted'} />,
              key.quotaLimit === null ? key.quotaUsed : `${key.quotaUsed}/${key.quotaLimit}`,
              key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : '-',
              <div className="button-row compact" key={key.id}>
                <button type="button" disabled={Boolean(key.revokedAt)} onClick={() => onAction(key.disabledAt ? t('gateway.toast.enabled') : t('gateway.toast.disabled'), () => api.updateGatewayKey({ gatewayKeyId: key.id, disabled: !key.disabledAt }))}>
                  {key.disabledAt ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} {key.disabledAt ? t('gateway.enableKey') : t('gateway.disableKey')}
                </button>
                <button type="button" disabled={Boolean(key.revokedAt)} onClick={() => onAction(t('gateway.toast.rotated'), async () => {
                  const rotated = await api.rotateGatewayKey({ gatewayKeyId: key.id });
                  setLastCreatedKey(rotated.key);
                })}>
                  <RefreshCw size={16} /> {t('gateway.rotate')}
                </button>
                <button type="button" disabled={Boolean(key.revokedAt)} onClick={() => onAction(t('gateway.toast.revoked'), () => api.revokeGatewayKey(key.id))}>
                  <XCircle size={16} /> {t('gateway.revoke')}
                </button>
              </div>,
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
            <h2>{t('gateway.logs.requests')}</h2>
            <DataTable
              columns={[t('gateway.columns.status'), t('gateway.columns.endpoint'), t('gateway.columns.model'), t('gateway.columns.tokens'), t('gateway.columns.latency'), t('gateway.columns.error')]}
              rows={snapshot.requestLogs.map((log) => [
                <StateBadge key={`${log.id}-status`} label={statusLabel(log.status, t)} tone={log.status === 'failed' ? 'error' : log.status === 'completed' ? 'success' : 'warning'} />,
                log.endpoint,
                log.modelNameSnapshot ?? '-',
                `${log.inputTokens ?? 0}/${log.outputTokens ?? 0}`,
                log.latencyMs ?? '-',
                log.errorMessage ?? '-',
              ])}
            />
          </div>
          <div className="panel">
            <h2>{t('gateway.logs.events')}</h2>
            <DataTable
              columns={[t('gateway.columns.method'), t('gateway.columns.path'), t('gateway.columns.status'), t('gateway.columns.key'), t('gateway.columns.scope'), t('gateway.columns.error'), t('gateway.columns.time')]}
              rows={snapshot.gatewayLogs.map((log) => [
                log.method,
                log.path,
                <StateBadge key={log.id} label={String(log.statusCode)} tone={log.statusCode >= 400 ? 'error' : 'success'} />,
                log.keyPreview ?? '-',
                log.scope ?? '-',
                log.errorCode ?? '-',
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
            <h2>{t('gateway.docs.example')}</h2>
            <p>{t('gateway.docs.note', { host: status.bindHost, port: status.port })}</p>
            <pre className="snippet">{`curl http://${status.bindHost}:${status.port}/v1/models \\
  -H "Authorization: Bearer <one-time-key>"

curl http://${status.bindHost}:${status.port}/v1/chat/completions \\
  -H "Authorization: Bearer <one-time-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${defaultModel?.name ?? 'nexachat-model'}","messages":[{"role":"user","content":"hello"}]}'`}</pre>
          </div>
          <div className="panel">
            <h2>{t('gateway.docs.security')}</h2>
            <div className="endpoint-list">
              {status.endpoints.map((endpoint) => (
                <code key={endpoint}>{endpoint}</code>
              ))}
            </div>
            <dl className="detail-list">
              <div><dt>{t('gateway.scope')}</dt><dd>{t('gateway.scope.note')}</dd></div>
              <div><dt>{t('gateway.redaction')}</dt><dd>{t('gateway.redaction.note')}</dd></div>
              <div><dt>{t('gateway.providerRoute')}</dt><dd>{t('gateway.providerRoute.note')}</dd></div>
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
            <h2>{t('gateway.overview.title')}</h2>
            <p>{t('gateway.overview.note', { host: status.bindHost, port: status.port })}</p>
          </div>
          <button type="button" className="primary-button" onClick={() => onAction(status.running ? t('gateway.toast.stopped') : t('gateway.toast.started'), () => api.toggleGateway(!status.running))}>
            <Play size={16} /> {status.running ? t('gateway.stop') : t('gateway.start')}
          </button>
        </div>
        <div className="endpoint-list">
          {status.endpoints.map((endpoint) => (
            <code key={endpoint}>{endpoint}</code>
          ))}
        </div>
        <dl className="detail-list">
          <div><dt>{t('gateway.defaultModel')}</dt><dd>{defaultModel?.displayName ?? t('common.notConfigured')}</dd></div>
          <div><dt>{t('gateway.provider')}</dt><dd>{defaultModel ? snapshot.providers.find((provider) => provider.id === defaultModel.providerId)?.name ?? defaultModel.providerId : t('common.notConfigured')}</dd></div>
          <div><dt>{t('gateway.keyCount')}</dt><dd>{t('common.countAvailable', { count: snapshot.gatewayKeys.filter((key) => !key.revokedAt).length })}</dd></div>
          <div><dt>{t('gateway.recentError')}</dt><dd>{status.recentError ?? t('common.none')}</dd></div>
        </dl>
      </section>
    </TabPanel>
  );
}
