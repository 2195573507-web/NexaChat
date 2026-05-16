# Round 13 Observability, Usage, Logs, Feedback And Evaluation Closure

Date: 2026-05-16

Status: Completed as implementation and verification; delivery commit `8a94f74892705d39e4107c3c24a0878bb9a36f09`; closeout commit pending.

## Root-Cause And Chain Review

Round 13 addressed the gap where request logs, usage records, gateway logs, audit logs, execution traces, and retrieval traces existed, but they did not have one privacy-first observability authority. Provider health history, feedback, eval sets/results, privacy settings, and redacted observability export were also missing. The UI routed usage, feedback, and evals through unrelated old aliases, which made the feature look planned rather than executable.

Implemented chain:

- Chat/provider/gateway/eval execution -> request logs, usage records, gateway logs, provider health records.
- Audit, execution trace, and knowledge retrieval records -> observability snapshot inputs.
- Store query -> `observabilityRuntime` aggregation -> Gateway usage page and Settings pages.
- Feedback/eval/privacy/export actions -> main-process permission check -> Store guard -> audit event.
- Export request -> redaction authority -> local JSON payload with secrets, prompt snippets, and local paths redacted by default.

Production evaluation calls the real OpenAI-compatible Provider path. Browser mock only simulates that chain for UI smoke mode.

## Main Changes

- Added `src/shared/observabilityRuntime.ts` as the authority for metrics, log event types, feedback labels, eval statuses, retention/export policy, query normalization, aggregation, and redaction.
- Added `provider_health_records`, `feedback_items`, `eval_sets`, and `eval_results` schema/migration support.
- Extended shared types, mappers, snapshot arrays, security permissions, API, IPC, preload, and main handlers for observability actions.
- Implemented Store methods for observability query, feedback creation, real Provider-backed eval runs, privacy settings, and redacted export.
- Recorded provider health from provider tests, chat calls, gateway-linked request logs, and eval runs.
- Added a default eval set without creating fake production Provider or model data.
- Reworked browser mock parity for observability state and actions.
- Added `/gateway/usage`, `/settings/feedback`, `/settings/evals`, and `/settings/observability` as focused second-level pages.
- Kept execution traces in Tools Run Center and reused them as observability inputs instead of duplicating trace storage.
- Updated dashboard token breakdown to use i18n rather than local hardcoded `in / out` text.
- Added observability runtime/store tests and extended IPC, app, i18n, and UI smoke coverage.

## Deleted Or Replaced Old Links

- Replaced `/settings/usage -> /gateway/logs` with `/settings/usage -> /gateway/usage`.
- Replaced `/settings/evals -> /models/router` with `/settings/evals`.
- Replaced `/settings/feedback -> /settings/audit` with `/settings/feedback`.
- Did not add a ninth Observability sidebar module.
- Did not add duplicate request log or gateway log tables.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test -- tests/observability-runtime.test.ts tests/observability-store.test.ts tests/ipc-contract.test.ts tests/app.test.tsx tests/i18n-authority.test.ts` | Passed, 5 files / 15 tests |
| `npm.cmd run test:ui-smoke` | Passed, 16 Playwright tests |
| `npm.cmd run test` | Passed, 16 files / 50 tests |
| First `npm.cmd run build` | Failed because a new test fixture used an invalid trace event type and stale retrieval trace field |
| Rerun `npm.cmd run build` | Passed |
| `npm.cmd run verify` | Passed, including typecheck, full unit test suite, and build |
| `npm.cmd run test:electron-smoke` | Passed, Electron shell rendered |
| `git diff --check` | Passed with LF/CRLF conversion warnings only |

Desktop shortcut check:

- `C:/Users/至亲/Desktop/NexaChat.lnk` exists.
- TargetPath: `D:/NexaChat/node_modules/electron/dist/electron.exe`.
- Arguments: `"D:/NexaChat"`.
- WorkingDirectory: `D:/NexaChat`.
- IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
- No shortcut was modified.

## Acceptance Result

Passed at the targeted Round 13 boundary. Usage, request logs, gateway logs, Provider health, errors, feedback, evals, trace inputs, privacy settings, and redacted exports now share one local observability model. The UI exposes observability through existing module surfaces close to the repair action, without duplicate log storage or cloud telemetry.

## Commit

- Delivery commit hash: `8a94f74892705d39e4107c3c24a0878bb9a36f09`.
- Closeout commit hash: pending.
- Push result: pending.
- Remaining issues: None for Round 13. Round 14 owns packaged desktop entry, installer/package artifact, shortcut script/check, crash recovery, and release diagnostics.
