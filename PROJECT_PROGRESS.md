# NexaChat Project Progress

## 2026-05-16 Phase 0 Documentation Fact Cleanup

- Confirmed real project root with `git rev-parse --show-toplevel`: `D:/NexaChat`.
- Used the available `using-superpowers` skill; the singular `using-superpower` path is not installed in this environment.
- Ran a global tracked-document audit for stale terms: `eight first-level modules`, `8 modules`, `Workspace`, `Dashboard`, `/workspace`, `PDF`, `OCR`, `vector`, `sandbox`, `Agent sandbox`, `MCP executor`, `simple home`, and `NexaStore`.
- Classified hits into current fact, historical record, and future planning instead of mechanically replacing every occurrence.
- Current source facts were aligned in active docs: NexaChat is chat-first, the real first-level modules are Chat / Models / Knowledge Base / Tools / Gateway / Data / Settings, and `/` currently resolves to `/chat/conversations`.
- Clarified that Workspace/Dashboard and older 8-module references are historical context unless a file explicitly marks them as current.
- Clarified that simple home is a later target, not a completed capability.
- Clarified that `NexaStore` remains the current centralized aggregate service and service splitting is a target route.
- Clarified Knowledge Base boundaries: current support is text-like import, parsing, chunking, lexical embedding, retrieval preview, rebuild/delete, and citations; PDF, Office, OCR, and external vector databases remain future capabilities.
- Clarified Gateway boundaries: `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings` are current; `/v1/responses` is reserved and returns 501.
- Clarified Tools/Agent/MCP boundaries: current support covers MCP registration, permissions, agent definitions, dry-run preview, fixture tool execution, approval requests, execution steps, and trace events; arbitrary real MCP execution, arbitrary code execution, and release-grade Agent sandbox are future capabilities.
- Added `Status / Current Relevance` notes to stale build/iteration plans instead of deleting historically valuable plans.
- This Phase 0 pass modified documentation only. No business source, route code, UI code, database code, tests, or package configuration were changed.

Historical context note: entries below this section may mention Workspace, Dashboard, `/workspace`, or 8 modules because they record earlier implementation rounds. Those entries are retained as history and should not override the current chat-first 7-module source facts above.

## 2026-05-16 Chat-first UI Rebuild Closure

本轮目标:

- 将 NexaChat 从后台验收面板式 UI 重建为聊天优先的本地 AI 工具。
- 默认入口从工作台/首页迁移到聊天: `/` 现在解析到 `/chat/conversations`。
- 一级导航收敛为 7 个入口: 聊天、模型、知识库、工具、网关、数据、设置。
- 保留现有业务能力和数据链路，不重写 Electron main、preload、SQLite Store、IPC、Provider、Gateway、Knowledge、Tools、Data、Settings 核心契约。

删除和替换的旧 UI:

- 删除 `src/renderer/modules/DashboardPage.tsx`，并从 `modulePageRegistry` 移除 workspace/dashboard 页面注册。
- 从 `ModuleId` 与 `navModules` 移除 `workspace` 一级模块，旧 `/dashboard/...` 和 `/workspace/...` 路由现在回落到聊天默认页。
- 移除 AppFrame 里的厚重 `module-switcher`、feature list、模块状态灯和 stage 标签展示。
- 侧边栏改为窄 rail，二级功能进入顶部轻量 tabs，不再在左侧堆状态、说明和实现标签。

新增和重构的 UI 基础:

- 重建深色优先 design tokens: 统一颜色、字体、间距、圆角、阴影和 rail 宽度 token。
- 重写 Shell 布局: `module-rail` + `work-surface` + `command-bar` + `top-tabs`。
- 重做 ChatPage 为真实聊天主界面: 左侧会话列表、搜索、新建聊天；中间消息流、模型选择、上下文策略、底部输入框；右侧上下文/对比面板默认关闭。
- 保留并复用现有共享组件: `ChatInput`、`MessageBubble`、`PageHeader`、`ConfigList`、`ConfigDetail`、`StatusPillLite` 等，未新增第二套业务链路。

保留的业务链路:

- Chat 继续通过 `api.createConversation`、`api.sendMessage`、`retryMessage`、`regenerateMessage`、`cancelMessage`、`compareModels`、`updateConversationFlags` 工作。
- Model/Provider 继续读取 `snapshot.providers` / `snapshot.models`，并通过 `createProvider`、`createModel`、`testProvider` 工作。
- Gateway Key 继续使用统一新契约: `createGatewayKey(input)`、`updateGatewayKey(input)`、`rotateGatewayKey(input)`、`revokeGatewayKey(id)`，列表来自 `snapshot.gatewayKeys`。
- Knowledge、Tools/MCP、Data、Settings 页面继续接现有 AppApi/IPC/Store/mockApi 契约，没有制造第二套 mockApi、gateway contract 或状态管理。

文案和能力边界:

- 用户可见文案仍集中在 `src/shared/i18n.ts`。
- 将可见的“环境受限 / 预留 / Round 12 / 未实现”类开发验收口吻改为“能力有限 / 稍后开放 / 数据移动准备状态”等用户语气。
- 保留 `snapshot.dashboard` 和 `workspace` 作为内部 Store 聚合/本地工作区数据结构，不把它作为默认 UI 入口或一级导航暴露。

验证结果:

- `npm.cmd run test`: passed, 19 files / 63 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 7 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed.
- `npm.cmd run package:release`: passed, regenerated `release/win-unpacked`.
- `npm.cmd run test:package-smoke`: passed.
- `npm.cmd run test:installer-smoke`: passed.
- `npm.cmd run shortcut:package`: passed.
- `npm.cmd run test:shortcut-readback:packaged`: passed for `C:\Users\至亲\Desktop\NexaChat.lnk`.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

已知风险和后续任务:

- `snapshot.dashboard` 命名仍存在于数据聚合层，这是内部兼容字段，不是 UI 默认入口；后续如需重命名必须做跨 IPC、Store、mock、tests 的完整合同迁移。
- Data 和 Settings 页已统一到新 shell/list-detail 视觉体系，但还可以继续降低表格式密度。
- 真实上游 Provider、完整 RAG/vector/OCR、可执行 MCP/Agent sandbox 仍需按能力边界继续推进；本轮 UI 不伪装这些能力已经完整完成。

## 2026-05-16 Product UI Redesign Actual Closure

本轮实际重做原因:

- 当前 UI 的主要问题不是颜色或圆角细节，而是整体方向太像后台管理系统、太像功能面板集合，首页缺少产品入口感，聊天页没有核心 AI 工作台质感，模型、网关、知识库、工具页的主任务流不够清晰。
- 本轮目标是保留现有功能契约、路由、IPC、Store、SQLite、Provider、Gateway、Knowledge、Agent 数据链路，同时把 NexaChat 重做成更像成熟本地优先、多模型桌面 AI 工作台的产品 UI。

技能和设计结论:

- 已先使用 `using-superpowers`；单数 `using-superpower` 路径不存在，已确认。
- 已使用 `impeccable` 作为 UI 设计、实现和验收前置。项目没有 `PRODUCT.md` / `DESIGN.md`，所以按 `product` register 执行: 设计服务于任务流，优先桌面应用效率、克制色彩、稳定组件词汇、低噪音状态表达、清晰空态/禁用态/错误态，不使用 Liquid Glass、重毛玻璃、大面积渐变、营销页结构或装饰动画。
- 设计原则: 单一侧边栏导航、顶部低噪音上下文、页面有主任务锚点、模块之间有不同信息结构、卡片只用于真正需要框定的对象，所有未完成能力必须显示为未配置、未启用、待实现或 dry-run。

本次重做范围:

- 全局 Shell: 重新整理 AppShell、侧边栏、顶部上下文、右侧上下文面板、页面容器和浅色/深色/系统主题 token。
- 首页: 改为工作台入口，突出系统可用性、默认模型、网关状态、最近活动和下一步动作，不再是四块普通卡片堆叠。
- 聊天页: 保留三栏契约，但改为会话列表、消息主区、上下文指标和突出输入区的 AI 工作台结构。
- 模型页: Provider 接入状态、模型数量、默认模型、健康状态和测试调用前置，不再只是表单加表格。
- 网关页: 重做为开发者控制台式结构，突出本地兼容网关状态、监听地址、Key、模型路由、请求/用量和错误状态。
- 知识库页: 突出导入、解析、分块、索引、检索链路，并把 lexical fallback / embedding 等能力状态表达清楚。
- Agent / 工具页: 区分 MCP 注册、权限、approval、dry-run 和真实执行边界，不再把所有操作揉成按钮堆。
- 组件体系: 新增并复用 `PageHeader`、`PageSection`、`Toolbar`、`ActionCard`、`MetricTile`、`SidePanel`、`ChatInput`、`MessageBubble`、`ProviderCard`、`GatewayStatusCard` 等基础组件。

修改文件:

- `src/renderer/AppShell.tsx`
- `src/renderer/components/ModulePageFrame.tsx`
- `src/renderer/components/ui.tsx`
- `src/renderer/modules/DashboardPage.tsx`
- `src/renderer/modules/ChatPage.tsx`
- `src/renderer/modules/ModelsPage.tsx`
- `src/renderer/modules/GatewayPage.tsx`
- `src/renderer/modules/KnowledgePage.tsx`
- `src/renderer/modules/ToolsPage.tsx`
- `src/renderer/modules/shared.tsx`
- `src/renderer/styles.css`
- `tests/ui-smoke.spec.ts`
- `PROJECT_PROGRESS.md`

保留的功能契约:

- 未重写主进程、数据库、IPC、Provider、Gateway、Knowledge、Agent 执行服务。
- 保留 `src/shared/navigation.ts` 作为唯一导航/路由注册源，保留现有一级模块和二级页面关系。
- 保留聊天发送、模型选择、Provider 测试、Gateway 开关和 Key 管理、知识库导入/重建/删除、MCP 权限、Agent dry-run、数据导入/备份/恢复/回滚、设置和审计链路。
- 保留浅色、深色、系统主题切换，以及现有 i18n/状态数据来源。

删除或替换的旧 UI 结构:

- 没有恢复 `.module-tabs` 或 `.module-subnav-panel` 横向主导航。
- 没有新增双重导航，也没有裸露内部路由路径。
- 旧式密集面板、普通卡片堆叠、表格优先布局被替换为页面主任务结构。
- 装饰性渐变和玻璃效果没有进入最终 CSS；背景改为 token 驱动的面层和轻量状态色。
- 多套重复的卡片、徽标、输入和消息样式被集中到共享组件。

结构重组边界:

- 结构重组: Shell、首页、聊天页、模型页、网关页、知识库页、Tools/MCP 页。
- 视觉重做但功能链路保持: 数据页、设置页、右侧上下文面板、表格和状态组件。
- 未触碰业务层: 主进程、SQLite schema、Provider/Gateway 服务、Knowledge/Agent 运行时。

测试结果:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 19 files / 58 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 16 Playwright tests, including new assertions for `.workbench-hero`, `.chat-input`, `.message-bubble`, `.models-command-center`, `.provider-card`, `.gateway-status-card`, `.gateway-console`, `.knowledge-flow`, `.knowledge-pipeline`, `.tools-control-strip`, `.tools-boundary-grid`.
- `npm.cmd run test:electron-smoke`: passed.
- `npm.cmd run scan:quality`: passed.
- `npm.cmd run package:release`: passed.
- `npm.cmd run test:package-smoke`: passed.
- `npm.cmd run test:installer-smoke`: passed.
- `npm.cmd run shortcut:package`: passed.
- `npm.cmd run test:shortcut-readback:packaged`: passed.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

桌面入口:

- 已重新生成 release 包和 installer script。
- 已重新关联桌面快捷方式到 packaged 入口。
- 已通过 COM readback 验证 TargetPath、Arguments、WorkingDirectory、IconLocation 与 packaged 入口预期一致。

剩余问题:

- `DataPage`、`SettingsPage` 仍主要沿用旧布局词汇，功能链路稳定但还没有达到首页、聊天、模型、网关、知识库、工具页的产品级结构密度。
- i18n 字典中仍有历史 mojibake 文本，本轮没有扩大到全量文案修复。
- 真正的上游 Provider 转发、完整 RAG/vector/OCR、真实 MCP 执行、Agent sandbox 执行仍是规划或环境受限能力，UI 已按未配置/待实现/dry-run 表达，不伪装完成。

下一轮 UI 打磨建议:

- 继续做 Data / Settings / Observability 的产品化结构重组，把导入、备份、恢复、安全、审计、反馈、评测从表格优先改为主任务流优先。
- 为 ProviderCard、GatewayStatusCard、MessageBubble、ChatInput 增加更细的空态、错误态和 loading/skeleton 状态回归。
- 做一次真实截图视觉验收记录，覆盖浅色、深色、系统主题、1040 宽桌面下的首页和聊天页。

## 2026-05-16 UI Full Redesign Implementation Closure

This round executed `docs/build-plans/00-modular-refactor-master-plan/ui-full-redesign-plan.md` as a source-code UI rebuild and closeout pass. The real repository root was confirmed with `git rev-parse --show-toplevel`: `D:/NexaChat`. All files and generated verification artifacts stayed under the repository root except the intentional Windows desktop shortcut update at `C:\Users\至亲\Desktop\NexaChat.lnk`.

Goal:

- Rebuild the NexaChat shell and modular UI into a compact, low-noise local AI conversation hub.
- Keep one authoritative navigation / route registry.
- Remove misleading old UI defaults, fake capability cues, repeated route surfaces, and dangerous prefilled actions.
- Preserve main process, IPC, Store, SQLite schema, Provider/Gateway/Knowledge/Agent execution logic, and existing data contracts unless a UI contract required read-only use.

Skill usage:

- `using-superpowers` was read and applied before continuing implementation.
- `using-superpower` singular path was checked earlier in this goal and was not present.
- `impeccable` was read and applied as the product-UI design and verification guardrail. Its context loader was run for this repo and reported no `PRODUCT.md` / `DESIGN.md`, so the implementation used the `product` register principles directly: restrained desktop-tool UI, predictable navigation, centralized tokens, clear empty/error/disabled states, no decorative glass, and no repeated card-grid gimmicks.

Parallel execution lanes:

- Lane A: AppShell, sidebar module hierarchy, single route authority, old content-area secondary navigation cleanup, and route smoke assertions.
- Lane B: design tokens, reusable base components, status badges, form fields, danger confirmation, empty/error/loading states, and module page surface cleanup.
- Lane C: module capability states, centralized Provider/UI copy defaults, anti-hallucination checks, full verification matrix, package/desktop shortcut validation, docs, and Git closeout.

UI architecture changes:

- `src/shared/navigation.ts` remains the single authoritative module/tab/route registry for 8 first-level modules and their canonical `/<module>/<tab>` pages.
- `src/renderer/App.tsx` continues to resolve route state through the shared navigation registry and dispatches module pages through `src/renderer/modules/modulePageRegistry.tsx`.
- `src/renderer/AppShell.tsx` now presents a compact desktop shell with one expandable sidebar navigation surface, route-aware child selection, focused topbar context, and only one global high-frequency action.
- `src/renderer/components/ModulePageFrame.tsx` now renders page boundary, module name, active tab title, feature boundary copy, and status badges. It no longer renders a second content-area `.module-tabs` / `.module-subnav-panel` navigation strip.
- `src/renderer/components/ui.tsx` centralizes reusable UI primitives: `PageSection`, `Card`, `MetricCard`, `StatusBadge`, `CapabilityBadge`, `LoadingState`, `ErrorState`, `Toolbar`, `DataPanel`, `DetailPanel`, `SettingsRow`, `FormField`, and `ConfirmDangerZone`.
- `src/shared/uiStatus.ts`, `src/shared/uiCopy.ts`, and `src/shared/providerCatalog.ts` centralize UI status vocabulary, non-business UI literals/defaults, Gateway doc placeholders, disabled MCP example endpoint handling, and Provider catalog definitions.
- `src/shared/theme.ts` and `src/renderer/styles.css` expand the design-token authority for spacing-adjacent surfaces, radius, borders, shadows, focus, font sizes, semantic tones, danger, warning, success, info, disabled, and muted states.

8 first-level modules and second-level pages:

- Workspace: `/workspace/overview`, `/workspace/activity`, `/workspace/health`.
- Chat: `/chat/conversations`, `/chat/playground`, `/chat/context`.
- Models: `/models/providers`, `/models/catalog`, `/models/router`.
- Knowledge: `/knowledge/files`, `/knowledge/chunks`, `/knowledge/retrieval`.
- Tools and Agent: `/tools/mcp`, `/tools/agents`, `/tools/runs`.
- Local Gateway: `/gateway/overview`, `/gateway/keys`, `/gateway/logs`, `/gateway/usage`, `/gateway/docs`.
- Data Config: `/data/import`, `/data/backup`, `/data/restore`, `/data/rollback`, `/data/diagnostics`, `/data/cleanup`.
- Settings and Security: `/settings/preferences`, `/settings/security`, `/settings/audit`, `/settings/feedback`, `/settings/evals`, `/settings/observability`, `/settings/about`.

Old or misleading UI links cleaned:

- Removed the duplicate content-area secondary navigation strip from `ModulePageFrame`; sidebar child navigation is the only second-level entry surface.
- Removed the topbar Provider/Model/Logs shortcut cluster so the topbar does not become a second navigation system.
- Reworded route fallback tests so unknown-path normalization is not presented as an endorsed legacy entry path.
- Removed fake model/provider form defaults such as `OpenAI-compatible Provider`, `https://api.openai.com/v1`, and `gpt-compatible-model`.
- Removed fake knowledge import defaults such as `manual-note.md`, sample note content, and sample retrieval query.
- Disabled the MCP register action until a real endpoint is supplied, instead of executing a hardcoded `http://127.0.0.1:9000/mcp` path.
- Replaced Gateway docs placeholders with centralized docs copy and the real default model when available, without inventing a callable model.
- Gateway docs examples now read endpoint paths from `GATEWAY_ENDPOINT` instead of duplicating endpoint strings in the renderer.
- Removed dangerous prefilled backup, restore, and rollback confirmation values.
- Added two-click confirmation for Gateway rotate/revoke and Knowledge delete.
- Kept `/ -> /workspace/overview` as the only route alias; no old route chain was reintroduced.

Business logic kept unchanged:

- No main-process business refactor.
- No IPC contract rewrite.
- No Store behavior rewrite.
- No SQLite schema rewrite.
- No Provider/Gateway/Knowledge/Agent execution-core rewrite.
- No production use of browser mock data was added.

Verification:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 19 files / 58 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 16 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed, Electron shell rendered.
- `npm.cmd run scan:quality`: passed.
- `npm.cmd run package:release`: passed, generated latest `release/win-unpacked` and installer script.
- `npm.cmd run test:package-smoke`: passed.
- `npm.cmd run test:installer-smoke`: passed.
- `npm.cmd run shortcut:package`: passed, desktop shortcut updated to packaged target.
- `npm.cmd run test:shortcut-readback:packaged`: passed.
- `npm.cmd run test:desktop-entry`: passed.
- `git diff --check`: passed with LF/CRLF conversion warnings only.
- Follow-up audit fixes: right-rail request status now uses shared status formatting and `common.valueSeparator`; Gateway running state uses i18n labels instead of `on/off`; 1040-width UI smoke now explicitly waits for the shell before measuring overflow.

Desktop shortcut result:

- `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\release\win-unpacked\NexaChat.exe`.
- Arguments are empty.
- Working directory is `D:\NexaChat\release\win-unpacked`.
- IconLocation resolves to `D:\NexaChat\assets\app-icon.ico,0`.
- The shortcut was verified by COM readback through `npm.cmd run test:shortcut-readback:packaged` and again through `npm.cmd run test:desktop-entry`.

Unrelated dirty files preserved:

- `findings.md`
- `progress.md`
- `src/main/database/connection.ts`
- `tests/database-migration.test.ts`

These files were present before the UI rebuild work and were not staged for this UI commit. They appear to belong to a separate packaged startup migration hotfix / database migration thread.

Known remaining risks:

- Module page implementations still live in the existing per-module page files with tab-specific branches; the UI boundary is route-level and test-covered, but further physical file splitting can reduce file size later.
- Some row-level runtime status tone decisions still live in module renderers. They use shared `statusLabel()` and `StateBadge`, but a later low-risk refactor can make `uiStatus` the single tone authority for every domain status.
- `src/shared/i18n.ts` still contains older mojibake text from prior work; this round did not rewrite the full dictionary to avoid broad unrelated churn.
- Full upstream provider forwarding, production streaming cancellation, full RAG/OCR/vector retrieval, real MCP execution, workflow canvas, and sandboxed Agent execution remain planned/reserved rather than represented as complete.

Next suggested step:

- Continue with a focused physical page-splitting round for large module pages, keeping the same `src/shared/navigation.ts` authority and current smoke coverage.

## 2026-05-16 UI Full Redesign Phase 0 Plan

This round completed planning and research only for the NexaChat full UI redesign. No UI source code, routing code, IPC code, Store code, database code, business logic, or test code was modified in this round.

Scope and evidence:

- Confirmed the real project root with `git rev-parse --show-toplevel`: `D:/NexaChat`.
- Checked requested skills: `using-superpower` was not found; `using-superpowers` was found and read.
- Checked `impeccable`: the skill exists and was read; its project context loader found no `PRODUCT.md` or `DESIGN.md` under the project root, so this round recorded product-UI principles directly in the plan instead of creating extra context files.
- Added the executable UI redesign plan at `docs/build-plans/00-modular-refactor-master-plan/ui-full-redesign-plan.md`.
- Audited the current Electron/React entry path, App shell, navigation registry, module page registry, renderer modules, shared components, CSS token organization, `AppApi`, IPC channels, preload/main IPC boundary, Store action surface, explicit browser mock path, and existing docs.
- Advanced two analysis tracks in parallel: current UI diagnosis / information architecture restructuring, and external UI/product case study mapping into NexaChat modules.
- Recorded external UI/product learning objects in the plan: CCS / CC Switch style projects, Open WebUI, Dify, Flowise, Langflow, n8n, sub2api, OpenAI API Platform, Anthropic Console, Cursor, Raycast, and Perplexity as a source needing further official UI verification.
- Noted an unrelated dirty source file already present in the worktree: `src/main/database/connection.ts`. It was not staged for this docs-only round.

Result:

- Completed Phase 0: audit, research, information architecture, page boundaries, component system, design system, anti-hallucination UI rules, staged execution plan, acceptance criteria, risk list, and next Codex execution guidance.
- Next suggested step: enter Phase 1, AppShell / navigation / route skeleton redesign, only after confirming the working tree state and keeping unrelated source changes out of the UI-redesign commit.
- Build/test were intentionally not run because this round changed only planning/progress Markdown files.

## 2026-05-16 Full App Round 15 Test System, Quality Gates And Release Convergence

Round 15 of `docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md` is completed as implementation, verification, closeout, push, and remote confirmation; delivery commit is `938d017ceede16475369a537227b86be7096b9cc`; closeout commit is `4715788e416f97b79328413c3821287cfcafce0b`.

Parallel execution lanes:

- Lane A: quality gate authority, release command wiring, package script exposure, and gate-order tests.
- Lane B: hardcode, duplicate authority, security, dead-link, and docs freshness scanners.
- Lane C: legacy route alias deletion, smoke cleanup hardening, release docs, desktop-entry verification, and Git closeout.

Key changes:

- Added `src/shared/qualityGates.ts` as the release quality gate authority.
- Added `scripts/quality-gates.mjs` with `hardcode`, `duplicates`, `security`, `dead-links`, `docs`, `all-scans`, and `release` modes.
- Added `scan:hardcode`, `scan:duplicates`, `scan:security`, `scan:dead-links`, `scan:docs`, `scan:quality`, and `verify:release` package scripts.
- Added `tests/quality-gates.test.ts`.
- Removed milestone-expired legacy route aliases from `src/shared/navigation.ts`, leaving only `/ -> /workspace/overview`.
- Updated navigation and UI smoke tests for root/unknown fallback instead of old alias chains.
- Replaced a hardcoded Chinese mapper fallback with an English structured fallback.
- Reused `closeElectronApp()` from `scripts/desktop-entry.mjs` across Electron, package, and installer smoke scripts.

Verification:

- `npm.cmd run verify:release`: passed; covered typecheck, 18 Vitest files / 55 tests, production build, 16 Playwright UI smoke tests, Electron smoke, package release, package smoke, installer smoke, packaged shortcut readback, hardcode scan, duplicate scan, security scan, dead-link scan, docs scan, and `git diff --check`.
- `git diff --check`: passed as part of `verify:release`, with LF/CRLF conversion warnings only.

Desktop shortcut status:

- `C:\Users\鑷充翰\Desktop\NexaChat.lnk` targets `D:\NexaChat\release\win-unpacked\NexaChat.exe`.
- Arguments are empty.
- Working directory is `D:\NexaChat\release\win-unpacked`.
- IconLocation resolves to `D:\NexaChat\assets\app-icon.ico,0`.
- The shortcut remains covered by `npm.cmd run test:desktop-entry` inside `npm.cmd run verify:release`.

Git:

- Round 15 delivery commit hash: `938d017ceede16475369a537227b86be7096b9cc`.
- Round 15 closeout commit hash: `4715788e416f97b79328413c3821287cfcafce0b`.
- Push result: Round 15 delivery and closeout commits pushed; `origin/main` confirmed at `4715788e416f97b79328413c3821287cfcafce0b` before the final acceptance commit.

## 2026-05-16 Full App Round 14 Desktop Experience, Packaging, Shortcut And Release

Round 14 of `docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md` is completed as implementation, verification, closeout, push, and remote confirmation; delivery commit is `936cb659e7932ae134d9666653582abca815813e`; closeout commit is `f059b4de966023961b7105a729453caa24f0ec2a`; hash-backfill commit is `ceb302c5907cafcfac5b9f7d48945763781f6fde`.

Parallel execution lanes:

- Lane A: desktop entry authority, unpacked Windows package, release manifest, installer script generation.
- Lane B: Electron main-process single-instance behavior, startup/crash diagnostics, packaged shortcut migration, shortcut readback.
- Lane C: package smoke, installer smoke, UI smoke, Electron smoke, docs, Git closeout.

Key changes:

- Added `src/shared/desktopEntry.ts` for app name, product name, icon paths, package paths, smoke user-data paths, log names, update channel, and shortcut metadata.
- Added `src/main/desktopDiagnostics.ts` for redacted startup/crash diagnostics.
- Updated `src/main/index.ts` to use desktop authority values, single-instance lock, startup diagnostics, packaged-safe smoke user data, and second-instance focus behavior.
- Added scripts for Windows unpacked packaging, installer script generation, package smoke, installer smoke, shortcut readback, and shortcut migration.
- Added `package:release`, `test:package-smoke`, `test:installer-smoke`, `test:desktop-entry`, packaged/local shortcut readback, and packaged/local shortcut migration scripts.
- Added `tests/desktop-entry.test.ts`.
- Added `release/` to `.gitignore`.
- Migrated the desktop shortcut to the packaged executable after package smoke passed.

Verification:

- `npm.cmd run test -- tests/desktop-entry.test.ts tests/ipc-contract.test.ts`: passed, 2 files / 6 tests.
- `npm.cmd run package:release`: passed; generated `release/win-unpacked/NexaChat.exe` and `release/NexaChat-Setup.ps1`.
- First `npm.cmd run test:shortcut-readback:packaged`: failed on raw COM `IconLocation` formatting; fixed normalized icon path comparison.
- First `npm.cmd run test:installer-smoke`: failed due to unreliable wildcard copy in generated installer script; fixed source-child copy.
- First parallel installer-smoke/desktop-entry run: failed because both commands used the same smoke directory; fixed per-process installer smoke directories.
- `npm.cmd run test:installer-smoke`: passed.
- `npm.cmd run test:desktop-entry`: passed.
- `npm.cmd run test`: passed, 17 files / 53 tests.
- `npm.cmd run test:ui-smoke`: passed, 16 Playwright tests.
- `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
- `npm.cmd run test:electron-smoke`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.

Desktop shortcut status:

- `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\release\win-unpacked\NexaChat.exe`.
- Arguments are empty.
- Working directory is `D:\NexaChat\release\win-unpacked`.
- IconLocation resolves to `D:\NexaChat\assets\app-icon.ico,0`.
- The shortcut was modified by `npm.cmd run shortcut:package`.

Git:

- Round 14 delivery commit hash: `936cb659e7932ae134d9666653582abca815813e`.
- Round 14 closeout commit hash: `f059b4de966023961b7105a729453caa24f0ec2a`.
- Round 14 hash-backfill commit hash: `ceb302c5907cafcfac5b9f7d48945763781f6fde`.
- Push result: Round 14 delivery, closeout, and hash-backfill commits pushed with Round 15; `origin/main` confirmed at `4715788e416f97b79328413c3821287cfcafce0b` before the final acceptance commit.

## 2026-05-16 Full App Round 13 Observability, Usage, Logs, Feedback And Evaluation

Round 13 of `docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md` is completed as implementation, verification, closeout, push, and remote confirmation.

Parallel execution lanes:

- Lane A: observability authority, schema/migration, Store aggregation, provider health, feedback, eval, privacy, redacted export.
- Lane B: IPC/API/preload/security, browser mock parity, Gateway usage page, Settings feedback/evals/privacy pages.
- Lane C: runtime/store/IPC/i18n/app/UI tests, desktop shortcut readback, docs, Git closeout.

Key changes:

- Added `src/shared/observabilityRuntime.ts` for metric names, log event types, feedback labels, eval statuses, retention/export policy, query normalization, aggregation, and redaction.
- Added provider health, feedback, eval set, and eval result tables plus migration/mappers/types.
- Added Store observability query, feedback creation, real Provider-backed eval run, privacy save, and redacted export.
- Added observability API/IPC/preload/main handlers and permissions.
- Added browser mock parity for observability operations in UI smoke mode.
- Added `/gateway/usage`, `/settings/feedback`, `/settings/evals`, and `/settings/observability`.
- Replaced stale aliases for settings usage/evals/feedback with first-class Round 13 targets.
- Added `tests/observability-runtime.test.ts` and `tests/observability-store.test.ts`, and extended IPC/app/UI smoke tests.

Verification:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test -- tests/observability-runtime.test.ts tests/observability-store.test.ts tests/ipc-contract.test.ts tests/app.test.tsx tests/i18n-authority.test.ts`: passed, 5 files / 15 tests.
- `npm.cmd run test:ui-smoke`: passed, 16 Playwright tests.
- `npm.cmd run test`: passed, 16 files / 50 tests.
- First `npm.cmd run build`: failed because a new test fixture used an invalid trace event type and stale retrieval trace field; fixture was corrected.
- Rerun `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
- `npm.cmd run test:electron-smoke`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.

Desktop shortcut status:

- `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"` as the app argument, uses `D:\NexaChat` as working directory, and points to `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 13.

Git:

- Round 13 delivery commit hash: `8a94f74892705d39e4107c3c24a0878bb9a36f09`.
- Round 13 closeout commit hash: `d84b413dc4967b44d88a62f182f6577423691688`.
- Push result: delivery, closeout, and hash-backfill commits pushed; `origin/main` confirmed at `932ecbcb91b6d3c9c8d27857d89890b4f3b4d9d6`.

## 2026-05-14 Full App Round 0 Health Check

Round 0 of `docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md` is completed as an inventory-only implementation round.

Parallel execution lanes:

- Lane A: source architecture, IPC, preload, store, SQLite, gateway, audit/log chain.
- Lane B: renderer UI, navigation, i18n, theme, hardcoded text, smoke coverage.
- Lane C: package scripts, tests, desktop shortcut, Git/GitHub delivery, closeout gates.

Deliverables:

- Added `docs/implementation/full-app-round-execution-matrix.md`.
- Added `docs/implementation/round-00-health-check-authority-inventory.md`.
- Updated `task_plan.md`, `progress.md`, and `findings.md`.

Key findings:

- `src/main/services/store.ts` is the main responsibility hotspot and should be split behind service/repository boundaries in Round 1.
- IPC channel strings are duplicated in `src/main/ipc.ts` and `src/preload/index.ts` and need a shared channel/payload authority.
- `src/renderer/mockApi.ts` is useful for browser smoke but is a duplicate app path that must become explicitly test/browser-only.
- i18n and theme authority sources do not exist yet; language and system theme settings are persisted but not fully functional UI behavior.
- `routeAliases` needs owner/deletion milestone metadata before cleanup.
- Current desktop shortcut is valid for the local Electron launch model.

Verification:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 1 file / 3 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.

Desktop shortcut status:

- `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"` as the app argument, uses `D:\NexaChat` as working directory, and points to `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 0.

Git:

- Round 0 delivery commit hash: `1fa6d630d691465be9140d552f119b752e4f2191`.
- Push result: `origin/main` confirmed at `1fa6d630d691465be9140d552f119b752e4f2191`.

## 2026-05-14 Full App Round 1 Architecture Boundary

Round 1 of `docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md` is completed.

Parallel execution lanes:

- Main lane: IPC authority, preload/main replacement, renderer API boundary, Electron preload smoke.
- Review lane: store facade extraction boundary and Round 1 testing recommendations.

Key changes:

- Added `src/shared/ipc.ts` as the IPC channel authority and first payload arity guard.
- Added `src/shared/api.ts` for `AppApi` and `Window.nexachat` typing, reducing responsibility in `src/shared/types.ts`.
- Replaced main/preload raw IPC string usage with `IPC_CHANNELS`.
- Added `tests/ipc-contract.test.ts` and `tests/renderer-api-boundary.test.ts`.
- Made browser fallback mock explicit via test mode or `VITE_NEXACHAT_BROWSER_MOCK=1`.
- Updated Playwright web server command to set the browser mock flag with `cross-env` and avoid stale server reuse.
- Strengthened `scripts/electron-smoke.mjs` to assert the real preload API can return a snapshot.
- Added `docs/architecture/store-facade-boundaries.md`.

Verification:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 3 files / 10 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed.
- `npm.cmd run verify`: passed.

Desktop shortcut status:

- `C:\Users\至亲\Desktop\NexaChat.lnk` remains valid for the local Electron launch model and was not modified.

Git:

- Round 1 commit hash: `284fd50d7b47fe15839243bf29b409b479aae23b`.
- Push result: `origin/main` confirmed at `284fd50d7b47fe15839243bf29b409b479aae23b`. Direct GitHub HTTPS push timed out twice; one-time Git proxy `http://127.0.0.1:7890` succeeded.

## 2026-05-14 Full App Round 2 Navigation IA

Round 2 of `docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md` is completed.

Parallel execution lanes:

- Main lane: route alias metadata, content-area secondary navigation, module page registry, tests.
- Review lane: navigation IA risk review and UI smoke direction.

Key changes:

- `src/shared/navigation.ts` now exports `routeAliasRegistry` with `owner`, `deleteAfterMilestone`, and `reason`.
- Content-area second-level navigation is visible through `ModulePageFrame` and synchronized with sidebar active state.
- Added `src/renderer/modules/modulePageRegistry.tsx`.
- Updated unit tests for alias metadata, alias resolution, unique tab routes, and page registry alignment.
- Historical note: this older round temporarily asserted `.module-subnav-panel` and `.module-tabs` visibility; the 2026-05-16 Product UI Redesign Actual Closure supersedes that direction and now asserts those old horizontal navigation surfaces stay absent.

Verification:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 3 files / 12 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed.
- `npm.cmd run verify`: passed.

Desktop shortcut status:

- `C:\Users\至亲\Desktop\NexaChat.lnk` remains valid for the local Electron launch model and was not modified.

Git:

- Round 2 commit hash: `075a87c0a4a2acfdb0cfb62f51951dfee38611b8`.
- Push result: `origin/main` confirmed at `075a87c0a4a2acfdb0cfb62f51951dfee38611b8`.

## 2026-05-14 Full App Multi-Round Iteration Roadmap

This docs-only round created a new authoritative full-app roadmap for future NexaChat work:

- `docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md`

Round goal:

- Establish a detailed, executable, and verifiable multi-round blueprint covering architecture, data, IPC, security, Provider and model management, conversation, local gateway, API keys, knowledge/RAG, Agent, MCP, tools, Workflow, audit logs, usage, import/export, settings, desktop launch, UI, theme, language switching, maintainability, testing, packaging, release, documentation, and future extension.

Completed in this round:

- Confirmed project root with `git rev-parse --show-toplevel`: `D:\NexaChat`.
- Probed both requested skill names: `using-superpower` was not available; `using-superpowers` was available.
- Checked Codex CLI, Git, Node, `npm.cmd`, PowerShell `npm`, and GitHub CLI state. `npm.cmd` is the usable npm runner; PowerShell `npm.ps1` is blocked by execution policy; `gh` is not available.
- Reviewed current source, docs, tests, scripts, package scripts, navigation, shared types, IPC, store, local gateway, and desktop shortcut state.
- Created the new full-app plan under `docs/iteration-plans/`.
- Kept the round docs-only: no business code, source refactor, dependency, or `package.json` change.
- Recorded that every future actual code, UI, runtime, packaging, or launch-entry round must recheck and document the desktop shortcut or packaged entry.

Desktop shortcut status:

- `C:\Users\至亲\Desktop\NexaChat.lnk` currently points to `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"` as the app argument, uses `D:\NexaChat` as working directory, and uses `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in this docs-only round.
- Future rounds that change runtime code, UI, build output, packaging, or launch entry must revalidate this shortcut and record the result. If a packaged executable is introduced later, shortcut migration must be treated as a high-priority release task after packaged launch smoke passes.

## Current Round

This round builds the existing NexaChat plans into a runnable desktop app. The repository now contains application source, tests, build scripts, implementation closure notes, and verification artifacts.

The two Iteration 01 plans are now closed in `docs/implementation/iteration-01-closure.md`:

- `docs/iteration-plans/01-core-flow-and-function-iteration-plan.md`
- `docs/iteration-plans/01-ui-iteration-plan.md`

Iteration 02 is now closed in `docs/implementation/iteration-02-closure.md`:

- `docs/iteration-plans/02-secondary-navigation-and-module-decomposition-iteration-plan.md`

## 2026-05-14 Full App Round 3 Design System

Round 3 of the authoritative full-app blueprint is complete as an implementation and verification round. It established a typed theme/design-token authority and removed the remaining local color/radius literals from active renderer CSS outside token declarations.

Parallel execution lanes:

- Lane A: added `src/shared/theme.ts`, expanded semantic tokens, and refactored `src/renderer/styles.css`.
- Lane B: added token authority tests and stabilized the existing renderer test that was timing out on broad role queries.
- Lane C: extended UI smoke responsive screenshot checks, rechecked Electron smoke, verified the desktop shortcut, and updated the blueprint/progress surfaces.

Key changes:

- `src/shared/theme.ts` now owns supported theme modes and token names.
- `src/renderer/styles.css` now uses semantic variables for primary/on-primary, focus ring, primary soft state, planned state, code snippets, one-time secret notices, and pill radius.
- `tests/theme-token-authority.test.ts` fails if future CSS adds literal colors or raw `6px` / `8px` / `999px` border radii outside token definitions.
- `tests/ui-smoke.spec.ts` now captures ignored responsive screenshots at 1040, 1280, 1440, and 1920 widths.
- `docs/architecture/design-token-authority.md` and `docs/implementation/round-03-design-system-closure.md` document the token chain and verification.

Verification on 2026-05-14:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test -- tests/theme-token-authority.test.ts`: passed, 1 file / 3 tests.
- `npm.cmd run test`: passed, 4 files / 15 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed.
- `npm.cmd run verify`: passed.
- `git diff --check`: passed with CRLF conversion warnings only.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and points to `D:\NexaChat\assets\app-icon.ico,0`.

Round 3 delivery commit: `7a89160d0c83733b80176cda7643cc401e2dcdd2`, pushed and confirmed on `origin/main`. Round 4 remains responsible for i18n dictionary migration and Round 5 for runtime system-theme resolution.

## 2026-05-15 Full App Round 4 i18n Authority

Round 4 of the authoritative full-app blueprint is complete as an implementation and verification round. It established the zh-CN/en-US i18n authority, migrated visible renderer/navigation/status/error/settings copy to dictionary-backed text, and verified live language switching.

Parallel execution lanes:

- Lane A: added `src/shared/i18n.ts`, `src/renderer/i18n.tsx`, locale normalization, dictionary lookup, parameter interpolation, and parity checks.
- Lane B: migrated navigation, shell, module pages, status/error panels, mock API display text, store service display messages, and tests to dictionary-backed strings.
- Lane C: added i18n scanner coverage, stabilized UI smoke lifecycle, repaired production Electron renderer loading through `nexachat://`, rechecked Electron smoke, and read back the desktop shortcut.

Key changes:

- `src/shared/i18n.ts` now owns all zh-CN/en-US UI copy and exposes `translate`, `normalizeLocale`, and `getMissingTranslationKeys`.
- `src/renderer/i18n.tsx` provides the renderer `I18nProvider`, `useI18n`, and navigation translation helpers.
- `tests/i18n-authority.test.ts` verifies dictionary parity, navigation dictionary backing, and blocks new CJK literals in migrated runtime files.
- `tests/ui-smoke.spec.ts` now uses dictionary-backed selectors and verifies live language switching to en-US without breaking the shell.
- `scripts/ui-smoke.mjs` owns Vite/Playwright lifecycle so UI smoke exits cleanly.
- `scripts/electron-smoke.mjs` runs with smoke-only user data and GPU-safe flags, and asserts the real preload API plus eight first-level modules.
- `src/main/index.ts` now serves the packaged renderer with the `nexachat://` protocol in production mode so Electron does not depend on `file://` module loading.

Verification on 2026-05-15:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 5 files / 18 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and points to `D:\NexaChat\assets\app-icon.ico,0`.

Round 4 delivery commit: `4e32be97af796c0b008393ed77b7dab5b67af25f`. Push returned success (`36c6d8c..4e32be9 main -> main`); follow-up `git ls-remote` confirmation was blocked by GitHub HTTPS connectivity from the current host. Round 5 owns full light/dark/system theme resolution and visual regression coverage.

## 2026-05-15 Full App Round 5 Theme Runtime

Round 5 of the authoritative full-app blueprint is complete. It turns the existing `system` theme preference from a saved value into live runtime behavior.

Parallel execution lanes:

- Lane A: theme resolver, system preference listener, shell class/attribute state, and preference normalization.
- Lane B: token authority tests, mock/runtime consistency, and UI smoke theme coverage.
- Lane C: closeout docs, screenshot evidence, desktop shortcut readback, and Git closure.

Key changes:

- `src/shared/theme.ts` now owns theme normalization and `system` resolution against `prefers-color-scheme`.
- `src/renderer/AppShell.tsx` now applies `theme-light` or `theme-dark` from the resolved mode, updates when the OS color scheme changes, and exposes `data-theme-mode` plus `data-resolved-theme`.
- `src/main/repositories/mappers.ts`, `src/main/services/store.ts`, and `src/renderer/mockApi.ts` now normalize stale or invalid theme values to `system`.
- `src/shared/types.ts` uses the shared `ThemeMode` type for UI preferences.
- `tests/theme-token-authority.test.ts` now covers theme resolver behavior and light/dark color-token parity.
- `tests/ui-smoke.spec.ts` now verifies dark, light, and follow-system behavior and saves ignored screenshots under `test-results/round-05-theme-runtime/`.
- `docs/architecture/design-token-authority.md`, `docs/implementation/full-app-round-execution-matrix.md`, and `docs/implementation/round-05-theme-runtime-closure.md` record the Round 5 chain.

Verification on 2026-05-15:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test -- tests/theme-token-authority.test.ts`: passed, 1 file / 5 tests.
- `npm.cmd run test`: passed, 5 files / 20 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:ui-smoke`: passed, 11 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed.
- `git diff --check`: passed with CRLF conversion warnings only.

Desktop shortcut status:

- `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and points to `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 5.

Git:

- Round 5 delivery commit hash: `6cc6b641ddb57a2e269485bd6b0c5159f2fb3947`.
- Push result: delivery commit `6cc6b641ddb57a2e269485bd6b0c5159f2fb3947` and closeout commit `220bceca31c77949b8d27272be41125a0d6dc58d` are both pushed; `origin/main` is confirmed at `220bceca31c77949b8d27272be41125a0d6dc58d`.

## 2026-05-15 Full App Round 6 Provider Runtime

Round 6 of the authoritative full-app blueprint is complete as an implementation and verification round. It replaced the production local/demo response path with a real OpenAI-compatible Provider invocation chain shared by Chat and the local Gateway.

Parallel execution lanes:

- Lane A: Provider adapter, shared runtime policy/error authority, and main-process secret boundary.
- Lane B: Router/request lifecycle, provider health test, streaming parser, cancellation, retry, timeout, request logs, usage, and audit.
- Lane C: Gateway forwarding smoke, UI smoke, Electron smoke, docs, and desktop shortcut verification.
- Lane D: read-only Round 7 risk review for conversation lifecycle dependencies.

Key changes:

- Added `src/shared/providerRuntime.ts` for adapter names, endpoint constants, timeout/retry policy, and runtime error codes.
- Added `src/main/services/openAiCompatibleAdapter.ts` for real `/models` health checks and `/chat/completions` calls.
- Changed `src/main/services/store.ts` so `testProvider()` performs real upstream health checks and `sendMessage()` calls the provider adapter.
- Deleted production `generateLocalAssistantReply()`.
- Removed seed-time fake Provider/Model/API key creation and seed-time fake assistant message generation.
- Updated `src/main/services/localGateway.ts` so `/v1/chat/completions` awaits the same provider runtime chain and returns 502 on provider failure.
- Added deterministic tests for adapter behavior, Store integration, and Gateway forwarding through local mock upstreams.
- Updated stale i18n wording that described Chat as a local response loop.

Verification on 2026-05-15:

- `npm.cmd run test -- tests/provider-adapter.test.ts tests/provider-store-integration.test.ts`: passed, 2 files / 7 tests.
- `npm.cmd run test -- tests/provider-adapter.test.ts tests/provider-store-integration.test.ts tests/gateway-provider-chain.test.ts`: passed, 3 files / 9 tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 8 files / 29 tests.
- `npm.cmd run test:ui-smoke`: passed, 11 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:electron-smoke`: passed.

Desktop shortcut status:

- `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"`, uses `D:\NexaChat` as working directory, and points to `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 6.

Git:

- Round 6 delivery commit hash: `45054a81190638e209d06d9373ff83e38763a9fd`.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `b151d8d5bda11ae29589bd08a7d9eaf52c4af1ee`.

## 2026-05-16 Full App Round 7 Conversation System

Round 7 of the authoritative full-app blueprint is implemented and verified; Git delivery is in commit/hash backfill closeout. It turns the conversation layer from a one-shot send/display flow into a richer lifecycle with authoritative context, chunks, prompt metadata, export records, retry, regenerate, cancel, copy, and multi-model comparison.

Parallel execution lanes:

- Lane A: schema/service/context/export authority.
- Lane B: Chat UI lifecycle controls, i18n, and browser mock contract.
- Lane C: store/gateway/app/UI tests, docs, shortcut and Git closeout.

Key changes:

- Added `src/shared/conversationRuntime.ts` for conversation/message status, chunk type/status, export formats, attachment policy, and context limits.
- Added `message_chunks`, `message_attachments`, `prompt_templates`, and `conversation_exports` tables.
- Extended shared `AppApi`, IPC authority, preload bridge, and main IPC handlers for retry, regenerate, cancel, compare, and export.
- Updated Store so context building records selected message IDs, Provider chunks persist, exports are redacted by default, and multi-model compare fans out through the same real Provider chain.
- Updated Chat UI with status labels, copy, retry, regenerate, cancel, redacted export, and compact multi-model comparison controls.
- Updated browser mock to implement the same Round 7 API contract for UI smoke only.
- Added `tests/conversation-runtime.test.ts` and updated renderer/UI tests for visible Round 7 controls.
- Added `docs/implementation/round-07-conversation-system-closure.md`.

Verification completed:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test -- tests/conversation-runtime.test.ts tests/provider-store-integration.test.ts tests/gateway-provider-chain.test.ts`: passed, 3 files / 6 tests.
- `npm.cmd run test -- tests/app.test.tsx tests/ipc-contract.test.ts tests/i18n-authority.test.ts`: passed, 3 files / 12 tests.
- `npm.cmd run test`: passed, 9 files / 31 tests.
- `npm.cmd run test:ui-smoke`: passed, 11 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
- `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

Desktop shortcut:

- `C:\Users\至亲\Desktop\NexaChat.lnk` exists and still points to `D:\NexaChat\node_modules\electron\dist\electron.exe`.
- Arguments remain `"D:\NexaChat"`.
- Working directory remains `D:\NexaChat`.
- Icon remains `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 7.

Git:

- Round 7 delivery commit hash: `d1b9bb66470cb133be892a09a963b0d7a99c3c7f`.
- Round 7 closeout commit hash: `14d8d42da4fccd7063e4a321c2235a57206ed397`.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `14d8d42da4fccd7063e4a321c2235a57206ed397`.

## 2026-05-16 Full App Round 8 Local Gateway And API Key

Round 8 of the authoritative full-app blueprint is implemented and verified. It turns the local Gateway from basic endpoint forwarding plus simple key creation into a controlled external API surface with centralized endpoint/scope/error authority, key lifecycle, quota/rate enforcement, redacted attributed logs, and reversible import metadata application.

Parallel execution lanes:

- Lane A: Gateway runtime authority, HTTP auth/scope/quota/rate/errors/logs.
- Lane B: API Key lifecycle, schema migration, import preflight, metadata apply, snapshot, and rollback.
- Lane C: Gateway/Data UI, browser mock parity, i18n/theme states, tests, docs, shortcut and Git closeout.
- Lane D: read-only Round 9 Knowledge/RAG input.

Key changes:

- Added `src/shared/gatewayRuntime.ts` for endpoints, scopes, key states, error codes, body limit, quota/rate defaults, and Gateway policy.
- Added additive DB migrations for existing local databases.
- Extended Gateway key/log/config snapshot schema, mappers, shared types, API, IPC, preload, and main handlers.
- Added Gateway key create/update/disable/enable/rotate/revoke lifecycle with one-time reveal on create and rotate.
- Added explicit authorization outcomes for missing, invalid, disabled, revoked, expired, scope denied, quota exhausted, and rate-limited keys.
- Added HTTP Gateway OpenAI-compatible error shapes, OPTIONS/CORS handling, request body limit, redacted attributed logs, and reserved `/v1/responses`.
- Replaced preview-only import apply with metadata apply plus rollback snapshot; rollback disables imported Provider/Model metadata without importing plaintext secrets.
- Updated Gateway UI key controls/log table, Data import/rollback actions, browser mock API, CSS, and zh-CN/en-US i18n.
- Added `tests/gateway-runtime.test.ts`.
- Added `docs/implementation/round-08-gateway-api-key-closure.md`.

Verification completed:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test -- tests/gateway-runtime.test.ts tests/gateway-provider-chain.test.ts tests/ipc-contract.test.ts tests/i18n-authority.test.ts`: passed, 4 files / 10 tests.
- `npm.cmd run test`: passed, 10 files / 33 tests.
- `npm.cmd run test:ui-smoke`: passed, 11 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
- `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

Desktop shortcut:

- `C:\Users\至亲\Desktop\NexaChat.lnk` exists and still points to `D:\NexaChat\node_modules\electron\dist\electron.exe`.
- Arguments remain `"D:\NexaChat"`.
- Working directory remains `D:\NexaChat`.
- Icon remains `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 8.

Git:

- Round 8 delivery commit hash: `bc5aaf67b245ce4ac1ff21c810eed06cd5cb8fe9`.
- Round 8 closeout commit hash: `68720bfebe9cc74c047e5097176d012d3d04dda9`.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `68720bfebe9cc74c047e5097176d012d3d04dda9`.

## 2026-05-16 Full App Round 9 Knowledge Base, RAG And File Processing

Round 9 of the authoritative full-app blueprint is implemented and verified. It replaces the previous placeholder knowledge path with one typed chain for import, parser-normalized chunks, lexical embedding, retrieval traces, structured citations, chat citation display, rebuild, and delete.

Parallel execution lanes:

- Lane A: schema, migrations, Store knowledge pipeline, parser/chunk/embedding/retrieval/citation contracts.
- Lane B: Knowledge UI, Chat citation display, browser mock parity, i18n, and UI smoke behavior.
- Lane C: tests, build, Electron smoke, desktop shortcut readback, docs, and Git closeout.
- Lane D: read-only Round 10 Agent/MCP/Tool/Workflow execution-model risk review.

Key changes:

- Added `src/shared/knowledgeRuntime.ts` as the authority for parser policy, import normalization, chunking, stable hashes, lexical embedding, and scoring.
- Extended shared types/API/IPC/preload/main handlers for object-based knowledge import, retry, rebuild, delete, and retrieval preview.
- Added additive DB migrations and mappers for knowledge file status fields, chunks, embeddings, retrieval traces, citations, and deletion tombstones.
- Updated Store so supported text/Markdown/JSON/CSV/code-like content produces real chunks from supplied content, unsupported content fails honestly, retrieval writes traces/citations, chat injects retrieval context, rebuild refreshes chunks, and delete filters tombstoned files from active snapshots.
- Updated `/v1/embeddings` to reuse the shared lexical embedding authority.
- Reworked Knowledge UI with import content, index health, chunk status, retrieval preview, citations, rebuild, and delete controls.
- Updated Chat UI to render structured citations under assistant messages.
- Updated browser mock parity and active-file filtering so UI smoke exercises the same AppApi surface.
- Added `tests/knowledge-runtime.test.ts` and extended IPC, app, i18n, and UI smoke coverage.
- Added `docs/implementation/round-09-knowledge-rag-closure.md`.

Verification completed:

- `npm.cmd run typecheck`: passed through build and verify.
- `npm.cmd run test -- tests/knowledge-runtime.test.ts tests/ipc-contract.test.ts tests/i18n-authority.test.ts`: passed, 3 files / 8 tests.
- `npm.cmd run test`: passed, 11 files / 35 tests.
- `npm.cmd run test:ui-smoke`: passed, 12 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
- `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

Desktop shortcut:

- `C:\Users\至亲\Desktop\NexaChat.lnk` exists and still points to `D:\NexaChat\node_modules\electron\dist\electron.exe`.
- Arguments remain `"D:\NexaChat"`.
- Working directory remains `D:\NexaChat`.
- Icon remains `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 9.

Git:

- Round 9 delivery commit hash: `6e48333e81239e404d6a1d27030f9b70a6ef7e96`.
- Round 9 closeout commit hash: `862caf0574fc8c485e323dba0197953a12a12752`.
- Round 9 remote-confirmation commit hash: `ed7e09ba7227908143fb4d723cbb90403ac70bab`.
- Push result: delivery, closeout, and remote-confirmation commits pushed; `origin/main` confirmed at `ed7e09ba7227908143fb4d723cbb90403ac70bab`.

## 2026-05-16 Full App Round 10 Agent, MCP, Tools And Workflow

Round 10 of the authoritative full-app blueprint is implemented and verified. It replaces the old Agent dry-run snapshot path with one execution model for Agent preview, safe tool fixtures, future MCP tool calls, and Workflow boundaries.

Parallel execution lanes:

- Lane A: execution runtime authority, schema/migration, Store run/step/trace/approval service.
- Lane B: Tools Run Center UI, Agent preview migration, browser mock parity, i18n, and UI smoke behavior.
- Lane C: tests, build, Electron smoke, desktop shortcut readback, docs, and Git closeout.

Key changes:

- Added `src/shared/executionRuntime.ts` for run kinds, statuses, trace event names, fixture tool IDs, and input normalization.
- Added shared types, mappers, snapshot arrays, API/IPC/preload/main handlers for tools, runs, steps, trace events, approvals, run start, and approval decision.
- Added schema/migration support for `tools`, `execution_runs`, `execution_steps`, `execution_trace_events`, and `approval_requests`.
- Migrated Agent preview from `config_snapshots(cleanup-preview)` into `execution_runs`.
- Added a read-only status fixture and an approval-gated echo fixture. No dangerous system command or external MCP call is executed.
- Updated Tools Run Center to show runs, steps, pending approvals, approve/deny actions, and trace events.
- Updated browser mock parity and UI smoke coverage.
- Added `tests/execution-runtime.test.ts`.
- Added `docs/implementation/round-10-execution-model-closure.md`.

Verification completed:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test -- tests/execution-runtime.test.ts tests/ipc-contract.test.ts tests/i18n-authority.test.ts`: passed, 3 files / 8 tests.
- `npm.cmd run test`: passed, 12 files / 37 tests.
- `npm.cmd run test:ui-smoke`: passed, 13 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
- `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

Desktop shortcut:

- `C:\Users\至亲\Desktop\NexaChat.lnk` exists and still points to `D:\NexaChat\node_modules\electron\dist\electron.exe`.
- Arguments remain `"D:\NexaChat"`.
- Working directory remains `D:\NexaChat`.
- Icon remains `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 10.

Git:

- Round 10 delivery commit hash: `ddab2066c67044c367e7c28cf8126e450d2a074d`.
- Round 10 closeout commit hash: `3f267dca0d0a7ec67272e3e7e800e01b7ca440cd`.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `3f267dca0d0a7ec67272e3e7e800e01b7ca440cd`.

## 2026-05-16 Full App Round 11 Execution

Round 11 of the authoritative full-app blueprint is implemented and in closeout verification. It turns security from UI hints plus mutable audit rows into a main-process permission boundary with local owner session bootstrap, role/ACL policy, tamper-evident audit records, integrity verification, redacted export, and Settings visibility.

Parallel execution lanes:

- Lane A: security runtime authority, permission/role/session/ACL registry, IPC permission map, and Store permission enforcement.
- Lane B: schema/migration, local admin/session bootstrap, audit hash chain, integrity verification, audit search/export, and redaction.
- Lane C: Settings security/audit UI, browser mock parity, i18n, targeted tests, full verification, desktop shortcut readback, docs, and Git closeout.
- Lane D: read-only Round 12 import/export/backup/recovery pre-audit.

Key changes:

- Added `src/shared/securityRuntime.ts` for permission keys, roles, session/user states, ACL effects, IPC permission mapping, action-permission mapping, audit actions, and redaction key authority.
- Added `security_users`, `security_roles`, `security_sessions`, `acl_grants`, and audit hash-chain columns with migration support.
- Bootstrapped a local admin user and active owner session without adding login friction to the desktop shell.
- Added main-process permission enforcement before IPC handlers and inside sensitive Store methods.
- Added ACL denial behavior with `security.permission.denied` audit evidence.
- Added tamper-evident audit rows with `previous_hash`, `entry_hash`, permission key, integrity state, search, verification, and redacted export.
- Added security state and audit integrity state to `AppSnapshot`.
- Updated Settings security/audit UI to show active session, role, permission count, denied count, audit integrity, search, verify, export, and hash evidence.
- Updated browser mock parity for security/audit APIs.
- Added `tests/security-runtime.test.ts`.
- Raised Vitest timeout to 15000 ms because the larger security-backed suite previously hit the 5 s runner ceiling.
- Fixed a Round 11 chain issue where reading `getSnapshot()` indirectly wrote `audit.searched`; denied-count display now uses a read-only audit action count.

Verification completed:

- `npm.cmd run test -- tests/security-runtime.test.ts tests/ipc-contract.test.ts`: passed, 2 files / 7 tests.
- `npm.cmd run typecheck`: passed.
- Full `npm.cmd run test`: passed, 13 files / 41 tests.
- `npm.cmd run test:ui-smoke`: passed, 14 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
- `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

Desktop shortcut:

- `C:\Users\至亲\Desktop\NexaChat.lnk` exists and still points to `D:\NexaChat\node_modules\electron\dist\electron.exe`.
- Arguments remain `"D:\NexaChat"`.
- Working directory remains `D:\NexaChat`.
- Icon remains `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 11.

Git:

- Round 11 delivery commit hash: `0bac7f927c90e2087c3bb80a81833ca4c599b629`.
- Round 11 closeout commit hash: `aa7bac441a4a0173f2a6e4749f3e53f4d6be364d`.
- Round 11 remote-confirmation commit hash: `2f80ef6e3bf06ca370f8df0ff9adcc2813080850`.
- Push result: delivery, closeout, and hash-backfill commits pushed; `origin/main` confirmed at `2f80ef6e3bf06ca370f8df0ff9adcc2813080850`.

## 2026-05-16 Full App Round 12 Data Config, Import/Export, Backup And Recovery

Round 12 of the authoritative full-app blueprint is implemented and verified. It replaces the overloaded snapshot/cleanup-preview data path with structured data mobility jobs, conflict records, encrypted backup records, migration records, rollback records, and Data module pages for import, backup, restore, rollback, diagnostics, and cleanup.

Parallel execution lanes:

- Lane A: data mobility authority, manifest/conflict/migration/snapshot schema, and Store persistence.
- Lane B: import/export, encrypted backup, restore preflight, rollback, redaction, and permission/audit enforcement.
- Lane C: Data UI information architecture, i18n, navigation, browser mock parity, tests, desktop shortcut readback, docs, and Git closeout.
- Lane D/E: read-only UI/i18n and test audit lanes for Round 12.

Key changes:

- Added `src/shared/dataRuntime.ts` for manifest version, operation kinds, backup profiles, conflict types/strategies, rollback states, migration version, wizard steps, redaction rules, stable hashes, package creation, manifest normalization, and restore diff summaries.
- Added schema/migration support for `data_mobility_jobs`, `data_conflicts`, `data_backups`, `migration_runs`, and `rollback_records`.
- Added shared types, mappers, snapshot arrays, API/IPC/preload/main handlers for data jobs, conflicts, backups, migrations, rollback records, export package creation, encrypted backup, restore preflight, and rollback.
- Kept `validateImportManifest`, `applyImportPlan`, `createSnapshot`, `restoreSnapshot`, and `exportDiagnostics` compatibility while backing them with structured Round 12 records.
- Implemented AES-256-GCM encrypted backup in the main process with PBKDF2 passphrase derivation, redacted payloads, package hash validation, and invalid/wrong backup errors.
- Added restore preflight from stored backup records or package text, plus conflict records and restore diff summaries.
- Added rollback records that disable only entities created by the import plan.
- Reworked the Data module navigation from `import/snapshots/diagnostics/cleanup` to `import/backup/restore/rollback/diagnostics/cleanup`; `/data/snapshots` is now a legacy alias to the first-class `/data/backup` route.
- Rebuilt Data UI around import/export, encrypted backup, restore preflight, conflict/rollback, diagnostics, and cleanup boundaries using structured job fields instead of summary-text filtering.
- Updated browser mock parity for data mobility jobs, conflicts, backups, migrations, rollback records, encrypted backup, restore preflight, and rollback.
- Added `tests/data-runtime.test.ts`.
- Added `docs/implementation/round-12-data-config-import-export-backup-recovery-closure.md`.

Verification completed:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test -- tests/data-runtime.test.ts tests/ipc-contract.test.ts tests/app.test.tsx tests/gateway-runtime.test.ts`: passed, 4 files / 17 tests.
- Full `npm.cmd run test`: passed, 14 files / 47 tests.
- `npm.cmd run test:ui-smoke`: passed, 15 Playwright tests after fixing browser mock restore-preflight parity and showing operation kind in the restore table.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed, including typecheck, full unit test suite, and build.
- `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

Desktop shortcut:

- `C:\Users\至亲\Desktop\NexaChat.lnk` exists and still points to `D:\NexaChat\node_modules\electron\dist\electron.exe`.
- Arguments remain `"D:\NexaChat"`.
- Working directory remains `D:\NexaChat`.
- Icon remains `D:\NexaChat\assets\app-icon.ico,0`.
- No shortcut was modified in Round 12.

Git:

- Round 12 delivery commit hash: `4554dc4c47ff2dbf62479a786d486a8968dd78c6`.
- Round 12 closeout commit hash: `b064dae1a90df8ec62fb6cd3ddfd96f9007dafe9`.
- Push result: delivery, closeout, and hash-backfill commits pushed through Git OpenSSL plus local proxy after direct GitHub HTTPS timed out; `origin/main` confirmed at `2a14e45598e46fb9697f896a767a3869f0b72433` before this remote-confirmation ledger update.

## 2026-05-14 UI Shell Redesign

This round rebuilt the visible desktop shell, sidebar hierarchy, topbar, workbench home, and visual system so NexaChat reads as a formal compact desktop tool instead of a crowded prototype/debug panel.

Parallel execution lanes:

- Group A: audited and updated navigation IA, route aliases, sidebar active state, expansion/collapse, and local expansion persistence.
- Group B: rebuilt AppShell, topbar, global visual tokens, spacing, surfaces, responsive grids, and no-horizontal-overflow rules.
- Group C: rewrote the workspace overview into four product areas: 当前概览, 核心指标, 操作入口, 最近活动.
- Group D: updated UI smoke and Electron smoke coverage, ran verification, captured responsive screenshots, rechecked the desktop shortcut, and prepared Git closure.

Key UI changes:

- Sidebar now renders only product/module/function names. It no longer displays `tab.route`, `/workspace/...`, or other internal app routes.
- Sidebar first-level modules remain the required eight: 工作台, 对话, 模型, 知识库, 工具与 Agent, 本地网关, 数据配置, 设置与安全.
- Sidebar child entries are driven from `src/shared/navigation.ts`, show route-aware active state, use stable icons/stage dots, and persist expanded module IDs in `localStorage`.
- Topbar now keeps the current workspace, default model, gateway status, chat entry, Provider entry, Model entry, and log shortcut without clipping at 1280/1440/1920 widths.
- Workbench overview now uses real `AppSnapshot` data and links to real feature pages for chat, Provider, Model, Gateway Key, import, and logs.
- Visual system was tightened in `src/renderer/styles.css`: flatter surfaces, stronger text hierarchy, consistent borders/radius/spacing, responsive grids, and no Liquid Glass or decorative gradients.
- The old visible secondary tab strip and route chip path leak are removed from the product shell.

Verification on 2026-05-14:

- `npm.cmd install`: passed, dependencies up to date, 0 vulnerabilities.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 1 file / 3 tests.
- `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:electron-smoke`: passed after rerunning it after build completion. A first parallel run read an older `dist` build, so the serialized rerun is the valid result.
- `lint`: no script exists in `package.json`.
- `smoke`: no generic `smoke` script exists in `package.json`; `test:ui-smoke` and `test:electron-smoke` are the project equivalents.
- Responsive visual audit: passed at 1280, 1440, and 1920 widths with screenshots under ignored `test-results/ui-shell-redesign/`; no console errors, no route leak, and no horizontal overflow in `.app-shell`, `.topbar`, `.content-grid`, `.workbench-overview`, or `.sidebar`.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"` as the app argument, uses `D:\NexaChat` as working directory, and points to `D:\NexaChat\assets\app-icon.ico,0`.

## 2026-05-14 UI Navigation Refactor

This round completed the module interface simplification and secondary navigation split requested for NexaChat. The first-level module count remains unchanged, but each module now has a clearer module container, route-aware secondary navigation, and focused tab pages.

Key changes:

- Added shared `ModulePageFrame` and `ModuleSubNav` components.
- Extended shared navigation metadata with route, icon, permission, and i18n key fields.
- Split the renderer module content into `src/renderer/modules/*Page.tsx`.
- Updated Gateway, Provider/Model, Agent/MCP, Knowledge, Observability/Settings, Security/Admin, and Data surfaces to use focused secondary pages instead of long mixed panels.
- Kept planned/reserved/admin pages honest with explicit placeholder text and no fake action controls.
- Documented the mapping and audit in `docs/build-plans/ui-navigation-refactor/plan.md`.

Follow-up visibility fix after review:

- Reworked `ModuleSubNav` from a thin horizontal tab row into a visible module-level secondary navigation panel.
- Added the "二级导航" summary, current subpage name/description, larger subpage cards, clearer active indicator, and permission/stage cues.
- Historical note: this older secondary navigation panel direction was superseded by the 2026-05-16 Product UI Redesign Actual Closure, which keeps sidebar child navigation as the only second-level navigation surface.
- Ran a local visual smoke screenshot check for `/gateway/keys`, confirming the new panel is visible in the running renderer.

Current verified results:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 1 file / 3 tests.
- `npm.cmd run test:ui-smoke`: passed, 7 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
- `lint`: no script exists in `package.json`.
- Desktop shortcut check: `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, passes `"D:\NexaChat"` as the app argument, uses `D:\NexaChat` as working directory, and points to `D:\NexaChat\assets\app-icon.ico`. No project shortcut creation script exists under `scripts/`, so no shortcut was regenerated.

## 2026-05-14 Operation Logic And Navigation Refactor

This round rebuilt NexaChat's operation logic and navigation architecture for the 0.2 boundary while preserving the existing local-first feature set. The source of truth is now the shared navigation registry in `src/shared/navigation.ts`, with eight expandable first-level modules and route-aligned child features.

New first-level sidebar structure:

- 工作台: `/workspace/overview`, `/workspace/activity`, `/workspace/health`.
- 对话: `/chat/conversations`, `/chat/playground`, `/chat/context`.
- 模型: `/models/providers`, `/models/catalog`, `/models/router`.
- 知识库: `/knowledge/files`, `/knowledge/chunks`, `/knowledge/retrieval`.
- 工具与 Agent: `/tools/mcp`, `/tools/agents`, `/tools/runs`.
- 本地网关: `/gateway/overview`, `/gateway/keys`, `/gateway/logs`, `/gateway/docs`.
- 数据配置: `/data/import`, `/data/snapshots`, `/data/diagnostics`, `/data/cleanup`.
- 设置与安全: `/settings/preferences`, `/settings/security`, `/settings/audit`, `/settings/about`.

What changed:

- Replaced the flat/ambiguous sidebar with expandable module groups and route-highlighted child entries.
- Moved from `dashboard` to `workspace` as the canonical workbench module while preserving legacy route aliases.
- Rewrote module page boundaries so each route owns one primary job instead of mixing configuration, logs, future placeholders, and execution controls.
- Kept Provider API keys under 模型, Gateway API keys under 本地网关, Knowledge records under 知识库, Agent dry-run under 工具与 Agent, and UI/security preferences under 设置与安全.
- Removed planned/reserved items from the main action path; environment-limited surfaces now explain the missing dependency without exposing fake execution buttons.
- Updated `EmptyState` so it only renders an action when a real handler exists.
- Updated unit, Playwright UI smoke, and Electron smoke checks to assert the new IA and routing contract.

Preserved capabilities:

- Provider creation, API key storage, and health testing.
- Model creation, model catalog, and router/default-model surfaces.
- Chat conversations, message persistence, model selection, and context state.
- Local gateway `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings`.
- Gateway API key generation, one-time reveal, revocation, and scoped logs.
- Knowledge file records and lexical fallback chunks.
- MCP server registration and grant/deny state.
- Agent definition storage and dry-run preview.
- Import manifest preflight, snapshots, restore preview, diagnostics export, UI preferences, audit logs, usage/request log visibility.

Advanced capabilities kept out of the main flow:

- Vector RAG, rerank, PDF/OCR parsing, full MCP execution, Agent run center execution, workflow canvas, destructive cleanup, encrypted backup, complete conflict-aware import/export, and production packaging remain documented as roadmap or environment-limited work.

Verification on 2026-05-14:

- `npm.cmd install`: passed, up to date, 0 vulnerabilities.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 1 file / 3 tests.
- `npm.cmd run test:ui-smoke`: passed, 7 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:electron-smoke`: passed; Electron shell rendered the new workspace route.
- `lint`: no script exists in `package.json`.
- `git diff --cached --check`: passed before commit.

Desktop shortcut result:

- `C:\Users\至亲\Desktop\NexaChat.lnk` is valid for the current project. It targets `D:\NexaChat\node_modules\electron\dist\electron.exe`, uses arguments `"D:\NexaChat"`, working directory `D:\NexaChat`, and icon `D:\NexaChat\assets\app-icon.ico,0`.

Git result:

- Refactor commit hash: `17f072bdee6e00cbf7f821ae1d2589ccc3feb4d5`.
- Push result: later full-app commits were pushed and the final release branch was remote-confirmed through `origin/main`.

## Parallel Work Requirement

The user required agent assistance with at least three agents running and at least three tasks progressing concurrently. This was satisfied in two waves:

- Agent A: Chat / Provider / Model / Router / Gateway plan audit.
- Agent B: Knowledge / Tools / MCP / Agent / Data Config plan audit.
- Agent C: UI / Dashboard / Logs / Settings / Acceptance audit.
- Worker D: tests under `tests/`.
- Worker E: implementation closure document under `docs/implementation/`.
- Worker F: browser fallback API under `src/renderer/mockApi.ts`.

## Implemented

- Electron + React + TypeScript + Vite app skeleton.
- One-window desktop shell with default size 1280 x 820 and minimum 1040 x 680.
- Eight-module UI: 工作台, 对话, 模型, 知识库, 工具与 Agent, 本地网关, 数据配置, 设置与安全.
- Config-driven navigation and second-level module tabs with honest feature-stage labels.
- Main-process SQLite schema and store for core local data.
- Safe preload IPC bridge.
- Provider and Model creation/testing.
- Router decision path and local Chat send flow.
- Conversation and message persistence with provider/model/request/token/latency/error metadata.
- Request logs, usage records, gateway keys, gateway logs, audit logs, snapshots, diagnostics, and UI preferences.
- Local OpenAI-compatible gateway endpoints: `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`; `/v1/responses` is reserved.
- Knowledge file records and text lexical chunk fallback.
- MCP server registry and Agent definition storage, without pretending full execution is complete.
- Data Config snapshot and diagnostic export surfaces.
- Settings and Security pages including logs, usage, error diagnosis, key security, audit, UI settings, and system settings.
- Browser fallback API for local web testing.
- Unit, UI smoke, and Electron launch smoke tests.
- Iteration 01 flow improvements: workspace default model display, route metadata trace, gateway key one-time reveal and revoke, knowledge retry/failure handling, MCP grant/deny, Agent dry-run preview, import manifest rejection, and restore preview.
- Iteration 01 UI improvements: tighter desktop tool layout, unified status badges, table long-text handling, accessible stage labels, right-rail collapse before main content compression, and 1040 x 680 overflow validation.
- Iteration 02 navigation improvements: real route-aware second-level tabs, canonical `/<module>/<tab>` state, focused tab panels for every module, contextual right rail, all-tab smoke coverage, route fallback, and planned/reserved placeholders with no fake execution buttons.

## Planned / Reserved

- Real upstream provider forwarding.
- Production-grade streaming state machine and cancellation.
- Full document parsing, RAG, embedding/rerank providers, vector DB, OCR, and knowledge evaluation.
- MCP execution, custom tool execution, real Agent Run Center, trace replay, workflow canvas, human approval execution, and code sandbox.
- Destructive cleanup execution and broader file-attachment backup policies beyond redacted metadata packages.
- Packaging, installer, desktop shortcut creation, and shortcut verification.

## Verification

Verified on 2026-05-13:

- `npm.cmd install`: packages installed, audit reported 0 vulnerabilities. The shell wrapper timed out after install output, but `node_modules` and `package-lock.json` were created.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 1 file / 3 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:ui-smoke`: passed, 2 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed; built Electron app launched and was stopped after startup window check.
- Iteration 01 rerun: `npm.cmd run typecheck` passed.
- Iteration 01 rerun: `npm.cmd run test` passed, 1 file / 3 tests.
- Iteration 01 rerun: `npm.cmd run test:ui-smoke` passed, 4 Playwright tests.
- Iteration 01 rerun: `npm.cmd run verify` passed.
- Iteration 01 rerun: `npm.cmd run test:electron-smoke` passed; Electron shell rendered.
- Iteration 02 rerun: `npm.cmd run typecheck` passed.
- Iteration 02 rerun: `npm.cmd run test` passed, 1 file / 3 tests.
- Iteration 02 rerun: `npm.cmd run test:ui-smoke` passed, 6 Playwright tests.
- Iteration 02 rerun: `npm.cmd run verify` passed.

## Important Notes

- The implementation uses Node's experimental `node:sqlite` API. It works in the current local Node/Electron environment but should be revisited before production packaging.
- New secrets use Electron `safeStorage` when available; non-Electron/bootstrap execution keeps a prefixed local-dev fallback and existing base64 values remain readable for compatibility.
- `docs/implementation/build-closure.md`, `docs/implementation/iteration-01-closure.md`, `docs/implementation/iteration-02-closure.md`, `task_plan.md`, `findings.md`, and `progress.md` are the current implementation closeout surfaces.

## 2026-05-16 CC Switch Style Renderer Rebuild Final Closure

This is the authoritative closeout for the renderer rebuild requested on 2026-05-16. The real project root was confirmed first with `git rev-parse --show-toplevel`; all repository writes stayed inside that root. The only intentional outside-repo side effect was updating and verifying the Windows desktop shortcut entry.

Why the UI moved from an engineering tool shell to a CC Switch style lightweight desktop tool:

- The previous renderer still read as an admin dashboard: old tree/sidebar structure, top status strip, repeated framed panels, table-first management pages, and a dashboard-like landing surface.
- The requested product shape is a local AI configuration switcher and workbench: current configuration first, fast Provider/model/gateway switching, direct executable actions, clear dry-run and unconfigured states, and low visual noise.
- The new direction follows the product-register guidance from `impeccable`: restrained color, system fonts, stable controls, small state indicators, no Liquid Glass, no heavy blur, no large gradients, no decorative motion, and no marketing-page composition.

Old UI removed or replaced:

- Deleted old `src/renderer/AppShell.tsx`, `src/renderer/components/ui.tsx`, `src/renderer/components/ModulePageFrame.tsx`, and `src/renderer/components/ErrorDiagnosisPanel.tsx`.
- Replaced every old renderer module page implementation under `src/renderer/modules/`.
- Replaced the monolithic old `src/renderer/styles.css` with a CSS entry plus split `tokens`, `base`, `shell`, `components`, and `pages` files.
- Removed the old visual vocabulary from renderer output: no old AppShell, old topbar, old tree menu, old horizontal tabs, old subnav panel, old content-grid, old card grid, or old table-led page structure.

Business contracts preserved:

- Main process, preload IPC, SQLite/node:sqlite store, Provider/model records, Gateway records and keys, Knowledge records, Agent/MCP records, audit/log/usage records, shared navigation, shared types, and existing real business assertions were preserved.
- `src/shared/navigation.ts` remains the route and module authority.
- UI work did not replace business services with mock completion states. Unavailable capabilities remain marked as unconfigured, environment-limited, reserved, dry-run, or requiring Provider/index/permission.

New UI architecture:

- `AppFrame` now owns the compact desktop shell: narrow module rail, module switcher, main work surface, and command bar.
- Core reusable primitives now live around `ConfigList`, `ConfigDetail`, `ToolSection`, `StatusDot`, `StatusPillLite`, `InlineNotice`, `CommandButton`, `DataRows`, `ActivityList`, `ChatInput`, and `MessageBubble`.
- Pages are rebuilt around “current configuration + executable action + status feedback” instead of admin grids.

Rebuilt page scope:

- Workspace: current active configuration summary, gateway/provider/model status, recent conversations, recent changes, and next actions.
- Chat: conversation strip, chat workspace, Provider/model selector, context selector, composer, message bubbles, and hidden-on-narrow comparison detail.
- Models: Provider/model switcher, default model context, Provider health, test call entry, OpenAI-compatible/DeepSeek/Claude-compatible/local model boundaries.
- Gateway: local developer gateway console, bind address, model mapping, key lifecycle, logs/usage, health, and copyable OpenAI-compatible endpoint examples.
- Knowledge: source import, parse/chunk/index state, lexical retrieval test, citation preview, and explicit unimplemented vector/OCR/rerank boundaries.
- Tools and Agent: MCP registration, permission state, Agent dry-run, approval and sandbox boundaries, execution run preview.
- Data: import preflight, export/backup/restore/rollback/diagnostics as maintenance tools, with destructive cleanup kept environment-limited.
- Settings: theme, security, audit, local data, privacy, evaluation, and about surfaces in desktop settings form.

`impeccable` conclusion:

- Old UI failed because it was structurally an admin shell, not because of theme details.
- CC Switch / CCSwitch style is the correct reference because NexaChat is primarily a local AI configuration and execution switcher.
- The new UI is lightweight desktop-tool oriented: rail navigation, direct switch rows, compact status pills, low-noise panels, and immediate actions.
- Deleted old UI files and no fallback AppShell remains.
- Business contracts are kept in shared/main layers and real IPC/data paths.
- Every core renderer page was rebuilt.
- Dry-run, reserved, environment-limited, unconfigured, and required-permission states are visible and not disguised as complete.
- Current smoke coverage checks that the UI no longer exposes the old admin shell structures.

Verification results:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 19 files / 58 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 8 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed.
- `npm.cmd run scan:hardcode`: passed.
- `npm.cmd run scan:duplicates`: passed.
- `npm.cmd run scan:quality`: passed.
- `git diff --check`: passed with LF/CRLF warnings only.
- `npm.cmd run package:release`: passed.
- `npm.cmd run test:package-smoke`: passed.
- `npm.cmd run test:installer-smoke`: passed.
- `npm.cmd run shortcut:package`: passed.
- `npm.cmd run test:shortcut-readback:packaged`: passed.
- `npm.cmd run test:desktop-entry`: passed.

Remaining issues:

- Some historical documentation still contains old root-path references and mojibake text; this rebuild did not rewrite historical docs.
- Real upstream Provider execution, full vector RAG/OCR/rerank, dangerous-tool MCP execution, and autonomous Agent sandbox execution remain outside this UI rebuild and are still clearly marked as unavailable or dry-run where exposed.
- The new UI is validated by smoke checks, but a future visual review should still compare screenshots at 1040, 1280, 1440, and wide desktop sizes after users spend time in the app.

Next UI polish:

- Add screenshots to the UI acceptance record for light, dark, and system theme at multiple widths.
- Tighten Data and Settings pages further into task-first maintenance flows.
- Add more explicit empty, loading, error, and disabled substates for Provider, Gateway, Knowledge, MCP, and Agent actions.

## 2026-05-16 Typography And ChatGPT-Style Operation Logic Iteration

This iteration continued on top of the current new UI instead of replacing it. The real project root was confirmed first with `git rev-parse --show-toplevel` as `D:/NexaChat`; all repo writes stayed inside that root. `using-superpowers` and `impeccable` were loaded, `using-superpower` was checked and not installed, MCP resources/templates were empty, and available Codex plugins were Browser, Documents, Presentations, and Spreadsheets.

Scope completed:

- Added the audit and execution record at `docs/build-plans/00-modular-refactor-master-plan/ui-font-and-chatgpt-logic-iteration.md`.
- Updated the design token authority docs so they point to the current `AppFrame` and split renderer style layers.
- Replaced the stale design-system font/color documentation with the current token vocabulary.
- Expanded typography tokens for sans/UI/mono/message-writing font stacks, body/control/chat/title sizes, and semantic line-height steps.
- Kept optional KaiTi behavior scoped to message writing surfaces only.
- Added `PageHeader`, `SectionHeader`, `ErrorState`, `LoadingState`, `disabledReason`, and a multiline `ChatInput` contract in the shared app frame.
- Unified every first-level module and every second-level page around a visible page title area, stable primary action position, main task region, and auxiliary detail/status region.
- Updated Workspace, Chat, Models, Knowledge, Tools and Agent, Local Gateway, Data, and Settings pages to use the same low-distraction operation logic.
- Chat now has stable new conversation entry, message copy/retry/regenerate/cancel actions, multiline input, Enter send, Shift+Enter newline, model/context controls, and a calmer reading width.
- Models now uses shared activity list rendering and a workflow-chain visual instead of route/debug vocabulary.
- Gateway overview no longer duplicates the start/stop primary action inside the main content.
- UI smoke now verifies all active panels have a visible page header.
- Theme token authority tests now reject raw color, font-family, font-size, and line-height regressions outside token rules, and verify KaiTi scope.

ChatGPT-style learning applied:

- Stable left navigation and current-task center area.
- Primary actions in predictable page header positions.
- Secondary actions visually quieter and closer to their target data.
- Chat composer remains easy to find and supports natural multiline writing.
- History, tool/model/context controls, logs, and details are available without taking over the main task.
- Empty, disabled, reserved, dry-run, environment-limited, and error states remain explicit instead of pretending unfinished capabilities are complete.

Product boundaries preserved:

- No ChatGPT branding, icon, copy, or protected asset was copied.
- NexaChat remains a local AI workbench with provider/model, knowledge, Agent/tool, gateway, data, and security modules.
- No remote font dependency, large UI framework, duplicate sidebar, duplicate composer, duplicate message list, or fallback old shell was added.
- API keys remain masked except for the existing one-time reveal flow.
- No business data structure was intentionally changed by this UI iteration.

Verification results:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test -- tests/app.test.tsx tests/theme-token-authority.test.ts`: passed, 2 files / 18 tests.
- `npm.cmd run test:ui-smoke`: passed, 8 Playwright tests.
- `npm.cmd run test`: passed, 19 files / 63 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:electron-smoke`: passed.
- `npm.cmd run test:shortcut-readback:packaged`: passed; `C:\Users\至亲\Desktop\NexaChat.lnk` still points to the packaged NexaChat entry.
- `lint`, `test:ui`, `smoke`, and `electron:smoke` scripts do not exist in `package.json`, so they were not run.

Known notes:

- Historical progress/docs sections still contain older mojibake text. This iteration updated the active token/design docs it touched but did not rewrite all historical records.
- Real upstream Provider execution, full vector RAG/OCR/rerank, external MCP real-run execution, and autonomous Agent sandbox execution remain outside this UI logic pass and stay marked as unavailable, dry-run, reserved, or environment-limited where exposed.

## 2026-05-16 Architecture And Mainline Logic Iteration Plan

This round added `docs/build-plans/00-modular-refactor-master-plan/architecture-mainline-iteration-plan.md` as the architecture and mainline logic reorganization plan for later refactor rounds.

Scope completed:

- This round only wrote the architecture/mainline plan and updated this progress ledger.
- No business source code, Electron runtime logic, IPC, Gateway behavior, routing implementation, SQLite schema, tests, package files, or dependencies were changed.
- The plan is based on the current source state and the user's selected direction: chat-first, simple home, ordinary + advanced mode, Gateway as a core module, Agent as an experimental module, and cleanup around the chat mainline first.
- The plan records the current factual baseline as 7 first-level modules: Chat, Models, Knowledge Base, Tools, Gateway, Data, and Settings.
- The plan records the current root route fact: `/` resolves to `/chat/conversations`.
- The plan explicitly treats `NexaStore` in `src/main/services/store.ts` as the current centralized aggregate service, with `chat-service`, `router-service`, `security-service`, and related services documented only as future extraction targets.
- The plan does not claim PDF, Office, OCR, external vector DB, arbitrary MCP execution, Agent sandbox, signed installer hardening, or `safeStorage` fallback strong encryption as current completed capability.

Next recommended execution:

- Start from Phase 0 if the next round should clean stale Workspace/Dashboard or 8-module documentation.
- Start from Phase 1 if the next round should implement the simple home / chat-first mainline experience.

## 2026-05-16 Architecture Mainline Implementation Round

本轮目标:

- 按 `docs/build-plans/00-modular-refactor-master-plan/architecture-mainline-iteration-plan.md` 推进 Phase 0-3，并补充 Phase 4 验证、Phase 5 留痕、Phase 6 Git 收尾。
- 将源码、路由、UI、Gateway 契约、Store 拆分准备、测试和文档继续收敛到 chat-first 主线。

实际项目根目录:

- `git rev-parse --show-toplevel`: `D:/NexaChat`.

当前分支和起始 commit:

- Branch: `main`.
- Start commit: `f555185 docs: align architecture documentation with chat-first mainline`.
- User-provided background commit was `8ba7b9e316c92864088d97752a689d6fa2313c85`; the local branch had already advanced to `f555185` before this round began.

修改文件列表:

- `src/shared/gatewayRuntime.ts`
- `src/shared/types.ts`
- `src/shared/i18n.ts`
- `src/main/database/schema.ts`
- `src/main/database/connection.ts`
- `src/main/repositories/mappers.ts`
- `src/main/services/store.ts`
- `src/main/services/storeBoundaries.ts`
- `src/renderer/components/AppFrame.tsx`
- `src/renderer/modules/ChatPage.tsx`
- `src/renderer/modules/GatewayPage.tsx`
- `src/renderer/modules/SettingsPage.tsx`
- `src/renderer/mockApi.ts`
- `src/renderer/styles/pages.css`
- `tests/app.test.tsx`
- `tests/gateway-runtime.test.ts`
- `tests/store-boundaries.test.ts`
- `docs/architecture/module-relationships.md`
- `docs/architecture/store-facade-boundaries.md`
- `docs/design/00-ui-ux-master-plan.md`
- `docs/design/01-information-architecture.md`
- `docs/design/04-component-inventory.md`
- `docs/design/07-ui-acceptance-criteria.md`
- `docs/implementation/round-02-navigation-ia-closure.md`
- `docs/implementation/operation-logic-navigation-refactor-closure.md`
- `docs/implementation/round-15-quality-gates-release-convergence-closure.md`
- `docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md`
- `README.md`
- `README.zh-CN.md`
- `task_plan.md`
- `PROJECT_PROGRESS.md`

完成的 Phase:

- Phase 0: Active docs were updated to 7 modules, chat-first, `/ -> /chat/conversations`, Gateway core, Tools/Agent/MCP experimental, Knowledge text-like only, and `NexaStore` aggregate current state. Historical docs received current relevance notes instead of being deleted.
- Phase 1: Kept `/` routed to `/chat/conversations`; implemented a Chat-first lightweight task entry inside Chat with quick actions for new chat, model selection, knowledge Q&A, Gateway status, config import, and preferences. This is not a standalone simple home route.
- Phase 2: Separated Gateway available endpoints from reserved endpoints, persisted `advancedMode` in shared UI preferences, gated Chat technical context panel behind advanced mode, and kept 7-module navigation tests.
- Phase 3: Added pure `STORE_BOUNDARY_MAP` metadata and `docs/architecture/store-facade-boundaries.md` to prepare future service extraction without changing schema behavior or IPC contracts.

没完成的 Phase 和原因:

- A standalone simple home route was not implemented because the safer current step is a Chat lightweight entry while preserving `/ -> /chat/conversations`. It should only be added later with explicit route, UI smoke, Electron smoke, README, and progress updates.
- Full service extraction from `NexaStore` was not performed because the plan calls for low-risk preparation first and forbids a high-risk big-bang rewrite.

真实能力边界:

- Current Gateway available endpoints are `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings`; `/v1/responses` remains reserved / 501.
- Knowledge Base remains text-like import, parsing, chunking, lexical embedding, retrieval preview, rebuild/delete, and citations. PDF, Office, OCR, external vector DB, rerank, and full RAG evaluation are future work.
- Tools / Agent / MCP remains registration, permissions, agent definitions, dry-run, fixture execution, approvals, execution steps, and trace events. Arbitrary MCP executor, arbitrary code execution, and release-grade Agent sandbox are future work.
- `NexaStore` remains the current aggregate service.

运行过的验证命令和结果:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test -- tests/app.test.tsx tests/gateway-runtime.test.ts tests/store-boundaries.test.ts`: passed, 3 files / 15 tests.
- `npm.cmd run test`: passed, 20 files / 67 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 7 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed.
- `npm.cmd run scan:docs`: passed.
- `npm.cmd run scan:quality`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run verify:release`: passed, including typecheck, full unit tests, build, UI smoke, Electron smoke, package release, package smoke, installer smoke, packaged shortcut readback, scanner suite, docs scan, and `git diff --check`.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

已知风险:

- Historical docs and old progress entries still contain legacy terms by design; they now need current relevance notes when they are likely to mislead.
- `ui_preferences` migration is additive, but existing user databases still depend on runtime migration order staying intact.
- Chat quick actions are intentionally lightweight; they do not replace a future standalone simple home.

后续建议:

- If standalone simple home remains desired, implement it as a separate chat-first route decision with source, tests, docs, and smoke coverage in one round.
- Continue service extraction by moving pure validation/mappers/query helpers first, while keeping IPC contracts stable.
- Add a docs scanner rule for misleading current-tense Workspace/Dashboard and 8-module claims in active docs.

Commit and push:

- Pending until final verification succeeds.
