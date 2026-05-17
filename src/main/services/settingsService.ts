import { now } from '../utils/ids.js';
import { translate } from '../../shared/i18n.js';
import { normalizeThemeMode } from '../../shared/theme.js';
import { SECURITY_ACTION_PERMISSIONS } from '../../shared/securityRuntime.js';
import { DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS, normalizeObservabilityPrivacySettings, type ObservabilityPrivacySettings } from '../../shared/observabilityRuntime.js';
import type { UiPreferences } from '../../shared/types.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const DEFAULT_PREFS_ID = 'ui_default';
const OBSERVABILITY_PRIVACY_SETTING_KEY = 'observability.privacy';
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);



export function SettingsService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class SettingsService extends Base {
  getObservabilityPrivacySettings(): ObservabilityPrivacySettings {
    const raw = this.getSetting(OBSERVABILITY_PRIVACY_SETTING_KEY);
    if (!raw) {
      return normalizeObservabilityPrivacySettings({
        ...DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS,
        updatedAt: now(),
      });
    }
    try {
      return normalizeObservabilityPrivacySettings(JSON.parse(raw) as Partial<ObservabilityPrivacySettings>);
    } catch {
      return normalizeObservabilityPrivacySettings({
        ...DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS,
        updatedAt: now(),
      });
    }
  }


  saveObservabilityPrivacy(input: Partial<ObservabilityPrivacySettings>): ObservabilityPrivacySettings {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.observabilityWrite, 'observability_privacy', null);
    const settings = normalizeObservabilityPrivacySettings({ ...this.getObservabilityPrivacySettings(), ...input, updatedAt: now() });
    this.setSetting(OBSERVABILITY_PRIVACY_SETTING_KEY, JSON.stringify(settings));
    this.audit('observability.privacy.updated', 'observability_privacy', null, settings, SECURITY_ACTION_PERMISSIONS.observabilityWrite);
    return settings;
  }


  getUiPreferences(): UiPreferences {
    return this.repositories.settings.getUiPreferences();
  }


  saveUiPreferences(preferences: UiPreferences): UiPreferences {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.settingsWrite, 'ui_preferences', DEFAULT_PREFS_ID);
    const timestamp = now();
    const normalizedPreferences: UiPreferences = {
      ...preferences,
      theme: normalizeThemeMode(preferences.theme),
      advancedMode: Boolean(preferences.advancedMode),
    };
    this.db
      .prepare(
        `INSERT INTO ui_preferences (id, theme, density, font_mode, language, reduced_motion, advanced_mode, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET theme = excluded.theme, density = excluded.density, font_mode = excluded.font_mode, language = excluded.language, reduced_motion = excluded.reduced_motion, advanced_mode = excluded.advanced_mode, updated_at = excluded.updated_at`,
      )
      .run(
        DEFAULT_PREFS_ID,
        normalizedPreferences.theme,
        normalizedPreferences.density,
        normalizedPreferences.fontMode,
        normalizedPreferences.language,
        normalizedPreferences.reducedMotion ? 1 : 0,
        normalizedPreferences.advancedMode ? 1 : 0,
        timestamp,
      );
    this.audit('ui.preferences.updated', 'ui_preferences', DEFAULT_PREFS_ID, normalizedPreferences);
    return this.getUiPreferences();
  }

  };
}
