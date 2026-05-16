# Round 12 Data Config, Import/Export, Backup And Recovery Closure

Date: 2026-05-16

Status: Completed as implementation and verification; delivery commit hash pending.

## Root-Cause And Chain Review

Round 12 addressed the data mobility gap where import preview, snapshots, restore preview, diagnostics, and Agent cleanup previews all shared `config_snapshots` records. That path could not safely represent export profiles, encrypted backup packages, restore preflight, conflict records, migration compatibility, rollback states, or permission-gated recovery without overloading action strings and summary text.

Implemented chain:

- Export request -> shared `dataRuntime` authority -> Store payload builder -> redacted package or encrypted backup package.
- Backup package -> restore preflight -> manifest normalization -> conflict map -> restore diff summary.
- Import plan -> rollback snapshot -> metadata apply -> rollback record -> rollback action with confirmation.
- Data action -> main-process permission check -> Store guard -> structured mobility job -> audit event.
- Data UI -> import, backup, restore, rollback, diagnostics, and cleanup pages backed by structured job fields, not summary-text filtering.

Plaintext secrets remain excluded from export payloads. Encrypted backups use the main process for AES-256-GCM encryption and PBKDF2 key derivation, keeping crypto out of the renderer.

## Main Changes

- Added `src/shared/dataRuntime.ts` as the authority for manifest version, operation kinds, backup profiles, conflict types, conflict strategies, rollback states, migration version, wizard steps, redaction rules, stable hashes, package creation, manifest normalization, and restore diff summaries.
- Added `data_mobility_jobs`, `data_conflicts`, `data_backups`, `migration_runs`, and `rollback_records` schema and migration support.
- Added shared types, mappers, snapshot arrays, API/IPC/preload/main handlers for data jobs, conflicts, backups, migrations, rollback records, export package creation, encrypted backup, restore preflight, and rollback.
- Kept existing `validateImportManifest`, `applyImportPlan`, `createSnapshot`, `restoreSnapshot`, and `exportDiagnostics` compatibility while backing them with structured Round 12 records.
- Implemented encrypted backup creation with AES-256-GCM, PBKDF2 passphrase derivation, redacted package payloads, manifest hash, and invalid/wrong backup errors.
- Implemented restore preflight from a stored backup or pasted package text with structured diff and conflict records.
- Implemented rollback records that disable only entities created by the import plan.
- Reworked the Data module navigation from `import/snapshots/diagnostics/cleanup` to `import/backup/restore/rollback/diagnostics/cleanup`; `/data/snapshots` is now a legacy alias to the first-class `/data/backup` route.
- Rebuilt Data UI around structured import/export, encrypted backup, restore preflight, conflicts, rollback, diagnostics, and cleanup boundaries.
- Updated browser mock parity for data mobility jobs, conflicts, backups, migrations, rollback records, encrypted backup, restore preflight, and rollback.
- Added `tests/data-runtime.test.ts` and extended IPC and UI smoke coverage.

## Deleted Or Replaced Old Links

- Replaced `cleanup-preview` as the production restore/rollback action with `restore-preflight` and `rollback`.
- Replaced summary-text restore filtering with `operationKind` and rollback records.
- Replaced `/data/backup -> /data/snapshots` alias direction with `/data/snapshots -> /data/backup`.
- Replaced preview-only import/apply state with structured jobs, conflicts, migration records, backup records, and rollback records.
- Kept `config_snapshots` as compatibility history only for older snapshot/import/diagnostic records.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test -- tests/data-runtime.test.ts tests/ipc-contract.test.ts tests/app.test.tsx tests/gateway-runtime.test.ts` | Passed, 4 files / 17 tests |
| `npm.cmd run test` | Passed, 14 files / 47 tests |
| `npm.cmd run test:ui-smoke` | Passed, 15 Playwright tests after fixing browser mock restore-preflight parity and showing operation kind in the restore table |
| `npm.cmd run build` | Passed |
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

Passed at the targeted Round 12 boundary. Export/import and encrypted backup now use one structured data mobility authority, redacted packages, permission-gated actions, restore preflight, conflict records, migration records, rollback records, and audit events. Recovery actions do not silently overwrite user data or export plaintext secrets.

## Commit

- Delivery commit hash: pending.
- Closeout commit hash: pending.
- Push result: pending.
- Remaining issues: None for Round 12. Round 13 owns observability aggregation, provider health history, feedback, evaluation, trace dashboard, privacy settings, and retention.
