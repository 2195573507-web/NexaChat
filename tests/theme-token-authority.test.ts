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

function colorTokenMap(selector: string) {
  const block = selectorBlock(selector);
  return new Map(
    Array.from(block.matchAll(/(--color-[\w-]+):\s*(oklch\(([^)]+)\));/g)).map((match) => [match[1], match[2]]),
  );
}

function oklchToLinearSrgb(value: string): [number, number, number] {
  const match = value.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/);
  if (!match) {
    throw new Error(`Unsupported color token value: ${value}`);
  }
  const l = Number.parseFloat(match[1]);
  const c = Number.parseFloat(match[2]);
  const h = (Number.parseFloat(match[3]) * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;
  const lValue = lPrime ** 3;
  const mValue = mPrime ** 3;
  const sValue = sPrime ** 3;
  return [
    4.0767416621 * lValue - 3.3077115913 * mValue + 0.2309699292 * sValue,
    -1.2684380046 * lValue + 2.6097574011 * mValue - 0.3413193965 * sValue,
    -0.0041960863 * lValue - 0.7034186147 * mValue + 1.707614701 * sValue,
  ].map((channel) => Math.min(1, Math.max(0, channel))) as [number, number, number];
}

function relativeLuminance(value: string) {
  const [r, g, b] = oklchToLinearSrgb(value);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function expectTokenContrast(tokens: Map<string, string>, foreground: string, background: string, minimum: number) {
  const foregroundValue = tokens.get(foreground);
  const backgroundValue = tokens.get(background);
  if (!foregroundValue || !backgroundValue) {
    throw new Error(`Missing contrast token pair: ${foreground} on ${background}`);
  }
  expect(contrastRatio(foregroundValue, backgroundValue), `${foreground} on ${background}`).toBeGreaterThanOrEqual(minimum);
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

  it('defines every color token in root light and dark scopes', () => {
    const rootBlock = selectorBlock(':root');
    const darkBlock = selectorBlock('.theme-dark');
    const lightBlock = selectorBlock('.theme-light');
    const colorTokens = THEME_TOKEN_NAMES.filter((token) => token.startsWith('--color-'));

    for (const token of colorTokens) {
      expect(rootBlock, `:root should define ${token}`).toContain(`${token}:`);
      expect(darkBlock, `.theme-dark should define ${token}`).toContain(`${token}:`);
      expect(lightBlock, `.theme-light should define ${token}`).toContain(`${token}:`);
    }
  });

  it('keeps semantic color token pairs above WCAG readability floors', () => {
    const scopes = [':root', '.theme-dark', '.theme-light'];
    const textBackgroundPairs: Array<[string, string, number]> = [
      ['--color-text', '--color-bg', 4.5],
      ['--color-text', '--color-surface', 4.5],
      ['--color-text', '--color-panel', 4.5],
      ['--color-text-muted', '--color-bg', 4.5],
      ['--color-text-muted', '--color-surface', 4.5],
      ['--color-text-muted', '--color-panel', 4.5],
      ['--color-text-subtle', '--color-bg', 4.5],
      ['--color-text-placeholder', '--color-surface', 4.5],
      ['--color-text-disabled', '--color-surface', 3],
      ['--color-on-primary', '--color-primary', 4.5],
      ['--color-code-text', '--color-code', 4.5],
      ['--color-selected-text', '--color-selected-bg', 4.5],
      ['--color-primary-text', '--color-primary-soft', 4.5],
      ['--color-success-text', '--color-success-bg', 4.5],
      ['--color-warning-text', '--color-warning-bg', 4.5],
      ['--color-danger-text', '--color-danger-bg', 4.5],
      ['--color-info-text', '--color-info-bg', 4.5],
    ];

    for (const scope of scopes) {
      const tokens = colorTokenMap(scope);
      for (const [foreground, background, minimum] of textBackgroundPairs) {
        expectTokenContrast(tokens, foreground, background, minimum);
      }
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
