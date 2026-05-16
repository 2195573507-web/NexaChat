export type QualityGateStatus = 'configured' | 'documented';
export type QualityGateRisk = 'build' | 'ui' | 'security' | 'release' | 'docs';

export interface QualityGateDefinition {
  id: string;
  command: string;
  status: QualityGateStatus;
  risk: QualityGateRisk;
  protects: string;
}

export const QUALITY_GATE_DEFINITIONS: QualityGateDefinition[] = [
  {
    id: 'typecheck',
    command: 'npm.cmd run typecheck',
    status: 'configured',
    risk: 'build',
    protects: 'TypeScript contracts across shared, main, preload, renderer, and tests.',
  },
  {
    id: 'unit',
    command: 'npm.cmd run test',
    status: 'configured',
    risk: 'build',
    protects: 'Runtime authorities, stores, IPC contracts, security, data, observability, and desktop entry.',
  },
  {
    id: 'build',
    command: 'npm.cmd run build',
    status: 'configured',
    risk: 'build',
    protects: 'Production renderer and Electron main/preload output.',
  },
  {
    id: 'ui-smoke',
    command: 'npm.cmd run test:ui-smoke',
    status: 'configured',
    risk: 'ui',
    protects: 'Route-aware UI, overflow, theme, language, and main user flows.',
  },
  {
    id: 'electron-smoke',
    command: 'npm.cmd run test:electron-smoke',
    status: 'configured',
    risk: 'release',
    protects: 'Desktop Electron shell, preload bridge, module count, and route leak guard.',
  },
  {
    id: 'package-release',
    command: 'npm.cmd run package:release',
    status: 'configured',
    risk: 'release',
    protects: 'Reproducible Windows unpacked package and local installer script.',
  },
  {
    id: 'desktop-entry',
    command: 'npm.cmd run test:desktop-entry',
    status: 'configured',
    risk: 'release',
    protects: 'Packaged launch, installer smoke, packaged shortcut readback, and startup diagnostics.',
  },
  {
    id: 'hardcode-scan',
    command: 'npm.cmd run scan:hardcode',
    status: 'configured',
    risk: 'ui',
    protects: 'i18n, theme token, route leak, and endpoint authority boundaries.',
  },
  {
    id: 'duplicate-scan',
    command: 'npm.cmd run scan:duplicates',
    status: 'configured',
    risk: 'build',
    protects: 'Navigation routes, aliases, IPC channels, API methods, gateway endpoints, and package scripts.',
  },
  {
    id: 'security-scan',
    command: 'npm.cmd run scan:security',
    status: 'configured',
    risk: 'security',
    protects: 'Secret redaction, unsafe code patterns, shell execution, and external URL boundaries.',
  },
  {
    id: 'dead-link-scan',
    command: 'npm.cmd run scan:dead-links',
    status: 'configured',
    risk: 'docs',
    protects: 'Markdown links and referenced local docs/files.',
  },
  {
    id: 'docs-freshness',
    command: 'npm.cmd run scan:docs',
    status: 'configured',
    risk: 'docs',
    protects: 'Blueprint, progress, execution matrix, and release checklist freshness.',
  },
  {
    id: 'diff-check',
    command: 'git diff --check',
    status: 'documented',
    risk: 'build',
    protects: 'Whitespace regressions before commits.',
  },
];

export const QUALITY_GATE_IDS = QUALITY_GATE_DEFINITIONS.map((gate) => gate.id);
