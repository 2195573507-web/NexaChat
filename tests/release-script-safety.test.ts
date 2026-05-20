import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

describe('release script safety source gates', () => {
  it('keeps installer generation guarded against dangerous InstallRoot paths', () => {
    const source = readFileSync(join(repoRoot, 'scripts/create-installer-script.mjs'), 'utf8');

    expect(source).toContain('Assert-SafeInstallRoot');
    expect(source).toContain('InstallRoot cannot be a drive root');
    expect(source).toContain('Desktop, Documents, Downloads');
    expect(source).toContain('not a verified NexaChat install directory');
    expect(source).toContain('Refusing to remove path outside InstallRoot');
    expect(source).toContain('Remove-AppOwnedEntry');
    expect(source).not.toMatch(/Get-ChildItem\s+-LiteralPath\s+\$resolvedInstall[\s\S]{0,120}Remove-Item\s+-Recurse\s+-Force/);
  });

  it('keeps release safety scan read-only and wired into release gates', () => {
    const source = readFileSync(join(repoRoot, 'scripts/quality-gates.mjs'), 'utf8');
    const releaseCase = source.slice(source.indexOf("case 'release':"), source.indexOf('default:'));

    expect(source).toContain('async function scanReleaseSafety');
    expect(source).toContain('NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE');
    expect(source).toContain('NEXACHAT_ELECTRON_SMOKE=1 cannot be used as proof of release secret storage');
    expect(source).toContain('PACKAGER_FORBIDDEN_COPY_ITEMS');
    expect(source).toContain("case 'release-safety':");
    expect(releaseCase).toContain('scanReleaseSafety()');
    expect(releaseCase.indexOf('scanReleaseSafety()')).toBeLessThan(releaseCase.indexOf("runCommandGate('npm.cmd', ['run', 'package:release'])"));
  });
});
