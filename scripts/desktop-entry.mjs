import { existsSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const desktopEntry = {
  appId: 'local.nexachat',
  appName: 'NexaChat',
  productName: 'NexaChat',
  updateChannel: 'manual-local',
  shortcutFileName: 'NexaChat.lnk',
  relativePaths: {
    iconIco: 'assets/app-icon.ico',
    iconPng: 'assets/app-icon.png',
    electronExecutable: 'node_modules/electron/dist/electron.exe',
    rendererDist: 'dist',
    mainDist: 'dist-electron',
    winUnpackedDir: 'release/win-unpacked',
    packagedExecutable: 'release/win-unpacked/NexaChat.exe',
    packagedAppDir: 'release/win-unpacked/resources/app',
    installerScript: 'release/NexaChat-Setup.ps1',
    packageSmokeUserData: 'test-results/package-smoke-user-data',
    installerSmokeDir: 'test-results/installer-smoke',
  },
};

export function fromRoot(relativePath) {
  return join(repoRoot, relativePath);
}

export function getRepoRoot() {
  return repoRoot;
}

export function getDesktopShortcutPath() {
  const desktopDir = join(process.env.USERPROFILE || '', 'Desktop');
  return join(desktopDir, desktopEntry.shortcutFileName);
}

export function assertInsideRepo(path, label) {
  const resolved = resolve(path);
  const relative = resolved.slice(repoRoot.length);
  if (!resolved.startsWith(`${repoRoot}${sep}`) && resolved !== repoRoot) {
    throw new Error(`${label} is outside repo root: ${resolved}`);
  }
  if (relative.includes(`..${sep}`)) {
    throw new Error(`${label} resolves outside repo root: ${resolved}`);
  }
  return resolved;
}

export function assertExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} is missing: ${path}`);
  }
}

export function normalizeForCompare(path) {
  return resolve(String(path).replaceAll('\\\\', '\\')).toLowerCase();
}

export function normalizeShortcutIconLocation(value) {
  const [iconPath, index = '0'] = String(value).replaceAll('\\\\', '\\').split(',');
  return `${normalizeForCompare(iconPath)},${index}`;
}

export function getLocalShortcutExpectation() {
  return {
    targetPath: fromRoot(desktopEntry.relativePaths.electronExecutable),
    arguments: `"${repoRoot}"`,
    workingDirectory: repoRoot,
    iconLocation: `${normalizeForCompare(fromRoot(desktopEntry.relativePaths.iconIco))},0`,
  };
}

export function getPackagedShortcutExpectation() {
  return {
    targetPath: fromRoot(desktopEntry.relativePaths.packagedExecutable),
    arguments: '',
    workingDirectory: fromRoot(desktopEntry.relativePaths.winUnpackedDir),
    iconLocation: `${normalizeForCompare(fromRoot(desktopEntry.relativePaths.iconIco))},0`,
  };
}
