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
- 已完成质量门和安全边界修复：`scan:quality` 通过；高风险 IPC payload 已加入 runtime shape validation；`safeStorage` 不可用时生产环境阻断保存新 secret，开发/测试 fallback 有显式标记。
- 已清理用户可见旧能力标签：Workspace/Dashboard 文案不再作为当前入口心智，夸大的 RAG 与 Agent 执行标签改为明确的能力边界标签。
- 已完成模型生命周期、Gateway chat streaming、Knowledge/Data 边界、service helper 拆分、renderer snapshot 局部 patch、mock API 模型域拆分和 generated artifact 卫生检查。
- 已完成最终验证矩阵：`git diff --check`、`npm.cmd run typecheck`、`npm.cmd run scan:quality`、`npm.cmd run test`、`npm.cmd run build`、`npm.cmd run test:ui-smoke`、`npm.cmd run test:electron-smoke`。
- 已推送实现闭环到 `origin/main`，远端 `main` 确认为 `920e821127331778a1969159fb2de84a112f6053`；最终文档审计修正作为独立收尾提交记录。
- 后续变更必须继续保持 chat-first 7 模块、`/ -> /chat/conversations`、本地优先、能力标签诚实和 preload IPC 隔离。
