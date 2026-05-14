# Round 3 Global UI And Design System Closure

Date: 2026-05-14

Status: Completed.

## Root-Cause And Chain Review

Round 3 addressed the design-system gap identified in Round 0: `styles.css` already had root CSS variables, but several state surfaces still used local literal colors and raw radius values. The downstream risk was that later i18n/theme rounds could keep adding page-specific visual values without a test gate.

Chain reviewed:

- Theme mode and token names.
- CSS variable declarations for light and dark rendering.
- Shared shell, sidebar, state badges, chat bubbles, code snippets, planned panels, and secret notices.
- UI smoke responsive checks.
- Static token authority tests.

## Main Changes

- Added `src/shared/theme.ts` as the typed theme/token authority.
- Added semantic tokens for on-primary text, focus ring, primary soft state, planned state, code blocks, one-time secret notices, and pill radius.
- Replaced remaining local literal colors and raw `6px` / `8px` / `999px` border radii in renderer CSS with semantic variables.
- Added `tests/theme-token-authority.test.ts` to keep literal colors and raw radii inside token definitions only.
- Extended UI smoke visual coverage to capture workspace screenshots at 1040, 1280, 1440, and 1920 widths under ignored `test-results/round-03-design-system/`.
- Documented the authority chain in `docs/architecture/design-token-authority.md`.

## Deleted Old Links

- Removed local CSS literals for active chat rows, user message bubbles, planned panels, code snippets, secret notices, right rail, diagnosis blocks, endpoint chips, and pill indicators.
- No business behavior or data chain was changed.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test -- tests/theme-token-authority.test.ts` | Passed, 1 file / 3 tests |
| `npm.cmd run test` | Passed, 4 files / 15 tests |
| `npm.cmd run build` | Passed |
| `npm.cmd run test:ui-smoke` | Passed, 10 Playwright tests |
| `npm.cmd run test:electron-smoke` | Passed |
| `npm.cmd run verify` | Passed |
| `git diff --check` | Passed with CRLF conversion warnings only |

Responsive screenshot checks:

- `test-results/round-03-design-system/workspace-1040.png`
- `test-results/round-03-design-system/workspace-1280.png`
- `test-results/round-03-design-system/workspace-1440.png`
- `test-results/round-03-design-system/workspace-1920.png`

In-app browser verification:

- Browser plugin workflow was attempted twice against `http://127.0.0.1:5173/workspace/overview`, but the in-app browser connection timed out before returning page state.
- Equivalent UI verification is covered by the passing Playwright UI smoke run and generated responsive screenshots.

Desktop shortcut check:

- `C:/Users/至亲/Desktop/NexaChat.lnk` targets `D:/NexaChat/node_modules/electron/dist/electron.exe`.
- Arguments: `"D:/NexaChat"`.
- WorkingDirectory: `D:/NexaChat`.
- IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
- No shortcut was modified.

## Acceptance Result

Passed. Round 3 establishes a design token authority, removes local color/radius hardcoding outside token declarations, keeps the shell responsive at the required widths, and preserves existing business behavior.

## Commit

- Commit hash: `7a89160d0c83733b80176cda7643cc401e2dcdd2`.
- Push result: `origin/main` confirmed at `7a89160d0c83733b80176cda7643cc401e2dcdd2`.
- Remaining issues: Round 4 still owns full i18n migration; Round 5 still owns runtime light/dark/system switching behavior.
