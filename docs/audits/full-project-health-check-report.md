# NexaChat 全项目健康检查报告

## 基线

- 审计日期：2026-05-18。
- 实际项目根目录：由 `git rev-parse --show-toplevel` 在本机检测得到；报告不保留本机固定路径。
- 分支：`main`。
- 上游：`origin/main`。
- 起始 HEAD：`dc74830f84ed5022aeb7110a56a313e872ea0630`。
- 初始状态：工作树不干净，包含 theme/readability、UI smoke、long-click harness、审计/progress 文档改动。
- 闭环状态：截至本收尾审计，所有可执行 Top 20 项已有源码、文档或验证闭环；不可执行或不应实现的范围以 truthful boundary 标注。

## 当前真实产品边界

- 产品定位：本地优先、聊天优先、多模型 AI 桌面工作台。
- 顶层模块：Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings，合计 7 个。
- 根路由：`/ -> /chat/conversations`。
- 技术栈：Electron、React 19、TypeScript、Vite、SQLite via `node:sqlite`、preload IPC 隔离、本地 OpenAI-compatible Gateway。
- Gateway 当前支持 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`；`/v1/responses` 是 reserved 501。
- Knowledge Base 当前是 text-like import、chunk、lexical retrieval、citations；不是 PDF/Office/OCR/vector DB RAG。
- Tools / Agent / MCP 当前是 registration、permissions、dry-run、fixture execution、approval、trace/logging；不是任意工具或代码执行。
- Data rollback 当前是有限回滚记录能力，不是完整数据库恢复。

## Top 20 Issues

| # | 严重度 | 问题 | 当前处理 |
| --- | --- | --- | --- |
| 01 | P0 | 初始工作树不干净，阻断 clean commit/push | 已分类并按 scope 分批提交；最终工作树保持干净。 |
| 02 | P1 | `README.md` 与 `PROJECT_PROGRESS.md` 编码/可读性损坏 | 已重写为 UTF-8 中文当前事实源。 |
| 03 | P1 | 缺少当前架构/测试/设计 source-of-truth docs | 已新增 `docs/architecture/current-architecture.md`、`docs/testing/validation-checklist.md`、`docs/design/ui-product-boundary.md`。 |
| 04 | P1 | `ServiceContext` 职责过宽 | 已将 secret storage helper 拆到 `src/main/security/secretStorage.ts`，并用 characterization tests 约束边界；不改变 AppApi。 |
| 05 | P1 | service registry 深层 mixin 组合可读性弱 | 已保留 facade 和现有 registry 行为，补充 service boundary tests，避免高风险重写。 |
| 06 | P1 | IPC 运行期只做 arity 校验，缺少 payload shape validation | 已新增高风险 IPC payload runtime validators 和无效 payload 测试。 |
| 07 | P1 | `safeStorage` 不可用时 base64 fallback 容易被误解为加密 | 已改为生产阻断、开发/测试显式 fallback。 |
| 08 | P1 | Gateway `/v1/chat/completions` 外部 streaming 缺失 | 已为 `stream: true` 增加 OpenAI-compatible SSE；`/v1/responses` 保持 reserved 501。 |
| 09 | P1 | `/v1/responses` 需要持续标注 reserved | 已在 README/docs/UI 边界中明确 reserved 501。 |
| 10 | P1 | Knowledge 容易被误解为完整 RAG | 已在 README/docs/UI 边界中限定 text-like/lexical/citations。 |
| 11 | P1 | Tools/MCP/Agent 容易被误解为任意执行平台 | 已在 README/docs/UI 边界中限定 dry-run/fixture/approval/trace。 |
| 12 | P1 | Data rollback 容易被误解为完整数据库恢复 | 已在 README/docs/UI 边界中限定为有限回滚记录。 |
| 13 | P2 | Renderer 默认 full snapshot refresh 有性能风险 | 已先将 Models 高频生命周期操作改为 API result patch，测试覆盖不触发额外 `getSnapshot()`。 |
| 14 | P2 | Dashboard/Workspace 旧命名影响 chat-first 心智 | 已清理用户可见旧标签，保留内部兼容类型和历史数据结构。 |
| 15 | P2 | Provider/Model 生命周期不完整 | 已补 model update/enable/disable/soft delete，不硬删历史，保留 `model_name_snapshot`。 |
| 16 | P2 | `src/renderer/mockApi.ts` 体量大且复制主进程语义 | 已抽出 `src/renderer/mockApiModels.ts`，并保留 AppApi 覆盖测试。 |
| 17 | P2 | `scan:quality` 被测试 secret 字面量和 long-click script child_process 阻断 | 已替换 fake secret fixture，并把 controlled test tooling 纳入质量门 allowlist。 |
| 18 | P2 | 根目录旧过程文档误导当前事实源 | 已移除 stale root process docs，保留当前 source-of-truth docs。 |
| 19 | P2 | 本地生成产物存在，仓库卫生需复查 | 已确认 `.gitignore` 覆盖 generated/runtime artifacts，且未 tracked/staged。 |
| 20 | P2 | 最终 build/electron smoke/full matrix 未闭合 | 已完成最终验证矩阵并确认 Electron smoke 渲染 NexaChat shell。 |

## 已验证命令

- `git rev-parse --show-toplevel` -> 本机 NexaChat 仓库根目录。
- `git branch --show-current` -> `main`。
- 起始 `git rev-parse HEAD` -> `dc74830f84ed5022aeb7110a56a313e872ea0630`。
- `git rev-parse --abbrev-ref --symbolic-full-name @{u}` -> `origin/main`。
- `git diff --check` -> 通过，只有 CRLF 提示。
- `npm.cmd run typecheck` -> 通过。
- `npm.cmd run test -- tests/theme-token-authority.test.ts` -> 通过。
- `npm.cmd run test:ui-smoke` -> 通过。
- `node --check scripts/long-click-test.mjs` -> 通过。
- `node scripts/long-click-test.mjs --minutes 1 --agents 2 --run-id 2026-05-18-reload-lifecycle-smoke` -> 通过，`issues: []`。
- `npm.cmd run scan:quality` -> 通过。
- `npm.cmd run test -- tests/ipc-contract.test.ts` -> 通过。
- `npm.cmd run test -- tests/secret-storage.test.ts tests/redaction.test.ts` -> 通过。
- `npm.cmd run test -- tests/i18n-authority.test.ts tests/app.test.tsx` -> 通过。
- `npm.cmd run test` -> 通过，26 个 test files / 123 tests。
- `npm.cmd run build` -> 通过。
- `npm.cmd run test:electron-smoke` -> 通过，Electron smoke rendered the NexaChat shell。

## 最终验证矩阵

闭环轮已运行：

- `git diff --check`
- `npm.cmd run typecheck`
- `npm.cmd run scan:quality`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run test:ui-smoke`
- `npm.cmd run test:electron-smoke`

本次文档收尾以同一矩阵复核作为最终证据。
