import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_TOKEN_NAMES, getThemeClass, normalizeThemeMode, resolveThemeMode } from '../src/shared/theme';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const stylePaths = [
  resolve(repoRoot, 'src/renderer/styles.css'),
  resolve(repoRoot, 'src/renderer/styles/tokens.css'),
  resolve(repoRoot, 'src/renderer/styles/base.css'),
  resolve(repoRoot, 'src/renderer/styles/shell.css'),
  resolve(repoRoot, 'src/renderer/styles/components.css'),
  resolve(repoRoot, 'src/renderer/styles/pages.css'),
];

function stylesCss() {
  return stylePaths.map((stylePath) => readFileSync(stylePath, 'utf8')).join('\n');
}

function styleLines() {
  return stylesCss().split(/\r?\n/);
}

function tokenDefinitionLine(line: string) {
  return /^\s*--[\w-]+:\s*.+;\s*$/.test(line);
}

function allowedGlobalTypographyLine(line: string) {
  return /^\s*font-family:\s*var\(--font-(sans|ui|mono|message-writing)\);/.test(line);
}

function allowedLineHeightLine(line: string) {
  return /^\s*line-height:\s*var\(--line-height-[\w-]+\);/.test(line);
}

function allowedColorMixLine(line: string) {
  return /color-mix\(in srgb,\s*var\(--color-[\w-]+\)/.test(line) && !/#[0-9A-Fa-f]{3,8}|oklch\(|rgb\(|hsl\(|:\s*(white|black)\b/.test(line);
}

function selectorBlock(selector: string) {
  const css = stylesCss();
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
    const css = stylesCss();

    for (const token of THEME_TOKEN_NAMES) {
      expect(css).toContain(token);
    }
  });

  it('defines motion tokens and uses them for component transitions', () => {
    const css = stylesCss();

    const expectedTokens = [
      '--duration-instant',
      '--duration-fast',
      '--duration-normal',
      '--duration-slow',
      '--easing-standard',
      '--easing-decelerate',
      '--easing-emphasized',
    ];

    for (const token of expectedTokens) {
      expect(THEME_TOKEN_NAMES).toContain(token);
      expect(css).toContain(token);
    }
    expect(css).toContain('--duration-instant: 80ms;');
    expect(css).toContain('--duration-fast: 120ms;');
    expect(css).toContain('--duration-normal: 160ms;');
    expect(css).toContain('--duration-slow: 220ms;');
    expect(css).toContain('--easing-standard: cubic-bezier(0.2, 0, 0, 1);');
    expect(css).toContain('--easing-decelerate: cubic-bezier(0, 0, 0.2, 1);');
    expect(css).toContain('--easing-emphasized: cubic-bezier(0.2, 0, 0, 1);');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('.motion-reduced');
    expect(css).toContain('transition:');
    expect(css).not.toMatch(/--motion-|--ease-(out|in)-standard/);
    expect(css).not.toMatch(/\b(80ms|120ms|160ms|220ms|150ms|200ms|240ms)\b(?!;)/);
  });

  it('keeps motion on composited and paint-safe properties only', () => {
    const violations = styleLines()
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => /transition:|animation:/.test(line))
      .filter(({ line }) => /\b(width|height|top|left|right|bottom|margin|padding|filter|backdrop-filter|grid-template-columns)\b/.test(line));

    expect(violations).toEqual([]);
  });

  it('keeps the requested desktop system font stack without external font assets', () => {
    const css = stylesCss();

    expect(css).toContain('--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", "Microsoft YaHei UI", sans-serif;');
    expect(css).not.toMatch(/@font-face|url\([^)]*\.(woff2?|ttf|otf)/);
    expect(css).toContain('-webkit-font-smoothing: antialiased;');
    expect(css).toContain('-moz-osx-font-smoothing: grayscale;');
  });

  it('does not leave renderer CSS tokens undeclared in the shared registry', () => {
    const cssTokens = Array.from(new Set(stylesCss().match(/--[a-z0-9-]+(?=\s*:)/g) ?? []));

    expect(cssTokens.sort()).toEqual([...THEME_TOKEN_NAMES].sort());
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
      .filter(({ line }) => /#[0-9A-Fa-f]{3,8}|oklch\(|rgb\(|hsl\(|:\s*(white|black)\b/.test(line))
      .filter(({ line }) => !tokenDefinitionLine(line))
      .filter(({ line }) => !allowedColorMixLine(line));

    expect(violations).toEqual([]);
  });

  it('keeps raw component radii inside token definitions only', () => {
    const violations = styleLines()
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => /border-radius:\s*(6px|8px|999px)\b/.test(line))
      .filter(({ line }) => !tokenDefinitionLine(line));

    expect(violations).toEqual([]);
  });

  it('keeps direct font-size properties inside tokens only', () => {
    const violations = styleLines()
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => /font-size:\s*\d+px/.test(line))
      .filter(({ line }) => !tokenDefinitionLine(line));

    expect(violations).toEqual([]);
  });

  it('keeps font family and line height usage on shared typography tokens', () => {
    const violations = styleLines()
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => /font-family:|line-height:/.test(line))
      .filter(({ line }) => !tokenDefinitionLine(line))
      .filter(({ line }) => !allowedGlobalTypographyLine(line))
      .filter(({ line }) => !allowedLineHeightLine(line));

    expect(violations).toEqual([]);
  });

  it('keeps the KaiTi preference scoped to message writing surfaces', () => {
    const css = stylesCss();

    expect(css).toContain('.font-kaiti .message-content p,\n.font-kaiti .chat-composer textarea');
    expect(css).not.toMatch(/\.font-kaiti\s+(?!\.message-content p|\.chat-composer textarea)/);
  });
});
