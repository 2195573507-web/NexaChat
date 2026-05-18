# NexaChat

NexaChat 是本地优先、聊天优先的多模型 AI 桌面工作台。当前产品入口是 Chat，不是 Workspace 或 Dashboard。

## 当前模块

NexaChat 当前只有 7 个顶层模块：

- Chat
- Models
- Knowledge Base
- Tools
- Gateway
- Data
- Settings

当前根路由 `/` 解析到 `/chat/conversations`。

## 技术栈

- Electron
- React 19
- TypeScript
- Vite
- SQLite / `node:sqlite`
- preload IPC 隔离
- 本地 OpenAI-compatible Gateway

默认本地 Gateway 地址：`127.0.0.1:8787`。

## 能力边界

- Gateway 当前支持 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`。
- `/v1/responses` 当前为 reserved endpoint，返回 501，不应描述为已实现。
- Knowledge Base 当前支持 text-like 导入、解析、chunk、lexical retrieval 和 citations，不是生产级 PDF/Office/OCR/vector DB RAG。
- Tools / Agent / MCP 当前支持注册、权限、dry-run、fixture execution、approval、trace/logging，不是任意 MCP/tool/code 执行平台。
- Data rollback 是受限回滚记录能力，不等同于完整数据库恢复。

## 常用命令

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run scan:quality
npm.cmd run test
npm.cmd run build
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
```

## 目录概览

- `src/main`: Electron 主进程、SQLite、服务、仓储和本地 Gateway。
- `src/preload`: 安全 preload API，只暴露 allowlist IPC。
- `src/renderer`: React 渲染层和浏览器 mock fallback。
- `src/shared`: API、IPC、导航、运行时常量、类型和跨层契约。
- `tests`: 单元、契约、运行时和 UI smoke 测试。
- `docs`: 当前架构、测试、设计边界和审计记录。
