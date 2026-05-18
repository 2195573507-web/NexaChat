# NexaChat 全项目健康检查报告

## 基线

- 审计日期：2026-05-18。
- 实际项目根目录：`D:/NexaChat`。
- 分支：`main`。
- 上游：`origin/main`。
- 起始 HEAD：`dc74830f84ed5022aeb7110a56a313e872ea0630`。
- 初始状态：工作树不干净，包含 theme/readability、UI smoke、long-click harness、审计/progress 文档改动。

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
| 01 | P0 | 初始工作树不干净，阻断 clean commit/push | 已分类为 theme/UI、audit/progress、generated/runtime 三类；后续按 scope 分 commit。 |
| 02 | P1 | `README.md` 与 `PROJECT_PROGRESS.md` 编码/可读性损坏 | 已重写为 UTF-8 中文当前事实源。 |
| 03 | P1 | 缺少当前架构/测试/设计 source-of-truth docs | 已新增 `docs/architecture/current-architecture.md`、`docs/testing/validation-checklist.md`、`docs/design/ui-product-boundary.md`。 |
| 04 | P1 | `ServiceContext` 职责过宽 | 后续以小 helper 拆分和 characterization tests 简化，不改变 AppApi。 |
| 05 | P1 | service registry 深层 mixin 组合可读性弱 | 后续保留 facade，收敛为更清晰 composition root。 |
| 06 | P1 | IPC 运行期只做 arity 校验，缺少 payload shape validation | 后续新增轻量 runtime validators 和无效 payload 测试。 |
| 07 | P1 | `safeStorage` 不可用时 base64 fallback 容易被误解为加密 | 后续改为生产阻断、开发/测试显式 fallback。 |
| 08 | P1 | Gateway `/v1/chat/completions` 外部 streaming 缺失 | 后续仅为 `stream: true` 增加 SSE；`/v1/responses` 保持 501。 |
| 09 | P1 | `/v1/responses` 需要持续标注 reserved | 已在 README/docs/UI 边界中明确 reserved 501。 |
| 10 | P1 | Knowledge 容易被误解为完整 RAG | 已在 README/docs/UI 边界中限定 text-like/lexical/citations。 |
| 11 | P1 | Tools/MCP/Agent 容易被误解为任意执行平台 | 已在 README/docs/UI 边界中限定 dry-run/fixture/approval/trace。 |
| 12 | P1 | Data rollback 容易被误解为完整数据库恢复 | 已在 README/docs/UI 边界中限定为有限回滚记录。 |
| 13 | P2 | Renderer 默认 full snapshot refresh 有性能风险 | 后续针对高频 action 改成局部 patch/targeted query。 |
| 14 | P2 | Dashboard/Workspace 旧命名影响 chat-first 心智 | 后续清理用户可见旧标签，保留必要内部兼容。 |
| 15 | P2 | Provider/Model 生命周期不完整 | 后续补 model update/enable/disable/soft delete，不硬删历史。 |
| 16 | P2 | `src/renderer/mockApi.ts` 体量大且复制主进程语义 | 后续按领域拆分并保留 AppApi 覆盖测试。 |
| 17 | P2 | `scan:quality` 被测试 secret 字面量和 long-click script child_process 阻断 | 后续替换 fake secret fixture，并把 controlled test tooling 纳入质量门 allowlist。 |
| 18 | P2 | 根目录旧过程文档误导当前事实源 | 已判定 `task_plan.md`、`findings.md`、`progress.md` 为 stale process docs，后续移出 tracked root。 |
| 19 | P2 | 本地生成产物存在，仓库卫生需复查 | 后续确认 `.gitignore` 与 tracked 状态，不 staging generated artifacts。 |
| 20 | P2 | 最终 build/electron smoke/full matrix 未闭合 | 后续执行完整验证矩阵后再 commit/push。 |

## 已验证命令

- `git rev-parse --show-toplevel` -> `D:/NexaChat`。
- `git branch --show-current` -> `main`。
- `git rev-parse HEAD` -> `dc74830f84ed5022aeb7110a56a313e872ea0630`。
- `git rev-parse --abbrev-ref --symbolic-full-name @{u}` -> `origin/main`。
- `git diff --check` -> 通过，只有 CRLF 提示。
- `npm.cmd run typecheck` -> 通过。
- `npm.cmd run test -- tests/theme-token-authority.test.ts` -> 通过。
- `npm.cmd run test:ui-smoke` -> 通过。
- `node --check scripts/long-click-test.mjs` -> 通过。
- `node scripts/long-click-test.mjs --minutes 1 --agents 2 --run-id 2026-05-18-reload-lifecycle-smoke` -> 通过，`issues: []`。

## 剩余验证

最终提交前必须重新运行：

- `git diff --check`
- `npm.cmd run typecheck`
- `npm.cmd run scan:quality`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run test:ui-smoke`
- `npm.cmd run test:electron-smoke`
