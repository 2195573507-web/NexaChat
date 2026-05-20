# NexaChat

NexaChat 是本地优先、聊天优先的多模型 AI 桌面工作台。当前产品入口是 Chat，不是 Workspace 或 Dashboard。

当前根路由 `/` 解析到 `/chat/conversations`。应用保持 7 个顶层模块：Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings。

## 当前能力

- Chat: 本地会话、消息历史、模型选择、上下文策略、重试、重新生成、取消、导出和多模型对比。
- Models: Provider 创建、检测、连接测试、模型拉取、模型元数据维护、启用/停用和软删除；OpenAI-compatible、Anthropic native 和 Gemini native 通过统一 adapter registry 调用。
- Knowledge Base: text-like 导入、解析、chunk、lexical retrieval 和 citations。
- Tools: MCP server 注册、权限状态、Agent 定义、dry-run、fixture execution、approval 和 trace/logging。
- Gateway: 本地 OpenAI-compatible Gateway，默认地址为 `127.0.0.1:8787`。
- Data: 配置导入预检、redacted export、encrypted backup、restore preflight、有限 rollback records 和 diagnostics。
- Settings: 主题、语言、密度、减少动效、安全说明、审计、反馈、评测和观测隐私。

默认本地 Gateway 地址：`127.0.0.1:8787`。

## 能力边界

- Gateway 当前支持 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings` 和 `/v1/responses` basic text。
- `/v1/responses` 当前提供 basic text，只支持基础文本 input/output，会记录 request log、usage 和 Gateway audit；tools、多模态、background、advanced reasoning 等完整 OpenAI Responses API 能力仍未实现。
- Knowledge Base 不是生产级 PDF/Office/OCR/vector DB RAG；请先将资料转换为文本、Markdown、JSON 或 CSV。
- Knowledge Base 当前支持 text-like 导入、解析、chunk、lexical retrieval 和 citations。
- Tools / Agent / MCP 当前支持注册、权限、dry-run、fixture execution、approval、trace/logging，不是任意 MCP/tool/code 执行平台。
- Data rollback 是受限回滚记录能力，不等同于完整数据库恢复。
- Browser mock 只用于显式开发和 UI smoke 场景，不代表生产 Provider 能力。

## 技术栈

- Electron
- React 19
- TypeScript
- Vite
- SQLite / `node:sqlite`
- preload IPC 隔离
- 本地 OpenAI-compatible Gateway
- Provider adapter registry

## 快速开始

```powershell
npm.cmd install
npm.cmd run dev
```

桌面开发入口：

```powershell
npm.cmd run dev:electron
```

生产构建后启动：

```powershell
npm.cmd run build
npm.cmd start
```

## 验证命令

```powershell
npm.cmd run typecheck
npm.cmd run scan:quality
npm.cmd run test
npm.cmd run build
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
```

发布相关检查：

```powershell
npm.cmd run package:release
npm.cmd run test:desktop-entry
```

## 架构概览

- `src/main`: Electron 主进程、SQLite、服务、仓储、本地 Gateway、系统能力和安全边界。
- `src/preload`: 通过 `contextBridge` 暴露 allowlist App API，不暴露 raw Electron/Node 对象。
- `src/renderer`: React UI。正常运行时必须通过 preload API 访问主进程能力。
- `src/shared`: App API、IPC channels、导航、运行时常量、类型、i18n 和跨层契约。
- `tests`: 单元、契约、运行时、Electron 安全边界和 UI smoke 测试。
- `docs`: 当前架构、测试、设计边界和审计记录。

`src/main/services/serviceRegistry.ts` 组合当前服务 facade。`ServiceContext` 仍保留共享 helper、仓储访问和兼容 facade 压力，后续应继续小步拆薄，而不是另建平行 service path。

## 安全说明

- Renderer 不能直接访问 raw filesystem、raw SQLite、raw secrets 或 unrestricted Electron APIs。
- 主窗口启用 `contextIsolation: true` 和 `nodeIntegration: false`。
- 当前 `sandbox: false` 仍保留，因为 preload 与 Electron API 桥接、测试入口和现有打包路径尚未完成 sandbox 兼容收敛；补偿控制见 `docs/architecture/current-architecture.md`。
- IPC 使用集中 channel allowlist、payload arity/shape validation、主进程权限检查和错误归一化。
- Provider API Key 和 Gateway Key 不应出现在日志、UI 快照、文档或测试断言中；只展示脱敏 preview 或 one-time key。

## 文档索引

- `docs/architecture/current-architecture.md`: 当前架构、模块边界、IPC/Electron 安全边界和已知风险。
- `docs/design/ui-product-boundary.md`: UI 产品方向和能力标签规则。
- `docs/testing/validation-checklist.md`: 基线和最终验证矩阵。
- `docs/audits/full-project-health-check-report.md`: 历史全项目健康审计记录。
