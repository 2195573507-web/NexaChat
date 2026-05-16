import { useState } from 'react';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel } from './shared';
import { DATA_CONFIRMATION_PHRASES } from '../../shared/dataRuntime';

export function DataPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [manifestText, setManifestText] = useState(t('data.import.sampleManifest'));
  const [backupPassphrase, setBackupPassphrase] = useState('nexachat-backup');
  const [restorePassphrase, setRestorePassphrase] = useState('nexachat-backup');
  const [rollbackPhrase, setRollbackPhrase] = useState<string>(DATA_CONFIRMATION_PHRASES.rollback);
  const latestReadyImport = snapshot.importExportResults.find((item) => item.action === 'import' && item.status === 'ready');
  const latestBackup = snapshot.dataBackups[0];
  const latestRollback = snapshot.rollbackRecords.find((record) => record.state === 'available');

  if (activeTab.id === 'backup') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('data.backup.title')}</h2>
            <p>{t('data.backup.note')}</p>
            <input
              aria-label={t('data.backup.passphrase')}
              value={backupPassphrase}
              onChange={(event) => setBackupPassphrase(event.target.value)}
            />
            <div className="button-row">
              <button type="button" onClick={() => onAction(t('data.toast.snapshotCreated'), () => api.createSnapshot())}>
                {t('data.snapshots.create')}
              </button>
              <button type="button" onClick={() => onAction(t('data.toast.exportCreated'), () => api.exportDataPackage({ profile: 'metadata-redacted' }))}>
                {t('data.export.create')}
              </button>
              <button type="button" onClick={() => onAction(t('data.toast.backupCreated'), () => api.createEncryptedBackup({ passphrase: backupPassphrase, profile: 'encrypted-full' }))}>
                {t('data.backup.create')}
              </button>
            </div>
          </div>
          <div className="panel">
            <h2>{t('data.backup.records')}</h2>
            <DataTable
              columns={[t('data.columns.action'), t('data.columns.status'), t('data.columns.profile'), t('data.columns.encrypted'), t('data.columns.hash')]}
              rows={snapshot.dataMobilityJobs
                .filter((item) => item.operationKind === 'snapshot' || item.operationKind === 'export' || item.operationKind === 'encrypted-backup')
                .map((item) => [
                  item.operationKind,
                  <StateBadge key={`${item.id}-status`} label={item.status} tone={item.status === 'failed' ? 'error' : item.status === 'ready' ? 'warning' : 'success'} />,
                  item.profile ?? '-',
                  item.encrypted ? t('common.yes') : t('common.no'),
                  item.manifestHash ? <code key={`${item.id}-hash`}>{item.manifestHash.slice(0, 12)}</code> : '-',
                ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'restore') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('data.restore.title')}</h2>
            <p>{t('data.restore.note')}</p>
            <input
              aria-label={t('data.restore.passphrase')}
              value={restorePassphrase}
              onChange={(event) => setRestorePassphrase(event.target.value)}
            />
            <button
              type="button"
              className="primary-button"
              disabled={!latestBackup}
              onClick={() => latestBackup && onAction(t('data.toast.restoreCreated'), () => api.createRestorePreflight({ backupId: latestBackup.id, passphrase: restorePassphrase }))}
            >
              {t('data.restore.preflight')}
            </button>
          </div>
          <div className="panel">
            <h2>{t('data.restore.records')}</h2>
            <DataTable
              columns={[t('data.columns.action'), t('data.columns.status'), t('data.columns.summary'), t('data.columns.conflicts'), t('data.columns.confirmation'), t('data.columns.encrypted')]}
              rows={snapshot.dataMobilityJobs
                .filter((item) => item.operationKind === 'restore-preflight')
                .map((item) => [
                  item.operationKind,
                  <StateBadge key={`${item.id}-status`} label={item.status} tone={item.status === 'failed' ? 'error' : item.status === 'ready' ? 'warning' : 'success'} />,
                  item.summary,
                  item.conflictCount,
                  item.requiresConfirmation ? t('common.required') : t('common.no'),
                  item.encrypted ? t('common.yes') : t('common.no'),
                ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'rollback') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('data.rollback.title')}</h2>
            <p>{t('data.rollback.note')}</p>
            <input
              aria-label={t('data.rollback.confirmPhrase')}
              value={rollbackPhrase}
              onChange={(event) => setRollbackPhrase(event.target.value)}
            />
            <button
              type="button"
              className="primary-button"
              disabled={!latestRollback}
              onClick={() => latestRollback && onAction(t('data.toast.rollbackApplied'), () => api.applyDataRollback({ rollbackId: latestRollback.id, confirmationPhrase: rollbackPhrase }))}
            >
              {t('data.rollback.apply')}
            </button>
          </div>
          <div className="panel">
            <h2>{t('data.rollback.records')}</h2>
            <DataTable
              columns={[t('data.columns.status'), t('data.columns.summary'), t('data.columns.rollbackState'), t('data.columns.time')]}
              rows={snapshot.rollbackRecords.map((record) => {
                const job = snapshot.dataMobilityJobs.find((item) => item.id === record.jobId);
                return [
                  record.state,
                  job?.summary ?? record.jobId,
                  record.rollbackSnapshotId ?? '-',
                  new Date(record.createdAt).toLocaleString(),
                ];
              })}
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
            <button type="button" disabled={!latestReadyImport} onClick={() => latestReadyImport && onAction(t('data.toast.importApplied'), () => api.applyImportPlan(latestReadyImport.id, { mode: 'apply-metadata', conflictStrategy: 'import-as-new', confirmationPhrase: DATA_CONFIRMATION_PHRASES.applyImport }))}>
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
        <div className="panel">
          <h2>{t('data.conflicts.title')}</h2>
          <DataTable
            columns={[t('data.columns.action'), t('data.columns.conflictType'), t('data.columns.strategy'), t('data.columns.summary')]}
            rows={snapshot.dataConflicts.map((conflict) => [
              conflict.entityKind,
              conflict.type,
              conflict.strategy,
              conflict.importName,
            ])}
          />
        </div>
      </section>
    </TabPanel>
  );
}
