import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { ObservabilityFeedbackLabel, UiPreferences } from '../../shared/types';
import { FormField, SettingsRow } from '../components/ui';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, Metric, StateBadge, TabPanel, statusLabel } from './shared';

export function SettingsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<UiPreferences>(snapshot.uiPreferences);
  const [auditQuery, setAuditQuery] = useState('');
  const [feedbackLabel, setFeedbackLabel] = useState<ObservabilityFeedbackLabel>('bug');
  const [feedbackNotes, setFeedbackNotes] = useState(t('observability.feedback.defaultNote'));
  const [privacy, setPrivacy] = useState(snapshot.observability.privacy);
  useEffect(() => setPrefs(snapshot.uiPreferences), [snapshot.uiPreferences]);
  useEffect(() => setPrivacy(snapshot.observability.privacy), [snapshot.observability.privacy]);

  if (activeTab.id === 'security') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="summary-grid">
          <Metric title={t('settings.security.session')} value={statusLabel(snapshot.security.activeSession.state, t)} detail={snapshot.security.activeUser.displayName} />
          <Metric title={t('settings.security.role')} value={snapshot.security.activeRole.name} detail={snapshot.security.activeRole.description} />
          <Metric title={t('settings.security.permissions')} value={snapshot.security.activeRole.permissionKeys.length} detail={t('settings.security.permissions.note')} />
          <Metric title={t('settings.security.denied')} value={snapshot.security.deniedCount} detail={t('settings.security.denied.note')} />
        </section>
        <section className="two-column">
          <div className="panel">
            <h2>{t('settings.security.title')}</h2>
            <p>{t('settings.security.note')}</p>
            <dl className="detail-list">
              <div><dt>{t('settings.security.preload')}</dt><dd>{t('settings.security.preload.note')}</dd></div>
              <div><dt>{t('settings.security.providerKey')}</dt><dd>{t('settings.security.providerKey.note')}</dd></div>
              <div><dt>{t('settings.security.gatewayKey')}</dt><dd>{t('settings.security.gatewayKey.note')}</dd></div>
              <div><dt>{t('settings.security.logRedaction')}</dt><dd>{t('settings.security.logRedaction.note')}</dd></div>
            </dl>
          </div>
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>{t('settings.security.auditIntegrity')}</h2>
                <p>{t('settings.security.auditIntegrity.note')}</p>
              </div>
              <StateBadge label={statusLabel(snapshot.auditIntegrity.status, t)} tone={snapshot.auditIntegrity.status === 'verified' ? 'success' : snapshot.auditIntegrity.status === 'empty' ? 'muted' : 'error'} />
            </div>
            <dl className="detail-list">
              <div><dt>{t('settings.audit.integrity')}</dt><dd>{t('settings.audit.integrity.checked', { count: snapshot.auditIntegrity.checkedCount, status: snapshot.auditIntegrity.status })}</dd></div>
              <div><dt>{t('settings.columns.hash')}</dt><dd><code>{snapshot.auditIntegrity.lastHash ?? '-'}</code></dd></div>
            </dl>
            <div className="button-row">
              <button type="button" onClick={() => onAction(t('settings.audit.verify'), () => api.verifyAuditIntegrity())}>
                <ShieldCheck size={16} /> {t('settings.audit.verify')}
              </button>
              <button type="button" onClick={() => onAction(t('settings.audit.exported'), () => api.exportAuditLogs())}>
                {t('settings.audit.export')}
              </button>
            </div>
          </div>
          <div className="panel">
            <h2>{t('settings.security.keyStatus')}</h2>
            <DataTable
              columns={[t('settings.security.gatewayKey'), t('settings.columns.preview'), t('gateway.columns.scopes'), t('settings.columns.revoked')]}
              rows={snapshot.gatewayKeys.map((key) => [key.name, key.keyPreview, key.scopes.join(', '), key.revokedAt ? t('common.yes') : t('common.no')])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'audit') {
    const visibleLogs = auditQuery.trim()
      ? snapshot.auditLogs.filter((log) => JSON.stringify(log).toLowerCase().includes(auditQuery.trim().toLowerCase()))
      : snapshot.auditLogs;
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{t('settings.audit.title')}</h2>
              <p>{t('settings.audit.integrity.checked', { count: snapshot.auditIntegrity.checkedCount, status: snapshot.auditIntegrity.status })}</p>
            </div>
            <StateBadge label={statusLabel(snapshot.auditIntegrity.status, t)} tone={snapshot.auditIntegrity.status === 'verified' ? 'success' : snapshot.auditIntegrity.status === 'empty' ? 'muted' : 'error'} />
          </div>
          <div className="button-row">
            <input
              aria-label={t('settings.audit.search')}
              placeholder={t('settings.audit.search.placeholder')}
              value={auditQuery}
              onChange={(event) => setAuditQuery(event.target.value)}
            />
            <button type="button" onClick={() => onAction(t('settings.audit.verify'), () => api.verifyAuditIntegrity())}>{t('settings.audit.verify')}</button>
            <button type="button" onClick={() => onAction(t('settings.audit.exported'), () => api.exportAuditLogs())}>{t('settings.audit.export')}</button>
          </div>
          <DataTable
            columns={[t('settings.columns.action'), t('settings.columns.target'), t('settings.columns.permission'), t('settings.columns.hash'), t('settings.columns.time')]}
            rows={visibleLogs.map((log) => [
              log.action,
              `${log.targetType}:${log.targetId ?? '-'}`,
              log.permissionKey ?? '-',
              log.entryHash ? <code key={`${log.id}-hash`}>{log.entryHash.slice(0, 12)}</code> : '-',
              new Date(log.createdAt).toLocaleString(),
            ])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'about') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('settings.about.title')}</h2>
            <dl className="detail-list">
              <div><dt>{t('settings.about.version')}</dt><dd>{t('settings.about.versionValue')}</dd></div>
              <div><dt>{t('settings.about.gatewayPort')}</dt><dd>{snapshot.dashboard.gatewayStatus.port}</dd></div>
              <div><dt>{t('settings.about.bindHost')}</dt><dd>{snapshot.dashboard.gatewayStatus.bindHost}</dd></div>
              <div><dt>{t('settings.about.dataLocation')}</dt><dd>{t('settings.about.dataLocationValue')}</dd></div>
              <div><dt>{t('settings.about.desktopEntry')}</dt><dd>{t('settings.about.desktopEntry.note')}</dd></div>
            </dl>
          </div>
          <div className="panel">
            <h2>{t('settings.environment.title')}</h2>
            <DataTable
              columns={[t('settings.environment.columns.capability'), t('settings.environment.columns.status'), t('settings.environment.columns.note')]}
              rows={[
                [t('settings.environment.providerInference'), <StateBadge key="provider" label={t('common.notOpen')} tone="warning" />, t('settings.environment.providerInference.note')],
                [t('settings.environment.fullRag'), <StateBadge key="rag" label={t('stage.environment-limited')} tone="warning" />, t('settings.environment.fullRag.note')],
                [t('settings.environment.mcpAgent'), <StateBadge key="agent" label={t('common.notOpen')} tone="warning" />, t('settings.environment.mcpAgent.note')],
                [t('settings.environment.installer'), <StateBadge key="installer" label={t('common.notConfigured')} tone="muted" />, t('settings.environment.installer.note')],
              ]}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'feedback') {
    const latestRequest = snapshot.observability.requestLogs[0];
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('observability.feedback.title')}</h2>
            <p>{t('observability.feedback.note')}</p>
            <div className="form-grid">
              <FormField label={t('observability.feedback.label')}>
                <select value={feedbackLabel} onChange={(event) => setFeedbackLabel(event.target.value as ObservabilityFeedbackLabel)}>
                  <option value="thumbs_up">{t('observability.feedback.thumbs_up')}</option>
                  <option value="thumbs_down">{t('observability.feedback.thumbs_down')}</option>
                  <option value="bug">{t('observability.feedback.bug')}</option>
                  <option value="unsafe">{t('observability.feedback.unsafe')}</option>
                  <option value="other">{t('observability.feedback.other')}</option>
                </select>
              </FormField>
              <FormField label={t('observability.feedback.notes')}>
                <textarea value={feedbackNotes} onChange={(event) => setFeedbackNotes(event.target.value)} />
              </FormField>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                onAction(t('observability.feedback.created'), () =>
                  api.createFeedback({
                    label: feedbackLabel,
                    requestLogId: latestRequest?.id ?? null,
                    notes: feedbackNotes,
                  }),
                )
              }
            >
              {t('observability.feedback.create')}
            </button>
          </div>
          <div className="panel">
            <h2>{t('observability.feedback.history')}</h2>
            <DataTable
              columns={[t('observability.columns.label'), t('gateway.columns.request'), t('settings.columns.details'), t('gateway.columns.time')]}
              rows={snapshot.observability.feedbackItems.map((item) => [
                t(`observability.feedback.${item.label}`),
                item.requestLogId ?? '-',
                item.notes ?? '-',
                new Date(item.createdAt).toLocaleString(),
              ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'evals') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('observability.eval.title')}</h2>
            <p>{t('observability.eval.note')}</p>
            <DataTable
              columns={[t('gateway.columns.name'), t('settings.columns.details'), t('gateway.columns.status'), t('gateway.columns.actions')]}
              rows={snapshot.observability.evalSets.map((evalSet) => [
                evalSet.name,
                evalSet.description ?? '-',
                <StateBadge key={`${evalSet.id}-status`} label={statusLabel(evalSet.status, t)} tone={evalSet.status === 'completed' ? 'success' : evalSet.status === 'failed' ? 'error' : 'warning'} />,
                <button type="button" key={evalSet.id} onClick={() => onAction(t('observability.eval.started'), () => api.runEvaluation({ evalSetId: evalSet.id }))}>
                  {t('observability.eval.run')}
                </button>,
              ])}
            />
          </div>
          <div className="panel">
            <h2>{t('observability.eval.results')}</h2>
            <DataTable
              columns={[t('gateway.columns.status'), t('observability.columns.score'), t('gateway.columns.model'), t('gateway.columns.latency'), t('gateway.columns.error')]}
              rows={snapshot.observability.evalResults.map((result) => [
                <StateBadge key={`${result.id}-status`} label={statusLabel(result.status, t)} tone={result.status === 'completed' ? 'success' : result.status === 'failed' ? 'error' : 'warning'} />,
                result.score ?? '-',
                snapshot.models.find((model) => model.id === result.modelId)?.displayName ?? result.modelId ?? '-',
                result.latencyMs ?? '-',
                result.errorMessage ?? result.outputPreview ?? '-',
              ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'observability') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('observability.privacy.title')}</h2>
            <p>{t('observability.privacy.note')}</p>
            <div className="form-grid">
              <FormField label={t('observability.privacy.retention')}>
                <select value={privacy.retentionPolicy} onChange={(event) => setPrivacy({ ...privacy, retentionPolicy: event.target.value as typeof privacy.retentionPolicy })}>
                  <option value="seven_days">{t('observability.privacy.retention.seven_days')}</option>
                  <option value="thirty_days">{t('observability.privacy.retention.thirty_days')}</option>
                  <option value="ninety_days">{t('observability.privacy.retention.ninety_days')}</option>
                  <option value="forever">{t('observability.privacy.retention.forever')}</option>
                </select>
              </FormField>
              <FormField label={t('observability.privacy.exportScope')}>
                <select value={privacy.exportScope} onChange={(event) => setPrivacy({ ...privacy, exportScope: event.target.value as typeof privacy.exportScope })}>
                  <option value="summary">{t('observability.privacy.exportScope.summary')}</option>
                  <option value="redacted_details">{t('observability.privacy.exportScope.redacted_details')}</option>
                </select>
              </FormField>
              <label className="checkbox-row">
                <input type="checkbox" checked={privacy.includePromptSnippets} onChange={(event) => setPrivacy({ ...privacy, includePromptSnippets: event.target.checked })} />
                {t('observability.privacy.includePromptSnippets')}
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={privacy.includeLocalPaths} onChange={(event) => setPrivacy({ ...privacy, includeLocalPaths: event.target.checked })} />
                {t('observability.privacy.includeLocalPaths')}
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="primary-button" onClick={() => onAction(t('observability.privacy.saved'), () => api.saveObservabilityPrivacy(privacy))}>
                {t('observability.privacy.save')}
              </button>
              <button type="button" onClick={() => onAction(t('observability.export.created'), () => api.exportObservability())}>
                {t('observability.export.button')}
              </button>
            </div>
          </div>
          <div className="panel">
            <h2>{t('observability.privacy.localOnly')}</h2>
            <dl className="detail-list">
              <div><dt>{t('observability.privacy.cloudTelemetry')}</dt><dd>{privacy.cloudTelemetryEnabled ? t('common.yes') : t('common.no')}</dd></div>
              <div><dt>{t('observability.summary.requests')}</dt><dd>{snapshot.observability.summary.requestCount}</dd></div>
              <div><dt>{t('observability.summary.feedbackEval')}</dt><dd>{snapshot.observability.summary.feedbackCount + snapshot.observability.summary.evalResultCount}</dd></div>
              <div><dt>{t('settings.columns.time')}</dt><dd>{new Date(privacy.updatedAt).toLocaleString()}</dd></div>
            </dl>
          </div>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="settings" tab={activeTab}>
      <section className="panel">
        <h2>{t('settings.preferences.title')}</h2>
        <div className="form-grid">
          <SettingsRow label={t('settings.preferences.theme')} control={<select aria-label={t('settings.preferences.theme')} value={prefs.theme} onChange={(event) => setPrefs({ ...prefs, theme: event.target.value as UiPreferences['theme'] })}>
            <option value="system">{t('settings.preferences.theme.system')}</option>
            <option value="light">{t('settings.preferences.theme.light')}</option>
            <option value="dark">{t('settings.preferences.theme.dark')}</option>
          </select>} />
          <SettingsRow label={t('settings.preferences.density')} control={<select aria-label={t('settings.preferences.density')} value={prefs.density} onChange={(event) => setPrefs({ ...prefs, density: event.target.value as UiPreferences['density'] })}>
            <option value="comfortable">{t('settings.preferences.density.comfortable')}</option>
            <option value="compact">{t('settings.preferences.density.compact')}</option>
          </select>} />
          <SettingsRow label={t('settings.preferences.font')} control={<select aria-label={t('settings.preferences.font')} value={prefs.fontMode} onChange={(event) => setPrefs({ ...prefs, fontMode: event.target.value as UiPreferences['fontMode'] })}>
            <option value="system">{t('settings.preferences.font.system')}</option>
            <option value="kaiti">{t('settings.preferences.font.kaiti')}</option>
          </select>} />
          <SettingsRow label={t('settings.preferences.language')} control={<select aria-label={t('settings.preferences.language')} value={prefs.language} onChange={(event) => setPrefs({ ...prefs, language: event.target.value as UiPreferences['language'] })}>
            <option value="zh-CN">{t('settings.preferences.language.zh')}</option>
            <option value="en-US">{t('settings.preferences.language.en')}</option>
          </select>} />
          <SettingsRow label={t('settings.preferences.motion')} control={<select aria-label={t('settings.preferences.motion')} value={prefs.reducedMotion ? 'reduced' : 'normal'} onChange={(event) => setPrefs({ ...prefs, reducedMotion: event.target.value === 'reduced' })}>
            <option value="normal">{t('settings.preferences.motion.normal')}</option>
            <option value="reduced">{t('settings.preferences.motion.reduced')}</option>
          </select>} />
        </div>
        <button type="button" className="primary-button" onClick={() => onAction(t('settings.preferences.saved'), () => api.saveUiPreferences(prefs))}>
          {t('settings.preferences.save')}
        </button>
      </section>
    </TabPanel>
  );
}
