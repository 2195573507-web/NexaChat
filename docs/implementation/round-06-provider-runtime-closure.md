# Round 6 Provider Model And Real Invocation Chain Closure

Date: 2026-05-15

Status: Completed.

## Root-Cause And Chain Review

Round 6 addressed the Provider runtime gap left by the earlier build: Provider and Model records existed, but `store.sendMessage()` still generated a local assistant reply, `testProvider()` only validated URL/key shape, and the local Gateway reused that same fake-success chat path.

Chain reviewed:

- Chat UI model selection -> preload IPC -> `store.sendMessage`.
- Router selection from requested model, requested provider, workspace default, or first enabled model.
- Provider adapter selection from the shared provider runtime authority.
- Provider secret lookup inside the main process only.
- OpenAI-compatible `/chat/completions` HTTP call with timeout, retry, cancellation, optional streaming parser, and normalized errors.
- Request log update, usage record creation, audit event, assistant message persistence, and snapshot refresh.
- Gateway `/v1/chat/completions` -> API key auth -> same `store.sendMessage` provider runtime chain -> OpenAI-compatible response or 502 error shape.

## Main Changes

- Added `src/shared/providerRuntime.ts` as the authority for adapter names, OpenAI-compatible endpoints, timeout/retry policy, and provider runtime error codes.
- Added `src/main/services/openAiCompatibleAdapter.ts` for real OpenAI-compatible health checks and chat completions.
- Changed `NexaStore.testProvider()` to call upstream `/models`, update Provider/Model health, and record request logs for both success and failure.
- Changed `NexaStore.sendMessage()` to call the provider adapter instead of generating a local assistant reply.
- Added main-process provider secret lookup without exposing raw Provider API keys to renderer/shared types.
- Updated request logs, usage records, audit events, assistant messages, and failure messages around the real invocation result.
- Removed default seed creation of a fake Provider/Model/key and removed seed-time fake assistant message generation.
- Updated the local Gateway so `/v1/chat/completions` awaits the same provider runtime chain and returns 502 with an OpenAI-compatible error body when upstream invocation fails.
- Kept `src/renderer/mockApi.ts` as explicit browser/UI-smoke fallback only; it is not used by production Electron preload.
- Updated i18n text that previously described a local response loop.
- Added deterministic local-upstream tests for adapter, store integration, and gateway forwarding.

## Deleted Old Links

- Deleted `generateLocalAssistantReply()` from `src/main/services/store.ts`.
- Removed seed-time `Local Demo OpenAI-compatible`, `demo-key-not-used`, and `demo-chat-model` creation from new databases.
- Removed the production default fake assistant path from Chat and Gateway.
- Browser `Mock response from nexachat-mock` remains only in explicit browser mock mode for UI smoke coverage.

## Security And Redaction

- Raw Provider API keys remain in the `secrets` table and are decoded only inside the main process.
- Provider request summaries store redacted headers and do not include raw API keys.
- Gateway logs now use key-based header redaction through `redactHeaders`.
- Gateway API keys are still one-time reveal values and are not mixed with Provider API keys.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run test -- tests/provider-adapter.test.ts tests/provider-store-integration.test.ts` | Passed, 2 files / 7 tests |
| `npm.cmd run test -- tests/provider-adapter.test.ts tests/provider-store-integration.test.ts tests/gateway-provider-chain.test.ts` | Passed, 3 files / 9 tests |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test` | Passed, 8 files / 29 tests |
| `npm.cmd run test:ui-smoke` | Passed, 11 Playwright tests |
| `npm.cmd run build` | Passed |
| `npm.cmd run verify` | Passed |
| `npm.cmd run test:electron-smoke` | Passed |

Gateway smoke coverage:

- `tests/gateway-provider-chain.test.ts` starts a local upstream and a local Gateway server on dynamic ports.
- The success path proves `/v1/chat/completions` returns upstream content, not browser mock or local summary text.
- The failure path proves upstream provider errors return Gateway HTTP 502 and are logged with a request log id.

Desktop shortcut check:

- `C:/Users/至亲/Desktop/NexaChat.lnk` targets `D:/NexaChat/node_modules/electron/dist/electron.exe`.
- Arguments: `"D:/NexaChat"`.
- WorkingDirectory: `D:/NexaChat`.
- IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
- No shortcut was modified.

## Acceptance Result

Passed at the implementation/test boundary. A single real OpenAI-compatible invocation chain now serves Chat and Gateway. Streaming parser, cancellation, timeout, retry, and fallback/error policy are defined and covered by deterministic tests. Mock behavior is no longer the production default.

## Commit

- Delivery commit hash: `45054a81190638e209d06d9373ff83e38763a9fd`.
- Push result: pending closeout push confirmation.
- Remaining issues: None for Round 6. Round 7 owns richer conversation lifecycle features such as retry/regenerate UI, message chunks, attachments, exports, and multi-model fan-out.
