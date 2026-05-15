# Round 5 Dark Light And System Theme Closure

Date: 2026-05-15

Status: Completed.

## Root-Cause And Chain Review

Round 5 addressed the runtime gap left after the token and i18n rounds: `UiPreferences.theme` already allowed `system`, and Settings could save it, but the shell only applied `theme-dark` when the stored value was exactly `dark`. That made `system` behave like light mode and gave tests no visible way to distinguish the stored mode from the resolved mode.

Chain reviewed:

- Settings preference form -> `api.saveUiPreferences`.
- Renderer/browser mock and main-process preference persistence.
- Stored theme value normalization.
- `prefers-color-scheme` listener.
- Resolved shell class and DOM attributes.
- CSS token parity and UI smoke coverage.

## Main Changes

- Extended `src/shared/theme.ts` with `ResolvedThemeMode`, `normalizeThemeMode`, `resolveThemeMode`, and `getThemeClass`.
- Changed `UiPreferences.theme` to use the shared `ThemeMode` type.
- Updated main-process preference mapping and saving to normalize unknown/stale theme values to `system`.
- Updated browser mock preference saving to use the same normalization as the real store.
- Updated `AppShell` to listen to `prefers-color-scheme`, resolve `system` live, and expose `data-theme-mode` plus `data-resolved-theme`.
- Strengthened theme-token tests to cover resolver behavior and require every color token in both `:root` and `.theme-dark`.
- Extended UI smoke to verify dark, light, and follow-system behavior, including a simulated OS theme change without resetting language or density.

## Deleted Old Links

- Removed the shell behavior that treated every non-`dark` theme value as `theme-light`.
- Removed the browser mock divergence where invalid theme values could be stored without normalization.
- No database schema, Provider, chat, Gateway, navigation, or packaging behavior was changed.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test -- tests/theme-token-authority.test.ts` | Passed, 1 file / 5 tests |
| `npm.cmd run test` | Passed, 5 files / 20 tests |
| `npm.cmd run build` | Passed |
| `npm.cmd run test:ui-smoke` | Passed, 11 Playwright tests |
| `npm.cmd run test:electron-smoke` | Passed |
| `npm.cmd run verify` | Passed |
| `git diff --check` | Passed with CRLF conversion warnings only |

Responsive/theme screenshot checks:

- `test-results/round-05-theme-runtime/dark-en-preferences.png`
- `test-results/round-05-theme-runtime/light-en-preferences.png`
- `test-results/round-05-theme-runtime/system-light-en-preferences.png`

Desktop shortcut check:

- `C:/Users/至亲/Desktop/NexaChat.lnk` targets `D:/NexaChat/node_modules/electron/dist/electron.exe`.
- Arguments: `"D:/NexaChat"`.
- WorkingDirectory: `D:/NexaChat`.
- IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
- No shortcut was modified.

## Acceptance Result

Passed. Round 5 establishes a real runtime theme resolver, keeps Settings persistence unified, and makes system-theme resolution observable and testable without touching later feature rounds.

## Commit

- Commit hash: Pending.
- Push result: Pending.
- Remaining issues: Round 6 still owns the real Provider/model invocation chain. Round 14 still owns production packaging and packaged shortcut migration.
