# Round 8 Local Gateway And API Key Closure

Date: 2026-05-16

Status: Completed as implementation, verification, closeout, push, and remote confirmation.

## Root-Cause And Chain Review

Round 8 addressed the Gateway control-plane gap left after the real Provider chain and conversation lifecycle landed. The root problem was that `/v1/*` forwarding worked, but endpoint paths, scopes, key states, quota/rate policy, error codes, logs, and import/rollback behavior were scattered across Store, HTTP Gateway, UI, schema, and tests.

Implemented chain:

- External client -> bearer token parse -> Gateway key authorization.
- Authorization -> key state, scope, quota, rate-window, expiry, and revoke checks.
- Gateway endpoint -> router/provider chain for chat, local model list for models, lexical compatibility fallback for embeddings, reserved `/v1/responses`.
- Response -> Gateway log with key preview, scope, error code, latency, redacted headers, and linked request log.
- Gateway UI -> create/update/disable/rotate/revoke key lifecycle with one-time reveal.
- Data import -> preflight -> rollback snapshot -> metadata apply -> rollback disable of imported metadata.

## Main Changes

- Added `src/shared/gatewayRuntime.ts` as the authority for Gateway endpoints, scopes, key states, quota/rate policy, body limit, error codes, and default key policy.
- Added additive schema migrations in `src/main/database/connection.ts` for existing local databases.
- Extended `gateway_api_keys`, `gateway_logs`, and `config_snapshots` schema/mappers/types with key state, rotation, rate limit, attribution, error, source, rollback, and applied-entity metadata.
- Extended shared API/IPC/preload/main handlers with `updateGatewayKey`, `rotateGatewayKey`, policy-aware `createGatewayKey`, and apply/restore options.
- Updated Store to support create/update/disable/rotate/revoke, scope/quota/rate/expiry authorization, persistent Gateway enabled state, attributed Gateway logs, import metadata apply, rollback snapshot creation, and rollback disable of imported metadata.
- Updated HTTP Gateway with OpenAI-compatible error shapes for missing/invalid/disabled/revoked/expired/scope/quota/rate/body/json/not-found/reserved/provider/internal states, OPTIONS/CORS handling, body-size limit, and key-attributed logs.
- Updated Gateway UI for key name, scopes, quota, rate limit, lifecycle state, disable/enable, rotate, revoke, one-time reveal, and richer Gateway event logs.
- Updated Data UI to apply import metadata and expose rollback application.
- Updated browser mock API to match the new AppApi contract for UI-smoke mode.
- Added `tests/gateway-runtime.test.ts` for Round 8 key lifecycle, auth/scope/quota/rate, logging, import apply, and rollback.

## Deleted Or Replaced Old Links

- Replaced Gateway endpoint/scope/error duplication with `src/shared/gatewayRuntime.ts`.
- Replaced the old binary available/revoked UI state with real Gateway key states.
- Replaced the old preview-only import apply path with metadata apply plus rollback snapshot.
- Replaced the old restore preview-only path with a rollback mode that disables imported provider/model metadata.
- Kept Provider API keys separate from Gateway API keys; no plaintext Gateway key is available after one-time reveal.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test -- tests/gateway-runtime.test.ts tests/gateway-provider-chain.test.ts tests/ipc-contract.test.ts tests/i18n-authority.test.ts` | Passed, 4 files / 10 tests |
| `npm.cmd run test` | Passed, 10 files / 33 tests |
| `npm.cmd run test:ui-smoke` | Passed, 11 Playwright tests |
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

Passed at the Round 8 boundary. A valid Gateway key can call the local Gateway, missing/invalid/revoked/disabled/scope/rate-limited keys fail with explicit OpenAI-compatible errors, Gateway logs are redacted and key-attributed, key rotation has one-time reveal semantics, and import metadata application is reversible through rollback.

## Commit

- Delivery commit hash: `bc5aaf67b245ce4ac1ff21c810eed06cd5cb8fe9`.
- Closeout commit hash: `68720bfebe9cc74c047e5097176d012d3d04dda9`.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `68720bfebe9cc74c047e5097176d012d3d04dda9`.
- Remaining issues: None for Round 8. Round 9 owns full Knowledge/RAG, real embeddings, vector index, parser pipeline, citations, and file delete/rebuild behavior.
