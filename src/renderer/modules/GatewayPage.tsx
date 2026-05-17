import { Copy, KeyRound, Play, Power, RotateCcw, Save, ShieldAlert, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { GATEWAY_AVAILABLE_ENDPOINTS, GATEWAY_DEFAULT_KEY_POLICY, GATEWAY_ENDPOINT, GATEWAY_RESERVED_ENDPOINTS } from '../../shared/gatewayRuntime';
import { buildUsageTrend, type UsageTrendPoint } from '../../shared/observabilityRuntime';
import type { GatewayApiKey, UsageRecord } from '../../shared/types';
import { GATEWAY_DOCS, FORM_DEFAULTS } from '../../shared/uiCopy';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, CopyableCommand, DataRows, EmptyBlock, Field, InlineNotice, PageHeader, StatusPillLite, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { formatDate, getDefaultModel, healthState, statusLabel, TabPanel, type TabPageProps } from './shared';
import { useLocalPending } from './useLocalPending';

export function GatewayPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const defaultModel = getDefaultModel(snapshot);
  const [keyName, setKeyName] = useState<string>(FORM_DEFAULTS.gatewayKeyName);
  const [oneTimeKey, setOneTimeKey] = useState<string | null>(null);
  const pending = useLocalPending();
  const endpointBase = `${snapshot.dashboard.gatewayStatus.bindHost}:${snapshot.dashboard.gatewayStatus.port}`;
  const gatewayStatus = snapshot.dashboard.gatewayStatus;
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
              <GatewayKeyRow
                key={key.id}
                api={api}
                gatewayKey={key}
                pending={pending}
                onAction={onAction}
                onRotated={setOneTimeKey}
              />
            )) : <EmptyBlock title={t('common.notConfigured')} detail={t('gateway.keys.note')} />}
          </div>
        </ConfigList>
        <ConfigDetail title={t('gateway.docs.security')} description={t('nav.gateway.keys.boundary')}>
          <DataRows
            rows={[
            { label: t('gateway.keyCount'), value: snapshot.gatewayKeys.length },
            { label: t('gateway.scopes.aria'), value: GATEWAY_DEFAULT_KEY_POLICY.scopes.join(', ') },
            { label: t('gateway.keyPolicy.title'), value: `quota ${GATEWAY_DEFAULT_KEY_POLICY.quotaLimit} / rate ${GATEWAY_DEFAULT_KEY_POLICY.rateLimitPerMinute}/min` },
            { label: t('common.required'), value: t('gateway.oneTimeKey') },
            ]}
          />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'logs' || activeTab.id === 'usage') {
    const usageTrend = buildUsageTrend(snapshot.usageRecords, { bucketSize: 'day' });
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
          {activeTab.id === 'usage' ? <GatewayUsageTrendPanel usageRecords={snapshot.usageRecords} /> : null}
          <ActivityList empty={activeTab.id === 'usage' ? t('gateway.usage.empty') : t('app.recent.empty')} items={logItems} />
        </ConfigList>
        <ConfigDetail title={t('observability.usage.title')} description={t('gateway.overview.note', { host: snapshot.dashboard.gatewayStatus.bindHost, port: snapshot.dashboard.gatewayStatus.port })}>
          <InlineNotice tone="info" title={t('gateway.logs.depth')} detail={t('gateway.logs.depth.detail')} />
          <DataRows
            rows={[
              { label: t('observability.summary.requests'), value: usageTrend.totals.requestCount },
              { label: t('observability.summary.tokens'), value: usageTrend.totals.totalTokens },
              { label: t('gateway.usage.inputTokens'), value: usageTrend.totals.inputTokens },
              { label: t('gateway.usage.outputTokens'), value: usageTrend.totals.outputTokens },
              { label: t('gateway.recentError'), value: gatewayStatus.recentError ?? t('common.none') },
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
            <InlineNotice tone="info" title={t('gateway.chatNotRequired')} detail={t('gateway.chatNotRequired.detail')} />
            <div className="endpoint-list">
              {GATEWAY_AVAILABLE_ENDPOINTS.map((endpoint) => (
                <code key={endpoint}>{endpoint}</code>
              ))}
            </div>
          </ToolSection>
        </ConfigList>
        <ConfigDetail title={t('nav.gateway.docs.label')} description={t('nav.gateway.docs.boundary')}>
          <InlineNotice tone="warning" title={t('gateway.reserved.title')} detail={GATEWAY_RESERVED_ENDPOINTS.join(', ')} />
          <InlineNotice tone="info" title={t('gateway.alias.boundary')} detail={t('gateway.alias.boundary.detail')} />
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
        status={<StatusPillLite label={gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')} state={gatewayStatus.running ? 'ready' : gatewayStatus.listenerState === 'error' ? 'danger' : 'muted'} />}
        actions={<CommandButton variant={gatewayStatus.running ? 'danger' : 'primary'} icon={gatewayStatus.running ? <Power size={15} /> : <Play size={15} />} disabled={pending.isPending('gateway.toggle')} onClick={() => onAction(gatewayStatus.running ? t('gateway.toast.stopped') : t('gateway.toast.started'), () => pending.runPending('gateway.toggle', () => api.toggleGateway(!gatewayStatus.enabled)))}>{pending.isPending('gateway.toggle') ? t('app.status.busy') : gatewayStatus.running ? t('gateway.stop') : t('gateway.start')}</CommandButton>}
      />
      <div className="tool-layout">
      <ConfigList title={t('gateway.overview.title')} description={activeTab.featureBoundary}>
        <section className="gateway-console">
          {pending.isPending('gateway.toggle') ? <InlineNotice tone="info" title={t('app.status.busy')} detail={gatewayStatus.running ? t('gateway.stop') : t('gateway.start')} /> : null}
          {pending.errorFor('gateway.toggle') ? <InlineNotice tone="warning" title={t('app.action.failed')} detail={pending.errorFor('gateway.toggle')} /> : null}
          <div className="gateway-status-block">
            <span className="eyebrow">{t('nav.gateway.overview.label')}</span>
            <strong>{gatewayStatus.running ? t('shell.gateway.running') : t('shell.gateway.stopped')}</strong>
            <small>{endpointBase}</small>
          </div>
        </section>
        <ToolSection title={t('gateway.docs.security')} description={t('gateway.overview.note', { host: snapshot.dashboard.gatewayStatus.bindHost, port: snapshot.dashboard.gatewayStatus.port })}>
          <InlineNotice tone="info" title={t('gateway.chatNotRequired')} detail={t('gateway.chatNotRequired.detail')} />
          <div className="endpoint-list">
            {gatewayStatus.endpoints.map((endpoint) => (
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
            { label: t('gateway.listenerState'), value: gatewayStatus.listenerState },
            { label: t('settings.about.bindHost'), value: endpointBase },
            { label: t('gateway.reserved.title'), value: GATEWAY_ENDPOINT.responses },
            { label: t('gateway.recentError'), value: gatewayStatus.recentError ?? gatewayStatus.lastStartError ?? t('common.none') },
          ]}
        />
      </ConfigDetail>
      </div>
    </TabPanel>
  );
}

function GatewayUsageTrendPanel({ usageRecords }: { usageRecords: UsageRecord[] }) {
  const { t } = useI18n();
  const trend = buildUsageTrend(usageRecords, { bucketSize: 'day' });

  if (usageRecords.length === 0) {
    return (
      <ToolSection title={t('gateway.usage.trendTitle')} description={t('gateway.usage.trendSource')}>
        <EmptyBlock title={t('gateway.usage.empty')} detail={t('gateway.usage.empty.detail')} />
      </ToolSection>
    );
  }

  if (!trend.hasData) {
    return (
      <ToolSection title={t('gateway.usage.trendTitle')} description={t('gateway.usage.trendSource')}>
        <InlineNotice tone="warning" title={t('gateway.usage.noTokenData')} detail={t('gateway.usage.noTokenData.detail')} />
      </ToolSection>
    );
  }

  return (
    <ToolSection
      title={t('gateway.usage.trendTitle')}
      description={t('gateway.usage.trendSource')}
      actions={<StatusPillLite label={t('gateway.usage.bucket.day')} state="info" />}
    >
      <div className="usage-trend-panel" aria-label={t('gateway.usage.chart.aria')}>
        <UsageTrendChart points={trend.points} />
        <div className="usage-trend-legend">
          <span><i className="legend-input" />{t('gateway.usage.inputTokens')}</span>
          <span><i className="legend-output" />{t('gateway.usage.outputTokens')}</span>
          <span><TrendingUp size={14} />{t('gateway.usage.totalTokens')}</span>
          <span>{t('gateway.usage.requests', { count: trend.totals.requestCount })}</span>
        </div>
      </div>
    </ToolSection>
  );
}

function UsageTrendChart({ points }: { points: UsageTrendPoint[] }) {
  const chartPoints = points.length === 1
    ? [
        { ...points[0], bucketStart: points[0].bucketStart - 1 },
        points[0],
      ]
    : points;
  const maxTotal = Math.max(1, ...chartPoints.map((point) => point.totalTokens));
  const inputPath = buildTrendPath(chartPoints.map((point) => point.inputTokens), maxTotal);
  const outputPath = buildTrendPath(chartPoints.map((point) => point.outputTokens), maxTotal);
  const totalPath = buildTrendPath(chartPoints.map((point) => point.totalTokens), maxTotal);

  return (
    <svg className="usage-trend-chart" viewBox="0 0 320 148" role="img" aria-hidden="true" focusable="false">
      <line x1="20" y1="124" x2="306" y2="124" />
      <line x1="20" y1="18" x2="20" y2="124" />
      <path className="trend-total" d={totalPath} />
      <path className="trend-input" d={inputPath} />
      <path className="trend-output" d={outputPath} />
      {chartPoints.map((point, index) => {
        const x = chartX(index, chartPoints.length);
        const y = chartY(point.totalTokens, maxTotal);
        return <circle key={`${point.bucketStart}-${index}`} cx={x} cy={y} r="3" />;
      })}
    </svg>
  );
}

function buildTrendPath(values: number[], maxValue: number): string {
  return values
    .map((value, index) => `${index === 0 ? 'M' : 'L'} ${chartX(index, values.length)} ${chartY(value, maxValue)}`)
    .join(' ');
}

function chartX(index: number, count: number): number {
  if (count <= 1) {
    return 20;
  }
  return 20 + (286 * index) / (count - 1);
}

function chartY(value: number, maxValue: number): number {
  return 124 - (Math.max(0, value) / maxValue) * 106;
}

function GatewayKeyRow({
  gatewayKey,
  pending,
  api,
  onAction,
  onRotated,
}: {
  gatewayKey: GatewayApiKey;
  pending: ReturnType<typeof useLocalPending>;
  api: TabPageProps['api'];
  onAction: TabPageProps['onAction'];
  onRotated: (key: string) => void;
}) {
  const { t } = useI18n();
  const [quotaLimit, setQuotaLimit] = useState<string>(String(gatewayKey.quotaLimit ?? ''));
  const [rateLimit, setRateLimit] = useState<string>(String(gatewayKey.rateLimitPerMinute ?? ''));
  const quotaValue = quotaLimit.trim() ? Math.max(1, Number.parseInt(quotaLimit, 10)) : null;
  const rateValue = rateLimit.trim() ? Math.max(1, Number.parseInt(rateLimit, 10)) : null;
  const validPolicy = (quotaValue === null || Number.isFinite(quotaValue)) && (rateValue === null || Number.isFinite(rateValue));
  const policyKey = `gateway.key.policy.${gatewayKey.id}`;
  const toggleKey = `gateway.key.toggle.${gatewayKey.id}`;
  const rotateKey = `gateway.key.rotate.${gatewayKey.id}`;
  const revokeKey = `gateway.key.revoke.${gatewayKey.id}`;

  const savePolicy = () => api.updateGatewayKey({
    gatewayKeyId: gatewayKey.id,
    quotaLimit: quotaValue,
    rateLimitPerMinute: rateValue,
  });

  const toggleDisabled = () => api.updateGatewayKey({
    gatewayKeyId: gatewayKey.id,
    disabled: gatewayKey.state !== 'disabled',
  });

  return (
    <div className={`config-row ${gatewayKey.state === 'active' ? 'is-active' : ''}`}>
      <span>
        <strong>{gatewayKey.name}</strong>
        <small>{gatewayKey.keyPreview} / {gatewayKey.scopes.join(', ')} / quota {gatewayKey.quotaLimit ?? 'none'} / rate {gatewayKey.rateLimitPerMinute ?? 'none'}/min</small>
      </span>
      <span className="row-actions gateway-key-policy">
        <StatusPillLite label={statusLabel(gatewayKey.state, t)} state={healthState(gatewayKey.state)} />
        <label>
          <span>{t('gateway.quotaLimit')}</span>
          <input aria-label={`${t('gateway.quotaLimit')} ${gatewayKey.name}`} type="number" min={1} value={quotaLimit} onChange={(event) => setQuotaLimit(event.target.value)} />
        </label>
        <label>
          <span>{t('gateway.rateLimit')}</span>
          <input aria-label={`${t('gateway.rateLimit')} ${gatewayKey.name}`} type="number" min={1} value={rateLimit} onChange={(event) => setRateLimit(event.target.value)} />
        </label>
        <CommandButton icon={<Save size={14} />} disabled={!validPolicy || pending.isPending(policyKey)} onClick={() => onAction(t('gateway.toast.policyUpdated'), () => pending.runPending(policyKey, savePolicy))}>{pending.isPending(policyKey) ? t('app.status.busy') : t('common.saved')}</CommandButton>
        <CommandButton disabled={pending.isPending(toggleKey)} onClick={() => onAction(gatewayKey.state === 'disabled' ? t('gateway.toast.enabled') : t('gateway.toast.disabled'), () => pending.runPending(toggleKey, toggleDisabled))}>
          {pending.isPending(toggleKey) ? t('app.status.busy') : gatewayKey.state === 'disabled' ? t('gateway.enableKey') : t('gateway.disableKey')}
        </CommandButton>
        <CommandButton icon={<RotateCcw size={14} />} disabled={pending.isPending(rotateKey)} onClick={() => onAction(t('gateway.toast.rotated'), () => pending.runPending(rotateKey, async () => {
          const rotated = await api.rotateGatewayKey({ gatewayKeyId: gatewayKey.id });
          onRotated(rotated.key);
        }))}>{pending.isPending(rotateKey) ? t('app.status.busy') : t('gateway.rotate')}</CommandButton>
        <CommandButton variant="danger" icon={<ShieldAlert size={14} />} disabled={pending.isPending(revokeKey)} onClick={() => onAction(t('gateway.toast.revoked'), () => pending.runPending(revokeKey, () => api.revokeGatewayKey(gatewayKey.id)))}>{pending.isPending(revokeKey) ? t('app.status.busy') : t('gateway.revoke')}</CommandButton>
      </span>
      {[policyKey, toggleKey, rotateKey, revokeKey].map((key) => pending.errorFor(key) ? <InlineNotice key={key} tone="warning" title={t('app.action.failed')} detail={pending.errorFor(key)} /> : null)}
    </div>
  );
}
