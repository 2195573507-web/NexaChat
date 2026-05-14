export const THEME_MODES = ['light', 'dark', 'system'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export const THEME_TOKEN_CATEGORIES = {
  color: [
    '--color-bg',
    '--color-surface',
    '--color-surface-muted',
    '--color-surface-raised',
    '--color-border',
    '--color-border-strong',
    '--color-text',
    '--color-text-muted',
    '--color-text-subtle',
    '--color-primary',
    '--color-info',
    '--color-success',
    '--color-warning',
    '--color-error',
    '--color-on-primary',
    '--color-focus-ring',
    '--color-primary-soft',
    '--color-primary-soft-border',
    '--color-planned-bg',
    '--color-code-bg',
    '--color-code-text',
    '--color-secret-bg',
    '--color-secret-border',
    '--color-secret-text'
  ],
  radius: ['--radius-sm', '--radius-md', '--radius-pill'],
  spacing: ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5'],
  layout: ['--sidebar-width', '--topbar-min-height'],
  typography: ['--font-ui', '--font-mono']
} as const;

export const THEME_TOKEN_NAMES = Object.values(THEME_TOKEN_CATEGORIES).flat();

export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

export const THEME_CLASS_BY_MODE: Record<Exclude<ThemeMode, 'system'>, string> = {
  light: 'theme-light',
  dark: 'theme-dark'
};
