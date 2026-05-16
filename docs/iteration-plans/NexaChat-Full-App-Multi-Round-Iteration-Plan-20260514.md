# NexaChat Full App Multi-Round Iteration Plan

Date: 2026-05-14

Project: NexaChat / AI 对话中枢

Scope: 全 App 架构治理、功能补全、UI 重整、工程质量、测试收敛、桌面发布准备

Status: Authoritative roadmap for future implementation rounds. This file is a plan artifact only. It does not change business code.

## 0. Execution Record For This Planning Round

- Confirmed project root: `D:\NexaChat` from `git rev-parse --show-toplevel`.
- Confirmed branch: `main`.
- Confirmed remote: `origin https://github.com/2195573507-web/NexaChat.git`.
- Skill probe: `using-superpower` was not available; `using-superpowers` was available and read.
- Process skills read: `brainstorming`, `ralph-loop`, `planning-with-files-zh`, and `ui-ux-pro-max`.
- Tool check: Codex CLI, Git, Node, and `npm.cmd` are available. PowerShell `npm.ps1` is blocked by execution policy. `gh` is not available, so GitHub delivery must use normal `git push`.
- Desktop shortcut check: current `C:\Users\至亲\Desktop\NexaChat.lnk` points to `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"` as argument, uses `D:\NexaChat` as working directory, and uses `D:\NexaChat\assets\app-icon.ico,0`.
- Parallel execution used in this planning round:
  - Lane A: local repo structure, existing docs, package scripts, navigation, IPC, store, gateway, UI and desktop shortcut review.
  - Lane B: learning-object research for CCS / cc switch, sub2api, Open WebUI, Dify, Flowise, Langflow, n8n, Coze Studio, FastGPT, Chatbox, Cherry Studio, and AnythingLLM.

## 1. Current Baseline

NexaChat is currently an Electron + React + TypeScript + Vite desktop app with a local SQLite store, safe preload bridge, renderer modules, a config-driven navigation registry, local OpenAI-compatible gateway endpoints, gateway API keys, request logs, usage records, audit logs, knowledge file records, MCP server registry, Agent dry-run definitions, import preflight, snapshots, diagnostics, UI preferences, Playwright UI smoke tests, and Electron smoke tests.

The current important source surfaces are:

- `src/shared/navigation.ts`: current route and module registry.
- `src/shared/types.ts`: shared data contracts and renderer API.
- `src/main/ipc.ts`: IPC channel registration.
- `src/main/services/store.ts`: current central application service and SQLite business logic.
- `src/main/services/localGateway.ts`: local OpenAI-compatible gateway runtime.
- `src/main/database/schema.ts`: current schema source.
- `src/renderer/App.tsx` and `src/renderer/AppShell.tsx`: current shell and page routing.
- `src/renderer/modules/*Page.tsx`: current module UI.
- `docs/build-plans/*`, `docs/design/*`, `docs/architecture/*`, and `docs/testing/*`: current planning and acceptance family.
- `PROJECT_PROGRESS.md`: current project status ledger.

Current high-risk gaps already visible from the baseline:

- Many UI labels and service messages are still hardcoded in source and must move to i18n authority.
- Navigation has a shared registry, but module labels, feature labels, route aliases, permission keys, and status labels need stricter schemas and tests.
- IPC channels are registered in one file but are not yet backed by a centralized channel constant and schema authority.
- `store.ts` carries too many responsibilities and must be split behind service and repository boundaries before deeper features are added.
- Provider calls are still partly local/demo behavior; real upstream calling, streaming, cancellation, retry, timeout, fallback, and error taxonomy must be implemented as one chain.
- Gateway, Agent, MCP, workflow, RAG, import/export, audit integrity, and security are present as partial or planned surfaces and need honest completion boundaries.
- Desktop shortcut is currently valid, but every future code/UI/runtime update must recheck it because the current launch path depends on the local Electron binary rather than a packaged executable.

## 1.1 中文范围与字段映射

本计划使用英文工程小节名以便和现有代码、测试脚本、提交信息保持一致；每一轮的 26 个固定小节与中文要求一一对应：

| 中文字段 | Plan field |
| --- | --- |
| Round 名称 | Round Name |
| Final Goal | Final Goal |
| 当前问题判断 | Current Problem Judgment |
| 根因分析要求 | Root-Cause Analysis Requirement |
| 上下游链路审查要求 | Upstream/Downstream Chain Review Requirement |
| 明确任务目标 | Explicit Task Goals |
| 细化任务列表 | Detailed Task List |
| 并行任务分组 | Parallel Task Groups |
| 涉及文件/模块范围 | Files/Modules In Scope |
| 禁止修改范围 | Forbidden Scope |
| 学习对象 | Learning Objects |
| 可参考能力 | Reference Capabilities |
| 统一权威源要求 | Unified Authority Source Requirement |
| 旧链路删除要求 | Old-Link Deletion Requirement |
| 数据迁移要求 | Data Migration Requirement |
| UI/UX 要求 | UI/UX Requirement |
| i18n 要求 | i18n Requirement |
| 主题要求 | Theme Requirement |
| 安全要求 | Security Requirement |
| 测试要求 | Test Requirement |
| 验收标准 | Acceptance Criteria |
| 收敛标准 | Convergence Criteria |
| 风险 | Risks |
| 回滚策略 | Rollback Strategy |
| 交付物 | Deliverables |
| 下一轮输入 | Next Round Input |

中文覆盖索引：

- 架构: Round 1 owns main / preload / renderer / shared / tests / docs boundaries.
- 数据层: Round 0, Round 1, Round 7, Round 9, and Round 12 own schema, repository, migration, backup, and recovery.
- IPC: Round 1 owns IPC channel and payload authority.
- 安全: Round 6, Round 8, Round 10, Round 11, Round 12, and Round 13 own secrets, permissions, Gateway auth, audit, backup, and privacy.
- Provider 与模型管理: Round 6 owns real Provider and model invocation.
- 对话系统: Round 7 owns conversation, messages, context, streaming, cancel, retry, regenerate, export, and multi-model comparison.
- 本地网关与 API Key: Round 8 owns local OpenAI-compatible Gateway and API Key lifecycle.
- 知识库与 RAG: Round 9 owns file import, parsing, chunking, embeddings, indexing, retrieval, citations, delete, and rebuild.
- Agent、MCP、工具调用、Workflow: Round 10 owns one execution model for Agent, MCP, tools, and Workflow.
- 审计日志、用量统计、反馈评测: Round 11 and Round 13 own audit hash chain, logs, usage, feedback, evaluations, and traces.
- 导入导出、备份恢复: Round 12 owns full import/export, encrypted backup, snapshot, recovery, conflict handling, migration, and rollback.
- 设置、安全、桌面端体验、启动入口: Round 5, Round 11, Round 12, and Round 14 own settings, security, desktop launch, shortcut, packaging, installer, and diagnostics.
- App 界面、UI、主题、语言切换: Round 2, Round 3, Round 4, and Round 5 own IA, UI, design system, i18n, and theme.
- 可维护性、测试、打包、发布、文档与后续扩展: Round 0, Round 1, Round 14, Round 15, and the closeout checklists own maintainability, tests, packaging, release, docs, and extension gates.

## 2. Non-Negotiable Engineering Boundaries

Every future task must reread this section before touching files.

### 2.1 No Unowned Code Accumulation

- No 屎山代码堆积. Every file must have one clear owner and one clear responsibility.
- Temporary experiments must live outside the main runtime path and must be deleted or promoted in the same round.
- Compatibility code must have a deletion milestone and an owner.
- A feature is not complete until docs, tests, data ownership, IPC boundaries, UI state, and rollback are all updated.
- Do not place new planning, scratch, generated, or report files outside the confirmed project root.

### 2.2 No Hardcoding

- No hardcoding is a release gate, not a style preference.
- No hardcoded Chinese UI phrases.
- No hardcoded English UI phrases.
- No hardcoded local paths.
- No scattered Provider names, model names, endpoints, theme values, permission names, status names, route strings, IPC channels, error codes, or feature flags.
- All UI text must come from a single i18n authority.
- All constants must come from a single constants, config, or schema authority.
- All routes, modules, tabs, permission references, and navigation labels must come from a single navigation authority.
- All theme values must come from theme tokens. Components must not write local colors, shadows, radii, spacing, or state colors directly.
- All API endpoints, IPC channels, permission keys, status enums, error codes, and audit action names must be centrally defined and tested.

### 2.3 No Double Implementation Or Old-Link Residue

- New chains must replace old chains, not sit beside them forever.
- One feature must have one implementation path.
- New UI must not call a new chain while old UI still calls an old chain for the same job.
- No duplicate Provider, Model, Gateway key, API key, RAG, Tool, Agent, Workflow, audit, log, or settings chains.
- Route aliases may exist only as explicit migrations with tests and deletion dates.
- Mock chains must be labeled as test-only or demo-only and must never be mistaken for production behavior.

### 2.4 Root-Cause Review Before Every Fix Or Refactor

Before any task begins, the assignee must answer:

- What is the root cause of the current problem?
- What is the upstream input?
- What is the downstream output?
- What responsibility does this module own in the chain?
- Which pages, IPC channels, stores, schemas, tests, docs, shortcuts, and package scripts can be affected?
- Which linked features can regress?
- Is there an old link, duplicate link, or hidden dependency?
- Is data migration required?
- Must old code be deleted in this round?
- Which tests must be added or updated?

### 2.5 Task Drift Controls

- Every task starts by rereading Section 2.
- No hallucinated feature completion.
- No task drift from the declared round goal.
- No skipping chain review to move faster.
- No "先堆出来再说" implementation.
- No untested completion claim.
- No commit that mixes unrelated dirty files.

## 3. Unified Authority Source Plan

Future implementation must establish or strengthen these authorities before adding deeper features:

| Area | Required authority | Current or future target |
| --- | --- | --- |
| Navigation, modules, tabs, route aliases | Shared navigation registry with schema tests | Strengthen `src/shared/navigation.ts` and add route schema tests |
| i18n text | Single dictionary and typed keys | Add `src/shared/i18n/*` or equivalent |
| Theme tokens | Single token authority and CSS variable layer | Add `src/shared/theme/*` plus renderer token CSS |
| IPC channels | Typed channel constants and payload schemas | Add `src/shared/ipc/*`; refactor `src/main/ipc.ts` and preload |
| API endpoints | Endpoint registry and compatibility contracts | Add `src/shared/apiEndpoints.ts` or gateway schema module |
| Permission keys | Permission registry and policy evaluator | Add `src/shared/permissions.ts` and main-process enforcement |
| Status and stage enums | Shared status schema | Extend `src/shared/types.ts` or split `src/shared/status.ts` |
| Error codes | Error catalog and remediation copy via i18n | Strengthen `src/shared/errors.ts` |
| Provider presets | Provider catalog and adapter registry | Add `src/main/providers/*` plus shared catalog metadata |
| Model capabilities | Model capability registry | Add model capability schema and tests |
| Router rules | Router rule schema and evaluator | Add `src/main/services/routerService.ts` |
| Secrets | Secret service and redaction policy | Split from `store.ts`; keep raw values out of renderer |
| Store and repositories | Service-per-domain plus repository layer | Split `store.ts` by domain |
| RAG data | Files, chunks, embeddings, citations, index metadata | Add migration-backed schemas |
| Tool, MCP, Agent, Workflow | One execution model and trace schema | Do not build three separate task systems |
| Audit | Audit action registry and hash-chain schema | Add integrity checks and export tests |
| Import/export | Versioned manifest schema and migration contracts | Add preflight, conflict, snapshot, rollback |
| Desktop entry | Shortcut and package entry verification script | Keep rechecking `NexaChat.lnk` and packaged executable |

## 4. Learning Objects And What NexaChat Should Learn

These references guide product and engineering decisions. They are not permission to copy implementation blindly.

- CCS / cc switch: learn concise provider configuration, model switching, clear sidebar, lightweight desktop-tool layout, provider presets, tray/quick switching, MCP/Skills/Prompts sync, proxy/failover, usage dashboards, request logs, i18n, theme modes, atomic writes, and backup discipline. Source: `https://ccswitch.ai/` and `https://github.com/farion1231/cc-switch`.
- sub2api: learn API Key distribution, upstream account/channel management, quota allocation, token-level usage, cost calculation, load balancing, sticky sessions, concurrency controls, rate limits, admin monitoring, and gateway request forwarding. Source: `https://github.com/Wei-Shaw/sub2api`.
- Open WebUI: learn local-first provider-agnostic UX, Ollama and OpenAI-compatible support, plugins, tool calling, task models, context management, RAG, and offline-friendly operation. Source: `https://docs.openwebui.com/`.
- Dify: learn Workflow and Chatflow separation, knowledge integration, model provider management, app publishing, logs, annotations, tools, members, and workspace boundaries. Source: `https://docs.dify.ai/`.
- Flowise: learn Assistant / Chatflow / Agentflow separation, visual builders, tracing and analytics, evaluations, human-in-the-loop, API/CLI/SDK, execution logs, MCP nodes, secret managers, RBAC, and workflow scalability. Source: `https://docs.flowiseai.com/`.
- Langflow: learn componentized visual flows, isolated component testing, variable and runtime overrides, agent and MCP support, custom components, no forced LLM or vector-store lock-in, and API-served flows. Source: `https://docs.langflow.org/`.
- n8n: learn execution records, dirty node detection, manual/partial/production executions, debug executions, redacted execution data, workflow history, import/export, credential sharing, RBAC, error handling, wait nodes, approval-oriented flows, and deterministic automation boundaries. Source: `https://docs.n8n.io/`.
- Coze / Coze Studio: learn prompt, RAG, plugin, workflow, knowledge base, app template, visual debug, low-code resource management, plugin capability layers, OpenAPI/SDK integration, and full agent lifecycle separation. Source: `https://github.com/coze-dev/coze-studio`.
- FastGPT: learn knowledge base ingestion, preprocessing, chunking, visual workflow orchestration, knowledge matching, evaluation, OpenAI-compatible API integration, and business Q&A flows. Source: `https://doc.fastgpt.io/`.
- Chatbox / Cherry Studio / AnythingLLM: learn desktop AI conversation experience, multi-provider setup, model comparison, local history, exports, local knowledge base, simple settings, file parsing, MCP/agent extensions, backup, privacy, and a clean long-use UI. Sources: `https://docs.chatboxai.app/en`, `https://docs.cherry-ai.com/`, and `https://docs.anythingllm.com/`.

## 5. Multi-Round Roadmap Rules

- The plan has 16 rounds, Round 0 through Round 15.
- A future round may be split into smaller PRs, but each PR must preserve the round's engineering boundaries.
- Every round must run at least two parallel lanes when work is non-trivial.
- Every round must end with docs refresh, verification results, and desktop shortcut or packaged entry check when code/UI/runtime behavior changes.
- Every round must keep completion labels honest: `Completed`, `In progress`, `Environment-limited`, `Planned`, and `Reserved` must mean different things.
- Every round must delete old links it replaces, or explicitly record why deletion is not yet safe and when it will happen.

## 6. Round 0: Project Health Check And Authority Source Establishment

1. **Round Name**: Project Health Check And Authority Source Establishment.
2. **Final Goal**: Produce an evidence-backed inventory of architecture, routing, navigation, IPC, store, database, schema, theme, text, Provider, Gateway, Agent, MCP, tests, packaging, hardcoding, duplicate links, old links, dead code, orphan files, and authority-source gaps.
3. **Current Problem Judgment**: The app works as a scaffolded local-first desktop tool, but several authorities are partial or implicit. `store.ts`, navigation labels, service messages, route aliases, and IPC channels need ownership before deeper work.
4. **Root-Cause Analysis Requirement**: Identify whether each gap is caused by missing authority, too-broad file responsibility, legacy route compatibility, missing schema, missing tests, or demo/mock carryover.
5. **Upstream/Downstream Chain Review Requirement**: Trace Renderer -> preload -> IPC -> service -> repository -> SQLite -> logs/audit -> UI refresh for every existing action.
6. **Explicit Task Goals**: Build an inventory report, authority-source map, hardcoding scan, duplicate-link scan, old-link deletion queue, and verification matrix.
7. **Detailed Task List**: Scan `src`, `docs`, `tests`, `scripts`, package scripts, desktop shortcut path, build outputs, navigation registry, DB schema, IPC handlers, service methods, and renderer modules. Classify each item as authoritative, consumer, duplicate, old link, test-only, generated, or ignored.
8. **Parallel Task Groups**: Lane A reviews source architecture and chain maps. Lane B scans docs, tests, scripts, package scripts, shortcut, and external learning references. Lane C can prepare scan scripts or checklists if implementation starts.
9. **Files/Modules In Scope**: `src/**`, `docs/**`, `tests/**`, `scripts/**`, `package.json`, `PROJECT_PROGRESS.md`, `README*.md`, desktop shortcut metadata by read-only COM inspection.
10. **Forbidden Scope**: No behavior changes, no dependency additions, no UI restyle, no data deletion, no shortcut modification unless a project-owned script is explicitly approved.
11. **Learning Objects**: CCS for config authority, n8n for execution inventory, Dify for workspace/provider/tool boundaries, Flowise for capability matrix.
12. **Reference Capabilities**: `rg`, TypeScript compiler, existing smoke tests, Git status, optional local scripts for hardcoding scan after they are added.
13. **Unified Authority Source Requirement**: Define target authority files for navigation, i18n, theme, IPC, endpoints, permissions, status, errors, providers, models, router, secrets, audit, import/export, and desktop entry checks.
14. **Old-Link Deletion Requirement**: Create a deletion queue for legacy route aliases, duplicate mock paths, old placeholder buttons, and stale docs. Do not delete until consumers are known.
15. **Data Migration Requirement**: Inventory current schema and mark migrations required for future i18n, theme, provider, RAG, audit, backup, and workflow changes.
16. **UI/UX Requirement**: Record current clutter, sidebar, right rail, table, empty state, theme, and density issues without styling in this round.
17. **i18n Requirement**: Scan for hardcoded Chinese and English UI phrases and classify as UI text, log text, seed data, test fixture, or documentation.
18. **Theme Requirement**: Scan local colors, shadows, radius, spacing, state colors, and component-level style overrides.
19. **Security Requirement**: Review secret storage, IPC exposure, redaction, gateway key validation, logs, diagnostics export, and audit coverage.
20. **Test Requirement**: Run `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build`, and available smoke scripts if dependencies are installed. Record exact failures.
21. **Acceptance Criteria**: Inventory exists; authority map exists; hardcoding and duplicate-link findings are categorized; desktop shortcut state is recorded; no business code changes are made.
22. **Convergence Criteria**: Every later round can start from the inventory instead of rediscovering ownership.
23. **Risks**: Existing mojibake text can confuse i18n scanning; generated `dist` files may pollute scans; route aliases may be real compatibility paths.
24. **Rollback Strategy**: Docs-only changes can be reverted as one commit. No runtime rollback needed.
25. **Deliverables**: Health-check doc, authority-source map, scan matrix, deletion queue, verification matrix, updated `PROJECT_PROGRESS.md`.
26. **Next Round Input**: Approved authority-source map and prioritized architecture split list.

### Round 0 Execution Status

- Status: Completed.
- Completion date: 2026-05-14.
- Main changed files:
  - `docs/implementation/full-app-round-execution-matrix.md`
  - `docs/implementation/round-00-health-check-authority-inventory.md`
  - `PROJECT_PROGRESS.md`
  - `task_plan.md`
  - `progress.md`
  - `findings.md`
- Added/modified functionality: no runtime behavior changed. Added the Round 0-15 execution matrix, authority-source map, hardcoding/theme/IPC/mock/old-link inventory, chain map, deletion queue, desktop shortcut record, and verification matrix.
- Deleted old links: None. Round 0 is inventory-only; old-link candidates were queued for later rounds.
- Test commands and results:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test`: passed, 1 file / 3 tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
  - `npm.cmd run test:electron-smoke`: passed.
  - `git diff --check`: passed with LF/CRLF warnings only.
- Acceptance result: Passed. Inventory exists, authority map exists, hardcoding and duplicate-link findings are categorized, desktop shortcut state is recorded, and no business code changed.
- Commit hash: `1fa6d630d691465be9140d552f119b752e4f2191` for Round 0 delivery; `9b59e3c7f5fd43c39f04c17eaa74b1d997d1fe92` records remote confirmation.
- Remaining issues: None for Round 0. Implementation gaps are queued to Round 1 through Round 15.

## 7. Round 1: Architecture Boundary Reorganization

1. **Round Name**: Architecture Boundary Reorganization.
2. **Final Goal**: Make `main`, `preload`, `renderer`, `shared`, `tests`, and `docs` boundaries explicit and enforceable.
3. **Current Problem Judgment**: Main-process services and renderer actions are functional but too concentrated. `store.ts` owns many domains, and IPC channels lack a shared schema authority.
4. **Root-Cause Analysis Requirement**: Determine which responsibilities are mixed because of initial bootstrap speed versus true shared behavior.
5. **Upstream/Downstream Chain Review Requirement**: For each action, document renderer caller, preload bridge, IPC channel, main service, repository, schema table, audit event, and UI refresh.
6. **Explicit Task Goals**: Split responsibilities into domain services and repositories while preserving current behavior.
7. **Detailed Task List**: Introduce typed IPC channel registry, payload validation strategy, service boundaries, repository boundaries, shared error/result shapes, and dependency direction rules. Move code incrementally out of `store.ts`.
8. **Parallel Task Groups**: Lane A owns shared IPC/schema contracts. Lane B owns main service/repository split. Lane C owns tests and docs for dependency direction.
9. **Files/Modules In Scope**: `src/shared/*`, `src/preload/index.ts`, `src/main/ipc.ts`, `src/main/services/*`, `src/main/repositories/*`, `src/main/database/*`, tests, docs.
10. **Forbidden Scope**: No UI redesign, no new feature behavior, no provider forwarding, no schema migration unless needed to preserve existing behavior.
11. **Learning Objects**: Dify for service/workspace separation, Coze Studio for agent/resource service separation, CCS for frontend API wrapper plus backend service split.
12. **Reference Capabilities**: TypeScript project references, static import rules, unit tests, IPC smoke tests.
13. **Unified Authority Source Requirement**: IPC channels, payload types, service names, audit action names, and error codes must be centralized before new handlers are added.
14. **Old-Link Deletion Requirement**: Delete duplicate helper functions and old direct store calls once new services are wired.
15. **Data Migration Requirement**: Prefer no migration. If schema names are touched, add a migration ledger first.
16. **UI/UX Requirement**: UI must behave the same after refactor.
17. **i18n Requirement**: Do not add more hardcoded text while moving files; mark existing text for Round 4.
18. **Theme Requirement**: No theme change in this round except moving existing constants to authority if discovered.
19. **Security Requirement**: Renderer must never import main-only services or read raw secrets. Permission-sensitive actions must be enforced in main.
20. **Test Requirement**: Typecheck, unit tests, build, Electron smoke, and chain-specific service tests.
21. **Acceptance Criteria**: Domain boundaries documented; IPC registry used; no renderer-main boundary violation; existing flows pass smoke tests.
22. **Convergence Criteria**: Adding a new action has one obvious path: shared contract -> preload -> IPC -> service -> repository -> tests -> docs.
23. **Risks**: Large `store.ts` split can regress behavior if done in one patch.
24. **Rollback Strategy**: Keep each domain split reversible and preserve old tests until new tests pass.
25. **Deliverables**: Refactored architecture, dependency-boundary doc, updated tests, progress update.
26. **Next Round Input**: Stable service and IPC foundation for navigation and module IA work.

### Round 1 Execution Status

- Status: Completed.
- Completion date: 2026-05-14.
- Main changed files:
  - `src/shared/api.ts`
  - `src/shared/ipc.ts`
  - `src/main/ipc.ts`
  - `src/preload/index.ts`
  - `src/renderer/api.ts`
  - `src/renderer/App.tsx`
  - `src/renderer/mockApi.ts`
  - `src/renderer/modules/shared.tsx`
  - `tests/ipc-contract.test.ts`
  - `tests/renderer-api-boundary.test.ts`
  - `tests/app.test.tsx`
  - `scripts/electron-smoke.mjs`
  - `playwright.config.ts`
  - `docs/architecture/store-facade-boundaries.md`
  - `docs/implementation/round-01-architecture-boundary-closure.md`
- Added/modified functionality: established IPC channel authority, added IPC payload arity checks, split preload API typing from domain types, made browser mock fallback explicit, strengthened Electron preload smoke, and documented `NexaStore` facade extraction boundaries.
- Deleted old links: raw IPC channel literals in main/preload were removed. `mockApi.ts` was not deleted; it is now explicitly gated for test/browser smoke.
- Test commands and results:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test`: passed, 3 files / 10 tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
  - `npm.cmd run test:electron-smoke`: passed.
  - `npm.cmd run verify`: passed.
- Desktop shortcut result: `C:\Users\至亲\Desktop\NexaChat.lnk` still points to the current local Electron launch entry and was not modified.
- Acceptance result: Passed. IPC registry is used, preload/main boundary is typed, production renderer no longer silently falls back to mock, and existing flows pass smoke tests.
- Commit hash: `284fd50d7b47fe15839243bf29b409b479aae23b`.
- Remaining issues: service/repository extraction, migration runner, endpoint registry, permission registry, and deeper payload validation remain queued for later rounds.

## 8. Round 2: Navigation And Module Information Architecture

1. **Round Name**: Navigation And Module Information Architecture.
2. **Final Goal**: Establish one first-level and second-level navigation authority where each tab owns one primary task.
3. **Current Problem Judgment**: `src/shared/navigation.ts` is already central, but labels, route aliases, permission keys, status tags, feature boundaries, and i18n keys are not yet fully schema-validated.
4. **Root-Cause Analysis Requirement**: Identify whether navigation confusion comes from missing module boundaries, old aliases, overstuffed pages, or absent secondary-route tests.
5. **Upstream/Downstream Chain Review Requirement**: Trace sidebar click -> route -> active tab -> page registry -> permission -> status label -> breadcrumb/topbar -> tests.
6. **Explicit Task Goals**: Make module names expand into concrete functions, route all pages through shared config, and remove duplicated navigation data.
7. **Detailed Task List**: Add navigation schema validation, route alias migration map, module/page registry, permission-to-route map, status label source, breadcrumb source, and old-route tests.
8. **Parallel Task Groups**: Lane A owns navigation schema and tests. Lane B owns module page registry and route cleanup. Lane C owns docs and screenshot/smoke coverage.
9. **Files/Modules In Scope**: `src/shared/navigation.ts`, renderer shell, module page registry, Playwright UI smoke tests, docs.
10. **Forbidden Scope**: No new first-level modules. No hardcoded Sidebar/Router/Page navigation copies. No fake implemented tabs.
11. **Learning Objects**: CCS for clear sidebar and quick switching, Cherry Studio for customizable sidebars, n8n for workflow navigation and execution pages.
12. **Reference Capabilities**: Existing `resolveNavigation`, Playwright route checks, module boundary docs.
13. **Unified Authority Source Requirement**: Routes, module IDs, tab IDs, labels, i18n keys, permissions, status, icons, and feature boundaries must be derived from one config.
14. **Old-Link Deletion Requirement**: Remove old aliases after tests prove no current page or doc depends on them. Keep migration aliases only with explicit deprecation notes.
15. **Data Migration Requirement**: If saved UI state references old module IDs, provide migration from old route to new route.
16. **UI/UX Requirement**: Sidebar must show product/function names, not internal route strings. Each page should have one primary task.
17. **i18n Requirement**: Navigation labels must move to i18n keys in Round 4 or be prepared here without new hardcoded copies.
18. **Theme Requirement**: Active, hover, disabled, planned, and environment-limited states must use theme tokens.
19. **Security Requirement**: Permission keys in nav are display hints only; main-process enforcement remains authority.
20. **Test Requirement**: UI smoke clicks every module and tab, verifies route, heading, active state, and no route leak.
21. **Acceptance Criteria**: One navigation source; no duplicated tab arrays; unknown routes recover; planned tabs are honest; sidebar is readable at supported widths.
22. **Convergence Criteria**: A new page cannot be added without adding a registry entry, i18n key, permission status, and test.
23. **Risks**: Removing aliases too early can break bookmarks or tests.
24. **Rollback Strategy**: Keep alias compatibility behind a typed migration map and revert page registry changes as one unit.
25. **Deliverables**: Navigation registry, schema tests, updated UI smoke, route migration notes, docs.
26. **Next Round Input**: Stable IA for global UI and design system.

### Round 2 Execution Status

- Status: Completed.
- Completion date: 2026-05-14.
- Main changed files:
  - `src/shared/navigation.ts`
  - `src/renderer/components/ModulePageFrame.tsx`
  - `src/renderer/AppShell.tsx`
  - `src/renderer/App.tsx`
  - `src/renderer/modules/modulePageRegistry.tsx`
  - `src/renderer/styles.css`
  - `tests/app.test.tsx`
  - `tests/ui-smoke.spec.ts`
  - `docs/implementation/round-02-navigation-ia-closure.md`
- Added/modified functionality: added route alias metadata, restored visible content-area secondary navigation, added module page registry, and updated tests to verify navigation authority and route/page synchronization.
- Deleted old links: removed test expectations that second-level navigation must be absent. Legacy route aliases were not deleted; they now have owner and `round-15-quality-gates` deletion milestone.
- Test commands and results:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test`: passed, 3 files / 12 tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
  - `npm.cmd run test:electron-smoke`: passed.
  - `npm.cmd run verify`: passed.
- Desktop shortcut result: `C:\Users\至亲\Desktop\NexaChat.lnk` still points to the current local Electron launch entry and was not modified.
- Acceptance result: Passed. One navigation source exists; alias recovery is metadata-backed; every module has a page renderer; second-level navigation is visible and route-synced.
- Commit hash: `075a87c0a4a2acfdb0cfb62f51951dfee38611b8`.
- Remaining issues: i18n labels, theme tokens, permission-to-route registry, and further page decomposition are queued to later rounds.

## 9. Round 3: Global UI And Design System Refactor

1. **Round Name**: Global UI And Design System Refactor.
2. **Final Goal**: Establish a compact, flat, maintainable desktop design system for all pages.
3. **Current Problem Judgment**: UI is improved but still has uneven density, page-level styling, hardcoded layout choices, and inconsistent component patterns.
4. **Root-Cause Analysis Requirement**: Determine whether each UI problem is caused by missing tokens, missing component primitives, overstuffed page content, or missing information hierarchy.
5. **Upstream/Downstream Chain Review Requirement**: Trace token -> primitive -> page layout -> state component -> responsive smoke -> screenshots.
6. **Explicit Task Goals**: Unify color, spacing, radius, shadow, typography, borders, state colors, cards, tables, forms, empty/error/loading states, sidebar, topbar, and right rail.
7. **Detailed Task List**: Create theme tokens, component primitives, table patterns, form patterns, status patterns, empty/error/loading patterns, responsive constraints, and screenshot checks.
8. **Parallel Task Groups**: Lane A owns tokens and primitives. Lane B owns shell/sidebar/topbar. Lane C owns module page adoption and visual smoke.
9. **Files/Modules In Scope**: Renderer CSS, shared theme config, UI components, AppShell, module pages, Playwright visual checks.
10. **Forbidden Scope**: No Liquid Glass, no heavy blur, no decorative hero, no one-note palette, no nested cards, no page section as floating card, no business behavior changes.
11. **Learning Objects**: CCS / cc switch for compact desktop-tool surfaces, Open WebUI for local-first AI surface clarity, Chatbox/Cherry/AnythingLLM for desktop conversation ergonomics, Dify for workflow admin clarity.
12. **Reference Capabilities**: `ui-ux-pro-max` guidance, Playwright screenshots, responsive overflow checks.
13. **Unified Authority Source Requirement**: All colors, spacing, radius, typography, shadows, borders, state colors, and layout constants must come from token sources.
14. **Old-Link Deletion Requirement**: Delete per-page duplicate CSS and old class names after component migration.
15. **Data Migration Requirement**: Preserve existing UI preferences and migrate values only if token names change.
16. **UI/UX Requirement**: Pages must be scannable, dense but calm, and optimized for repeated desktop use. Sidebar display issues and information overload must be fixed structurally.
17. **i18n Requirement**: UI components must accept text via keys or props from i18n authority. Do not add literal UI copy.
18. **Theme Requirement**: Tokens must support light, dark, and system modes even if Round 5 completes runtime switching later.
19. **Security Requirement**: Error states must not expose secrets or private paths.
20. **Test Requirement**: Typecheck, unit tests, UI smoke, Electron smoke, responsive screenshot checks at 1040, 1280, 1440, 1920.
21. **Acceptance Criteria**: All major pages use shared primitives; no local color hardcoding; no horizontal overflow; sidebar readable; states consistent.
22. **Convergence Criteria**: Future UI work can be built from primitives without page-specific visual inventions.
23. **Risks**: Pure styling changes can hide unresolved IA problems.
24. **Rollback Strategy**: Token and primitive changes must be isolated so visual regressions can be reverted without data changes.
25. **Deliverables**: Design system source, component inventory update, screenshots, smoke results, docs.
26. **Next Round Input**: Token and component foundation for i18n and theme switching.

### Round 3 Execution Status

- Status: Completed.
- Completion date: 2026-05-14.
- Main changed files:
  - `src/shared/theme.ts`
  - `src/renderer/styles.css`
  - `tests/theme-token-authority.test.ts`
  - `tests/app.test.tsx`
  - `tests/ui-smoke.spec.ts`
  - `docs/architecture/design-token-authority.md`
  - `docs/implementation/round-03-design-system-closure.md`
  - `docs/implementation/full-app-round-execution-matrix.md`
- Added/modified functionality: added typed theme token authority, expanded semantic CSS variables for light and dark rendering, removed local literal colors/raw radii outside token declarations, added token-regression tests, and extended responsive screenshot coverage to 1040/1280/1440/1920 widths.
- Deleted old links: removed local CSS literals for active chat rows, user message bubbles, planned panels, code snippets, one-time secret notices, diagnosis blocks, endpoint chips, right rail, and pill indicators. No business behavior or data chain was changed.
- Test commands and results:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test -- tests/theme-token-authority.test.ts`: passed, 1 file / 3 tests.
  - `npm.cmd run test`: passed, 4 files / 15 tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests and screenshots under ignored `test-results/round-03-design-system/`.
  - `npm.cmd run test:electron-smoke`: passed.
  - `npm.cmd run verify`: passed.
  - `git diff --check`: passed with CRLF conversion warnings only.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` still targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and uses `D:\NexaChat\assets\app-icon.ico,0`.
- Acceptance result: Passed. Design token authority exists, local color/radius hardcoding is removed from active CSS outside token declarations, responsive smoke covers the required widths, and existing UI/Electron flows still pass.
- Commit hash: `7a89160d0c83733b80176cda7643cc401e2dcdd2`.
- Remaining issues: Round 4 still owns full i18n migration. Round 5 still owns runtime light/dark/system theme resolver and system preference listener.

## 10. Round 4: Chinese / English Switching And i18n Authority

1. **Round Name**: Chinese / English Switching And i18n Authority.
2. **Final Goal**: Add live Chinese/English switching with zero hardcoded UI text.
3. **Current Problem Judgment**: UI and service messages contain hardcoded Chinese and English phrases, including navigation, buttons, statuses, errors, empty states, logs, seed data, and notices.
4. **Root-Cause Analysis Requirement**: Classify text by owner: UI text, runtime error, audit action, seed data, test fixture, documentation, or external protocol field.
5. **Upstream/Downstream Chain Review Requirement**: Trace i18n key -> dictionary -> renderer component -> settings preference -> persistence -> test scan.
6. **Explicit Task Goals**: Create an i18n authority, wire settings language switch, migrate visible text, and add hardcode scans.
7. **Detailed Task List**: Add dictionaries, typed key helpers, nav text migration, component text migration, error/empty/loading/status migration, settings language control, persistence, tests, and scanner.
8. **Parallel Task Groups**: Lane A owns i18n core and settings persistence. Lane B owns navigation/shell/page migration. Lane C owns scan tooling and tests.
9. **Files/Modules In Scope**: `src/shared/i18n/*`, navigation, renderer components/pages, errors, settings, tests, docs.
10. **Forbidden Scope**: No UI text literals in components except test IDs and external protocol constants. Do not translate internal database IDs or protocol fields.
11. **Learning Objects**: CCS for zh/en/ja i18n discipline, Cherry Studio and Chatbox for bilingual desktop UX, Dify for workspace text organization.
12. **Reference Capabilities**: Static text scanner, typed i18n keys, Playwright language switch checks.
13. **Unified Authority Source Requirement**: All UI copy, navigation copy, button text, form labels, statuses, errors, empty states, loading states, and log display text must come from dictionaries.
14. **Old-Link Deletion Requirement**: Remove old literal text after migration. Do not leave parallel `label` and `labelKey` as independent sources.
15. **Data Migration Requirement**: Existing `uiPreferences.language` values must migrate to canonical locale IDs.
16. **UI/UX Requirement**: Language switching must be immediate and must not restart the app.
17. **i18n Requirement**: This round is the i18n authority round. It must include zh-CN and en-US parity and missing-key fallback tests.
18. **Theme Requirement**: Language switch must not reset theme, density, font, or reduced-motion settings.
19. **Security Requirement**: Security and error text must be translated without exposing secret values or raw paths.
20. **Test Requirement**: i18n hardcode scan, missing-key scan, language-switch UI smoke, settings persistence test, typecheck, unit tests, build.
21. **Acceptance Criteria**: No hardcoded UI Chinese or English phrases; language switch works live; settings persists; tests catch missing keys.
22. **Convergence Criteria**: Future UI text cannot compile or pass scan unless added to the i18n authority.
23. **Risks**: Seed/demo data may be incorrectly classified as UI text; scanner needs allowlists.
24. **Rollback Strategy**: Keep i18n migration branchable by module and preserve old behavior behind dictionaries only.
25. **Deliverables**: i18n authority, migrated UI text, scanners, tests, docs.
26. **Next Round Input**: Text authority ready for theme and settings refinement.

### Round 4 Execution Status

- Status: Completed.
- Completion date: 2026-05-15.
- Main changed files:
  - `src/shared/i18n.ts`
  - `src/renderer/i18n.tsx`
  - `src/shared/navigation.ts`
  - `src/renderer/App.tsx`
  - `src/renderer/AppShell.tsx`
  - `src/renderer/components/ErrorDiagnosisPanel.tsx`
  - `src/renderer/components/ModulePageFrame.tsx`
  - `src/renderer/components/StatusPill.tsx`
  - `src/renderer/modules/ChatPage.tsx`
  - `src/renderer/modules/DashboardPage.tsx`
  - `src/renderer/modules/DataPage.tsx`
  - `src/renderer/modules/GatewayPage.tsx`
  - `src/renderer/modules/KnowledgePage.tsx`
  - `src/renderer/modules/ModelsPage.tsx`
  - `src/renderer/modules/SettingsPage.tsx`
  - `src/renderer/modules/ToolsPage.tsx`
  - `src/renderer/modules/shared.tsx`
  - `src/renderer/mockApi.ts`
  - `src/main/services/store.ts`
  - `src/shared/errors.ts`
  - `src/shared/types.ts`
  - `tests/i18n-authority.test.ts`
  - `tests/app.test.tsx`
  - `tests/ui-smoke.spec.ts`
  - `scripts/ui-smoke.mjs`
  - `scripts/electron-smoke.mjs`
  - `src/main/index.ts`
  - `package.json`
  - `playwright.config.ts`
- Added/modified functionality: added a typed zh-CN/en-US i18n authority, renderer i18n provider and `t()` hook, dictionary-backed navigation/shell/page/error/status/settings text, live language switching through persisted UI preferences, i18n parity and hardcoded-CJK scanner tests, and language-switch UI smoke coverage. Also fixed the production Electron renderer entry by serving `dist` through a `nexachat://` protocol instead of `file://`, and made smoke scripts own their Vite/Electron test lifecycle.
- Deleted old links: removed migrated hardcoded CJK UI text from the renderer authority files and removed old Playwright webServer lifecycle dependence that left UI smoke hanging after tests passed. No provider/model/gateway/RAG business chain was deleted in this round.
- Test commands and results:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test`: passed, 5 files / 18 tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run verify`: passed.
  - `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests including live language switch to en-US and theme preservation.
  - `npm.cmd run test:electron-smoke`: passed after `nexachat://` production renderer loading and smoke-only GPU/userData isolation.
  - `git diff --check`: passed with LF/CRLF warnings only.
- Desktop shortcut result: `C:\Users\至亲\Desktop\NexaChat.lnk` still targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"` as the app argument, uses `D:\NexaChat` as working directory, and points to `D:\NexaChat\assets\app-icon.ico,0`. No shortcut was modified.
- Acceptance result: Passed. UI/navigation/status/error/settings copy now comes from the i18n authority, zh-CN and en-US dictionaries stay in parity, language switching is live and persisted, theme/density/font/motion are not reset by the language switch, and tests catch missing keys plus new CJK literals in migrated files.
- Commit hash: `4e32be97af796c0b008393ed77b7dab5b67af25f`.
- Push result: `git push origin main` succeeded (`36c6d8c..4e32be9 main -> main`). `git ls-remote origin refs/heads/main` and a one-time proxy retry both failed because GitHub HTTPS was unreachable from the current host after the push.
- Remaining issues: None for Round 4. Round 5 owns full system-theme resolution and screenshot regression coverage.

## 11. Round 5: Dark / Light / System Theme

1. **Round Name**: Dark / Light / System Theme.
2. **Final Goal**: Add real light, dark, and follow-system modes with unified persistence and immediate switching.
3. **Current Problem Judgment**: `UiPreferences` already has `theme`, but components can still rely on local colors and Settings must not force dark mode.
4. **Root-Cause Analysis Requirement**: Find whether theme inconsistencies come from CSS literals, component props, browser default styles, or missing token mappings.
5. **Upstream/Downstream Chain Review Requirement**: Trace OS preference -> settings -> persisted preference -> document attribute -> CSS variables -> components -> screenshot tests.
6. **Explicit Task Goals**: Implement theme runtime, persistence, token mapping, and regression tests.
7. **Detailed Task List**: Add theme resolver, system listener, settings control, token sets, migration of local colors, status colors, chart/table/form states, and visual tests.
8. **Parallel Task Groups**: Lane A owns theme runtime and persistence. Lane B owns token migration and components. Lane C owns screenshots and regression tests.
9. **Files/Modules In Scope**: theme authority, renderer styles, UI components, settings page, UI tests.
10. **Forbidden Scope**: Do not hardcode colors in components. Do not force dark theme in Settings. Do not reset language or density during theme switch.
11. **Learning Objects**: CCS for dark/light/system setting, Chatbox/Cherry/AnythingLLM for desktop theme simplicity.
12. **Reference Capabilities**: CSS variables, `prefers-color-scheme`, Playwright screenshot comparison, color scan.
13. **Unified Authority Source Requirement**: Theme values must come from token authority only.
14. **Old-Link Deletion Requirement**: Remove old local CSS literals and old theme-specific class hacks.
15. **Data Migration Requirement**: Normalize stored theme values to `light`, `dark`, or `system`.
16. **UI/UX Requirement**: Theme switching must be immediate, stable, and readable across every module.
17. **i18n Requirement**: Theme control labels come from i18n.
18. **Theme Requirement**: This round owns full theme authority and regression.
19. **Security Requirement**: No sensitive data in screenshots or debug overlays.
20. **Test Requirement**: Theme regression smoke in light/dark/system, no color-hardcode scan, typecheck, unit tests, build, Electron smoke.
21. **Acceptance Criteria**: All pages readable in light and dark; system mode follows OS; Settings does not force dark; no local color literals remain outside token authority.
22. **Convergence Criteria**: Future components cannot introduce local theme values without failing scan.
23. **Risks**: Visual regressions can appear in dense tables and status badges.
24. **Rollback Strategy**: Token mapping can revert separately from settings persistence.
25. **Deliverables**: Theme authority, settings switch, migrated CSS, tests, screenshots, docs.
26. **Next Round Input**: UI foundation ready for real Provider and model chain.

### Round 5 Execution Status

- Status: Completed.
- Completion date: 2026-05-15.
- Main changed files:
  - `src/shared/theme.ts`
  - `src/shared/types.ts`
  - `src/main/repositories/mappers.ts`
  - `src/main/services/store.ts`
  - `src/renderer/AppShell.tsx`
  - `src/renderer/mockApi.ts`
  - `tests/theme-token-authority.test.ts`
  - `tests/ui-smoke.spec.ts`
  - `docs/architecture/design-token-authority.md`
  - `docs/implementation/round-05-theme-runtime-closure.md`
  - `docs/implementation/full-app-round-execution-matrix.md`
  - `PROJECT_PROGRESS.md`
  - `task_plan.md`
  - `progress.md`
  - `findings.md`
- Added/modified functionality: added shared theme normalization and resolver helpers, normalized stored and mock theme preferences, resolved `system` against `prefers-color-scheme`, updated shell DOM state with stored/resolved theme attributes, and expanded theme regression tests and screenshots.
- Verification:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test -- tests/theme-token-authority.test.ts`: passed, 1 file / 5 tests.
  - `npm.cmd run test`: passed, 5 files / 20 tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run verify`: passed.
  - `npm.cmd run test:ui-smoke`: passed, 11 Playwright tests.
  - `npm.cmd run test:electron-smoke`: passed.
  - `git diff --check`: passed with CRLF conversion warnings only.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` still targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and uses `D:\NexaChat\assets\app-icon.ico,0`.
- Acceptance result: Passed. Light, dark, and system theme modes now share one resolver; system follows OS preference changes live; Settings preserves language, density, font, and motion while switching theme.
- Commit hash: `6cc6b641ddb57a2e269485bd6b0c5159f2fb3947` for Round 5 delivery; `220bceca31c77949b8d27272be41125a0d6dc58d` records final closeout and remote confirmation.
- Push result: `origin/main` confirmed at `220bceca31c77949b8d27272be41125a0d6dc58d`.
- Remaining issues: None for Round 5. Round 6 owns real Provider/model invocation and removal/isolation of the production mock chain.

## 12. Round 6: Provider, Model And Real Invocation Chain

1. **Round Name**: Provider, Model And Real Invocation Chain.
2. **Final Goal**: Implement a real, unified upstream Provider call chain with model management, key storage, connection testing, streaming, cancellation, retry, timeout, fallback, and clear errors.
3. **Current Problem Judgment**: Provider and model records exist, but chat behavior is still local/demo in key places and must not coexist with a fake-real dual chain.
4. **Root-Cause Analysis Requirement**: Identify where demo/local response generation, provider health checks, gateway forwarding, and router decisions diverge.
5. **Upstream/Downstream Chain Review Requirement**: Trace UI model selection -> router -> provider adapter -> secret lookup -> HTTP call -> stream/cancel/retry/timeout -> request log -> usage -> audit -> chat message.
6. **Explicit Task Goals**: Build OpenAI-compatible provider calling first, reserve DeepSeek/OpenAI/Claude-compatible/local adapters, and delete or isolate mock behavior.
7. **Detailed Task List**: Provider adapter interface, model capability schema, request parameter schema, secret service, health test, streaming parser, cancel controller, retry policy, timeout policy, fallback policy, error taxonomy, usage calculation.
8. **Parallel Task Groups**: Lane A owns provider adapter and secret boundary. Lane B owns router, request lifecycle, streaming/cancel. Lane C owns UI status, tests, docs.
9. **Files/Modules In Scope**: provider/model services, router service, gateway service, secret service, request logs, chat service, models UI, chat UI, tests.
10. **Forbidden Scope**: No second real call chain. No raw API keys in renderer. No fake success if upstream fails. No new Provider names scattered in UI.
11. **Learning Objects**: Open WebUI for provider-agnostic model management, CCS for provider presets and failover, sub2api for scheduling/rate limits, Cherry Studio for custom providers and key rotation.
12. **Reference Capabilities**: Native fetch/HTTP client, AbortController, streaming parser, test mocks, local gateway smoke.
13. **Unified Authority Source Requirement**: Provider types, model IDs, model capability flags, endpoints, request params, error codes, and adapter names must be centralized.
14. **Old-Link Deletion Requirement**: Remove demo response path from production chain or mark it test-only behind explicit test API.
15. **Data Migration Requirement**: Add provider/model fields only through migrations. Existing records must map to canonical provider type and capability schema.
16. **UI/UX Requirement**: Provider setup must show actionable connection status, model list, selected model, request state, streaming state, cancel, retry, and fallback reason.
17. **i18n Requirement**: Provider labels, errors, statuses, and empty states must use i18n.
18. **Theme Requirement**: Streaming, error, warning, healthy, disabled, and fallback states use theme tokens.
19. **Security Requirement**: Raw keys remain in secure storage; logs redact Authorization, API keys, custom sensitive headers, request bodies when configured.
20. **Test Requirement**: Adapter unit tests, mocked upstream integration tests, streaming/cancel tests, timeout/retry tests, request log tests, UI smoke, gateway smoke.
21. **Acceptance Criteria**: One real invocation chain exists; OpenAI-compatible provider works; streaming/cancel/retry/timeout/fallback are defined; mock chain is not production default.
22. **Convergence Criteria**: All future providers implement one adapter contract and one logging/security contract.
23. **Risks**: Network tests can be flaky; use local mocked upstream for deterministic verification.
24. **Rollback Strategy**: Keep provider adapter behind feature boundary until smoke passes, then remove old production path in same round.
25. **Deliverables**: Provider adapter system, router/runtime chain, updated UI, tests, docs, progress update.
26. **Next Round Input**: Real model invocation ready for richer conversation features.

### Round 6 Execution Status

- Status: Completed.
- Completion date: 2026-05-15.
- Parallel lanes:
  - Lane A: Provider adapter, endpoint/error/policy authority, and main-process secret boundary.
  - Lane B: `store.sendMessage`, provider health test, request lifecycle, retry/timeout/cancel/stream parser, logs, usage, and audit.
  - Lane C: Gateway forwarding smoke, UI smoke, Electron smoke, documentation, and desktop shortcut verification.
  - Lane D: read-only Round 7 risk review for conversation lifecycle dependencies.
- Root-cause result: Chat UI and local Gateway both terminated in `store.sendMessage()`, but that method generated local assistant text and `testProvider()` did not call the upstream. Seed data also created a fake demo Provider/model/key, which made the fake path look production-ready.
- Chain review result: UI model selection -> preload IPC -> `store.sendMessage` -> router -> provider adapter -> main-process secret lookup -> OpenAI-compatible HTTP call -> retry/timeout/cancel/stream parser -> request log -> usage -> audit -> assistant message. Gateway `/v1/chat/completions` now reuses the same chain.
- Main changed files:
  - `src/shared/providerRuntime.ts`
  - `src/main/services/openAiCompatibleAdapter.ts`
  - `src/main/services/store.ts`
  - `src/main/services/localGateway.ts`
  - `src/main/database/connection.ts`
  - `src/shared/i18n.ts`
  - `tests/provider-adapter.test.ts`
  - `tests/provider-store-integration.test.ts`
  - `tests/gateway-provider-chain.test.ts`
  - `docs/implementation/round-06-provider-runtime-closure.md`
  - `docs/implementation/full-app-round-execution-matrix.md`
- Added/modified functionality:
  - Added a shared Provider runtime authority for adapter names, endpoints, timeout/retry policy, and normalized runtime errors.
  - Added a real OpenAI-compatible adapter for `/models` health checks and `/chat/completions` calls.
  - Added streaming response parsing, AbortController cancellation handling, timeout handling, and retry on retryable upstream failures.
  - Kept raw Provider API keys inside main-process secret storage and redacted request/gateway logs.
  - Converted Provider connection testing into a real upstream `/models` call.
  - Converted Chat and Gateway from local response generation to one shared provider invocation chain.
  - Added deterministic local mocked-upstream tests for adapter, Store, and Gateway behavior.
- Deleted old links:
  - Deleted production `generateLocalAssistantReply()`.
  - Removed seed-time fake Provider/Model/API key creation.
  - Removed seed-time fake assistant message generation.
  - Browser `Mock response from nexachat-mock` remains explicit UI-smoke/browser fallback only.
- Test commands and results:
  - `npm.cmd run test -- tests/provider-adapter.test.ts tests/provider-store-integration.test.ts`: passed, 2 files / 7 tests.
  - `npm.cmd run test -- tests/provider-adapter.test.ts tests/provider-store-integration.test.ts tests/gateway-provider-chain.test.ts`: passed, 3 files / 9 tests.
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test`: passed, 8 files / 29 tests.
  - `npm.cmd run test:ui-smoke`: passed, 11 Playwright tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run verify`: passed.
  - `npm.cmd run test:electron-smoke`: passed.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` still targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and uses `D:\NexaChat\assets\app-icon.ico,0`.
- Acceptance result: Passed. OpenAI-compatible Provider invocation now has one production chain shared by Chat and Gateway; streaming/cancel/retry/timeout/fallback/error policy is defined and tested; the production mock chain is removed.
- Commit hash: `45054a81190638e209d06d9373ff83e38763a9fd`.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `b151d8d5bda11ae29589bd08a7d9eaf52c4af1ee`.
- Remaining issues: None for Round 6. Round 7 owns richer conversation lifecycle state, retry/regenerate UI, chunks, attachments, export, and multi-model fan-out.

## 13. Round 7: Conversation System And Multi-Model Experience

1. **Round Name**: Conversation System And Multi-Model Experience.
2. **Final Goal**: Build a reliable conversation system with messages, sessions, context, attachments, system prompts, model switching, multi-model comparison, streaming, cancel, retry, regenerate, copy, and export.
3. **Current Problem Judgment**: Conversations and messages are persisted, but UI and data chain need richer lifecycle states and no UI-owned data structures.
4. **Root-Cause Analysis Requirement**: Determine where conversation state is computed in UI versus service/store and whether message schema supports all lifecycle states.
5. **Upstream/Downstream Chain Review Requirement**: Trace composer -> context builder -> router -> provider call -> message stream -> persistence -> usage/log/audit -> UI refresh -> export.
6. **Explicit Task Goals**: Make conversation/message schema authoritative and support model changes without losing local history.
7. **Detailed Task List**: Message lifecycle, stream chunks, attachment records, prompt templates, context strategies, retry/regenerate semantics, multi-model compare fan-out, export formats, copy/citation behavior.
8. **Parallel Task Groups**: Lane A owns schema/service/context. Lane B owns chat UI and multi-model UX. Lane C owns export/tests/docs.
9. **Files/Modules In Scope**: chat service, conversation/message repositories, context builder, renderer chat page, export service, tests, docs.
10. **Forbidden Scope**: UI must not assemble persistence records itself. No provider-specific chat forks. No fake multi-model comparison without fan-out and logging.
11. **Learning Objects**: Chatbox for multi-model comparison and export, Cherry Studio for one-question-many-answers and history grouping, Open WebUI for context and tools, AnythingLLM for chat modes and logs.
12. **Reference Capabilities**: Streaming tests, local attachments, markdown export, context-window trimming.
13. **Unified Authority Source Requirement**: Conversation status, message status, role, content format, context strategy, export format, and prompt metadata must be centralized.
14. **Old-Link Deletion Requirement**: Delete old direct message append paths and any UI-only conversation state duplicates.
15. **Data Migration Requirement**: Add message chunk, attachment, prompt, and export metadata through migrations. Preserve existing messages.
16. **UI/UX Requirement**: Chat screen remains efficient: conversation list, message timeline, composer, model/context rail. Multi-model comparison must not clutter default chat.
17. **i18n Requirement**: Composer labels, message actions, export labels, errors, and empty states from i18n.
18. **Theme Requirement**: Message bubbles, code blocks, streaming cursor, attachment chips, and compare panels use tokens.
19. **Security Requirement**: Exports must allow redaction; attachments must validate size/type; logs must not leak secrets.
20. **Test Requirement**: Conversation unit tests, streaming UI smoke, cancel/retry/regenerate tests, export tests, schema migration tests.
21. **Acceptance Criteria**: User can continue a conversation across providers/models; message metadata is complete; retry/regenerate/copy/export work; multi-model comparison is honest and logged.
22. **Convergence Criteria**: Chat features share one conversation/message service and one context builder.
23. **Risks**: Multi-model fan-out can complicate usage and error attribution.
24. **Rollback Strategy**: Gate multi-model comparison behind a separate page while preserving core chat.
25. **Deliverables**: Conversation service enhancements, chat UI, tests, docs.
26. **Next Round Input**: Chat and provider chain ready for external local gateway and API key maturity.

### Round 7 Execution Status

- Status: Completed.
- Completion date: 2026-05-16.
- Parallel lanes:
  - Lane A: schema, Store conversation lifecycle, context builder, attachment policy, prompt metadata, chunks, and exports.
  - Lane B: Chat UI lifecycle controls, multi-model comparison UX, i18n, theme-tokened states, and browser mock contract parity.
  - Lane C: unit/integration/UI/Electron tests, documentation, desktop shortcut verification, and Git closeout.
  - Lane D: read-only Round 8 Gateway/API Key risk review for the next implementation boundary.
- Root-cause result: Conversation state had been computed as a one-shot send/display path. `store.sendMessage()` did not persist selected context IDs from a central builder, stream chunks, prompt metadata, export records, retry/regenerate/cancel semantics, attachment policy, or multi-model fan-out state.
- Chain review result: Composer -> preload IPC -> shared `AppApi` and `IPC_CHANNELS` -> main-process Store method -> context builder -> router -> Provider adapter -> provider response/chunks -> message/request log/usage/audit persistence -> snapshot refresh -> Chat UI lifecycle actions -> redacted conversation export. Multi-model comparison now fans out through the same `sendMessage` chain with independent request logs and usage records.
- Main changed files:
  - `src/shared/conversationRuntime.ts`
  - `src/shared/types.ts`
  - `src/shared/api.ts`
  - `src/shared/ipc.ts`
  - `src/preload/index.ts`
  - `src/main/ipc.ts`
  - `src/main/database/schema.ts`
  - `src/main/repositories/mappers.ts`
  - `src/main/services/openAiCompatibleAdapter.ts`
  - `src/main/services/store.ts`
  - `src/renderer/modules/ChatPage.tsx`
  - `src/renderer/mockApi.ts`
  - `src/renderer/styles.css`
  - `src/shared/i18n.ts`
  - `tests/conversation-runtime.test.ts`
  - `tests/app.test.tsx`
  - `tests/ui-smoke.spec.ts`
  - `docs/implementation/round-07-conversation-system-closure.md`
  - `docs/implementation/full-app-round-execution-matrix.md`
- Added/modified functionality:
  - Added `src/shared/conversationRuntime.ts` as the authority for message roles, message status, chunk status/type, export formats, attachment policy, and context limits.
  - Added `message_chunks`, `message_attachments`, `prompt_templates`, and `conversation_exports` schema records while preserving existing messages.
  - Extended shared API, IPC registry, preload bridge, and main IPC handlers for `retryMessage`, `regenerateMessage`, `cancelMessage`, `compareModels`, and `exportConversation`.
  - Updated Store to record selected context message IDs, validate attachment metadata, persist provider chunks, seed a default prompt template, export redacted conversations, and run multi-model comparison through the same Provider chain.
  - Extended the OpenAI-compatible adapter to return normalized chunk arrays for JSON and streaming responses.
  - Updated Chat UI with lifecycle status labels, copy, retry, regenerate, cancel, redacted export, and compact multi-model comparison controls without cluttering the default composer.
  - Updated browser mock to keep explicit UI-smoke parity with the production `AppApi` contract.
  - Added zh-CN/en-US i18n keys for all new lifecycle, export, compare, prompt, and error labels.
- Deleted old links:
  - Removed the unrecorded last-8-message context selection path.
  - Removed the UI-only conversation lifecycle assumption where Chat only had send and display states.
  - Did not add provider-specific chat forks; retry, regenerate, compare, and Gateway continue to use the same Store/provider invocation chain.
  - Browser mock remains explicit browser/UI-smoke fallback only, not a production conversation path.
- Test commands and results:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test -- tests/conversation-runtime.test.ts tests/provider-store-integration.test.ts tests/gateway-provider-chain.test.ts`: passed, 3 files / 6 tests.
  - `npm.cmd run test -- tests/app.test.tsx tests/ipc-contract.test.ts tests/i18n-authority.test.ts`: passed, 3 files / 12 tests.
  - `npm.cmd run test`: passed, 9 files / 31 tests.
  - `npm.cmd run test:ui-smoke`: passed, 11 Playwright tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
  - `npm.cmd run test:electron-smoke`: passed.
  - `git diff --check`: passed with LF/CRLF conversion warnings only.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` still targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and uses `D:\NexaChat\assets\app-icon.ico,0`.
- Acceptance result: Passed. A user can continue a conversation across models, context IDs and chunks are persisted, retry/regenerate/copy/export controls are available, and multi-model comparison honestly fans out through the real Provider chain with independent logs.
- Commit hash: `d1b9bb66470cb133be892a09a963b0d7a99c3c7f` for Round 7 delivery; `14d8d42da4fccd7063e4a321c2235a57206ed397` records closeout and remote confirmation.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `14d8d42da4fccd7063e4a321c2235a57206ed397`.
- Remaining issues: None for Round 7. Round 8 owns Gateway API Key lifecycle, scopes, limits, config import, snapshots, and rollback.

## 14. Round 8: Local Gateway And API Key

1. **Round Name**: Local Gateway And API Key.
2. **Final Goal**: Complete the local OpenAI-compatible Gateway with API Key generation, disable, rotation, scopes, logs, limits, redaction, import templates, conflict preflight, snapshots, and rollback.
3. **Current Problem Judgment**: Gateway endpoints and keys exist, but lifecycle, import compatibility, rate limits, and real provider forwarding must mature.
4. **Root-Cause Analysis Requirement**: Identify whether gateway behavior is blocked by provider runtime, API key schema, rate-limit absence, or import/export gaps.
5. **Upstream/Downstream Chain Review Requirement**: Trace external client -> API key auth -> scope/quota/rate check -> router -> provider call -> response -> log/usage/audit -> UI.
6. **Explicit Task Goals**: Support external tools through API keys and make import from sub2api/CCS-style configs safe and reversible.
7. **Detailed Task List**: Key lifecycle, key rotation, scope registry, quota/rate limiter, gateway logs, usage by key, external config generator, import preflight, conflict resolver, snapshot, rollback, OpenAI-compatible error shapes.
8. **Parallel Task Groups**: Lane A owns gateway auth/limits/logs. Lane B owns import/export/snapshot/rollback. Lane C owns UI/tests/docs.
9. **Files/Modules In Scope**: localGateway, gateway service, API key service, import/export service, router, provider adapter, gateway UI, tests.
10. **Forbidden Scope**: No plaintext API keys after one-time reveal. No unsafe direct overwrite import. No duplicated Provider key and Gateway key logic.
11. **Learning Objects**: sub2api for API Key, quotas, scheduling, billing, concurrency, rate limits; CCS for config import and provider presets; n8n for credential safety.
12. **Reference Capabilities**: Local HTTP smoke, deterministic test clients, redaction tests, snapshot tests.
13. **Unified Authority Source Requirement**: Endpoint paths, scopes, key states, quotas, rate-limit policies, import manifest schema, and error codes must be centralized.
14. **Old-Link Deletion Requirement**: Remove old import confirmation-only path once real import has conflict resolver and rollback.
15. **Data Migration Requirement**: Add key state, rotation, quota, scope, last-used, external-client, and import manifest fields as migrations.
16. **UI/UX Requirement**: Gateway page must clearly separate status, keys, logs, docs, and imports. One-time key reveal must be unmistakable.
17. **i18n Requirement**: Gateway docs, errors, key states, and import steps from i18n.
18. **Theme Requirement**: Key risk states, quota warnings, disabled/revoked state, and logs use tokens.
19. **Security Requirement**: Hash keys, redact logs, enforce scopes in main/gateway, limit body size, protect against localhost abuse and SSRF in upstream config.
20. **Test Requirement**: Gateway endpoint tests, auth/scope tests, rate-limit tests, key rotation tests, import preflight/rollback tests, Electron smoke.
21. **Acceptance Criteria**: External client can call local gateway with a valid key; invalid/revoked/limited keys fail correctly; logs and usage are redacted and attributable; import is reversible.
22. **Convergence Criteria**: Gateway becomes the single external API path and does not bypass provider/router/security.
23. **Risks**: Gateway compatibility can expand too quickly; prioritize `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`, then `/v1/responses`.
24. **Rollback Strategy**: Gateway can be disabled and restored from snapshot without deleting provider/model records.
25. **Deliverables**: Gateway runtime, API key lifecycle, import/rollback, UI, tests, docs.
26. **Next Round Input**: Stable gateway ready for knowledge/RAG integration.

### Round 8 Execution Status

- Status: Completed.
- Completion date: 2026-05-16.
- Parallel lanes:
  - Lane A: Gateway runtime authority, HTTP auth/scope/quota/rate/errors/logs.
  - Lane B: API Key lifecycle, schema migration, import preflight, metadata apply, snapshot, and rollback.
  - Lane C: Gateway/Data UI, browser mock parity, i18n/theme states, tests, docs, shortcut, and Git closeout.
  - Lane D: read-only Round 9 risk review input from Knowledge/RAG boundaries.
- Root-cause result: Provider forwarding was no longer the blocker. The blocker was that Gateway endpoints, scopes, key states, quota/rate checks, error shapes, logs, and import/rollback behavior were scattered and incomplete.
- Chain review result: External client -> bearer token -> key state/scope/quota/rate/expiry/revoke check -> local Gateway endpoint -> router/provider chain or compatibility fallback -> response -> redacted key-attributed Gateway log -> request log/usage/audit -> Gateway/Data UI. Import now preflights manifest metadata, creates rollback snapshots, applies Provider/Model metadata without plaintext secrets, and can roll back imported metadata.
- Main changed files:
  - `src/shared/gatewayRuntime.ts`
  - `src/shared/types.ts`
  - `src/shared/api.ts`
  - `src/shared/ipc.ts`
  - `src/preload/index.ts`
  - `src/main/ipc.ts`
  - `src/main/database/schema.ts`
  - `src/main/database/connection.ts`
  - `src/main/repositories/mappers.ts`
  - `src/main/services/localGateway.ts`
  - `src/main/services/store.ts`
  - `src/renderer/modules/GatewayPage.tsx`
  - `src/renderer/modules/DataPage.tsx`
  - `src/renderer/mockApi.ts`
  - `src/renderer/styles.css`
  - `src/shared/i18n.ts`
  - `tests/gateway-runtime.test.ts`
  - `docs/implementation/round-08-gateway-api-key-closure.md`
  - `docs/implementation/full-app-round-execution-matrix.md`
- Added/modified functionality:
  - Added centralized Gateway endpoint, scope, key-state, error-code, quota/rate, body-limit, and default key policy authority.
  - Added additive DB migrations for key state, rotation lineage, rate windows, Gateway log attribution, import source, rollback snapshot, and applied-entity metadata.
  - Added Gateway key create/update/disable/enable/rotate/revoke lifecycle with one-time reveal after create/rotate.
  - Added Gateway authorization results for missing, invalid, disabled, revoked, expired, scope denied, quota exhausted, and rate limited states.
  - Added HTTP Gateway OpenAI-compatible error shapes, OPTIONS/CORS handling, body-size enforcement, redacted attributed logs, and reserved `/v1/responses` behavior.
  - Added import preflight metadata extraction for OpenAI-compatible/sub2api/CCS-style manifests, metadata apply without plaintext secret import, rollback snapshots, and rollback disabling of imported metadata.
  - Updated Gateway UI key controls and logs, Data import/rollback actions, browser mock parity, and i18n text.
- Deleted old links:
  - Replaced scattered endpoint/scope/error/key policy constants with `src/shared/gatewayRuntime.ts`.
  - Replaced binary Gateway key UI state with full lifecycle states.
  - Replaced confirmation-only import apply with metadata apply plus rollback snapshot.
  - Replaced restore preview-only behavior with rollback mode for imported metadata.
  - Did not create a duplicated Provider secret path; Provider keys and Gateway keys remain separate.
- Test commands and results:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test -- tests/gateway-runtime.test.ts tests/gateway-provider-chain.test.ts tests/ipc-contract.test.ts tests/i18n-authority.test.ts`: passed, 4 files / 10 tests.
  - `npm.cmd run test`: passed, 10 files / 33 tests.
  - `npm.cmd run test:ui-smoke`: passed, 11 Playwright tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
  - `npm.cmd run test:electron-smoke`: passed.
  - `git diff --check`: passed with LF/CRLF conversion warnings only.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` still targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and uses `D:\NexaChat\assets\app-icon.ico,0`.
- Acceptance result: Passed. Valid external Gateway key calls work; invalid/revoked/disabled/scope/rate-limited keys fail correctly; logs are redacted and key-attributed; rotation uses one-time reveal; import metadata apply is reversible by rollback.
- Commit hash: `bc5aaf67b245ce4ac1ff21c810eed06cd5cb8fe9` for Round 8 delivery; `68720bfebe9cc74c047e5097176d012d3d04dda9` records closeout and remote confirmation.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `68720bfebe9cc74c047e5097176d012d3d04dda9`.
- Remaining issues: None for Round 8. Round 9 owns full Knowledge/RAG, real embeddings, vector index, parser pipeline, citations, and file delete/rebuild behavior.

## 15. Round 9: Knowledge Base, RAG And File Processing

1. **Round Name**: Knowledge Base, RAG And File Processing.
2. **Final Goal**: Build a consistent knowledge pipeline for file import, parsing, chunking, embeddings, indexing, retrieval, citations, delete, rebuild, and optional OCR.
3. **Current Problem Judgment**: Knowledge file records and lexical fallback exist, but there is no complete RAG chain or index consistency contract.
4. **Root-Cause Analysis Requirement**: Identify which missing piece blocks RAG: parser, metadata schema, chunking, embedding provider, vector index, retrieval scorer, citation persistence, or UI state.
5. **Upstream/Downstream Chain Review Requirement**: Trace file input -> parser -> chunker -> embedding -> index -> retrieval -> context builder -> chat citation -> delete/rebuild.
6. **Explicit Task Goals**: Create one knowledge record/index/UI state source and prevent file, index, and UI state divergence.
7. **Detailed Task List**: File storage policy, parser interface, PDF/Office/TXT/Markdown plan, OCR extension point, chunk schema, embedding provider, vector index selection, retrieval scoring, citations, rebuild, delete, diagnostics.
8. **Parallel Task Groups**: Lane A owns schema/storage/parsing. Lane B owns embedding/index/retrieval. Lane C owns UI/tests/docs.
9. **Files/Modules In Scope**: knowledge service, file service, embedding service, database migrations, context builder, knowledge UI, chat citation UI, tests.
10. **Forbidden Scope**: No separate UI-only index state. No fake vector labels when lexical fallback is used. No direct filesystem writes outside app data policy.
11. **Learning Objects**: FastGPT for knowledge ingestion and visual workflow integration, Cherry Studio for many file formats and search checks, Open WebUI/AnythingLLM for local knowledge UX, Dify for knowledge app integration.
12. **Reference Capabilities**: Parser libraries only after approval, embedding adapter interface, local test fixtures.
13. **Unified Authority Source Requirement**: File status, parse status, chunk status, index status, citation shape, retrieval strategy, embedding model, and index directory must be centralized.
14. **Old-Link Deletion Requirement**: Delete old lexical-only code from production RAG path once real retrieval is available, or keep it as explicit fallback strategy.
15. **Data Migration Requirement**: Add files, chunks, embeddings, indexes, citations, parse jobs, and deletion tombstones through migrations.
16. **UI/UX Requirement**: Knowledge UI must show import progress, parse failures, chunk counts, index health, retrieval preview, citations, rebuild, and delete.
17. **i18n Requirement**: File statuses, parser errors, empty states, and citation labels from i18n.
18. **Theme Requirement**: Progress, stale, failed, indexed, rebuilding, and cited states use tokens.
19. **Security Requirement**: Validate file types and sizes; prevent path traversal; redact file paths in diagnostics; OCR is opt-in.
20. **Test Requirement**: Parser fixtures, chunk tests, embedding mock tests, retrieval tests, delete/rebuild tests, UI smoke, migration tests.
21. **Acceptance Criteria**: User can import supported text/Markdown first, retrieve cited context in chat, rebuild/delete index, and see consistent metadata. PDF/Office/OCR can be staged if dependencies are not yet approved.
22. **Convergence Criteria**: File records, index records, and UI state cannot diverge silently.
23. **Risks**: Heavy parser dependencies and OCR can bloat desktop package.
24. **Rollback Strategy**: Keep migrations reversible by tombstone and snapshot; do not delete original files until confirmed.
25. **Deliverables**: Knowledge pipeline, RAG integration, UI, tests, docs.
26. **Next Round Input**: Knowledge and retrieval ready for Agent, MCP, Tool, and Workflow.

### Round 9 Execution Status

- Status: Completed.
- Completion date: 2026-05-16.
- Parallel execution:
  - Lane A: schema, migrations, Store knowledge pipeline, parser/chunk/embedding/retrieval/citation contracts.
  - Lane B: Knowledge UI, Chat citation display, browser mock parity, i18n, and UI smoke behavior.
  - Lane C: tests, build, Electron smoke, desktop shortcut readback, docs, and Git closeout.
  - Lane D: read-only Round 10 Agent/MCP/Tool/Workflow execution-model risk review.
- Main changed files:
  - `src/shared/knowledgeRuntime.ts`
  - `src/shared/types.ts`
  - `src/shared/api.ts`
  - `src/shared/ipc.ts`
  - `src/shared/i18n.ts`
  - `src/main/database/schema.ts`
  - `src/main/database/connection.ts`
  - `src/main/repositories/mappers.ts`
  - `src/main/services/store.ts`
  - `src/main/services/localGateway.ts`
  - `src/main/ipc.ts`
  - `src/preload/index.ts`
  - `src/renderer/modules/KnowledgePage.tsx`
  - `src/renderer/modules/ChatPage.tsx`
  - `src/renderer/mockApi.ts`
  - `src/renderer/styles.css`
  - `tests/knowledge-runtime.test.ts`
  - `tests/ipc-contract.test.ts`
  - `tests/app.test.tsx`
  - `tests/ui-smoke.spec.ts`
  - `docs/implementation/round-09-knowledge-rag-closure.md`
  - `docs/implementation/full-app-round-execution-matrix.md`
  - `PROJECT_PROGRESS.md`
  - `task_plan.md`
  - `progress.md`
  - `findings.md`
- Added/modified functionality:
  - Added the shared knowledge runtime authority for parser policy, import normalization, chunking, stable hashes, lexical embedding, and scoring.
  - Added structured file/chunk/embedding/retrieval/citation contracts and additive migrations.
  - Implemented text/Markdown/JSON/CSV/code-like content import with real chunks from supplied content, honest unsupported-file failure, retrieval trace and citation persistence, chat context injection, rebuild, delete tombstones, and active snapshot filtering.
  - Updated `/v1/embeddings` to use the same lexical embedding authority.
  - Added Knowledge UI import, index health, chunk status, retrieval preview, citation, rebuild, and delete controls.
  - Added Chat citation rendering for assistant messages.
  - Updated browser mock parity for all new knowledge AppApi methods.
- Deleted old links:
  - Replaced placeholder knowledge chunk generation with parser-normalized content chunking.
  - Removed the latest-chunk citation shortcut from the production chat citation path.
  - Replaced file-count-only snapshots with structured active files, chunks, retrieval traces, and citations.
  - Replaced UI-only retry/fallback behavior with typed retry/rebuild/delete/retrieval actions.
- Test commands and results:
  - `npm.cmd run typecheck`: passed through build and verify.
  - `npm.cmd run test -- tests/knowledge-runtime.test.ts tests/ipc-contract.test.ts tests/i18n-authority.test.ts`: passed, 3 files / 8 tests.
  - `npm.cmd run test`: passed, 11 files / 35 tests.
  - `npm.cmd run test:ui-smoke`: passed, 12 Playwright tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
  - `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
  - `git diff --check`: passed with LF/CRLF conversion warnings only.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` still targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and uses `D:\NexaChat\assets\app-icon.ico,0`.
- Acceptance result: Passed. Supported text/Markdown content can be imported and indexed, retrieval returns structured citations, chat displays cited context, rebuild/delete keep file and chunk state consistent, and unsupported PDF/Office/OCR/vector behavior is not advertised as implemented.
- Commit hash: `6e48333e81239e404d6a1d27030f9b70a6ef7e96` for Round 9 delivery; `862caf0574fc8c485e323dba0197953a12a12752` records closeout; `ed7e09ba7227908143fb4d723cbb90403ac70bab` records remote confirmation.
- Push result: delivery, closeout, and remote-confirmation commits pushed; `origin/main` confirmed at `ed7e09ba7227908143fb4d723cbb90403ac70bab`.
- Remaining issues: None for Round 9. Round 10 owns the unified Agent, MCP, Tool, Workflow execution/run/trace/approval model.

## 16. Round 10: Agent, MCP, Tools And Workflow

1. **Round Name**: Agent, MCP, Tools And Workflow.
2. **Final Goal**: Create one safe execution model for MCP, tools, Agent dry-run to real execution, Workflow canvas, nodes, trace, approval, sandbox, and recovery.
3. **Current Problem Judgment**: MCP registry and Agent dry-run exist, but Tool, Agent, and Workflow could easily become three duplicate task systems.
4. **Root-Cause Analysis Requirement**: Determine whether a requested capability is a tool execution, MCP tool call, agent plan step, workflow node, or deterministic import/export job.
5. **Upstream/Downstream Chain Review Requirement**: Trace user intent -> permission check -> plan/dry-run -> approval -> execution -> tool sandbox -> trace -> logs/audit -> recovery.
6. **Explicit Task Goals**: Define one execution model and trace schema before enabling real tool execution.
7. **Detailed Task List**: MCP discovery, server health, tool schema import, tool permission registry, dry-run planner, approval policy, execution queue, trace schema, workflow node schema, error recovery, sandbox policy.
8. **Parallel Task Groups**: Lane A owns MCP/tool registry/security. Lane B owns Agent/run/trace model. Lane C owns Workflow UI/tests/docs.
9. **Files/Modules In Scope**: MCP service, tool service, agent service, workflow service, permission service, audit service, trace schema, UI pages, tests.
10. **Forbidden Scope**: No unsafe real tool execution before permission and sandbox. No separate Agent/Tool/Workflow run tables with incompatible semantics. No fake workflow canvas.
11. **Learning Objects**: Flowise for Assistant/Chatflow/Agentflow and trace/eval/HITL, Langflow for component nodes and MCP, n8n for execution records and recovery, Coze Studio for plugin/agent/resource layering, Dify for workflow apps.
12. **Reference Capabilities**: MCP protocol contracts, JSON schema validation, queue/trace tests, permission tests.
13. **Unified Authority Source Requirement**: Tool IDs, MCP server IDs, workflow node types, run statuses, approval policies, trace event names, and permission keys must be centralized.
14. **Old-Link Deletion Requirement**: Delete dry-run-only mock execution UI once real execution is implemented, or keep it as explicit preview mode.
15. **Data Migration Requirement**: Add tool registry, workflow definitions, run records, trace events, approvals, sandbox decisions, and retry state.
16. **UI/UX Requirement**: Agent, MCP, and Workflow must show capability layers clearly: registry, permission, dry-run, approval, run, trace, recovery.
17. **i18n Requirement**: Tool names from tool metadata; UI labels, run statuses, approvals, and errors from i18n.
18. **Theme Requirement**: Node states, run status, approvals, warnings, and failures use tokens.
19. **Security Requirement**: Main process is permission authority. Renderer only displays. Dangerous tools require explicit approval and audit. Sandbox boundaries must be documented.
20. **Test Requirement**: MCP registry tests, permission tests, dry-run tests, trace tests, failed-run recovery tests, UI smoke, security tests.
21. **Acceptance Criteria**: MCP registration and permission are safe; agent dry-run can progress to controlled real run for allowed no-op/tool fixtures; workflow representation shares execution model.
22. **Convergence Criteria**: Tool, Agent, and Workflow share run and trace primitives.
23. **Risks**: Building a workflow canvas before execution model will create shell debt.
24. **Rollback Strategy**: Disable execution while retaining registry and definitions if security tests fail.
25. **Deliverables**: Unified execution model, MCP/tool/agent/workflow UI, tests, docs.
26. **Next Round Input**: Execution model ready for stronger security, users, permissions, and audit.

### Round 10 Execution Status

- Status: Completed.
- Completion date: 2026-05-16.
- Parallel execution:
  - Lane A: execution runtime authority, schema/migration, Store run/step/trace/approval service.
  - Lane B: Tools Run Center UI, Agent preview migration, browser mock parity, i18n, and UI smoke behavior.
  - Lane C: tests, build, Electron smoke, desktop shortcut readback, docs, and Git closeout.
- Main changed files:
  - `src/shared/executionRuntime.ts`
  - `src/shared/types.ts`
  - `src/shared/api.ts`
  - `src/shared/ipc.ts`
  - `src/shared/i18n.ts`
  - `src/main/database/schema.ts`
  - `src/main/database/connection.ts`
  - `src/main/repositories/mappers.ts`
  - `src/main/services/store.ts`
  - `src/main/ipc.ts`
  - `src/preload/index.ts`
  - `src/renderer/modules/ToolsPage.tsx`
  - `src/renderer/modules/shared.tsx`
  - `src/renderer/mockApi.ts`
  - `tests/execution-runtime.test.ts`
  - `tests/ipc-contract.test.ts`
  - `tests/app.test.tsx`
  - `tests/ui-smoke.spec.ts`
  - `docs/implementation/round-10-execution-model-closure.md`
  - `docs/implementation/full-app-round-execution-matrix.md`
  - `PROJECT_PROGRESS.md`
  - `task_plan.md`
  - `progress.md`
  - `findings.md`
- Added/modified functionality:
  - Added one execution model for Agent preview, safe tool fixtures, future MCP tool calls, and Workflow boundaries.
  - Added `execution_runs`, `execution_steps`, `execution_trace_events`, and `approval_requests`.
  - Added safe read-only status fixture and approval-gated echo fixture.
  - Added `startExecutionRun` and `decideApproval` through shared API, IPC, preload, and main process.
  - Updated Tools Run Center to display runs, steps, approvals, and trace events with approve/deny actions.
  - Updated browser mock parity for all execution APIs.
- Deleted old links:
  - Replaced `previewAgentRun -> config_snapshots(cleanup-preview)` as the production Agent dry-run path.
  - Kept `config_snapshots` for import/export/snapshot records only.
  - Replaced the Run Center planned placeholder with the real shared execution model view.
  - Kept Workflow as execution-kind boundary without a fake canvas.
- Test commands and results:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test -- tests/execution-runtime.test.ts tests/ipc-contract.test.ts tests/i18n-authority.test.ts`: passed, 3 files / 8 tests.
  - `npm.cmd run test`: passed, 12 files / 37 tests.
  - `npm.cmd run test:ui-smoke`: passed, 13 Playwright tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
  - `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
  - `git diff --check`: passed with LF/CRLF conversion warnings only.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` still targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and uses `D:\NexaChat\assets\app-icon.ico,0`.
- Acceptance result: Passed. Agent preview, safe tool fixtures, trace events, approval requests, approval decisions, and completion/cancel states now share one execution model. MCP and Workflow are connected as boundaries without unsafe execution or fake canvas behavior.
- Commit hash: `ddab2066c67044c367e7c28cf8126e450d2a074d` for Round 10 delivery; `3f267dca0d0a7ec67272e3e7e800e01b7ca440cd` records closeout and remote confirmation.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `3f267dca0d0a7ec67272e3e7e800e01b7ca440cd`.
- Remaining issues: None for Round 10. Round 11 owns stronger identity, RBAC/ACL, main-process permission enforcement, and audit hash-chain hardening.

## 17. Round 11: Security, Users, Permissions And Audit

1. **Round Name**: Security, Users, Permissions And Audit.
2. **Final Goal**: Build user/admin, RBAC, ACL, login, session, secret storage, main-process permission enforcement, audit hash chain, export, search, and integrity checks.
3. **Current Problem Judgment**: Security surfaces and audit logs exist, but renderer display must not become permission truth and audit integrity is not yet complete.
4. **Root-Cause Analysis Requirement**: Identify all places where security logic is in UI, service methods trust renderer, or logs can be tampered with.
5. **Upstream/Downstream Chain Review Requirement**: Trace actor -> session -> permission policy -> main action -> secret access -> audit event -> hash chain -> export/search/integrity.
6. **Explicit Task Goals**: Make main process the single security authority and make audit logs tamper-evident.
7. **Detailed Task List**: User schema, admin bootstrap, RBAC/ACL registry, session service, secret service hardening, permission middleware, audit action registry, hash chain, integrity checker, audit export/search.
8. **Parallel Task Groups**: Lane A owns identity/session/permission. Lane B owns audit/hash/export. Lane C owns UI/tests/docs.
9. **Files/Modules In Scope**: security service, permission service, user/session schema, secret service, audit service, IPC middleware, settings/security UI, tests.
10. **Forbidden Scope**: No renderer-only permission enforcement. No raw secret display. No audit deletion without tombstone and permission.
11. **Learning Objects**: n8n for RBAC and credentials, Flowise for RBAC/secret managers, Dify for workspace members, sub2api for admin dashboard and API key accountability.
12. **Reference Capabilities**: SQLite transactions, crypto hash chain, permission policy tests, redaction scanner.
13. **Unified Authority Source Requirement**: Permission keys, roles, ACL resources, audit actions, session states, secret labels, and redaction keys must be centralized.
14. **Old-Link Deletion Requirement**: Remove permission checks from UI as truth and keep only display hints.
15. **Data Migration Requirement**: Add users, roles, sessions, ACL grants, audit hash columns, and secret metadata through migrations.
16. **UI/UX Requirement**: Security UI must show clear state and actions without alarming jargon. Admin actions require confirmation.
17. **i18n Requirement**: Security labels, permission descriptions, audit actions, and errors from i18n.
18. **Theme Requirement**: Risk, warning, success, disabled, and integrity states use tokens.
19. **Security Requirement**: This round owns security hardening. Secrets never leave main. Audit export redacts sensitive data by default.
20. **Test Requirement**: Permission matrix tests, session tests, secret tests, audit hash integrity tests, export redaction tests, UI smoke.
21. **Acceptance Criteria**: Main process rejects unauthorized actions; audit chain verifies; security UI reports integrity; logs do not leak keys.
22. **Convergence Criteria**: Every future sensitive feature must declare permissions and audit actions before implementation.
23. **Risks**: Adding login can add launch friction. Local-first mode may need admin bootstrap without cloud identity.
24. **Rollback Strategy**: Keep local single-user fallback only as explicit compatibility mode with warning and deletion milestone.
25. **Deliverables**: Security authority, audit integrity, UI, tests, docs.
26. **Next Round Input**: Secure data handling foundation for import/export and backup.

### Round 11 Execution Status

- Status: Completed.
- Completion date: 2026-05-16.
- Parallel lanes:
  - Lane A: security runtime authority, role/permission/ACL evaluation, IPC permission mapping, and main-process enforcement.
  - Lane B: schema/migration, local admin/session bootstrap, audit hash chain, export/search/integrity verification, and redaction.
  - Lane C: Settings security/audit UI, browser mock parity, i18n, unit/UI/Electron verification, desktop shortcut readback, and docs/Git closeout.
  - Lane D: read-only Round 12 import/export/backup/recovery pre-audit.
- Main changed files:
  - `src/shared/securityRuntime.ts`.
  - `src/shared/ipc.ts`, `src/shared/api.ts`, `src/shared/types.ts`, `src/shared/i18n.ts`.
  - `src/main/database/schema.ts`, `src/main/database/connection.ts`, `src/main/repositories/mappers.ts`, `src/main/ipc.ts`, `src/main/services/store.ts`.
  - `src/preload/index.ts`.
  - `src/renderer/modules/SettingsPage.tsx`, `src/renderer/mockApi.ts`.
  - `tests/security-runtime.test.ts`, `tests/ipc-contract.test.ts`, `tests/app.test.tsx`, `tests/ui-smoke.spec.ts`, `vite.config.ts`.
- Added/modified functionality:
  - Added centralized security authority for permission keys, roles, session/user states, ACL effects, IPC permission mapping, audit actions, action-permission mapping, and redaction keys.
  - Added security users, roles, sessions, ACL grants, and audit hash-chain columns with additive migration support.
  - Bootstrapped a local owner/admin user and active local session without adding login friction to the desktop launch path.
  - Added main-process permission enforcement before IPC handlers and inside sensitive Store methods.
  - Added defense-in-depth ACL denial behavior with audit evidence for rejected sensitive actions.
  - Added tamper-evident audit records with previous hash, entry hash, permission key, integrity state, integrity verification, search, and redacted export.
  - Added security and audit state to `AppSnapshot` and expanded Settings security/audit UI with session, role, permission count, denied count, integrity status, search, verify, and export actions.
  - Added browser mock parity for security state, audit integrity, audit search, audit verify, and audit export.
  - Raised Vitest test timeout to 15000 ms because the full parallel suite now performs more Store/security bootstrap work and previously hit the 5 s test runner ceiling.
  - Fixed a Round 11 chain issue where reading `getSnapshot()` indirectly wrote `audit.searched`; denied-count is now a read-only audit action count.
- Deleted/replaced old links:
  - Replaced unrestricted IPC handler execution with `IPC_PERMISSION_BY_CHANNEL` enforcement.
  - Replaced role/action strings scattered through Store/UI with `src/shared/securityRuntime.ts`.
  - Replaced mutable audit-only log rows with tamper-evident hash-chain rows.
  - Kept UI permission labels as display hints only; main process remains the enforcement authority.
  - Kept local single-user owner bootstrap only as explicit local-first compatibility for this round; no renderer-only permission truth remains.
- Test commands and results:
  - `npm.cmd run test -- tests/security-runtime.test.ts tests/ipc-contract.test.ts`: passed, 2 files / 7 tests.
  - `npm.cmd run typecheck`: passed.
  - Full `npm.cmd run test`: passed, 13 files / 41 tests.
  - `npm.cmd run test:ui-smoke`: passed, 14 Playwright tests.
  - `npm.cmd run build`: passed.
  - `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
  - `npm.cmd run test:electron-smoke`: passed, Electron shell rendered.
  - `git diff --check`: passed with LF/CRLF conversion warnings only.
- Desktop shortcut result:
  - `C:/Users/至亲/Desktop/NexaChat.lnk` exists.
  - TargetPath: `D:/NexaChat/node_modules/electron/dist/electron.exe`.
  - Arguments: `"D:/NexaChat"`.
  - WorkingDirectory: `D:/NexaChat`.
  - IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
  - No shortcut was modified.
- Acceptance result: Passed for the Round 11 boundary. Main-process permission enforcement rejects unauthorized actions, audit integrity verifies and detects tampering, security UI reports integrity, and exported audit logs are redacted.
- Commit hash: `0bac7f927c90e2087c3bb80a81833ca4c599b629` for Round 11 delivery; `aa7bac441a4a0173f2a6e4749f3e53f4d6be364d` records closeout; `2f80ef6e3bf06ca370f8df0ff9adcc2813080850` records hash backfill and remote confirmation.
- Push result: delivery, closeout, and hash-backfill commits pushed; `origin/main` confirmed at `2f80ef6e3bf06ca370f8df0ff9adcc2813080850`.
- Remaining issues: None for Round 11 after final verification. Round 12 owns full import/export, encrypted backup, migration framework, conflict handling, and rollback.

## 18. Round 12: Data Config, Import/Export, Backup And Recovery

1. **Round Name**: Data Config, Import/Export, Backup And Recovery.
2. **Final Goal**: Implement full import/export, encrypted backup, snapshots, recovery preflight, schema migration, compatibility, conflict handling, and rollback without overwriting user data silently.
3. **Current Problem Judgment**: Import preflight and snapshots exist, but full conflict-aware restore and encrypted backup are not complete.
4. **Root-Cause Analysis Requirement**: Identify whether gaps are in manifest schema, conflict resolver, secret handling, file inclusion, migration, or rollback.
5. **Upstream/Downstream Chain Review Requirement**: Trace export -> redaction/encryption -> manifest -> import preflight -> conflict map -> snapshot -> apply -> rollback -> audit.
6. **Explicit Task Goals**: Create safe, versioned data mobility with no direct overwrite.
7. **Detailed Task List**: Manifest schema, export profiles, encrypted backup, restore preflight, conflict resolver, schema migration runner, version compatibility matrix, snapshot retention, rollback UI, diagnostics bundle.
8. **Parallel Task Groups**: Lane A owns manifest/migration/snapshot. Lane B owns import/export/encryption/conflicts. Lane C owns UI/tests/docs.
9. **Files/Modules In Scope**: import-export service, backup service, schema migrations, file storage policy, data UI, tests.
10. **Forbidden Scope**: No direct overwrite of user data. No plaintext secret export. No destructive cleanup without preview and confirmation.
11. **Learning Objects**: CCS for atomic writes and backups, Cherry Studio for backup/data settings, n8n for import/export and workflow history, sub2api for account/channel import caution.
12. **Reference Capabilities**: JSON schema validation, encryption APIs, SQLite transactions, snapshot fixtures.
13. **Unified Authority Source Requirement**: Manifest versions, import actions, conflict types, backup profiles, migration versions, and rollback states must be centralized.
14. **Old-Link Deletion Requirement**: Delete old preview-only apply paths once real apply and rollback are complete.
15. **Data Migration Requirement**: This round owns migration framework and compatibility checks.
16. **UI/UX Requirement**: Import/export wizard must show precheck, conflicts, secret handling, snapshot, apply, result, and rollback clearly.
17. **i18n Requirement**: Wizard labels, conflict messages, warnings, errors, and results from i18n.
18. **Theme Requirement**: Conflict, warning, destructive, encrypted, success, and failed states use tokens.
19. **Security Requirement**: Encrypted backups, secret redaction by default, password/key handling, audit for all import/restore/cleanup actions.
20. **Test Requirement**: Export/import roundtrip, conflict tests, encrypted backup tests, migration tests, rollback tests, redaction tests, UI smoke.
21. **Acceptance Criteria**: User can export/import supported data safely, create encrypted backup, run recovery preflight, handle conflicts, and rollback.
22. **Convergence Criteria**: Data mobility has one manifest and one migration contract.
23. **Risks**: Backup can become too broad and include private files accidentally.
24. **Rollback Strategy**: Every apply creates a snapshot and rollback record before changes.
25. **Deliverables**: Import/export/backup/recovery system, UI, tests, docs.
26. **Next Round Input**: Reliable data/log base for observability and evaluation.

### Round 12 Execution Status

- Status: Completed.
- Completion date: 2026-05-16.
- Parallel lanes:
  - Lane A: data mobility authority, manifest/conflict/migration/snapshot schema, and Store persistence.
  - Lane B: import/export, encrypted backup, restore preflight, rollback, redaction, and permission/audit enforcement.
  - Lane C: Data UI IA, i18n, navigation, browser mock parity, tests, desktop shortcut readback, docs, and Git closeout.
  - Lane D/E: read-only UI/i18n and test audit lanes for Round 12.
- Main changed files:
  - `src/shared/dataRuntime.ts`.
  - `src/shared/types.ts`, `src/shared/api.ts`, `src/shared/ipc.ts`, `src/shared/securityRuntime.ts`, `src/shared/navigation.ts`, `src/shared/i18n.ts`.
  - `src/main/database/schema.ts`, `src/main/database/connection.ts`, `src/main/repositories/mappers.ts`, `src/main/services/store.ts`, `src/main/ipc.ts`.
  - `src/preload/index.ts`.
  - `src/renderer/modules/DataPage.tsx`, `src/renderer/mockApi.ts`, `src/renderer/AppShell.tsx`.
  - `tests/data-runtime.test.ts`, `tests/ipc-contract.test.ts`, `tests/ui-smoke.spec.ts`.
- Added/modified functionality:
  - Added centralized data mobility authority for manifest version, operation kinds, backup profiles, conflict types/strategies, rollback states, migration version, wizard steps, redaction rules, stable hashes, and restore diff summaries.
  - Added `data_mobility_jobs`, `data_conflicts`, `data_backups`, `migration_runs`, and `rollback_records` schema and migration support.
  - Kept old `validateImportManifest`, `applyImportPlan`, `restoreSnapshot`, `createSnapshot`, and `exportDiagnostics` API compatibility while backing them with structured Round 12 records.
  - Added new AppApi/IPC/preload methods for redacted export package, encrypted backup, restore preflight, and rollback application.
  - Implemented AES-256-GCM encrypted backup in the main process with PBKDF2 passphrase derivation, redacted payloads, package hash, and wrong/invalid backup errors.
  - Added restore preflight from backup records or package text with structured diff summary and conflict records.
  - Added rollback records that disable only records created by the import, without deleting existing local records.
  - Reworked Data module navigation from `import/snapshots/diagnostics/cleanup` to `import/backup/restore/rollback/diagnostics/cleanup`; `/data/snapshots` is now a legacy alias to `/data/backup`, and `/data/backup` is a first-class route.
  - Rebuilt Data UI around import/export, encrypted backup, restore preflight, conflict/rollback, and diagnostics records using structured job fields instead of summary-text filtering.
  - Updated browser mock parity for data mobility jobs, conflicts, backups, migrations, rollback records, encrypted backup, restore preflight, and rollback.
- Deleted/replaced old links:
  - Replaced `cleanup-preview` as the production restore/rollback action with `restore-preflight` and `rollback`.
  - Replaced `summary.includes(...)` restore filtering with structured `operationKind` and rollback records.
  - Replaced `/data/backup -> /data/snapshots` old alias with first-class `/data/backup`; `/data/snapshots` now redirects forward.
  - Replaced preview-only import/apply state with structured job, conflict, backup, migration, and rollback records.
- Test commands and results:
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run test -- tests/data-runtime.test.ts tests/ipc-contract.test.ts tests/app.test.tsx tests/gateway-runtime.test.ts`: passed, 4 files / 17 tests.
  - Full `npm.cmd run test`: passed, 14 files / 47 tests.
  - `npm.cmd run test:ui-smoke`: passed, 15 Playwright tests after fixing browser mock restore-preflight parity and showing operation kind in the restore table.
  - `npm.cmd run build`: passed.
  - `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
  - `npm.cmd run test:electron-smoke`: passed, Electron shell rendered.
  - `git diff --check`: passed with LF/CRLF conversion warnings only.
- Desktop shortcut result:
  - `C:/Users/至亲/Desktop/NexaChat.lnk` exists.
  - TargetPath: `D:/NexaChat/node_modules/electron/dist/electron.exe`.
  - Arguments: `"D:/NexaChat"`.
  - WorkingDirectory: `D:/NexaChat`.
  - IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
  - No shortcut was modified.
- Acceptance result: Passed for Round 12. Export/import and encrypted backup are structured, redacted, permission-gated, conflict-aware, restore-preflight capable, and rollback-capable without silent overwrite or plaintext secret export.
- Commit hash: `4554dc4c47ff2dbf62479a786d486a8968dd78c6` for Round 12 delivery; `b064dae1a90df8ec62fb6cd3ddfd96f9007dafe9` records closeout; `2a14e45598e46fb9697f896a767a3869f0b72433` records closeout-hash backfill.
- Push result: delivery, closeout, and hash-backfill commits pushed; `origin/main` confirmed at `2a14e45598e46fb9697f896a767a3869f0b72433` before this remote-confirmation ledger update.
- Remaining issues: None for Round 12. Round 13 owns observability, usage aggregation, feedback, evaluation, trace dashboard, privacy settings, and retention.

## 19. Round 13: Observability, Usage, Logs, Feedback And Evaluation

1. **Round Name**: Observability, Usage, Logs, Feedback And Evaluation.
2. **Final Goal**: Build token usage, request logs, Provider health, error statistics, feedback, model evaluation, trace, and privacy-first local observability.
3. **Current Problem Judgment**: Request logs, usage records, gateway logs, and audit logs exist, but dashboards, feedback, health history, evals, and trace integration are partial.
4. **Root-Cause Analysis Requirement**: Identify whether metrics are missing at capture, aggregation, schema, UI, or privacy/redaction layer.
5. **Upstream/Downstream Chain Review Requirement**: Trace request -> provider/gateway/chat/tool/workflow -> log/usage/trace/audit -> aggregation -> dashboard -> export/redaction.
6. **Explicit Task Goals**: Make observability useful without leaking API keys, tokens, private prompts, or local paths.
7. **Detailed Task List**: Usage aggregation, provider health history, error taxonomy, feedback records, evaluation sets, model comparison metrics, trace viewer, privacy settings, retention policy, export filters.
8. **Parallel Task Groups**: Lane A owns log/usage/health aggregation. Lane B owns feedback/eval/trace. Lane C owns UI/privacy/tests/docs.
9. **Files/Modules In Scope**: log service, usage service, eval service, trace service, dashboards, settings, tests.
10. **Forbidden Scope**: No raw secret logging. No full prompt export by default. No cloud telemetry without explicit opt-in.
11. **Learning Objects**: Flowise for tracing/evaluations/analytics, n8n for execution logs and redaction, CCS for usage/cost dashboards, Dify for logs and annotation system.
12. **Reference Capabilities**: SQLite aggregation, chart components only if already approved, redaction tests, synthetic eval fixtures.
13. **Unified Authority Source Requirement**: Metric names, log event types, eval statuses, feedback labels, trace event names, retention policies, and privacy settings must be centralized.
14. **Old-Link Deletion Requirement**: Remove duplicate request/gateway log views if one observability model replaces them.
15. **Data Migration Requirement**: Add metrics, health history, feedback, eval sets/results, trace events, and retention policy fields.
16. **UI/UX Requirement**: Observability UI must be filterable, scannable, and close to the repair action. Avoid noisy dashboards.
17. **i18n Requirement**: Metric labels, filters, error explanations, feedback labels, and eval statuses from i18n.
18. **Theme Requirement**: Charts, logs, trend states, health states, and error severities use tokens and accessible colors.
19. **Security Requirement**: Privacy-first local logs, redaction, retention controls, safe diagnostics export.
20. **Test Requirement**: Aggregation tests, redaction tests, eval tests, trace tests, UI smoke, export tests.
21. **Acceptance Criteria**: Usage, logs, provider health, errors, feedback, evals, and traces are available, filterable, and redacted.
22. **Convergence Criteria**: Every runtime chain emits standardized observability events.
23. **Risks**: Too many metrics can clutter UI and slow SQLite.
24. **Rollback Strategy**: Retain raw operational logs only if redacted and bounded; revert dashboard independently from capture.
25. **Deliverables**: Observability services, dashboards, eval/feedback, tests, docs.
26. **Next Round Input**: Production-quality insight for desktop packaging and release.

### Round 13 Execution Status

- Status: Completed.
- Completion date: 2026-05-16.
- Parallel lanes:
  - Lane A: `observabilityRuntime`, schema/migration, Store aggregation, feedback, eval, provider health, privacy export.
  - Lane B: IPC/API/preload/security permission mapping, browser mock parity, Gateway usage UI, Settings feedback/evals/privacy UI.
  - Lane C: runtime/store/IPC/i18n/app/UI smoke tests, desktop shortcut readback, docs, Git closeout.
- Root-cause analysis: request logs, usage records, gateway logs, audit logs, execution traces, and knowledge retrieval traces already existed, but there was no unified local observability authority. Feedback, eval results, provider health history, privacy settings, and redacted observability export were missing, and old Settings aliases still routed feedback/evals/usage to unrelated surfaces.
- Upstream/downstream chain review:
  - Chat/provider/gateway/eval execution -> request logs, usage records, gateway logs, provider health records.
  - Execution/knowledge/audit chains -> existing trace/retrieval/audit records reused by the observability snapshot.
  - Store query/export -> `observabilityRuntime` aggregation and redaction -> Gateway usage, Settings feedback/evals/privacy, browser mock, tests, docs.
- Major changed files:
  - `src/shared/observabilityRuntime.ts`
  - `src/shared/types.ts`
  - `src/main/database/schema.ts`
  - `src/main/database/connection.ts`
  - `src/main/repositories/mappers.ts`
  - `src/main/services/store.ts`
  - `src/shared/ipc.ts`
  - `src/shared/api.ts`
  - `src/preload/index.ts`
  - `src/main/ipc.ts`
  - `src/shared/securityRuntime.ts`
  - `src/shared/navigation.ts`
  - `src/shared/i18n.ts`
  - `src/renderer/mockApi.ts`
  - `src/renderer/modules/GatewayPage.tsx`
  - `src/renderer/modules/SettingsPage.tsx`
  - `src/renderer/modules/DashboardPage.tsx`
  - `src/renderer/styles.css`
  - `tests/observability-runtime.test.ts`
  - `tests/observability-store.test.ts`
  - `tests/ipc-contract.test.ts`
  - `tests/app.test.tsx`
  - `tests/ui-smoke.spec.ts`
- Added or changed functionality:
  - Added centralized observability metric/log/feedback/eval/privacy/redaction authority.
  - Added provider health history, feedback items, eval sets, and eval results tables and migrations.
  - Added Store observability query, feedback create, real Provider-backed evaluation run, privacy save, and redacted export.
  - Added observability IPC/API/preload handlers and security permissions.
  - Added browser mock parity for observability operations used by UI smoke.
  - Added Gateway `usage` page for usage, success rate, provider health, latency, errors, and eval/feedback summary.
  - Added Settings `feedback`, `evals`, and `observability` pages.
  - Updated old aliases so `/settings/usage` routes to `/gateway/usage`, and feedback/evals route to first-class Settings pages.
  - Removed hardcoded dashboard `in / out` token wording in favor of i18n-backed token breakdown.
- Deleted or replaced old links:
  - Replaced `/settings/evals -> /models/router` with `/settings/evals`.
  - Replaced `/settings/feedback -> /settings/audit` with `/settings/feedback`.
  - Replaced `/settings/usage -> /gateway/logs` with `/gateway/usage`.
  - Did not create a duplicate top-level Observability module or duplicate log tables; existing logs remain authoritative inputs.
- Test commands and results:
  - `npm.cmd run typecheck`: Passed.
  - `npm.cmd run test -- tests/observability-runtime.test.ts tests/observability-store.test.ts tests/ipc-contract.test.ts tests/app.test.tsx tests/i18n-authority.test.ts`: Passed, 5 files / 15 tests.
  - `npm.cmd run test:ui-smoke`: Passed, 16 Playwright tests.
  - `npm.cmd run test`: Passed, 16 files / 50 tests.
  - First `npm.cmd run build`: Failed because `tests/observability-runtime.test.ts` used an invalid trace event fixture and stale retrieval trace field. Fixed the test fixture.
  - Rerun `npm.cmd run build`: Passed.
  - `npm.cmd run verify`: Passed, including typecheck, full unit test suite, and build.
  - `npm.cmd run test:electron-smoke`: Passed, Electron shell rendered.
  - `git diff --check`: Passed with LF/CRLF conversion warnings only.
  - `lint`: no lint script exists in `package.json`.
- Desktop shortcut result:
  - `C:/Users/至亲/Desktop/NexaChat.lnk` exists.
  - TargetPath: `D:/NexaChat/node_modules/electron/dist/electron.exe`.
  - Arguments: `"D:/NexaChat"`.
  - WorkingDirectory: `D:/NexaChat`.
  - IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
  - No shortcut was modified.
- Acceptance result: Passed. Usage, logs, provider health history, error statistics, feedback, evals, traces, privacy settings, and redacted local export now share one local observability chain and are visible from focused Gateway/Settings/Tools surfaces.
- Commit hash: delivery `8a94f74892705d39e4107c3c24a0878bb9a36f09`; closeout `d84b413dc4967b44d88a62f182f6577423691688`.
- Remaining issues: None for Round 13. Round 14 owns packaged desktop entry, installer/package artifact, shortcut script/check, crash recovery, and release diagnostics.

## 20. Round 14: Desktop Experience, Packaging, Shortcut And Release

1. **Round Name**: Desktop Experience, Packaging, Shortcut And Release.
2. **Final Goal**: Deliver a clean Electron desktop experience with reliable launch, no extra popups, valid shortcut, simple icon, Windows packaging, installer, update reservation, crash recovery, and startup diagnostics.
3. **Current Problem Judgment**: Current desktop shortcut points to local Electron binary and repo root. There is no standalone packaged executable in the current state.
4. **Root-Cause Analysis Requirement**: Identify launch failures by separating source build, dist assets, Electron main path, shortcut target, packaged app, installer, and user data.
5. **Upstream/Downstream Chain Review Requirement**: Trace shortcut -> executable -> app argument -> working directory -> Electron main -> preload -> renderer dist -> data path -> logs -> crash recovery.
6. **Explicit Task Goals**: Move from local dev launch to a validated packaged desktop entry without breaking current shortcut.
7. **Detailed Task List**: Packaging config, icon validation, installer plan, shortcut creation/update script, launch diagnostics, crash recovery, single-window behavior, auto-update reservation, user-data path policy, smoke tests.
8. **Parallel Task Groups**: Lane A owns packaging and installer. Lane B owns shortcut/launch diagnostics/crash recovery. Lane C owns smoke tests/docs/release notes.
9. **Files/Modules In Scope**: Electron main, Vite config, packaging config, scripts, assets, smoke tests, docs, desktop shortcut verification.
10. **Forbidden Scope**: No system shortcut modification unless using a project-owned script and user-approved release step. No extra startup windows. No hidden background services.
11. **Learning Objects**: AnythingLLM and Chatbox for desktop install/update/log paths, CCS for cross-platform packaging and updater, Cherry Studio for backup and desktop UX.
12. **Reference Capabilities**: Electron smoke, Playwright Electron, Windows COM shortcut readback, installer smoke if available.
13. **Unified Authority Source Requirement**: App name, icon paths, executable paths, data paths, log paths, update channel, shortcut name, and launch args must be centralized.
14. **Old-Link Deletion Requirement**: Delete old dev shortcut path only after packaged shortcut is verified and documented.
15. **Data Migration Requirement**: If app data path changes, migrate existing SQLite and assets safely with backup.
16. **UI/UX Requirement**: Startup should be fast, quiet, and diagnostic when failing. No unnecessary dialogs.
17. **i18n Requirement**: Startup diagnostics, crash messages, installer notes, and shortcut status labels from i18n where visible.
18. **Theme Requirement**: Startup and crash screens use theme tokens once renderer loads; native dialogs remain minimal.
19. **Security Requirement**: Installer and shortcut must not expose secrets in args. Logs must be redacted.
20. **Test Requirement**: Build, package, installer smoke, Electron smoke, shortcut readback, crash recovery test, asset path test.
21. **Acceptance Criteria**: Packaged app launches; desktop shortcut points to current valid entry; no extra popup; icon is correct; diagnostics available; docs updated.
22. **Convergence Criteria**: Every future runtime change rechecks shortcut and packaged launch before release claim.
23. **Risks**: Windows signing or symlink permissions can block packaging.
24. **Rollback Strategy**: Keep current local Electron shortcut documented until packaged shortcut is verified.
25. **Deliverables**: Packaging config, installer or package artifact, shortcut script/check, smoke results, release docs.
26. **Next Round Input**: Release candidate ready for final quality gates.

### Round 14 Execution Status

- Status: Completed.
- Completion date: 2026-05-16.
- Parallel lanes:
  - Lane A: desktop entry authority, unpacked Windows package, release manifest, installer script generation.
  - Lane B: Electron main-process single-instance behavior, startup/crash diagnostics, packaged shortcut migration, shortcut readback.
  - Lane C: package smoke, installer smoke, UI smoke, Electron smoke, docs, Git closeout.
- Root-cause analysis: the previous desktop entry depended on `node_modules/electron/dist/electron.exe` plus the repo root argument. There was no package artifact, installer script, package smoke, shortcut migration script, or packaged launch diagnostics.
- Upstream/downstream chain review:
  - `src/shared/desktopEntry.ts` -> package scripts -> `release/win-unpacked/NexaChat.exe`.
  - Packaged executable -> `resources/app/package.json` -> Electron main -> preload -> renderer dist -> SQLite user data -> diagnostics logs.
  - `shortcut:package` -> desktop `.lnk` -> COM readback -> packaged smoke.
- Major changed files:
  - `.gitignore`
  - `package.json`
  - `src/shared/desktopEntry.ts`
  - `src/main/desktopDiagnostics.ts`
  - `src/main/index.ts`
  - `scripts/desktop-entry.mjs`
  - `scripts/package-win-unpacked.mjs`
  - `scripts/create-installer-script.mjs`
  - `scripts/package-smoke.mjs`
  - `scripts/installer-smoke.mjs`
  - `scripts/shortcut-readback.mjs`
  - `scripts/shortcut-update.mjs`
  - `tests/desktop-entry.test.ts`
  - `docs/implementation/round-14-desktop-packaging-shortcut-release-closure.md`
- Added or changed functionality:
  - Added centralized desktop entry authority for app name, icon paths, package paths, smoke user-data paths, log names, update channel, shortcut name, and launch metadata.
  - Added redacted startup/crash diagnostics in the main process.
  - Added a single-instance lock and second-instance focus behavior so app launch stays one-window.
  - Added reproducible Windows unpacked packaging from current build output.
  - Added a local PowerShell installer script generator and installer smoke.
  - Added packaged executable smoke and packaged desktop shortcut readback.
  - Migrated `C:\Users\至亲\Desktop\NexaChat.lnk` to the packaged executable after package smoke passed.
- Deleted or replaced old links:
  - Replaced the active desktop shortcut target from `D:\NexaChat\node_modules\electron\dist\electron.exe` with `D:\NexaChat\release\win-unpacked\NexaChat.exe`.
  - Kept `shortcut:local` as an explicit rollback script only.
  - Did not add extra startup windows, hidden services, or untracked runtime code paths.
- Test commands and results:
  - `npm.cmd run test -- tests/desktop-entry.test.ts tests/ipc-contract.test.ts`: Passed, 2 files / 6 tests.
  - `npm.cmd run package:release`: Passed; generated `release/win-unpacked/NexaChat.exe` and `release/NexaChat-Setup.ps1`.
  - First `npm.cmd run test:shortcut-readback:packaged`: Failed because COM returned doubled backslashes in `IconLocation`; fixed normalized icon path comparison.
  - First `npm.cmd run test:installer-smoke`: Failed because the generated installer script copied wildcard input unreliably; fixed source-child copy.
  - First parallel installer-smoke/desktop-entry run: Failed because both commands used the same smoke directory; fixed per-process installer smoke directories.
  - `npm.cmd run test:installer-smoke`: Passed.
  - `npm.cmd run test:desktop-entry`: Passed.
  - `npm.cmd run test`: Passed, 17 files / 53 tests.
  - `npm.cmd run test:ui-smoke`: Passed, 16 Playwright tests.
  - `npm.cmd run verify`: Passed, including typecheck, full unit test suite, and build.
  - `npm.cmd run test:electron-smoke`: Passed, Electron shell rendered.
  - `git diff --check`: Passed with LF/CRLF conversion warnings only.
- Desktop shortcut result:
  - `C:/Users/至亲/Desktop/NexaChat.lnk` exists.
  - TargetPath: `D:/NexaChat/release/win-unpacked/NexaChat.exe`.
  - Arguments: empty.
  - WorkingDirectory: `D:/NexaChat/release/win-unpacked`.
  - IconLocation resolves to `D:/NexaChat/assets/app-icon.ico,0`.
  - Shortcut was migrated by `npm.cmd run shortcut:package`.
- Acceptance result: Passed. Packaged app launches, installer smoke passes, shortcut points to the packaged executable, no extra window is created, icon path is verified, startup diagnostics are written, and release artifacts are reproducible from tracked scripts.
- Commit hash: delivery `936cb659e7932ae134d9666653582abca815813e`; closeout pending.
- Remaining issues: None for Round 14. Round 15 owns final quality gates, scanners, release checklist, and convergence audit.

## 21. Round 15: Test System, Quality Gates And Release Convergence

1. **Round Name**: Test System, Quality Gates And Release Convergence.
2. **Final Goal**: Build final quality gates across unit, UI, Electron smoke, E2E, i18n scan, hardcode scan, duplicate route/link scan, dead code scan, security scan, build, packaging, docs, and release.
3. **Current Problem Judgment**: Tests exist and have passed in previous rounds, but quality gates must become comprehensive and hard to bypass.
4. **Root-Cause Analysis Requirement**: Identify where bugs can escape: untyped IPC, untested migration, visual overflow, hardcoded text, duplicate route, secret leak, missing package smoke, or stale docs.
5. **Upstream/Downstream Chain Review Requirement**: Trace each quality gate to the feature chain it protects and the release claim it supports.
6. **Explicit Task Goals**: Make release convergence measurable and repeatable.
7. **Detailed Task List**: Test matrix, CI-ready scripts, E2E flows, i18n scanner, hardcode scanner, duplicate-link scanner, dead-code scan, security redaction scan, migration tests, packaging smoke, docs freshness check.
8. **Parallel Task Groups**: Lane A owns test scripts and CI-ready gates. Lane B owns scanners and security checks. Lane C owns release docs, packaging smoke, and final audit.
9. **Files/Modules In Scope**: `tests/**`, `scripts/**`, package scripts, docs, source under scan, packaging config.
10. **Forbidden Scope**: No claiming success when a command failed. No hiding failures in docs. No changing business code to silence tests without root cause.
11. **Learning Objects**: n8n for execution/debug history, Flowise for evaluation, CCS for type/format/unit quality, Dify for logs and app monitoring.
12. **Reference Capabilities**: `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build`, `npm.cmd run test:ui-smoke`, `npm.cmd run test:electron-smoke`, future lint and smoke scripts.
13. **Unified Authority Source Requirement**: Quality gate list, command names, pass/fail semantics, scan allowlists, and release checklist must be centralized.
14. **Old-Link Deletion Requirement**: Scans must fail on duplicate navigation links, duplicate IPC channels, duplicate route aliases, duplicate provider chains, and stale mock paths.
15. **Data Migration Requirement**: Migration tests must cover fresh install, upgrade, backup, restore, and rollback.
16. **UI/UX Requirement**: UI smoke must cover core workflows, theme modes, language modes, responsive sizes, and no overlap/overflow.
17. **i18n Requirement**: Missing-key, hardcoded phrase, and language-switch regression scans must pass.
18. **Theme Requirement**: Theme token scan and light/dark/system visual checks must pass.
19. **Security Requirement**: Secret leak, redaction, permission, audit integrity, gateway auth, backup encryption, and diagnostics export tests must pass.
20. **Test Requirement**: This round owns all final tests: unit, integration, UI, Electron, E2E, scans, security, build, package.
21. **Acceptance Criteria**: All configured gates pass, or every failure is recorded with exact reason, owner, and fix plan. Release docs reflect real status.
22. **Convergence Criteria**: Project can be handed to any later Codex run with a single quality command and an honest release checklist.
23. **Risks**: Overbroad scans can produce false positives; allowlists must be narrow and justified.
24. **Rollback Strategy**: Gate additions can be softened only with documented rationale, not silently removed.
25. **Deliverables**: Test system, scanner suite, release checklist, final verification matrix, docs.
26. **Next Round Input**: Post-release expansion plan or release hardening backlog.

## 22. Overall Convergence Acceptance Standards

### 22.1 Architecture Convergence

- No double implementation.
- No duplicate chain.
- No old-link residue.
- No mixed-responsibility files.
- No task pollution in the main runtime path.
- Main/preload/renderer/shared/tests/docs boundaries are explicit and tested.
- IPC, schemas, routes, permissions, errors, and audit actions have one authority each.

### 22.2 UI Convergence

- Every page uses the same design system.
- Sidebar has no display problem.
- First-level and second-level navigation are clear.
- Pages are not cluttered.
- Light, dark, and system themes are consistent.
- Chinese and English switching is complete.
- No visible route leak, no text overlap, no whole-app horizontal overflow at supported sizes.

### 22.3 Copy And i18n Convergence

- No hardcoded Chinese UI phrases.
- No hardcoded English UI phrases.
- All UI copy comes from i18n authority.
- Missing-key scans pass.
- Language switch works without restart and does not reset unrelated settings.

### 22.4 Configuration Convergence

- Provider, Model, Route, IPC, Permission, Theme, Status, Error, Audit, Endpoint, Import Manifest, and Desktop Entry values all have unified authorities.
- No scattered constants.
- No local component color or route literals.

### 22.5 Functional Convergence

- Conversation, model, knowledge base, Agent, MCP, Gateway, settings, security, logs, import/export, backup, desktop entry, and packaging all have complete chains.
- No UI-only feature is marked complete.
- No mock-only feature is marked real unless explicitly temporary with a deletion milestone.
- Provider/model/gateway/chat/RAG/tool/audit/backup chains all emit logs, usage, and audit where appropriate.

### 22.6 Test Convergence

- `npm.cmd run typecheck` passes.
- `npm.cmd run test` passes.
- `npm.cmd run build` passes.
- `npm.cmd run test:ui-smoke` passes.
- `npm.cmd run test:electron-smoke` passes.
- `npm.cmd run smoke` or project equivalent passes when added.
- i18n hardcode scan passes.
- Duplicate route/link scan passes.
- Dead code scan passes.
- Security scan passes.
- TypeScript checks pass.
- Lint passes if a lint script exists.
- Packaging smoke passes when packaging is in scope.
- Every failed item is recorded with exact reason, owner, and fix plan.

## 23. Required Start Checklist For Every Future Round

1. Run `git rev-parse --show-toplevel` and confirm work stays inside that root.
2. Check `git branch --show-current`, `git remote -v`, and `git status --short`.
3. Reread Section 2 of this plan.
4. Identify at least two parallel work lanes.
5. Run root-cause questionnaire for the target chain.
6. Identify upstream and downstream links.
7. Identify authority sources touched.
8. Identify old links to delete.
9. Identify migrations and rollback.
10. Identify tests and smoke checks before editing.
11. If code or UI changes occur, recheck the desktop shortcut or packaged entry and record the result.
12. Before commit, run `git status --short` and stage only current-round files.

## 24. Required Closeout Checklist For Every Future Round

1. List changed files.
2. State whether business code, docs, tests, package scripts, data schema, shortcut, or packaging were changed.
3. Run required verification commands.
4. Record exact pass/fail results.
5. Update `PROJECT_PROGRESS.md`.
6. Update relevant docs or handoff surfaces.
7. Check desktop shortcut or packaged entry if runtime/UI changed.
8. Run `git diff --check` before commit.
9. Stage only relevant files.
10. Commit with a clear message.
11. Push to GitHub.
12. Confirm remote ref when push is flaky.
13. Report commit hash, push result, remaining dirty files, shortcut risk, and next recommendation.

## 25. Desktop Shortcut Policy

- The current shortcut is valid for the current local Electron launch model.
- Every future real code, UI, runtime, build, packaging, or launch-entry update must recheck the shortcut.
- If the app gains a packaged executable, the shortcut must migrate from local Electron binary plus repo argument to the packaged executable only after packaged launch smoke passes.
- If the shortcut points to an old project, old executable, missing icon, or stale working directory, record it as a high-priority fix.
- Do not modify system-level shortcut files unless a project-owned script exists and the round explicitly includes shortcut repair.

## 26. This Plan's Own Acceptance Criteria

- Contains at least Round 0 through Round 15.
- Covers architecture, data, IPC, security, Provider/model, chat, gateway/API keys, knowledge/RAG, Agent, MCP, tools, Workflow, audit logs, usage, import/export, settings, desktop, UI, theme, language, tests, packaging, release, docs, and extension.
- Contains hard engineering boundaries: no unowned code accumulation, no hardcoding, no double implementation, no old-link residue, root-cause analysis, upstream/downstream chain review.
- Each round has the required 26 sections.
- Includes learning objects and what each teaches NexaChat.
- Includes total convergence acceptance standards.
- Records desktop shortcut follow-up requirement.
- Can constrain future Codex execution and prevent drift, hallucinated completion, hardcoding, duplicate chains, and stale legacy paths.
