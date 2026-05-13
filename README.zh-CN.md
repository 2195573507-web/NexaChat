# NexaChat / AI 对话中枢

NexaChat 是一个本地优先、多模型 AI 对话中枢，当前已经从“规划仓库”推进为可运行的 Electron + React + TypeScript + Vite + SQLite 桌面应用。

## 当前已实现

- Electron 桌面壳，启动只打开一个主窗口。
- 8 个一级模块：工作台、对话、模型、知识库、工具与 Agent、本地网关、数据配置、设置与安全。
- 基于 `src/shared/navigation.ts` 的配置驱动导航，并显示 `implemented` / `planned` / `reserved` 状态。
- 主进程 SQLite schema 与本地 store，覆盖工作区、供应商、模型、会话、消息、请求日志、用量、网关 Key、知识文件、MCP Server、Agent 定义、快照、审计和界面偏好。
- Renderer 通过 preload IPC 调用主进程能力，不直接读取 SQLite 或 raw secret。
- Provider -> Model -> Router -> Gateway -> Chat 核心闭环。
- 本地会话历史持久化；切换 Provider、Model 或 API Key 不会删除会话。
- Assistant 消息保存真实 provider、model、model snapshot、request id、tokens、latency、finish reason、状态、context strategy 和 metadata。
- 本地 OpenAI-compatible 网关：`127.0.0.1:8787`，包含 `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`，`/v1/responses` 明确为 reserved。
- 日志与诊断的敏感信息脱敏基础设施。
- Vite/Playwright 浏览器模式 fallback API。

## 仍为计划或预留

- 真实上游 Provider 转发尚未完成；当前回复生成是本地确定性路径，用于验证持久化、路由、网关形状和日志链路。
- 完整 RAG、真实 embedding/rerank、PDF/Office/OCR、向量库评测仍为 planned。
- MCP 执行、自定义工具执行、真实 Agent Run、Workflow canvas、trace replay、人类审批执行、代码沙箱为 reserved。
- 完整冲突导入、备份恢复、迁移 UI、带 secrets 的加密备份仍为 planned。
- 打包安装器和桌面快捷方式验证不在本轮范围内。

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
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run verify
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
```

## 关键文档

- 主构建计划：`docs/build-plans/00-master-build-plan.md`
- 实现闭环说明：`docs/implementation/build-closure.md`
- 当前执行计划：`task_plan.md`
- 发现记录：`findings.md`
- 进度日志：`progress.md`
- UI/UX 主计划：`docs/design/00-ui-ux-master-plan.md`
- 架构文档：`docs/architecture/`
- 验收与未来测试：`docs/testing/`
