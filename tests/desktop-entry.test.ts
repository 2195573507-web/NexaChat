import { describe, expect, it } from 'vitest';
import { accessSync, constants, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DESKTOP_ENTRY } from '../src/shared/desktopEntry';

const repoRoot = process.cwd();
const pngSignature = '89504e470d0a1a0a';

function expectRepoFile(relativePath: string): void {
  accessSync(join(repoRoot, relativePath), constants.F_OK);
}

describe('desktop entry authority', () => {
  it('keeps package paths and icon assets centralized', () => {
    expect(DESKTOP_ENTRY.appName).toBe('NexaChat');
    expect(DESKTOP_ENTRY.productName).toBe('NexaChat');
    expect(DESKTOP_ENTRY.relativePaths.packagedExecutable).toBe('release/win-unpacked/NexaChat.exe');
    expect(DESKTOP_ENTRY.relativePaths.packagedAppDir).toBe('release/win-unpacked/resources/app');
    expect(DESKTOP_ENTRY.relativePaths.packagedIconIco).toBe('release/win-unpacked/resources/app/assets/app-icon.ico');
    expect(DESKTOP_ENTRY.relativePaths.installerScript).toBe('release/NexaChat-Setup.ps1');
    expect(DESKTOP_ENTRY.relativePaths.iconIco).toBe('assets/app-icon.ico');
    expect(DESKTOP_ENTRY.relativePaths.iconPng).toBe('assets/app-icon.png');

    expectRepoFile(DESKTOP_ENTRY.relativePaths.iconIco);
    expectRepoFile(DESKTOP_ENTRY.relativePaths.iconPng);
  });

  it('keeps the Windows icon as a valid multi-size ICO container', () => {
    const icon = readFileSync(join(repoRoot, DESKTOP_ENTRY.relativePaths.iconIco));
    const imageCount = icon.readUInt16LE(4);
    const iconSizes = new Set<number>();

    expect(icon.readUInt16LE(0)).toBe(0);
    expect(icon.readUInt16LE(2)).toBe(1);
    expect(imageCount).toBeGreaterThanOrEqual(5);
    expect(imageCount).toBeLessThanOrEqual(8);

    for (let index = 0; index < imageCount; index += 1) {
      const entryOffset = 6 + index * 16;
      const width = icon[entryOffset] || 256;
      const height = icon[entryOffset + 1] || 256;
      const imageBytes = icon.readUInt32LE(entryOffset + 8);
      const imageOffset = icon.readUInt32LE(entryOffset + 12);

      iconSizes.add(width);
      expect(height).toBe(width);
      expect(imageOffset).toBeGreaterThanOrEqual(6 + imageCount * 16);
      expect(imageOffset + imageBytes).toBeLessThanOrEqual(icon.length);
      expect(icon.subarray(imageOffset, imageOffset + 8).toString('hex')).toBe(pngSignature);
    }

    expect(iconSizes).toEqual(new Set([16, 32, 48, 64, 128, 256]));
  });

  it('exposes desktop entry package scripts', () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['package:win-unpacked']).toContain('scripts/package-win-unpacked.mjs');
    expect(packageJson.scripts['package:installer-script']).toContain('scripts/create-installer-script.mjs');
    expect(packageJson.scripts['package:release']).toContain('package:win-unpacked');
    expect(packageJson.scripts['package:release']).toContain('package:installer-script');
    expect(packageJson.scripts['test:package-smoke']).toContain('scripts/package-smoke.mjs');
    expect(packageJson.scripts['test:installer-smoke']).toContain('scripts/installer-smoke.mjs');
    expect(packageJson.scripts['test:shortcut-readback']).toContain('scripts/shortcut-readback.mjs');
    expect(packageJson.scripts['test:shortcut-readback:packaged']).toContain('--target packaged');
    expect(packageJson.scripts['test:desktop-entry']).toContain('test:package-smoke');
    expect(packageJson.scripts['test:desktop-entry']).toContain('test:installer-smoke');
    expect(packageJson.scripts['test:desktop-entry']).toContain('test:shortcut-readback:packaged');
  });

  it('keeps launch diagnostics and single-window recovery in the main process', () => {
    const mainSource = readFileSync(join(repoRoot, 'src/main/index.ts'), 'utf8');
    const diagnosticsSource = readFileSync(join(repoRoot, 'src/main/desktopDiagnostics.ts'), 'utf8');
    const lockIndex = mainSource.indexOf('requestSingleInstanceLock');
    const storeImportIndex = mainSource.indexOf("import('./services/store.js')");
    const ipcImportIndex = mainSource.indexOf("import('./ipc.js')");
    const databaseImportIndex = mainSource.indexOf("import('./database/connection.js')");

    expect(mainSource).toContain('DESKTOP_ENTRY');
    expect(mainSource).toContain('requestSingleInstanceLock');
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(storeImportIndex).toBeGreaterThan(lockIndex);
    expect(ipcImportIndex).toBeGreaterThan(lockIndex);
    expect(databaseImportIndex).toBeGreaterThan(lockIndex);
    expect(mainSource).not.toMatch(/import\s+\{[^}]*registerIpcHandlers[^}]*\}\s+from\s+['"]\.\/ipc\.js['"]/);
    expect(mainSource).not.toMatch(/import\s+\{[^}]*store[^}]*\}\s+from\s+['"]\.\/services\/store\.js['"]/);
    expect(mainSource).not.toMatch(/import\s+\{[^}]*closeDatabase[^}]*\}\s+from\s+['"]\.\/database\/connection\.js['"]/);
    expect(mainSource).toContain('second-instance');
    expect(mainSource).toContain('installDesktopDiagnostics');
    expect(diagnosticsSource).toContain('uncaughtException');
    expect(diagnosticsSource).toContain('unhandledRejection');
    expect(diagnosticsSource).toContain('render-process-gone');
    expect(diagnosticsSource).toContain('child-process-gone');
    expect(diagnosticsSource).toContain('redacted-secret');
    expect(diagnosticsSource).toContain('nxk_');
  });

  it('documents current Electron isolation safeguards in code', () => {
    const mainSource = readFileSync(join(repoRoot, 'src/main/index.ts'), 'utf8');

    expect(mainSource).toContain('contextIsolation: true');
    expect(mainSource).toContain('nodeIntegration: false');
    expect(mainSource).toContain('sandbox: false');
    expect(mainSource).toContain('CONTENT_SECURITY_POLICY');
    expect(mainSource).toContain('content-security-policy');
    expect(mainSource).toContain('setPermissionRequestHandler');
    expect(mainSource).toContain('resolveRendererAsset');
    expect(mainSource).toContain('setWindowOpenHandler');
    expect(mainSource).toContain('will-navigate');
    expect(mainSource).toContain('isSafeExternalUrl');
    expect(mainSource).toContain('autoHideMenuBar: true');
  });
});
