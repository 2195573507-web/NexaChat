import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import {
  assertExists,
  assertInsideRepo,
  desktopEntry,
  fromRoot,
  getRepoRoot,
} from './desktop-entry.mjs';

const repoRoot = getRepoRoot();
const electronDistDir = fromRoot('node_modules/electron/dist');
const packageDir = assertInsideRepo(fromRoot(desktopEntry.relativePaths.winUnpackedDir), 'Package output');
const appDir = assertInsideRepo(fromRoot(desktopEntry.relativePaths.packagedAppDir), 'Packaged app directory');
const packagedExe = assertInsideRepo(fromRoot(desktopEntry.relativePaths.packagedExecutable), 'Packaged executable');

for (const [relativePath, label] of [
  [desktopEntry.relativePaths.rendererDist, 'renderer build'],
  [desktopEntry.relativePaths.mainDist, 'main-process build'],
  [desktopEntry.relativePaths.iconIco, 'Windows icon'],
  [desktopEntry.relativePaths.iconPng, 'PNG icon'],
  ['node_modules/electron/dist/electron.exe', 'Electron runtime executable'],
]) {
  assertExists(fromRoot(relativePath), label);
}

rmSync(packageDir, { recursive: true, force: true });
mkdirSync(packageDir, { recursive: true });
cpSync(electronDistDir, packageDir, { recursive: true });

const electronExe = join(packageDir, 'electron.exe');
assertExists(electronExe, 'Copied Electron executable');
rmSync(packagedExe, { force: true });
cpSync(electronExe, packagedExe);
rmSync(electronExe, { force: true });

rmSync(appDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });

for (const relativePath of [
  desktopEntry.relativePaths.rendererDist,
  desktopEntry.relativePaths.mainDist,
  'assets',
]) {
  cpSync(fromRoot(relativePath), join(appDir, basename(relativePath)), { recursive: true });
}

const sourcePackage = JSON.parse(readFileSync(fromRoot('package.json'), 'utf8'));
const packagedManifest = {
  name: sourcePackage.name,
  version: sourcePackage.version,
  description: sourcePackage.description,
  main: sourcePackage.main,
  type: sourcePackage.type,
  productName: desktopEntry.productName,
  appId: desktopEntry.appId,
};
writeFileSync(join(appDir, 'package.json'), `${JSON.stringify(packagedManifest, null, 2)}\n`, 'utf8');

const releaseManifest = {
  appId: desktopEntry.appId,
  productName: desktopEntry.productName,
  version: sourcePackage.version,
  updateChannel: desktopEntry.updateChannel,
  generatedAt: new Date().toISOString(),
  packageDir: packageDir.slice(repoRoot.length + 1),
  executable: packagedExe.slice(repoRoot.length + 1),
  appDirectory: appDir.slice(repoRoot.length + 1),
  icon: desktopEntry.relativePaths.iconIco,
  rendererDist: desktopEntry.relativePaths.rendererDist,
  mainDist: desktopEntry.relativePaths.mainDist,
  installer: {
    status: 'not-generated',
    reason: 'Round 14 validates the unpacked Windows package first; installer signing remains a later release step.',
  },
};
writeFileSync(join(dirname(packageDir), 'release-manifest.json'), `${JSON.stringify(releaseManifest, null, 2)}\n`, 'utf8');

console.log(`Packaged ${desktopEntry.productName} to ${packageDir}`);
