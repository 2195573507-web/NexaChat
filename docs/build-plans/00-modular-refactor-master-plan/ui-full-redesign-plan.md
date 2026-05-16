# NexaChat UI 全量重做计划

更新时间：2026-05-16

本文件是 NexaChat / AI 对话中枢的 UI 全量重做 Phase 0 计划。当前轮次只做调研、审计、信息架构设计、组件规划和验收标准，不修改 UI 源码、路由、IPC、Store 或业务逻辑。

## 1. 背景

NexaChat 不是普通聊天软件，而是本地优先的多模型 AI 对话中枢。它同时覆盖桌面 Shell、本地 SQLite 数据、Provider/Model 管理、OpenAI-compatible 本地网关、API Key、知识库、Agent/MCP/工具执行、数据导入导出、审计/观测/评测、设置与安全。当前代码已经有 8 个一级模块、路由化二级导航、统一 IPC/API 合约和浏览器 smoke mock，但 UI 仍需要一次从信息架构、页面边界、组件体系、状态表达和防幻觉规则出发的全量重做。

本计划的真实代码审计基于当前 Git 根目录命令结果：`git rev-parse --show-toplevel` 返回 `D:/NexaChat`。后续命令和文件路径均以该真实根目录为基准。

## 2. 前置检查结果

### 2.1 Skills 检查

| 项 | 结果 | 证据 | 对本计划的影响 |
|---|---|---|---|
| `using-superpower` | 未发现 | `Test-Path C:\Users\至亲\.codex\skills\using-superpower\SKILL.md` 返回 `False` | 不编造该别名已使用。 |
| `using-superpowers` | 已发现并读取 | `Test-Path C:\Users\至亲\.codex\skills\using-superpowers\SKILL.md` 返回 `True`，并已读取 `SKILL.md` | 本轮先做技能检查和上下文读取。 |
| `impeccable` | 已发现并读取 | `Test-Path C:\Users\至亲\.codex\skills\impeccable\SKILL.md` 返回 `True`，并已读取 `SKILL.md` | 本计划采用其产品型 UI 原则。 |
| `impeccable` 项目上下文 | 项目内未发现 `PRODUCT.md` / `DESIGN.md` | `load-context.mjs` 返回 `hasProduct=false`、`hasDesign=false`、`contextDir=D:\NexaChat` | 不新增额外上下文文件；在本计划中记录缺口。 |

### 2.2 impeccable 设计原则提炼

本轮实际使用了 `impeccable` skill。它给出的产品型 UI 约束被记录为后续验收规则：

- 设计服务于任务，不做展示页和营销页。
- 工具型产品应优先使用熟悉、可预测的导航、表格、表单、设置、命令入口。
- 默认采用克制色彩策略：中性色 + 少量强调色，强调色只用于主操作、当前选择和状态，不做装饰。
- 每个交互组件必须覆盖 default、hover、focus、active、disabled、loading、error。
- 空状态要能引导下一步，不只写“暂无数据”。
- Motion 只表达状态变化，150-250ms 低干扰，不做页面入场编排。
- 禁止默认 glassmorphism、装饰性渐变文字、重复同构卡片网格、Modal 作为第一反应。
- 产品 UI 用系统字体是合理选择；固定字号层级优于 viewport 流式字号。
- 组件一致性比视觉惊喜更重要。

### 2.3 本轮边界

本轮允许：

- 新增 `docs/build-plans/00-modular-refactor-master-plan/ui-full-redesign-plan.md`。
- 更新 `PROJECT_PROGRESS.md`，记录本轮计划产出。

本轮禁止且未计划执行：

- 不重写 UI 源码。
- 不修改路由、IPC、Store、数据库、业务逻辑。
- 不删除旧 UI。
- 不引入 UI 框架。
- 不在项目根目录外创建目录。
- 不运行 build/test 作为完成信号，因为本轮只改规划文档。

### 2.4 并行分析方向

本轮按两个方向并行推进，但所有产出收敛到同一份计划文档：

| 方向 | 分析内容 | 证据来源 | 输出位置 |
|---|---|---|---|
| 方向 A：当前 UI 问题诊断与信息架构重组 | Electron/React 入口、Shell、一级/二级导航、路由、模块页、组件复用、样式、状态、硬编码、mock/真实能力边界 | `src/renderer/App.tsx`、`src/renderer/AppShell.tsx`、`src/shared/navigation.ts`、`src/renderer/modules/*`、`src/renderer/components/*`、`src/shared/api.ts`、`src/shared/ipc.ts`、`src/main/ipc.ts`、`src/main/services/store.ts`、`src/renderer/styles.css` | 第 3、6、7、8、9、10、11、12 节 |
| 方向 B：优秀 UI / 产品案例学习与 NexaChat 可落地方案映射 | 本地模型管理、Provider 切换、知识库、工作流执行、Agent/工具、日志、Key/Token、命令入口、低干扰交互 | CCS / CC Switch 类项目、Open WebUI、Dify、Flowise、Langflow、n8n、sub2api、OpenAI、Anthropic、Cursor、Raycast；Perplexity 标为需要进一步核实 | 第 4、5、6、8、9、10、11、12 节 |

## 3. 当前 UI 审计

### 3.1 入口、Shell、导航、路由

| 审计项 | 当前事实 | 文件或模块 | 问题诊断 | 重做要求 |
|---|---|---|---|---|
| Electron 入口 | Electron main 注册窗口、协议、IPC，renderer 由 Vite/Electron 加载 | `src/main/index.ts`、`src/preload/index.ts`、`src/renderer/main.tsx` | 入口分层清楚；UI 重做不能绕过 preload 白名单 API。 | 所有 UI 数据必须通过 `window.nexachat` / `AppApi`，不得直连 Node/Electron。 |
| React 入口 | `main.tsx` 挂载 `App` | `src/renderer/main.tsx` | 入口简单，适合保留。 | Phase 1 只替换 Shell/路由组织，不改启动链。 |
| App 级状态 | `App.tsx` 持有 `snapshot`、`busy`、`notice`、`navigationState`，所有操作通过 `runAction` 刷新快照 | `src/renderer/App.tsx` | 全局 busy/notice 只在右侧栏显示，页面内操作反馈不够贴近触发点；成功消息由调用方传入字符串，缺少统一 Toast/Notification 契约。 | 引入统一 `Toast/Notification` 规划；每个页面还需本地 loading/error/disabled 状态。 |
| 一级导航 | 8 个模块来自配置 | `src/shared/navigation.ts`、`src/renderer/AppShell.tsx` | 配置集中是优点；但所有一级模块 `stage` 目前由 `defineModule()` 固定为 `implemented`，无法表达模块内仍有 `environment-limited` 或 `dry-run` 层。 | 模块级状态必须从能力聚合而来，不能只因有页面就标为完整实现。 |
| 二级导航 | `/<module>/<tab>` 为 canonical route，侧边栏和页面 `ModulePageFrame` 都渲染二级入口 | `src/shared/navigation.ts`、`src/renderer/App.tsx`、`src/renderer/components/ModulePageFrame.tsx` | 二级导航已真实路由化，但侧边栏和内容区同时展示同一组 tabs，存在重复入口压力。 | Phase 1 需要明确：侧边栏负责模块和常用子入口，内容区 SecondaryNav 负责当前模块页面；避免双重主入口。 |
| 路由兼容 | 当前只保留 `/ -> /workspace/overview` alias | `src/shared/navigation.ts` | 旧 alias 已大幅清理，这是正向基础。 | 新 UI 不得新增旧链路备用实现；迁移期 alias 必须有 owner 和删除里程碑。 |
| 页面注册 | 8 个模块映射到 8 个模块页面 | `src/renderer/modules/modulePageRegistry.tsx` | 页面注册集中；但一个模块页内部仍包含多 tab 分支和业务表单。 | Phase 1/2 应拆为页面边界清楚的 page registry，避免单文件继续膨胀。 |

### 3.2 页面和模块问题

| 问题 | 文件或模块 | 当前事实 | 风险 | 处理建议 |
|---|---|---|---|---|
| 工作台信息仍偏聚合卡片 | `src/renderer/modules/DashboardPage.tsx` | overview、activity、health 都从 `AppSnapshot` 聚合指标、日志、快捷入口 | 信息可用但工作台与观测/日志模块边界容易重叠 | 新工作台只保留“当前状态、待处理、最近会话、快捷入口”，详细日志跳转观测或网关。 |
| 对话页承载过多任务 | `src/renderer/modules/ChatPage.tsx` | `playground` 同时含会话列表、消息流、输入区、上下文信息、多模型比较选择 | 单页复杂度高，单模型对话和多模型对比边界不够清楚 | Phase 3 拆为单模型对话、多模型对比、会话历史、Prompt/模板。Artifacts 标注规划中。 |
| Provider/Model 默认值硬编码 | `src/renderer/modules/ModelsPage.tsx` | `OpenAI-compatible Provider`、`https://api.openai.com/v1`、`gpt-compatible-model` 是组件 state 默认值 | 默认值可能让用户误以为真实配置已存在 | 默认值应来自 Provider preset 配置；若无配置，显示需要配置的 EmptyState。 |
| Provider 类型列表散在 UI helper | `src/renderer/modules/shared.tsx` | `providerTypes` 数组定义在 renderer 共享文件 | 配置与后端 provider runtime 分离，后续易漂移 | 迁移到统一 Provider catalog / shared runtime，不在 UI 组件内维护业务枚举。 |
| 网关文档示例内联硬编码 | `src/renderer/modules/GatewayPage.tsx` | curl 示例中 fallback model 为 `nexachat-model`，示例消息为 `hello` | 可接受为文档示例，但应标注示例而非当前真实模型 | 统一 `GatewayDocs` 数据源，示例模型优先取真实默认模型；fallback 明确为示例占位。 |
| API Key 危险操作缺少确认 | `src/renderer/modules/GatewayPage.tsx` | revoke、rotate、disable 直接触发 API | 误操作风险，尤其是 revoke/rotate | Phase 3 必须使用 `ConfirmDialog`，并显示影响范围。 |
| 知识库导入是文本框样例 | `src/renderer/modules/KnowledgePage.tsx` | 默认文件名 `manual-note.md`，内容来自 sample 文案，支持文本/Markdown 等内容导入 | 当前不是完整文件导入体验；可能误导用户以为 PDF/OCR/Office 已接入 | 文本导入保持可用；文件导入、PDF/OCR/Office 标注未接入或后续阶段。 |
| 知识库删除缺少确认 | `src/renderer/modules/KnowledgePage.tsx` | delete/retry/rebuild 均在表格行内直接按钮 | 删除不可逆语义需要确认 | 删除必须使用确认，retry/rebuild 需显示行级 loading。 |
| Tools/MCP 默认地址硬编码 | `src/renderer/modules/ToolsPage.tsx` | 创建 MCP 使用 `http://127.0.0.1:9000/mcp` | 本地示例可能被误认为已配置真实 MCP | 迁移为 MCP Server 表单，默认空，示例放说明或 preset。 |
| Agent 和 Run Center 容易制造执行幻觉 | `src/renderer/modules/ToolsPage.tsx` | Agent 创建、dry-run、fixture-only run center 已存在 | 有真实 execution fixture，但外部 MCP/Workflow 并未完整接入 | 必须明确 `dry-run`、`fixture-only`、`需要审批`、`未接入外部工具`。 |
| 数据配置预填危险短语 | `src/renderer/modules/DataPage.tsx` | backup/restore passphrase 默认 `nexachat-backup`，rollback 确认短语默认填好 | 降低危险操作确认门槛 | Phase 3 必须改为用户手动输入；计划中禁止预填危险确认短语。 |
| 设置保存缺少局部保存状态 | `src/renderer/modules/SettingsPage.tsx` | preferences 本地 state，点击保存后依赖全局 notice | 用户难以确认哪个设置已保存、是否有未保存变更 | `SettingsSection` 需要 dirty/saving/saved/error 状态。 |
| About 数据路径不是运行时真实路径 | `src/renderer/modules/SettingsPage.tsx`、`src/shared/i18n.ts` | `settings.about.dataLocationValue` 来自文案 | 可能与真实 SQLite/用户数据目录不同 | 需要进一步核实真实数据路径 API；未接入前标为待核实，不显示假路径。 |
| 表格空状态过于泛化 | `src/renderer/modules/shared.tsx` | `DataTable` 空行统一用 `shared.empty.*` | 不同页面缺少针对下一步操作 | `DataTable` 只管表格；页面提供语义化 EmptyState。 |
| 状态词不完整 | `src/shared/types.ts`、`src/renderer/components/StatusPill.tsx` | `ModuleStage` 仅有 `ready/implemented/planned/reserved/environment-limited` | 用户要求的 `dry-run`、`需要配置`、`出错`、`只读预览` 无统一状态 | 新 `CapabilityBadge` 与 `StatusBadge` 必须支持能力状态和运行状态两套词汇。 |
| CSS 单文件过大 | `src/renderer/styles.css` | 样式集中在一个 CSS 文件，含 tokens、shell、页面、组件、响应式 | 维护和审计困难；局部组件样式边界弱 | Phase 1/2 规划拆为 token、layout、components、modules，但不得引入大型 UI 框架。 |
| 色彩 token 仍为 HEX | `src/renderer/styles.css` | 当前 token 使用 `#...`，不是 OKLCH | 可用但不符合 `impeccable` 色彩建议 | Phase 1 先统一 token 语义，Phase 2 再评估 OKLCH 迁移。 |
| 浏览器 mock 是重复行为面 | `src/renderer/api.ts`、`src/renderer/mockApi.ts` | mock 已显式只在 test/browser smoke 启用 | 仍可能与生产 Store 漂移 | 继续保留测试用途，但 UI 计划不得把 mock 数据当生产能力证据。 |
| IPC 只做 arity 校验 | `src/shared/ipc.ts`、`src/main/ipc.ts` | `assertIpcPayload` 检查参数数量，Store 做更深层处理 | UI 表单校验和 IPC payload schema 仍可加强 | 后续若改 UI 表单，计划增加 schema/field validation，但本轮不改。 |
| Store 职责很大 | `src/main/services/store.ts` | `getSnapshot()`、Provider、Chat、Gateway、Knowledge、Execution、Data、Observability 等均在 Store | UI 页面容易依赖一个大快照，导致全局刷新和重渲染 | 新 UI 页面仍先用 `AppApi`，但计划中要求按模块选择数据、分页和增量刷新。 |

### 3.3 硬编码和重复链路审计

| 类型 | 证据 | 结论 | 要求 |
|---|---|---|---|
| UI 默认文案硬编码 | `ModelsPage.tsx`、`KnowledgePage.tsx`、`DataPage.tsx`、`ToolsPage.tsx` | 存在组件内默认 Provider、Model、MCP URL、文件名、passphrase、curl 示例 | 迁移到统一配置/preset；用户未配置时显示 `需要配置`。 |
| Provider/Model 名硬编码 | `ModelsPage.tsx`、`src/renderer/modules/shared.tsx` | Provider type 列表和示例模型名在 renderer | Provider catalog 应归 shared runtime，不归页面组件。 |
| 路径硬编码 | `PROJECT_PROGRESS.md` 记录桌面快捷方式路径；UI 里 About 数据路径为文案 | 进度文档可记录真实路径；UI 运行时路径需要 API 证据 | 不在 UI 写固定 D 盘路径；真实路径从 desktop/data runtime 暴露。 |
| 新旧路由并存 | `src/shared/navigation.ts` | 当前只保留 root alias | 暂未发现多套旧 UI 路由入口；继续禁止新增备用链路。 |
| 重复导航 | `AppShell.tsx` 侧边栏子项 + `ModulePageFrame.tsx` 模块 tabs | 同一二级入口在两处展示 | Phase 1 明确主次，不让用户误判两个导航体系。 |
| 重复组件 | `Metric`、`.metric-card`、`StateBadge`、`StatusPill`、多处 `panel` | 有多个相近表现 | 新组件体系禁止继续增加 Card/Badge/Nav 变体。 |
| 模拟链路 | `src/renderer/mockApi.ts` | 已通过 `VITE_NEXACHAT_BROWSER_MOCK=1` 限定测试 | 任何计划截图/验收不得把 browser mock 当生产能力。 |

## 4. 学习对象清单

本计划参考以下对象。外部来源仅作为产品学习对象，不作为 NexaChat 已支持能力的证据。

| 学习对象 | 来源 | 可学习点 | 不应照搬点 | NexaChat 落地映射 | 对应模块 | 风险 | 验收方式 |
|---|---|---|---|---|---|---|---|
| CCS / CC Switch 类项目 | GitHub topic `cc-switch`、`adithya-13/cc-switch` README、CC Switch setup docs | 快速切换 Provider、查看当前状态、doctor 检查、API key 状态、无需手改 JSON | 不照搬 CLI/TUI 形态；不把所有功能压进一个单页；不把密钥暴露在前端 | Provider 管理、连接测试、配置导入、当前激活 Provider 状态、doctor 入口 | 模型与 Provider、设置与安全、数据配置 | 过度追求切换速度导致安全/确认不足 | Provider 列表能显示当前、健康、密钥状态；切换/测试有真实反馈和审计记录。 |
| Open WebUI | `https://docs.openwebui.com/features/workspace/models/`、`https://docs.openwebui.com/features` | 本地/自托管模型入口、模型 preset 绑定知识/工具/参数、模型 selector、Workspace 管理 | 不照搬多用户社交/共享复杂度，除非权限模型已真实支持 | 模型 preset、知识/工具绑定状态、聊天入口和模型切换 | 对话、模型与 Provider、知识库、Agent/工具 | 模型 preset 容易变成虚假 Agent 能力 | 模型卡显示绑定资源和限制，未接入工具/知识时明确 `未接入`。 |
| Dify | `https://docs.dify.ai/en/guides/workflow/debug-and-preview/history-and-logs`、`https://docs.dify.ai/en/guides/knowledge-base/...` | 应用编排、知识库 chunk/index/retrieval、Run History、Tracing、发布状态 | 不照搬云平台组织/多租户/发布市场 | 知识库解析状态、检索测试、执行 trace、发布/启用状态概念 | 知识库、Agent/工具、观测与评测 | 云平台式复杂度压垮桌面端 | 每个 run 可看输入/输出/节点状态；知识库可看 chunk/index/retrieval 证据。 |
| Flowise | `https://docs.flowiseai.com/using-flowise/agentflowv2` | Agentflow、Start/LLM/Tool/Human Input/Loop/Execute Flow 节点、显式执行流 | 不照搬大画布作为首轮入口；不在安全能力不足时开放任意工具节点 | 先做列表式 execution run/steps/approval，再规划可视化 | Agent/工具/MCP、观测与评测 | 画布先行会制造“已能执行工作流”的幻觉 | Phase 4 只展示真实 run/step/approval；Workflow canvas 后置。 |
| Langflow | `https://docs.langflow.org/`、`https://docs.langflow.org/concepts-playground` | 节点式 AI 流程、Playground 实时测试、Agent 工具调用可见 | 不照搬开发者参数堆叠和复杂组件面板 | 用 Playground 思路改造对话/检索/工具测试区 | 对话、知识库、Agent/工具 | 参数太多导致普通用户迷失 | 每个测试页只暴露必要输入，并能看到输入、输出、工具/检索证据。 |
| n8n | `https://docs.n8n.io/workflows/executions/`、`https://docs.n8n.io/flow-logic/error-handling/` | 执行记录、状态过滤、失败重试、错误工作流、执行数据脱敏 | 不照搬企业自动化复杂设置和海量节点配置 | RunStatusTimeline、ActivityLog、失败重试、脱敏日志 | Agent/工具、观测与评测、数据配置 | 日志页面过重或泄露敏感数据 | 日志列表支持状态过滤、详情、重试边界、脱敏默认开启。 |
| sub2api | `https://github.com/Wei-Shaw/sub2api/blob/main/README_CN.md` | 多账号、API Key 分发、Token 用量、负载均衡、并发/限流、管理 dashboard | 不照搬服务端平台代理商业模式；NexaChat 是本地桌面端 | Provider 账号、Gateway Key、用量、健康度、限流策略 | 模型与 Provider、本地网关、观测与评测 | 容易把本地工具做成云代理后台 | UI 明确本地数据边界；Key/用量来自本地 Store/Gateway 日志。 |
| OpenAI API Platform | `https://help.openai.com/en/articles/9186755`、`https://platform.openai.com/docs/api-reference/project-rate-limits` | Project、API key 权限、模型使用限制、预算/用量可视化 | 不照搬组织/项目权限层级，除非本地权限模型支持 | Gateway Key scope、限流、用量、项目/工作区边界 | 本地网关、设置与安全、观测与评测 | 把云端组织概念硬搬到单机桌面 | Key 权限、限流、用量都能追溯到本地契约。 |
| Anthropic Console | `https://docs.anthropic.com/en/api/overview` | Workbench、API Key、workspace 按用途隔离、浏览器试跑 API | 不照搬只针对 Anthropic 的模型/计费假设 | Provider test、模型请求 Playground、密钥状态 | 模型与 Provider、对话 | 单一供应商偏见 | Provider 类型配置相同体验，供应商差异只在 adapter capability 中表达。 |
| Cursor | `https://docs.cursor.com/configuration/kbd` | 命令面板、模型切换、快捷键、低干扰编码工具交互 | 不照搬 IDE 代码上下文功能 | CommandPalette 后置，优先用于跳转、执行常用命令、打开日志 | 全局 Shell、对话、设置 | 快捷键未文档化会影响可发现性 | Phase 5 才做 CommandPalette，先验收导航可达性。 |
| Raycast | `https://manual.raycast.com/extensions`、`https://manual.raycast.com/preferences`、`https://manual.raycast.com/ai/ai-extensions` | 命令式入口、扩展/工具可配置、设置面板、AI 扩展权限 | 不照搬 macOS launcher 形态，不把所有功能塞进命令面板 | 扩展/MCP/工具状态、命令入口、设置分区 | Agent/工具/MCP、设置与安全、CommandPalette | CommandPalette 早做会遮盖页面 IA 问题 | 页面 IA 通过后再接命令入口，所有命令必须有反馈和权限。 |
| Perplexity | 需要进一步核实官方 UI 文档 | 搜索型 AI 的输入体验、引用可见性、低干扰反馈可作为启发 | 不照搬在线搜索/SaaS 假设 | 仅映射到知识库引用显示和检索结果说明 | 知识库、对话 | 当前未完成官方来源核实 | Phase 0 只列为待核实，不作为硬设计依据。 |

## 5. UI 重做总原则

1. 工具型应用优先，不做花哨展示页。
2. 信息架构清晰：一级模块、二级功能、具体页面边界必须可解释。
3. 每个页面只解决一个主要问题，不把配置、日志、执行、未来规划堆在一起。
4. 功能真实状态必须可见：`已完成`、`可用但基础`、`dry-run`、`只读预览`、`需要配置`、`未接入`、`出错`、`待核实`。
5. 状态、文案、导航、模块配置必须走统一配置和 i18n，不允许页面散落业务枚举。
6. UI 不得先行制造功能幻觉。
7. 不保留旧 UI 链路作为备用实现。
8. 不允许新旧设计同时存在造成双重入口。
9. 不为了视觉效果破坏可维护性。
10. 页面切换、加载、空状态、错误、表单校验、长任务进度、危险确认、设置保存状态、Provider/Gateway/Agent/Knowledge 运行状态必须清楚。

## 6. 新 UI 信息架构建议

### 6.1 一级模块

| 一级模块 | 二级导航 | 第一阶段重做状态 | 页面边界 |
|---|---|---|---|
| 工作台 | 总览、最近会话、当前运行状态、待处理事项、快捷入口 | Phase 2 重点 | 首页只回答“现在系统能不能用、下一步做什么”。 |
| 对话 | 单模型对话、多模型对比、会话历史、Prompt/模板、Artifacts | 单模型/历史进 Phase 3；多模型基础进 Phase 3；Artifacts 后置 | 对话体验不承载 Provider 配置和网关 Key 管理。 |
| 模型与 Provider | Provider 管理、模型管理、连接测试、调用参数、健康度、用量统计 | Provider/模型/连接测试进 Phase 2/3；参数和用量分阶段 | Provider 密钥、模型能力、健康度必须来自统一 runtime。 |
| 本地网关 | 网关状态、API Keys、模型映射、请求日志、OpenAI-compatible 端点、限流与权限 | 状态/API Keys/日志/端点进 Phase 2/3；限流权限只展示已有边界 | Gateway Key 与 Provider Key 分离。 |
| 知识库 | 知识库列表、文件导入、解析状态、分块与索引、检索测试、引用查看 | 文本/Markdown 基础进 Phase 4；PDF/OCR/Office 后置 | RAG 未完整处必须标注 `可用但基础` 或 `未接入`。 |
| Agent / 工具 / MCP | Agent 列表、工具注册、MCP Server、dry-run、执行记录、审批/沙箱 | Phase 4 | dry-run、fixture-only、外部 MCP 执行必须分层。 |
| 数据配置 | 导入、导出、备份、恢复、迁移预检、冲突处理 | Import/backup/restore/rollback 进 Phase 3/4 | 危险操作必须确认，不能预填确认短语。 |
| 观测与评测 | 日志、审计、用量、Trace、反馈、Evaluation | Phase 5；用量/请求日志可先接 Gateway | 日志类页面必须分页/过滤/脱敏。 |
| 设置与安全 | 基础设置、Secret 管理、本地数据路径、权限、隐私、桌面集成 | Phase 2 | 设置需要 dirty/saving/saved/error，安全项只展示真实权限模型。 |

### 6.2 第一阶段范围

Phase 1 只做：

- 新 AppShell。
- 新一级模块。
- 新二级导航规则。
- 新页面骨架。
- 清理旧导航入口。
- 建立状态/能力配置格式。

Phase 1 不做：

- 不改 Provider 调用链。
- 不改 Gateway 行为。
- 不改 Knowledge chunk/retrieval 逻辑。
- 不改 Agent execution 逻辑。
- 不改数据库 schema。

### 6.3 占位和后端依赖

| 页面/能力 | 首轮 UI 状态 | 等待真实能力 |
|---|---|---|
| Artifacts | 规划中，不进入首轮重做 | artifact 数据模型、生成文件存储、预览/导出契约 |
| 完整 RAG、向量检索、rerank、PDF/OCR/Office | 未接入或可用但基础 | parser 依赖、vector/rerank runtime、引用追踪 |
| 外部 MCP 工具真实执行 | dry-run / 需要审批 / 未接入 | MCP 协议执行、沙箱、权限、审计 |
| Workflow canvas | 规划中 | execution graph schema、节点运行时、回滚/暂停/恢复 |
| 完整 Evaluation 套件 | 后续阶段 | eval set 管理、数据集、评分器、批量运行 |
| CommandPalette | Phase 5 后置 | 页面 IA 稳定、命令权限、快捷键配置 |

## 7. 页面边界设计

### 7.1 工作台

| 页面 | 页面目标和任务 | 输入 | 输出 | 真实数据/契约 | 当前能力 | 不存在或待核实 | 状态设计 | 编辑/危险操作 | 验收 |
|---|---|---|---|---|---|---|---|---|---|
| 总览 | 看懂当前系统状态和下一步入口 | 无 | 系统摘要、主要告警、快捷入口 | `AppSnapshot.dashboard`、Provider/Model/Gateway/Knowledge/Observability 聚合 | 已有 Dashboard 聚合 | 需要进一步核实是否有真实待办聚合 | loading skeleton，错误可打开日志，空状态指向配置 | 不编辑 | 1 屏内看见默认模型、网关、Provider 健康、最近失败。 |
| 最近会话 | 找回和继续会话 | 搜索/筛选 | 会话列表、最近消息数 | `conversations`、`messages` | 已有会话和历史 | 会话分组/分页需要进一步核实 | 空状态可新建对话 | 可打开/收藏/置顶，删除后置 | 列表不混入消息编辑。 |
| 当前运行状态 | 查看 Provider/Gateway/Agent/Knowledge 是否可用 | 无 | 运行状态矩阵 | Provider health、Gateway status、execution runs、knowledge index | 多项已有 | 后台长任务队列能力需要进一步核实 | `已完成/需要配置/出错/dry-run` | 不编辑 | 每个模块有状态来源和更新时间。 |
| 待处理事项 | 汇总需要用户处理的配置/错误/审批 | 无 | 待处理列表 | failed request、pending approval、missing config | pending approval 和 failed logs 已有 | 缺少统一 todo aggregator | 空态写“暂无待处理”并给配置入口 | 可跳转，不直接危险操作 | 每条待办能跳到真实页面。 |
| 快捷入口 | 快速进入高频任务 | 无 | 新对话、Provider、Gateway Key、导入、日志 | nav config | 已有快捷入口 | CommandPalette 后置 | 无权限时 disabled + reason | 不执行危险操作 | 常用操作 1-2 层内到达。 |

### 7.2 对话

| 页面 | 页面目标和任务 | 输入 | 输出 | 真实数据/契约 | 当前能力 | 不存在或待核实 | 状态设计 | 编辑/危险操作 | 验收 |
|---|---|---|---|---|---|---|---|---|---|
| 单模型对话 | 与一个真实模型对话 | 消息、模型、上下文策略 | user/assistant message、request log、usage、citation | `sendMessage`、`retryMessage`、`regenerateMessage`、`cancelMessage` | 已有 | streaming UI 完整度需要进一步核实 | sending/streaming/failed/cancelled/completed | 可发送、重试、取消；无危险操作 | 无模型时显示需要配置，不发送假回答。 |
| 多模型对比 | 同一输入并行比较多个模型 | 消息、2-3 个模型 | branch responses、usage、errors | `compareModels` | 已有 fan-out | 分支级取消/重试需要进一步核实 | 每个模型独立状态 | 可执行，失败可查看详情 | 至少两个真实模型才启用。 |
| 会话历史 | 管理本地历史 | 搜索、筛选 | 会话表、导出 | `updateConversationFlags`、`exportConversation` | 已有置顶/收藏/导出 | 删除/归档需确认契约 | empty/loading/error | 可编辑标记；删除后置 | 不把导出成功写成备份成功。 |
| Prompt / 模板 | 管理提示词模板 | 模板内容、变量 | 模板列表/预览 | 需要进一步核实真实 Prompt 存储契约 | 当前仅有 prompt metadata/seed 线索 | 模板 CRUD 未确认 | `待核实/未接入` | 首轮不编辑 | 未确认前只做占位。 |
| Artifacts | 查看生成文件和预览 | 无 | artifact 列表/预览 | 无已确认契约 | 未实现 | artifact 数据模型缺失 | `规划中` | 不允许编辑 | 首轮不进入可用 UI。 |

### 7.3 模型与 Provider

| 页面 | 页面目标和任务 | 输入 | 输出 | 真实数据/契约 | 当前能力 | 不存在或待核实 | 状态设计 | 编辑/危险操作 | 验收 |
|---|---|---|---|---|---|---|---|---|---|
| Provider 管理 | 添加和查看 Provider | name/type/baseUrl/apiKey | Provider、secretRef、health | `createProvider`、`testProvider` | 已有 | Provider catalog 统一 preset 需补 | 需要配置/健康/错误/未测试 | 保存密钥需确认保存状态 | 不再内置假默认 Provider 文案。 |
| 模型管理 | 为 Provider 添加模型 | providerId、model name、capability | Model | `createModel` | 已有 | 自动发现模型需要进一步核实 | enabled/disabled/healthy/error | 可添加；删除后置 | 无 Provider 时禁用并给配置入口。 |
| 连接测试 | 真实测试 Provider | providerId | health record、error diagnosis | `testProvider` | 已有真实上游测试 | 批量测试需核实 | row loading/error/success | 不危险 | 成功必须有真实请求证据。 |
| 调用参数 | 管理温度、max tokens、tools 等 | 参数表单 | per-model/profile 参数 | 当前未发现持久化契约 | 未接入 | 需要后端参数模板 | `未接入/规划中` | 首轮只读 | 不显示可保存参数表单。 |
| 健康度 | 查看 Provider/Model 健康 | filter | health table | provider health、request logs | 基础已有 | 历史趋势需核实 | healthy/warning/error/unknown | 不编辑 | 健康来自真实测试或请求日志。 |
| 用量统计 | 查看模型用量 | 时间范围 | tokens/request/cost | observability usage records | 已有 usage records | 成本估算需核实 | loading/error/empty | 不编辑 | 无成本时不显示假金额。 |

### 7.4 本地网关

| 页面 | 页面目标和任务 | 输入 | 输出 | 真实数据/契约 | 当前能力 | 不存在或待核实 | 状态设计 | 编辑/危险操作 | 验收 |
|---|---|---|---|---|---|---|---|---|---|
| 网关状态 | 启停和查看端点 | 启停开关 | running/port/endpoints/error | `toggleGateway`、`GatewayStatus` | 已有 | 端口修改需核实 | running/stopped/error | 启停需按钮 loading | 状态必须来自 runtime。 |
| API Keys | 创建/轮换/禁用/撤销 Key | name/scopes/quota/rate | key preview/one-time secret | Gateway Key APIs | 已有 | Key 分组/项目需核实 | active/disabled/revoked/quota_exceeded | rotate/revoke 必须确认 | Secret 只显示一次。 |
| 模型映射 | Gateway model alias 到 Provider model | alias/rule | mapping/routing explanation | 需要进一步核实 | 当前 router 页只是模型模块内说明 | 缺少持久化映射契约 | `未接入` | 不编辑 | 未实现前只展示默认模型路由说明。 |
| 请求日志 | 查看 Gateway/request logs | filter | request table/detail | request logs/gateway logs | 已有 | 分页/虚拟化需补 | failed/completed/running | 可复制/打开日志 | 大列表不一次性渲染。 |
| OpenAI-compatible 端点 | 查看 curl 和端点状态 | 无 | endpoint docs | `GatewayStatus.endpoints`、gateway runtime | 已有 | Responses 仍 reserved | `可用/保留/未接入` | 不编辑 | `/v1/responses` 必须显示 reserved。 |
| 限流与权限 | 管理 scope/quota/rate | scope/quota/rate | policy | Gateway key scope/quota/rate | 基础已有 | 复杂 ACL 需核实 | active/blocked/quota/rate | 修改需确认影响 | 不显示未实现的企业权限。 |

### 7.5 知识库

| 页面 | 页面目标和任务 | 输入 | 输出 | 真实数据/契约 | 当前能力 | 不存在或待核实 | 状态设计 | 编辑/危险操作 | 验收 |
|---|---|---|---|---|---|---|---|---|---|
| 知识库列表 | 查看知识文件和索引健康 | filter | file list | knowledge files | 已有 | 多知识库集合需核实 | indexed/parsing/failed/deleted | 删除确认 | 不把文件列表叫完整知识库集合。 |
| 文件导入 | 导入文本/Markdown | name/content 或文件 | file/chunks | `createKnowledgeFile` | 文本内容导入已有 | 文件 picker、PDF/OCR/Office 未接入 | parsing/indexing/failed | 导入可取消需核实 | 未支持格式显示未接入。 |
| 解析状态 | 看 parse/index/embedding | fileId | stage table | file status fields | 已有 | 后台任务进度需核实 | queued/parsing/indexing/indexed/failed | retry/rebuild | 状态字段可追溯。 |
| 分块与索引 | 查看 chunks/token/hash | fileId | chunk table | knowledge chunks | 已有 lexical chunks | vector index/rerank 未接入 | embedded/stale/failed | rebuild 需 loading | 显示 lexical fallback。 |
| 检索测试 | 输入 query 看结果 | query/topK | retrieval trace/citations | `previewKnowledgeRetrieval` | 已有 lexical retrieval | hybrid/vector/rerank 未接入 | searching/empty/error | 不危险 | 结果显示 score/source/snippet。 |
| 引用查看 | 追溯聊天引用 | message/retrieval | citations | citations | 已有基础 citations | 引用详情页需设计 | empty/error | 不编辑 | 引用能回到源 chunk。 |

### 7.6 Agent / 工具 / MCP

| 页面 | 页面目标和任务 | 输入 | 输出 | 真实数据/契约 | 当前能力 | 不存在或待核实 | 状态设计 | 编辑/危险操作 | 验收 |
|---|---|---|---|---|---|---|---|---|---|
| Agent 列表 | 管理 Agent 定义 | name/goal | AgentDefinition | `createAgent` | 已有 | 完整 Agent 运行策略需核实 | planned/dry-run/disabled | 编辑/删除后置 | Agent 不显示为 autonomous complete。 |
| 工具注册 | 管理本地安全工具 | tool metadata | tool definition | execution runtime fixture | fixture 已有 | 自定义工具注册未确认 | fixture-only/未接入 | 需要审批 | 只暴露安全 fixture。 |
| MCP Server | 注册 MCP 和权限 | name/transport/url/command | McpServer | `createMcpServer`、permission | 已有 registry/permission | tool listing/execution 未接入 | discovered/granted/denied/error | 权限 grant/deny | grant 不代表可执行外部工具。 |
| dry-run | 预览 Agent 运行 | agentId | planned execution run | `previewAgentRun` | 已有 | 多步计划质量需核实 | dry-run/planned | 不执行真实外部操作 | 标注 dry-run。 |
| 执行记录 | 查看 runs/steps/trace | filter | execution table/detail | execution runs/steps/traces | 已有 fixture run | workflow canvas 未接入 | running/waiting_approval/completed/failed | approve/deny | 每步可看输入输出摘要。 |
| 审批 / 沙箱 | 审批危险操作 | approval decision | approved/denied run | `decideApproval` | 已有基础 approval | 完整 sandbox 未接入 | waiting/approved/denied | 危险操作必须确认 | 未接入外部 sandbox 不伪装。 |

### 7.7 数据配置

| 页面 | 页面目标和任务 | 输入 | 输出 | 真实数据/契约 | 当前能力 | 不存在或待核实 | 状态设计 | 编辑/危险操作 | 验收 |
|---|---|---|---|---|---|---|---|---|---|
| 导入 | 校验并导入配置 | manifest | preflight/result/conflicts | `validateImportManifest`、`applyImportPlan` | 已有 | GUI mapping 需设计 | ready/failed/applied | apply 必须确认 | 不导入明文 secret。 |
| 导出 | 导出诊断/数据包 | profile | export package | `exportDataPackage`、`exportDiagnostics` | 已有 | 下载保存路径需核实 | completed/failed | 不危险但需脱敏提示 | 默认 redacted。 |
| 备份 | 创建加密备份 | passphrase/profile | backup record | `createEncryptedBackup` | 已有 | passphrase 强度 UI 需补 | creating/completed/failed | 需要确认并不预填密码 | 不显示密码。 |
| 恢复 | 恢复预检 | backup/passphrase | restore preflight | `createRestorePreflight` | 已有 preflight | 真正恢复执行需核实 | ready/conflict/failed | 危险，必须确认 | 先预检后执行。 |
| 迁移预检 | 版本迁移检查 | target version | migration report | data runtime hints | 部分 schema migration 存在 | UI 契约需核实 | 待核实 | 不执行 | 未确认不做按钮。 |
| 冲突处理 | 解决导入冲突 | conflict strategy | conflict resolution | data conflicts | 有 conflict records | GUI 逐项处理需补 | unresolved/resolved | apply 危险 | 每条冲突有策略来源。 |

### 7.8 观测与评测

| 页面 | 页面目标和任务 | 输入 | 输出 | 真实数据/契约 | 当前能力 | 不存在或待核实 | 状态设计 | 编辑/危险操作 | 验收 |
|---|---|---|---|---|---|---|---|---|---|
| 日志 | 查看请求/系统/网关日志 | filter | logs table/detail | request/gateway/audit logs | 已有 | 分页/虚拟化需补 | loading/empty/error | 不编辑 | 日志脱敏，支持过滤。 |
| 审计 | 查看权限/安全事件 | search | audit table/integrity | audit logs/integrity | 已有 | 复杂 ACL 视图需核实 | verified/empty/broken | export/verify | 导出脱敏。 |
| 用量 | 查看 tokens/request/latency | date/model/provider | charts/table | observability summary | 已有 | 图表组件未规划 | empty/loading/error | 不编辑 | 无成本不显示成本。 |
| Trace | 查看 execution/retrieval trace | run/retrieval id | timeline | execution traces/retrieval traces | 部分已有 | 统一 trace 页面需补 | running/failed/completed | 不编辑 | 可以定位失败节点。 |
| 反馈 | 创建和查看反馈 | label/notes | feedback item | `createFeedback` | 已有 | 反馈关联 UI 需优化 | saved/error | 可编辑后置 | 关联最近 request 时要显示来源。 |
| Evaluation | 运行评测 | evalSetId | eval result | `runEvaluation` | 已有基础 eval | 批量评测/数据集管理需补 | queued/running/failed/completed | 可运行，需真实 Provider | browser mock 只作 smoke，不算生产。 |

### 7.9 设置与安全

| 页面 | 页面目标和任务 | 输入 | 输出 | 真实数据/契约 | 当前能力 | 不存在或待核实 | 状态设计 | 编辑/危险操作 | 验收 |
|---|---|---|---|---|---|---|---|---|---|
| 基础设置 | 管理主题、语言、密度、字体、动效 | preferences | saved preferences | `saveUiPreferences` | 已有 | per-setting dirty 状态需补 | dirty/saving/saved/error | 可编辑 | 保存成功必须持久化。 |
| Secret 管理 | 查看密钥存储状态 | 无 | secret refs/status | provider/gateway key metadata | 部分已有 | 独立 Secret 页面需设计 | saved/missing/error | rotate/revoke 危险 | 不显示明文 secret。 |
| 本地数据路径 | 显示 SQLite/userData/log path | 无 | real paths | 需要进一步核实 API | About 文案存在 | 缺少真实路径契约 | 待核实 | 可打开目录需权限 | 未接入前不写假路径。 |
| 权限 | 查看角色/ACL/permission | user/role | permission matrix | security runtime | 已有 | 用户切换 UI 需核实 | active/denied | ACL 修改危险 | 权限来自 main/Store。 |
| 隐私 | 管理日志保留/导出范围 | privacy fields | saved privacy | observability privacy | 已有 | 清理策略执行需核实 | dirty/saved/error | 可编辑 | 默认不导出 prompt/path。 |
| 桌面集成 | 显示打包、快捷方式、日志入口 | 无 | desktop status | desktopEntry scripts | package/shortcut 已有 | UI API 需核实 | installed/missing/error | 修复快捷方式后置 | 不写固定路径，使用 runtime。 |

## 8. 组件体系规划

| 组件 | 职责 | 展示/操作 | 数据来源 | 禁止事项 |
|---|---|---|---|---|
| `AppShell` | 应用整体布局、顶栏、主区域、全局反馈挂载点 | 可触发导航和全局命令 | nav config、ui preferences、snapshot summary | 不承载模块业务逻辑。 |
| `Sidebar` | 一级模块和少量高频二级入口 | 可触发导航 | nav config + capability status | 不重复渲染完整页面 tabs。 |
| `SecondaryNav` | 当前模块二级页面切换 | 可触发导航 | active module tabs | 不显示未来能力为可用。 |
| `ModuleHeader` | 模块名称、说明、模块级状态 | 展示 | module metadata + capability aggregation | 不写业务操作按钮堆。 |
| `PageHeader` | 页面标题、说明、主操作、状态 | 展示 + 1 个主操作 | page config + page state | 不放多个无关操作。 |
| `StatusBadge` | 运行状态：running/error/healthy/disabled 等 | 展示 | runtime status | 不表达能力成熟度。 |
| `CapabilityBadge` | 能力成熟度：已完成/基础/dry-run/未接入等 | 展示 | capability registry | 不表达实时运行状态。 |
| `EmptyState` | 空状态和下一步 | 可选操作 | page-provided copy/actions | 不使用全局泛化空文案。 |
| `ErrorState` | 错误、恢复动作、日志入口 | 可触发复制/重试/打开日志 | API error + diagnosis registry | 不吞掉错误详情。 |
| `LoadingState` | skeleton 或局部 loading | 展示 | page async state | 不用全屏 spinner 代替局部反馈。 |
| `MetricCard` | 单一指标 | 展示 | summary data | 不做 hero-metric 模板，不放装饰大数字。 |
| `DataTable` | 表格结构、排序/分页/空态插槽 | 可触发行内操作插槽 | rows/columns from page | 不内置业务空态，不一次性渲染海量日志。 |
| `DetailPanel` | 详情侧栏/下钻 | 可选操作 | selected entity | 不作为页面主容器嵌套卡片。 |
| `SettingsSection` | 设置分组、dirty/saving/saved/error | 可保存 | preferences API | 不把多个模块设置混在一起。 |
| `FormField` | label/help/error/required | 输入 | form state + validation schema | 不无 label。 |
| `ConfirmDialog` | 危险确认 | 操作 | action metadata | 不用于普通确认和首次解释。 |
| `Toast / Notification` | 全局短反馈 | 展示，可撤销时操作 | action result | 不替代页面内错误。 |
| `CommandPalette` | 快速跳转/命令 | 操作，Phase 5 后置 | command registry + permissions | 不在 Phase 1 作为 IA 替代品。 |
| `ActivityLog` | 最近活动/日志列表 | 展示/过滤 | observability logs | 不暴露敏感内容。 |
| `RunStatusTimeline` | 执行步骤和 trace | 展示/审批操作 | execution traces | 不显示未运行节点为完成。 |
| `ProviderStatusCard` | Provider 健康、密钥状态、最近错误 | 可测试连接 | provider runtime | 不显示明文 API key。 |
| `GatewayStatusCard` | 网关状态、端点、Key 摘要 | 可启停 | gateway runtime | 不混入 Provider secret。 |
| `KnowledgeFileCard` | 文件 parse/index/retrieval 状态 | retry/rebuild/delete | knowledge runtime | delete 必须确认。 |
| `AgentRunCard` | Agent/run 摘要 | dry-run/approval/detail | execution runtime | 不表示外部 MCP 已可执行。 |

样式规范：

- token 来源：`src/shared/theme.ts` + CSS custom properties。
- 字体：系统 UI 字体；代码/日志使用 monospace。
- 图标：继续使用 `lucide-react`，icon-only 按钮必须有 `aria-label`。
- 间距：4/8/12/16/20/24/32 阶梯；密集工具面板可用 compact density。
- 禁止继续新增多个功能相似 Card/Badge/Nav 组件。

## 9. 设计系统与交互规范

### 9.1 颜色策略

- 默认 restrained product palette：中性背景、边框、文本层级 + 一种主强调色 + 语义状态色。
- 强调色只用于主操作、选中态、focus 和关键状态。
- 后续可把 HEX token 迁移到 OKLCH，但不得在页面局部直接写颜色。
- 状态色必须有文字/图标配合，不能只靠颜色。

### 9.2 亮色 / 暗色策略

- 当前已有 light/dark/system runtime。
- 新 UI 必须保持 `system` 跟随系统，不新增第三套局部主题。
- 若某组件只在一种主题验证，必须标注缺口并补截图验收。

### 9.3 字体层级

- 使用固定 rem/px 层级，不使用 viewport 字号。
- 页面标题、模块标题、表格标题、字段 label 分级清楚。
- 表格和状态文字保持紧凑但不低于可读阈值。

### 9.4 间距、圆角、阴影

- 默认 8px 及以下圆角，遵循现有 `--radius-sm` / `--radius-md`。
- 阴影不作为主要层级工具；优先边框、背景层、间距。
- 禁止卡片套卡片；页面区块使用全宽布局或明确工具区域。

### 9.5 表格规范

- 日志/审计/请求表必须支持分页或虚拟化规划。
- 表头固定术语，行操作放末列。
- 错误、Key、路径、Prompt 等敏感列默认截断/脱敏。
- 空表由页面提供专属 EmptyState。

### 9.6 表单规范

- 每个输入都有 label、说明、错误、必填状态。
- 保存按钮显示 dirty/saving/saved/error。
- Provider/API Key/backup passphrase 不得预填真实或危险示例。
- 危险操作必须二次确认。

### 9.7 Modal / Drawer / Panel

- Modal 只用于危险确认、阻塞式选择、必须聚焦的短任务。
- Drawer/DetailPanel 用于实体详情。
- 普通编辑优先 inline 或独立页面，不把复杂表单塞进 modal。

### 9.8 Toast、Loading、键盘和动效

- Toast 只用于短反馈，不承载详细错误。
- Loading 默认 skeleton 或行级 loading；全屏 loading 只用于初次快照。
- 键盘：Tab 顺序与视觉顺序一致，Phase 5 再做 CommandPalette。
- 动效：150-250ms，transform/opacity，不动画 layout，不掩盖错误和加载。

### 9.9 性能原则

- 页面切换不能明显卡顿。
- 大列表必须分页或虚拟化规划。
- 日志类页面不能一次性渲染过多数据。
- UI 状态更新不能导致全局重渲染；后续考虑模块级数据选择或局部刷新。

## 10. 防幻觉 UI 规则

1. 未真实接通的能力只能显示为 `未接入`、`规划中`、`dry-run`、`需要配置`、`只读预览`、`待核实`。
2. 不允许按钮存在但点击无反馈。
3. 不允许“保存成功”但没有持久化。
4. 不允许“连接成功”但没有真实请求。
5. 不允许“运行完成”但只是模拟结果，除非明确显示 `dry-run` 或 `browser smoke mock`。
6. 不允许把未来能力写成当前能力。
7. 不允许用假数据伪装生产数据。
8. Demo/mock 数据必须明确标注。
9. 所有 Provider、模型、Key、网关状态必须来自统一数据源。
10. 所有 UI 页面必须能追溯到真实 Store / IPC / API 契约。
11. 不确定的能力必须写 `待核实`，不能写 `已支持`。
12. `browser mock` 只能作为测试路径，不能作为生产能力证据。
13. `/v1/responses` 等 reserved endpoint 必须显示保留状态，不能放入可用端点列表。
14. 危险确认短语不得预填。
15. 页面主操作必须和页面目标一致。

## 11. 阶段拆分

### Phase 0：审计与计划

| 项 | 内容 |
|---|---|
| 目标 | 完成本文件、真实代码审计、外部案例学习、阶段验收标准。 |
| 修改范围 | `docs/build-plans/00-modular-refactor-master-plan/ui-full-redesign-plan.md`、`PROJECT_PROGRESS.md`。 |
| 禁止修改范围 | 全部源码、路由、IPC、Store、数据库、样式代码、测试代码。 |
| 输入文件 | `src/shared/navigation.ts`、`src/renderer/App.tsx`、`src/renderer/AppShell.tsx`、`src/renderer/modules/*`、`src/shared/api.ts`、`src/shared/ipc.ts`、`src/main/ipc.ts`、`src/main/services/store.ts`、docs。 |
| 输出文件 | 本计划和项目进度记录。 |
| 风险 | 文档过大但执行边界不清；通过阶段表和验收清单收敛。 |
| 回滚方式 | revert 本轮 docs commit。 |
| 测试命令 | 不运行 build/test；本轮只改文档。 |
| 验收标准 | 文档覆盖审计、学习对象、IA、页面边界、组件、设计系统、防幻觉、阶段、验收。 |
| 截图/smoke | 不需要。 |
| 更新 `PROJECT_PROGRESS.md` | 需要。 |
| commit/push | 需要。 |

### Phase 1：AppShell / 导航 / 路由重做

| 项 | 内容 |
|---|---|
| 目标 | 建立新 Shell、一级/二级导航、页面骨架、能力状态配置，不动业务逻辑。 |
| 修改范围 | `src/shared/navigation.ts`、Shell 组件、页面 registry、少量 CSS token/layout。 |
| 禁止修改范围 | Store、IPC 行为、Provider/Gateway/Knowledge/Execution runtime。 |
| 输入文件 | 当前 Shell、navigation、module registry、i18n、theme。 |
| 输出文件 | 新 AppShell/Sidebar/SecondaryNav/ModuleHeader/PageHeader/CapabilityBadge。 |
| 涉及模块 | 全部模块的导航和骨架。 |
| 风险 | 新旧导航双入口、route leakage、横向 overflow。 |
| 回滚方式 | revert Phase 1 commit，保留旧 Shell。 |
| 测试命令 | `npm.cmd run build`、`npm.cmd run test`、`npm.cmd run test:ui-smoke`、`npm.cmd run test:electron-smoke`。若命令不存在，记录命令不存在。 |
| 验收标准 | 无旧入口残留；一级/二级清楚；无横向滚动；无真实路由泄露；未知 route 能恢复。 |
| 截图/smoke | 需要 desktop/mobile-like 视口截图和 UI smoke。 |
| 更新 `PROJECT_PROGRESS.md` | 需要。 |
| commit/push | 需要。 |

### Phase 2：核心状态页重做

| 项 | 内容 |
|---|---|
| 目标 | 用户能看懂系统当前状态：工作台总览、模型与 Provider、本地网关、设置与安全。 |
| 修改范围 | Dashboard、Models、Gateway overview、Settings security/preferences、StatusCard 组件。 |
| 禁止修改范围 | 不改变 Provider/Gateway 实际调用语义。 |
| 输入文件 | `AppSnapshot`、Provider/Gateway/Security/Observability runtime。 |
| 输出文件 | 核心状态页面和状态组件。 |
| 风险 | 把未配置状态写成可用；状态来源不清。 |
| 回滚方式 | revert Phase 2 commit。 |
| 测试命令 | `npm.cmd run build`、`npm.cmd run test`、`npm.cmd run test:ui-smoke`、`npm.cmd run test:electron-smoke`。 |
| 验收标准 | Provider/Gateway/Secret/Permission 状态可见且可追溯。 |
| 截图/smoke | 需要。 |
| 更新 `PROJECT_PROGRESS.md` | 需要。 |
| commit/push | 需要。 |

### Phase 3：核心工作流页重做

| 项 | 内容 |
|---|---|
| 目标 | 重做对话、API Key、模型映射、请求日志、Provider 连接测试、数据配置预检。 |
| 修改范围 | Chat、Gateway Keys/Logs、Models test、Data import/preflight、ConfirmDialog、Toast。 |
| 禁止修改范围 | 不引入未实现的 workflow canvas、完整 RAG、外部 MCP 执行。 |
| 输入文件 | AppApi chat/gateway/data/provider contracts。 |
| 输出文件 | 核心可操作页面。 |
| 风险 | 危险操作无确认；成功状态与持久化不一致。 |
| 回滚方式 | revert Phase 3 commit。 |
| 测试命令 | `npm.cmd run build`、`npm.cmd run test`、`npm.cmd run test:ui-smoke`、`npm.cmd run test:electron-smoke`、必要时 `npm.cmd run verify:release`。 |
| 验收标准 | 无无反馈按钮；危险操作确认；失败可恢复；日志可追踪。 |
| 截图/smoke | 需要。 |
| 更新 `PROJECT_PROGRESS.md` | 需要。 |
| commit/push | 需要。 |

### Phase 4：知识库 / Agent / MCP 页面重做

| 项 | 内容 |
|---|---|
| 目标 | 只展示真实知识库和执行能力，dry-run 与真实执行分离。 |
| 修改范围 | Knowledge、Tools/MCP/Agent、RunStatusTimeline、KnowledgeFileCard、AgentRunCard。 |
| 禁止修改范围 | 不伪装 PDF/OCR/vector RAG、任意 MCP 工具执行、Workflow canvas 已完成。 |
| 输入文件 | knowledgeRuntime、executionRuntime、securityRuntime、AppApi。 |
| 输出文件 | 知识库和执行页。 |
| 风险 | 用户把 lexical fallback 当完整 RAG，把 fixture run 当真实工具执行。 |
| 回滚方式 | revert Phase 4 commit。 |
| 测试命令 | `npm.cmd run build`、`npm.cmd run test`、`npm.cmd run test:ui-smoke`、`npm.cmd run test:electron-smoke`。 |
| 验收标准 | 每个能力有真实状态；未接入能力无假按钮；审批和 trace 清晰。 |
| 截图/smoke | 需要。 |
| 更新 `PROJECT_PROGRESS.md` | 需要。 |
| commit/push | 需要。 |

### Phase 5：观测、评测、细节体验

| 项 | 内容 |
|---|---|
| 目标 | 完成日志、审计、Trace、用量、反馈、Evaluation、性能、快捷键、CommandPalette。 |
| 修改范围 | Observability pages、ActivityLog、Trace timeline、CommandPalette、performance tests。 |
| 禁止修改范围 | 不引入外部 SaaS 假设；不把 command palette 当导航替代品。 |
| 输入文件 | observabilityRuntime、audit/security、execution traces、gateway logs。 |
| 输出文件 | 观测和快捷操作体验。 |
| 风险 | 大日志渲染卡顿；敏感数据泄露；快捷命令权限不足。 |
| 回滚方式 | revert Phase 5 commit。 |
| 测试命令 | `npm.cmd run build`、`npm.cmd run test`、`npm.cmd run test:ui-smoke`、`npm.cmd run test:electron-smoke`、`npm.cmd run verify:release`。 |
| 验收标准 | 日志分页/脱敏；Trace 可定位失败；CommandPalette 受权限控制且有反馈。 |
| 截图/smoke | 需要。 |
| 更新 `PROJECT_PROGRESS.md` | 需要。 |
| commit/push | 需要。 |

## 12. 验收标准

### 12.1 功能验收

- 一级模块和二级导航结构清楚。
- 每个页面目标明确。
- 真实能力和未实现能力区分明确。
- 不出现无反馈按钮。
- 不出现假成功状态。
- 不出现旧入口残留。
- 不出现重复导航。
- 不出现重复页面实现。
- 不出现硬编码路径。
- 不出现硬编码 Provider / Model / Key 状态。
- 不破坏现有 IPC / Store 契约。
- 不破坏已有数据。

### 12.2 UI 验收

- 页面密度下降，信息层级清楚。
- 常用操作可在 1 到 2 层内到达。
- 每个模块有清楚标题、说明、状态和主操作。
- 表格、卡片、表单、空状态风格一致。
- loading、error、empty、disabled 状态完整。
- 动效低干扰。
- 页面切换不明显卡顿。
- 不靠花哨视觉掩盖功能不足。
- 无 route leakage、无横向 overflow。

### 12.3 代码验收

- 无 TypeScript 编译错误。
- 无 lint / test 失败；若命令不存在必须记录。
- 不新增重复组件。
- 不保留旧 UI 双链路。
- 不引入与项目风格冲突的大型 UI 框架，除非另有文档论证。
- 不新增项目外目录。
- 样式 token 可维护。
- 组件职责清楚。
- 数据契约统一。

### 12.4 测试验收

每个真正改代码的后续阶段必须运行：

```powershell
npm.cmd run build
npm.cmd run test
```

必要时运行：

```powershell
npm.cmd run test:ui
npm.cmd run test:electron
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
npm.cmd run smoke
npm.cmd run lint
```

当前 `package.json` 已确认存在 `build`、`test`、`test:ui-smoke`、`test:electron-smoke`、`verify`、`verify:release`；未发现 `test:ui`、`test:electron`、`smoke`、`lint` 脚本。后续阶段如果仍不存在，必须记录 `命令不存在`，不能假装成功。

## 13. 风险清单

| 风险 | 触发点 | 预防措施 |
|---|---|---|
| UI 幻觉 | 先画页面，后端未接 | capability registry 和防幻觉规则先行。 |
| 双重入口 | 新旧 Shell 共存 | Phase 1 必须删除旧入口，不保留备用 UI。 |
| 状态漂移 | UI 自己维护状态词 | 状态统一来自 shared runtime/i18n/config。 |
| 大文件继续膨胀 | 单模块页继续承载所有 tabs | 页面 registry 拆分到页面级文件。 |
| 性能下降 | 日志/审计/trace 一次渲染 | 分页、虚拟化、筛选。 |
| 安全误导 | Secret、Key、权限在 UI 里展示不清 | Secret 不明文，Key 只一次显示，权限来自 main/Store。 |
| 设计过度 | 花哨动画/玻璃/大面积渐变 | 采用 product UI restrained 策略。 |
| 测试覆盖不足 | 只跑 build/test 不看 UI | 每阶段需要 UI smoke 和截图。 |

## 14. 后续 Codex 执行建议

1. Phase 1 前先创建独立分支或确认当前分支状态，避免混入外部源码改动。
2. 先写 `capability registry` 和导航配置，不先改页面视觉。
3. 每次只迁移一个模块的页面骨架，保持测试可运行。
4. 新组件必须替换旧组件，而不是并存。
5. 对每个页面建立 `目标 -> 数据契约 -> 状态 -> 操作 -> 验收` 小清单。
6. 每个阶段完成后更新 `PROJECT_PROGRESS.md`，并提交/推送。
7. 若遇到 dirty 源码文件，先识别是否属于本阶段，不属于就不 stage。

## 15. 本轮未做事项

- 未修改 UI 源码。
- 未修改业务逻辑。
- 未修改路由。
- 未修改 IPC。
- 未修改 Store。
- 未运行 build/test，因为本轮只新增/修改规划文档。
- 未验证外部产品实际 UI 截图，仅参考官方/项目文档和 README。
- 未创建 `PRODUCT.md` / `DESIGN.md`，因为本轮输出范围限定为指定计划文件和 `PROJECT_PROGRESS.md`。
