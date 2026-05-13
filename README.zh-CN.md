# NexaChat / AI 对话中枢

NexaChat 是一个从零规划的新桌面应用项目，定位为“本地优先的多模型 AI 对话中枢”。本仓库当前处于规划阶段，重点是明确项目构建计划、模块边界、技术架构、数据模型、UI/UX 设计、交互流程和验收标准。

## 项目目标

- 建立一个清晰、可维护、可验收的本地优先 AI 对话客户端。
- 支持多个 Provider 和 Model，但不把聊天历史绑定到任意一个 API。
- 用本地 SQLite 保存会话、消息、请求日志、用量和配置快照。
- 在第一版先做好对话、模型配置、本地历史、网关边界、日志诊断和导入导出设计。
- 为知识库、MCP、Agent、工作流、评测、安全等后续能力预留接口，但不做空壳功能。

## 模块结构设想

一级导航最多 8 个：

1. 工作台
2. 对话
3. 模型
4. 知识库
5. 工具与 Agent
6. 本地网关
7. 数据配置
8. 设置与安全

后端能力按 service 分层，不按页面乱写。规划服务包括 `workspace-service`、`chat-service`、`conversation-service`、`message-service`、`provider-service`、`model-service`、`router-service`、`gateway-service`、`knowledge-service`、`mcp-service`、`security-service`、`settings-service` 等。

## 数据本地化原则

聊天历史属于本地数据库，不属于任何 API。API 只是生成回复的通道。切换 DeepSeek、Claude、Ollama 或其他 Provider 后，同一个 conversation 仍应保留完整历史并继续对话。

每条 assistant 消息必须记录实际使用的 `provider_id`、`model_id`、`model_name_snapshot`、`request_id`、token、耗时和错误信息，保证可追踪、可诊断、可导出。

## UI 设计方向

NexaChat UI 要现代、克制、干净，适合长期使用：

- 不做复杂 Liquid Glass。
- 不做花哨拟物。
- 不做杂乱后台。
- 参考 CCS / cc-switch 类工具的清晰配置体验。
- 参考 Chatbox / Cherry Studio / LobeChat 的对话体验。
- 参考 Linear / Raycast / Notion 的信息层级和快捷操作。
- 预留用户字体设置，包含 KaiTi / 楷体选项，但默认使用系统字体。

## 运行设想

后续实现建议使用 Electron + React + TypeScript + Vite，SQLite 做本地数据存储，Electron safeStorage / 系统 Keychain 保护密钥，IPC 安全桥隔离 renderer 与主进程能力。本轮只写计划，不写业务代码。

