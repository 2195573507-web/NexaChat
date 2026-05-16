# NexaChat Build Findings

## Full App Round 0 Findings

- `using-superpowers` is available and was read; `using-superpower` is not available as a skill path.
- `gh` is not on PATH, so GitHub delivery must use normal Git commands and remote ref confirmation.
- `src/main/services/store.ts` is the largest responsibility hotspot and currently owns Provider, Model, Chat, Gateway Key, Knowledge, MCP, Agent, Import/Export, Audit, and preferences.
- IPC channel names are duplicated as raw string literals in `src/main/ipc.ts` and `src/preload/index.ts`; Round 1 should add a shared IPC registry and payload schema.
- `src/renderer/mockApi.ts` is useful for browser smoke, but it duplicates core behavior and must be explicitly test/browser-only before production release.
- `src/shared/navigation.ts` is the navigation authority, but labels/descriptions are hardcoded and `routeAliases` lacks owner/deletion milestones.
- `src/renderer/styles.css` has token-like CSS variables, but local hardcoded colors and radii remain and must be addressed in the design/theme rounds.
- The desktop shortcut is valid for the current local Electron launch model, but there is no project-owned shortcut check/create script yet.

## Full App Round 1 Findings

- IPC channel duplication was removed by `src/shared/ipc.ts`; remaining IPC validation is arity-only and should become schema validation in later rounds.
- Production renderer missing preload no longer silently uses `mockApi`; browser smoke must opt into mock mode with `VITE_NEXACHAT_BROWSER_MOCK=1` or test mode.
- Playwright UI smoke can read a stale dev server if reuse is enabled; Round 1 pins `reuseExistingServer: false` to ensure the explicit mock env applies.
- `NexaStore` remains the behavior facade after Round 1; extraction order is documented in `docs/architecture/store-facade-boundaries.md`.

## Full App Round 2 Findings

- Content-area secondary navigation had been removed while docs still referenced it; Round 2 restored it and changed smoke tests to assert it exists.
- `routeAliases` can remain for compatibility only if metadata identifies owner, reason, and deletion milestone.
- A module page registry makes `navModules` alignment testable and prevents a future module from rendering an empty shell.

## Full App Round 3 Findings

- `styles.css` already had root variables, but active rows, chat bubbles, planned panels, snippets, secret notices, diagnosis blocks, chips, right rail, and pill indicators still used local color/radius literals.
- The durable fix is a typed token authority plus a CSS scanner test; otherwise later UI/i18n/theme rounds can reintroduce page-local visual values.
- The renderer navigation test timed out because broad `getAllByRole` regex queries across the whole shell were too slow; structural assertions against `aria-controls` and child-list content preserve coverage with less test fragility.
- Round 3 does not migrate UI copy. A read-only i18n audit confirmed only `labelKey` placeholders exist and no runtime dictionary/`t()` authority exists yet, so Round 4 must create the real i18n authority before migrating text.
- In-app browser automation timed out twice on the local dev page, but Playwright UI smoke produced equivalent responsive screenshot evidence under ignored `test-results/round-03-design-system/`.

## Full App Round 4 Findings

- The i18n authority can live in `src/shared/i18n.ts` without a folder split yet because the current dictionary is still type-checkable and consumed by both renderer and main display-message code.
- Navigation still carries default `label` / `description` strings for compatibility, but `tests/i18n-authority.test.ts` now asserts they equal zh-CN dictionary values and that every label/description/boundary key resolves.
- A CJK literal scan over migrated runtime files is a better Round 4 gate than a broad English literal scan because protocol names, provider type names, status enum values, and test data legitimately remain English.
- Electron production loading was broken independently of i18n: Chromium blocks Vite module assets under `file://`. Serving `dist` through a privileged `nexachat://` protocol fixes the real desktop entry without disabling web security.
- The current Windows smoke host can fail Electron startup when GPU/cache state is locked. The Electron smoke script now uses smoke-only user data and disables hardware GPU while preserving software rendering.
- Playwright's built-in webServer lifecycle could leave `test:ui-smoke` hanging after all tests passed on this host. `scripts/ui-smoke.mjs` now owns the Vite process lifecycle and exits with the Playwright result.

## Full App Round 5 Findings

- `UiPreferences.theme` already supported `system`, but before Round 5 the renderer shell resolved only exact `dark` to `theme-dark`; every other value became `theme-light`.
- The durable fix is a shared theme resolver plus an OS `prefers-color-scheme` listener in the shell, not a new CSS mode or database schema.
- `:root` remains the light-token source and `.theme-dark` remains the dark-token override source; `.theme-light` does not need a duplicate token block.
- Tests need a visible state surface for theme resolution. `data-theme-mode` records the saved preference, while `data-resolved-theme` records the current light/dark rendering.
- Browser mock and main-process store must normalize theme values the same way, otherwise Playwright UI smoke can pass a behavior that differs from Electron.

## Full App Round 6 Findings

- `store.sendMessage()` and Gateway `/v1/chat/completions` already shared one entry point, so replacing the fake production response there fixes both UI Chat and external Gateway callers without a second provider chain.
- `testProvider()` was a shape check before Round 6; the durable health signal is a real OpenAI-compatible `/models` request with request-log evidence.
- Seed data must not create a fake Provider, fake API key, fake model, or seed-time assistant response because those records make a demo path look production-ready.
- Streaming, cancellation, timeout, and retry can be defined at the adapter contract now; Round 7 should build richer UI lifecycle controls on top of that instead of creating another message append path.
- Local Gateway smoke should use dynamic ports and a local mocked upstream in tests; binding the real `127.0.0.1:8787` port is better left to Electron/runtime smoke.
- Request and Gateway logs need header-key-based redaction, not only value-pattern redaction, because custom sensitive headers can use arbitrary values.

## Full App Round 7 Findings

- The conversation lifecycle gap was not primarily a renderer problem. The durable fix was to centralize context selection, retry/regenerate/cancel/export/compare semantics, chunk records, prompt metadata, and attachment policy in shared types plus the main-process Store.
- `messages.context_message_ids_json` existed before Round 7 but was not a real context-builder result. Round 7 now writes selected message IDs and a trim reason from a single context builder.
- Multi-model comparison must fan out through the same Provider chain instead of assembling side-by-side UI results. Each branch now creates its own request log and usage record.
- Conversation export should not reuse the broader import/export backup chain as a fake complete backup feature. Round 7 stores conversation-specific redacted markdown/JSON exports in `conversation_exports`; Round 12 still owns full backup/restore.
- Browser mock must follow the `AppApi` contract whenever shared API methods are added, otherwise UI smoke can pass a stale behavior surface that production Electron cannot expose.
- Cancel semantics are meaningful for in-flight or failed/recoverable records. A completed request should not be rewritten to cancelled merely because a test can call the method.

## Full App Round 8 Findings

- Round 8 was not blocked by Provider forwarding; the blocker was scattered Gateway control-plane authority. Endpoints, scopes, key states, error codes, quota/rate policy, and log attribution now live in `src/shared/gatewayRuntime.ts`.
- API Key lifecycle must stay separate from Provider API Key storage. Gateway create/rotate can reveal a full key once, but stored/listed records only expose previews and main-process secrets.
- Quota/rate failures need different errors and logs. Treating missing, invalid, revoked, disabled, expired, scope denied, quota exhausted, and rate-limited keys as one 401 hides the operator action needed to fix them.
- Browser mock parity is required whenever `AppApi` changes. The mock now implements create/update/rotate/revoke key lifecycle so UI smoke cannot pass against stale preload assumptions.
- Import from sub2api/CCS-style manifests should not silently import plaintext secrets. Round 8 applies Provider/Model metadata only, records stripped Gateway key templates, creates a rollback snapshot, and can disable imported metadata during rollback.
- `/v1/embeddings` remains an explicit lexical compatibility fallback and `/v1/responses` remains reserved. Round 9 owns real embedding/RAG integration.

## Full App Round 9 Findings

- The root knowledge gap was not just missing UI controls. The production chain still generated placeholder chunks and attached latest-chunk citation hints, so retrieval, chat context, citations, rebuild, and delete could diverge.
- `src/shared/knowledgeRuntime.ts` is now the authority for parser policy, chunking, lexical embedding, stable hashes, and scoring. PDF, Office, and OCR remain staged because no parser dependency was approved in this round.
- Knowledge snapshots must expose only active files and active chunks. Browser mock now filters deleted knowledge files to match Store behavior, which fixed the UI smoke delete regression.
- Round 10 should consume knowledge through structured files/chunks/citations and should not present full vector RAG, OCR, or Office parsing as executable Agent capabilities.

## Initial Repository State

- Repository root: `D:\NexaChat`.
- Existing content before this build round was documentation only.
- Current branch tracks `origin/main`.
- Current remote: `https://github.com/2195573507-web/NexaChat.git`.
- Current latest commit before implementation: `9939d26 docs: add NexaChat build and UI plans`.

## Tooling

- Node: `v24.14.1`.
- npm: `11.11.0`.
- `node:sqlite` is available, but experimental in the current Node version.
- `rg` was not needed yet; PowerShell-native file reads worked.

## Scope Decisions

- Use Electron + React + TypeScript + Vite, matching the technical stack plan.
- Use Node built-in `node:sqlite` through a small abstraction to avoid native SQLite package install friction.
- Implement a real local data path and local gateway, while marking advanced Knowledge, MCP, Agent, workflow, and evaluation capabilities honestly as planned or dry-run where the plans reserve them.
- Use correct Chinese module names in UI because some existing documents contain mojibake text.

## Errors

| Error | Attempt | Resolution |
|---|---:|---|
| PowerShell `Get-ChildItem -Filter` cannot accept multiple filter values | 1 | Use separate paths or `-Include`/manual checks next time. |
| UI skill design-system script failed because the local Python executable treated `D:\NexaChat` as its prefix and could not load `encodings` | 1 | Used the skill's static UI checklist directly and recorded the environment issue. |

## Iteration 01 Findings

- Three concurrent audit lanes identified the main closeout gaps: gateway key revoke/one-time display, error copy/open-log actions, invalid import rejection, responsive chat width at 1280/1040, and honest planned/reserved stage labels.
- Playwright coverage now checks 1040 x 680 as an explicit desktop floor and asserts no horizontal overflow for `.app-shell`, `.content-grid`, and `.chat-layout`.
- Electron `safeStorage` is used when available for new secrets. Non-Electron or early bootstrap paths use a `local-dev:v1:` prefixed fallback and existing base64 secrets remain readable for compatibility.

## Iteration 02 Planning Findings

- The shared navigation registry already defines second-level tabs for all eight modules in `src/shared/navigation.ts`.
- The current renderer still behaves mostly as one large page per module: `App.tsx` maps only `activeModuleId` to page content and does not use active tab state for content switching.
- `AppShell` renders the tab row, but tab buttons do not update active tab, route identity, or visible content.
- The main crowding source is structural: several forms, tables, diagnostics, planned placeholders, and operational summaries are shown together in one long module surface.
- The next iteration should treat "one tab, one primary task" as the product rule, not only add spacing or CSS density tweaks.
- The UI skill search script still fails on this host because Python resolves its standard library under `D:\NexaChat`; use the static accessibility/layout guidance already loaded from the skill unless the Python environment is repaired.

## Iteration 02 Implementation Findings

- Route identity is now generated from shared navigation as `/<module>/<tab>`, so old aliases such as `/settings/logs` are no longer the canonical state.
- `NavTab.description` and `default` metadata are enough for the current implementation; no router library was needed.
- Per-tab content creates duplicate visible headings in a few places because the tab title and primary panel can share the same label. Tests should scope tab assertions to the active `tabpanel` instead of global heading queries.
- `.module-tabs` intentionally uses horizontal scrolling at 1040 x 680; whole-app horizontal overflow is still blocked, but the tab strip itself can have `scrollWidth > clientWidth`.
- The Models / 参数模板 tab should not be labeled fully implemented until persisted parameter templates exist; it is now marked `environment-limited`.
- Planned/reserved tabs should be tested by absence of buttons in the active panel, not by hidden/disabled buttons, because fake actions are disallowed.

## UI Shell Redesign Findings

- The visible route leak was caused by `AppShell` rendering `tab.route` inside `.module-child-link`; removing that child text and covering it in UI/Electron smoke prevents `/workspace/...` from returning to the sidebar.
- The workbench can use current `AppSnapshot` data for a formal home without adding fake data: workspace/default model/gateway status, usage records, request logs, import/export results, audit logs, and recent conversations are already available.
- Electron smoke must run after `npm.cmd run build`; running it in parallel with build can launch against an older `dist` and produce a false failure.
- OpenAI-compatible endpoint text such as `/v1/chat/completions` is valid product content and should not be treated as an app-route leak. Tests now only reject first-level app routes such as `/workspace/...`, `/models/...`, and `/gateway/...`.
- The responsive visual audit should write screenshots only under ignored `test-results/` to avoid committing process artifacts.
