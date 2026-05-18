# 验证清单

## 基线命令

```powershell
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git rev-parse --abbrev-ref --symbolic-full-name @{u}
git status --short --untracked-files=all
git diff --stat
git diff --check
npm.cmd run typecheck
```

## 最终验证矩阵

```powershell
git diff --check
npm.cmd run typecheck
npm.cmd run scan:quality
npm.cmd run test
npm.cmd run build
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
git status --short --untracked-files=all
```

## 可跳过条件

测试只能在命令不存在、环境明确缺失、用户明确要求跳过，或命令会破坏当前任务边界时跳过。跳过时必须记录命令、原因、是否阻断 release，以及后续补跑条件。

## 证据要求

- 记录每个命令的精确命令名和结果。
- 失败不能隐藏；必须记录失败原因、影响范围和是否阻断。
- `test-results/`、`playwright-report/`、`dist/`、`dist-electron/`、`release/` 属于生成或运行产物，默认不提交。
- UI smoke 需要覆盖 7 个模块、无路由泄漏、无横向溢出、theme/language/system mode 基本路径。
- 长时间点击测试的历史结果可以作为 evidence，但不能替代最新相关修复的 targeted validation。

## 长测证据规则

- 已完成的 121.12 分钟长点击记录保留为历史证据：`test-results/long-click/2026-05-18-theme-readability-2h/results.json`。
- 不需要为每次修复重跑 2 小时测试。
- 修复 long-click harness 或 page lifecycle 时，应优先跑短 targeted lifecycle smoke，确认 agents release、`issues: []`、无遗留 Vite/Playwright 进程。
