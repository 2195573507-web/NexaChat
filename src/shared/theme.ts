export const THEME_MODES = ['light', 'dark', 'system'] as const;
export const RESOLVED_THEME_MODES = ['light', 'dark'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedThemeMode = (typeof RESOLVED_THEME_MODES)[number];

export const THEME_TOKEN_CATEGORIES = {
  color: [
    '--color-bg',
    '--color-rail',
    '--color-surface',
    '--color-panel',
    '--color-muted',
    '--color-border',
    '--color-border-strong',
    '--color-text',
    '--color-text-muted',
    '--color-text-subtle',
    '--color-primary',
    '--color-primary-soft',
    '--color-info',
    '--color-success',
    '--color-warning',
    '--color-danger',
    '--color-on-primary',
    '--color-code',
    '--color-code-text',
  ],
  radius: ['--radius-sm', '--radius-md', '--radius-pill'],
  spacing: ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5'],
  shadow: ['--shadow-focus'],
  layout: ['--rail-width', '--switcher-width'],
  typography: ['--font-ui', '--font-mono', '--font-size-xs', '--font-size-sm', '--font-size-md', '--font-size-lg', '--font-size-xl']
} as const;

export const THEME_TOKEN_NAMES = Object.values(THEME_TOKEN_CATEGORIES).flat();

export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

export const THEME_CLASS_BY_MODE: Record<Exclude<ThemeMode, 'system'>, string> = {
  light: 'theme-light',
  dark: 'theme-dark'
};

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
  return THEME_MODES.includes(value as ThemeMode) ? (value as ThemeMode) : 'system';
}

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): ResolvedThemeMode {
  if (mode === 'system') {
    return prefersDark ? 'dark' : 'light';
  }
  return mode;
}

export function getThemeClass(mode: ThemeMode, prefersDark: boolean): string {
  return THEME_CLASS_BY_MODE[resolveThemeMode(mode, prefersDark)];
}
