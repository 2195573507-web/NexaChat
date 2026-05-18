# NexaChat

NexaChat 是本地优先的多模型 AI 桌面对话工作台。

## 当前模块

- Chat
- Models
- Knowledge Base
- Tools
- Gateway
- Data
- Settings

当前根路由 `/` 解析到：`/chat/conversations`

默认本地 Gateway 地址：`127.0.0.1:8787`

## 技术栈

- Electron
- React
- TypeScript
- Vite
- SQLite / `node:sqlite`

## 能力边界

- Knowledge Base 当前支持 text-like 文件。
- `/v1/responses` 当前为保留端点，未作为完整功能实现。
- Tools / Agent / MCP 是受控实验能力，不代表完整任意执行沙箱。

## 常用命令

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
```

## 目录概览

- `src/main`：Electron 主进程、SQLite、服务和仓储。
- `src/preload`：安全 preload API。
- `src/renderer`：React 渲染层。
- `src/shared`：共享契约、类型、运行时常量和导航。
- `tests`：单元、契约、运行时和 UI smoke 测试。
