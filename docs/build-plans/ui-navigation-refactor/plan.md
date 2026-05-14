# UI Navigation Refactor Plan

## Why This Split

The previous renderer already had route-aware second-level tabs, but many first-level modules still carried multiple unrelated work areas in one dense page. This round keeps the eight first-level modules and makes each module behave as a container with a compact secondary navigation row and focused subpages.

The refactor prioritizes UI information architecture and component boundaries. Existing IPC, mock data, gateway scopes, secret handling, and local persistence paths are reused instead of inventing a second data layer.

## Audit Notes

- Root confirmed with `git rev-parse --show-toplevel`: `D:/NexaChat`.
- `using-superpowers` exists at `C:\Users\至亲\.codex\skills\using-superpowers\SKILL.md`; `using-superpower` was not found.
- Navigation source is `src/shared/navigation.ts`.
- Shell and route state live in `src/renderer/App.tsx` and `src/renderer/AppShell.tsx`.
- Most module content previously lived in `src/renderer/App.tsx`; it is now split into `src/renderer/modules/*Page.tsx`.
- There is no real user/RBAC model yet. Navigation permissions are metadata only; security boundaries remain in main-process IPC, gateway key scopes, MCP permission state, and redaction helpers.

## Module Mapping

| First-level module | Secondary pages |
|---|---|
| 工作台 | 总览, 待办, 最近活动, 快捷操作 |
| 对话 | 会话, 助手, Prompt Lab, 多模型对比, Artifacts, 本地历史 |
| 模型 | 提供商, 模型列表, 密钥管理, 路由规则, 健康检查 |
| 知识库 | 知识库, 提示词库, 检索测试, 导入导出, 共享记忆, 清理维护 |
| 工具与 Agent | 工作流列表, MCP 工具, Agent 列表, 运行记录, 编排画布, 调试与回放 |
| 本地网关 | 网关总览, API Key 管理, 兼容接口, 安全策略, CCS/sub2api 导入, 调用日志 |
| 数据配置 | 智能导入预检, 导入导出, 备份恢复, 配置快照, 数据清理 |
| 设置与安全 | 运行监控, Token 统计, 评测任务, 错误中心, 用户反馈, 用户管理, 权限管理, 安全中心, 审计日志, 系统设置, 数据维护, 桌面入口 |

## Completed Split

- Added shared module frame and secondary navigation components:
  - `src/renderer/components/ModulePageFrame.tsx`
  - `src/renderer/components/ModuleSubNav.tsx`
- Extended navigation metadata with route, icon, i18n keys, and permission fields.
- Split module pages into focused files under `src/renderer/modules/`.
- Updated tests to cover every first-level module and every second-level tab.
- Kept planned/reserved pages as explicit placeholders with no fake execution buttons.

## Placeholder Or Pending Areas

- 多模型对比, Artifacts
- 路由规则 editor
- 提示词库, 共享记忆, 清理维护
- 工作流列表, 运行记录, 编排画布, 调试与回放
- 导入导出, 备份恢复, 数据清理
- 评测任务, 用户反馈, 用户管理, 权限管理, 桌面入口

These are intentionally labeled planned, reserved, or environment-limited until the required data model and main-process guard exist.

## Extension Interfaces

- `NavModule.permission` and `NavTab.permission` are ready for a future permission evaluator.
- `NavTab.labelKey` and `NavTab.descriptionKey` are ready for a future i18n dictionary.
- `ModuleSubNav` is icon-aware and route-aware, but does not enforce security by itself.
- `TabPanel` remains the stable test surface through `data-module` and `data-tab`.

## Test Results

Current verified results in this round:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 1 file / 3 tests.
- `npm.cmd run test:ui-smoke`: passed, 7 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:electron-smoke`: passed; Electron shell rendered.
- `lint`: no script exists in `package.json`.
- Desktop shortcut: `C:\Users\至亲\Desktop\NexaChat.lnk` targets `D:\NexaChat\node_modules\electron\dist\electron.exe` with argument and working directory `D:\NexaChat`; no project shortcut creation script exists under `scripts/`.

Additional build, verify, Electron smoke, and desktop shortcut checks are recorded in `PROJECT_PROGRESS.md` after final verification.
