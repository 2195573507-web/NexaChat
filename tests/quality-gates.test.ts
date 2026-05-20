import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QUALITY_GATE_DEFINITIONS, QUALITY_GATE_IDS } from '../src/shared/qualityGates';

const repoRoot = process.cwd();

describe('quality gate authority', () => {
  it('keeps gate ids unique and release-critical gates configured', () => {
    expect(new Set(QUALITY_GATE_IDS).size).toBe(QUALITY_GATE_IDS.length);
    expect(QUALITY_GATE_IDS).toEqual([
      'typecheck',
      'unit',
      'build',
      'ui-smoke',
      'electron-smoke',
      'package-release',
      'desktop-entry',
      'hardcode-scan',
      'duplicate-scan',
      'security-scan',
      'release-safety-scan',
      'dead-link-scan',
      'docs-freshness',
      'diff-check',
    ]);
    expect(QUALITY_GATE_DEFINITIONS.every((gate) => gate.command && gate.protects)).toBe(true);
  });

  it('exposes scan and release commands through package scripts', () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    for (const scriptName of [
      'scan:hardcode',
      'scan:duplicates',
      'scan:security',
      'scan:release-safety',
      'scan:dead-links',
      'scan:docs',
      'scan:quality',
      'verify:release',
    ]) {
      expect(packageJson.scripts[scriptName], `${scriptName} should exist`).toBeTruthy();
    }
    expect(packageJson.scripts['verify:release']).toContain('quality-gates.mjs release');
  });
});
