import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getMissingTranslationKeys, translate, type I18nKey } from '../src/shared/i18n';
import { navModules } from '../src/shared/navigation';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');

const uiSourceFiles = [
  'src/renderer/App.tsx',
  'src/renderer/components/AppFrame.tsx',
  'src/renderer/components/StatusPill.tsx',
  'src/renderer/components/stageStatus.ts',
  'src/renderer/modules/ChatPage.tsx',
  'src/renderer/modules/DataPage.tsx',
  'src/renderer/modules/GatewayPage.tsx',
  'src/renderer/modules/KnowledgePage.tsx',
  'src/renderer/modules/ModelsPage.tsx',
  'src/renderer/modules/SettingsPage.tsx',
  'src/renderer/modules/ToolsPage.tsx',
  'src/renderer/modules/shared.tsx',
  'src/renderer/mockApi.ts',
  'src/shared/errors.ts',
  'src/shared/navigation.ts',
  'src/shared/providerCatalog.ts',
  'src/shared/uiCopy.ts',
  'src/shared/uiStatus.ts',
  'src/main/services/store.ts',
];

describe('i18n authority', () => {
  it('keeps zh-CN and en-US dictionaries in parity', () => {
    expect(getMissingTranslationKeys()).toEqual([]);
  });

  it('keeps navigation labels descriptions and feature boundaries dictionary-backed', () => {
    for (const module of navModules) {
      expect(module.label).toBe(translate('zh-CN', module.labelKey as I18nKey));
      expect(module.shortLabel).toBe(translate('zh-CN', module.shortLabelKey as I18nKey));
      expect(module.description).toBe(translate('zh-CN', module.descriptionKey as I18nKey));

      for (const tab of module.tabs) {
        expect(tab.label).toBe(translate('zh-CN', tab.labelKey as I18nKey));
        expect(tab.description).toBe(translate('zh-CN', tab.descriptionKey as I18nKey));
        expect(tab.featureBoundary).toBe(translate('zh-CN', tab.featureBoundaryKey as I18nKey));
      }
    }
  });

  it('blocks new CJK literals in migrated renderer authority files', () => {
    const violations = uiSourceFiles.flatMap((relativePath) => {
      const source = readFileSync(resolve(repoRoot, relativePath), 'utf8');
      return source
        .split(/\r?\n/)
        .map((line, index) => ({ relativePath, lineNumber: index + 1, line }))
        .filter(({ line }) => /[\u4e00-\u9fff]/.test(line))
        .filter(({ line }) => !line.trim().startsWith('//'));
    });

    expect(violations).toEqual([]);
  });
});
