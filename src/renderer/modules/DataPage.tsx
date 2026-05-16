import { Archive, DatabaseBackup, FileCheck, RotateCcw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { DATA_CONFIRMATION_PHRASES, DATA_WIZARD_STEPS } from '../../shared/dataRuntime';
import { FORM_DEFAULTS } from '../../shared/uiCopy';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, CopyableCommand, DataRows, EmptyBlock, Field, InlineNotice, StatusPillLite, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { formatDate, healthState, statusLabel, TabPanel, type TabPageProps } from './shared';

export function DataPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [manifestText, setManifestText] = useState<string>(FORM_DEFAULTS.dataImportManifest);
  const [backupPassphrase, setBackupPassphrase] = useState<string>(FORM_DEFAULTS.backupPassphrase);
  const [restorePassphrase, setRestorePassphrase] = useState<string>(FORM_DEFAULTS.restorePassphrase);
  const [rollbackPhrase, setRollbackPhrase] = useState<string>(FORM_DEFAULTS.rollbackPhrase);
  const latestReadyImport = snapshot.importExportResults.find((result) => result.action === 'import' && result.status === 'ready');
  const latestBackup = snapshot.dataBackups[0];
  const rollback = snapshot.rollbackRecords.find((record) => record.state === 'available') ?? snapshot.rollbackRecords[0];

  if (activeTab.id === 'backup') {
    return (
      <TabPanel moduleId="data" tab={activeTab} className="tool-layout">
        <ConfigList title={t('data.backup.title')} description={activeTab.featureBoundary}>
          <ToolSection title={t('data.backup.create')} description={t('data.backup.note')}>
            <div className="form-stack">
              <Field label={t('data.backup.passphrase')}>
                <input value={backupPassphrase} onChange={(event) => setBackupPassphrase(event.target.value)} type="password" />
              </Field>
              <CommandButton variant="primary" icon={<Archive size={15} />} disabled={!backupPassphrase} onClick={() => onAction(t('data.toast.backupCreated'), () => api.createEncryptedBackup({ profile: 'encrypted-full', passphrase: backupPassphrase }))}>
                {t('data.backup.create')}
              </CommandButton>
            </div>
          </ToolSection>
          <ActivityList
            empty={t('shared.empty.reason')}
            items={snapshot.dataBackups.slice(0, 8).map((backup) => ({
              title: backup.profile,
              meta: `${backup.manifestHash.slice(0, 12)} / ${formatDate(backup.createdAt, t)}`,
              state: backup.encrypted ? 'ready' : 'warning',
            }))}
          />
        </ConfigList>
        <ConfigDetail title={t('data.export.create')} description={t('nav.data.backup.boundary')}>
          <CommandButton icon={<DatabaseBackup size={15} />} onClick={() => onAction(t('data.toast.exportCreated'), () => api.exportDataPackage({ profile: 'metadata-redacted' }))}>{t('data.export.create')}</CommandButton>
          <DataRows rows={[
            { label: t('data.backup.records'), value: latestBackup?.profile ?? t('common.none') },
            { label: t('data.backup.passphrase'), value: latestBackup?.encrypted ? t('common.yes') : t('common.no') },
          ]} />
        </ConfigDetail>
      </TabPanel>
    );
  }

  if (activeTab.id === 'restore') {
    return (
      <TabPanel moduleId="data" tab={activeTab} className="tool-layout">
        <ConfigList title={t('data.restore.title')} description={activeTab.featureBoundary}>
          <ToolSection title={t('data.restore.preflight')} description={t('data.restore.note')}>
            <div className="form-stack">
              <Field label={t('data.restore.passphrase')}>
                <input value={restorePassphrase} onChange={(event) => setRestorePassphrase(event.target.value)} type="password" />
              </Field>
              <CommandButton variant="primary" icon={<FileCheck size={15} />} disabled={!latestBackup || !restorePassphrase} onClick={() => onAction(t('data.toast.restoreCreated'), () => api.createRestorePreflight({ backupId: latestBackup?.id, passphrase: restorePassphrase }))}>
                {t('data.restore.preflight')}
              </CommandButton>
            </div>
          </ToolSection>
          <JobList snapshot={snapshot} />
        </ConfigList>
        <ConfigDetail title={t('data.conflicts.title')} description={t('nav.data.restore.boundary')}>
          <ActivityList empty={t('shared.empty.reason')} items={snapshot.dataConflicts.slice(0, 8).map((conflict) => ({ title: conflict.importName, meta: conflict.type, state: conflict.resolved ? 'ready' : 'warning' }))} />
        </ConfigDetail>
      </TabPanel>
    );
  }

  if (activeTab.id === 'rollback') {
    return (
      <TabPanel moduleId="data" tab={activeTab} className="tool-layout">
        <ConfigList title={t('data.rollback.title')} description={activeTab.featureBoundary}>
          <InlineNotice tone="warning" title={t('common.required')} detail={DATA_CONFIRMATION_PHRASES.rollback} />
          <div className="form-stack">
            <Field label={t('data.rollback.confirmPhrase')}>
              <input value={rollbackPhrase} onChange={(event) => setRollbackPhrase(event.target.value)} />
            </Field>
            <CommandButton variant="danger" icon={<RotateCcw size={15} />} disabled={!rollback || rollbackPhrase !== DATA_CONFIRMATION_PHRASES.rollback} onClick={() => onAction(t('data.toast.rollbackApplied'), () => api.applyDataRollback({ rollbackId: rollback?.id ?? '', confirmationPhrase: rollbackPhrase }))}>
              {t('data.rollback.apply')}
            </CommandButton>
          </div>
          <ActivityList empty={t('shared.empty.reason')} items={snapshot.rollbackRecords.map((record) => ({ title: record.id, meta: statusLabel(record.state, t), state: healthState(record.state) }))} />
        </ConfigList>
        <ConfigDetail title={t('data.rollback.title')} description={t('nav.data.rollback.boundary')}>
          <DataRows rows={[
            { label: t('common.available'), value: snapshot.rollbackRecords.filter((record) => record.state === 'available').length },
            { label: t('common.completed'), value: snapshot.rollbackRecords.filter((record) => record.state === 'applied').length },
          ]} />
        </ConfigDetail>
      </TabPanel>
    );
  }

  if (activeTab.id === 'diagnostics' || activeTab.id === 'cleanup') {
    return (
      <TabPanel moduleId="data" tab={activeTab} className="tool-layout">
        <ConfigList title={activeTab.label} description={activeTab.featureBoundary}>
          <CommandButton variant="primary" icon={<ShieldAlert size={15} />} onClick={() => onAction(t('data.toast.diagnosticsExported'), () => api.exportDiagnostics())}>
            {t('data.diagnostics.export')}
          </CommandButton>
          <JobList snapshot={snapshot} />
        </ConfigList>
        <ConfigDetail title={t('stage.environment-limited')} description={t('nav.data.cleanup.boundary')}>
          <InlineNotice tone="warning" title={t('stage.environment-limited')} detail={activeTab.featureBoundary} />
        </ConfigDetail>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="data" tab={activeTab} className="tool-layout">
      <ConfigList title={t('data.import.title')} description={activeTab.featureBoundary}>
        <ToolSection title={t('data.import.preflight')} description={t('data.import.note')}>
          <div className="wizard-steps">
            {DATA_WIZARD_STEPS.map((step) => <span key={step}>{step}</span>)}
          </div>
          <div className="form-stack">
            <Field label={t('data.import.aria')}>
              <textarea value={manifestText} onChange={(event) => setManifestText(event.target.value)} aria-label={t('data.import.aria')} />
            </Field>
            <span className="row-actions">
              <CommandButton variant="primary" icon={<FileCheck size={15} />} disabled={!manifestText.trim()} onClick={() => onAction(t('data.toast.importPreflighted'), () => api.validateImportManifest(manifestText))}>
                {t('data.import.preflight')}
              </CommandButton>
              <CommandButton icon={<DatabaseBackup size={15} />} disabled={!latestReadyImport} onClick={() => onAction(t('data.toast.importApplied'), () => api.applyImportPlan(latestReadyImport?.id ?? '', { mode: 'apply-metadata', confirmationPhrase: DATA_CONFIRMATION_PHRASES.applyImport }))}>
                {t('data.import.apply')}
              </CommandButton>
            </span>
          </div>
        </ToolSection>
        <JobList snapshot={snapshot} />
      </ConfigList>
      <ConfigDetail title={t('data.import.title')} description={t('nav.data.import.boundary')}>
        <CopyableCommand value={DATA_CONFIRMATION_PHRASES.applyImport} label={t('gateway.copy')} />
        <DataRows rows={[
          { label: t('data.conflicts.title'), value: snapshot.dataConflicts.length },
          { label: t('data.backup.title'), value: snapshot.dataBackups.length },
          { label: t('data.migration.summary.round12'), value: snapshot.migrationRuns[0]?.status ?? t('common.none') },
        ]} />
      </ConfigDetail>
    </TabPanel>
  );
}

function JobList({ snapshot }: { snapshot: TabPageProps['snapshot'] }) {
  const { t } = useI18n();
  const jobs = snapshot.dataMobilityJobs.length > 0 ? snapshot.dataMobilityJobs.map((job) => ({
    title: job.operationKind,
    meta: `${statusLabel(job.status, t)} / ${formatDate(job.createdAt, t)}`,
    state: healthState(job.status),
  })) : snapshot.importExportResults.slice(0, 10).map((result) => ({
    title: result.action,
    meta: `${statusLabel(result.status, t)} / ${result.summary}`,
    state: healthState(result.status),
  }));
  return <ActivityList empty={t('shared.empty.reason')} items={jobs} />;
}
