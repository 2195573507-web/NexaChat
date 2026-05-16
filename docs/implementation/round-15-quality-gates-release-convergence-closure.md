# Round 15 Test System, Quality Gates And Release Convergence Closure

Date: 2026-05-16

Status: Completed as implementation, verification, closeout, push, and remote confirmation; delivery commit `938d017ceede16475369a537227b86be7096b9cc`; closeout commit `4715788e416f97b79328413c3821287cfcafce0b`.

## Root-Cause And Chain Review

Round 15 addressed the release risk that tests existed but were still spread across individual scripts and previous round habits. Bugs could escape through stale docs, duplicate routes, lingering route aliases, raw UI text, route leaks, unsafe shell/code patterns, secret-like fixtures outside tests, package entry drift, or shortcut smoke cleanup races.

Implemented chain:

- `QUALITY_GATE_DEFINITIONS` authority -> package scan scripts -> `verify:release`.
- `verify:release` -> typecheck, unit tests, build, UI smoke, Electron smoke, package release, desktop-entry smoke, scanner suite, docs freshness check, and `git diff --check`.
- Scanner suite -> hardcoded text/token/route leak checks, duplicate authority checks, security checks, dead local Markdown link checks, and blueprint/progress freshness checks.
- Desktop smoke helpers -> shared `closeElectronApp()` cleanup -> no leftover smoke Electron process between package, installer, and shortcut checks.

## Main Changes

- Added `src/shared/qualityGates.ts` as the authority for release gate IDs, commands, risk class, and protected chain.
- Added `scripts/quality-gates.mjs` with `hardcode`, `duplicates`, `security`, `dead-links`, `docs`, `all-scans`, and `release` modes.
- Added package scripts for `scan:hardcode`, `scan:duplicates`, `scan:security`, `scan:dead-links`, `scan:docs`, `scan:quality`, and `verify:release`.
- Added `tests/quality-gates.test.ts` to lock gate order and package script exposure.
- Removed milestone-expired legacy route aliases from `src/shared/navigation.ts`, preserving only the root fallback `/ -> /workspace/overview`.
- Updated navigation/UI smoke tests so old routes fall back through current route resolution instead of relying on legacy alias chains.
- Replaced a hardcoded Chinese fallback check in `src/main/repositories/mappers.ts` with an English structured fallback.
- Centralized Electron smoke cleanup in `scripts/desktop-entry.mjs` and reused it from Electron, package, and installer smoke scripts.

## Deleted Or Replaced Old Links

- Deleted Round 15 milestone legacy route aliases for old dashboard, settings, gateway, data, chat, models, knowledge, and tools routes.
- Replaced the legacy-alias compatibility expectation with unknown-route fallback to the active module default tab.
- Kept only the root route alias because `/` is the canonical app entry fallback, not a legacy module route.
- Did not add lint-only or docs-only bypasses for failed gates.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run verify:release` | Passed; covered typecheck, 18 Vitest files / 55 tests, production build, 16 Playwright UI smoke tests, Electron smoke, package release, package smoke, installer smoke, packaged shortcut readback, hardcode scan, duplicate scan, security scan, dead-link scan, docs scan, and `git diff --check` |
| `git diff --check` | Passed as part of `verify:release`, with LF/CRLF conversion warnings only |

Desktop shortcut check:

- `C:/Users/鑷充翰/Desktop/NexaChat.lnk` exists.
- TargetPath: `D:/NexaChat/release/win-unpacked/NexaChat.exe`.
- Arguments: empty.
- WorkingDirectory: `D:/NexaChat/release/win-unpacked`.
- IconLocation resolves to `D:/NexaChat/assets/app-icon.ico,0`.
- The shortcut remains the packaged Round 14 entry and is covered by `npm.cmd run test:desktop-entry` inside `npm.cmd run verify:release`.

## Acceptance Result

Passed. The implemented gate suite is configured and wired into `verify:release`, the current release rerun passed, docs freshness is enforced by the gate itself, packaged desktop entry smoke passed, and the expired legacy route aliases are removed.

## Commit

- Delivery commit hash: `938d017ceede16475369a537227b86be7096b9cc`.
- Closeout commit hash: `4715788e416f97b79328413c3821287cfcafce0b`.
- Push result: Round 15 delivery and closeout commits pushed; `origin/main` confirmed at `4715788e416f97b79328413c3821287cfcafce0b` before the final acceptance commit.
- Remaining issues: None for Round 15. Final overall acceptance commit remains.
