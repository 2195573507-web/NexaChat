import type { DatabaseSync } from 'node:sqlite';
import type { UiPreferences } from '../../shared/types.js';
import { mapUiPreferences } from './mappers.js';

const DEFAULT_PREFS_ID = 'ui_default';

export class SettingsRepository {
  constructor(private readonly db: DatabaseSync) {}

  getUiPreferences(): UiPreferences {
    const row = this.db.prepare('SELECT * FROM ui_preferences WHERE id = ?').get(DEFAULT_PREFS_ID);
    if (!row) {
      return {
        theme: 'system',
        density: 'comfortable',
        fontMode: 'system',
        language: 'zh-CN',
        reducedMotion: false,
        advancedMode: false,
      };
    }
    return mapUiPreferences(row as Record<string, unknown>);
  }
}
