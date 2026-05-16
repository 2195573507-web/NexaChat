# NexaChat / AI 对话工作台

NexaChat 是一个 chat-first、本地优先、多模型 AI 桌面工作台，基于 Electron、React、TypeScript、Vite 和 SQLite。

## 当前架构事实

- 当前真实一级模块是 7 个：Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings。
- 当前根路由 `/` 解析到 `/chat/conversations`。
- Workspace / Dashboard 不是当前主入口，也不是当前一级模块。
- simple home 是后续目标，不是当前已完成能力。
- 普通模式按任务组织，高级模式显示技术细节，但两者复用同一套实现链路。
- Gateway 是独立核心模块。
- Agent / Tools / MCP 是实验模块。
- `NexaStore` 仍是当前集中式聚合服务；服务拆分是目标路线，不是当前源码事实。

## 当前真实能力

- Electron 桌面壳、单主窗口、本地 SQLite、preload IPC 隔离。
- Provider / Model / Chat / Gateway 的 OpenAI-compatible 调用链。
- Gateway 当前支持 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`；`/v1/responses` 为 reserved / 501。
- Knowledge Base 当前支持 text-like 文件导入、解析、分块、lexical embedding、检索预览、重建/删除和引用。
- Tools / Agent 当前支持 MCP server registration、permissions、agent definitions、dry-run preview、fixture tool execution、approval requests、execution steps、trace events。
- Data、Settings、Security、Observability 提供本地导入导出、备份记录、恢复预检、权限、审计和日志视图。

## 未实现边界

- Knowledge Base 不应写成已支持 PDF、Office、OCR 或外部向量数据库。
- Tools / Agent / MCP 不应写成任意真实 MCP executor、任意代码执行或 release-grade Agent sandbox。
- `simple home`、完整 RAG、真实 MCP 执行、服务拆分和更强 release security 都是后续规划。

## 运行

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run dev:electron
```

构建并启动桌面应用：

```powershell
npm.cmd run build
npm.cmd run start
```

## 验证

```powershell
npm.cmd run verify:release
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run verify
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
```

## 关键文档

- 当前架构主线：`docs/build-plans/00-modular-refactor-master-plan/architecture-mainline-iteration-plan.md`
- 当前执行计划：`task_plan.md`
- 项目进度：`PROJECT_PROGRESS.md`
- Full-app 蓝图历史：`docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md`
- 架构文档：`docs/architecture/`
- 验收和未来测试：`docs/testing/`
