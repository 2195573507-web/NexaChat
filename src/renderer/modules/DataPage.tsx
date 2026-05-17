import { Archive, DatabaseBackup, FileCheck, RotateCcw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { DATA_CONFIRMATION_PHRASES, DATA_WIZARD_STEPS } from '../../shared/dataRuntime';
import { FORM_DEFAULTS } from '../../shared/uiCopy';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, CopyableCommand, DataRows, EmptyBlock, Field, InlineNotice, PageHeader, StatusPillLite, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { formatDate, healthState, statusLabel, TabPanel, type TabPageProps } from './shared';

export function DataPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [manifestText, setManifestText] = useState<string>(FORM_DEFAULTS.dataImportManifest);
  const [backupPassphrase, setBackupPassphrase] = useState<string>(FORM_DEFAULTS.backupPassphrase);
  const [restorePassphrase, setRestorePassphrase] = useState<string>(FORM_DEFAULTS.restorePassphrase);
  const [applyImportPhrase, setApplyImportPhrase] = useState<string>('');
  const [rollbackPhrase, setRollbackPhrase] = useState<string>(FORM_DEFAULTS.rollbackPhrase);
  const latestReadyImport = snapshot.importExportResults.find((result) => result.action === 'import' && result.status === 'ready');
  const latestBackup = snapshot.dataBackups[0];
  const rollback = snapshot.rollbackRecords.find((record) => record.state === 'available') ?? snapshot.rollbackRecords[0];
  const backupPassphraseValid = backupPassphrase.length >= 8;
  const restorePassphraseValid = restorePassphrase.length >= 8;
  const applyImportPhraseValid = applyImportPhrase === DATA_CONFIRMATION_PHRASES.applyImport;

  if (activeTab.id === 'backup') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <PageHeader
          eyebrow={t('data.export.create')}
          title={t('data.backup.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={latestBackup?.profile ?? t('common.none')} state={latestBackup ? 'ready' : 'muted'} />}
          actions={<CommandButton variant="primary" icon={<Archive size={15} />} disabled={!backupPassphraseValid} disabledReason={t('data.backup.passphrase.required')} onClick={() => onAction(t('data.toast.backupCreated'), () => api.createEncryptedBackup({ profile: 'encrypted-full', passphrase: backupPassphrase }))}>{t('data.backup.create')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('data.backup.title')} description={activeTab.featureBoundary}>
          <ToolSection title={t('data.backup.create')} description={t('data.backup.note')}>
            <div className="form-stack">
              <Field label={t('data.backup.passphrase')}>
                <input value={backupPassphrase} onChange={(event) => setBackupPassphrase(event.target.value)} type="password" />
              </Field>
              <InlineNotice tone={backupPassphraseValid ? 'info' : 'warning'} title={t('data.backup.passphrase')} detail={backupPassphraseValid ? t('data.backup.passphrase.help') : t('data.backup.passphrase.required')} />
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
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'restore') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <PageHeader
          eyebrow={t('data.restore.preflight')}
          title={t('data.restore.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={latestBackup ? t('common.available') : t('common.none')} state={latestBackup ? 'ready' : 'warning'} />}
          actions={<CommandButton variant="primary" icon={<FileCheck size={15} />} disabled={!latestBackup || !restorePassphraseValid} disabledReason={!latestBackup ? t('data.restore.noBackup') : t('data.restore.passphrase.required')} onClick={() => onAction(t('data.toast.restoreCreated'), () => api.createRestorePreflight({ backupId: latestBackup?.id, passphrase: restorePassphrase }))}>{t('data.restore.preflight')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('data.restore.title')} description={activeTab.featureBoundary}>
          <ToolSection title={t('data.restore.preflight')} description={t('data.restore.note')}>
            <div className="form-stack">
              <Field label={t('data.restore.passphrase')}>
                <input value={restorePassphrase} onChange={(event) => setRestorePassphrase(event.target.value)} type="password" />
              </Field>
              <InlineNotice tone={restorePassphraseValid ? 'info' : 'warning'} title={t('data.restore.passphrase')} detail={restorePassphraseValid ? t('data.restore.passphrase.help') : t('data.restore.passphrase.required')} />
            </div>
          </ToolSection>
          <JobList snapshot={snapshot} />
        </ConfigList>
        <ConfigDetail title={t('data.conflicts.title')} description={t('nav.data.restore.boundary')}>
          <InlineNotice tone="info" title={t('data.restore.preflight')} detail={t('data.restore.safeFailure')} />
          <ActivityList empty={t('shared.empty.reason')} items={snapshot.dataConflicts.slice(0, 8).map((conflict) => ({ title: conflict.importName, meta: conflict.type, state: conflict.resolved ? 'ready' : 'warning' }))} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'rollback') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <PageHeader
          eyebrow={t('common.required')}
          title={t('data.rollback.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={rollback?.state ? statusLabel(rollback.state, t) : t('common.none')} state={rollback?.state === 'available' ? 'warning' : 'muted'} />}
          actions={<CommandButton variant="danger" icon={<RotateCcw size={15} />} disabled={!rollback || rollbackPhrase !== DATA_CONFIRMATION_PHRASES.rollback} onClick={() => onAction(t('data.toast.rollbackApplied'), () => api.applyDataRollback({ rollbackId: rollback?.id ?? '', confirmationPhrase: rollbackPhrase }))}>{t('data.rollback.apply')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('data.rollback.title')} description={activeTab.featureBoundary}>
          <InlineNotice tone="warning" title={t('common.required')} detail={DATA_CONFIRMATION_PHRASES.rollback} />
          <div className="form-stack">
            <Field label={t('data.rollback.confirmPhrase')}>
              <input value={rollbackPhrase} onChange={(event) => setRollbackPhrase(event.target.value)} />
            </Field>
          </div>
          <ActivityList empty={t('shared.empty.reason')} items={snapshot.rollbackRecords.map((record) => ({ title: record.id, meta: statusLabel(record.state, t), state: healthState(record.state) }))} />
        </ConfigList>
        <ConfigDetail title={t('data.rollback.title')} description={t('nav.data.rollback.boundary')}>
          <DataRows rows={[
            { label: t('common.available'), value: snapshot.rollbackRecords.filter((record) => record.state === 'available').length },
            { label: t('common.completed'), value: snapshot.rollbackRecords.filter((record) => record.state === 'applied').length },
          ]} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'diagnostics' || activeTab.id === 'cleanup') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <PageHeader
          eyebrow={t('stage.environment-limited')}
          title={activeTab.label}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={t('stage.environment-limited')} state="warning" />}
          actions={<CommandButton variant="primary" icon={<ShieldAlert size={15} />} onClick={() => onAction(t('data.toast.diagnosticsExported'), () => api.exportDiagnostics())}>{t('data.diagnostics.export')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={activeTab.label} description={activeTab.featureBoundary}>
          <JobList snapshot={snapshot} />
        </ConfigList>
        <ConfigDetail title={t('stage.environment-limited')} description={t('nav.data.cleanup.boundary')}>
          <InlineNotice tone="warning" title={t('stage.environment-limited')} detail={activeTab.featureBoundary} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="data" tab={activeTab}>
      <PageHeader
        eyebrow={DATA_WIZARD_STEPS.join(' / ')}
        title={t('data.import.title')}
        description={activeTab.featureBoundary}
        status={<StatusPillLite label={latestReadyImport ? t('common.available') : t('common.queued')} state={latestReadyImport ? 'ready' : 'muted'} />}
        actions={<CommandButton variant="primary" icon={<FileCheck size={15} />} disabled={!manifestText.trim()} onClick={() => onAction(t('data.toast.importPreflighted'), () => api.validateImportManifest(manifestText))}>{t('data.import.preflight')}</CommandButton>}
      />
      <div className="tool-layout">
      <ConfigList title={t('data.import.title')} description={activeTab.featureBoundary}>
        <ToolSection title={t('data.import.preflight')} description={t('data.import.note')}>
          <div className="wizard-steps">
            {DATA_WIZARD_STEPS.map((step) => <span key={step}>{step}</span>)}
          </div>
          <div className="form-stack">
            <Field label={t('data.import.aria')}>
              <textarea value={manifestText} onChange={(event) => setManifestText(event.target.value)} aria-label={t('data.import.aria')} />
            </Field>
            <Field label={t('data.import.confirmTitle')}>
              <input value={applyImportPhrase} onChange={(event) => setApplyImportPhrase(event.target.value)} aria-label={t('data.import.confirmTitle')} />
            </Field>
            <InlineNotice tone={applyImportPhraseValid ? 'info' : 'warning'} title={t('data.import.confirmTitle')} detail={t('data.import.errors.confirmation')} />
            <span className="row-actions">
              <CommandButton icon={<DatabaseBackup size={15} />} disabled={!latestReadyImport || !applyImportPhraseValid} disabledReason={!latestReadyImport ? t('data.import.errors.readyOnly') : t('data.import.errors.confirmation')} onClick={() => onAction(t('data.toast.importApplied'), () => api.applyImportPlan(latestReadyImport?.id ?? '', { mode: 'apply-metadata', confirmationPhrase: applyImportPhrase }))}>
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
      </div>
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
