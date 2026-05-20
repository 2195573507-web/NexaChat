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

function Test-IsSamePath([string]$Left, [string]$Right) {
  return [string]::Equals((Resolve-FullPath $Left).TrimEnd('\', '/'), (Resolve-FullPath $Right).TrimEnd('\', '/'), [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-IsSameOrChildPath([string]$Child, [string]$Parent) {
  $resolvedChild = (Resolve-FullPath $Child).TrimEnd('\', '/')
  $resolvedParent = (Resolve-FullPath $Parent).TrimEnd('\', '/')
  return $resolvedChild.Equals($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase) -or $resolvedChild.StartsWith("$resolvedParent\", [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-IsVerifiedNexaChatInstall([string]$PathValue) {
  $manifestPath = Join-Path $PathValue 'install-manifest.json'
  if (Test-Path -LiteralPath $manifestPath) {
    try {
      $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
      if ($manifest.app -eq 'NexaChat') {
        return $true
      }
    } catch {
      return $false
    }
  }
  return Test-Path -LiteralPath (Join-Path $PathValue 'NexaChat.exe')
}

function Assert-SafeInstallRoot([string]$InstallPath, [string]$SourcePath) {
  $resolved = Resolve-FullPath $InstallPath
  $driveRoot = [System.IO.Path]::GetPathRoot($resolved).TrimEnd('\', '/')
  $trimmed = $resolved.TrimEnd('\', '/')
  if (Test-IsSamePath $trimmed $driveRoot) {
    throw "InstallRoot cannot be a drive root: $resolved"
  }
  $leaf = [System.IO.Path]::GetFileName($trimmed)
  if ($leaf -ne 'NexaChat') {
    throw "InstallRoot must be a NexaChat-specific application directory ending in NexaChat: $resolved"
  }
  $protectedExactRoots = @(
    $env:USERPROFILE,
    [Environment]::GetFolderPath('LocalApplicationData'),
    [Environment]::GetFolderPath('ApplicationData'),
    $env:TEMP
  ) | Where-Object { $_ }
  foreach ($protectedRoot in $protectedExactRoots) {
    if (Test-IsSamePath $trimmed $protectedRoot) {
      throw "InstallRoot cannot be a protected user/profile root: $resolved"
    }
  }
  $protectedTrees = @(
    [Environment]::GetFolderPath('Desktop'),
    [Environment]::GetFolderPath('MyDocuments'),
    (Join-Path $env:USERPROFILE 'Downloads')
  ) | Where-Object { $_ }
  foreach ($protectedTree in $protectedTrees) {
    if (Test-IsSameOrChildPath $trimmed $protectedTree) {
      throw "InstallRoot cannot be Desktop, Documents, Downloads, or one of their children: $resolved"
    }
  }
  if (Test-IsSameOrChildPath $trimmed $SourcePath) {
    throw "InstallRoot cannot be inside SourceRoot: $resolved"
  }
  if ((Test-Path -LiteralPath $trimmed) -and -not (Test-IsVerifiedNexaChatInstall $trimmed)) {
    $child = Get-ChildItem -LiteralPath $trimmed -Force -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($child) {
      throw "InstallRoot already exists but is not a verified NexaChat install directory: $resolved"
    }
  }
}

function Remove-AppOwnedEntry([string]$InstallPath, [string]$EntryName) {
  if ([string]::IsNullOrWhiteSpace($EntryName)) {
    return
  }
  $target = Resolve-FullPath (Join-Path $InstallPath $EntryName)
  if (-not (Test-IsSameOrChildPath $target $InstallPath)) {
    throw "Refusing to remove path outside InstallRoot: $target"
  }
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
}

$resolvedSource = Resolve-FullPath $SourceRoot
$resolvedInstall = Resolve-FullPath $InstallRoot
$resolvedDesktop = Resolve-FullPath $DesktopRoot
$sourceExe = Join-Path $resolvedSource 'NexaChat.exe'

if (-not (Test-Path -LiteralPath $sourceExe)) {
  throw "Packaged executable is missing: $sourceExe"
}

Assert-SafeInstallRoot $resolvedInstall $resolvedSource

$sourceEntries = @(Get-ChildItem -LiteralPath $resolvedSource -Force | ForEach-Object { $_.Name })
$ownedEntries = New-Object System.Collections.Generic.HashSet[string]
foreach ($entry in $sourceEntries) {
  [void]$ownedEntries.Add($entry)
}
[void]$ownedEntries.Add('install-manifest.json')

$previousManifestPath = Join-Path $resolvedInstall 'install-manifest.json'
if (Test-Path -LiteralPath $previousManifestPath) {
  try {
    $previousManifest = Get-Content -LiteralPath $previousManifestPath -Raw | ConvertFrom-Json
    if ($previousManifest.app -eq 'NexaChat' -and $previousManifest.installedEntries) {
      foreach ($entry in $previousManifest.installedEntries) {
        [void]$ownedEntries.Add([string]$entry)
      }
    }
  } catch {
    throw "Existing install manifest is unreadable; refusing to overwrite without verification: $previousManifestPath"
  }
}

New-Item -ItemType Directory -Force -Path $resolvedInstall | Out-Null
foreach ($entry in $ownedEntries) {
  Remove-AppOwnedEntry $resolvedInstall $entry
}
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
  installedEntries = $sourceEntries
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
