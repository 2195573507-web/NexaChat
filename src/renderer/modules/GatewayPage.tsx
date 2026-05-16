import { useState } from 'react';
import { Copy, KeyRound, Play, RefreshCw, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { GATEWAY_DEFAULT_KEY_POLICY, GATEWAY_ENDPOINT, GATEWAY_SCOPES, type GatewayScope } from '../../shared/gatewayRuntime';
import { GATEWAY_DOCS } from '../../shared/uiCopy';
import { FormField, GatewayStatusCard, MetricTile, PageSection } from '../components/ui';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, copyText, getDefaultModel, statusLabel } from './shared';

export function GatewayPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const status = snapshot.dashboard.gatewayStatus;
  const defaultModel = getDefaultModel(snapshot);
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState(t('gateway.defaultKeyName'));
  const [quotaLimit, setQuotaLimit] = useState<number>(GATEWAY_DEFAULT_KEY_POLICY.quotaLimit);
  const [rateLimit, setRateLimit] = useState<number>(GATEWAY_DEFAULT_KEY_POLICY.rateLimitPerMinute);
  const [selectedScopes, setSelectedScopes] = useState<GatewayScope[]>([...GATEWAY_DEFAULT_KEY_POLICY.scopes]);
  const [pendingDangerKeyId, setPendingDangerKeyId] = useState<string | null>(null);

  if (activeTab.id === 'keys') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="panel">
          <h2>{t('gateway.keys.title')}</h2>
          <p>{t('gateway.keys.note')}</p>
          <div className="gateway-key-policy">
            <FormField label={t('gateway.keyName')}>
              <input value={keyName} onChange={(event) => setKeyName(event.target.value)} />
            </FormField>
            <FormField label={t('gateway.quotaLimit')}>
              <input type="number" min="0" value={quotaLimit} onChange={(event) => setQuotaLimit(Number(event.target.value))} />
            </FormField>
            <FormField label={t('gateway.rateLimit')}>
              <input type="number" min="0" value={rateLimit} onChange={(event) => setRateLimit(Number(event.target.value))} />
            </FormField>
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
                <button type="button" disabled={Boolean(key.revokedAt)} onClick={() => {
                  if (pendingDangerKeyId !== `rotate:${key.id}`) {
                    setPendingDangerKeyId(`rotate:${key.id}`);
                    return;
                  }
                  setPendingDangerKeyId(null);
                  onAction(t('gateway.toast.rotated'), async () => {
                    const rotated = await api.rotateGatewayKey({ gatewayKeyId: key.id });
                    setLastCreatedKey(rotated.key);
                  });
                }}>
                  <RefreshCw size={16} /> {t('gateway.rotate')}
                </button>
                <button type="button" className={pendingDangerKeyId === `revoke:${key.id}` ? 'danger-button' : undefined} disabled={Boolean(key.revokedAt)} onClick={() => {
                  if (pendingDangerKeyId !== `revoke:${key.id}`) {
                    setPendingDangerKeyId(`revoke:${key.id}`);
                    return;
                  }
                  setPendingDangerKeyId(null);
                  onAction(t('gateway.toast.revoked'), () => api.revokeGatewayKey(key.id));
                }}>
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
    const filteredLogs = snapshot.observability.requestLogs;
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('gateway.logs.requests')}</h2>
            <DataTable
              columns={[t('gateway.columns.status'), t('gateway.columns.endpoint'), t('gateway.columns.model'), t('gateway.columns.tokens'), t('gateway.columns.latency'), t('gateway.columns.error')]}
              rows={filteredLogs.map((log) => [
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

  if (activeTab.id === 'usage') {
    const summary = snapshot.observability.summary;
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <section className="summary-grid">
          <article className="metric-card">
            <span>{t('observability.summary.requests')}</span>
            <strong>{summary.requestCount}</strong>
            <p>{t('observability.summary.successRate', { value: Math.round(summary.successRate * 100) })}</p>
          </article>
          <article className="metric-card">
            <span>{t('observability.summary.tokens')}</span>
            <strong>{summary.inputTokens + summary.outputTokens}</strong>
            <p>{t('observability.summary.tokenBreakdown', { input: summary.inputTokens, output: summary.outputTokens })}</p>
          </article>
          <article className="metric-card">
            <span>{t('observability.summary.latency')}</span>
            <strong>{summary.averageLatencyMs ?? '-'}</strong>
            <p>{t('observability.summary.p95', { value: summary.p95LatencyMs ?? '-' })}</p>
          </article>
          <article className="metric-card">
            <span>{t('observability.summary.feedbackEval')}</span>
            <strong>{summary.feedbackCount + summary.evalResultCount}</strong>
            <p>{t('observability.summary.feedbackEvalDetail', { feedback: summary.feedbackCount, evals: summary.evalResultCount })}</p>
          </article>
        </section>
        <section className="two-column">
          <div className="panel">
            <h2>{t('observability.health.title')}</h2>
            <DataTable
              columns={[t('observability.columns.provider'), t('observability.columns.status'), t('observability.columns.requests'), t('observability.columns.failures'), t('observability.columns.latency')]}
              rows={summary.providerHealth.map((health) => [
                health.providerName,
                <StateBadge key={`${health.providerId}-health`} label={statusLabel(health.status, t)} tone={health.status === 'healthy' ? 'success' : health.status === 'error' ? 'error' : 'warning'} />,
                health.requestCount,
                health.failureCount,
                health.averageLatencyMs ?? '-',
              ])}
            />
          </div>
          <div className="panel">
            <h2>{t('observability.usage.title')}</h2>
            <DataTable
              columns={[t('gateway.columns.model'), t('gateway.columns.tokens'), t('gateway.columns.request'), t('gateway.columns.time')]}
              rows={snapshot.observability.usageRecords.map((record) => {
                const model = snapshot.models.find((item) => item.id === record.modelId);
                return [
                  model?.displayName ?? record.modelId ?? '-',
                  t('observability.summary.tokenBreakdown', { input: record.inputTokens, output: record.outputTokens }),
                  record.requestLogId ?? '-',
                  new Date(record.createdAt).toLocaleString(),
                ];
              })}
            />
          </div>
        </section>
        <section className="panel">
          <h2>{t('observability.errors.title')}</h2>
          <DataTable
            columns={[t('observability.columns.errorCode'), t('observability.columns.count')]}
            rows={summary.topErrors.map((error) => [error.code, error.count])}
          />
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
            <pre className="snippet">{`curl http://${status.bindHost}:${status.port}${GATEWAY_ENDPOINT.models} \\
  -H "Authorization: Bearer ${GATEWAY_DOCS.bearerPlaceholder}"

curl http://${status.bindHost}:${status.port}${GATEWAY_ENDPOINT.chatCompletions} \\
  -H "Authorization: Bearer ${GATEWAY_DOCS.bearerPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${defaultModel?.name ?? GATEWAY_DOCS.sampleModelPlaceholder}","messages":[{"role":"user","content":"${GATEWAY_DOCS.sampleUserMessage}"}]}'`}</pre>
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
      <section className="gateway-console">
        <GatewayStatusCard
          status={status}
          defaultModel={defaultModel?.displayName ?? t('common.notConfigured')}
          keyCount={t('common.countAvailable', { count: snapshot.gatewayKeys.filter((key) => !key.revokedAt).length })}
          actions={
          <button type="button" className="primary-button" onClick={() => onAction(status.running ? t('gateway.toast.stopped') : t('gateway.toast.started'), () => api.toggleGateway(!status.running))}>
            <Play size={16} /> {status.running ? t('gateway.stop') : t('gateway.start')}
          </button>
          }
        />
        <div className="gateway-endpoint-console">
          <div>
            <h3>{t('gateway.overview.title')}</h3>
            <p>{t('gateway.overview.note', { host: status.bindHost, port: status.port })}</p>
          </div>
          <div className="endpoint-list">
            {status.endpoints.map((endpoint) => (
              <code key={endpoint}>{endpoint}</code>
            ))}
          </div>
        </div>
      </section>
      <section className="summary-grid gateway-summary-grid">
        <MetricTile label={t('gateway.keyCount')} value={snapshot.gatewayKeys.filter((key) => !key.revokedAt).length} detail={t('gateway.keys.title')} tone="info" />
        <MetricTile label={t('observability.summary.requests')} value={snapshot.observability.summary.requestCount} detail={t('observability.summary.successRate', { value: Math.round(snapshot.observability.summary.successRate * 100) })} tone="success" />
        <MetricTile label={t('gateway.recentError')} value={status.recentError ?? t('common.none')} detail={t('gateway.redaction.note')} tone={status.recentError ? 'danger' : 'neutral'} />
      </section>
      <PageSection title={t('gateway.providerRoute')} description={t('gateway.providerRoute.note')} className="gateway-route-panel">
        <div className="endpoint-list">
          <code>{defaultModel?.displayName ?? t('common.notConfigured')}</code>
          <code>{defaultModel ? snapshot.providers.find((provider) => provider.id === defaultModel.providerId)?.name ?? defaultModel.providerId : t('common.notConfigured')}</code>
        </div>
        <dl className="detail-list">
          <div><dt>{t('gateway.defaultModel')}</dt><dd>{defaultModel?.displayName ?? t('common.notConfigured')}</dd></div>
          <div><dt>{t('gateway.provider')}</dt><dd>{defaultModel ? snapshot.providers.find((provider) => provider.id === defaultModel.providerId)?.name ?? defaultModel.providerId : t('common.notConfigured')}</dd></div>
          <div><dt>{t('gateway.keyCount')}</dt><dd>{t('common.countAvailable', { count: snapshot.gatewayKeys.filter((key) => !key.revokedAt).length })}</dd></div>
          <div><dt>{t('gateway.recentError')}</dt><dd>{status.recentError ?? t('common.none')}</dd></div>
        </dl>
      </PageSection>
    </TabPanel>
  );
}
