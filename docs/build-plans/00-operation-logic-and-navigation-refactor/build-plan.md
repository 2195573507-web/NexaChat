# NexaChat Operation Logic And Navigation Refactor Build Plan

## 一、Final Goal

本轮目标是在保持 NexaChat 当前主体功能不变的前提下，把 0.1 版本里已经可运行的 Provider、Model、Chat、Gateway、Knowledge、MCP、Agent dry-run、Data、Settings 能力重新组织成真正可操作、可维护、边界清晰的 0.2 操作架构。

最终 UI 必须围绕 8 个一级模块展开：工作台、对话、模型、知识库、工具与 Agent、本地网关、数据配置、设置与安全。侧边栏只显示这 8 个一级模块，模块可展开/收起，展开后显示该模块下的真实功能入口。每个入口进入独立、可理解的 URL 路由和单一职责页面。保留在主流程里的按钮必须连接真实 IPC、浏览器 fallback API 或本地状态；未完成高级能力只能作为 Roadmap/边界说明出现，不能伪装成已完成主功能。

## 二、Current State Audit

### Git 和工具状态

- 真实 Git 根目录：`D:/NexaChat`，已由 `git rev-parse --show-toplevel` 确认。
- 当前分支：`main`。
- 远程仓库：`origin https://github.com/2195573507-web/NexaChat.git`。
- 初始未提交改动：`docs/implementation/build-closure.md`、`findings.md`、`progress.md`、`task_plan.md` 已修改；`docs/implementation/iteration-01-closure.md`、`docs/implementation/iteration-02-closure.md`、`docs/iteration-plans/` 为未跟踪。它们视为既有用户/上轮改动，不能误删。
- `using-superpowers` skill 可用并已读取；`using-superpower` 单数名称在 `.codex/skills` 和 `.agents/skills` 均不可用。
- GitHub CLI `gh` 不可用；commit/push 使用标准 Git 命令完成。

### 当前 8 个一级模块

现有 `src/shared/navigation.ts` 已有 8 个一级模块，但第一个模块 ID 为 `dashboard`，与目标 `/workspace/*` 结构不一致。当前 8 个模块是：

- `dashboard` / 工作台。
- `chat` / 对话。
- `models` / 模型。
- `knowledge` / 知识库。
- `tools` / 工具与 Agent。
- `gateway` / 本地网关。
- `data` / 数据配置。
- `settings` / 设置与安全。

### 当前二级路由和页面问题

- 工作台包含 `quick-actions` 和 `workspaces`，其中快捷入口混入具体业务动作，且 canonical route 是 `/dashboard/*` 而不是 `/workspace/*`。
- 对话包含 `assistants`、`prompt-lab`、`comparison`、`artifacts`、`local-history`。其中 planned 能力仍作为可点击 tab 出现在主导航。
- 模型把密钥管理放在 `capabilities`，把路由规则放在 `templates`，语义和目标 `/models/catalog`、`/models/router` 不一致。
- 知识库包含 `bases`、`memory`、`maintenance` 等 planned 页面，主导航暴露过多未来能力。
- 工具模块包含 `tools`、`workflow`、`debug` 等 reserved/planned 页面，虽无执行按钮，但仍作为主导航入口出现。
- 网关包含 `virtual-models`、`routes`、`integrations`，把兼容说明、路由边界和导入预览混入网关主功能。
- 数据配置包含 `import-export`、`backup` planned 页面，主入口过多。
- 设置包含 request logs、usage、evals、diagnostics、users、permissions、keys、system、desktop 等混合项，把业务运行监控、数据维护和桌面入口塞进设置。

### 当前按钮和真实闭环审计

真实可保留的按钮：

- Provider 创建、Provider 健康测试：`api.createProvider`、`api.testProvider`。
- Model 创建：`api.createModel`。
- Chat 创建会话、发送消息、模型选择、上下文策略：`api.createConversation`、`api.sendMessage`。
- Gateway 启停、API Key 创建、一次性显示、撤销：`api.toggleGateway`、`api.createGatewayKey`、`api.revokeGatewayKey`。
- Knowledge 文本文件记录、retry lexical fallback：`api.createKnowledgeFile`、`api.retryKnowledgeFile`。
- MCP Server 注册、授权、拒绝：`api.createMcpServer`、`api.updateMcpPermission`。
- Agent 定义保存和 dry-run 预览：`api.createAgent`、`api.previewAgentRun`。
- Import manifest 预检、ready 计划应用：`api.validateImportManifest`、`api.applyImportPlan`。
- Snapshot 创建、恢复预检、诊断导出：`api.createSnapshot`、`api.restoreSnapshot`、`api.exportDiagnostics`。
- UI preferences 保存：`api.saveUiPreferences`。
- 打开日志目录：`api.openLogs`。

需要降级或移出主流程的入口：

- 多模型 fan-out、Artifacts、Prompt 模板库、长期记忆、workflow canvas、Agent 真执行、MCP 真工具调用、trace replay、完整导入导出、加密备份、破坏性清理、评测任务、用户/权限管理、桌面快捷方式 UI 管理。
- 这些能力不能作为主功能按钮或可执行页面出现，只能在 Roadmap/边界说明中展示。

### 当前 IPC 和本地数据能力

- `src/preload/index.ts` 暴露安全的 `window.nexachat` API，不直接泄露 `ipcRenderer`。
- `src/main/ipc.ts` 注册 Provider、Model、Chat、Gateway、Settings、Knowledge、MCP、Agent、Data、System IPC。
- `src/main/services/store.ts` 管理 SQLite 数据和本地业务闭环。
- `src/main/services/localGateway.ts` 提供 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`，`/v1/responses` 保留。
- `src/renderer/mockApi.ts` 提供浏览器 fallback，用于 Vite/Playwright 测试。

### 当前测试覆盖

- `package.json` 可用脚本：`dev`、`dev:electron`、`typecheck`、`build:renderer`、`build:main`、`build`、`start`、`test`、`test:ui-smoke`、`test:electron-smoke`、`verify`。
- 无 `lint` 脚本。
- `tests/app.test.tsx` 覆盖八模块渲染、Chat fallback、模型/网关/设置关键页面。
- `tests/ui-smoke.spec.ts` 覆盖 browser fallback、二级 tab 路由同步、planned/reserved placeholder、1040x680 overflow、导入拒绝、偏好保存。
- `scripts/electron-smoke.mjs` 覆盖 Electron shell 启动，但当前脚本文案仍含旧编码输出风险，需要确认测试通过即可。

## 三、Target Information Architecture

侧边栏一级只显示 8 个大模块名称；每个一级模块可展开/收起；展开后只显示本轮保留的具体功能入口。模块内二级导航必须与侧边栏入口同源，路由和导航注册表一致。

### 工作台

- `/workspace/overview`：系统总览、待处理事项、快速入口。
- `/workspace/activity`：最近活动、请求、审计、网关事件。
- `/workspace/health`：本地应用状态、网关状态、数据状态。

### 对话

- `/chat/conversations`：会话列表和会话管理。
- `/chat/playground`：聊天主界面、消息发送、模型选择。
- `/chat/context`：上下文策略和当前会话上下文状态。

### 模型

- `/models/providers`：Provider 管理、API Key 保存、健康测试。
- `/models/catalog`：模型创建、模型列表、能力展示。
- `/models/router`：Router 决策、默认模型、路由策略。

### 知识库

- `/knowledge/files`：知识文件记录。
- `/knowledge/chunks`：chunk 和 lexical fallback 状态。
- `/knowledge/retrieval`：检索预览和引用来源说明。

### 工具与 Agent

- `/tools/mcp`：MCP Server 注册、授权、拒绝。
- `/tools/agents`：Agent 定义、保存、dry-run。
- `/tools/runs`：执行预览和未来执行记录；只显示 dry-run，不提供假执行按钮。

### 本地网关

- `/gateway/overview`：监听地址、端点状态、OpenAI-compatible 说明。
- `/gateway/keys`：Gateway API Key 生成、一次性显示、撤销、scope。
- `/gateway/logs`：请求日志、错误、用量、网关事件。
- `/gateway/docs`：本地调用示例和安全说明。

### 数据配置

- `/data/import`：导入清单预检、无效导入拒绝、ready 计划确认应用。
- `/data/snapshots`：快照、恢复预检。
- `/data/diagnostics`：诊断导出。
- `/data/cleanup`：安全清理说明；没有破坏性假按钮。

### 设置与安全

- `/settings/preferences`：主题、语言、字体、密度、减少动效。
- `/settings/security`：secret 存储、安全说明、IPC 边界说明。
- `/settings/audit`：审计日志。
- `/settings/about`：版本、路径、运行环境。

## 四、Module Boundary Rules

1. 工作台只负责总览、最近活动、系统状态、快速入口、待处理事项，不能承载具体配置表单。
2. 对话只负责会话、消息、模型选择、上下文策略、聊天运行状态，不能混入 Provider 配置、网关 Key 管理、知识库文件管理。
3. 模型只负责 Provider、Model、Router、健康测试、模型能力、默认模型策略，不能混入聊天记录和网关调用日志。
4. 知识库只负责知识文件、chunk、索引状态、检索预览、引用来源，不能混入 Agent 执行和 Chat 页面逻辑。
5. 工具与 Agent 只负责 MCP Server、自定义工具边界、Agent 定义、dry-run、执行状态，不能混入网关 API Key 和 Provider 密钥管理。
6. 本地网关只负责 OpenAI-compatible 网关状态、Gateway API Key、端点说明、请求日志、scope 校验、外部调用说明，不能混入模型 Provider 的密钥配置表单。
7. 数据配置只负责导入、导出边界、快照、恢复预检、诊断导出、数据清理说明，不能混入安全设置和 UI 偏好。
8. 设置与安全只负责主题、语言、密度、字体、减少动效、安全存储、审计日志、安全说明，不能混入业务功能管理。

## 五、Implementation Plan

本轮按并行任务组推进，执行时至少同时保持两个任务组活跃。

### A 组：导航模型和路由重构

- 重写 `src/shared/navigation.ts` 为统一导航注册表。
- `moduleId` 改为 `workspace | chat | models | knowledge | tools | gateway | data | settings`。
- 每个 child 包含 route、title、description、status、featureBoundary。
- 添加路由别名，将旧 `/dashboard/*`、`/models/models`、`/gateway/status` 等旧路由迁移到新 canonical route。
- 更新 `resolveNavigation`、`getTabRoute`、导航一致性测试。

### B 组：页面边界和模块目录重构

- 更新 `DashboardPage` 为工作台语义，页面只处理 overview/activity/health。
- 拆分 Chat 为 conversations/playground/context。
- 拆分 Models 为 providers/catalog/router。
- 拆分 Knowledge 为 files/chunks/retrieval。
- 拆分 Tools 为 mcp/agents/runs。
- 拆分 Gateway 为 overview/keys/logs/docs。
- 拆分 Data 为 import/snapshots/diagnostics/cleanup。
- 拆分 Settings 为 preferences/security/audit/about。

### C 组：未完成功能、假按钮、空状态和 Roadmap 处理

- 从主导航移除 planned/reserved 顶级入口。
- 保留 Roadmap/边界说明为静态非执行内容。
- 对 environment-limited 能力显示原因、依赖和不开放原因。
- 确保 placeholder 内无按钮，无“立即执行”类假入口。

### D 组：样式、布局、侧边栏展开交互和响应式桌面体验

- 重写 Sidebar 为一级模块展开/收起结构。
- 当前路由高亮一级模块和子功能。
- 保持 compact flat desktop-tool 风格，不引入 Liquid Glass、大面积 blur 或营销 hero。
- 维持 1040 x 680 桌面下无整体水平溢出。

### E 组：测试、文档、冒烟验证和回归

- 更新 unit test 和 Playwright smoke 以覆盖新路由。
- 跑 `npm.cmd install` 或依赖检查。
- 跑 `npm.cmd run typecheck`、`npm.cmd run test`、`npm.cmd run test:ui-smoke`、`npm.cmd run build`、`npm.cmd run verify`、`npm.cmd run test:electron-smoke`。
- 失败必须修复并重跑。
- 更新 `PROJECT_PROGRESS.md` 和本计划文件测试结果。
- 检查桌面快捷方式并重新关联到当前最新可用启动入口。
- Git commit + push。

## 六、Cleanup Plan

- 删除旧导航语义：`dashboard` 模块 ID、`workspaces`、`quick-actions`、`assistants`、`prompt-lab`、`comparison`、`artifacts`、`local-history`、`capabilities`、`templates`、`bases`、`memory`、`maintenance`、`workflow`、`debug`、`virtual-models`、`routes`、`integrations`、`import-export`、`backup`、`request-logs`、`usage`、`evals`、`diagnostics`、`feedback`、`users`、`permissions`、`keys`、`system`、`desktop` 等旧 tab id。
- 删除或改写重复页面分支，避免同一个大页面承载多个业务域。
- 删除或合并废弃 CSS 类，保留稳定布局类。
- 合并复用状态标签、页面壳、空状态、表格组件。
- planned/reserved/environment-limited 统一为 Roadmap 或边界说明，不作为可点击主功能入口。
- 不删除 SQLite store、IPC、安全存储、本地网关、Provider、Chat、日志、审计、API Key 基础能力。

## 七、Rewrite Plan

允许重写：

- 侧边栏 Sidebar。
- 导航元数据和路由别名。
- 模块页面壳和二级导航组件。
- 页面布局组件与模块首页。
- 模块页面内部的 tab 分支。

禁止破坏：

- SQLite store 和 schema。
- IPC 安全边界和 preload 隔离。
- Gateway API Key 生成、一次性显示、撤销、scope。
- Provider API Key 存储和 secret_ref。
- Chat 消息持久化、路由决策和 request log。
- 本地 OpenAI-compatible Gateway。
- 审计日志、用量统计、诊断导出。

## 八、Acceptance Criteria

- 应用可以启动。
- 侧边栏一级模块可展开/收起。
- 每个展开项都能进入对应功能页面。
- 每个页面职责单一、边界清晰。
- UI 中保留的按钮都有真实行为。
- 未实现能力不能以可点击主功能出现。
- 8 个一级模块都存在。
- 当前已完成主体功能不能丢失。
- Provider 创建、API Key 保存、健康测试仍可用。
- Model 创建、模型列表仍可用。
- Chat 会话、消息持久化、模型选择仍可用。
- 本地网关 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings` 仍可用。
- Gateway API Key 生成、一次性显示、撤销、scope 校验仍可用。
- 知识文件记录和 fallback chunk 仍可用。
- MCP Server 注册和授权/拒绝状态仍可用。
- Agent 定义保存和 dry-run 仍可用。
- 导入预检、快照、恢复预检、诊断导出仍可用。
- UI 偏好保存仍可用。
- 日志、审计、用量统计入口清晰可用。
- 没有 TypeScript 错误。
- 没有明显未使用的大块旧代码。
- 没有死路由。
- 没有点击无反应的主功能按钮。
- 没有功能边界混乱的页面。

## 九、Testing Requirements

从 `package.json` 读取到的脚本为准，本轮至少执行：

- `npm.cmd install` 或等价依赖检查。
- `npm.cmd run typecheck`。
- `npm.cmd run test`。
- `npm.cmd run test:ui-smoke`。
- `npm.cmd run build`。
- `npm.cmd run verify`。
- `npm.cmd run test:electron-smoke`。

无 `lint` 脚本时记录为项目未提供，不能伪造。若某个测试因环境限制失败，记录具体原因并用可替代检查补足；可修复失败必须修复后重跑。

## 十、Documentation Requirements

必须更新：

- `PROJECT_PROGRESS.md`。
- `docs/build-plans/00-operation-logic-and-navigation-refactor/build-plan.md`。

视变更范围补充更新：

- `task_plan.md`、`progress.md`、`findings.md`。
- `docs/implementation/operation-logic-navigation-refactor-closure.md`。
- 必要时更新设计/架构文档。

文档必须记录本次重构前的问题、新操作逻辑、新侧边栏结构、模块边界、清理内容、重写内容、保留能力、降级/移出主流程的未完成能力、测试结果、commit hash 和下一轮建议。

## Execution Log

- 2026-05-14：已完成根目录、Git 状态、远程、分支、技能、GitHub CLI、package scripts、src/main、src/preload、src/shared、src/renderer、modules、docs、tests、Electron smoke 的首轮审计。
- 2026-05-14：进入导航注册表、侧边栏展开交互、页面边界重构执行阶段。
- 2026-05-14：完成 `src/shared/navigation.ts` 统一导航注册表重写，8 个一级模块改为 expandable sidebar，29 个功能子路由与导航 children 对齐。
- 2026-05-14：完成 `src/renderer/AppShell.tsx` 侧边栏重写、`src/renderer/App.tsx` 路由映射调整、`ModuleSubNav` 图标补齐、`EmptyState` 假动作保护。
- 2026-05-14：完成 8 个模块页面边界重构：工作台、对话、模型、知识库、工具与 Agent、本地网关、数据配置、设置与安全均按目标 route 拆分页面职责。
- 2026-05-14：完成 planned/reserved/environment-limited 降级处理，未实现高级能力只保留 Roadmap/边界说明，不在主流程展示假执行按钮。
- 2026-05-14：完成单测、Playwright UI smoke、Electron smoke 更新和验证。

## Test Results

- `npm.cmd install`：通过，依赖 up to date，audit 0 vulnerabilities。
- `npm.cmd run typecheck`：通过，无 TypeScript 错误。
- `npm.cmd run test`：通过，1 个测试文件 / 3 个测试。
- `npm.cmd run test:ui-smoke`：通过，7 个 Playwright 测试，覆盖八模块展开、功能路由同步、旧路由别名、1040x680 桌面下限、导入拒绝、偏好保存。
- `npm.cmd run build`：通过，renderer 和 main 均构建成功。
- `npm.cmd run verify`：通过，包含 typecheck、test、build。
- `npm.cmd run test:electron-smoke`：通过，Electron shell 渲染并确认 `/workspace/overview`。
- `lint`：项目 `package.json` 未提供 lint 脚本，已记录，未伪造执行结果。
- `git diff --check`：待最终提交前执行。

## Desktop Shortcut Result

- 已检查 `C:\Users\至亲\Desktop\NexaChat.lnk`。
- 当前 TargetPath：`D:\NexaChat\node_modules\electron\dist\electron.exe`。
- 当前 Arguments：`"D:\NexaChat"`。
- 当前 WorkingDirectory：`D:\NexaChat`。
- 当前 IconLocation：`D:\NexaChat\assets\app-icon.ico,0`。
- 该快捷方式已指向当前最新可运行开发启动入口，无需重新生成。

## Git Result

- Refactor commit hash：待 commit 后回填。
- Push result：待 push 后回填。
