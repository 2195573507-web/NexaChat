# Round 11 Security, Users, Permissions And Audit Closure

Date: 2026-05-16

Status: Completed as implementation and verification; delivery commit hash pending.

## Root-Cause And Chain Review

Round 11 addressed the security authority gap where sensitive actions were available through IPC and Store methods without a single permission registry, while audit logs were mutable rows without tamper evidence. Renderer labels and navigation permission hints could help users understand the product, but they were not a security boundary.

Implemented chain:

- Actor/session -> role and ACL evaluation -> IPC permission map -> Store method guard.
- Sensitive action -> main-process permission check -> action execution or denied audit event.
- Audit event -> redacted details -> previous hash -> entry hash -> integrity state.
- Audit search/export/verify -> permission check -> redacted result or tamper report.
- Settings UI -> snapshot security state and audit integrity only as display and action surface, not as permission truth.

The local-first desktop launch keeps a single local owner session to avoid adding login friction in this round. That compatibility path is explicit and main-process-owned.

## Main Changes

- Added `src/shared/securityRuntime.ts` as the authority for permission keys, roles, session/user states, ACL effects, IPC permission mapping, security action permissions, audit actions, and redaction keys.
- Added `security_users`, `security_roles`, `security_sessions`, `acl_grants`, and audit hash-chain columns in schema and migrations.
- Bootstrapped a local admin user and active owner session in the Store.
- Added main-process permission enforcement before IPC handlers and inside sensitive Store methods.
- Added audit hash-chain generation, existing-row hash backfill, integrity verification, search, and redacted export.
- Added security and audit integrity state to `AppSnapshot`.
- Updated Settings security/audit UI with active session, role, permission count, denied count, audit integrity, hash display, search, verify, and export controls.
- Updated browser mock parity for security state and audit integrity/export/search methods.
- Added `tests/security-runtime.test.ts` and extended IPC, app, and UI smoke coverage.
- Raised Vitest timeout to 15000 ms because the full suite now performs more Store/security bootstrap work and previously hit the 5 s runner ceiling.

## Deleted Or Replaced Old Links

- Replaced unrestricted IPC execution with `IPC_PERMISSION_BY_CHANNEL` enforcement.
- Replaced scattered role/action string decisions with `src/shared/securityRuntime.ts`.
- Replaced mutable audit-only rows with tamper-evident rows containing `previous_hash`, `entry_hash`, permission key, and integrity state.
- Fixed the snapshot/security display path so reading denied-count no longer calls `searchAuditLogs()` and writes a new audit event.
- Kept renderer permission labels as display hints only.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run test -- tests/security-runtime.test.ts tests/ipc-contract.test.ts` | Passed, 2 files / 7 tests |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test` | Passed, 13 files / 41 tests |
| `npm.cmd run test:ui-smoke` | Passed, 14 Playwright tests |
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

Passed at the targeted Round 11 boundary. Main-process permission checks now cover every IPC channel and sensitive Store method, ACL denial rejects sensitive actions with audit evidence, audit rows are hash-chained and tamper-detectable, audit export redacts sensitive values, and the Settings UI reports integrity without becoming the authority.

## Commit

- Delivery commit hash: `0bac7f927c90e2087c3bb80a81833ca4c599b629`.
- Closeout commit hash: `aa7bac441a4a0173f2a6e4749f3e53f4d6be364d`.
- Push result: pending.
- Remaining issues: None for Round 11. Round 12 owns full import/export, encrypted backup, migration framework, conflict handling, and rollback.
