# NexaChat 当前进度

## 2026-05-20 集成质量提升迭代

- 时间：2026-05-20 12:09 至最终验证完成。
- 实际项目根目录：`D:/NexaChat`。
- 分支与上游：`main` / `origin/main`。
- 基线提交：`5acc4bc00cd1a0deca1f1f3aab34da778146e16b`。
- 最终提交：`78c5b738dc431def216af36fb5105668325e190a`。
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
- 推送状态：已提交到本地 `main`，但推送到 `origin/main` 未成功；`git push` 报 `Recv failure: Connection was reset`，重试 `git push origin main` 和 `git ls-remote origin refs/heads/main` 报无法连接 `github.com:443`；`Test-NetConnection github.com -Port 443` 显示 `TcpTestSucceeded: False`。当前本地分支状态为 `main...origin/main [ahead 1]`。
- 剩余风险：`ServiceContext` 仍然偏宽；Electron `sandbox: false` 仍需单独兼容性迭代；性能设计只做了保守提升，没有进行全局状态架构重写；历史审计记录保留为历史，不应被当作最新事实源。
- 编码说明：主动维护的中文 Markdown 已保持 UTF-8，并为关键中文 Markdown 写入 UTF-8 BOM，降低 Windows PowerShell 默认读取时的乱码风险。

## 2026-05-18 主题可读性与长点击任务闭环

- 实际项目根目录：`D:/NexaChat`。
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
