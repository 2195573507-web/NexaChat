import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_TOKEN_NAMES } from '../src/shared/theme';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const stylesPath = resolve(repoRoot, 'src/renderer/styles.css');

function styleLines() {
  return readFileSync(stylesPath, 'utf8').split(/\r?\n/);
}

function tokenDefinitionLine(line: string) {
  return /^\s*--[\w-]+:\s*.+;\s*$/.test(line);
}

describe('theme token authority', () => {
  it('keeps shared token names in sync with renderer CSS declarations', () => {
    const css = readFileSync(stylesPath, 'utf8');

    for (const token of THEME_TOKEN_NAMES) {
      expect(css).toContain(token);
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
