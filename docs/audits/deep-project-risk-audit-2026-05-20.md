# NexaChat 深度项目风险审计报告

## 1. 审计元信息

- 实际仓库根目录：Git 已检测到本机仓库根目录；本报告的证据路径统一使用仓库相对路径，避免在正文中扩散本机绝对路径。
- 审计开始时间：2026-05-20 16:24:37 +08:00。
- 审计结束时间：2026-05-20 18:41:26 +08:00 写稿前最后一轮只读复核；报告写入和最终 git 验证另行记录在结尾。
- 实际耗时：约 2 小时 17 分钟主动审计与交叉验证，含交接前深审、两名 Agent 的专职复核、交接后主审只读深化和最终证据校验。
- 3 小时目标完成情况：未完整达到 3 小时。原因是当前 Codex 会话在长时间运行后发生上下文压缩交接，用户随后明确将 Agent 数量限制为最多两个；后续只能复用既有两名 Agent，并在不新增 Agent、不触碰源码的前提下继续主审静态复核。本报告如实记录实际耗时，不伪造 3 小时完成。
- 分支：`main`。
- HEAD：最终写稿前基线为 `f447cf2f237ae76c11e8dbf0397acaf3aea3eb70`。
- origin/main：最终写稿前基线为 `f447cf2f237ae76c11e8dbf0397acaf3aea3eb70`，写稿前与本地 HEAD 一致。
- git status 基线：`git status --short` 无输出；`git status -sb` 为 `## main...origin/main`。
- 包管理器与锁文件：npm；存在 `package-lock.json`；未运行 install/update。
- Node/npm：Node `v24.14.1`，npm `11.11.0`。
- 可用脚本：`dev`、`dev:electron`、`typecheck`、`build:renderer`、`build:main`、`build`、`start`、`test`、`test:ui-smoke`、`test:electron-smoke`、`package:win-unpacked`、`package:installer-script`、`package:release`、`test:package-smoke`、`test:installer-smoke`、`test:shortcut-readback`、`scan:*`、`verify:release`、`verify` 等。
- 当前顶层结构：`src`、`tests`、`docs`、`scripts`、`assets`、`dist`、`dist-electron`、`release`、`test-results`、`README.md`、`PROJECT_PROGRESS.md`、`package.json`、`package-lock.json`。
- 是否全程未改源码：是。本次审计未修改 `src/`、`tests/`、`package.json`、构建配置、脚本、资源、数据库 schema、路由、IPC 或打包实现。
- 是否写入报告文件：是，目标为 `docs/audits/deep-project-risk-audit-2026-05-20.md`。
- 是否追加 `PROJECT_PROGRESS.md`：是，仅追加审计 trace。
- 是否运行 typecheck/test：已运行 `npm.cmd run typecheck` 与 `npm.cmd run test`，均通过；未运行 build/package/release。
- 是否发现其他任务并行运行：写稿前未发现 `.git/index.lock`、冲突标记或当前工作树变更；`git status --short` 为空，`git status -sb` 为 `## main...origin/main`。检测到本仓库目录下仍有 Vite/esbuild dev 进程在运行，因此本轮没有运行 build/package/release，也没有停止或干预这些进程；仅在工作树稳定时写入审计文档。

## 2. 执行摘要

- 综合健康度评分：7.4 / 10。
- 最大风险结论：项目已经具备较清晰的 chat-first 产品事实、IPC 权限映射、secret 存储防线、Gateway/Knowledge/Tools 能力边界文案与测试基础；但核心实现仍受 `ServiceContext` 宽上下文、启动期 DB 初始化早于 single-instance lock、Dashboard/Workspace 兼容模型、Gateway 复用 Chat 写路径、Electron `sandbox: false` 且缺少 CSP/显式 permission handler、SQLite 迁移/锁恢复策略不足、Observability 导出隐私边界、Tools/MCP fixture-only 与发布链路未形成真实 installer/signing/update 能力的影响。
- 是否适合马上做 `.exe` 打包：不建议直接做面向用户的正式 `.exe` 发布。可以在明确标注“内部 smoke / unsigned unpacked package”的前提下继续验证打包链路，但不应宣传为正式安装器或签名发布。
- 是否建议先修复阻塞项：建议先修复 P1 与部分 P2 发布门禁项，尤其是 ServiceContext 边界收窄计划、Gateway 外部请求持久化语义、secret fallback 发布门、Electron sandbox 兼容验证、真实 installer/signing/update 规划。

评分矩阵：

| 维度 | 分数 |
| --- | ---: |
| 综合健康度 | 7.4 |
| 架构边界 | 7.0 |
| 代码可维护性 | 6.8 |
| Electron 安全边界 | 6.9 |
| 数据安全 | 7.6 |
| Secret/API Key 安全 | 7.8 |
| Gateway/provider 能力 | 7.5 |
| Chat 体验 | 7.5 |
| Knowledge/RAG | 6.8 |
| Tools/Agent/MCP | 6.4 |
| UI/UX | 7.6 |
| 性能 | 6.9 |
| 测试质量 | 8.2 |
| 发布打包准备度 | 5.6 |
| 文档一致性 | 7.5 |
| 可长期维护性 | 6.8 |

## 3. 当前项目事实核对

- chat-first 是否成立：成立。`README.md`、`docs/architecture/current-architecture.md` 与 `docs/design/ui-product-boundary.md` 都明确当前入口是 Chat，根路由解析到 `/chat/conversations`，不是 Workspace-first 或 Dashboard-first。
- 当前 7 个一级模块是否成立：成立。当前公开顶层模块是 Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings。
- Gateway 当前定位：本地 OpenAI-compatible gateway，支持 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`、`/v1/responses` basic text。它不是完整 OpenAI Responses API 兼容层。
- Agent/Tools/MCP 当前边界：已实现 registration、permission state、dry-run preview、安全 fixture execution、approval、trace/logging；未实现任意 MCP tool 执行、真实 Agent sandbox 或 workflow runtime。
- Knowledge Base 当前真实能力边界：支持 text-like 导入、chunk、SQLite `knowledge_embeddings`、配置型 provider embeddings/vector 检索、lexical fallback、retrieval trace 与 citations；未实现 PDF、Office、OCR、真实 rerank 或外部 vector DB。
- 不应继续传播的旧说法：Workspace/Dashboard-first、8-module、`/v1/responses` reserved-only、完整 Responses API、完整 RAG、任意 MCP 执行、完整 Agent sandbox、full database restore、已签名 `.exe`、自动更新已完成。

## 4. 多 Agent 审计方法

用户将 Agent 数量限制为最多两个，因此本次只复用两个既有专职 Agent，并由主审串联 10 个原始审计角色的覆盖面。没有新增第三个或更多 Agent。

| Agent | 职责覆盖 | 读取的主要文件/目录 | 交叉验证方式 |
| --- | --- | --- | --- |
| Agent A：架构/安全/数据/Provider | Electron main/preload/IPC、ServiceContext、serviceRegistry、Gateway/provider、secret、data restore、DB schema | `src/main/index.ts`、`src/preload/index.ts`、`src/shared/api.ts`、`src/main/ipc.ts`、`src/shared/ipc.ts`、`src/main/services/*`、`src/main/database/*`、`src/main/adapters/*` | 用 schema、service、tests、README/current architecture 互相核对；最终补充确认 CSP、permission request hardening 与 quality gate 覆盖缺口 |
| Agent B：产品/UI/RAG/Tools/发布 | Chat/Models/Knowledge/Tools/Gateway/Data/Settings 的产品边界、UI/UX、可访问性、文档、测试、发布脚本 | `src/renderer/modules/*`、`src/renderer/components/*`、`src/shared/i18n.ts`、`tests/*`、`scripts/*`、`docs/*`、`package.json` | 用 UI 文案、测试断言、runtime constants、发布脚本和历史审计报告交叉验证；最终补充确认 Chat progressive reveal notice 应按 `generation.source` 条件展示 |

主审补充的 10 个角色覆盖：架构边界、产品模块行为、安全隐私、Gateway/provider、Chat streaming、Knowledge/RAG、Tools/MCP、UI/UX、性能测试、发布文档维护。

## 5. Top 30 风险清单

### R-01：`ServiceContext` 过宽且主进程启动期过早初始化 DB

- 所属模块：架构 / 主进程服务层。
- 严重级别：P1。
- 置信度：高。
- 证据文件路径：`src/main/index.ts`、`src/main/ipc.ts`、`src/main/services/store.ts`、`src/main/services/serviceRegistry.ts`、`src/main/services/serviceContext.ts`、`tests/store-boundaries.test.ts`。
- 风险说明：`src/main/index.ts` 在 `requestSingleInstanceLock()` 之前调用 `registerIpcHandlers()`；该路径导入 `store`，而 `store.ts` 导出 eager `serviceRegistry`，`serviceRegistry.ts` 立即 `new NexaServiceRegistry()`。`ServiceContext` 构造期会打开 DB、创建 repositories、seed 数据并读取设置。结果是第二实例或异常启动路径也可能触发 DB/schema/seed 初始化，且 `ServiceContext` 仍同时承担 retrieval、embeddings、data/backup、secret/audit、fixture execution 等 helper。
- 根因判断：早期为了快速聚合桌面工作台能力，采用共享上下文加 mixin service facade，并在模块 import 阶段创建单例；后续没有把 IPC registration、single-instance lock、DB 打开、服务构造拆成显式生命周期。
- 影响范围：新功能容易跨模块调用内部 helper；双实例、启动失败、迁移或锁冲突场景下可能出现不必要的 DB 写入和更难诊断的启动状态。
- 是否影响 `.exe` 打包：间接影响。打包不一定失败，但 packaged app 的 second-instance、首次启动迁移和 quit/restart smoke 风险更高。
- 是否涉及安全/数据：涉及。secret、audit、data、gateway 能力位于同一宽上下文。
- 建议修复方案：把 single-instance lock 提前到任何 `store` import 之前；将 `registerIpcHandlers()` 改为显式接收已初始化 store；分阶段把 Knowledge/Data/Gateway/Execution helpers 下沉到各自 domain service；`ServiceContext` 只保留 DB、transaction、repository access、permission/audit primitives。
- 推荐验证方式：second-instance smoke、lazy-store import boundary test、service public method allowlist、store-boundaries regression、关键服务单元测试。
- 建议 owner/agent：架构重构 Agent。

### R-02：chat-first 外壳仍依赖 Dashboard/Workspace 兼容模型

- 所属模块：架构 / 产品 shell / 数据模型。
- 严重级别：P1。
- 置信度：中高。
- 证据文件路径：`src/main/services/dashboardService.ts`、`src/main/services/serviceRegistry.ts`、`src/main/database/schema.ts`、`src/renderer/App.tsx`、`src/shared/types.ts`。
- 风险说明：用户可见产品已是 Chat-first，但 snapshot 和 schema 仍以 `DashboardSummary`、`Workspace`、`workspace_id` 贯穿核心对象。
- 根因判断：兼容历史 Workspace/Dashboard 数据结构是合理迁移策略，但命名和依赖尚未降级为 legacy compatibility。
- 影响范围：默认模型、导入/还原、会话归属、UI shell 状态可能出现产品心智和内部数据不一致。
- 是否影响 `.exe` 打包：间接影响首次启动、迁移和 smoke 解释。
- 是否涉及安全/数据：涉及数据归属和恢复语义。
- 建议修复方案：明确 legacy/default workspace compatibility；抽出 chat-first `ShellSnapshot`；逐步减少 renderer 对 `dashboard.workspace` 的依赖。
- 推荐验证方式：migration tests、snapshot contract tests、UI route tests、legacy workspace fixture。
- 建议 owner/agent：架构 + 产品边界 Agent。

### R-03：Data import/restore normalization 与应用逻辑存在双轨

- 所属模块：Data / backup / restore。
- 严重级别：P2。
- 置信度：中高。
- 证据文件路径：`src/shared/dataRuntime.ts`、`src/main/services/dataService.ts`、`src/main/services/serviceContext.ts`。
- 风险说明：shared runtime 负责 manifest normalization/redaction，`ServiceContext` 仍保留 import source、provider/model/key template normalization 与 backup crypto helpers。
- 根因判断：纯 runtime 与主进程 domain helper 之间职责尚未完全收敛。
- 影响范围：预检、应用、backup、restore roundtrip 可能解释同一 manifest 的方式不一致。
- 是否影响 `.exe` 打包：不直接影响，但影响发布后的数据迁移可信度。
- 是否涉及安全/数据：涉及 secrets stripping、rollback 记录和用户配置恢复。
- 建议修复方案：建立单一 Data domain normalization/apply 层；shared 只做无副作用解析；main 负责权限、事务、写入。
- 推荐验证方式：golden manifest roundtrip、失败注入 rollback test、backup decrypt/preflight/apply matrix。
- 建议 owner/agent：Data 可靠性 Agent。

### R-04：Electron `sandbox: false` 且缺少 CSP/permission request 发布门

- 所属模块：Electron / 安全边界。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/main/index.ts`、`scripts/quality-gates.mjs`、`docs/architecture/current-architecture.md`、`README.md`。
- 风险说明：主窗口启用 `contextIsolation: true` 与 `nodeIntegration: false`，但仍保留 `sandbox: false`；`protocol.handle('nexachat')` 仅返回 `content-type`，没有设置 `Content-Security-Policy`；未发现显式 `session.setPermissionRequestHandler`；`scan:security` 只检查 `contextIsolation`、`nodeIntegration` 和 `contextBridge`，没有把 CSP、permission handler 或 sandbox 决策作为发布门。
- 根因判断：preload 桥接、Electron smoke、打包路径尚未完成 sandbox 兼容验证；安全门更偏静态危险 API 扫描，尚未覆盖 Electron release hardening checklist。
- 影响范围：renderer 被注入时，缺少 CSP 会提高脚本/资源注入后的可利用面；权限请求依赖 Electron 默认行为，release gate 也无法捕获该类回归。
- 是否影响 `.exe` 打包：影响正式安全评审，不一定影响构建产物生成。
- 是否涉及安全/数据：涉及 renderer compromise 后的攻击面。
- 建议修复方案：开 sandbox 实验分支，逐项验证 preload API、file protocol、smoke、packaged app；为 `nexachat://app/index.html` 增加 CSP；在主 session 上设置默认拒绝的 permission request handler 并记录诊断；扩展 `scan:security` 与 `verify:release`。
- 推荐验证方式：sandbox-on Electron smoke、CSP header test、permission request handler test、renderer API boundary tests、packaged smoke。
- 建议 owner/agent：Electron 安全 Agent。

### R-05：preload `AppApi` 暴露面较宽

- 所属模块：Electron / IPC / preload。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/preload/index.ts`、`src/shared/api.ts`、`src/main/ipc.ts`、`src/shared/securityRuntime.ts`。
- 风险说明：preload 没有暴露 raw `ipcRenderer`，但 `window.nexachat` API 覆盖 Chat、Models、Gateway、Data、Security、Tools 等大量动作。
- 根因判断：单一桌面 API 便于开发和测试，但未按读写/危险动作拆分 capability。
- 影响范围：renderer XSS 或 UI 注入后可尝试调用大量 IPC，虽有 permission guard 但 blast radius 大。
- 是否影响 `.exe` 打包：间接影响安全发布。
- 是否涉及安全/数据：涉及。
- 建议修复方案：按模块和风险等级拆分 preload capability；写操作要求更强 payload validation、confirmation、audit。
- 推荐验证方式：renderer-api-boundary test、IPC permission exhaustiveness、malformed payload fuzz。
- 建议 owner/agent：IPC 安全 Agent。

### R-06：本地 owner/operator/viewer 不是真实多用户认证

- 所属模块：Security / RBAC / ACL。
- 严重级别：P2。
- 置信度：中高。
- 证据文件路径：`src/shared/securityRuntime.ts`、`src/main/database/schema.ts`、`src/main/services/serviceContext.ts`。
- 风险说明：权限模型已存在，但本地桌面 session 与角色更像单机控制面，不应被解释为企业级多用户认证。
- 根因判断：local-first 桌面应用优先保障本机权限与审计，不提供外部身份系统。
- 影响范围：文档或销售表达若夸大，会误导部署边界。
- 是否影响 `.exe` 打包：不阻塞，但影响发布说明。
- 是否涉及安全/数据：涉及。
- 建议修复方案：文档明确 local owner 模型；外部协作/多用户需另设身份层。
- 推荐验证方式：security runtime tests、docs scan。
- 建议 owner/agent：Security / Docs Agent。

### R-07：不安全 secret fallback 需要发布门禁

- 所属模块：Secret / API Key。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/main/security/secretStorage.ts`、`tests/secret-storage.test.ts`、`scripts/quality-gates.mjs`。
- 风险说明：`safeStorage` 不可用时生产保存会阻断，但 `NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE=1` 可启用 base64 fallback。若打包/运行环境误带该变量，secret 安全下降。
- 根因判断：测试/开发兼容需要 fallback，但发布门未强制检查运行环境。
- 影响范围：provider API key、Gateway key secret_ref。
- 是否影响 `.exe` 打包：影响正式 release gate。
- 是否涉及安全/数据：涉及 API key 安全。
- 建议修复方案：packaged smoke 强制断言 fallback env 未设置；diagnostics 显示 secret storage mode；禁止 release profile 使用 fallback。
- 推荐验证方式：packaged secret smoke、scan:security、env gate test。
- 建议 owner/agent：Security / Release Agent。

### R-08：Gateway `/v1/responses` 只是 basic text

- 所属模块：Gateway。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/main/services/localGateway.ts`、`src/shared/gatewayRuntime.ts`、`README.md`、`docs/architecture/current-architecture.md`、`tests/gateway-runtime.test.ts`。
- 风险说明：当前 `/v1/responses` 明确拒绝 tools、多模态、background、advanced reasoning 等字段；外部客户端可能误以为完整 OpenAI Responses API。
- 根因判断：为了兼容基础文本调用，先映射到现有 Chat Provider 链路。
- 影响范围：第三方客户端集成、开发者预期、错误处理。
- 是否影响 `.exe` 打包：不阻塞打包，但影响发布说明。
- 是否涉及安全/数据：低，主要是产品兼容风险。
- 建议修复方案：保留 basic boundary 文案；增加 compatibility matrix；扩展前先设计完整 DTO 和 unsupported-field tests。
- 推荐验证方式：Gateway contract tests、docs scan、client compatibility fixtures。
- 建议 owner/agent：Gateway Agent。

### R-09：Gateway 外部请求复用 Chat 写路径，生命周期与断连语义不完整

- 所属模块：Gateway / Chat / Data。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/main/index.ts`、`src/main/ipc.ts`、`src/main/services/localGateway.ts`、`src/main/services/gatewayService.ts`、`src/main/services/chatService.ts`、`tests/gateway-provider-chain.test.ts`。
- 风险说明：Gateway `/v1/chat/completions` 与 `/v1/responses` 调用 `store.sendMessage()`，会生成 conversations/messages/request logs；`gateway.enabled` 会被持久化，但 `app.whenReady()` 启动路径没有按该设置自动启动 listener，只有 UI `gatewayToggle` 会 start/stop；streaming SSE 没有把 HTTP client disconnect 绑定到 `store.cancelMessage()` 或 provider abort。
- 根因判断：复用 Chat provider chain 降低实现成本，但外部 API 语义和内部 UI conversation 语义耦合；Gateway runtime state 与 persisted enabled setting、HTTP lifecycle 尚未合并成完整状态机。
- 影响范围：外部工具调用可能污染 Chat 列表、增加本地数据保留和隐私解释成本；重启后可能出现 UI/设置认为 enabled 但 listener 实际未监听；断开的客户端仍可能继续消耗 provider 和写 request log。
- 是否影响 `.exe` 打包：不阻塞，但影响发布隐私说明。
- 是否涉及安全/数据：涉及用户内容留存。
- 建议修复方案：新增 Gateway execution layer，支持“持久化/非持久化”策略；UI 标注 Gateway-generated conversation；app ready 时明确恢复或重置 Gateway listener；SSE request/response close 时取消上游请求并记录 cancellation。
- 推荐验证方式：Gateway side-effect tests、restart enabled-listener tests、client disconnect cancellation tests、privacy export tests、conversation filtering tests。
- 建议 owner/agent：Gateway / Data Agent。

### R-10：Gateway key 授权逐条解密扫描有性能与侧信道压力

- 所属模块：Gateway / Secret。
- 严重级别：P2。
- 置信度：中。
- 证据文件路径：`src/main/services/gatewayService.ts`、`src/main/security/secretStorage.ts`。
- 风险说明：`authorizeGatewayKey` 需要在候选 key 记录中比较 secret，key 数量增大后会增加 latency；错误路径也会更新 key error 状态。
- 根因判断：secret 不以明文索引保存，当前没有安全 hash lookup 层。
- 影响范围：大量 key 或频繁请求下 Gateway 入口性能下降。
- 是否影响 `.exe` 打包：不直接影响。
- 是否涉及安全/数据：涉及 API key 认证性能与错误记录。
- 建议修复方案：为 gateway key 增加不可逆 keyed hash lookup，保留 encrypted secret_ref 用于管理；比较使用 constant-time。
- 推荐验证方式：gateway auth benchmark、key rotation tests、redaction tests。
- 建议 owner/agent：Security / Gateway Agent。

### R-11：Provider adapter streaming abort/timeout 与 native 能力仍有限

- 所属模块：Models / Provider。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/main/adapters/providerAdapterRegistry.ts`、`src/main/adapters/openAiCompatibleAdapter.ts`、`tests/provider-adapter.test.ts`、`README.md`、`docs/architecture/current-architecture.md`。
- 风险说明：OpenAI-compatible 和 native streaming 路径在 `fetch()` 返回 headers 后会清理 timeout 与 abort listener，后续 reader loop 没有持续检查 signal 或主动 cancel reader；streaming parser 对坏 chunk/非 JSON SSE 的错误分类偏粗，`JSON.parse()` 或 native parser 抛出的普通 Error 最终可能被归为 retryable `networkError`，而不是 `invalidResponse`。Anthropic/Gemini native 当前仍只覆盖文本 chat、streaming、models/fallback、key 验证和错误映射，不支持 embeddings/tools/vision/responses。
- 根因判断：第一版 native provider 以文本聊天为核心；streaming happy path 已覆盖，但 body consumption timeout、abort-after-headers、malformed SSE、provider error event、partial JSON 的语义测试不足。
- 影响范围：慢速或半断开 streaming 响应可能不按用户取消/超时预期结束；模型选择 UI 和 Gateway/RAG 能力组合容易被用户误解；异常 provider 流可能触发误重试、错误提示不准确或延迟暴露真实上游兼容问题。
- 是否影响 `.exe` 打包：不阻塞。
- 是否涉及安全/数据：低到中，主要是错误处理、重试和诊断准确性。
- 建议修复方案：在 stream reader loop 内持续响应 AbortSignal、保留 body-consumption timeout、取消 reader；区分 malformed SSE、invalid provider payload、network disconnect、timeout 和 user cancel；Provider capability matrix 在 UI 和 docs 中保持强约束，扩展能力必须先补 runtime flags 和 tests。
- 推荐验证方式：streaming abort-after-headers tests、slow body timeout tests、provider-adapter tests、provider discovery tests、UI capability display tests、malformed SSE/invalid stream regression tests。
- 建议 owner/agent：Provider Agent。

### R-12：RAG retrieval 在 provider 调用前执行，可能推迟首 token

- 所属模块：Chat / Knowledge / Performance。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/main/services/chatService.ts`、`src/main/services/serviceContext.ts`、`src/renderer/modules/ChatPage.tsx`。
- 风险说明：`sendMessage()` 在 provider invocation 前先 `retrieveKnowledge()`，索引大或 embedding fallback 慢时会延迟可见 streaming。
- 根因判断：需要先拿到 citations/context 再构造 prompt。
- 影响范围：用户感知为“回答突然出现”或首 token 慢。
- 是否影响 `.exe` 打包：不直接影响。
- 是否涉及安全/数据：涉及知识内容使用时序。
- 建议修复方案：UI 增加明确 retrieval phase；对检索加 timeout/cache；长远可考虑先发状态事件、后 provider streaming。
- 推荐验证方式：latency tests、retrieval timing trace、UI generation phase tests。
- 建议 owner/agent：Chat / Performance Agent。

### R-13：Chat cancellation 与 progressive reveal 来源提示仍有一致性风险

- 所属模块：Chat / Provider / UX。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/main/services/chatService.ts`、`src/renderer/modules/ChatPage.tsx`、`src/renderer/modules/progressiveReveal.ts`、`tests/app.test.tsx`、`tests/progressive-reveal.test.ts`。
- 风险说明：当 provider/model 不支持 streaming 或路径回退时，前端用 progressive reveal 模拟流畅感，不等于真实 GPT-style token streaming。`ChatPage.tsx` 在真实 chunk 到达时把 `generation.source` 设为 `ipc-stream`，fallback 才设为 `send-message-fallback`，但 `GenerationBubble` 当前无条件显示 progressive reveal 说明。另一个一致性风险是 `cancelMessage()` 会标记 DB cancelled，但 provider late success 路径后续仍按 completed 更新消息和 request log，缺少最终写入前 status guard。
- 根因判断：需要兼容非 streaming provider 与现有 sendMessage response；后端取消路径和 provider completion 写入路径尚未用同一状态机收口。
- 影响范围：真实流式响应也可能出现“renderer-side progressive reveal”提示，削弱用户对 streaming 能力的信任；取消后的 late success 可能覆盖用户取消状态。
- 是否影响 `.exe` 打包：不直接影响。
- 是否涉及安全/数据：否。
- 建议修复方案：progressive reveal notice 仅在 `generation.source === 'send-message-fallback'` 时显示；provider completion 写入前检查 request/message 是否仍为 active 状态；Provider capability 清晰展示。
- 推荐验证方式：ipc-stream 不显示 progressive notice 的 UI test、fallback 显示 notice 的 UI test、late success after cancel store test、streaming/non-streaming model UI tests。
- 建议 owner/agent：Chat UX Agent。

### R-14：生成消息缺少明显 `aria-live`

- 所属模块：Chat / Accessibility。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/renderer/modules/ChatPage.tsx`、`src/renderer/modules/chat/ChatMessageBubble.tsx`、`tests/app.test.tsx`。
- 风险说明：生成中、失败、取消等状态主要视觉呈现，未发现针对生成状态的 `aria-live`，屏幕阅读器用户可能无法感知回答状态变化。
- 根因判断：流式 UI 优先做视觉与状态 pill，尚未补齐 live region。
- 影响范围：可访问性、合规性、桌面工具可用性。
- 是否影响 `.exe` 打包：影响正式可访问性质量，不阻塞技术打包。
- 是否涉及安全/数据：否。
- 建议修复方案：对生成状态增加 `role="status"` 或 `aria-live="polite"`，避免逐 chunk 过度播报。
- 推荐验证方式：Testing Library role/status tests、UI smoke a11y checks。
- 建议 owner/agent：UI Accessibility Agent。

### R-15：Knowledge 仅支持 text-like 文件

- 所属模块：Knowledge Base / RAG。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/shared/knowledgeRuntime.ts`、`src/renderer/modules/KnowledgePage.tsx`、`README.md`、`tests/knowledge-runtime.test.ts`。
- 风险说明：支持 `.txt/.md/.markdown/.json/.csv/.log`，最大导入约 512 KiB；PDF/Office/OCR 未启用。
- 根因判断：当前 RAG foundation 先实现安全文本入口。
- 影响范围：用户上传常见文档会失败或需手工转换。
- 是否影响 `.exe` 打包：不阻塞。
- 是否涉及安全/数据：低；安全上避免了复杂 parser 风险。
- 建议修复方案：分阶段实现 PDF/Office 安全文本提取、页码/段落 citation、进度、失败恢复；OCR 单独立项。
- 推荐验证方式：unsupported format tests、parser fixture tests、citation page tests。
- 建议 owner/agent：Knowledge Parser Agent。

### R-16：RAG 无外部 vector DB / rerank，大规模质量与性能有限

- 所属模块：Knowledge Base / Retrieval。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/shared/knowledgeRuntime.ts`、`src/main/services/serviceContext.ts`、`docs/build-plans/00-modular-refactor-master-plan/rag-foundation-implementation-map.md`。
- 风险说明：当前使用 SQLite JSON vector 与 lexical fallback，没有专用向量索引或 rerank 模型。
- 根因判断：local-first、可备份、可迁移优先。
- 影响范围：资料规模上升后检索延迟、相关性和召回质量受限。
- 是否影响 `.exe` 打包：不阻塞。
- 是否涉及安全/数据：涉及本地知识库规模和删除一致性。
- 建议修复方案：先定义 retrieval contract 和质量评估集；必要时引入本地向量索引或可选外部 DB，保留 lexical fallback。
- 推荐验证方式：retrieval quality eval、large corpus benchmark、deletion consistency tests。
- 建议 owner/agent：RAG Quality Agent。

### R-17：Knowledge 删除路径未直接标记 embeddings deleted/stale

- 所属模块：Knowledge Base / Data hygiene。
- 严重级别：P3。
- 置信度：中高。
- 证据文件路径：`src/main/services/knowledgeService.ts`、`src/main/database/schema.ts`。
- 风险说明：删除文件时标记 chunks/files 删除并写 tombstone，但 delete path 未显式同步 `knowledge_embeddings` 状态；检索通过 chunks/files 排除，所以更偏存储审计卫生风险。
- 根因判断：检索过滤以 chunk/file 为主，embedding 状态未作为删除主索引。
- 影响范围：长期本地 DB 体积、审计查询、未来 embedding 维护任务。
- 是否影响 `.exe` 打包：不影响。
- 是否涉及安全/数据：轻度涉及删除一致性。
- 建议修复方案：删除时同步标记 embeddings deleted/stale；增加 cleanup/rebuild command。
- 推荐验证方式：delete file 后 DB 状态断言、retrieval exclusion tests。
- 建议 owner/agent：Knowledge Data Agent。

### R-18：Knowledge UI 默认显示 vector，fallback 事后揭示

- 所属模块：Knowledge Base / UI。
- 严重级别：P3。
- 置信度：高。
- 证据文件路径：`src/renderer/modules/KnowledgePage.tsx`、`src/shared/i18n.ts`。
- 风险说明：检索页 eyebrow/action 默认 `vector`，调用也传 `strategy: 'vector'`；若无 embedding provider，fallback 后才显示 lexical。
- 根因判断：vector-first 设计想鼓励配置 embedding，但预操作状态没有体现依赖。
- 影响范围：用户误判当前检索质量和 citation 来源。
- 是否影响 `.exe` 打包：不影响。
- 是否涉及安全/数据：低。
- 建议修复方案：无 embedding provider 时预先显示 lexical fallback 或 “vector when configured”。
- 推荐验证方式：无 embedding provider UI tests、retrieval trace UI consistency。
- 建议 owner/agent：Knowledge UX Agent。

### R-19：`encrypted-full` backup 实际仍是 redacted package

- 所属模块：Data / Backup。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/shared/dataRuntime.ts`、`src/main/services/dataService.ts`、`docs/design/ui-product-boundary.md`。
- 风险说明：backup profile 有 `encrypted-full`，但 payload 仍走 redaction，secrets/local paths stripped/redacted；这对隐私安全有利，但不是完整数据库备份。
- 根因判断：先保证可导出安全包，未实现 raw DB full backup。
- 影响范围：用户以为可以完整灾备恢复，实际恢复能力有限。
- 是否影响 `.exe` 打包：不阻塞，但影响发布文案。
- 是否涉及安全/数据：涉及备份完整性和 secret 安全。
- 建议修复方案：改名或 UI 文案明确“encrypted redacted export”；如需 full backup，单独设计本地加密 DB 备份与恢复。
- 推荐验证方式：backup payload inspection、restore-preflight tests、docs scan。
- 建议 owner/agent：Data Product Agent。

### R-20：Restore/rollback 不是 full database restore

- 所属模块：Data / Restore。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/main/services/dataService.ts`、`src/shared/dataRuntime.ts`、`docs/design/ui-product-boundary.md`、`tests/data-runtime.test.ts`。
- 风险说明：当前 restore 更偏 preflight/metadata restore；rollback 主要处理 import-created metadata/provider/model disablement，不是全数据库回滚。
- 根因判断：full DB restore 涉及事务、文件替换、secret、migration、运行中进程状态，尚未实现。
- 影响范围：灾备承诺、用户数据恢复预期。
- 是否影响 `.exe` 打包：不阻塞，但正式发布说明必须准确。
- 是否涉及安全/数据：涉及。
- 建议修复方案：将“full restore”列为未实现；如要做，设计停机恢复、备份校验、schema version、rollback safety。
- 推荐验证方式：restore matrix、fault injection、migration compatibility tests。
- 建议 owner/agent：Data Reliability Agent。

### R-21：Tools/MCP/Agent 当前 fixture-only，不是任意执行平台

- 所属模块：Tools / Agent / MCP。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/shared/executionRuntime.ts`、`src/main/services/toolService.ts`、`src/renderer/modules/ToolsPage.tsx`、`docs/architecture/current-architecture.md`。
- 风险说明：真实执行只覆盖 `nexachat.status.read` 和 `nexachat.echo` fixture；`mcp-tool` 和 `workflow` 是 reserved kinds，Agent definitions 处于 planned stage。
- 根因判断：先建立 permission/approval/trace 骨架，尚未接入任意 MCP executor 或 sandbox。
- 影响范围：用户或后续实现者可能误以为已经能执行真实工具链。
- 是否影响 `.exe` 打包：不阻塞，但影响产品声明。
- 是否涉及安全/数据：目前安全边界保守；未来扩展风险高。
- 建议修复方案：继续明确 fixture-only；真实 MCP 执行需 schema allowlist、transport sandbox、approval expiry、output caps、audit。
- 推荐验证方式：execution-runtime tests、UI smoke、reserved kind tests。
- 建议 owner/agent：MCP Runtime Agent。

### R-22：Approval requests 无 expiry enforcement

- 所属模块：Tools / Approval。
- 严重级别：P3。
- 置信度：中高。
- 证据文件路径：`src/main/services/toolService.ts`、`src/main/database/schema.ts`。
- 风险说明：插入 approval 时 `expires_at` 可为 null，决策路径未见过期校验。
- 根因判断：当前只用于 fixture safety flow，暂未进入真实危险执行。
- 影响范围：未来接入真实工具后，旧审批可能被长期复用或语义不清。
- 是否影响 `.exe` 打包：不影响。
- 是否涉及安全/数据：未来涉及。
- 建议修复方案：为 approval 增加默认 TTL、过期状态和决策前校验。
- 推荐验证方式：approval expiry tests、clock fixture。
- 建议 owner/agent：Tools Security Agent。

### R-23：MCP granted/enabled 文案易被理解为已连接可执行

- 所属模块：Tools / MCP UI。
- 严重级别：P3。
- 置信度：高。
- 证据文件路径：`src/main/services/toolService.ts`、`src/renderer/modules/ToolsPage.tsx`、`src/shared/i18n.ts`。
- 风险说明：permission granted 时写 `enabled=1`，UI 显示授权状态，但文案虽提醒 unchecked，仍可能被理解为服务器已连通且可执行。
- 根因判断：permission intent、connectivity 和 executor availability 没有三态拆开。
- 影响范围：用户预期、支持成本。
- 是否影响 `.exe` 打包：不影响。
- 是否涉及安全/数据：低。
- 建议修复方案：拆分 “授权记录” “连接检查” “执行可用”；未检查时保持 warning/unchecked。
- 推荐验证方式：MCP UI state tests。
- 建议 owner/agent：Tools UX Agent。

### R-24：Tools runs/traces 截断且无分页

- 所属模块：Tools / Observability。
- 严重级别：P3。
- 置信度：中。
- 证据文件路径：`src/main/repositories/toolRepository.ts`、`src/main/services/dashboardService.ts`、`src/renderer/modules/ToolsPage.tsx`。
- 风险说明：repository 层 runs/traces 有固定 limit，snapshot 再截断，UI 只展示部分最近记录。
- 根因判断：全局 snapshot 简化读取，没有为长历史诊断设计分页。
- 影响范围：长时间使用后排查审批和执行问题困难。
- 是否影响 `.exe` 打包：不影响。
- 是否涉及安全/数据：轻度涉及审计可追溯性。
- 建议修复方案：增加 execution page API、load more、filter by run/status。
- 推荐验证方式：pagination tests、UI smoke with >100 traces。
- 建议 owner/agent：Tools Observability Agent。

### R-25：`tabpanel` 语义与导航控件不完全匹配

- 所属模块：UI / Accessibility。
- 严重级别：P3。
- 置信度：中高。
- 证据文件路径：`src/renderer/modules/shared.tsx`、`src/renderer/components/AppFrame.tsx`。
- 风险说明：模块面板使用 `role="tabpanel"`，但 shell 导航主要是 nav/button/`aria-current`，不是完整 `tablist/tab/aria-selected` 模型。
- 根因判断：视觉上是模块 tab，语义上更像页面导航。
- 影响范围：辅助技术导航体验不一致。
- 是否影响 `.exe` 打包：不影响。
- 是否涉及安全/数据：否。
- 建议修复方案：要么完整实现 tablist/tab，要么把面板改为 region/page pattern。
- 推荐验证方式：role query tests、axe scan。
- 建议 owner/agent：Accessibility Agent。

### R-26：全局 snapshot 聚合带来刷新与重渲染压力

- 所属模块：Performance / Renderer state。
- 严重级别：P2。
- 置信度：中高。
- 证据文件路径：`src/main/services/dashboardService.ts`、`src/renderer/App.tsx`。
- 风险说明：`getSnapshot()` 聚合大量模块数据；多数 action 后仍可能 full refresh，renderer 持有单个大 snapshot。
- 根因判断：统一桌面状态模型便于一致性，但模块级 query/patch 粒度有限。
- 影响范围：数据增长后 UI 延迟、IPC payload 变大、重渲染增加。
- 是否影响 `.exe` 打包：不影响。
- 是否涉及安全/数据：否。
- 建议修复方案：保留 boot snapshot，但增加模块 query、incremental patch、normalized store。
- 推荐验证方式：renderer profiling、snapshot size benchmark、module refresh tests。
- 建议 owner/agent：Performance Agent。

### R-27：SQLite 迁移缺少版本记录、整体事务与锁恢复策略

- 所属模块：Database / Migration / Reliability。
- 严重级别：P2。
- 置信度：中高。
- 证据文件路径：`src/main/database/connection.ts`、`src/main/database/schema.ts`、`tests/database-migration.test.ts`。
- 风险说明：启动时 `runPreSchemaMigrations()`、`schemaSql`、`runAdditiveMigrations()` 直接串行执行，迁移包含多处 `ALTER TABLE`、`CREATE INDEX` 和数据补齐；未见独立 schema version 表、migration lock、整体事务包裹、失败状态记录、`journal_mode=WAL` 或 `busy_timeout` 策略。
- 根因判断：当前迁移是 additive-first 的桌面单进程路线，优先保证旧表补列能通过测试，但尚未补齐发布级失败恢复与重复启动锁冲突策略。
- 影响范围：用户升级、重复启动、Gateway 写日志、Data import/restore 或长事务场景中，若迁移中途失败或 DB 被锁，重启后的恢复语义不够明确。
- 是否影响 `.exe` 打包：影响发布可信度，尤其影响升级版安装后的首次启动 smoke。
- 是否涉及安全/数据：涉及本地 SQLite 数据一致性和恢复。
- 建议修复方案：引入 schema version / migration journal；将迁移步骤放入明确 transaction 或可恢复阶段；设置并测试 WAL/busy_timeout/single-instance 策略；保留 additive 兼容但记录每步状态。
- 推荐验证方式：迁移失败注入、重复启动锁占用测试、旧库升级矩阵、packaged first-run DB smoke。
- 建议 owner/agent：Database Reliability Agent。

### R-28：Observability 默认查询与导出可能带出过多敏感上下文

- 所属模块：Settings / Observability / Privacy。
- 严重级别：P2。
- 置信度：中高。
- 证据文件路径：`src/shared/observabilityRuntime.ts`、`src/main/services/observabilityService.ts`、`src/renderer/modules/SettingsPage.tsx`、`tests/observability-runtime.test.ts`、`tests/observability-store.test.ts`。
- 风险说明：`normalizeObservabilityQuery()` 默认 `includeAudit` 与 `includeTrace` 为 true，`queryObservability()` 会随默认查询返回 audit logs 和 execution trace。导出路径会包含 `evalSets`，而 `eval_sets.prompt` 是明文字段；当前通用 redaction 重点处理 secret/token/password 和 JSON 字符串中的 `"message"`，没有把对象 key `prompt` 明确视作受 `includePromptSnippets` 控制的敏感文本。Settings 中 retention policy 目前更像偏好/导出元数据，未见实际 purge 或查询过滤。
- 根因判断：Observability 以本地诊断完整性为优先，隐私开关和数据生命周期尚未细分到每类对象字段。
- 影响范围：本地导出、用户分享诊断包、截图/复制调试数据时，prompt、trace、audit 细节可能超出用户预期。
- 是否影响 `.exe` 打包：不阻塞生成安装包，但影响面向用户发布的隐私承诺和默认安全姿态。
- 是否涉及安全/数据：涉及用户 prompt、trace、audit、eval 数据。
- 建议修复方案：默认 query 不包含 audit/trace，除非 UI tab 或导出动作显式请求；把 `prompt|input|content|notes` 纳入隐私 redaction 策略；实现或改名 retention policy，避免暗示已自动清理。
- 推荐验证方式：默认 query 不含 audit/trace 测试；`evalSets.prompt` 导出脱敏测试；retention purge/query-filter 行为测试。
- 建议 owner/agent：Privacy / Observability Agent。

### R-29：当前 release 不是签名安装器，且安装脚本缺少危险路径保护

- 所属模块：Release / Packaging。
- 严重级别：P1。
- 置信度：高。
- 证据文件路径：`package.json`、`scripts/package-win-unpacked.mjs`、`scripts/create-installer-script.mjs`、`scripts/installer-smoke.mjs`、`docs/packaging/windows-installer-packaging-plan.md`、`.gitignore`。
- 风险说明：已有 `package:win-unpacked` 和 PowerShell installer script 方向，但无 NSIS/electron-builder 配置、无 code signing、无 auto-update。第二轮复核还发现生成的 PowerShell installer 接受 `-InstallRoot`，随后会清空该目录下所有内容；当前 smoke 只覆盖隔离目录，未验证 drive root、用户根目录、Desktop/Documents 等危险路径会被拒绝。
- 根因判断：打包路线仍在计划和 smoke 阶段。
- 影响范围：用户安装体验、SmartScreen、升级、卸载、发布可信度；若安装根目录误传，可能删除用户已有文件。
- 是否影响 `.exe` 打包：直接影响正式 `.exe` 发布，是安装器级阻塞项。
- 是否涉及安全/数据：涉及 artifact 内容排除、签名信任和用户本地文件安全。
- 建议修复方案：引入正式 installer config；定义 file exclusions、signing policy、update policy；先做 unsigned internal build，再做 signed release。PowerShell installer 继续保留时，必须拒绝 drive root、用户根、Desktop/Documents 等敏感目录，要求目标目录是 app-owned `NexaChat` 子目录，并优先采用 staging 替换已知 app 文件而不是清空任意目标目录。
- 推荐验证方式：package smoke、installer smoke、artifact content scan、signature verification；新增危险 `InstallRoot` 拒绝测试。
- 建议 owner/agent：Release Engineering Agent。

### R-30：Node `node:sqlite` 仍有 experimental warning

- 所属模块：Database / Runtime / Release。
- 严重级别：P2。
- 置信度：高。
- 证据文件路径：`src/main/database/connection.ts`、`docs/architecture/current-architecture.md`、`tests` 运行输出。
- 风险说明：项目使用 `node:sqlite`，测试运行时出现 experimental warning；Node 24 当前环境下 API 稳定性和打包运行时风险需要持续关注。
- 根因判断：选择 Node 内建 SQLite 减少依赖，但 API 仍处于实验状态。
- 影响范围：未来 Node/Electron runtime 升级、打包兼容、警告噪音。
- 是否影响 `.exe` 打包：可能影响 runtime 选择和发布说明。
- 是否涉及安全/数据：涉及本地数据库稳定性。
- 建议修复方案：锁定 Electron/Node runtime 验证矩阵；评估 better-sqlite3 或稳定替代；短期将 warning 记录为已知风险。
- 推荐验证方式：database migration tests、packaged smoke、Node/Electron version matrix。
- 建议 owner/agent：Database / Release Agent。

## 6. P0 / P1 阻塞项

未发现确认的 P0。

P1 阻塞项仅包含真正会影响长期架构与数据可信度的项：

- `ServiceContext` god-object 与启动期 eager DB 初始化：不阻塞生成内部 `.exe` smoke，但阻塞“可长期维护的正式 release”判断。它放大了安全、数据、Gateway、Knowledge 改动的交叉回归风险，也让 second-instance、迁移和启动失败场景更难证明安全。
- chat-first 外壳与 Dashboard/Workspace 兼容模型：不阻塞当前功能运行，但阻塞产品事实长期清晰化。若继续做 packaging/release，需要明确这是内部兼容模型，不是恢复 Workspace-first 产品。
- PowerShell installer 危险路径保护缺失：阻塞任何面向用户的安装器发布。当前脚本会清空传入 `InstallRoot` 下的内容，而 smoke 只覆盖隔离目录，尚未证明危险路径会被拒绝。

其他 P2/P3 多为 release gate、用户数据解释、可访问性、性能和文档准确性风险，不应包装成 P0，但在正式发布前应排期。

## 7. 架构与边界审计

当前架构的优点是事实源开始统一：README、current architecture、UI boundary、tests 都在强调 chat-first、7 modules、能力边界诚实。`serviceRegistry` 作为 facade 便于 renderer 通过统一 IPC 操作本地桌面状态。

主要风险在于实现边界仍是宽上下文：`ServiceContext` 内聚合 DB、repositories、permission、audit、retrieval、embedding、data mobility、secret、fixture execution 等横跨多个模块的 helper。`DashboardService(ServiceContext)` 仍是 mixin 链第一层，`getSnapshot()` 聚合几乎所有模块状态。更细的启动风险是 `registerIpcHandlers()` 早于 `requestSingleInstanceLock()`，而 IPC handler import 会触发 eager store/DB 初始化。该设计在单机桌面应用初期可接受，但随着 Gateway、RAG、MCP、Data restore 继续扩展，未来维护成本会上升。

建议采用“保留 facade，拆薄上下文”的路线，而不是一次性大重写。第一步应先把 single-instance lock 与 store 初始化顺序收紧；随后每次重构只移动一个 domain helper，并用 boundary tests 锁住行为。

## 8. Electron / IPC / preload 安全边界审计

已确认的安全控制：

- `contextIsolation: true`。
- `nodeIntegration: false`。
- preload 通过 `contextBridge.exposeInMainWorld('nexachat', api)` 暴露 allowlist API。
- 未暴露 raw `ipcRenderer`。
- 主进程 IPC 有集中 channel、arity/shape validation、`requirePermission`。
- `src/shared/securityRuntime.ts` 覆盖 IPC 到 permission 的映射。
- `tests/security-runtime.test.ts` 与 `tests/ipc-contract.test.ts` 对 permission map、payload arity/shape、raw IPC string 使用做了穷尽性和回归覆盖。
- 生产 renderer 通过 `nexachat://app/index.html` 加载，文档说明有 dist 路径保护和外链控制。

主要风险：

- `sandbox: false` 是安全基线短板。
- `nexachat://` 响应缺少 CSP，主 session 缺少显式 permission request handler。
- `AppApi` 面较宽，renderer compromise 后可尝试大量 privileged actions。第二轮复核未发现明显漏权限通道，风险更准确地说是“授权功能面较大”，不是“完全缺少权限映射”。
- 默认本地 session/RBAC 不能被理解为真实多用户认证。

建议下一步先做 Electron hardening 小任务：补 CSP、默认拒绝 permission request handler、扩展 `scan:security`，再做 sandbox compatibility branch。不要直接在 main 改 `sandbox` 配置而不跑完整 smoke matrix。

## 9. 数据库、迁移与本地数据审计

数据库 schema 覆盖 workspaces、providers、security、secrets、models、conversations、messages、request_logs、gateway、knowledge、tools、data mobility、audit、settings 等完整本地桌面域。`node:sqlite` 由主进程访问，符合本地优先桌面边界。

风险集中在三点：

- Workspace 兼容字段仍是核心数据结构，需要明确 legacy/default workspace 语义。
- Knowledge 删除以 chunk/file 过滤为主，embedding 状态同步可再加强。
- `node:sqlite` experimental warning 是发布环境风险，需要在 Electron runtime matrix 中持续验证。

第三轮复核补充了发布升级风险：当前启动路径在 `connection.ts` 中直接打开 `DatabaseSync`，再执行 pre-schema migrations、主 schema 和 additive migrations。迁移以 additive SQL 为主，有旧表补列和索引测试覆盖，但未见 schema version/journal、整体 transaction、migration lock、失败状态记录、`journal_mode=WAL` 或 `busy_timeout`。这不推翻现有迁移测试价值，但正式 `.exe` 升级前应补“迁移中途失败后重启恢复”和“重复启动/锁占用”验证。

## 10. Secret / API Key / 日志脱敏审计

已确认的正向控制：

- `safeStorage` 可用时加密保存 secret。
- 生产环境中 safeStorage 不可用会拒绝保存新 secret。
- redaction 覆盖 Bearer、`sk-`、`nxk_` 等模式和敏感 headers。
- audit export、observability export、diagnostics 默认 redacted。
- Gateway key 列表只保留 preview。

主要风险：

- `NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE=1` fallback 需要 release gate。
- Gateway auth 若 key 数量上升，逐条解密扫描会变慢。
- Cloud telemetry 字段默认 false，但未来若启用必须重新做隐私评审。

## 11. Chat 模块审计

已实现能力包括 conversation creation、send、retry、regenerate、cancel、favorite、pin、export、model selection、context policy、multi-model comparison、typed stream events、partial updates、fallback progressive reveal、reduced motion autoscroll。

风险：

- RAG retrieval 在 provider 前执行，首 token 可能延迟。
- 非 streaming provider 的流畅感来自 renderer progressive reveal，不等同于真实 token streaming。
- generation bubble 缺少明显 `aria-live`。
- 取消路径已处理 `activeChatControllers`，但 provider late-success 覆盖、Gateway streaming disconnect、UI source notice 和 provider abort 的一致性仍应继续用 tests 锁住。

## 12. Models / Provider 模块审计

Provider adapter registry 已支持 OpenAI-compatible、Anthropic native、Gemini native 的文本调用与错误映射。OpenAI-compatible 路径承担 embeddings/responses 能力，Anthropic/Gemini 当前不应被描述为支持 embeddings、tools、vision、responses。

风险在于 capability matrix 需要持续约束 UI、Gateway、Knowledge。任何新 provider feature 都应先进入 adapter capability flags，再进入 UI 和 Gateway docs。

第三轮复核还补充了 streaming 错误语义：OpenAI-compatible 与 native provider 路径均有 streaming happy path 测试，但 fetch headers 到达后 timeout/abort listener 会被清理，reader loop 未持续响应 cancel/timeout；坏 SSE chunk、provider error event、partial JSON 和 empty stream 的错误分类也偏粗。建议把 body-consumption timeout、AbortSignal 检查、reader cancel 和 parse failure 错误码一起补齐。

## 13. Gateway 模块审计

Gateway 当前 endpoints 与文档一致：`/v1/models`、`/v1/chat/completions`、`/v1/embeddings`、`/v1/responses` basic text。scope、body size、error mapping、usage/request log、Gateway audit 已具备基础。

主要风险：

- `/v1/responses` 不是完整 Responses API。
- Gateway chat/responses 复用 Chat `sendMessage()`，会持久化 conversations/messages。
- persisted `gateway.enabled` 与实际 listener 生命周期尚未形成重启恢复状态机。
- SSE client disconnect 未绑定 provider/chat cancellation。
- Gateway auth key 查找需要性能优化。
- 外部 OpenAI-compatible 客户端对 SSE、tool call、response schema 的边界预期需要 compatibility matrix。

## 14. Knowledge Base / RAG 审计

Knowledge Base 已有 text-like import、chunk、provider-backed embeddings、SQLite vector records、lexical fallback、retrieval traces、citations。文档和 UI 基本没有夸大 PDF/OCR/full vector DB。

主要风险：

- 不支持 PDF/Office/OCR。
- SQLite JSON vector + lexical fallback 在大规模和质量上有上限。
- 删除路径应同步 embedding 状态以提升审计一致性。
- UI 在无 embedding provider 时应预先说明 fallback，而不是先显示 vector。第二轮复核确认 README、current architecture、UI boundary 与 i18n 的 RAG 能力文案总体诚实，因此这是 P3 级 UI 状态一致性问题，不是文档造假。

## 15. Tools / Agent / MCP 审计

当前 Tools/MCP 方向是安全保守的：registration、permission、dry-run、fixture execution、approval、trace。真实执行仅 fixture，`mcp-tool` 和 `workflow` 是 reserved kinds，Agent stage 是 planned。

主要风险：

- granted/enabled 容易被误读为连接可执行。
- approval 无过期语义，未来接入真实执行前必须补。
- runs/traces 无分页，不利于长期诊断。
- 不能对外宣称 arbitrary MCP execution 或 full Agent sandbox。

第二轮复核确认，当前 i18n 已明确“注册/授权不代表真实 MCP 执行”，`mcp-tool` 与 `workflow` 仍是 reserved。剩余风险更准确地集中在 permission、connectivity、executable 三态没有完全拆清，而不是当前已经暴露危险执行。

## 16. Data / Backup / Restore 审计

Data 模块重视 redaction、confirmation phrase、preflight、rollback records 和 audit。已实现 encrypted backup package，但其 payload 仍 redacted；restore 更偏 preflight 和 metadata 层，不是 full database restore。

第二轮复核确认，Data 多写路径已经有 `ServiceContext` 事务/savepoint helper，且 `tests/data-runtime.test.ts` 覆盖了 import 中途失败时回滚 metadata 与 snapshot writes 的场景。因此 Data 的主要剩余风险不是“完全缺少事务”，而是 restore/rollback 命名和产品语义容易被误解为全库恢复。

建议把 UI 文案保持为“redacted encrypted package / restore preflight”，除非未来实现停机级 DB backup/restore。

## 17. Settings / Security / Audit / Observability 审计

Settings 覆盖主题、语言、密度、字体、reduced motion、security/audit/observability/evals/feedback 等。Audit 有 hash-chain integrity verification/export，Observability export 默认 redacted，cloud telemetry 默认 false。

风险：

- 观测数据保留策略需要随着真实用户数据增长继续细化。
- Export scopes 和 redaction 需要定期用 tests 防回归。
- 安全设置不能给用户制造“多用户云权限系统已完成”的误解。

第三轮复核发现，`normalizeObservabilityQuery()` 默认包含 audit 和 trace，适合完整诊断但隐私默认偏宽；`exportObservability()` 会包含 eval sets，而 eval prompt 是明文字段，当前通用 redaction 没有显式把对象 key `prompt` 视作 `includePromptSnippets` 控制的内容。Settings 中 retention policy 已可保存并进入导出元数据，但未见实际 purge/query filtering，因此 UI 语义应避免暗示已经自动清理历史观测数据。

## 18. UI / UX / 主题 / 可访问性 / i18n 审计

UI 方向符合紧凑桌面工具：7 module shell、command bar、module tabs、empty states、theme/language/reduced motion 支持，测试覆盖 theme token、i18n authority、UI smoke。

主要风险：

- Chat generation 缺少 `aria-live`。
- `tabpanel` 与 nav/button 语义不完全匹配。
- Knowledge retrieval “vector first”提示可能误导。
- Tools MCP authorization wording 可以更明确地区分授权、连接、执行。

## 19. 性能与流畅度审计

性能已有一些保守优化：Chat message virtual window、snapshot slice、repository limits、reduced motion、progressive reveal。风险仍在全局 snapshot、RAG pre-provider latency、Gateway auth linear scan、long history pagination、SQLite vector scan。

第二轮复核补充：Chat、Gateway、Knowledge、Audit 已有 PageResult 或加载更多路径，`tests/pagination-aggregation-repositories.test.ts` 覆盖 conversation/message、Gateway log、Audit log 和 usage trend SQL aggregation。未充分分页的重点是 Tools execution runs/steps/trace/approvals、Data mobility 历史、部分 Observability recent lists，以及 dashboard snapshot 中固定 recent slice 的长期诊断限制。

建议先补 instrumentation 和 benchmark，不建议在当前阶段做大规模状态重写。

## 20. 测试覆盖与质量审计

已存在测试覆盖：

- `tests/conversation-runtime.test.ts`
- `tests/gateway-runtime.test.ts`
- `tests/gateway-provider-chain.test.ts`
- `tests/provider-adapter.test.ts`
- `tests/knowledge-runtime.test.ts`
- `tests/execution-runtime.test.ts`
- `tests/data-runtime.test.ts`
- `tests/secret-storage.test.ts`
- `tests/redaction.test.ts`
- `tests/security-runtime.test.ts`
- `tests/observability-runtime.test.ts`
- `tests/ipc-contract.test.ts`
- `tests/renderer-api-boundary.test.ts`
- `tests/theme-token-authority.test.ts`
- `tests/i18n-authority.test.ts`
- `tests/ui-smoke.spec.ts`

本轮已运行：

- `npm.cmd run typecheck`：通过。
- `npm.cmd run test`：通过，26 files / 136 tests；运行期间出现已知 Node `node:sqlite` experimental warning。

未运行 build/package/release，因为用户明确禁止会生成或覆盖构建/发布产物的命令。

测试缺口：

- live provider credentials matrix。
- packaged app smoke 与 installer content scan。
- sandbox-on smoke。
- CSP / permission request handler / security gate tests。
- Gateway restart auto-listen 或 enabled-reset tests。
- Gateway client disconnect cancellation tests。
- provider stream abort-after-headers 与 slow body timeout tests。
- provider late-success after cancel tests。
- Chat progressive reveal notice source-condition tests。
- large RAG corpus benchmark。
- accessibility live-region/role tests。
- malformed SSE/provider streaming error tests。
- migration failure/DB lock recovery tests。
- observability eval prompt redaction 与默认 query privacy tests。

质量门方面，`scan:quality` 覆盖 hardcode、duplicates、security、dead links、docs 等检查，`verify:release` 也串联 typecheck/test/build/UI smoke/Electron smoke/package/release/scans/diff check。第三轮复核确认 docs gate 的强校验仍主要集中在 README 与少数 current docs 文件，不会系统扫描所有历史 docs 是否传播旧产品事实；这适合避免误伤历史记录，但不能替代发布前人工事实核对。

## 21. 发布、打包、安装器与自动更新审计

现有脚本提供 unpacked package 和 PowerShell installer script 路径，但不是完整签名 `.exe` 发布链：

- `package:win-unpacked` 会先 build，再运行 `scripts/package-win-unpacked.mjs`，该脚本会清理/重建 `release/win-unpacked`。
- `package:installer-script` 生成本地 PowerShell installer script。
- `package:release` 串联上述脚本。
- `.gitignore` 排除 `dist/`、`dist-electron/`、`release/`、`test-results/`、`*.log`、`NexaChatData/` 等。

本轮未运行这些脚本。正式发布前仍缺少：

- NSIS/electron-builder 或等价正式 installer 配置。
- Windows code signing。
- auto-update feed。
- artifact content scan。
- PowerShell installer dangerous-path guard。
- packaged production secret-storage smoke，不设置 `NEXACHAT_ELECTRON_SMOKE`，实际创建 provider/gateway key 并断言 `safeStorage:v1:`。
- clean checkout CI release。
- packaged userData isolation verification。

第二轮复核还确认，现有 `package-smoke` 和 `installer-smoke` 会设置 `NEXACHAT_ELECTRON_SMOKE=1`，这能验证打包启动路径，但不能证明普通生产运行时 `safeStorage` 一定可用。它们也主要验证启动、7 模块、preload、startup log、快捷方式和安装目录，不做 forbidden filename、secret pattern、SQLite/log/cache 排除扫描。

第三轮复核进一步确认，`docs/packaging/windows-installer-packaging-plan.md` 已建议正式 installer/content scan/NSIS 或 electron-builder 路线，但现有 `scripts/create-installer-script.mjs` 仍是本地 PowerShell 安装脚本，并明确不做 signing 或 NSIS packaging。该脚本接受 `-InstallRoot` 后清空目标目录内容，当前 installer smoke 只在隔离 `test-results` 子目录验证成功安装，未验证危险路径拒绝。因此在正式 `.exe` 前，dangerous path guard 和 artifact content scan 应视为 release gate。

## 22. 文档一致性、历史遗留与 mojibake 审计

当前事实源较清晰：`README.md`、`docs/architecture/current-architecture.md`、`docs/design/ui-product-boundary.md`、`docs/testing/validation-checklist.md`。

历史 docs 中仍有旧状态记录，例如某些 2026-05-20 之前/中间审计提到 `/v1/responses` reserved；当前事实是 basic text。历史记录可以保留，但后续引用必须优先 current docs。

第三轮复核确认，当前 README、current architecture、UI boundary 与 i18n 没有把 full RAG、任意 MCP、完整 Responses API、签名 installer 或云 telemetry 宣称为已完成。剩余文档风险主要是质量门覆盖边界：README/current docs 受控较强，历史 build plans/audit docs 更多依赖人工判断其语境是历史记录还是当前承诺。

本轮读技能文件时 PowerShell 输出出现 mojibake，这是技能文件读取环境编码显示问题，不代表项目文件已被本轮修改。当前项目中文 Markdown 应继续保持 UTF-8，避免 Windows shell 默认编码造成误读。

## 23. 代码体积、依赖与维护成本审计

依赖较克制：运行依赖只有 React、React DOM、lucide-react；开发依赖包括 Electron、Vite、TypeScript、Vitest、Playwright、Testing Library 等。代码体积主要来自自研 service/domain 层、mock API、i18n 字典、tests。

维护成本最高的区域：

- `ServiceContext` 和 service mixin chain。
- renderer 大 snapshot 和 module pages。
- `src/shared/i18n.ts` 大字典。
- Gateway/Provider/Knowledge/Data 的跨域 contracts。
- Packaging scripts 与 release docs 的同步。

建议维持“每次只拆一个边界”的策略，避免大爆炸式重写。

## 24. 适合立即修复的问题

- 为 Chat generation 增加 `aria-live` 或 `role="status"`。
- Knowledge retrieval 在无 embedding provider 时预先显示 lexical fallback。
- Tools MCP 状态文案拆分授权/连接/执行。
- Approval 增加默认 TTL 和过期测试。
- Knowledge 删除同步标记 embeddings deleted/stale。
- Gateway docs 增加 `/v1/responses` compatibility matrix。
- 发布 gate 增加 secret fallback env 检查。
- `tabpanel` 语义与导航 pattern 对齐。

## 25. 不建议当前修复的问题

- 不建议立即强行开启 Electron sandbox，除非配套完整 smoke matrix。
- 不建议把 Data restore 改成 full DB restore 的快改，需要停机恢复设计。
- 不建议直接引入重型外部 vector DB，应先做检索质量和规模评估。
- 不建议一次性重写 `ServiceContext`，应小步拆薄。
- 不建议在没有 signing credentials 和 release policy 时实现 code signing/auto-update。

## 26. 对后续 `.exe` 打包任务的影响

建议分三档推进：

1. 内部 unpacked smoke：可以继续，但要明确不是正式 `.exe` installer。
2. Unsigned installer trial：先补 installer config、artifact content scan、userData isolation、secret fallback gate、dangerous InstallRoot guard。
3. 正式发布：必须有 code signing、SmartScreen 预期说明、auto-update policy、clean checkout CI、packaged smoke、生产 secret-storage smoke、rollback/install/uninstall 测试。

当前不建议直接面向终端用户发布 `.exe`。

## 27. 建议的后续 Codex 任务拆分

- 任务 A：ServiceContext boundary narrowing 第 1 批，只移动 Knowledge embedding/retrieval helper。
- 任务 B：Gateway persistence policy，区分 external request 是否进入 Chat conversation。
- 任务 C：Chat accessibility pass，补 live region、role semantics、tests。
- 任务 D：Knowledge UX and deletion hygiene，修 fallback wording 与 embedding delete status。
- 任务 E：Tools/MCP permission semantics，拆分授权/连接/执行状态并补 TTL。
- 任务 F：Release readiness plan implementation，正式 installer config、content scan、secret fallback gate，但暂不签名。
- 任务 G：Sandbox compatibility spike，独立分支验证 `sandbox: true`。
- 任务 H：RAG parser roadmap，PDF/Office 安全文本提取，不碰 OCR。

## 28. 验证矩阵

| 验证项 | 本轮状态 | 说明 |
| --- | --- | --- |
| `git rev-parse --show-toplevel` | 已运行 | 确认为 NexaChat 根目录 |
| `git status --short` | 已运行 | 最终写入前无输出 |
| `git status -sb` | 已运行 | `## main...origin/main` |
| `.git/index.lock` | 已检查 | 不存在 |
| conflict markers search | 已运行 | 无命中 |
| repo-owned dev process check | 已运行 | 发现 Vite/esbuild dev 进程，因此未运行 build/package/release，也未干预进程 |
| `npm.cmd run typecheck` | 已运行，通过 | 无源码修改 |
| `npm.cmd run test` | 已运行，通过 | 26 files / 136 tests；有 `node:sqlite` experimental warning |
| `npm.cmd run build` | 未运行 | 用户禁止 build，会写入构建产物 |
| `npm.cmd run package:*` | 未运行 | 用户禁止 packaging，会写入 release |
| `npm.cmd run verify` | 未运行 | 会触发 build |
| `npm install/update/audit fix` | 未运行 | 用户禁止 |
| formatter/generator | 未运行 | 用户禁止 |

## 29. 审计限制与不确定性

- 未完整执行 3 小时；最终写稿前实际主动审计约 2 小时 17 分钟，但仍未达到完整 3 小时。限制来自当前会话上下文压缩、用户将 Agent 数量改为最多两个、已有仓库 dev 进程运行、以及禁止生成/覆盖构建产物的边界。
- 未运行 build/package/release，因此不声称 artifact 可用。
- 未使用真实 provider credentials，因此不声称 OpenAI/Anthropic/Gemini live matrix 通过。
- 未打开 Electron GUI 或 Playwright UI smoke，本轮只使用已存在测试结果和源码静态审计；`npm.cmd run test` 已通过但不覆盖 packaged app。
- 本报告不修改源码，所有建议均为后续任务方向。
- 历史文档保留历史事实，不能简单当作当前事实源；当前事实以 README、current architecture、UI boundary 和源码为准。

第二轮补充审计新增或修正的关键点：

- IPC 权限和 payload validation 覆盖比第一轮表述更强，当前风险重点是 API 暴露面宽，而不是发现漏权限通道。
- Data 已有事务/savepoint 与失败回滚测试；剩余风险重点是 restore/rollback 语义不是 full database restore。
- Knowledge fallback 和 Tools/MCP 文案总体诚实，剩余主要是 UI 状态模型和三态表达问题。
- 新增 P1 发布风险：PowerShell installer 对任意 `InstallRoot` 清空内容前缺少危险路径拒绝。
- 新增 release gate 风险：packaged smoke 使用 `NEXACHAT_ELECTRON_SMOKE=1`，不能证明生产 `safeStorage` 可用，也未做 artifact 内容/secret pattern 扫描。

第三轮补充审计新增或修正的关键点：

- 新增 P2 数据库可靠性风险：SQLite additive migrations 缺少 schema version/journal、整体事务/失败恢复记录、WAL/busy_timeout/重复启动锁恢复验证。
- 新增 P2 provider 风险：streaming parser 对 malformed SSE、partial JSON 和 provider error event 的错误分类偏粗，可能误归为 retryable `networkError`。
- 新增 P2 隐私风险：Observability 默认查询包含 audit/trace，`evalSets.prompt` 导出脱敏没有显式受 `includePromptSnippets` 控制，retention policy 尚不像真实清理策略。
- 补充测试/质量门边界：UI smoke 不覆盖 a11y live-region/axe；docs quality gate 主要保护 README/current docs，不会系统判定历史 docs 是否仍是当前承诺。

最终复核新增或修正的关键点：

- 新增 P1/P2 架构证据：IPC handler 注册早于 single-instance lock，并通过 eager store 导致 DB/ServiceContext 初始化提前发生。
- 新增 Electron hardening 缺口：`nexachat://` 响应缺少 CSP，主 session 缺少显式 permission request handler，`scan:security` 没有覆盖这两项。
- 新增 Gateway lifecycle 缺口：persisted `gateway.enabled` 不会在 app ready 自动恢复 listener；SSE client disconnect 未绑定上游取消。
- 新增 Chat UX 精确化：真实 `ipc-stream` 也会看到 progressive reveal notice，应按 `generation.source` 条件展示。

### 完成度审计清单

| 要求 | 证据 | 状态 |
| --- | --- | --- |
| 真实仓库根目录检测 | `git rev-parse --show-toplevel` 返回仓库根目录 | 完成 |
| 确认 NexaChat 仓库 | `package.json`、`README.md`、`src`、`tests`、`docs`、remote `2195573507-web/NexaChat.git` | 完成 |
| 捕获 branch/HEAD/origin/status/scripts/Node/npm/modules | 本报告第 1 节，最终 HEAD `f447cf2f237ae76c11e8dbf0397acaf3aea3eb70` | 完成 |
| 最多两个 Agent | 仅复用 Agent A 与 Agent B；第二/三轮没有新增 Agent | 完成 |
| 覆盖架构、安全、产品、Gateway、Chat、RAG、Tools、UI、性能、测试、发布、文档 | 本报告第 5-23 节与第二轮补充 | 完成 |
| Top 30 风险 | 第 5 节仍为 30 条 `R-01` 到 `R-30` | 完成 |
| 30 个指定章节 | `## 1` 到 `## 30` 均存在 | 完成 |
| 中文报告 | 报告正文为中文，证据路径保留代码英文名 | 完成 |
| 不改源码/runtime/config/tests/package/build | `git diff --name-only` 仅含本报告和 `PROJECT_PROGRESS.md` | 完成 |
| typecheck/test | `npm.cmd run typecheck` 与 `npm.cmd run test` 已通过；未伪造 build/package 结果 | 完成 |
| 不运行 build/package/release/install/update/formatter/destructive | 验证矩阵明确未运行；无对应产物变更 | 完成 |
| 写入报告并追加 trace | `docs/audits/deep-project-risk-audit-2026-05-20.md` 与 `PROJECT_PROGRESS.md` | 完成 |
| 提交与推送 | 第一轮提交 `ee396b4a82ca908398b5fe0fb0e05b0a920b1a63`、第二轮提交 `ed204a57ac1ca383e81f5a0938392207367a79d3` 已在历史中；最终补充将另行提交 | 进行中 |
| 3 小时目标 | 实际约 2 小时 17 分钟，未满 3 小时，报告明确记录限制和实际耗时 | 部分完成并如实说明 |

## 30. 结论

NexaChat 当前不是一个脆弱原型：它已经有清晰的本地优先方向、chat-first 产品事实、7 个顶层模块、集中的 IPC 权限映射、secret storage 防线、审计/脱敏基础、Gateway/RAG/Tools 的真实边界文案，以及较好的 test suite。

但它也还没有达到“可以直接正式发布签名 `.exe`”的状态。最需要警惕的不是单个小 bug，而是几个长期风险叠加：宽 `ServiceContext` 与启动期 eager DB 初始化、Dashboard/Workspace 兼容模型未完全降级、Gateway 外部 API 和 Chat 内部持久化耦合、Gateway listener/断连状态机不足、Electron sandbox 未启用且缺少 CSP/permission handler gate、SQLite 迁移/锁恢复策略不足、Observability 隐私默认边界偏宽、Data full restore 未实现、Tools/MCP 仍是 fixture-only、release installer/signing/update 仍不完整。

建议下一步先做 P1/P2 的小步 hardening，再推进 `.exe` 打包。内部 unpacked package smoke 可以继续；面向用户的正式 installer 应等 release gate、security gate 和 artifact validation 补齐后再做。
