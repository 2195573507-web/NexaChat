# Round 7 Conversation System And Multi-Model Experience Closure

Date: 2026-05-16

Status: Completed as implementation and verification; commit hash backfill pending.

## Root-Cause And Chain Review

Round 7 addressed the conversation lifecycle gap left after the real Provider chain landed in Round 6. The root problem was that `store.sendMessage()` persisted user and assistant messages as a one-shot operation, while context selection, stream chunks, retry/regenerate semantics, export records, attachment policy, and multi-model comparison had no shared authority.

Chain reviewed and implemented:

- Composer intent -> preload IPC -> shared `AppApi` and `IPC_CHANNELS`.
- Main-process Store method -> context builder -> router -> Provider adapter.
- Provider response -> message chunk records -> message/request log/usage/audit persistence.
- Snapshot refresh -> Chat UI timeline with message actions and lifecycle status.
- Conversation export -> `conversation_exports` record -> redacted markdown or JSON content.
- Multi-model compare -> same prompt fan-out through the same `sendMessage` chain, with separate request logs and usage records.

## Main Changes

- Added `src/shared/conversationRuntime.ts` as the authority for message roles, message status, chunk status/type, export formats, attachment policy, and context strategy limits.
- Extended `src/shared/types.ts`, `src/shared/api.ts`, `src/shared/ipc.ts`, `src/preload/index.ts`, and `src/main/ipc.ts` with retry, regenerate, cancel, compare, and conversation export contracts.
- Added database tables for `message_chunks`, `message_attachments`, `prompt_templates`, and `conversation_exports`.
- Added mapper support for message chunks, attachments, prompt templates, and conversation exports.
- Changed `NexaStore.sendMessage()` to build context through a single context builder, persist selected context IDs, validate attachment metadata, persist provider chunks, and include lifecycle metadata.
- Added Store methods for `retryMessage`, `regenerateMessage`, `cancelMessage`, `compareModels`, and `exportConversation`.
- Seeded a default prompt template without recreating a fake Provider or fake assistant path.
- Extended `openAiCompatibleAdapter` to return normalized chunk arrays for both JSON and streaming responses.
- Updated `src/renderer/modules/ChatPage.tsx` with message status labels, copy, retry, regenerate, cancel, redacted export, and a compact multi-model comparison panel.
- Updated `src/renderer/mockApi.ts` to implement the same Round 7 API contract in explicit browser/UI-smoke mode.
- Updated `src/shared/i18n.ts` so all new labels, errors, export text, comparison text, prompt text, and lifecycle text come from the zh-CN/en-US authority.
- Added `tests/conversation-runtime.test.ts` and updated app/UI smoke assertions for Round 7 controls.

## Deleted Old Links

- Removed the old implicit context builder that hardcoded the last 8 completed messages without recording selected context IDs.
- Removed the old UI-only conversation lifecycle assumption where Chat UI only had send and display states.
- Kept browser mock behavior only as explicit browser/UI-smoke fallback, not as a production conversation path.
- Did not create provider-specific chat forks; retry, regenerate, compare, and Gateway continue to reuse the same Store/provider invocation chain.

## Security And Redaction

- Conversation exports default to redacted output.
- Provider API keys remain main-process-only and are not exposed through export content.
- Attachment metadata is validated by size and MIME type policy before record creation.
- Message/request metadata uses redaction for exported or logged sensitive content.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test -- tests/conversation-runtime.test.ts tests/provider-store-integration.test.ts tests/gateway-provider-chain.test.ts` | Passed, 3 files / 6 tests |
| `npm.cmd run test -- tests/app.test.tsx tests/ipc-contract.test.ts tests/i18n-authority.test.ts` | Passed, 3 files / 12 tests |
| `npm.cmd run test` | Passed, 9 files / 31 tests |
| `npm.cmd run test:ui-smoke` | Passed, 11 Playwright tests |
| `npm.cmd run build` | Passed |
| `npm.cmd run verify` | Passed, including typecheck, 9 files / 31 tests, and build |
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

Passed at the implementation and current test boundary. The user can continue a conversation across models, message metadata includes context IDs and chunks, retry/regenerate/copy/export controls are available, and multi-model comparison performs real fan-out through the same Provider chain with independent request logs.

## Commit

- Delivery commit hash: `d1b9bb66470cb133be892a09a963b0d7a99c3c7f`.
- Closeout commit hash: `14d8d42da4fccd7063e4a321c2235a57206ed397`.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `14d8d42da4fccd7063e4a321c2235a57206ed397`.
- Remaining issues: None for Round 7. Round 8 owns local Gateway API Key lifecycle, scopes, limits, config import, snapshots, and rollback maturity.
