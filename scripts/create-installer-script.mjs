import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  assertExists,
  assertInsideRepo,
  desktopEntry,
  fromRoot,
} from './desktop-entry.mjs';

const installerPath = assertInsideRepo(fromRoot(desktopEntry.relativePaths.installerScript), 'Installer script');
const packagedExecutable = fromRoot(desktopEntry.relativePaths.packagedExecutable);
const packageDir = fromRoot(desktopEntry.relativePaths.winUnpackedDir);
const releaseManifestPath = fromRoot('release/release-manifest.json');

assertExists(packagedExecutable, 'Packaged executable');
mkdirSync(dirname(installerPath), { recursive: true });

const installerScript = String.raw`param(
  [string]$InstallRoot = "$env:LOCALAPPDATA\Programs\NexaChat",
  [string]$DesktopRoot = [Environment]::GetFolderPath('Desktop'),
  [string]$SourceRoot = (Join-Path $PSScriptRoot 'win-unpacked'),
  [switch]$CreateShortcut = $true
)

$ErrorActionPreference = 'Stop'

function Resolve-FullPath([string]$PathValue) {
  return [System.IO.Path]::GetFullPath($PathValue)
}

$resolvedSource = Resolve-FullPath $SourceRoot
$resolvedInstall = Resolve-FullPath $InstallRoot
$resolvedDesktop = Resolve-FullPath $DesktopRoot
$sourceExe = Join-Path $resolvedSource 'NexaChat.exe'

if (-not (Test-Path -LiteralPath $sourceExe)) {
  throw "Packaged executable is missing: $sourceExe"
}

New-Item -ItemType Directory -Force -Path $resolvedInstall | Out-Null
Get-ChildItem -LiteralPath $resolvedInstall -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath $resolvedSource -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $resolvedInstall -Recurse -Force
}

$installedExe = Join-Path $resolvedInstall 'NexaChat.exe'
$iconPath = Join-Path $resolvedInstall 'resources\app\assets\app-icon.ico'

if ($CreateShortcut) {
  New-Item -ItemType Directory -Force -Path $resolvedDesktop | Out-Null
  $shortcutPath = Join-Path $resolvedDesktop 'NexaChat.lnk'
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $installedExe
  $shortcut.Arguments = ''
  $shortcut.WorkingDirectory = $resolvedInstall
  $shortcut.IconLocation = "$iconPath,0"
  $shortcut.Save()
}

$manifest = [pscustomobject]@{
  app = 'NexaChat'
  installedExe = $installedExe
  installRoot = $resolvedInstall
  shortcutRoot = $resolvedDesktop
  sourceRoot = $resolvedSource
  createdShortcut = [bool]$CreateShortcut
  installedAt = (Get-Date).ToUniversalTime().ToString('o')
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $resolvedInstall 'install-manifest.json') -Encoding UTF8
$manifest | ConvertTo-Json -Compress
`;

writeFileSync(installerPath, `${installerScript}\n`, 'utf8');

if (existsSync(releaseManifestPath)) {
  const releaseManifest = JSON.parse(readFileSync(releaseManifestPath, 'utf8'));
  releaseManifest.installer = {
    status: 'script-generated',
    script: desktopEntry.relativePaths.installerScript,
    smoke: 'npm.cmd run test:installer-smoke',
    note: 'Local PowerShell installer script copies the verified unpacked package and creates a shortcut; it does not perform signing or NSIS packaging.',
  };
  writeFileSync(releaseManifestPath, `${JSON.stringify(releaseManifest, null, 2)}\n`, 'utf8');
}

console.log(`Installer script generated at ${installerPath}`);
