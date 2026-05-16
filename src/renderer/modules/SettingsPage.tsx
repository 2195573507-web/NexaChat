import { Activity, Download, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ObservabilityFeedbackLabel, ObservabilityPrivacySettings, UiPreferences } from '../../shared/types';
import { OBSERVABILITY_EXPORT_SCOPES, OBSERVABILITY_FEEDBACK_LABELS, OBSERVABILITY_RETENTION_POLICIES } from '../../shared/observabilityRuntime';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, DataRows, Field, InlineNotice, PageHeader, SettingRow, StatusPillLite, ToggleRow, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { formatDate, healthState, statusLabel, TabPanel, type TabPageProps } from './shared';

export function SettingsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<UiPreferences>(snapshot.uiPreferences);
  const [auditQuery, setAuditQuery] = useState('');
  const [feedbackLabel, setFeedbackLabel] = useState<ObservabilityFeedbackLabel>('bug');
  const [feedbackNotes, setFeedbackNotes] = useState(t('observability.feedback.defaultNote'));
  const [privacy, setPrivacy] = useState<ObservabilityPrivacySettings>(snapshot.observability.privacy);

  useEffect(() => setPrefs(snapshot.uiPreferences), [snapshot.uiPreferences]);
  useEffect(() => setPrivacy(snapshot.observability.privacy), [snapshot.observability.privacy]);

  if (activeTab.id === 'security') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PageHeader
          eyebrow={t('settings.security.permissions')}
          title={t('settings.security.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={statusLabel(snapshot.security.activeSession.state, t)} state={snapshot.security.deniedCount > 0 ? 'warning' : 'ready'} />}
          actions={<CommandButton icon={<ShieldCheck size={15} />} onClick={() => onAction(t('settings.audit.integrity'), () => api.verifyAuditIntegrity())}>{t('settings.audit.verify')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('settings.security.title')} description={activeTab.featureBoundary}>
          <section className="current-config-strip">
            <div><span className="eyebrow">{t('settings.security.localAdmin')}</span><strong>{snapshot.security.activeUser.displayName}</strong><small>{snapshot.security.activeRole.name}</small></div>
            <div><span className="eyebrow">{t('settings.security.denied')}</span><strong>{snapshot.security.deniedCount}</strong><small>{t('settings.security.permissions')}</small></div>
            <div><span className="eyebrow">{t('settings.audit.integrity')}</span><strong>{statusLabel(snapshot.auditIntegrity.status, t)}</strong><small>{snapshot.auditIntegrity.checkedCount}</small></div>
          </section>
          <DataRows rows={[
            { label: t('settings.security.session'), value: statusLabel(snapshot.security.activeSession.state, t) },
            { label: t('settings.security.role'), value: snapshot.security.roles.length },
            { label: t('settings.security.permissions'), value: snapshot.security.aclGrants.length },
          ]} />
        </ConfigList>
        <ConfigDetail title={t('settings.security.auditIntegrity')} description={t('nav.settings.security.boundary')}>
          <CommandButton icon={<ShieldCheck size={15} />} onClick={() => onAction(t('settings.audit.integrity'), () => api.verifyAuditIntegrity())}>{t('settings.audit.verify')}</CommandButton>
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'audit') {
    const visibleLogs = auditQuery.trim()
      ? snapshot.auditLogs.filter((log) => `${log.action} ${log.actor} ${log.targetType}`.toLowerCase().includes(auditQuery.trim().toLowerCase()))
      : snapshot.auditLogs;
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PageHeader
          eyebrow={t('settings.audit.integrity')}
          title={t('settings.audit.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={statusLabel(snapshot.auditIntegrity.status, t)} state={snapshot.auditIntegrity.status === 'verified' ? 'ready' : 'warning'} />}
          actions={<CommandButton icon={<Download size={15} />} onClick={() => onAction(t('settings.audit.exported'), () => api.exportAuditLogs())}>{t('settings.audit.export')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('settings.audit.title')} description={activeTab.featureBoundary}>
          <div className="form-stack">
            <Field label={t('settings.audit.search')}>
              <input value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} aria-label={t('settings.audit.search')} />
            </Field>
            <span className="row-actions">
              <CommandButton icon={<Activity size={15} />} onClick={() => onAction(t('settings.audit.integrity'), () => api.verifyAuditIntegrity())}>{t('settings.audit.verify')}</CommandButton>
            </span>
          </div>
          <ActivityList empty={t('app.recent.empty')} items={visibleLogs.slice(0, 14).map((log) => ({ title: log.action, meta: `${log.actor} / ${formatDate(log.createdAt, t)}`, state: healthState(log.integrityState) }))} />
        </ConfigList>
        <ConfigDetail title={t('settings.audit.integrity')} description={t('nav.settings.audit.boundary')}>
          <DataRows rows={[
            { label: t('observability.columns.status'), value: statusLabel(snapshot.auditIntegrity.status, t) },
            { label: t('settings.audit.integrity'), value: snapshot.auditIntegrity.checkedCount },
            { label: t('common.valueSeparator', { left: 'hash', right: 'entry' }), value: snapshot.auditIntegrity.lastHash ?? t('common.none') },
          ]} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'feedback') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PageHeader
          eyebrow={t('observability.feedback.label')}
          title={t('observability.feedback.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={snapshot.feedbackItems.length} state="info" />}
          actions={<CommandButton variant="primary" icon={<Save size={15} />} onClick={() => onAction(t('observability.feedback.created'), () => api.createFeedback({ label: feedbackLabel, notes: feedbackNotes }))}>{t('observability.feedback.create')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('observability.feedback.title')} description={activeTab.featureBoundary}>
          <ToolSection title={t('observability.feedback.create')} description={t('observability.feedback.note')}>
            <div className="form-stack">
              <Field label={t('observability.feedback.label')}>
                <select value={feedbackLabel} onChange={(event) => setFeedbackLabel(event.target.value as ObservabilityFeedbackLabel)}>
                  {OBSERVABILITY_FEEDBACK_LABELS.map((label) => <option key={label} value={label}>{label}</option>)}
                </select>
              </Field>
              <Field label={t('observability.feedback.notes')}>
                <textarea value={feedbackNotes} onChange={(event) => setFeedbackNotes(event.target.value)} aria-label={t('observability.feedback.notes')} />
              </Field>
            </div>
          </ToolSection>
          <ActivityList empty={t('app.recent.empty')} items={snapshot.feedbackItems.slice(0, 10).map((item) => ({ title: item.label, meta: item.notes, state: 'info' }))} />
        </ConfigList>
        <ConfigDetail title={t('observability.feedback.title')} description={t('nav.settings.feedback.boundary')}>
          <StatusPillLite label={snapshot.feedbackItems.length} state="info" />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'evals') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PageHeader
          eyebrow={t('observability.eval.results')}
          title={t('observability.eval.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={snapshot.evalResults.length} state="info" />}
          actions={<CommandButton icon={<Activity size={15} />} onClick={snapshot.evalSets[0] ? () => onAction(t('observability.eval.started'), () => api.runEvaluation({ evalSetId: snapshot.evalSets[0].id })) : undefined}>{t('observability.eval.run')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('observability.eval.title')} description={activeTab.featureBoundary}>
          <div className="config-items">
            {snapshot.evalSets.map((set) => (
              <div className="config-row" key={set.id}>
                <span><strong>{set.name}</strong><small>{set.description ?? set.prompt}</small></span>
                <CommandButton icon={<Activity size={14} />} onClick={() => onAction(t('observability.eval.started'), () => api.runEvaluation({ evalSetId: set.id }))}>{t('observability.eval.run')}</CommandButton>
              </div>
            ))}
          </div>
          <ActivityList empty={t('app.recent.empty')} items={snapshot.evalResults.slice(0, 8).map((result) => ({ title: statusLabel(result.status, t), meta: result.outputPreview ?? result.errorMessage, state: healthState(result.status) }))} />
        </ConfigList>
        <ConfigDetail title={t('observability.eval.results')} description={t('nav.settings.evals.boundary')}>
          <DataRows rows={[
            { label: t('common.completed'), value: snapshot.evalResults.filter((result) => result.status === 'completed').length },
            { label: t('common.failed'), value: snapshot.evalResults.filter((result) => result.status === 'failed').length },
          ]} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'observability') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PageHeader
          eyebrow={t('observability.privacy.localOnly')}
          title={t('observability.privacy.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={privacy.retentionPolicy} state="info" />}
          actions={<CommandButton variant="primary" icon={<Save size={15} />} onClick={() => onAction(t('observability.privacy.saved'), () => api.saveObservabilityPrivacy(privacy))}>{t('observability.privacy.save')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('observability.privacy.title')} description={activeTab.featureBoundary}>
          <SettingRow
            title={t('observability.privacy.retention')}
            control={<select value={privacy.retentionPolicy} onChange={(event) => setPrivacy({ ...privacy, retentionPolicy: event.target.value as typeof privacy.retentionPolicy })}>{OBSERVABILITY_RETENTION_POLICIES.map((policy) => <option value={policy} key={policy}>{policy}</option>)}</select>}
          />
          <SettingRow
            title={t('observability.privacy.exportScope')}
            control={<select value={privacy.exportScope} onChange={(event) => setPrivacy({ ...privacy, exportScope: event.target.value as typeof privacy.exportScope })}>{OBSERVABILITY_EXPORT_SCOPES.map((scope) => <option value={scope} key={scope}>{scope}</option>)}</select>}
          />
          <ToggleRow title={t('observability.privacy.includePromptSnippets')} checked={privacy.includePromptSnippets} onChange={(checked) => setPrivacy({ ...privacy, includePromptSnippets: checked })} />
          <ToggleRow title={t('observability.privacy.includeLocalPaths')} checked={privacy.includeLocalPaths} onChange={(checked) => setPrivacy({ ...privacy, includeLocalPaths: checked })} />
          <span className="row-actions">
            <CommandButton icon={<Download size={15} />} onClick={() => onAction(t('observability.export.created'), () => api.exportObservability())}>{t('observability.export.button')}</CommandButton>
          </span>
        </ConfigList>
        <ConfigDetail title={t('observability.privacy.localOnly')} description={t('nav.settings.observability.boundary')}>
          <DataRows rows={[
            { label: t('observability.summary.requests'), value: snapshot.observability.summary.requestCount },
            { label: t('observability.summary.tokens'), value: snapshot.observability.summary.inputTokens + snapshot.observability.summary.outputTokens },
            { label: t('observability.columns.failures'), value: snapshot.observability.summary.failedRequestCount },
          ]} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'about') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PageHeader
          eyebrow="NexaChat"
          title={t('settings.about.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={t('settings.about.versionValue')} state="info" />}
        />
        <div className="tool-layout">
        <ConfigList title={t('settings.about.title')} description={activeTab.featureBoundary}>
          <DataRows rows={[
            { label: t('settings.about.version'), value: t('settings.about.versionValue') },
            { label: t('settings.about.bindHost'), value: snapshot.dashboard.gatewayStatus.bindHost },
            { label: t('settings.about.gatewayPort'), value: snapshot.dashboard.gatewayStatus.port },
            { label: t('settings.about.dataLocation'), value: t('settings.about.dataLocationValue') },
          ]} />
        </ConfigList>
        <ConfigDetail title={t('settings.about.desktopEntry')} description={t('settings.about.desktopEntry.note')}>
          <InlineNotice tone="info" title={t('stage.environment-limited')} detail={t('nav.settings.about.boundary')} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="settings" tab={activeTab}>
      <PageHeader
        eyebrow={prefs.language}
        title={t('settings.preferences.title')}
        description={activeTab.featureBoundary}
        status={<StatusPillLite label={prefs.theme} state="info" />}
        actions={<CommandButton variant="primary" icon={<Save size={15} />} onClick={() => onAction(t('settings.preferences.saved'), () => api.saveUiPreferences(prefs))}>{t('settings.preferences.save')}</CommandButton>}
      />
      <div className="tool-layout">
      <ConfigList title={t('settings.preferences.title')} description={activeTab.featureBoundary}>
        <SettingRow
          title={t('settings.preferences.theme')}
          control={<select value={prefs.theme} onChange={(event) => setPrefs({ ...prefs, theme: event.target.value as UiPreferences['theme'] })} aria-label={t('settings.preferences.theme')}>
            <option value="system">{t('settings.preferences.theme.system')}</option>
            <option value="light">{t('settings.preferences.theme.light')}</option>
            <option value="dark">{t('settings.preferences.theme.dark')}</option>
          </select>}
        />
        <SettingRow
          title={t('settings.preferences.language')}
          control={<select value={prefs.language} onChange={(event) => setPrefs({ ...prefs, language: event.target.value as UiPreferences['language'] })} aria-label={t('settings.preferences.language')}>
            <option value="zh-CN">{t('settings.preferences.language.zh')}</option>
            <option value="en-US">{t('settings.preferences.language.en')}</option>
          </select>}
        />
        <SettingRow
          title={t('settings.preferences.density')}
          control={<select value={prefs.density} onChange={(event) => setPrefs({ ...prefs, density: event.target.value as UiPreferences['density'] })} aria-label={t('settings.preferences.density')}>
            <option value="comfortable">{t('settings.preferences.density.comfortable')}</option>
            <option value="compact">{t('settings.preferences.density.compact')}</option>
          </select>}
        />
        <SettingRow
          title={t('settings.preferences.motion')}
          control={<select value={prefs.reducedMotion ? 'reduced' : 'normal'} onChange={(event) => setPrefs({ ...prefs, reducedMotion: event.target.value === 'reduced' })} aria-label={t('settings.preferences.motion')}>
            <option value="normal">{t('settings.preferences.motion.normal')}</option>
            <option value="reduced">{t('settings.preferences.motion.reduced')}</option>
          </select>}
        />
        <ToggleRow
          title={t('settings.preferences.advancedMode')}
          description={t('settings.preferences.advancedMode.note')}
          checked={prefs.advancedMode}
          onChange={(checked) => setPrefs({ ...prefs, advancedMode: checked })}
        />
      </ConfigList>
      <ConfigDetail title={t('settings.preferences.title')} description={t('nav.settings.preferences.boundary')}>
        <StatusPillLite label={prefs.theme} state="info" />
        <StatusPillLite label={prefs.language} state="info" />
        <StatusPillLite label={prefs.advancedMode ? t('settings.preferences.advancedMode') : t('settings.preferences.ordinaryMode')} state="info" />
      </ConfigDetail>
      </div>
    </TabPanel>
  );
}
