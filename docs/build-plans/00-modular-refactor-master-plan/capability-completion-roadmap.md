# NexaChat 未完成功能补全路线图

## 当前结论摘要

NexaChat 当前已经是一个可用的基础版本：产品入口是 Chat，根路由 `/` 解析到 `/chat/conversations`，顶层模块保持为 Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings。Gateway 是独立核心模块，Tools / Agent / MCP 仍处于实验阶段。

当前版本的核心价值已经成立，但若要成为更完整的本地优先、多模型桌面 AI 工作台，仍有多项高级能力处于未完成或受限状态。这些能力可以继续补齐，但不能一次性大改交付；必须按风险、数据安全、接口稳定性和用户可验证性分阶段推进。

本路线图描述未来如何安全补齐能力，不表示这些未来能力已经在当前版本完成。

## 当前未完成 / 受限功能总表

| 功能方向 | 当前状态 | 未完成原因 | 完成难度 | 建议优先级 |
|---|---|---|---|---|
| Gateway `/v1/responses` | 当前为 reserved endpoint，返回 501 | 尚未建立 Responses 请求/响应模型、兼容边界和审计记录 | 中 | P1 |
| Chat true streaming UI | Gateway 已有部分 SSE 能力，但 Chat UI 仍需真流式体验收敛 | IPC 与 renderer 局部更新链路未完全打通 | 中 | P1 |
| IPC progress / partial update | 已有 IPC 基础和 payload validation，但进度/局部更新不完整 | 缺少统一 progress event、取消、错误和最终态契约 | 中 | P1 |
| Anthropic native provider | OpenAI-compatible 路径为主 | 原生消息格式、错误、streaming、model list 和 key 验证未适配 | 中 | P1 |
| Gemini native provider | OpenAI-compatible 路径为主 | 原生 generateContent、streaming、模型列表和安全错误未适配 | 中 | P1 |
| Other non-OpenAI-compatible providers | 尚未形成通用多协议注册体系 | 缺少 adapter registry、能力声明和统一错误映射 | 中高 | P2 |
| PDF import | 当前 Knowledge Base 主要支持 text-like 导入 | PDF 解析、页码、元数据、进度和失败恢复未实现 | 中 | P2 |
| Office import | 当前未作为生产能力声明 | docx/xlsx/pptx 等格式解析链路、依赖和安全边界未确定 | 中高 | P2 |
| OCR | 当前未作为生产能力声明 | 需要图像预处理、语言包、耗时任务和权限策略 | 高 | P3 |
| Real embedding provider | Gateway `/v1/embeddings` 存在基础接口，但 Knowledge 仍以 lexical retrieval 为主 | 缺少可配置 embedding provider、批处理、缓存和失败降级 | 中 | P2 |
| Vector retrieval / vector DB | 当前不是 vector DB RAG | 缺少向量存储选择、索引生命周期、删除一致性和迁移策略 | 高 | P2 |
| RAG rerank | 当前 citation 基于基础检索结果 | 缺少 rerank provider、阈值、成本控制和可解释日志 | 中 | P3 |
| Citation score / source confidence | 当前 citations 不应被描述为带完整可信度评分 | 缺少 score 计算、展示规则和测试语料 | 中 | P3 |
| Real MCP execution | 当前 Tools / Agent / MCP 是 registration、权限、dry-run、fixture execution、approval、trace/logging | 尚未接入真实 MCP client runtime 和工具调用闭环 | 高 | P4 |
| File system / command execution tools | 当前不应作为任意执行平台 | 高风险能力需要 default deny、审批、审计和沙箱 | 高 | P4 |
| Agent sandbox | 当前 Agent 是定义、预览和实验链路 | 缺少隔离执行、资源限制、权限模型和失败恢复 | 高 | P4 |
| Autonomous background tasks | 当前未作为完整自动后台执行能力 | 缺少任务队列、取消、重试、权限继承和用户可见状态 | 高 | P4 |
| Workflow runtime | 当前没有完整 workflow engine | 需要节点模型、状态机、持久化和错误恢复 | 高 | P4 |
| Pause / resume runtime | 当前未形成通用运行时暂停恢复 | 需要可序列化执行状态和幂等继续策略 | 高 | P4 |
| Full database restore | 当前 Data 有 restore preflight 和有限 rollback records | 缺少全库替换、锁定、重启、安全备份和失败回滚闭环 | 高 | P3 |
| Destructive restore protection | 当前已有数据安全基础，但不能称为完整保护 | 需要 destructive action 二次确认、影响预览和自动备份 | 中高 | P3 |
| Full database rollback | 当前是有限 rollback records | 缺少完整快照、manifest、schema validation 和事务级恢复 | 高 | P3 |
| General cleanup | 当前已有 diagnostics 和部分数据管理 | 缺少 dry-run、orphan detection、影响预览和 vacuum/analyze 策略 | 中 | P3 |
| Electron `sandbox: true` | 当前 `sandbox: false`，已有补偿控制 | preload、Electron smoke、打包、协议加载和文件路径能力未完成兼容验证 | 高 | P4 |
| Preload sandbox compatibility | 当前 preload 通过 allowlist IPC 暴露能力 | sandbox 后 Electron/Node API 可用性变化需要逐项审计 | 高 | P4 |
| ServiceContext narrowing | `ServiceContext` 仍偏宽 | 共享 helper、仓储访问和 facade 历史压力仍存在 | 中 | P5 |
| Renderer full snapshot refresh reduction | 仍有部分 action 依赖 full snapshot refresh | 高频路径需要局部 patch 或事件驱动更新 | 中 | P5 |
| Pagination / virtualization | 已有部分分页/list limits，但大列表仍需深化 | 长日志、知识库文件、chunk、Gateway/audit 记录可能增长 | 中 | P5 |
| Reduced motion global enforcement | Settings 有减少动效偏好，但全局执行需持续验证 | 动画、transition 和 smoke 覆盖需统一约束 | 低中 | P5 |
| `node:sqlite` release risk | Node 24 下仍有 experimental warning | 上游 API 稳定性和打包环境风险需要持续跟踪 | 中 | P3 |

## 总体目标

最终目标是让 NexaChat 成为本地优先、聊天优先、多模型桌面 AI 工作台，具备可靠的 Chat、Provider、Gateway、Knowledge Base/RAG、Data safety、Electron security、Agent/MCP、observability 和可维护架构。

目标状态不是恢复旧的 Workspace/Dashboard-first 产品形态，也不是把实验功能包装成已完成能力。后续所有实现都必须围绕当前 Chat-first 产品事实、7 个顶层模块和真实能力边界推进。

## 权限受限时的强制处理规则

后续执行本路线图时，不能因为权限不足、工具权限缺失、文件访问受限、网络访问失败、依赖安装受限、浏览器自动化受限、Electron 启动权限、Git/GitHub 权限、API Key 权限、系统安全限制等问题，就跳过对应功能。

遇到权限问题时，必须暂停该受阻步骤，明确说明：

1. 哪个功能被权限问题阻塞；
2. 具体缺少什么权限或访问能力；
3. 已经完成了哪些安全检查；
4. 需要用户授予什么权限、执行什么手动操作、或提供什么配置；
5. 在获得权限后应从哪个步骤继续。

不能把受阻功能改成假实现。不能把受阻功能标记为完成。不能静默降级需求。可以继续处理与该权限无关的独立安全任务，但必须保留阻塞项，并在最终汇报中显著列出。

如果需要用户授权，例如安装依赖、访问网络、调用 GitHub、启动 Electron、访问本地文件、读取系统目录、使用浏览器自动化、调用外部 API，应明确向用户询问，而不是自行跳过。

## 阶段 0：基线冻结与风险隔离

### Goal

建立可信基线，确认当前仓库、分支、测试状态、产品事实和能力边界，避免未来实现任务在不清楚当前状态的情况下扩大修改范围。

### Scope

- 确认 git baseline：`git rev-parse --show-toplevel`、`git status --short`、`git branch --show-current`、`git rev-parse HEAD`。
- 确认 functional baseline：Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings 当前可用能力和已知边界。
- 确认 typecheck/test/build baseline。
- UI 或 Electron 行为变化时，执行 UI/Electron smoke。
- 确认实现和文档中没有硬编码 `D:/NexaChat` 路径；路径必须从运行时、配置或 Git 根目录解析。

### Required checks

- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`
- 涉及 UI 时运行 `npm.cmd run test:ui-smoke`
- 涉及 Electron preload、窗口、安全、打包入口时运行 `npm.cmd run test:electron-smoke`
- 涉及质量门时运行 `npm.cmd run scan:quality`

### Files/modules to inspect

- `README.md`
- `PROJECT_PROGRESS.md`
- `docs/architecture/current-architecture.md`
- `docs/design/ui-product-boundary.md`
- `docs/testing/validation-checklist.md`
- `src/shared/navigation.ts`
- `src/shared/ipc.ts`
- `src/main/services/serviceRegistry.ts`
- `src/main/services/serviceContext.ts`
- `src/main/services/localGateway.ts`
- `src/preload/index.ts`
- `src/renderer/components/AppFrame.tsx`

### Acceptance criteria

- 当前工作区状态被记录，且没有覆盖无关用户改动。
- 当前产品事实仍为 chat-first、7 个顶层模块、`/ -> /chat/conversations`。
- 未来实现任务的 baseline 命令有明确结果。
- 未把 reserved、experimental 或 limited 能力写成已完成能力。
- 没有引入硬编码本机绝对路径。

### Risks

- 基线不清会导致重复实现或误删仍在使用的兼容层。
- 只跑单元测试而不跑 UI/Electron smoke，可能漏掉 preload、路由和打包入口问题。
- 历史文档中的 Workspace/Dashboard-first 描述可能误导后续实现。

## 阶段 1：核心聊天体验与 Gateway 补齐

### Chat 真流式 UI

#### Current problem

Chat 当前是可用基础体验，但 UI 需要进一步形成真实的 token/partial message streaming，而不是等待完整响应后一次性刷新。

#### Target behavior

- 用户发送消息后，assistant 消息逐步显示 partial content。
- 支持取消、失败、重试和重新生成时的清晰状态。
- streaming 结束后写入最终消息、usage、request log 和可追踪状态。

#### Implementation boundary

- 只改 Chat streaming 所需的 service、IPC、renderer 局部状态和测试。
- 不在本阶段引入 Agent、tool calling 或 workflow runtime。
- 不把 provider 不支持 streaming 的场景伪装为真实 streaming；可以显示兼容路径和明确状态。

#### Must not break

- 现有本地会话、消息历史、模型选择、上下文策略、重试、重新生成、取消、导出和多模型对比。
- Chat-first 路由和导航。
- Provider secret redaction。

#### Acceptance criteria

- 支持至少一个真实 streaming provider 路径的 partial display。
- 非 streaming provider 有明确 fallback，不产生空流。
- 取消后不会继续写入错误的最终消息。
- Chat UI smoke 覆盖发送、partial update、取消和最终态。

### IPC progress / partial update

#### Current problem

IPC 已有 channel allowlist 和 payload validation，但长任务 progress、partial update、取消和错误传播还没有统一契约。

#### Target behavior

- 建立 progress/partial event 的统一 DTO。
- 支持 Chat、Knowledge import、Data restore、Agent/MCP 等后续长任务复用。
- 每个任务有 `requestId` 或 `jobId`，可追踪、可取消、可记录最终态。

#### Implementation boundary

- 先服务 Chat streaming 和 Gateway basic responses。
- 不一次性改造所有 IPC channel。
- 事件 payload 必须通过 shared type 和 runtime validation。

#### Must not break

- 现有 preload allowlist。
- 现有 IPC payload validation。
- renderer 不能访问 raw `ipcRenderer`。

#### Acceptance criteria

- IPC contract tests 覆盖合法和非法 progress payload。
- renderer 可以收到局部更新并只刷新相关状态。
- 错误、取消、完成态有一致事件。

### Gateway `/v1/responses` 基础版

#### Current problem

当前 `/v1/responses` 是 reserved endpoint，返回 501，不能描述为已实现。

#### Target behavior

- 第一版支持基本 text input。
- 将基础 text input 映射到内部 chat completion 能力。
- 返回清晰、稳定、可审计的响应结构。
- 明确标注为 basic version，不宣称完整 OpenAI Responses API 兼容。

#### Implementation boundary

- 第一版只覆盖基本文本输入和普通文本输出。
- Tools/function calling、multimodal input、background mode、advanced reasoning fields、复杂 response item、parallel tool calls 等能力标记为 future 或 limited。
- 不破坏现有 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`。

#### Must not break

- Gateway auth、scope、quota、rate limit、audit log。
- OpenAI-compatible chat completions 行为。
- 现有 reserved/experimental 文案必须同步更新为真实 basic 边界。

#### Acceptance criteria

- `/v1/responses` basic text request 返回 200 和可解析文本输出。
- 不支持字段返回清晰错误或 ignored/limited 说明，不静默假装支持。
- Gateway tests 覆盖 auth、basic success、unsupported fields、audit log。
- 文档和 UI 明确写明 basic version，不写完整兼容。

## 阶段 2：Provider 多协议适配

### Provider adapter registry

建立 Provider adapter registry，统一描述每个 provider 的协议类型、认证方式、模型列表能力、streaming 能力、embedding 能力、tool calling 能力和错误映射策略。registry 应避免在业务层散落 provider-specific 判断。

### OpenAI-compatible path preservation

保留当前 OpenAI-compatible provider 路径，保证现有 provider、Gateway 和测试不回退。新 registry 必须兼容既有配置和迁移逻辑，不能要求用户重新创建已有 provider。

### Anthropic native adapter first version

第一版 Anthropic native adapter 应覆盖文本 chat、基础 streaming、model list 或文档化的 model list fallback、API key 验证和错误映射。不要在第一版宣称完整 tool use、vision 或高级 reasoning 能力。

### Gemini native adapter first version

第一版 Gemini native adapter 应覆盖基础文本 generateContent、基础 streaming、模型列表或 fallback、API key 验证、安全过滤错误映射和清晰的 provider capability flags。不要把多模态或函数调用写成已完成，除非后续真实实现并验证。

### Unified error mapping

Provider 错误应统一映射为用户可理解的类别，例如 authentication、rate_limit、quota、model_not_found、network、timeout、provider_rejected、invalid_request 和 unknown。日志中不得泄露 API Key 或原始 secret。

### Health check and model list strategy

每个 provider 需要明确 health check 策略：优先轻量模型列表或 provider 官方健康路径；如果 provider 不支持模型列表，应提供文档化 fallback 和用户可编辑模型配置。

### Acceptance criteria

- OpenAI-compatible provider 现有测试通过。
- Anthropic native 和 Gemini native 至少完成 text chat、基础 streaming 或明确 fallback、health check、错误映射。
- UI 能显示 provider capability，不夸大未实现能力。
- Gateway 选择模型时能通过统一 provider adapter 调用。

## 阶段 3：Knowledge Base / RAG 升级

### File parsing: PDF / Office / OCR

PDF、Office、OCR 必须分阶段完成。第一步应优先实现 PDF 和 Office 的安全文本提取、文件元数据、页码或段落定位、导入进度和失败恢复。OCR 应作为后续较高风险能力，单独处理语言包、性能、隐私和权限。

### Real embedding provider

引入真实 embedding provider 时，应复用 Provider registry 的认证、能力声明、错误映射和 redaction。embedding 应支持批处理、重试、速率限制、缓存和模型维度记录。

### Vector retrieval / vector DB

向量检索应先定义清晰 contract：document、chunk、embedding、metadata、deletion consistency 和 rebuild strategy。不要在没有充分理由时引入重型 vector DB；第一条生产安全路线应优先考虑本地、可迁移、可备份、易删除一致的方案。

### Rerank

Rerank 应作为检索质量增强层，而不是替代基础检索。需要明确 provider、本地模型或规则 rerank 的成本、延迟、失败 fallback 和日志字段。

### Citation score and source confidence

Citation score 和 source confidence 应基于检索分数、rerank 分数、chunk metadata、文档新旧、匹配类型和阈值。UI 只能展示可解释的信号，不能把模型猜测包装成事实可信度。

### Fallback to lexical retrieval

当前 lexical retrieval 必须保留为 fallback。embedding provider 不可用、向量索引损坏、OCR 失败、rerank 超时或用户关闭高级 RAG 时，系统应回退到 lexical retrieval，并明确记录 fallback 原因。

### Acceptance criteria

- PDF/Office/OCR 分阶段上线，不把未完成格式显示为已支持。
- 导入过程有 progress reporting、metadata、错误恢复和删除一致性。
- embedding/vector/rerank 任一环节失败时保留 lexical retrieval fallback。
- 删除知识文件后，文本 chunk、embedding、metadata 和索引记录一致删除。
- 文档和 UI 不宣称 full PDF/OCR/vector DB RAG，除非对应能力已完成并验证。

## 阶段 4：Data 完整恢复、回滚、清理

### Full database restore

Full database restore 必须作为高风险数据任务实现。恢复前需要锁定写入、生成自动安全备份、验证 manifest/checksum/schema，并明确提示用户影响范围。

### Restore preflight

Restore preflight 应输出可读的影响预览，包括将被替换、合并、跳过、冲突、版本不兼容和需要重启的项目。

### Manifest/checksum/schema validation

备份包必须包含 manifest、schema version、checksum、创建版本、加密信息和必要的兼容字段。校验失败时不能进入 destructive restore。

### Automatic backup before restore

任何 destructive restore 之前必须自动创建当前数据库安全备份。没有成功备份，不允许继续 destructive restore。

### Write lock or safe restart strategy

恢复期间应阻止并发写入。根据 Electron/SQLite 约束选择 write lock、关闭 renderer 写入口、或 safe restart strategy，避免半恢复状态。

### Restore failure rollback

如果恢复失败，系统必须尝试回滚到恢复前自动备份，并把失败原因、回滚结果和用户后续选择写入 Data job log。

### Full DB rollback

Full DB rollback 应基于完整快照或备份包，不等同于当前有限 rollback records。需要支持 schema compatibility、checksum validation 和用户确认。

### Cleanup dry-run

General cleanup 必须先 dry-run，列出会删除或压缩的项目、大小、记录数和风险等级。没有 dry-run 和 impact preview，不允许实际 cleanup。

### Orphan data detection

清理应识别 orphan files、orphan embeddings、orphan chunks、无引用日志、过期 job、失败导入残留和失效临时文件。

### Log cleanup and database vacuum/analyze strategy

日志清理需要 retention policy、导出选项和审计记录。`VACUUM`、`ANALYZE` 或 SQLite 优化必须在安全窗口执行，并明确进度与失败处理。

### Acceptance criteria

- 没有安全备份就不执行 destructive restore。
- 没有 dry-run 和 impact preview 就不执行 cleanup。
- 恢复失败可回滚，且失败状态对用户可见。
- 用户数据安全优先级高于速度。
- Data tests 覆盖 preflight、checksum mismatch、schema mismatch、backup-before-restore、restore failure rollback 和 cleanup dry-run。

## 阶段 5：Electron sandbox 收敛

### Current security baseline

当前主窗口启用 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: false`。renderer 只能访问 `window.nexachat` allowlist，preload 不暴露 raw `ipcRenderer`，主进程 IPC 有 channel allowlist、payload validation、权限检查和错误归一化。

### Why `sandbox: true` is not enabled yet

`sandbox: true` 尚未启用，是因为 preload API、Electron smoke、生产打包启动、自定义协议加载、文件选择、日志打开路径和测试入口还没有完成兼容验证。不能只改一行配置就宣称安全完成。

### Preload API compatibility audit

逐项审计 preload 中使用的 Electron/Node 能力，确认 sandbox 后是否可用。任何不兼容能力必须迁移到主进程受控 IPC handler，保持 renderer 不直接访问 Node、fs、SQLite 或 secrets。

### Experimental switch

先引入实验开关，例如开发配置或内部 feature flag，使 `sandbox: true` 可以在受控环境下启用并测试。默认生产行为必须等验证完成后再切换。

### Sandbox smoke tests

新增或扩展 Electron smoke，覆盖启动、路由、preload API、IPC 基本调用、文件选择、日志打开、外链拦截和错误显示。

### Production packaged startup validation

沙箱切换不能只通过 dev 环境验证，必须验证 packaged startup、自定义协议资源加载、Windows 路径和日志目录行为。

### Acceptance criteria

- sandbox experimental switch 可运行，并有明确回退。
- preload API 在 sandbox 模式下通过 smoke。
- packaged startup 通过验证。
- 文档更新为真实状态；未默认启用前不得写成生产已完成。

## 阶段 6：Agent / MCP / Workflow Runtime

### Real MCP client runtime

在当前 registration、权限、dry-run、fixture execution、approval、trace/logging 基础上，引入真实 MCP client runtime。先支持低风险、只读、明确 schema 的工具调用，再扩展更高风险能力。

### Tool schema validation

所有工具必须有 schema validation、输入大小限制、输出大小限制、超时、错误映射和 redaction。未知字段、高风险参数和不符合 schema 的调用必须拒绝。

### Permission policy

高风险工具默认 deny。Shell、文件、网络、外部 API、系统目录、Git/GitHub、凭据读取、进程管理等动作必须有明确权限策略和用户授权记录。

### Approval flow

执行前应显示工具名称、来源、参数摘要、影响范围、风险等级和可取消选项。用户批准后才能执行高风险工具；批准应可审计，不应无限期隐式复用。

### Execution trace

每次 Agent/MCP/tool 调用都应记录 trace：输入摘要、权限、审批、开始/结束时间、结果、错误、redaction 状态和后续可追踪 job。

### File system / command execution safety

文件系统和命令执行必须限制工作目录、禁止危险默认操作、要求显式用户授权，并记录审计。不能把 shell/file/network 能力作为默认可用能力。

### Agent sandbox

Agent sandbox 应提供资源限制、权限隔离、超时、取消、输出上限和失败恢复。没有 sandbox 前，Agent 不能被描述为可安全执行任意任务。

### Workflow runtime

Workflow runtime 应有节点模型、状态机、持久化、错误恢复、重试策略、权限继承和可观察日志。第一版应从小型、可解释、可暂停的流程开始。

### Pause/resume runtime

暂停/恢复需要可序列化状态、幂等继续、过期权限处理和恢复后安全检查。不能只暂停 UI 而后台继续执行高风险动作。

### Acceptance criteria

- 高风险工具 default deny。
- Shell/file/network actions 必须显式授权并审计。
- MCP 工具调用有 schema、timeout、trace 和错误映射。
- Agent sandbox 未完成前，不宣称任意 Agent 执行安全。
- 该阶段应在核心 Chat、Provider、Gateway、Knowledge 和 Data 安全能力稳定之后实施。

## 阶段 7：架构拆薄与性能深改

### ServiceContext narrowing

继续拆薄 `ServiceContext`，把 secret、audit、knowledge、data、gateway、tool 等 helper 迁移到清晰 service dependency interfaces。避免另建平行实现路径，迁移前必须证明旧路径已被替代。

### Service dependency interfaces

为服务之间的依赖建立窄接口，降低 mixin/facade 压力。接口应覆盖实际调用，不提前设计过宽抽象。

### Renderer full snapshot refresh reduction

识别高频 action 中仍依赖 full snapshot refresh 的路径，改为 API result patch、event-driven update 或局部 query refresh。

### Local patch updates

局部更新必须有统一 merge 策略和 stale data 防护。失败时可以回退到 full snapshot refresh，但必须记录原因，不能让 UI 状态静默漂移。

### Pagination/virtualization for large lists

对大列表引入分页或 virtualization，包括会话列表、消息记录、Knowledge 文件/chunk、Gateway logs、audit logs、Data jobs 和 tool traces。

### Chat streaming rendering performance

Chat streaming 渲染需要节流、批处理或 requestAnimationFrame 策略，避免每个 token 触发过重 render。

### Gateway/audit/knowledge logs pagination

Gateway、audit、Knowledge 相关日志和列表必须支持稳定分页、排序和过滤，避免大数据量时 UI 卡顿。

### Acceptance criteria

- `ServiceContext` 面积缩小，边界测试更新。
- 高频 renderer action 不再无条件 full snapshot refresh。
- 大列表在大量数据下无明显卡顿。
- streaming 渲染不会造成输入框、滚动或布局抖动。

## 推荐执行顺序

| 轮次 | 主题 | 主要交付 | 为什么先做 | 风险等级 |
|---|---|---|---|---|
| 1 | Chat true streaming + IPC partial update + `/v1/responses` basic version | Chat 局部流式显示、统一 partial/progress DTO、Gateway basic responses | 直接改善核心 Chat-first 体验，并为后续长任务事件打基础 | 中 |
| 2 | Provider adapter registry + Anthropic/Gemini native first version | 多协议 provider registry、Anthropic/Gemini 文本与基础 streaming、错误映射 | 让多模型能力从 OpenAI-compatible 扩展到真实原生协议 | 中 |
| 3 | PDF/Office parsing first version | PDF/Office 文本提取、metadata、progress、删除一致性 | Knowledge 导入是 RAG 的前置条件，先解决文件进入系统的问题 | 中 |
| 4 | Embedding provider + vector retrieval + lexical fallback | embedding provider、向量索引 contract、本地检索、lexical fallback | 在安全导入后再建立检索质量升级，不破坏现有 lexical 能力 | 中高 |
| 5 | Rerank + citation score + source confidence | rerank 层、citation score、source confidence UI 与日志 | 在基础向量检索稳定后再优化答案可信度 | 中 |
| 6 | Data restore / rollback / cleanup | full restore、自动备份、失败回滚、cleanup dry-run | 用户数据安全优先，必须在高风险自动执行能力前补强 | 高 |
| 7 | Electron sandbox experimental switch + smoke | sandbox 实验开关、preload audit、dev/package smoke | 安全边界变化影响广，需要独立验证 | 高 |
| 8 | MCP real execution + Agent sandbox + workflow runtime | 真实 MCP client、权限审批、Agent sandbox、workflow/pause/resume | 这是最高风险执行能力，应在核心模块更稳后实施 | 高 |
| 9 | ServiceContext narrowing + renderer performance optimization | 窄接口、局部 patch、分页/virtualization、streaming 性能 | 基础能力稳定后再做深层架构与性能优化，降低行为回归 | 中 |

## 每一轮通用硬标准

- 必须先用 `git rev-parse --show-toplevel` 确认 repo root。
- 不创建或修改仓库根目录之外的文件。
- 不创建重复实现或重复 roadmap 文件。
- 只有在证明旧代码已被替代并有测试覆盖后，才能删除 obsolete code。
- 不夸大能力，不把 future、limited、reserved、experimental 写成 complete。
- 保留当前可用功能，尤其是 Chat-first 路由、7 个顶层模块和现有 Gateway/Knowledge/Data 边界。
- 每轮实现任务必须运行 `npm.cmd run typecheck`、`npm.cmd run test`、`npm.cmd run build`。
- UI 或 Electron 行为变化时，必须运行 UI/Electron smoke。
- 执行实现任务时必须更新 `PROJECT_PROGRESS.md`，记录变更、验证和剩余风险。
- 实现任务完成后应 commit 并 push。
- 最终用户汇报必须使用中文。
- 如果权限或访问能力被阻塞，必须询问用户授权，不能跳过功能、静默降级或标记完成。

## 风险排序

| 排名 | 风险项 | 主要风险 | 建议控制 |
|---|---|---|---|
| 1 | Agent/MCP/command execution | 任意工具、shell、文件、网络和外部 API 执行可能造成数据泄露或破坏 | default deny、审批、沙箱、trace、输出限制 |
| 2 | Data restore/rollback | 用户数据丢失、半恢复、schema 不兼容 | preflight、checksum、自动备份、写锁、失败回滚 |
| 3 | Knowledge production RAG | 错误解析、索引不一致、引用误导、隐私泄露 | 分阶段格式支持、metadata、删除一致性、fallback |
| 4 | Electron sandbox | preload 不兼容、打包启动失败、协议加载回归 | 实验开关、preload audit、dev/package smoke |
| 5 | Provider native protocols | API 差异、错误映射、streaming 行为不一致 | adapter registry、capability flags、统一错误 |
| 6 | Gateway `/v1/responses` | 外部客户端误以为完整兼容 OpenAI Responses API | basic boundary、unsupported fields 测试、文档标注 |
| 7 | Chat streaming | 局部状态错乱、取消后写入、UI 抖动 | progress DTO、取消契约、streaming smoke |
| 8 | Renderer performance optimization | 局部 patch 造成 stale state 或遗漏刷新 | merge 策略、回退机制、分页/virtualization 测试 |

## 最终完成状态

| 模块 | 预期最终状态 |
|---|---|
| Chat | 支持稳定真流式 UI、取消、重试、重新生成、多模型对比和高性能渲染。 |
| Models | 支持 OpenAI-compatible、Anthropic native、Gemini native 和可扩展 provider adapter registry。 |
| Gateway | 支持现有 OpenAI-compatible endpoints，并提供明确边界的 `/v1/responses` basic-to-expanded 路线。 |
| Knowledge Base | 支持分阶段 PDF/Office/OCR、embedding、vector retrieval、rerank、citation score，并保留 lexical fallback。 |
| Tools / Agent | 支持真实 MCP client、schema validation、审批、trace、Agent sandbox 和受控 workflow runtime。 |
| Data | 支持 full restore、restore preflight、自动备份、失败回滚、full DB rollback 和 cleanup dry-run。 |
| Settings / Security | 提供清晰安全设置、权限策略、减少动效全局执行、sandbox 状态和审计可见性。 |
| Architecture | `ServiceContext` 更窄，service dependency interfaces 清晰，无重复实现路径。 |
| UI / UX | 保持 chat-first、紧凑桌面工具式体验，大列表分页/virtualization，能力标签诚实可理解。 |

## 明确不做的事

本 documentation task 不做以下事情：

- 不修改 runtime code。
- 不实现功能。
- 不修改 tests。
- 不修改 package dependencies。
- 不删除 existing docs。
- 不宣称未完成功能已经完成。
- 不创建重复 roadmap 文件。
- 不隐藏权限问题。
- 不因为权限问题跳过 planned features。

未来实现任务也不得恢复旧 8-module Workspace/Dashboard-first 描述，不得把 full PDF/OCR/vector DB、arbitrary MCP execution、Agent sandbox 或 complete database restore 写成当前已完成，除非对应功能已经真实实现、测试通过并更新文档。

## Documentation quality requirements

本文档必须作为后续 Codex 实现任务的可执行路线图：

- 足够具体，能指导后续分阶段实现。
- 使用清晰 phased execution。
- 包含 boundaries、risks 和 acceptance criteria。
- 避免空泛口号。
- 避免把未来功能描述为当前功能。
- 明确说明权限问题必须升级给用户，而不是跳过。
- 在有助于阅读的地方使用 Markdown tables。
- 非专家用户也能读懂每个阶段为什么做、做什么、不做什么和如何验收。
