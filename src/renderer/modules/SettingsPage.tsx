import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { UiPreferences } from '../../shared/types';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, Metric, StateBadge, TabPanel, statusLabel } from './shared';

export function SettingsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<UiPreferences>(snapshot.uiPreferences);
  const [auditQuery, setAuditQuery] = useState('');
  useEffect(() => setPrefs(snapshot.uiPreferences), [snapshot.uiPreferences]);

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

  return (
    <TabPanel moduleId="settings" tab={activeTab}>
      <section className="panel">
        <h2>{t('settings.preferences.title')}</h2>
        <div className="form-grid">
          <label>
            {t('settings.preferences.theme')}
            <select value={prefs.theme} onChange={(event) => setPrefs({ ...prefs, theme: event.target.value as UiPreferences['theme'] })}>
              <option value="system">{t('settings.preferences.theme.system')}</option>
              <option value="light">{t('settings.preferences.theme.light')}</option>
              <option value="dark">{t('settings.preferences.theme.dark')}</option>
            </select>
          </label>
          <label>
            {t('settings.preferences.density')}
            <select value={prefs.density} onChange={(event) => setPrefs({ ...prefs, density: event.target.value as UiPreferences['density'] })}>
              <option value="comfortable">{t('settings.preferences.density.comfortable')}</option>
              <option value="compact">{t('settings.preferences.density.compact')}</option>
            </select>
          </label>
          <label>
            {t('settings.preferences.font')}
            <select value={prefs.fontMode} onChange={(event) => setPrefs({ ...prefs, fontMode: event.target.value as UiPreferences['fontMode'] })}>
              <option value="system">{t('settings.preferences.font.system')}</option>
              <option value="kaiti">{t('settings.preferences.font.kaiti')}</option>
            </select>
          </label>
          <label>
            {t('settings.preferences.language')}
            <select value={prefs.language} onChange={(event) => setPrefs({ ...prefs, language: event.target.value as UiPreferences['language'] })}>
              <option value="zh-CN">{t('settings.preferences.language.zh')}</option>
              <option value="en-US">{t('settings.preferences.language.en')}</option>
            </select>
          </label>
          <label>
            {t('settings.preferences.motion')}
            <select value={prefs.reducedMotion ? 'reduced' : 'normal'} onChange={(event) => setPrefs({ ...prefs, reducedMotion: event.target.value === 'reduced' })}>
              <option value="normal">{t('settings.preferences.motion.normal')}</option>
              <option value="reduced">{t('settings.preferences.motion.reduced')}</option>
            </select>
          </label>
        </div>
        <button type="button" className="primary-button" onClick={() => onAction(t('settings.preferences.saved'), () => api.saveUiPreferences(prefs))}>
          {t('settings.preferences.save')}
        </button>
      </section>
    </TabPanel>
  );
}
