# 当前架构

NexaChat 是本地优先、聊天优先的多模型 AI 桌面工作台。当前顶层模块只有 7 个：Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings。根路由 `/` 解析到 `/chat/conversations`。

## 进程与边界

- `src/main`: Electron 主进程，负责 SQLite、服务层、仓储、本地 Gateway、系统能力和安全边界。
- `src/preload`: 只暴露 allowlist IPC API，使用 `contextBridge.exposeInMainWorld('nexachat', api)`。
- `src/renderer`: React UI。渲染层不能直接访问 SQLite、fs、raw secrets 或 Node API。
- `src/shared`: AppApi、IPC channel、导航、运行时常量、共享类型和跨层契约。
- SQLite 使用 `node:sqlite`，由主进程独占访问。

## Electron 与 IPC 安全边界

- 主窗口配置位于 `src/main/index.ts`，当前启用 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: false`。
- `sandbox: false` 当前仍保留，原因是现有 preload 桥接、Electron smoke、桌面打包路径和主进程协作尚未完成 sandbox 兼容验证。不能只改配置而不验证 preload 行为。
- 补偿控制：renderer 只能访问 `window.nexachat` allowlist；preload 不暴露 raw `ipcRenderer`；主进程 IPC 使用集中 channel、arity/shape validation、权限检查和受控 handler。
- 导航与外链控制：生产 renderer 通过 `nexachat://app` 自定义协议加载，`resolveRendererAsset` 阻止 dist 外路径；`setWindowOpenHandler` 和 `will-navigate` 只允许 `https:` 与 `mailto:` 外链。
- 日志与密钥控制：Provider/Gateway secret 只通过主进程 secret helper 保存；UI、日志、审计和导出默认使用 redaction 或 preview。
- 后续若要启用 sandbox，需要先验证 preload API、Electron smoke、UI smoke、打包启动、协议加载、文件选择和日志打开路径均不回退。

## 模块边界

- Models / Provider: OpenAI-compatible、Anthropic native 和 Gemini native 已通过统一 provider adapter registry 调用。Anthropic/Gemini 第一版覆盖文本 chat、基础 streaming、模型列表或 fallback、API key 验证和错误映射；不代表 tool use、vision 或高级 reasoning 已完成。
- Gateway: 本地 OpenAI-compatible endpoints，当前支持 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings` 和 `/v1/responses` basic text。`/v1/embeddings` 只在配置了支持 embeddings 的 OpenAI-compatible 模型时走真实 provider；未配置时返回明确错误，不返回假向量。`/v1/responses` 会映射到现有 Chat Provider 链路并记录 request log、usage 和 Gateway audit；不支持 tools、多模态、background 或 advanced reasoning。
- Knowledge Base: text-like 导入、解析、chunk、本地 SQLite vector 记录、配置型 provider embedding 检索、lexical fallback、retrieval trace 和 citations；不是 PDF/Office/OCR/rerank/full vector DB RAG。
- Tools / Agent / MCP: registration、permissions、dry-run、fixture execution、approval、trace/logging；不是任意 MCP/tool/code 执行。
- Data: import precheck、backup、restore preflight、有限 rollback records、diagnostics；有限 rollback 不是完整数据库恢复。

## 已知风险

- `ServiceContext` 覆盖面仍偏宽，secret、audit、knowledge、data、fixture helper 需要继续拆薄。
- `serviceRegistry` 已拆为逐层命名的 mixin 组合，方法归属仍依赖 facade 文档和 `tests/store-boundaries.test.ts` 约束。
- IPC 已有 channel/permission/arity/shape validation 基础，后续应继续扩大低风险页面查询参数的细粒度 shape validation。
- Renderer 仍有部分 action 依赖 full snapshot refresh，高频路径需要逐步改为局部刷新或事件驱动更新。
