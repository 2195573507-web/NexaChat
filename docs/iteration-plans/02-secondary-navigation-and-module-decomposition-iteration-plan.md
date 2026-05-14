# NexaChat Iteration Plan 02: Secondary Navigation And Module Decomposition

## Goal

Reduce the crowding inside each NexaChat module by turning the existing second-level tabs into real, route-aware subpages. Each first-level module should keep a focused primary surface, while secondary functions move into their own tab content with clear state, empty/error handling, and honest implementation labels.

This round does not add new first-level modules. It makes the current eight-module structure easier to use and prepares the app for deeper feature work without turning any page into a dense admin dump.

## Current Problems Or Target Gaps

- `src/shared/navigation.ts` already defines second-level tabs, but the renderer still behaves mostly as one large page per module.
- `AppShell` renders module tabs visually, but tab buttons do not own active state, route changes, keyboard tab behavior, or content switching.
- `src/renderer/App.tsx` concentrates most module content in one file and each module page mixes several unrelated tasks in a single vertical stack.
- Implemented, planned, and reserved capabilities appear in the same page flow. This is honest in status labels, but still visually crowded.
- The right rail is global and repeated; it should become contextual to the active module/tab instead of competing with primary work.
- Deep links such as `/models/providers` or `/settings/request-logs` are defined in documents but are not yet the source of truth for page state.
- The next layout problem is not just spacing. The information architecture must enforce "one tab, one primary task".

## Iteration Requirements

### 1. Navigation Contract

- Add explicit active tab state alongside the current active module state.
- Parse and generate routes in the shape `/<module>/<tab>`, using the existing tab IDs as canonical identifiers.
- Clicking a first-level module should open its default tab.
- Clicking a second-level tab should update active tab, content, and route together.
- Unknown routes should fall back to the module default tab and never render a blank shell.
- Planned and reserved tabs may be clickable, but must show planned/reserved placeholders instead of working controls.

### 2. Shared Navigation Metadata

- Keep navigation config-driven from `src/shared/navigation.ts`.
- Extend tab metadata only if needed for implementation: `route`, `description`, `badge`, `permission`, `default`, or `emptyState`.
- Keep the eight first-level modules unchanged:
  - 工作台
  - 对话
  - 模型
  - 知识库
  - 工具与 Agent
  - 本地网关
  - 数据配置
  - 设置与安全
- Preserve honest stage values: `implemented`, `planned`, `reserved`, and `environment-limited`.

### 3. Shell And Component Structure

- Convert `ModuleTabs` from decorative buttons into a controlled navigation component with active, focus, and disabled/reserved states.
- Split tab rendering out of the monolithic `App.tsx` shape. A practical target is one registry per module or one file per module with small tab panel components.
- Add a shared tab placeholder component for planned/reserved tabs with:
  - feature name
  - current stage
  - why it is not active yet
  - the next implementation dependency
  - no fake execution button
- Make the right rail active-tab-aware. If a tab does not need a rail, hide it instead of showing generic repeated status.
- Keep the existing desktop-tool style: compact, flat, low motion, no decorative hero pages.

### 4. Module-by-module Decomposition

| Module | Secondary tab | Main content for this round |
|---|---|---|
| 工作台 | 总览 | Setup gaps, default workspace/model, gateway state, today usage, recent request, recent audit. |
| 工作台 | 工作区 | Workspace defaults, local data location, default Provider/Model/Router, workspace-level import/export entry. |
| 工作台 | 最近活动 | Recent conversations, request logs, audit events, gateway events, quick filters. |
| 工作台 | 快捷操作 | New chat, add Provider, import config, upload text file, gateway integration, open diagnostics. |
| 对话 | 会话 | Current three-column chat surface: conversation list, message timeline, composer, model/context controls. |
| 对话 | 助手 | Assistant definitions, default model, allowed tools/knowledge, approval policy, empty state if none. |
| 对话 | Prompt Lab | Prompt templates, prompt version preview, test-send path using existing model/router loop where available. |
| 对话 | 多模型对比 | Planned placeholder; no fake comparison execution until multiple request fan-out is implemented. |
| 对话 | Artifacts | Planned placeholder for generated files/previews; no editor shell yet. |
| 对话 | 本地历史 | Search, pinned/favorite/archive filters, local-history retention explanation, export entry. |
| 模型 | 供应商 | Provider list/detail split, Base URL, API key, proxy, custom headers, connection test, recent errors. |
| 模型 | 模型列表 | Model records, manual model add, provider filter, enabled state, context window and capabilities. |
| 模型 | 能力矩阵 | Dense matrix for streaming, tools, vision, embeddings, health, context, local/cloud source. |
| 模型 | 参数模板 | Generation parameter presets and per-model defaults; implemented only if backed by persisted preferences. |
| 模型 | 健康检测 | Provider/model health, latency, last test result, actionable error diagnosis. |
| 知识库 | 文件 | File table, parse/index status, retry, chunk count, lexical fallback labels. |
| 知识库 | 知识库 | Planned page for grouped knowledge bases and document membership. |
| 知识库 | 检索设置 | Planned page for embedding/rerank/retrieval tuning; current lexical test can be shown as limited capability. |
| 知识库 | 上下文 | Conversation context strategy, selected knowledge/context sources, citation trace surface. |
| 知识库 | 记忆 | Planned page for explicit memories, summaries, compression, deletion and audit. |
| 工具与 Agent | 工具 | Reserved placeholder until built-in/custom tool execution is safe. |
| 工具与 Agent | MCP | MCP server registry, transport, connection state, grant/deny permission, discovered tool visibility. |
| 工具与 Agent | Agent 定义 | Agent definition form/list, goal, default model, allowed tools/knowledge, approval policy. |
| 工具与 Agent | 运行中心 | Planned/dry-run surface for execution plans, steps, trace, status, and human approval. |
| 工具与 Agent | 工作流预留 | Reserved explanation only; no workflow canvas or execution controls. |
| 本地网关 | 网关状态 | Running state, bind host/port, endpoint list, recent error, start/stop control. |
| 本地网关 | API Key | Key generation, one-time reveal, masked list, revoke, scopes, quota, last used. |
| 本地网关 | 虚拟模型 | Planned placeholder for aliases and virtual model registry. |
| 本地网关 | 模型路由 | Route rule rows, default route, fallback status, relationship with Provider/Model health. |
| 本地网关 | 外部接入 | App-specific config generator for curl, Python, Node, Chatbox, Cherry Studio, Codex-style clients. |
| 本地网关 | 网关日志 | Gateway log table linked to request logs and upstream model/provider source. |
| 数据配置 | 智能导入预检 | Import manifest editor, detect/preview/map/conflict/secret/confirm/result steps. |
| 数据配置 | 导入导出 | Planned page for provider/model/assistant/prompt/chat import-export after conflict resolver exists. |
| 数据配置 | 备份恢复 | Planned page for redacted backup, encrypted full backup, restore preview and confirmation. |
| 数据配置 | 配置快照 | Snapshot list, create snapshot, restore preview, redaction status. |
| 数据配置 | 数据清理 | Planned cleanup preview only; destructive deletion remains unavailable until audited flow exists. |
| 设置与安全 | 请求日志 | Request log table, copy error, open logs, provider/model/conversation/message links. |
| 设置与安全 | 用量统计 | Token/cost estimates, workspace/provider/model/conversation filters, daily summary. |
| 设置与安全 | 错误诊断 | Error dictionary, human reason, technical details, repair suggestions, copy/open-log actions. |
| 设置与安全 | 模型评测 | Planned placeholder for eval sets and model comparison tests. |
| 设置与安全 | 密钥安全 | Provider/gateway secret status, redaction rules, safeStorage/fallback explanation. |
| 设置与安全 | 审计 | Audit event table for key changes, imports, MCP permission, restore/cleanup actions. |
| 设置与安全 | 界面设置 | Theme, density, font, language, reduced motion, KaiTi limited to message/creative preview. |
| 设置与安全 | 系统设置 | Data path, gateway port, app version, diagnostic export, shortcut/package status. |

### 5. Layout And Density Rules

- A tab page should expose one main task and at most one secondary support panel.
- Do not show all tables and forms from a module on the same tab.
- Tables with more than five columns should have filters or detail rows rather than wider horizontal layouts.
- Right rail collapses before the primary content compresses.
- At `1040 x 680`, the active tab must remain usable with no whole-app horizontal scroll.
- The second-level tab row should not wrap into a tall block; use horizontal scroll or compact labels where needed.

### 6. Test And Verification Requirements

- Add UI smoke coverage that clicks every first-level module and every second-level tab.
- Assert that active tab text, route identity, and visible primary heading stay in sync.
- Assert that planned/reserved tabs show placeholder state and do not expose fake action buttons.
- Keep the existing `1040 x 680` overflow check and extend it to representative crowded tabs:
  - 对话 / 会话
  - 模型 / 能力矩阵
  - 本地网关 / API Key
  - 设置与安全 / 请求日志
- Run at minimum:
  - `npm.cmd run typecheck`
  - `npm.cmd run test`
  - `npm.cmd run test:ui-smoke`
  - `npm.cmd run verify`

## Suggested Execution Lanes

- Lane A: Navigation contract, route state, `AppShell` / tab component behavior, route fallback.
- Lane B: Dashboard, Chat, Models, Gateway tab decomposition.
- Lane C: Knowledge, Tools/Agent, Data Config, Settings/Security tab decomposition.
- Lane D: UI smoke tests, responsive checks, docs and closure notes.

These lanes can run in parallel because Lane A owns shell/navigation contracts, while Lanes B and C own disjoint module content. Lane D should start with test scaffolding early, then finish after integration.

## Acceptance Criteria

- Every first-level module has working second-level navigation.
- Clicking a second-level tab changes the visible content, active tab style, and route identity.
- No implemented module page shows all of its module functions in one long stack.
- Planned and reserved capabilities are clearly labeled and cannot be mistaken for implemented execution paths.
- The right rail is contextual or hidden; it no longer repeats generic status on every tab.
- Existing implemented flows remain available:
  - send local chat message
  - create/test Provider
  - create model
  - create/revoke gateway key
  - retry knowledge file
  - grant/deny MCP permission
  - create Agent dry-run preview
  - validate import manifest
  - open/copy logs
  - save UI preferences
- Navigation remains config-driven from shared metadata.
- UI remains usable at `1280 x 820` and `1040 x 680` without whole-app horizontal overflow.
- Typecheck, unit tests, UI smoke tests, and verify pass after implementation.
- Docs are refreshed with a closure note that states what is implemented, planned, reserved, and environment-limited.

## Risks Or Non-goals

- This round is not a promise to implement full RAG, MCP execution, autonomous Agent runs, workflow canvas, encrypted backup, destructive cleanup, or complete eval runners.
- Do not add new first-level modules to solve crowding. Use second-level navigation and content boundaries.
- Do not hide primary work in the right rail. The right rail is support context, not a substitute page.
- Do not solve page density only with CSS spacing. Content must actually move behind tab boundaries.
- Do not overbuild routing with a full router library unless the existing Vite/Electron structure clearly benefits from it. A small typed route parser is enough if it stays maintainable.
- Do not mark a tab `implemented` unless the tab has a real data path or an honest limited implementation.
