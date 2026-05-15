import { useState } from 'react';
import { Copy, KeyRound, Play, XCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, copyText, getDefaultModel, statusLabel } from './shared';

export function GatewayPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const status = snapshot.dashboard.gatewayStatus;
  const defaultModel = getDefaultModel(snapshot);
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);

  if (activeTab.id === 'keys') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="panel">
          <h2>{t('gateway.keys.title')}</h2>
          <p>{t('gateway.keys.note')}</p>
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              onAction(t('gateway.toast.created'), async () => {
                const created = await api.createGatewayKey('Local app integration');
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
              key.scopes.join(', '),
              <StateBadge key={`${key.id}-state`} label={key.revokedAt ? t('common.revoked') : t('common.available')} tone={key.revokedAt ? 'muted' : 'success'} />,
              key.quotaUsed,
              key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : '-',
              <button type="button" key={key.id} disabled={Boolean(key.revokedAt)} onClick={() => onAction(t('gateway.toast.revoked'), () => api.revokeGatewayKey(key.id))}>
                <XCircle size={16} /> {t('gateway.revoke')}
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
              columns={[t('gateway.columns.method'), t('gateway.columns.path'), t('gateway.columns.status'), t('gateway.columns.request'), t('gateway.columns.time')]}
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
