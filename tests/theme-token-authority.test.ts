import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_TOKEN_NAMES, getThemeClass, normalizeThemeMode, resolveThemeMode } from '../src/shared/theme';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const stylesPath = resolve(repoRoot, 'src/renderer/styles.css');

function styleLines() {
  return readFileSync(stylesPath, 'utf8').split(/\r?\n/);
}

function tokenDefinitionLine(line: string) {
  return /^\s*--[\w-]+:\s*.+;\s*$/.test(line);
}

function selectorBlock(selector: string) {
  const css = readFileSync(stylesPath, 'utf8');
  const match = css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) {
    throw new Error(`Missing selector block: ${selector}`);
  }
  return match[1];
}

describe('theme token authority', () => {
  it('normalizes and resolves light dark and system theme modes', () => {
    expect(normalizeThemeMode('light')).toBe('light');
    expect(normalizeThemeMode('dark')).toBe('dark');
    expect(normalizeThemeMode('system')).toBe('system');
    expect(normalizeThemeMode('unknown')).toBe('system');
    expect(resolveThemeMode('light', true)).toBe('light');
    expect(resolveThemeMode('dark', false)).toBe('dark');
    expect(resolveThemeMode('system', true)).toBe('dark');
    expect(resolveThemeMode('system', false)).toBe('light');
    expect(getThemeClass('system', true)).toBe('theme-dark');
    expect(getThemeClass('system', false)).toBe('theme-light');
  });

  it('keeps shared token names in sync with renderer CSS declarations', () => {
    const css = readFileSync(stylesPath, 'utf8');

    for (const token of THEME_TOKEN_NAMES) {
      expect(css).toContain(token);
    }
  });

  it('defines every color token in both light root and dark override scopes', () => {
    const rootBlock = selectorBlock(':root');
    const darkBlock = selectorBlock('.theme-dark');
    const colorTokens = THEME_TOKEN_NAMES.filter((token) => token.startsWith('--color-'));

    for (const token of colorTokens) {
      expect(rootBlock, `:root should define ${token}`).toContain(`${token}:`);
      expect(darkBlock, `.theme-dark should define ${token}`).toContain(`${token}:`);
    }
  });

  it('keeps literal colors inside token definitions only', () => {
    const violations = styleLines()
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => /#[0-9A-Fa-f]{3,8}|:\s*(white|black)\b/.test(line))
      .filter(({ line }) => !tokenDefinitionLine(line));

    expect(violations).toEqual([]);
  });

  it('keeps raw radii inside token definitions only', () => {
    const violations = styleLines()
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => /border-radius:\s*(6px|8px|999px)\b/.test(line))
      .filter(({ line }) => !tokenDefinitionLine(line));

    expect(violations).toEqual([]);
  });
});
