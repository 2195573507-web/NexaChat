# 当前架构

NexaChat 是本地优先、聊天优先的多模型 AI 桌面工作台。当前顶层模块只有 7 个：Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings。根路由 `/` 解析到 `/chat/conversations`。

## 进程与边界

- `src/main`: Electron 主进程，负责 SQLite、服务层、仓储、本地 Gateway、系统能力和安全边界。
- `src/preload`: 只暴露 allowlist IPC API，使用 `contextBridge.exposeInMainWorld('nexachat', api)`。
- `src/renderer`: React UI。渲染层不能直接访问 SQLite、fs、raw secrets 或 Node API。
- `src/shared`: AppApi、IPC channel、导航、运行时常量、共享类型和跨层契约。
- SQLite 使用 `node:sqlite`，由主进程独占访问。

## 模块边界

- Gateway: 本地 OpenAI-compatible endpoints，当前支持 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`；`/v1/responses` reserved 501。
- Knowledge Base: text-like 导入、解析、chunk、lexical retrieval、citations；不是 PDF/Office/OCR/vector DB RAG。
- Tools / Agent / MCP: registration、permissions、dry-run、fixture execution、approval、trace/logging；不是任意 MCP/tool/code 执行。
- Data: import precheck、backup、restore preflight、有限 rollback records、diagnostics；有限 rollback 不是完整数据库恢复。

## 已知风险

- `ServiceContext` 覆盖面仍偏宽，secret、audit、knowledge、data、fixture helper 需要继续拆薄。
- `serviceRegistry` 的 mixin 组合可读性弱，方法归属不够直观。
- IPC 已有 channel/permission/arity 基础，但高风险 payload 还需要运行期 shape validation。
- Renderer 仍有部分 action 依赖 full snapshot refresh，高频路径需要逐步改为局部刷新或事件驱动更新。
