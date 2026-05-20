export const DESKTOP_ENTRY = {
  appId: 'local.nexachat',
  appName: 'NexaChat',
  productName: 'NexaChat',
  updateChannel: 'manual-local',
  shortcutFileName: 'NexaChat.lnk',
  window: {
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: '#F7F8FA',
  },
  relativePaths: {
    iconIco: 'assets/app-icon.ico',
    iconPng: 'assets/app-icon.png',
    electronExecutable: 'node_modules/electron/dist/electron.exe',
    rendererDist: 'dist',
    mainDist: 'dist-electron',
    releaseDir: 'release',
    winUnpackedDir: 'release/win-unpacked',
    packagedExecutable: 'release/win-unpacked/NexaChat.exe',
    packagedAppDir: 'release/win-unpacked/resources/app',
    packagedIconIco: 'release/win-unpacked/resources/app/assets/app-icon.ico',
    installerScript: 'release/NexaChat-Setup.ps1',
    electronSmokeUserData: 'test-results/electron-smoke-user-data',
    packageSmokeUserData: 'test-results/package-smoke-user-data',
    installerSmokeDir: 'test-results/installer-smoke',
  },
  diagnostics: {
    logDirName: 'logs',
    startupLogFileName: 'startup.jsonl',
    crashLogFileName: 'crash.jsonl',
  },
} as const;

export type DesktopEntry = typeof DESKTOP_ENTRY;
