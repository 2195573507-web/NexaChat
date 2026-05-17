import type { DatabaseSync } from 'node:sqlite';
import type {
  DataBackupRecord,
  DataConflictRecord,
  DataMobilityJob,
  ImportExportResult,
  MigrationRun,
  RollbackRecord,
} from '../../shared/types.js';
import {
  mapDataBackupRecord,
  mapDataConflictRecord,
  mapDataMobilityJob,
  mapImportExportResult,
  mapMigrationRun,
  mapRollbackRecord,
} from './mappers.js';

export class DataRepository {
  constructor(private readonly db: DatabaseSync) {}

  listImportExportResults(): ImportExportResult[] {
    return this.db
      .prepare('SELECT * FROM config_snapshots ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapImportExportResult(row as Record<string, unknown>));
  }

  listDataMobilityJobs(): DataMobilityJob[] {
    return this.db
      .prepare('SELECT * FROM data_mobility_jobs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapDataMobilityJob(row as Record<string, unknown>));
  }

  listDataConflicts(jobId?: string): DataConflictRecord[] {
    const rows = jobId
      ? this.db.prepare('SELECT * FROM data_conflicts WHERE job_id = ? ORDER BY created_at ASC').all(jobId)
      : this.db.prepare('SELECT * FROM data_conflicts ORDER BY created_at DESC LIMIT 100').all();
    return rows.map((row) => mapDataConflictRecord(row as Record<string, unknown>));
  }

  listDataBackups(): DataBackupRecord[] {
    return this.db
      .prepare('SELECT * FROM data_backups ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapDataBackupRecord(row as Record<string, unknown>));
  }

  listMigrationRuns(): MigrationRun[] {
    return this.db
      .prepare('SELECT * FROM migration_runs ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapMigrationRun(row as Record<string, unknown>));
  }

  listRollbackRecords(): RollbackRecord[] {
    return this.db
      .prepare('SELECT * FROM rollback_records ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapRollbackRecord(row as Record<string, unknown>));
  }
}
