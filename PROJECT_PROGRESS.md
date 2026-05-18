# NexaChat 当前进度

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
- 后续变更必须继续保持 chat-first 7 模块、`/ -> /chat/conversations`、本地优先、能力标签诚实和 preload IPC 隔离。
