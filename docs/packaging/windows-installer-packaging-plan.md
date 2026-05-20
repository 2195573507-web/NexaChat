# Windows Installer Packaging Plan

## Fallback Status

This document records the release-packaging plan prepared while waiting for other NexaChat work to finish on 2026-05-20. Packaging implementation was intentionally deferred because the repository did not pass the wait gate within the allowed 60 minutes: the worktree became clean and `main` matched `origin/main`, but repository-owned Vite/esbuild processes were still running from this checkout.

No source, runtime, IPC, database, route, provider, Gateway, Knowledge Base, Tools/Agent, or UI behavior changes are part of this document.

## Current Production Build Shape

- Electron production entry: `dist-electron/main/index.js` from `package.json#main`.
- Renderer production output: `dist` from `vite build`.
- Main/preload/shared Electron output: `dist-electron` from `tsc -p tsconfig.main.json`.
- Production renderer loading: `src/main/index.ts` serves `dist` through the `nexachat://app/index.html` protocol when `VITE_DEV_SERVER_URL` is absent.
- Existing icon assets: `assets/app-icon.ico` and `assets/app-icon.png`.
- Existing release output directory: `release/`, ignored by git.
- Existing desktop metadata is duplicated between `src/shared/desktopEntry.ts` and `scripts/desktop-entry.mjs`; any packaging metadata change must keep these authorities aligned until they are consolidated.
- The current app id is `local.nexachat`; the installer implementation should move release metadata to a stable reverse-DNS id such as `com.nexachat.desktop`.

## Recommended Packaging Stack

Use `electron-builder` for the Windows `.exe` installer because the repository is already an Electron/Vite app and does not have a maintained Forge or builder configuration. Keep the existing custom unpacked package scripts only if they remain useful for smoke tests during the migration.

The existing `package:release` path produces `release/win-unpacked`, `release/NexaChat-Setup.ps1`, and `release/release-manifest.json`; it does not produce a Windows `.exe` installer. The generated PowerShell installer script must not be treated as the production installer because it accepts an arbitrary `-InstallRoot` and clears that directory before copying files. If the script remains for internal smoke testing, add dangerous-path rejection separately; the real release artifact should come from NSIS/electron-builder.

Recommended dependency:

```powershell
npm.cmd install --save-dev electron-builder@26.8.1
```

Recommended Windows target:

- Target: NSIS installer.
- Architecture: x64.
- Output directory: `release/`.
- Artifact naming: `NexaChat-0.1.0-win-x64-setup.exe` style, generated from product name, version, platform, architecture, and extension.

## Planned Installer Metadata

- `productName`: `NexaChat`.
- `appId`: use a stable reverse-DNS id such as `com.nexachat.desktop`.
- Company/publisher metadata: keep explicit but do not claim a signed publisher unless signing credentials are configured.
- Icon: `assets/app-icon.ico`.
- Shortcut name: `NexaChat`.
- Start Menu shortcut: enabled.
- Desktop shortcut: enabled or offered by the NSIS flow.
- Uninstall: supported by NSIS.
- App data on uninstall: preserve user data by default; do not delete user SQLite databases or user secrets.
- Installer language: default NSIS language unless a verified localization requirement is added.

## Planned File Inclusion Rules

The packaged app should include only production runtime files:

- `dist/**`
- `dist-electron/**`
- `assets/app-icon.ico`
- `assets/app-icon.png`
- minimal package metadata needed by Electron

The installer must exclude:

- local user data and `NexaChatData/`
- SQLite databases: `*.sqlite`, `*.sqlite3`, `*.db`, `*.db-journal`, `*.sqlite-journal`, `*.wal`, `*.shm`
- `.env*`, API keys, certificates, signing secrets, tokens, logs, backups, caches
- `test-results/`, `coverage/`, `playwright-report/`
- previous `release/`, `dist` and `dist-electron` outside the intended packaged payload boundary
- source-only development files and tests unless a runtime dependency is proven to require them
- docs unless intentionally shipped in an about/help surface

The implementation should add an explicit artifact-content scan rather than relying on `.gitignore` or electron-builder defaults alone. At minimum, scan the unpacked payload and installer staging output for forbidden filenames/extensions and obvious secret patterns before declaring the package acceptable.

## Runtime Data Safety

NexaChat runtime data is created under Electron `app.getPath('userData')`, with test overrides using `NEXACHAT_DATA_DIR` or smoke-test user-data paths. The installer must not bundle any existing local runtime data. Validation should inspect both the unpacked app and installer contents for forbidden filenames and secret patterns.

Packaged smoke should also assert that release-like environments do not depend on `NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE=1` or `local-dev:v1` secret fallback. Existing smoke tests set `NEXACHAT_ELECTRON_SMOKE=1`, which is useful for launch verification but is not by itself proof of normal production safeStorage behavior.

## Validation Matrix

Before publishing a Windows installer, run:

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
npm.cmd run package:release
npm.cmd run test:desktop-entry
git diff --check
git status --short
```

After adding a real NSIS `.exe` installer command, add or run these checks as well:

- Confirm `release/*.exe` exists and matches the expected artifact naming pattern.
- Confirm `release/win-unpacked/resources/app` contains the production renderer, Electron main/preload output, icons, and package metadata.
- Confirm no forbidden files are present in the unpacked payload or installer archive inspection output.
- Confirm `package:release` or the new packaging script actually produces an `.exe`, not only `win-unpacked` and a PowerShell helper.
- Confirm release metadata authorities agree on product name, app id, icon path, packaged executable path, and artifact name.
- Run a packaged app smoke test when the Windows environment allows it.
- If running the installer is blocked by permissions, document the exact blocker and perform unpacked/package-content verification instead.

## Code Signing

No Windows code-signing certificate, signing secret, or publisher identity has been detected or configured. The first implementation should produce an unsigned installer unless valid signing credentials are provided. An unsigned installer is not fully signed-release ready and Windows SmartScreen may show an unknown publisher warning.

## Future Automation

Do not implement these items until credentials and release policy are available:

- GitHub Releases upload with `GH_TOKEN`/`GITHUB_TOKEN`.
- Windows code signing with a certificate or secure signing service.
- `electron-updater` and update feed metadata.
- macOS `.dmg` packaging, notarization, and signing.
- CI release workflow that builds installers from a clean checkout and publishes only verified artifacts.

## Implementation Gate For The Next Attempt

Before changing `package.json`, lockfiles, builder configuration, or scripts, require:

1. `git status --short` is empty.
2. `git status -sb` shows `main` aligned with `origin/main`.
3. `.git/index.lock` is absent.
4. No repo-owned `node`, `npm`, `electron`, `vite`, `vitest`, `playwright`, `esbuild`, build, test, or packaging processes are running.
5. Watched files under `package.json`, `package-lock.json`, `src`, `docs`, `dist`, `dist-electron`, `release`, `build`, `coverage`, and `test-results` remain stable across three consecutive checks.
