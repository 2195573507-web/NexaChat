import { execFileSync } from 'node:child_process';
import {
  getDesktopShortcutPath,
  getLocalShortcutExpectation,
  getPackagedShortcutExpectation,
  normalizeForCompare,
  normalizeShortcutIconLocation,
} from './desktop-entry.mjs';

const shortcutPath = getDesktopShortcutPath();
const targetFlagIndex = process.argv.indexOf('--target');
const target = targetFlagIndex >= 0 ? process.argv[targetFlagIndex + 1] : 'local';
if (!['local', 'packaged'].includes(target)) {
  throw new Error(`Unsupported shortcut target: ${target}`);
}
const expectation = target === 'packaged' ? getPackagedShortcutExpectation() : getLocalShortcutExpectation();

const script = `
$shortcutPath = ${JSON.stringify(shortcutPath)}
$shell = New-Object -ComObject WScript.Shell
if (-not (Test-Path -LiteralPath $shortcutPath)) {
  [pscustomobject]@{ Exists = $false; TargetPath = ''; Arguments = ''; WorkingDirectory = ''; IconLocation = '' } | ConvertTo-Json -Compress
  exit 0
}
$shortcut = $shell.CreateShortcut($shortcutPath)
[pscustomobject]@{
  Exists = $true
  TargetPath = $shortcut.TargetPath
  Arguments = $shortcut.Arguments
  WorkingDirectory = $shortcut.WorkingDirectory
  IconLocation = $shortcut.IconLocation
} | ConvertTo-Json -Compress
`;

const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
const shortcut = JSON.parse(output);

if (!shortcut.Exists) {
  throw new Error(`Desktop shortcut is missing: ${shortcutPath}`);
}

const failures = [];
if (normalizeForCompare(shortcut.TargetPath) !== normalizeForCompare(expectation.targetPath)) {
  failures.push(`TargetPath expected ${expectation.targetPath}, got ${shortcut.TargetPath}`);
}
if (shortcut.Arguments !== expectation.arguments) {
  failures.push(`Arguments expected ${expectation.arguments}, got ${shortcut.Arguments}`);
}
if (normalizeForCompare(shortcut.WorkingDirectory) !== normalizeForCompare(expectation.workingDirectory)) {
  failures.push(`WorkingDirectory expected ${expectation.workingDirectory}, got ${shortcut.WorkingDirectory}`);
}
if (normalizeShortcutIconLocation(shortcut.IconLocation) !== expectation.iconLocation) {
  failures.push(`IconLocation expected ${expectation.iconLocation}, got ${shortcut.IconLocation}`);
}

if (failures.length) {
  throw new Error(`Shortcut readback failed:\n${failures.join('\n')}`);
}

console.log(`Shortcut readback passed for ${shortcutPath} (${target})`);
