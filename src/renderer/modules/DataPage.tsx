import { useState } from 'react';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel } from './shared';

export function DataPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [manifestText, setManifestText] = useState(t('data.import.sampleManifest'));
  const latestReadyImport = snapshot.importExportResults.find((item) => item.action === 'import' && item.status === 'ready');
  const latestSnapshot = snapshot.importExportResults.find((item) => item.action === 'snapshot');

  if (activeTab.id === 'snapshots') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('data.snapshots.title')}</h2>
            <p>{t('data.snapshots.note')}</p>
            <div className="button-row">
              <button type="button" onClick={() => onAction(t('data.toast.snapshotCreated'), () => api.createSnapshot())}>
                {t('data.snapshots.create')}
              </button>
              <button type="button" disabled={!latestSnapshot} onClick={() => latestSnapshot && onAction(t('data.toast.restoreCreated'), () => api.restoreSnapshot(latestSnapshot.id))}>
                {t('data.snapshots.restore')}
              </button>
              <button type="button" disabled={!latestSnapshot} onClick={() => latestSnapshot && onAction(t('data.toast.rollbackApplied'), () => api.restoreSnapshot(latestSnapshot.id, { mode: 'rollback' }))}>
                {t('data.snapshots.rollback')}
              </button>
            </div>
          </div>
          <div className="panel">
            <h2>{t('data.snapshots.records')}</h2>
            <DataTable
              columns={[t('data.columns.action'), t('data.columns.status'), t('data.columns.summary'), t('data.columns.confirmation'), t('data.columns.redacted')]}
              rows={snapshot.importExportResults
                .filter((item) => item.action === 'snapshot' || item.summary.includes(t('data.restore.keyword')))
                .map((item) => [
                  item.action,
                  <StateBadge key={`${item.id}-status`} label={item.status} tone={item.status === 'failed' ? 'error' : item.status === 'ready' ? 'warning' : 'success'} />,
                  item.summary,
                  item.requiresConfirmation ? t('common.required') : t('common.no'),
                  item.redacted ? t('common.yes') : t('common.no'),
                ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'diagnostics') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('data.diagnostics.title')}</h2>
            <p>{t('data.diagnostics.note')}</p>
            <button type="button" className="primary-button" onClick={() => onAction(t('data.toast.diagnosticsExported'), () => api.exportDiagnostics())}>
              {t('data.diagnostics.export')}
            </button>
          </div>
          <div className="panel">
            <h2>{t('data.diagnostics.records')}</h2>
            <DataTable
              columns={[t('data.columns.action'), t('data.columns.status'), t('data.columns.summary'), t('data.columns.redacted'), t('data.columns.time')]}
              rows={snapshot.importExportResults
                .filter((item) => item.action === 'export')
                .map((item) => [
                  item.action,
                  <StateBadge key={`${item.id}-status`} label={item.status} tone={item.status === 'failed' ? 'error' : item.status === 'ready' ? 'warning' : 'success'} />,
                  item.summary,
                  item.redacted ? t('common.yes') : t('common.no'),
                  new Date(item.createdAt).toLocaleString(),
                ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'cleanup') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName={t('data.cleanup.feature')}
          why={t('data.cleanup.why')}
          dependency={t('data.cleanup.dependency')}
        />
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="data" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{t('data.import.title')}</h2>
            <p>{t('data.import.note')}</p>
          </div>
          <button type="button" className="primary-button" onClick={() => onAction(t('data.toast.importPreflighted'), () => api.validateImportManifest(manifestText))}>
            {t('data.import.preflight')}
          </button>
        </div>
        <div className="wizard-steps">
          {[
            t('data.import.steps.detect'),
            t('data.import.steps.preview'),
            t('data.import.steps.mapFields'),
            t('data.import.steps.conflictReview'),
            t('data.import.steps.secretHandling'),
            t('data.import.steps.confirm'),
            t('data.import.steps.result'),
          ].map((step, index) => (
            <span key={step}>{index + 1}. {step}</span>
          ))}
        </div>
        <textarea className="manifest-input" value={manifestText} onChange={(event) => setManifestText(event.target.value)} aria-label={t('data.import.aria')} />
        <p>{t('data.import.compatNote')}</p>
      </section>
      <section className="two-column">
        <div className="panel">
          <h2>{t('data.import.confirmTitle')}</h2>
          <div className="button-row">
            <button type="button" disabled={!latestReadyImport} onClick={() => latestReadyImport && onAction(t('data.toast.importApplied'), () => api.applyImportPlan(latestReadyImport.id, { mode: 'apply-metadata' }))}>
              {t('data.import.apply')}
            </button>
          </div>
          <p>{t('data.import.confirmNote')}</p>
        </div>
        <div className="panel">
          <h2>{t('data.import.records')}</h2>
          <DataTable
            columns={[t('data.columns.action'), t('data.columns.status'), t('data.columns.summary'), t('data.columns.conflicts'), t('data.columns.confirmation'), t('data.columns.redacted')]}
            rows={snapshot.importExportResults.filter((item) => item.action === 'import').map((item) => [
              item.action,
              <StateBadge key={`${item.id}-status`} label={item.status} tone={item.status === 'failed' ? 'error' : item.status === 'ready' ? 'warning' : 'success'} />,
              item.summary,
              item.conflictCount,
              item.requiresConfirmation ? t('common.required') : t('common.no'),
              item.redacted ? t('common.yes') : t('common.no'),
            ])}
          />
        </div>
      </section>
    </TabPanel>
  );
}
