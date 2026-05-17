# NexaChat / AI 对话工作台

NexaChat 是一个 chat-first、本地优先、多模型 AI 桌面工作台，基于 Electron、React、TypeScript、Vite 和 SQLite。

## 当前架构事实

- 当前真实一级模块是 7 个：Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings。
- 当前根路由 `/` 解析到 `/chat/conversations`。
- Workspace / Dashboard 不是当前主入口，也不是当前一级模块。
- Chat 当前已有轻量任务快捷入口；独立 simple home 仍是后续目标，不是当前已完成能力。
- Gateway 是独立核心模块。
- Agent / Tools / MCP 仍是实验性能力，不能写成任意真实执行。
- `src/main/services/store.ts` 现在只是 `serviceRegistry` 的兼容导出；主进程业务逻辑已经拆到 ChatService、ProviderService、ModelService、GatewayService、KnowledgeService、DataService、SecurityService、AuditService、SettingsService 等领域服务。

## 当前真实能力

- Electron 桌面壳、单主窗口、本地 SQLite、preload IPC 隔离。
- Chat-first 入口提供新建聊天、选择模型、知识库问答、查看网关状态、导入配置和偏好设置等快捷动作，同时 `/` 仍解析到 `/chat/conversations`。
- Provider / Model / Chat / Gateway 的 OpenAI-compatible 调用链。
- Gateway 当前支持 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`；`/v1/responses` 为 reserved / 501。
- Knowledge Base 当前支持 text-like 文件导入、解析、分块、lexical embedding、检索预览、重建、删除和引用。
- Tools / Agent 当前支持 MCP server registration、permissions、agent definitions、dry-run preview、fixture tool execution、approval requests、execution steps、trace events。
- Data、Settings、Security、Observability 提供本地导入导出、备份记录、恢复预检、权限、审计和日志视图。

## 未实现边界

- Knowledge Base 不应写成已支持 PDF、Office、OCR 或外部向量数据库。
- Tools / Agent / MCP 不应写成任意真实 MCP executor、任意代码执行或 release-grade Agent sandbox。
- `/v1/responses` 不应写成完整实现。
- 独立 `simple home`、完整 RAG、真实 MCP 执行和更强 release security 都是后续规划。
- Repository 拆分当前是增量落地：稳定列表读取已进入 repository；高风险多表写入、事务和补偿逻辑仍在对应 service/context 中，等待后续带测试迁移。

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

- 当前服务拆分报告：`docs/build-plans/00-modular-refactor-master-plan/architecture-service-split-completion-report.md`
- 当前架构主线：`docs/build-plans/00-modular-refactor-master-plan/architecture-mainline-iteration-plan.md`
- 当前执行计划：`task_plan.md`
- 项目进度：`PROJECT_PROGRESS.md`
- Full-app 蓝图历史：`docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md`
- 架构文档：`docs/architecture/`
- 验收和未来测试：`docs/testing/`
