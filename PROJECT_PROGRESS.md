# NexaChat 当前进度

## 2026-05-20 RAG hardening 主线程收束

- 本轮在用户要求后停止继续使用智能体，后续实现、测试、验证、提交和推送均由主线程完成。
- 核心收束：移除 native provider 模型列表伪成功 fallback；增强 provider/Gateway/embedding 错误脱敏；Gateway 对外 provider 错误统一为通用失败信息；Chat 成功/失败都写入一致 usage 记录。
- Knowledge Base 收束：保留 text-like 导入边界；provider-backed embeddings 失败时不造假向量；索引缺失 vector 会失败而不是静默 lexical 替代；retrieval trace 增加候选、fallback/error、timing、rerank disabled 合约字段。
- UI 收束：Knowledge 页面以紧凑桌面工具风格展示 embedding provider/model、Gateway `/v1/embeddings` readiness、最近 embedding 状态和 retrieval preview trace/timing/fallback 信息。
- 迁移和测试：补齐 legacy `knowledge_chunks.knowledge_base_id` 迁移、RAG 相关索引、unsupported format、Gateway embeddings、vector-first、lexical fallback、citation metadata、secret redaction、usage consistency、rerank disabled/error、Chat 无知识库回归等覆盖。
- 仍未完成且不得夸大：PDF/Office/OCR、真实 rerank provider、外部/专用 vector DB、任意 MCP/tool/code 执行、Agent sandbox、workflow runtime、Electron sandbox enablement。

## 2026-05-20 RAG hardening 文档交接

- 角色：Agent 14 Documentation Agent，仅更新 RAG hardening 相关必要文档，不修改源码、配置、依赖或测试。
- 本轮处理：补充本进度记录；复核 README 现有能力边界已准确，无需改动；更新 RAG foundation implementation map 为当前事实口径。
- 当前真实能力口径：Knowledge Base 支持 text-like 导入、chunk、本地 SQLite JSON vector 记录、配置支持 embeddings 的 OpenAI-compatible provider 时的 vector 检索、lexical fallback、retrieval trace 与结构化 citation；Chat 会通过主进程检索链路注入 context 并持久化 citation。
- 仍未完成且不得夸大：PDF/Office/OCR、真实 rerank provider、外部/专用 vector DB、任意 MCP/tool/code 执行、Agent sandbox、workflow runtime、Electron sandbox enablement。
- 验证：本轮只做文档复核与 diff 检查；未运行源码测试矩阵。

## 2026-05-20 RAG foundation 与检索审计链

- 任务名称：从当前 pushed baseline 继续补齐未完成能力，优先实现生产级 RAG foundation 的安全基础。
- 实际项目根目录：已通过 `git rev-parse --show-toplevel` 确认；仓库内文档不写入本机固定路径。
- 分支与上游：`main` / `origin/main`。
- 起始 HEAD：`52dd6c9fbe1e93bb21f1873e9f82877ccc1bf208`；用户给定旧基线 `2cbe9fdc224c8372671f0af26ee42775582ebf56` 已确认仍在历史中。
- 工具/技能状态：已读取 `using-superpowers`、`brainstorming`、`planning-with-files`、`ralph-loop`、`impeccable`、`webapp-testing`；单数名 `using-superpower` 对应的 skill 不存在，已使用可用的 `using-superpowers`；MCP resources/templates 为空；`impeccable` context loader 未发现 PRODUCT/DESIGN 文件。
- 本轮完成阶段：Phase 0 baseline audit 和 RAG implementation map；Phase 1 OpenAI-compatible provider-backed embeddings 基础；Phase 2 SQLite 本地 vector 记录和 cosine 检索基础；Phase 3 rerank-ready retrieval pipeline、retrieval trace 和 score/timing/error audit fields；Phase 4 Chat 继续通过主进程 retrieval/context/provider/citation 持久化路径挂接真实 citation；Phase 5 usage record 字段统一基础；Phase 9 MCP/Agent/runtime 安全边界计划文档。
- 本轮主要实现：
  - OpenAI-compatible `/embeddings` adapter 调用真实 provider endpoint，带 usage、latency、retry、错误映射和 secret redaction；Anthropic/Gemini native embeddings 明确 unsupported。
  - Provider adapter capabilities 增加 `supportsChat`、`supportsStreaming`、`supportsModels`、`supportsEmbeddings`、`supportsResponses`，并保留旧字段兼容。
  - Knowledge import/rebuild 在配置支持 embeddings 的 OpenAI-compatible 模型时生成 provider-backed vectors；无可用 embedding 模型或 provider 失败时保留明确 lexical fallback。
  - SQLite schema/migration 扩展 `usage_records` 和 `knowledge_retrieval_traces` 审计字段；embedding vectors 继续存储在本地 SQLite `knowledge_embeddings.vector_json`。
  - Retrieval 默认 vector-first，记录 provider/model、knowledge scope、candidate counts、final citation count、score summary、timings、error/fallback reason，并返回可审计 citation。
  - Gateway `/v1/embeddings` 不再返回本地假向量；未配置 embedding provider/model 时返回明确 `invalid_request`，上游失败映射为 provider error。
  - Chat usage、Gateway usage、embedding usage、eval usage 共享 request type、total tokens、estimated flag、latency、status、error code 等字段。
- 本轮新增/更新文档：
  - `docs/build-plans/00-modular-refactor-master-plan/rag-foundation-implementation-map.md`
  - `docs/build-plans/04-agent-workflow-and-mcp/mcp-agent-runtime-implementation-plan.md`
  - `README.md`
  - `docs/architecture/current-architecture.md`
  - `docs/design/ui-product-boundary.md`
  - `docs/build-plans/00-modular-refactor-master-plan/capability-completion-roadmap.md`
  - `docs/audits/full-project-health-check-report.md`
- 本轮主要源码变更：`src/main/adapters/openAiCompatibleAdapter.ts`、`src/main/adapters/providerAdapterRegistry.ts`、`src/main/database/schema.ts`、`src/main/database/connection.ts`、`src/main/repositories/mappers.ts`、`src/main/services/serviceContext.ts`、`src/main/services/knowledgeService.ts`、`src/main/services/chatService.ts`、`src/main/services/localGateway.ts`、`src/main/services/providerDiscovery.ts`、`src/main/services/observabilityService.ts`、`src/shared/providerRuntime.ts`、`src/shared/knowledgeRuntime.ts`、`src/shared/types.ts`、`src/shared/ipc.ts`、`src/renderer/modules/KnowledgePage.tsx`、`src/renderer/modules/GatewayPage.tsx`、`src/renderer/mockApi.ts`。
- 本轮新增/更新测试：`tests/provider-adapter.test.ts`、`tests/provider-discovery.test.ts`、`tests/knowledge-runtime.test.ts`、`tests/gateway-runtime.test.ts`、`tests/gateway-provider-chain.test.ts`、`tests/database-migration.test.ts`、`tests/ipc-contract.test.ts`、`tests/redaction.test.ts`、`tests/pagination-aggregation-repositories.test.ts`、`tests/provider-store-integration.test.ts`、`tests/observability-runtime.test.ts`、`tests/app.test.tsx`。
- 已运行验证：
  - `npm.cmd run typecheck`：通过。
  - 定向测试 `npm.cmd run test -- tests/provider-adapter.test.ts tests/provider-discovery.test.ts tests/knowledge-runtime.test.ts tests/gateway-runtime.test.ts tests/gateway-provider-chain.test.ts tests/database-migration.test.ts tests/ipc-contract.test.ts tests/redaction.test.ts tests/pagination-aggregation-repositories.test.ts tests/provider-store-integration.test.ts tests/observability-runtime.test.ts`：通过，11 files / 51 tests。
  - `npm.cmd run test`：通过，26 files / 136 tests。
  - `npm.cmd run build`：通过。
  - `npm.cmd run test:ui-smoke`：通过，7 tests。
  - `npm.cmd run test:electron-smoke`：通过，Electron smoke rendered the NexaChat shell。
  - `npm.cmd run scan:quality`：首次因根目录临时 `task_plan.md`、`findings.md`、`progress.md` 失败；删除过程文件后通过。
- 已知 warning：Vitest 数据库测试仍输出 Node `node:sqlite` experimental warning；`git diff --stat`/后续 diff 检查在 Windows 上可能输出 CRLF normalization warnings。
- 权限/网络/凭据 blocker：本轮没有遇到必须停止实现的本地权限 blocker；没有真实外部 provider API key，因此 provider-backed embedding 通过本地测试 upstream 验证，未对真实云端账号做 live API 测试。
- 本轮仍未完成并不得夸大：完整 OpenAI Responses API；tools/multimodal/background/advanced reasoning；PDF/Office/OCR import；真实 rerank provider；外部/专用 vector DB；Data full restore/cleanup hardening；Electron sandbox enablement；真实 MCP executor；Agent sandbox；workflow runtime。
- 仓库卫生：已删除 planning skill 产生的根目录过程文件 `task_plan.md`、`findings.md`、`progress.md`，避免质量门和事实源混淆。
- 最终提交与推送：提交 hash 和 push 结果无法写入同一个自引用提交；本轮提交后将以最终中文报告和 `git rev-parse HEAD` / `git rev-parse origin/main` 的实际输出为准记录。

## 2026-05-20 Roadmap 能力补全实现

- 任务名称：按 `docs/build-plans/00-modular-refactor-master-plan/capability-completion-roadmap.md` 补齐可行能力。
- 实际项目根目录：通过 `git rev-parse --show-toplevel` 检测，最终绝对路径见本轮中文报告；仓库内文档不写入本机固定路径。
- 分支与上游：`main` / `origin/main`。
- 上一轮文档提交推送：本轮开始先执行 `git push origin main`，结果为 `Everything up-to-date`。
- 本轮已实现：Gateway `/v1/responses` basic text；Chat typed stream / IPC partial 基础链路状态同步；Provider adapter registry；Anthropic native 与 Gemini native 第一版文本 chat、基础 streaming、模型列表或 fallback、API key 验证、错误映射；相关 UI/i18n 能力边界文案。
- 本轮保持未完成并诚实标注：完整 OpenAI Responses API、tools/multimodal/background/reasoning；PDF/Office/OCR；真实 rerank；Data full restore/cleanup；Electron sandbox；真实 MCP/Agent sandbox/workflow runtime。后续 RAG foundation 迭代已补齐 embedding/vector 基础，最新状态见上方 RAG foundation 章节。
- 新增/更新测试：Gateway basic responses 成功、scope/validation/日志；统一 provider chain；Anthropic/Gemini native adapter；provider store 集成；Gateway UI/i18n 和 UI smoke。
- 验证结果：`npm.cmd run typecheck` 通过；相关能力定向 Vitest 通过，9 files / 64 tests；`npm.cmd run test` 通过，26 files / 132 tests，仅有既有 `node:sqlite` experimental warning；`npm.cmd run build` 通过；`npm.cmd run test:ui-smoke` 通过，7 tests；`npm.cmd run test:electron-smoke` 通过；`npm.cmd run scan:quality` 通过；`git diff --check` 通过，仅 CRLF normalization warnings。
- 提交与推送：本条记录将随本轮最终提交进入 `main` 并推送到 `origin/main`；实际 commit hash、push 结果和最终 `git status` 以最终中文报告为准。

## 2026-05-20 全项目健康体检与修复

- 任务名称：全项目健康体检与确认问题修复。
- 时间：2026-05-20 13:29 至最终提交推送完成。
- 实际项目根目录：由 Git 根目录检测得到；历史记录不保留本机固定路径。
- 分支与上游：`main` / `origin/main`。
- 基线提交：`56de597a2ebde458714043095d6114b0d6f04247`。
- 最终提交：历史记录未在该提交内自引用写入 hash，实际 hash 以对应轮次最终报告和 `git rev-parse HEAD` 为准。
- 审计范围：产品事实、架构与分层、主进程/预加载/渲染边界、IPC 契约、SQLite/Data 事务、Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings、UI/UX/可访问性、性能热点、测试、文档真实性、质量门与打包准备度。
- 发现数量：P0=0，P1=2，P2=4，P3=1。
- 主要修复：修复 UI smoke 固定端口导致的误失败；补齐当前 Observability/Chat/Knowledge/Data/Gateway 等 IPC payload shape validation；为 Data 多写入路径增加嵌套写事务和失败回滚测试；修复 Gateway SSE 在 JSON upstream 模式下空流的问题；删除会触发质量门失败的根目录临时计划文件。
- 验证结果：`npm.cmd run typecheck` 通过；`npm.cmd run test` 通过，26 files / 127 tests，仅有已知 `node:sqlite` experimental warning；`npm.cmd run build` 通过；`npm.cmd run test:ui-smoke` 通过，7 tests；`npm.cmd run test:electron-smoke` 通过；`npm.cmd run scan:quality` 通过；`npm.cmd run lint` 和 `npm.cmd run format:check` 不存在；`git diff --check` 通过，仅 CRLF normalization warnings。
- 剩余风险：`ServiceContext` 仍偏宽，需单独架构迭代；Electron `sandbox: false` 仍需专门兼容性验证；Node 24 `node:sqlite` experimental warning 仍存在；UI smoke 不是所有真实外部 Provider/数据破坏路径的人工 QA 替代。
- 审计报告：`docs/audits/full-project-health-remediation-2026-05-20.md`。
- 推送状态：历史记录的推送结果以对应轮次最终报告和远端校验为准。

## 2026-05-20 集成质量提升迭代

- 时间：2026-05-20 12:09 至最终验证完成。
- 实际项目根目录：由 Git 根目录检测得到；历史记录不保留本机固定路径。
- 分支与上游：`main` / `origin/main`。
- 基线提交：`5acc4bc00cd1a0deca1f1f3aab34da778146e16b`。
- 主要实现提交：`78c5b738dc431def216af36fb5105668325e190a`。最终本地 HEAD 以本轮结束时 `git rev-parse HEAD` 和最终报告为准。
- 变更摘要：扩展 README 为当前事实入口；补充 Electron sandbox/IPC 安全边界说明；拆开 service registry 深层 mixin 链；修正非交互主题图标语义；为 Gateway 用量趋势增加可访问摘要；补强 Knowledge 可读性对比检查；更新测试与质量门。
- 文档变更：`README.md`、`PROJECT_PROGRESS.md`、`docs/architecture/current-architecture.md`、`docs/testing/validation-checklist.md`、`docs/design/ui-product-boundary.md`、`docs/audits/full-project-health-check-report.md`、`docs/audits/integrated-quality-score-improvement-report.md`。
- 主进程与服务变更：`src/main/index.ts`、`src/main/services/serviceRegistry.ts`。
- UI 与 i18n 变更：`src/renderer/components/AppFrame.tsx`、`src/renderer/modules/GatewayPage.tsx`、`src/renderer/styles/components.css`、`src/renderer/styles/pages.css`、`src/renderer/styles/shell.css`、`src/shared/i18n.ts`。
- 测试与脚本变更：`tests/app.test.tsx`、`tests/desktop-entry.test.ts`、`tests/store-boundaries.test.ts`、`tests/ui-smoke.spec.ts`、`scripts/quality-gates.mjs`。
- 已完成的定向验证：`npm.cmd run typecheck` 通过；`npm.cmd run test -- tests/store-boundaries.test.ts tests/desktop-entry.test.ts tests/app.test.tsx tests/i18n-authority.test.ts` 通过，4 files / 39 tests；`npm.cmd run scan:hardcode` 通过。
- 最终验证矩阵：
  - `npm.cmd run typecheck`：通过。
  - `npm.cmd test`：通过，26 files / 125 tests；Node 在数据库测试中输出已知 `node:sqlite` experimental warning。
  - `npm.cmd run build`：通过，renderer 和 main build 均完成。
  - `npm.cmd run test:ui-smoke`：通过，7 tests。
  - `npm.cmd run test:electron-smoke`：通过，Electron smoke rendered the NexaChat shell。
  - `npm.cmd run scan:quality`：通过，all scans。
  - `git diff --check`：通过，仅有 CRLF normalization warnings。
- 推送状态：已提交到本地 `main`，但推送到 `origin/main` 未成功；`git push` 报 `Recv failure: Connection was reset`，重试 `git push origin main` 和 `git ls-remote origin refs/heads/main` 报无法连接 `github.com:443`；`Test-NetConnection github.com -Port 443` 显示 `TcpTestSucceeded: False`。本地 `main` 已领先 `origin/main`，等待网络恢复后推送。
- 剩余风险：`ServiceContext` 仍然偏宽；Electron `sandbox: false` 仍需单独兼容性迭代；性能设计只做了保守提升，没有进行全局状态架构重写；历史审计记录保留为历史，不应被当作最新事实源。
- 编码说明：主动维护的中文 Markdown 已保持 UTF-8，并为关键中文 Markdown 写入 UTF-8 BOM，降低 Windows PowerShell 默认读取时的乱码风险。

## 2026-05-18 主题可读性与长点击任务闭环

- 实际项目根目录：由 Git 根目录检测得到；历史记录不保留本机固定路径。
- 起始 HEAD：`dc74830f84ed5022aeb7110a56a313e872ea0630`。
- 已保留历史长点击证据：`test-results/long-click/2026-05-18-theme-readability-2h/results.json` 与 `results.md`，记录 121.12 分钟、6 个 agents、99 个真实点击功能、7 个模块和 Shared shell 覆盖。
- 已修复主题可读性问题：placeholder、disabled、selected、primary/status foreground/background 语义 token，暗色状态 pill/notice，`.app-frame` 文本继承，命令栏和 shell surface。
- 已修复 copy helper 层级：`copyText` 移到 `src/renderer/clipboard.ts`，避免 shell 组件反向依赖模块聚合文件。
- 已修复 long-click harness reload 生命周期：稳定 app-ready 检测、根路由恢复、失败截图/详情记录、进度目录重建、资源释放和固定命令 allowlist。
- 已完成阶段验证：`git diff --check`、`npm.cmd run test -- tests/theme-token-authority.test.ts`、`npm.cmd run typecheck`、`npm.cmd run test:ui-smoke`、`node --check scripts/long-click-test.mjs`、`node scripts/long-click-test.mjs --minutes 1 --agents 2 --run-id 2026-05-18-reload-lifecycle-smoke`。

## 2026-05-18 当前审计闭环

- 当前 source-of-truth 文档：`README.md`、`docs/architecture/current-architecture.md`、`docs/testing/validation-checklist.md`、`docs/design/ui-product-boundary.md`。
- 当前审计报告：`docs/audits/full-project-health-check-report.md`。
- 根目录旧过程文件 `task_plan.md`、`findings.md`、`progress.md` 是 Provider Smart Add 历史过程产物，不再作为当前事实源保留。
- 已完成质量门和安全边界修复：`scan:quality` 通过；高风险 IPC payload 已加入 runtime shape validation；`safeStorage` 不可用时生产环境阻断保存新 secret，开发/测试 fallback 有显式标记。
- 已清理用户可见旧能力标签：Workspace/Dashboard 文案不再作为当前入口心智，夸大的 RAG 与 Agent 执行标签改为明确的能力边界标签。
- 已完成模型生命周期、Gateway chat streaming、Knowledge/Data 边界、service helper 拆分、renderer snapshot 局部 patch、mock API 模型域拆分和 generated artifact 卫生检查。
- 已完成最终验证矩阵：`git diff --check`、`npm.cmd run typecheck`、`npm.cmd run scan:quality`、`npm.cmd run test`、`npm.cmd run build`、`npm.cmd run test:ui-smoke`、`npm.cmd run test:electron-smoke`。
- 已推送实现闭环到 `origin/main`，远端 `main` 确认为 `920e821127331778a1969159fb2de84a112f6053`；最终文档审计修正作为独立收尾提交记录。
- 后续变更必须继续保持 chat-first 7 模块、`/ -> /chat/conversations`、本地优先、能力标签诚实和 preload IPC 隔离。

## 2026-05-20 深度项目风险审计

- 审计报告：`docs/audits/deep-project-risk-audit-2026-05-20.md`；实际审计约 60 分钟，用户将并行 Agent 限制为最多 2 个；未修改源码、测试、配置、依赖、构建或发布产物。
- 验证：`npm.cmd run typecheck` 通过；`npm.cmd run test` 通过；未运行 build/package/release，因为本轮只允许审计文档输出。HEAD：`9ff96dfcd1ea62d32c53d553d768e64f1b9fb392`；写入前 `git status --short` 为空。
- 第二轮只读复核已追加到同一报告：复用原 2 个 Agent，不新增 Agent；补充 PowerShell installer dangerous `InstallRoot` P1 风险、packaged smoke/production secret-storage gate、IPC/Data/Knowledge/Tools 细节修正；仍未修改任何源码或运行 build/package/release。
- 第三轮只读复核已追加到同一报告：继续复用原 2 个 Agent，不新增 Agent；总审计耗时约 84 分钟，补充 SQLite 迁移/锁恢复、provider streaming 错误分类、Observability 导出隐私、docs/quality gate 边界；仅修改审计报告和本进度 trace，未修改源码、测试、配置、依赖、构建或发布产物；未重新运行 build/package/release；第三轮写入前 HEAD 为 `ed204a57ac1ca383e81f5a0938392207367a79d3`，`git status --short` 为空。
- 最终只读复核已追加到同一报告：仍只使用 2 个 Agent；总主动审计约 2 小时 17 分钟，未满 3 小时并已在报告中说明原因；补充启动期 eager DB 初始化、Electron CSP/permission handler gate、Gateway restart/disconnect lifecycle、provider abort-after-headers、Chat progressive reveal source notice 等风险；未修改源码、测试、配置、依赖、构建或发布产物；验证沿用本轮已通过的 `npm.cmd run typecheck` 与 `npm.cmd run test`，未运行 build/package/release；最终写入前 HEAD 为 `f447cf2f237ae76c11e8dbf0397acaf3aea3eb70`，`git status --short` 为空。
