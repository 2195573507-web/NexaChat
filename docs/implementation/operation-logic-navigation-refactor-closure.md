# Operation Logic And Navigation Refactor Closure

Date: 2026-05-14

Current relevance note: this closeout is historical. The current mainline is chat-first with 7 top-level modules: Chat, Models, Knowledge Base, Tools, Gateway, Data, and Settings. `/` resolves to `/chat/conversations`; Workspace/Dashboard are not current entry points.

## Scope

This closure records the 0.2 operation logic and navigation architecture refactor for NexaChat. The work keeps the existing local-first feature set intact while separating navigation, route identity, module boundaries, page responsibilities, data-entry locations, and unfinished-feature handling.

## New Operation Logic

- The shared navigation registry in `src/shared/navigation.ts` is the route and sidebar source of truth.
- The first-level sidebar shows only eight modules.
- Each first-level module expands or collapses to reveal concrete child features.
- Each child feature maps to a standalone route and a focused page boundary.
- Module subnavigation is aligned with the sidebar children instead of introducing a second vocabulary.
- Legacy route aliases are preserved only as recovery paths; canonical routes use the new structure.

## Sidebar Structure

- 工作台: `/workspace/overview`, `/workspace/activity`, `/workspace/health`.
- 对话: `/chat/conversations`, `/chat/playground`, `/chat/context`.
- 模型: `/models/providers`, `/models/catalog`, `/models/router`.
- 知识库: `/knowledge/files`, `/knowledge/chunks`, `/knowledge/retrieval`.
- 工具与 Agent: `/tools/mcp`, `/tools/agents`, `/tools/runs`.
- 本地网关: `/gateway/overview`, `/gateway/keys`, `/gateway/logs`, `/gateway/docs`.
- 数据配置: `/data/import`, `/data/snapshots`, `/data/diagnostics`, `/data/cleanup`.
- 设置与安全: `/settings/preferences`, `/settings/security`, `/settings/audit`, `/settings/about`.

## Module Boundaries

- 工作台 is limited to overview, recent activity, local health, quick links, and pending items.
- 对话 owns conversations, message flow, model choice, and context policy only.
- 模型 owns Provider, Model, Router, health test, capabilities, and default model policy.
- 知识库 owns file records, chunks, lexical fallback status, retrieval preview, and source boundaries.
- 工具与 Agent owns MCP registration, permissions, Agent definitions, and dry-run previews.
- 本地网关 owns OpenAI-compatible gateway status, Gateway API keys, endpoint docs, request logs, and scopes.
- 数据配置 owns import preflight, snapshots, restore preview, diagnostics, and cleanup explanations.
- 设置与安全 owns UI preferences, security storage explanation, IPC boundaries, audit logs, and about/runtime state.

## Cleaned Or Rewritten

- Rewrote `src/shared/navigation.ts` from mixed tab metadata into an eight-module expandable navigation registry.
- Rewrote `src/renderer/AppShell.tsx` to use expandable first-level module groups and route-highlighted child links.
- Updated `src/renderer/App.tsx` to resolve canonical routes and map the `workspace` module.
- Reworked `DashboardPage`, `ChatPage`, `ModelsPage`, `KnowledgePage`, `ToolsPage`, `GatewayPage`, `DataPage`, and `SettingsPage` so each target route has one primary page responsibility.
- Tightened `EmptyState` so action buttons render only when backed by a real handler.
- Updated `ModuleSubNav` and sidebar styles to match the new route and child-feature model.
- Updated unit, Playwright UI smoke, and Electron smoke tests for the new IA contract.

## Preserved Capabilities

- Provider creation, Provider API key storage, and Provider health test.
- Model creation, catalog display, and router/default-model surface.
- Chat conversations, message persistence, model selection, send flow, and context state.
- Local gateway `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings`.
- Gateway API Key generation, one-time reveal, revoke, scope display, and request logs.
- Knowledge file records and lexical fallback chunks.
- MCP server registration and grant/deny state.
- Agent definition save and dry-run preview.
- Import manifest preflight, invalid import rejection, snapshot creation, restore preview, diagnostics export, UI preference save, audit logs, request logs, and usage visibility.

## Roadmap Or Environment-Limited

- Vector RAG, rerank, PDF/OCR parsing, full MCP execution, custom tool execution, real Agent run center execution, workflow canvas, destructive cleanup, encrypted backup, complete conflict-aware import/export, and production packaging are not exposed as fake primary actions.
- These capabilities appear only as Roadmap or environment-limited explanations with dependency notes.

## Verification

- `npm.cmd install`: passed, up to date, 0 vulnerabilities.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 1 file / 3 tests.
- `npm.cmd run test:ui-smoke`: passed, 7 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:electron-smoke`: passed.
- `lint`: no script exists in `package.json`.
- `git diff --cached --check`: passed before commit.

## Desktop Shortcut

`C:\Users\至亲\Desktop\NexaChat.lnk` points to the current project development entry:

- TargetPath: `D:\NexaChat\node_modules\electron\dist\electron.exe`.
- Arguments: `"D:\NexaChat"`.
- WorkingDirectory: `D:\NexaChat`.
- IconLocation: `D:\NexaChat\assets\app-icon.ico,0`.

No shortcut regeneration was required.

## Git

- Refactor commit hash: `17f072bdee6e00cbf7f821ae1d2589ccc3feb4d5`.
- Push result: later full-app commits were pushed and the final release branch was remote-confirmed through `origin/main`.

## Next Round

- Add a navigation registry consistency test that asserts every child route has a reachable page and every legacy alias resolves to a canonical route.
- Consider extracting repeated table and key-value layouts into shared components after one more implementation pass confirms the final data shapes.
- Continue implementation only for currently roadmap capabilities when their backend persistence and execution boundaries are real.
