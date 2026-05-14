# Round 0 Health Check And Authority Inventory

Date: 2026-05-14

Status: Completed.

## Root And Tooling

- Project root: `D:/NexaChat`, confirmed by `git rev-parse --show-toplevel`.
- Branch: `main`.
- Remote: `origin https://github.com/2195573507-web/NexaChat.git`.
- Skill probe: `using-superpower` is unavailable; `using-superpowers` is available and was read.
- Process skills used: `using-superpowers`, `brainstorming` with user override to execute without approval gate, `ralph-loop`, `planning-with-files-zh`, and `ui-ux-pro-max`.
- Available tools: Git `2.54.0.windows.1`, Node `v24.14.1`, `npm.cmd` `11.11.0`, PowerShell `5.1.26100.8457`, Electron binary at `D:/NexaChat/node_modules/electron/dist/electron.exe`, Playwright config present.
- Unavailable tools: `gh` is not on PATH. GitHub delivery must use `git push` and `git ls-remote origin refs/heads/main`.
- `npm.cmd` is the required npm runner. PowerShell `npm.ps1` remains an execution-policy risk.

## Parallel Lanes

- Lane A: source architecture, IPC, preload, store, SQLite, gateway, audit/log chain.
- Lane B: renderer UI, navigation, i18n, theme, hardcoded text, smoke coverage.
- Lane C: package scripts, tests, desktop shortcut, Git/GitHub delivery, closeout gates.

## Root-Cause Analysis

The current gaps are structural, not isolated page bugs.

- Missing authorities: IPC channels, i18n text, theme tokens, gateway endpoints/scopes, permissions, audit actions, import/export actions, desktop entry values, and quality gates are either implicit or scattered.
- Over-broad responsibility: `src/main/services/store.ts` is the factual service owner for Provider, Model, Chat, Gateway Key, Knowledge, MCP, Agent, Import/Export, Audit, and settings.
- Demo/test carryover: `src/renderer/mockApi.ts` duplicates most application behavior for browser fallback. It is useful for tests but needs an explicit test/browser-only boundary before production release.
- Legacy compatibility: `routeAliases` in `src/shared/navigation.ts` preserves many old paths without owner or deletion milestone.
- Schema maturity: `schemaSql` creates tables but there is no migration version table, migration runner, or upgrade/rollback contract.
- Testing maturity: unit/UI/Electron smoke tests exist, but `verify` does not include UI/Electron smoke or scanners.

## Authority Map

| Area | Current Authority | Gap | Round Owner |
| --- | --- | --- | --- |
| Navigation | `src/shared/navigation.ts` | Labels/descriptions are hardcoded and route aliases lack deletion milestones. | Round 2, Round 4 |
| Shared data contracts | `src/shared/types.ts` | Very broad file; statuses, permissions, endpoints, errors, and IPC should split into focused authorities. | Round 1 |
| Error catalog | `src/shared/errors.ts` | Chinese copy is hardcoded in the catalog, not i18n-backed. | Round 4, Round 6 |
| IPC | `src/main/ipc.ts`, `src/preload/index.ts` | Channel strings are duplicated as raw literals with no payload schema. | Round 1 |
| Database schema | `src/main/database/schema.ts` | No migration versioning or migration runner. | Round 1, Round 12 |
| Business services | `src/main/services/store.ts` | Too many domain responsibilities in one class. | Round 1 |
| Local Gateway | `src/main/services/localGateway.ts` | Endpoints/scopes are scattered; chat completions call local response chain, not real upstream Provider. | Round 6, Round 8 |
| Redaction | `src/main/security/redaction.ts` | `recordGatewayLog` uses generic object redaction rather than structured header redaction. | Round 8, Round 11 |
| Renderer API | `src/renderer/api.ts` | Production renderer silently falls back to browser mock when preload is unavailable. | Round 1, Round 15 |
| Browser mock | `src/renderer/mockApi.ts` | Duplicates real app behavior; needs explicit test/browser-only gate. | Round 1, Round 15 |
| Theme | `src/renderer/styles.css` | CSS variables exist, but token authority is not shared and several hardcoded colors/radii remain. | Round 3, Round 5 |
| i18n | None | UI, service, navigation, error, and test text are hardcoded. | Round 4 |
| Desktop entry | External `.lnk` plus docs | No project-owned shortcut check/create script yet. | Round 14, Round 15 |
| Quality gates | `package.json` scripts | No `quality` script; no hardcode/i18n/theme/IPC/desktop/security scanners. | Round 15 |

## Chain Map

### Provider Create

Renderer module calls `api.createProvider` -> `src/renderer/api.ts` -> `window.nexachat` -> `src/preload/index.ts` invokes `provider:create` -> `src/main/ipc.ts` calls `store.createProvider` -> `src/main/services/store.ts` saves secret and inserts `providers` -> audit action `provider.created` is recorded -> renderer refreshes snapshot.

### Chat Send

Renderer calls `api.sendMessage` -> preload invokes `chat:sendMessage` -> IPC calls `store.sendMessage` -> `messages`, `request_logs`, `usage_records`, and conversation counters are updated -> assistant response is generated locally -> renderer refreshes snapshot. Gap: no audit event for chat send/completion/failure, and provider upstream is not called.

### Gateway Chat Completion

HTTP request reaches `localGateway.ts` `/v1/chat/completions` -> gateway API key is authorized through `store.validateGatewayKey` -> `store.sendMessage` handles the request -> `gateway_logs` records the HTTP event. Gap: gateway reuses local chat generation rather than real provider adapter.

### Data Import Preflight

Renderer calls `api.validateImportManifest` -> preload invokes `data:validateImportManifest` -> store parses JSON and writes `config_snapshots` as a preflight result -> `applyImportPlan` records completion only for ready plan records. Gap: this is still preview/apply-record behavior, not full conflict-aware import.

## Scan Findings

### Hardcoded Text

- Chinese and English visible strings are present in renderer modules, `navigation.ts`, `errors.ts`, tests, and service messages.
- This is expected before Round 4, but it blocks any claim of full i18n completion.
- Representative files: `src/shared/navigation.ts`, `src/shared/errors.ts`, `src/renderer/App.tsx`, `src/renderer/modules/*.tsx`, `src/main/services/store.ts`, `tests/*.ts*`.

### Theme Tokens

- `styles.css` has root CSS variables for colors and dimensions.
- Remaining hardcoded values include literal colors, `white`, `999px`, `6px`, `8px`, and warning-code block colors in component styles.
- These are queued for Round 3 and Round 5, not changed in Round 0.

### IPC

- `ipcMain.handle(...)` and `ipcRenderer.invoke(...)` use matching raw string literals.
- No central IPC channel registry exists.
- No payload validator exists at the main-process boundary.

### Duplicate / Old Links

- `routeAliases` preserves older dashboard/chat/model/knowledge/tool/gateway/data/settings routes.
- `mockApi.ts` is a duplicate implementation path for UI tests.
- Gateway endpoints and scopes are repeated across local gateway, store status, and renderer documentation.
- `config_snapshots` carries import, export, snapshot, restore preview, diagnostics, and dry-run semantics.
- `PROJECT_PROGRESS.md` references `ModuleSubNav`, but the current source does not contain `src/renderer/components/ModuleSubNav.tsx`; tests currently assert `.module-subnav-panel` and `.module-tabs` are absent. Round 2 must align docs, source, and UI smoke around the actual secondary-navigation model.
- `UiPreferences.language` and the settings control exist, but renderer text still uses hardcoded Chinese/English phrases; saving `en-US` does not translate the UI yet.
- `UiPreferences.theme` supports `system` as a stored value, but the shell currently treats system as a class state rather than following OS preference with a listener.
- `UiPreferences.reducedMotion` is persisted, but there is no verified CSS or runtime behavior that changes motion.

## Deletion Queue

| Item | Why It Exists | Delete Or Replace When | Owner Round |
| --- | --- | --- | --- |
| Legacy `routeAliases` entries | Recover old URLs and tests after IA refactors. | Alias owner/deletion milestone exists and route migration tests pass. | Round 2 |
| Raw IPC strings | Bootstrap speed. | Shared IPC channel registry and payload schema land. | Round 1 |
| Browser mock as silent fallback | Browser/Vite smoke without Electron IPC. | Production Electron preload failure renders diagnostics instead of silently using mock. | Round 1, Round 15 |
| Scattered gateway endpoint/scope literals | Gateway grew from initial service. | Endpoint/scope registry lands and all consumers import it. | Round 8 |
| Preview-only import apply path | Early safety boundary. | Full conflict-aware import/export/rollback is implemented. | Round 12 |
| Lexical-only RAG path as default | Early text fallback. | Embedding/index/retrieval chain is implemented; lexical remains explicit fallback. | Round 9 |
| Dry-run-only Agent execution UI | Safe early Agent boundary. | Execution/trace/approval model supports controlled runs. | Round 10 |
| Stale `ModuleSubNav` documentation/test mismatch | Prior UI refactor changed the visible navigation model. | Round 2 decides whether to restore a module content secondary nav or document sidebar children as the only secondary nav. | Round 2 |

## UI / i18n / Theme Findings

- Current first-level modules are `workspace`, `chat`, `models`, `knowledge`, `tools`, `gateway`, `data`, and `settings`.
- Current second-level tabs are fewer than the full blueprint wants; several broad tabs still combine multiple jobs, such as `models/router` carrying router state and health-test explanation.
- Left sidebar child buttons are currently the only visible second-level navigation. There is no content-area subnav component in source.
- `src/shared/navigation.ts` already emits `labelKey` and `descriptionKey`, but UI consumers render direct `label` and `description` fields.
- `src/shared/i18n/*` does not exist yet.
- `src/shared/theme/*` does not exist yet.
- `src/renderer/styles.css` contains root CSS variables but also local literal colors/radii that need Round 3/Round 5 cleanup.
- Round 4 UI smoke must prove sidebar, module header, tab panel heading, and a button change language after saving `en-US`, then switch back to Chinese.
- Round 5 smoke must prove light, dark, and system modes change the app class/state and keep key pages readable without overflow.

## Desktop Shortcut

Read-only COM check result:

- Path: `C:/Users/至亲/Desktop/NexaChat.lnk`
- TargetPath: `D:/NexaChat/node_modules/electron/dist/electron.exe`
- Arguments: `"D:/NexaChat"`
- WorkingDirectory: `D:/NexaChat`
- IconLocation: `D:/NexaChat/assets/app-icon.ico,0`

The shortcut is valid for the current local Electron launch model. No shortcut was modified in Round 0.

## Verification Matrix

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test` | Passed, 1 test file / 3 tests |
| `npm.cmd run build` | Passed |
| `npm.cmd run test:ui-smoke` | Passed, 10 Playwright tests |
| `npm.cmd run test:electron-smoke` | Passed, Electron shell rendered |
| `git diff --check` | Passed with LF/CRLF warnings only for `findings.md`, `progress.md`, and `task_plan.md` |

## Round 0 Acceptance

- Inventory exists: yes.
- Authority map exists: yes.
- Hardcoding and duplicate-link findings categorized: yes.
- Desktop shortcut recorded: yes.
- Business code changes: none in Round 0.
- Commit hash: `1fa6d630d691465be9140d552f119b752e4f2191`.
- Push result: `origin/main` confirmed at `1fa6d630d691465be9140d552f119b752e4f2191`.
- Remaining issues: None for Round 0 inventory. Implementation gaps are queued to Round 1 through Round 15.

## Changed Files

- `docs/implementation/full-app-round-execution-matrix.md`
- `docs/implementation/round-00-health-check-authority-inventory.md`
- `task_plan.md`
- `progress.md`
- `findings.md`

## Feature Changes

- Added full-app Round 0-15 execution matrix.
- Added authority-source inventory, chain map, hardcoding/theme/IPC/mock/old-link scan findings, deletion queue, desktop shortcut record, and verification matrix.

## Deleted Old Links

None. Round 0 is an inventory-only round. Old-link candidates are queued and must not be deleted until consumers and migrations are known.

## Acceptance Result

Accepted for Round 0: inventory exists, authority map exists, hardcoding and duplicate-link findings are categorized, desktop shortcut state is recorded, and no business code changed.
