import { execFileSync } from 'node:child_process';
import {
  assertExists,
  getDesktopShortcutPath,
  getLocalShortcutExpectation,
  getPackagedShortcutExpectation,
} from './desktop-entry.mjs';

const targetFlagIndex = process.argv.indexOf('--target');
const target = targetFlagIndex >= 0 ? process.argv[targetFlagIndex + 1] : 'local';
if (!['local', 'packaged'].includes(target)) {
  throw new Error(`Unsupported shortcut target: ${target}`);
}
const expectation = target === 'packaged' ? getPackagedShortcutExpectation() : getLocalShortcutExpectation();
const shortcutPath = getDesktopShortcutPath();

if (target === 'packaged') {
  assertExists(expectation.targetPath, 'Packaged shortcut target');
}
const [iconPath] = expectation.iconLocation.split(',');
assertExists(iconPath, 'Shortcut icon');

const script = `
$shortcutPath = ${JSON.stringify(shortcutPath)}
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = ${JSON.stringify(expectation.targetPath)}
$shortcut.Arguments = ${JSON.stringify(expectation.arguments)}
$shortcut.WorkingDirectory = ${JSON.stringify(expectation.workingDirectory)}
$shortcut.IconLocation = ${JSON.stringify(expectation.iconLocation)}
$shortcut.Save()
[pscustomobject]@{
  TargetPath = $shortcut.TargetPath
  Arguments = $shortcut.Arguments
  WorkingDirectory = $shortcut.WorkingDirectory
  IconLocation = $shortcut.IconLocation
} | ConvertTo-Json -Compress
`;

const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
console.log(`Shortcut updated for ${target}: ${output.trim()}`);
