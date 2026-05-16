import { Copy, KeyRound, Play, Power, RotateCcw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { GATEWAY_AVAILABLE_ENDPOINTS, GATEWAY_DEFAULT_KEY_POLICY, GATEWAY_ENDPOINT, GATEWAY_RESERVED_ENDPOINTS } from '../../shared/gatewayRuntime';
import { GATEWAY_DOCS, FORM_DEFAULTS } from '../../shared/uiCopy';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, CopyableCommand, DataRows, EmptyBlock, Field, InlineNotice, PageHeader, StatusPillLite, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { formatDate, getDefaultModel, healthState, statusLabel, TabPanel, type TabPageProps } from './shared';

export function GatewayPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const defaultModel = getDefaultModel(snapshot);
  const [keyName, setKeyName] = useState<string>(FORM_DEFAULTS.gatewayKeyName);
  const [oneTimeKey, setOneTimeKey] = useState<string | null>(null);
  const endpointBase = `${snapshot.dashboard.gatewayStatus.bindHost}:${snapshot.dashboard.gatewayStatus.port}`;
  const chatCommand = `curl http://${endpointBase}${GATEWAY_ENDPOINT.chatCompletions} -H "Authorization: Bearer ${GATEWAY_DOCS.bearerPlaceholder}" -H "Content-Type: application/json" -d "{\\"model\\":\\"${defaultModel?.modelNameSnapshot ?? GATEWAY_DOCS.sampleModelPlaceholder}\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"${GATEWAY_DOCS.sampleUserMessage}\\"}]}"`;

  const createKey = async () => {
    const created = await api.createGatewayKey({
      name: keyName.trim() || t('gateway.defaultKeyName'),
      scopes: [...GATEWAY_DEFAULT_KEY_POLICY.scopes],
      quotaLimit: GATEWAY_DEFAULT_KEY_POLICY.quotaLimit,
      rateLimitPerMinute: GATEWAY_DEFAULT_KEY_POLICY.rateLimitPerMinute,
    });
    setOneTimeKey(created.key);
  };

  if (activeTab.id === 'keys') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <PageHeader
          eyebrow={t('gateway.docs.security')}
          title={t('gateway.keys.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={t('gateway.keyCount') + ` ${snapshot.gatewayKeys.length}`} state={snapshot.gatewayKeys.some((key) => key.state === 'active') ? 'ready' : 'warning'} />}
          actions={<CommandButton variant="primary" icon={<KeyRound size={15} />} onClick={() => onAction(t('gateway.toast.created'), createKey)}>{t('gateway.generateKey')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('gateway.keys.title')} description={activeTab.featureBoundary}>
          <ToolSection title={t('gateway.generateKey')} description={t('gateway.keys.note')}>
            <div className="form-stack">
              <Field label={t('gateway.keyName')}>
                <input value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder={t('gateway.defaultKeyName')} />
              </Field>
            </div>
            {oneTimeKey ? (
              <InlineNotice tone="warning" title={t('gateway.oneTimeKey')} detail={<code>{oneTimeKey}</code>} />
            ) : null}
          </ToolSection>

          <div className="config-items">
            {snapshot.gatewayKeys.length > 0 ? snapshot.gatewayKeys.map((key) => (
              <div className={`config-row ${key.state === 'active' ? 'is-active' : ''}`} key={key.id}>
                <span>
                  <strong>{key.name}</strong>
                  <small>{key.keyPreview} / {key.scopes.join(', ')}</small>
                </span>
                <span className="row-actions">
                  <StatusPillLite label={statusLabel(key.state, t)} state={healthState(key.state)} />
                  <CommandButton icon={<RotateCcw size={14} />} onClick={() => onAction(t('gateway.toast.rotated'), async () => {
                    const rotated = await api.rotateGatewayKey({ gatewayKeyId: key.id });
                    setOneTimeKey(rotated.key);
                  })}>{t('gateway.rotate')}</CommandButton>
                  <CommandButton variant="danger" icon={<ShieldAlert size={14} />} onClick={() => onAction(t('gateway.toast.revoked'), () => api.revokeGatewayKey(key.id))}>{t('gateway.revoke')}</CommandButton>
                </span>
              </div>
            )) : <EmptyBlock title={t('common.notConfigured')} detail={t('gateway.keys.note')} />}
          </div>
        </ConfigList>
        <ConfigDetail title={t('gateway.docs.security')} description={t('nav.gateway.keys.boundary')}>
          <DataRows
            rows={[
              { label: t('gateway.keyCount'), value: snapshot.gatewayKeys.length },
              { label: t('gateway.scopes.aria'), value: GATEWAY_DEFAULT_KEY_POLICY.scopes.join(', ') },
              { label: t('common.required'), value: t('gateway.oneTimeKey') },
            ]}
          />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'logs' || activeTab.id === 'usage') {
    const logItems = activeTab.id === 'usage'
      ? snapshot.usageRecords.slice(0, 12).map((usage) => ({
          title: t('common.valueSeparator', { left: usage.inputTokens + usage.outputTokens, right: t('knowledge.columns.tokens') }),
          meta: formatDate(usage.createdAt, t),
          state: 'info' as const,
        }))
      : snapshot.gatewayLogs.slice(0, 12).map((log) => ({
          title: `${log.method} ${log.path}`,
          meta: `${log.statusCode} / ${formatDate(log.createdAt, t)}`,
          state: log.statusCode >= 400 ? 'danger' as const : 'ready' as const,
        }));
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <PageHeader
          eyebrow={activeTab.id === 'usage' ? t('observability.usage.title') : t('nav.gateway.logs.label')}
          title={activeTab.label}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={activeTab.id === 'usage' ? snapshot.dashboard.usageToday.requests : snapshot.gatewayLogs.length} state="info" />}
        />
        <div className="tool-layout">
        <ConfigList title={activeTab.label} description={activeTab.featureBoundary}>
          <ActivityList empty={t('app.recent.empty')} items={logItems} />
        </ConfigList>
        <ConfigDetail title={t('observability.usage.title')} description={t('gateway.overview.note', { host: snapshot.dashboard.gatewayStatus.bindHost, port: snapshot.dashboard.gatewayStatus.port })}>
          <DataRows
            rows={[
              { label: t('observability.summary.requests'), value: snapshot.dashboard.usageToday.requests },
              { label: t('observability.summary.tokens'), value: snapshot.dashboard.usageToday.inputTokens + snapshot.dashboard.usageToday.outputTokens },
              { label: t('gateway.recentError'), value: snapshot.dashboard.gatewayStatus.recentError ?? t('common.none') },
            ]}
          />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'docs') {
    return (
      <TabPanel moduleId="gateway" tab={activeTab}>
        <PageHeader
          eyebrow={t('nav.gateway.docs.label')}
          title={t('gateway.docs.example')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={defaultModel?.displayName ?? t('common.notConfigured')} state={defaultModel ? 'ready' : 'warning'} />}
          actions={<CommandButton icon={<Copy size={15} />} onClick={() => void navigator.clipboard?.writeText(chatCommand)}>{t('app.error.copy')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('gateway.docs.example')} description={activeTab.featureBoundary}>
          <CopyableCommand value={chatCommand} label={t('app.error.copy')} />
          <ToolSection title={t('gateway.docs.security')} description={t('gateway.docs.note', { host: snapshot.dashboard.gatewayStatus.bindHost, port: snapshot.dashboard.gatewayStatus.port })}>
            <div className="endpoint-list">
              {GATEWAY_AVAILABLE_ENDPOINTS.map((endpoint) => (
                <code key={endpoint}>{endpoint}</code>
              ))}
            </div>
          </ToolSection>
        </ConfigList>
        <ConfigDetail title={t('nav.gateway.docs.label')} description={t('nav.gateway.docs.boundary')}>
          <InlineNotice tone="warning" title={t('gateway.reserved.title')} detail={GATEWAY_RESERVED_ENDPOINTS.join(', ')} />
          <CommandButton icon={<Copy size={15} />} onClick={() => void navigator.clipboard?.writeText(chatCommand)}>{t('app.error.copy')}</CommandButton>
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="gateway" tab={activeTab}>
      <PageHeader
        eyebrow={endpointBase}
        title={t('gateway.overview.title')}
        description={activeTab.featureBoundary}
        status={<StatusPillLite label={snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')} state={snapshot.dashboard.gatewayStatus.running ? 'ready' : 'muted'} />}
        actions={<CommandButton variant={snapshot.dashboard.gatewayStatus.running ? 'danger' : 'primary'} icon={snapshot.dashboard.gatewayStatus.running ? <Power size={15} /> : <Play size={15} />} onClick={() => onAction(snapshot.dashboard.gatewayStatus.running ? t('gateway.toast.stopped') : t('gateway.toast.started'), () => api.toggleGateway(!snapshot.dashboard.gatewayStatus.enabled))}>{snapshot.dashboard.gatewayStatus.running ? t('gateway.stop') : t('gateway.start')}</CommandButton>}
      />
      <div className="tool-layout">
      <ConfigList title={t('gateway.overview.title')} description={activeTab.featureBoundary}>
        <section className="gateway-console">
          <div className="gateway-status-block">
            <span className="eyebrow">{t('nav.gateway.overview.label')}</span>
            <strong>{snapshot.dashboard.gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')}</strong>
            <small>{endpointBase}</small>
          </div>
        </section>
        <ToolSection title={t('gateway.docs.security')} description={t('gateway.overview.note', { host: snapshot.dashboard.gatewayStatus.bindHost, port: snapshot.dashboard.gatewayStatus.port })}>
          <div className="endpoint-list">
            {snapshot.dashboard.gatewayStatus.endpoints.map((endpoint) => (
              <code key={endpoint}>{endpoint}</code>
            ))}
          </div>
        </ToolSection>
      </ConfigList>
      <ConfigDetail title={t('gateway.defaultModel')} description={t('nav.gateway.overview.boundary')}>
        <DataRows
          rows={[
            { label: t('gateway.defaultModel'), value: defaultModel?.displayName ?? t('common.notConfigured') },
            { label: t('gateway.keyCount'), value: snapshot.gatewayKeys.length },
            { label: t('settings.about.bindHost'), value: endpointBase },
            { label: t('gateway.reserved.title'), value: GATEWAY_ENDPOINT.responses },
            { label: t('gateway.recentError'), value: snapshot.dashboard.gatewayStatus.recentError ?? t('common.none') },
          ]}
        />
      </ConfigDetail>
      </div>
    </TabPanel>
  );
}
