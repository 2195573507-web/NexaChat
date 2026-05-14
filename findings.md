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
