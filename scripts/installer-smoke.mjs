import { _electron as electron } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertExists,
  closeElectronApp,
  desktopEntry,
  fromRoot,
  getRepoRoot,
} from './desktop-entry.mjs';

const repoRoot = getRepoRoot();
const installerScript = fromRoot(desktopEntry.relativePaths.installerScript);
const smokeRoot = join(fromRoot(desktopEntry.relativePaths.installerSmokeDir), String(process.pid));
const installRoot = join(smokeRoot, 'Programs', 'NexaChat');
const desktopRoot = join(smokeRoot, 'Desktop');
const sourceRoot = fromRoot(desktopEntry.relativePaths.winUnpackedDir);
const smokeUserDataDir = join(smokeRoot, 'user-data');

assertExists(installerScript, 'Installer script');
assertExists(fromRoot(desktopEntry.relativePaths.packagedExecutable), 'Packaged executable');
rmSync(smokeRoot, { recursive: true, force: true });
mkdirSync(smokeRoot, { recursive: true });

const installOutput = execFileSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    installerScript,
    '-InstallRoot',
    installRoot,
    '-DesktopRoot',
    desktopRoot,
    '-SourceRoot',
    sourceRoot,
  ],
  { encoding: 'utf8' },
);

const installedExe = join(installRoot, 'NexaChat.exe');
const shortcutPath = join(desktopRoot, 'NexaChat.lnk');
const installManifest = join(installRoot, 'install-manifest.json');
for (const [path, label] of [
  [installedExe, 'Installed executable'],
  [shortcutPath, 'Installed shortcut'],
  [installManifest, 'Install manifest'],
]) {
  if (!existsSync(path)) {
    throw new Error(`${label} is missing after installer smoke: ${path}\n${installOutput}`);
  }
}

mkdirSync(smokeUserDataDir, { recursive: true });
const app = await electron.launch({
  executablePath: installedExe,
  args: ['--disable-gpu', '--disable-gpu-sandbox', `--user-data-dir=${smokeUserDataDir}`],
  cwd: installRoot,
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    NEXACHAT_ELECTRON_SMOKE: '1',
    NEXACHAT_ELECTRON_SMOKE_USER_DATA_DIR: smokeUserDataDir,
  },
});

try {
  const window = await app.firstWindow();
  await window.locator('.app-shell').waitFor({ timeout: 20_000 });
  await window.getByText(desktopEntry.productName, { exact: true }).first().waitFor({ timeout: 5_000 });
  const moduleCount = await window.locator('.module-nav-item').count();
  if (moduleCount !== 8) {
    throw new Error(`Installed app expected 8 modules, got ${moduleCount}.`);
  }
  const bodyText = await window.locator('body').innerText();
  if (/(^|\s)\/(workspace|chat|models|knowledge|tools|gateway|data|settings)\//.test(bodyText)) {
    throw new Error('Visible route path leaked into the installed app shell.');
  }
  const startupLogPath = join(smokeUserDataDir, 'logs', 'startup.jsonl');
  if (!existsSync(startupLogPath) || !readFileSync(startupLogPath, 'utf8').includes('window.ready-to-show')) {
    throw new Error('Installed app startup diagnostics were not recorded.');
  }
  console.log(`Installer smoke passed for ${installedExe.replace(repoRoot, '.')}`);
} finally {
  await closeElectronApp(app);
}
