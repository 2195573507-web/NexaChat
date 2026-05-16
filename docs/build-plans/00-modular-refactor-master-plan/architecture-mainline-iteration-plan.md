# NexaChat 架构与主线逻辑重整迭代计划

创建日期：2026-05-16

适用范围：后续多轮架构、主线体验、文档清理与服务拆分准备。本文件是计划，不是本轮源码重构记录。

事实来源：当前源码、现有架构文档、进度文档、导航注册表、IPC/preload、`NexaStore`、Gateway、Knowledge、Execution、安全与数据运行时。

## 1. 当前结论摘要

NexaChat 后续方向应收束为本地优先的多模型 AI 桌面聊天工作台，而不是后台管理面板、Workspace-first 系统或 Agent-first 平台。

核心结论：

- 产品入口采用 chat-first：聊天是打开后的主要任务中心。
- 后续目标是 simple home：第一眼只放继续聊天、新建聊天、选择模型、导入知识库、开放本地 API 等入口。
- 用户模式采用 ordinary mode + advanced mode：普通模式按任务走，高级模式暴露技术细节。
- Gateway 是独立核心模块：它面向外部工具提供本地 OpenAI-compatible API，不应隐藏成内部实现。
- Agent / Tools / MCP 保留入口，但定位为实验模块，不应干扰聊天、模型、知识库和网关主线。
- 第一轮架构清理优先围绕“聊天怎么用得顺”展开，不一次性推倒 Store、IPC、DB 或运行时。
- 当前源码真实一级模块是 7 个：Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings。
- 当前 `/` 解析到 `/chat/conversations`，不是 Workspace-first，也不是 Dashboard-first。
- `src/main/services/store.ts` 中的 `NexaStore` 仍是集中式聚合服务；服务拆分是目标路线，不是当前完成状态。
- 旧逻辑允许清理，但每次必须基于引用链、路由、IPC、测试、文档和 diff 审查，不做只删 UI 的半截清理。

## 2. 当前事实基线

### 2.1 项目形态

当前 NexaChat 是本地优先的多模型 AI 桌面聊天工作台，技术栈为：

- Electron
- React
- TypeScript
- Vite
- `node:sqlite`
- SQLite
- preload IPC 隔离
- OpenAI-compatible 本地网关

当前真实运行形态是：

- Renderer UI
- Preload IPC
- Main process runtime
- `NexaStore`
- SQLite
- Local Gateway

### 2.2 当前导航与入口

当前导航事实来自 `src/shared/navigation.ts`：

- 一级模块数量是 7 个，不是 8 个。
- 当前一级模块为：
  - Chat
  - Models
  - Knowledge Base
  - Tools
  - Gateway
  - Data
  - Settings
- 当前根路径 alias 只有：
  - `/` -> `/chat/conversations`
- 当前旧 `/workspace/...`、`/dashboard/...` 不在 `routeAliasRegistry` 中。
- `ModuleId` 当前只包含 `chat | models | knowledge | tools | gateway | data | settings`。

当前入口事实：

- `/` 解析到 `/chat/conversations`。
- 当前是 chat-first。
- 当前不是 Workspace-first。
- 当前不是 Dashboard-first。

### 2.3 当前业务能力

Chat 当前支持：

- 本地会话列表
- 会话搜索
- 新建会话
- 发送消息
- 重试
- 重新生成
- 取消
- 收藏
- 置顶
- 导出
- 模型选择
- 上下文策略
- 多模型比较入口
- 知识检索引用写入

Models 当前支持：

- Provider 管理
- Model 管理
- OpenAI-compatible Provider 配置
- API key 保存为主进程 `secret_ref`
- 模型创建
- Provider 测试
- 健康状态
- 真实上游调用路径在 `src/main/services/openAiCompatibleAdapter.ts`
- `/v1/models` 与 `/v1/chat/completions` 风格请求
- 超时、重试、错误归一化、secret 脱敏

Knowledge Base 当前支持：

- 文本类导入
- 解析
- 分块
- 索引
- lexical embedding
- 检索预览
- 聊天引用记录
- 支持 `.txt`、`.md`、`.markdown`、`.json`、`.csv`、`.log`
- 支持 `text/plain`、`text/markdown`、`application/json`、`text/csv`、`application/csv`

Tools / Agent 当前支持：

- MCP server 注册
- MCP 权限状态
- Agent 定义
- dry-run 预览
- fixture tool 执行
- approval request
- execution steps
- trace events

Gateway 当前支持：

- 默认监听 `127.0.0.1:8787`
- `/v1/models`
- `/v1/chat/completions`
- `/v1/embeddings`
- `/v1/responses` reserved，返回 501
- Gateway API key scopes
- quota
- rate limit
- active/disabled/revoked/expired/quota_exceeded 状态
- rotate/revoke
- logs
- redaction
- CORS/options handling

Data 当前支持：

- 导入 manifest 预检
- 应用导入计划
- 快照
- 诊断导出
- 数据包导出
- 加密备份
- 恢复预检
- 回滚记录

Settings / Security 当前支持：

- 主题
- 语言
- 密度
- 动效设置
- owner/operator/viewer RBAC
- IPC permission mapping
- ACL grant
- audit log 搜索
- audit log 导出
- hash-chain integrity check
- observability privacy
- feedback
- eval
- usage/request/gateway/provider-health 观测

### 2.4 当前架构压力点

当前 `src/main/services/store.ts` 中的 `NexaStore` 仍是集中式聚合服务。它事实承载：

- Provider / Model
- Chat / Conversation / Message
- Gateway key lifecycle
- Gateway log
- Knowledge file/chunk/embedding/retrieval/citation
- MCP registry
- Agent definition
- Execution run/step/trace/approval
- Import/export/backup/restore/rollback
- UI preferences
- Security/RBAC/ACL/audit
- Observability/feedback/eval
- Snapshot assembly
- Seed/bootstrap

`chat-service`、`router-service`、`security-service`、`knowledge-service`、`gateway-key-service` 等可以作为后续目标拆分方向，但当前源码并没有完成完整后端式服务拆分。

### 2.5 当前不是真实能力的内容

以下能力不能写成当前已完成：

- PDF 解析
- Office 文档解析
- OCR
- 真实外部向量库
- hybrid/vector/rerank 级完整 RAG
- 任意 MCP 工具执行器
- 危险命令执行器
- Agent sandbox
- 完整 Agent runtime
- workflow canvas
- 发布级安全硬化
- 强加密 secret fallback
- 签名安装器

当前 `safeStorage` 不可用时有 `local-dev:v1` base64 fallback。它只能作为开发兜底和兼容路径，不能描述为强加密。

## 3. 产品主线逻辑

普通用户主线应按“打开就能聊天，遇到缺口再配置”的顺序组织。

### 3.1 打开应用

目标体验：

- 用户打开 NexaChat 后，先看到一个简单首页或直接进入最近聊天。
- 不展示内部路由、工程阶段、旧 Workspace/Dashboard 概念。
- 首页只回答“下一步做什么”。

当前事实：

- `/` 当前解析到 `/chat/conversations`。

后续目标：

- 可以新增 simple home，但必须明确路由和入口策略：
  - 若保留 `/ -> /chat/conversations`，simple home 可以作为 Chat 模块内的轻量起始空态。
  - 若改成 `/ -> /home` 或类似入口，必须同时更新 `navigation.ts`、App route resolution、UI smoke、Electron smoke、README、PROJECT_PROGRESS 和旧路由清理记录。

### 3.2 简单首页

simple home 只承载入口，不承载复杂配置：

- 继续聊天：进入 Chat / conversations。
- 新建聊天：创建会话并进入 Chat。
- 选择模型：进入 Models 的普通模型选择或 Provider 设置。
- 导入知识库：进入 Knowledge 的普通导入入口。
- 开放本地 API：进入 Gateway overview 或 keys。
- 数据备份和设置：进入 Data backup 或 Settings preferences/security。

首页不应该展示：

- 完整 Provider 表单。
- Gateway Key 全量策略表。
- Knowledge chunk/embedding 细节。
- MCP/Agent 执行链。
- audit hash-chain 详情。
- 旧 Workspace/Dashboard 卡片墙。

### 3.3 继续聊天 / 新建聊天

对应模块：Chat。

能力边界：

- 管理会话和消息。
- 选择模型与上下文策略。
- 展示当前知识库启用状态和引用结果。
- 展示必要的失败原因和恢复动作。

不承担：

- Provider API key 编辑。
- Gateway API key 管理。
- Knowledge 文件管理。
- Agent/MCP 权限管理。
- 审计和数据恢复管理。

### 3.4 选择或配置模型

对应模块：Models。

普通模式：

- 选择当前聊天模型。
- 查看 Provider 是否可用。
- 添加 OpenAI-compatible Provider 的最小表单。

高级模式：

- Provider Base URL。
- API key 保存。
- custom headers。
- Provider 测试详情。
- timeout/retry/error 说明。
- router 规则和健康状态。

### 3.5 可选导入知识库

对应模块：Knowledge Base。

普通模式：

- 上传或粘贴文本。
- 启用或停用知识上下文。
- 查看是否可用于聊天。

高级模式：

- parser type。
- chunk。
- token count。
- lexical embedding。
- retrieval preview。
- citation。
- fallback reason。

### 3.6 可选开放本地 API

对应模块：Gateway。

普通模式：

- 启动/停止 Gateway。
- 创建一个基础 Gateway Key。
- 查看本地 endpoint。

高级模式：

- scopes。
- quota。
- rate limit。
- rotate/revoke。
- logs。
- `/v1/responses` reserved 状态。
- redaction 和外部调用风险。

### 3.7 数据备份和设置

对应模块：Data 与 Settings。

Data：

- 导出。
- 加密备份。
- 恢复预检。
- 回滚记录。
- 诊断包。

Settings：

- 主题、语言、密度、动效。
- RBAC/ACL。
- IPC permission。
- audit log。
- observability privacy。

安全、审计、网关能力不能完全隐藏。普通用户可以少看细节，但涉及密钥、权限、外部 API、日志导出和数据恢复时必须有清楚状态、风险和确认。

## 4. 普通模式与高级模式边界

### 4.1 普通模式显示什么

普通模式面向“像 ChatGPT 一样打开就使用”的用户：

- 最近会话和新建聊天。
- 当前模型名称与 Provider 可用状态。
- 一个简单模型选择器。
- 知识库启用状态。
- 简单导入知识库入口。
- Gateway 是否开启。
- 一个“开放本地 API”入口。
- 备份和基础设置入口。
- 明确错误状态：模型不可用、Provider key 缺失、知识库无可用索引、Gateway 未开启。

普通模式默认隐藏：

- Provider custom headers。
- timeout/retry 细节。
- Gateway scopes/quota/rate limit。
- raw request logs。
- Knowledge chunk/embedding/vector/hash 细节。
- MCP 权限矩阵。
- Agent trace steps。
- audit hash-chain 细节。
- import manifest 冲突细节。

### 4.2 高级模式显示什么

高级模式面向本地工具调试、外部 API 调用、数据迁移、安全审计和实验 Agent 用户：

- Provider Base URL、auth type、custom headers、health、request log。
- Model catalog、router、fallback、上下文和能力标签。
- Knowledge parser、chunk、embedding、retrieval score、citation trace。
- MCP server transport、权限、注册状态。
- Agent dry-run、fixture run、approval、trace events。
- Gateway endpoint、scopes、quota、rate limit、logs、redaction。
- Data manifest、conflict、restore preflight、rollback。
- Settings security、RBAC、ACL、audit integrity、observability export。

### 4.3 不能完全隐藏的能力

即使在普通模式，也不能完全隐藏：

- Provider key 是否缺失。
- 当前模型是否不可用。
- Gateway 是否正在监听本地端口。
- Gateway Key 是否存在、是否有风险状态。
- 数据备份是否成功。
- 恢复操作是否会覆盖数据。
- 安全权限是否阻止当前动作。
- audit/export 是否涉及敏感信息脱敏。

### 4.4 模式切换原则

- 模式切换只改变信息密度和默认展开程度，不改变真实权限。
- 高级模式不是另一套实现。
- 普通模式和高级模式必须复用同一套 IPC、shared type、Store/service contract。
- 不允许为模式切换引入双重状态管理或双重数据链路。

## 5. 模块边界重定义

### 5.1 Chat

模块定位：

- Chat 是产品主入口和主要使用场景。
- Chat 管理会话、消息、上下文策略、模型选择和生成结果。

普通用户功能：

- 继续聊天。
- 新建聊天。
- 搜索会话。
- 发送消息。
- 重试、重新生成、取消。
- 收藏、置顶、导出。
- 选择当前模型。
- 选择是否使用知识库上下文。

高级用户功能：

- 上下文策略。
- prompt metadata。
- 多模型比较。
- request log 链接。
- 知识引用 trace。
- 失败恢复细节。

不应该承担的职责：

- 不编辑 Provider API key。
- 不管理 Gateway API key。
- 不导入和重建知识库。
- 不注册 MCP server。
- 不管理 RBAC/ACL。
- 不承载完整 observability 表格。

与其他模块关系：

- 依赖 Models 提供可用模型和 Provider 健康状态。
- 可选依赖 Knowledge 提供检索上下文和引用。
- 可选显示 Tools/Agent 的实验入口，但不把 Agent 作为第一主线。
- 通过 Gateway 共享 Provider 调用链，但不管理 Gateway Key。
- 将 request/usage/audit 结果交给 Settings/Gateway/Data 相关页面展示。

后续可拆分边界：

- `conversationService`：会话、消息、本地历史。
- `chatRuntimeService`：发送、重试、重新生成、取消。
- `contextService`：上下文策略、消息选择、知识上下文拼接。
- `chatExportService`：会话导出。
- IPC contract：`chatCreateConversation`、`chatSendMessage`、`chatRetryMessage`、`chatRegenerateMessage`、`chatCancelMessage`、`chatCompareModels`、`chatExportConversation`、`chatUpdateConversationFlags`。

### 5.2 Models

模块定位：

- Models 管理 Provider、Model、模型可用性和路由准备。
- 它是 Chat 和 Gateway 的上游能力源。

普通用户功能：

- 查看当前可用模型。
- 选择默认或当前聊天模型。
- 添加一个 OpenAI-compatible Provider。
- 测试 Provider 是否可用。

高级用户功能：

- Provider Base URL。
- auth type。
- API key secret_ref。
- custom headers。
- Provider health。
- model capability。
- router 说明。
- timeout/retry/error 细节。

不应该承担的职责：

- 不管理 Gateway API key。
- 不展示 Gateway 外部调用日志为主任务。
- 不管理 Knowledge 文件。
- 不执行 Agent。
- 不直接暴露 raw secrets。

与其他模块关系：

- Chat 读取模型选择和 Provider 健康。
- Gateway 复用模型和 Provider 调用链。
- Settings/Security 约束 Provider secret 和权限。
- Data 可导入 Provider/Model 元数据，但不静默导入明文 secret。

后续可拆分边界：

- `providerModelService`：Provider/Model CRUD 与校验。
- `providerHealthService`：Provider 测试与健康记录。
- `providerSecretService`：Provider key 存取与脱敏。
- `routerService`：模型选择、fallback、健康策略。
- shared contract：`ProviderInput`、`ModelInput`、`ProviderHealthRecord`、`ProviderRuntimeErrorCode`、`RouteDecision`。

### 5.3 Knowledge Base

模块定位：

- Knowledge Base 提供可选知识上下文，不是聊天页内的文件管理抽屉。
- 当前是文本类知识、lexical embedding、检索预览和引用记录。

普通用户功能：

- 导入文本、Markdown、JSON、CSV、log。
- 查看文件是否已索引。
- 启用知识上下文。
- 看见聊天引用。

高级用户功能：

- parser type。
- chunk 列表。
- token count。
- lexical embedding 状态。
- retrieval preview。
- score。
- citation trace。
- fallback reason。

不应该承担的职责：

- 不声称支持 PDF、Office、OCR。
- 不声称支持外部向量库。
- 不把 lexical embedding 写成生产级向量检索。
- 不执行 Agent 工具。

与其他模块关系：

- Chat 通过 Knowledge 取得引用上下文。
- Models 可提供未来 embedding model，但当前 `/v1/embeddings` 是 lexical fallback。
- Data 负责知识相关导出、备份和恢复预检。
- Settings/Security 负责导出脱敏和审计。

后续可拆分边界：

- `knowledgeImportService`：导入、parser policy、文件状态。
- `knowledgeChunkService`：分块、hash、token。
- `knowledgeIndexService`：embedding/index 状态。
- `knowledgeRetrievalService`：检索、score、trace、citation。
- shared contract：`KnowledgeImportInput`、`KnowledgeFile`、`KnowledgeChunk`、`KnowledgeRetrievalTrace`、`KnowledgeCitation`。

### 5.4 Tools

模块定位：

- Tools 包含 MCP、Agent 和执行模型的实验区。
- 当前应明确标注为 experimental。

普通用户功能：

- 看到工具和 Agent 是可选实验能力。
- 查看已注册 MCP server。
- 查看 Agent 定义。
- 使用安全 fixture 预览。

高级用户功能：

- MCP transport。
- 权限 grant/deny。
- approval request。
- execution run。
- steps。
- trace events。
- fixture tool 结果。

不应该承担的职责：

- 不作为第一主线。
- 不执行任意外部 MCP 工具。
- 不执行本地危险命令。
- 不承诺代码沙箱。
- 不做 workflow canvas 假完成。

与其他模块关系：

- Chat 可在未来接入已授权工具，但当前不能默认执行外部 MCP。
- Settings/Security 控制权限、审批、审计。
- Observability 记录 run/step/trace。
- Data 负责执行记录导出和诊断。

后续可拆分边界：

- `mcpRegistryService`：MCP server 注册和权限状态。
- `toolExecutionService`：fixture tool 与未来安全工具执行。
- `agentDefinitionService`：Agent 定义。
- `executionRunService`：run/step/trace/approval。
- shared contract：`ExecutionRun`、`ExecutionStep`、`ExecutionTraceEvent`、`ApprovalRequest`、`McpServer`、`AgentDefinition`。

### 5.5 Gateway

模块定位：

- Gateway 是独立核心模块。
- 它把 NexaChat 的本地能力以 OpenAI-compatible API 暴露给其他工具。

普通用户功能：

- 查看 Gateway 是否开启。
- 启动/停止本地 Gateway。
- 创建基础 Gateway Key。
- 复制 endpoint 示例。

高级用户功能：

- `/v1/models`。
- `/v1/chat/completions`。
- `/v1/embeddings`。
- `/v1/responses` reserved。
- scopes。
- quota。
- rate limit。
- rotate/revoke。
- logs。
- redacted headers。
- model mapping/route 说明。

不应该承担的职责：

- 不编辑 Provider API key。
- 不变成隐藏后台实现。
- 不把 `/v1/responses` 写成已完成。
- 不绕开 Chat/Models 的 Provider 调用链。

与其他模块关系：

- 复用 Models 的 Provider/Model。
- 复用 Chat 的 Provider 调用链。
- 使用 Settings/Security 的权限和 redaction。
- 产生日志供 Gateway/Settings/Observability 查看。
- Data 可导出 Gateway key metadata，但不导出明文 key。

后续可拆分边界：

- `localGatewayService`：HTTP server 生命周期。
- `gatewayKeyService`：key lifecycle、scopes、quota、rate。
- `gatewayLogService`：redacted logs。
- `gatewayModelResolver`：外部 model name 到内部 modelId。
- shared contract：`gatewayRuntime.ts`、`GatewayStatus`、`GatewayApiKey`、`GatewayLog`。

### 5.6 Data

模块定位：

- Data 是本地数据迁移、备份、恢复和诊断中心。
- 它不是普通聊天流程的前置条件，但必须作为可信恢复能力存在。

普通用户功能：

- 导出数据包。
- 创建加密备份。
- 恢复前预检。
- 查看最近备份和诊断状态。

高级用户功能：

- import manifest。
- conflict records。
- migration records。
- restore diff。
- rollback records。
- backup manifest hash。
- redaction profile。

不应该承担的职责：

- 不静默导入明文 secrets。
- 不直接覆盖本地数据而跳过预检。
- 不替代 Provider/Models 的手动 key 配置。
- 不执行破坏性清理。

与其他模块关系：

- 覆盖 Provider/Model/Gateway/Knowledge/Settings 等元数据迁移。
- Settings/Security 决定数据导出权限和敏感信息处理。
- Gateway/Models/Knowledge 的数据恢复必须保持 contract 兼容。

后续可拆分边界：

- `dataImportService`。
- `dataExportService`。
- `backupService`。
- `restorePreflightService`。
- `rollbackService`。
- shared contract：`dataRuntime.ts`、`DataMobilityJob`、`DataBackupRecord`、`DataConflictRecord`、`RollbackRecord`。

### 5.7 Settings

模块定位：

- Settings 承载偏好、安全、审计、观测、反馈、评测和关于信息。
- 它是横切能力中心，不是聊天主线入口。

普通用户功能：

- 主题。
- 语言。
- 密度。
- 动效。
- 基础安全状态。
- 基础日志和导出说明。

高级用户功能：

- owner/operator/viewer。
- ACL grant。
- IPC permission mapping 状态。
- audit log 搜索。
- audit export。
- hash-chain integrity check。
- observability privacy。
- feedback。
- eval。
- usage/request/gateway/provider-health 观测。

不应该承担的职责：

- 不编辑 Provider/Gateway/Knowledge 主业务数据。
- 不成为所有模块的杂项页面。
- 不隐藏高风险状态。

与其他模块关系：

- 为所有 IPC 和 Store 行为提供权限边界。
- 为 Provider/Gateway/Data/Observability 提供 redaction 和 audit。
- 为用户偏好影响全局 UI。

后续可拆分边界：

- `settingsService`。
- `securityService`。
- `auditService`。
- `observabilityService`。
- `feedbackEvalService`。
- shared contract：`securityRuntime.ts`、`observabilityRuntime.ts`、`UiPreferences`、`AuditLog`。

## 6. 聊天主线重整计划

第一阶段不做全量服务拆分，先围绕“聊天怎么用得顺”整理入口、状态、错误和跨模块关系。

### 6.1 首页到聊天的路径

当前事实：

- `/` 进入 `/chat/conversations`。

目标：

- 普通用户打开后能在 1 步内继续聊天或新建聊天。
- simple home 可以作为轻量首页或 Chat 空态，但不得恢复 Workspace/Dashboard 主入口。
- 首页快捷入口必须指向真实模块和真实能力。

验收重点：

- 没有旧 `/workspace/...` 或 `/dashboard/...` 主入口。
- 没有内部路由泄漏。
- 没有 fake action。
- 空态能够指导用户配置模型或导入知识库。

### 6.2 聊天和模型选择的关系

Chat 页面只展示：

- 当前模型。
- 模型选择。
- Provider 可用/不可用状态。
- “去配置模型”的入口。

Chat 页面不展示：

- Provider API key 表单。
- custom headers。
- Gateway Key。
- router 全量配置。

错误处理：

- 没有模型：提示先选择或创建模型。
- Provider 未配置 key：提示去 Models 配置。
- Provider 不健康：提示测试 Provider 或换模型。
- 请求超时/重试失败：保留错误消息和重试入口。

### 6.3 聊天和知识库启用的关系

Chat 页面只展示：

- 是否启用知识上下文。
- 当前可用知识文件数量。
- 最近引用。
- 知识不可用的简洁原因。

Knowledge 页面承载：

- 导入。
- 分块。
- 索引。
- 检索预览。
- 引用 trace。

错误处理：

- 无知识文件：提示可选导入。
- 知识文件解析失败：跳转 Knowledge 文件详情。
- 检索为空：允许继续普通聊天，不阻断。
- parser 不支持：明确当前只支持文本类格式。

### 6.4 聊天和工具 / Agent 的关系

Chat 可以保留实验入口：

- 显示 Agent/Tools 是可选实验能力。
- 只允许已授权、已实现、可审计的工具进入聊天上下文。
- 当前不要把外部 MCP 执行写成默认可用。

Chat 不应该：

- 默认展开 Agent 面板。
- 默认执行 MCP。
- 把 Agent 当作主线。
- 在聊天页放 full run center。

### 6.5 聊天和 Gateway 日志 / request log 的关系

Chat 产生 request log 和 usage。

Chat 页面可展示：

- 当前消息失败原因。
- 可跳转的 request log 简要引用。

Gateway/Settings 承载：

- Gateway logs。
- request logs。
- usage。
- provider health。
- redacted export。
- audit 搜索。

### 6.6 失败状态

聊天失败时必须区分：

- 模型不存在。
- Provider 缺 key。
- Provider URL 无效。
- Provider 超时。
- Provider 返回错误。
- 请求被取消。
- 知识检索失败。
- 权限不足。
- Gateway 外部请求失败。

用户可见处理：

- 普通模式给出一句原因和一个下一步入口。
- 高级模式可展开 request log、provider error code、route decision、knowledge trace。

### 6.7 不把高级配置堆到聊天页

聊天页应该是任务中心，不是全系统配置中心。

允许：

- 当前模型。
- 当前上下文。
- 简短状态。
- 跳转入口。

禁止：

- Provider 配置大表单。
- Gateway Key 管理表。
- Knowledge chunk 表。
- MCP 权限表。
- audit log 表。
- data restore 表。

## 7. 架构拆分方向

### 7.1 当前 NexaStore 聚合现状

当前 `NexaStore` 是事实行为 facade。它对 IPC 暴露稳定方法，也直接持有大量领域逻辑。后续拆分必须保持对 renderer/preload/IPC 的兼容，不能直接把 facade 打散到渲染层。

### 7.2 目标服务拆分建议

目标服务不代表当前已完成：

- `secretService`
- `auditService`
- `securityService`
- `providerModelService`
- `providerHealthService`
- `routerService`
- `conversationService`
- `chatRuntimeService`
- `contextService`
- `knowledgeService`
- `gatewayKeyService`
- `localGatewayService`
- `mcpRegistryService`
- `executionRunService`
- `dataLifecycleService`
- `observabilityService`
- `settingsService`
- `snapshotQueryService`

### 7.3 推荐拆分顺序

1. 先统一 shared contract 和测试边界。
2. 拆 `secretService` 与 `auditService`，因为它们是横切依赖。
3. 拆 Provider/Model 与 provider health。
4. 拆 Chat/Conversation/Context，因为聊天主线依赖模型和知识状态。
5. 拆 Gateway Key 与 Gateway log。
6. 拆 Knowledge import/chunk/retrieval。
7. 拆 Data lifecycle。
8. 拆 MCP/Agent/Execution。
9. 最后拆 snapshot query service，替换集中式 snapshot assembly。

### 7.4 拆分前要统一的 shared contract

拆分前必须先确认这些 contract：

- `src/shared/types.ts` 中的核心 DTO。
- `src/shared/ipc.ts` 中的 IPC channel 和 payload arity。
- `src/shared/api.ts` 中的 renderer API。
- `src/shared/navigation.ts` 中的模块和路由事实。
- `src/shared/providerRuntime.ts` 中的 Provider policy/error。
- `src/shared/gatewayRuntime.ts` 中的 endpoint/scope/key/error。
- `src/shared/knowledgeRuntime.ts` 中的 parser/chunk/retrieval 策略。
- `src/shared/conversationRuntime.ts` 中的消息、上下文、导出策略。
- `src/shared/securityRuntime.ts` 中的 permission/RBAC/ACL。
- `src/shared/dataRuntime.ts` 中的数据迁移/备份/恢复策略。
- `src/shared/observabilityRuntime.ts` 中的观测和脱敏策略。

### 7.5 必须先补测试再拆的地方

拆分前需要补或确认测试：

- Chat 发送、失败、重试、重新生成、取消。
- 模型不可用、Provider key 缺失、Provider error。
- Knowledge 检索为空、unsupported parser、引用写入。
- Gateway key scope/quota/rate/revoke/rotate。
- `/v1/responses` reserved 501。
- safeStorage fallback 的边界说明和兼容读取。
- RBAC/ACL deny 优先级。
- audit hash-chain。
- Data backup/restore preflight/rollback。
- IPC permission map 覆盖。
- browser mock 与 preload API parity。

### 7.6 必须保持兼容的地方

拆分期间必须保持：

- Renderer `AppApi` 方法签名。
- Preload `window.nexachat` 暴露面。
- IPC channel 名称。
- 当前 SQLite schema，除非有单独迁移计划。
- 当前 `/ -> /chat/conversations` 行为，除非 Phase 1 明确迁移 simple home。
- Gateway endpoints。
- Gateway API key one-time reveal 和 preview 语义。
- Provider secret 不出 renderer。
- Data 导出不含明文 secret。
- 旧数据兼容读取。

## 8. 业务边界与禁止事项

后续执行必须遵守：

- 不要把 Workspace/Dashboard 当主入口。
- 不要恢复旧 8 模块说法。
- 不要把 Agent 作为第一主线。
- 不要把 Gateway 隐藏成内部实现。
- 不要把 PDF/Office/OCR/真实向量库写成已完成。
- 不要把 `/v1/responses` 写成已完成。
- 不要把 safeStorage fallback 写成强安全。
- 不要为了 UI 好看破坏 IPC、安全、数据、审计边界。
- 不要引入双重实现。
- 不要保留过时入口和死链路。
- 不要把 Provider API key 和 Gateway API key 混为一类。
- 不要把普通模式做成另一套 mock 数据。
- 不要在 renderer 读取 SQLite 或 raw secret。
- 不要让 Data restore 直接覆盖数据而跳过预检。
- 不要让 MCP grant 等同于外部工具可执行。
- 不要用旧文档里的 Workspace/Dashboard 完成状态覆盖当前源码事实。

## 9. 旧逻辑清理原则

用户倾向是“旧代码能删就删”，但工程清理必须完整、可验证。

每次删除前必须：

- 用 `rg` 检查引用链。
- 检查 `src/shared/navigation.ts`。
- 检查 `src/renderer/modules/modulePageRegistry.tsx`。
- 检查 `src/shared/types.ts`。
- 检查 IPC/preload/API 是否有引用。
- 检查 Store 是否仍暴露字段。
- 检查 browser mock。
- 检查 tests。
- 检查 docs。
- 检查 CSS class。
- 检查 package scripts 和 quality gates。

删除时必须：

- 删除完整链路，而不是只删 UI。
- 删除旧 route alias 或保留时写清 owner、reason、delete milestone。
- 更新测试断言。
- 更新 `PROJECT_PROGRESS.md`。
- 更新相关 build plan 或 closure 文档。
- 运行 `git diff --check`。
- 用 `git diff` 审查只删目标范围。

禁止：

- 新旧双实现并存。
- UI 删除但 Store/IPC/mock/test 仍保留死链路。
- 文档仍声称旧入口有效。
- 只因为名称旧就删掉兼容数据字段。

## 10. 分阶段迭代计划

### Phase 0：事实核对与文档清理

目标：

- 把当前源码事实、当前文档事实和过时文档差异对齐。
- 明确当前是 7 模块、chat-first、`/ -> /chat/conversations`。

范围：

- README。
- `PROJECT_PROGRESS.md`。
- `docs/build-plans/**` 中仍被后续执行引用的计划。
- `docs/architecture/**` 中容易被误读为当前完成状态的服务图。
- `task_plan.md`、`progress.md`、`findings.md` 只在明确要刷新历史执行计划时再处理。

不做什么：

- 不改业务源码。
- 不改路由。
- 不改 schema。
- 不删除历史文档，只标记过时或迁移状态。

涉及文件区域：

- `README.md`
- `README.zh-CN.md`
- `PROJECT_PROGRESS.md`
- `docs/build-plans/`
- `docs/architecture/`
- `docs/iteration-plans/`

风险：

- 历史文档有 mojibake，直接大范围替换容易误伤。
- 旧 8 模块计划仍有历史价值，不能简单当错误删除。
- 如果文档清理不彻底，后续 Codex 可能按旧 Workspace/Dashboard 执行。

验收标准：

- 当前事实文档明确 7 模块。
- 当前入口明确 `/ -> /chat/conversations`。
- Workspace/Dashboard 被标记为历史计划或内部兼容字段，不是当前主入口。
- `NexaStore` 集中式现状被明确。
- 未完成能力清单不夸大。

推荐测试命令：

```powershell
git diff --check
npm.cmd run scan:docs
```

### Phase 1：聊天主线和简单首页重整

目标：

- 先围绕“聊天怎么用得顺”重整入口和空态。
- 将 simple home 设计成任务入口，而不是 Workspace/Dashboard 回归。

范围：

- 根入口策略。
- Chat 空态或 simple home。
- 继续聊天、新建聊天、选择模型、导入知识库、开放本地 API 入口。
- Chat 错误状态和跨模块跳转。

不做什么：

- 不重写 Provider/Gateway/Knowledge 运行逻辑。
- 不把复杂配置塞进聊天页。
- 不新增 Agent 主流程。
- 不引入新依赖。

涉及文件区域：

- `src/shared/navigation.ts`
- `src/renderer/App.tsx`
- `src/renderer/components/AppFrame.tsx`
- `src/renderer/modules/ChatPage.tsx`
- `src/renderer/modules/ModelsPage.tsx`
- `src/renderer/modules/KnowledgePage.tsx`
- `src/renderer/modules/GatewayPage.tsx`
- `src/shared/i18n.ts`
- `tests/ui-smoke.spec.ts`
- `PROJECT_PROGRESS.md`

风险：

- 改 `/` 行为会影响 Electron smoke 和 UI smoke。
- simple home 如果设计过重，会变成 Dashboard 回归。
- Chat 页面容易吸收太多高级设置。

验收标准：

- 打开应用后的第一路径清楚。
- 普通用户能 1 步继续聊天或新建聊天。
- 没有 Workspace/Dashboard 主入口。
- Chat 页只放必要跨模块状态和跳转。
- 模型、知识库、Gateway 配置仍回到各自模块。

推荐测试命令：

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
git diff --check
```

### Phase 2：普通模式 / 高级模式边界落地

目标：

- 把普通模式和高级模式做成信息密度与展开层级的差异，而不是两套实现。

范围：

- 全局模式开关或 per-module 高级展开。
- Models 普通/高级分层。
- Knowledge 普通/高级分层。
- Gateway 普通/高级分层。
- Settings 安全和审计的必要可见性。

不做什么：

- 不改变权限模型。
- 不创建第二套 API/mock/store。
- 不隐藏关键安全状态。

涉及文件区域：

- `src/shared/types.ts`
- `src/shared/uiStatus.ts`
- `src/shared/i18n.ts`
- `src/renderer/components/`
- `src/renderer/modules/ModelsPage.tsx`
- `src/renderer/modules/KnowledgePage.tsx`
- `src/renderer/modules/GatewayPage.tsx`
- `src/renderer/modules/SettingsPage.tsx`
- `tests/app.test.tsx`
- `tests/ui-smoke.spec.ts`

风险：

- 普通模式隐藏过多会让失败不可解释。
- 高级模式如果新增状态源，会造成双实现。
- 权限和显示模式容易被混淆。

验收标准：

- 普通模式可完成聊天、选模型、导入知识库、基础 Gateway。
- 高级模式可查看技术细节。
- Provider key、Gateway key、审计、导出风险仍有必要可见性。
- 所有模式复用同一 AppApi/IPC/Store contract。

推荐测试命令：

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:ui-smoke
npm.cmd run scan:quality
git diff --check
```

### Phase 3：NexaStore 服务拆分准备与 shared contract 统一

目标：

- 不急着拆文件，先把拆分前的 shared contract、测试和边界图补齐。

范围：

- service boundary map。
- Store 方法分组。
- shared types 收敛。
- IPC contract 审计。
- browser mock parity 审计。
- 高风险链路测试补齐。

不做什么：

- 不一次性移动大段 Store 逻辑。
- 不改 schema。
- 不改业务行为。
- 不引入新依赖。

涉及文件区域：

- `src/main/services/store.ts`
- `src/shared/types.ts`
- `src/shared/api.ts`
- `src/shared/ipc.ts`
- `src/shared/*Runtime.ts`
- `src/preload/index.ts`
- `src/renderer/mockApi.ts`
- `tests/*`
- `docs/architecture/store-facade-boundaries.md`

风险：

- 只画图不补测试会让下一轮拆分风险更高。
- shared contract 过度泛化会拖慢后续执行。
- browser mock 可能掩盖 Electron IPC 差异。

验收标准：

- 每个 Store 方法有归属服务方向。
- 每个拆分目标有输入/输出/副作用说明。
- Chat/Models/Knowledge/Gateway/Security/Data 的关键测试覆盖存在。
- IPC/preload/AppApi/mockApi parity 被验证。

推荐测试命令：

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
git diff --check
```

### Phase 4：Gateway / Knowledge / Models 主线协同增强

目标：

- 强化 Chat 主线依赖的三大支撑能力：Models、Knowledge、Gateway。

范围：

- Models 普通配置闭环。
- Provider 测试错误可操作性。
- Knowledge 普通导入和启用状态。
- Gateway 本地 API 开放路径。
- Chat 中跨模块状态的简洁引用。

不做什么：

- 不实现 PDF/Office/OCR。
- 不接外部向量库。
- 不把 `/v1/responses` 做成可用。
- 不重写 Provider adapter。
- 不绕过现有 Gateway runtime。

涉及文件区域：

- `src/main/services/openAiCompatibleAdapter.ts`
- `src/main/services/localGateway.ts`
- `src/main/services/store.ts`
- `src/shared/providerRuntime.ts`
- `src/shared/gatewayRuntime.ts`
- `src/shared/knowledgeRuntime.ts`
- `src/renderer/modules/ChatPage.tsx`
- `src/renderer/modules/ModelsPage.tsx`
- `src/renderer/modules/KnowledgePage.tsx`
- `src/renderer/modules/GatewayPage.tsx`
- `tests/gateway-runtime.test.ts`
- `tests/provider-*`
- `tests/knowledge-runtime.test.ts`

风险：

- Gateway 和 Chat 共享调用链，改错会同时影响外部 API 和聊天。
- Knowledge 检索增强容易被误写成完整 RAG。
- Provider 错误归一化必须保持 redaction。

验收标准：

- Chat 能清楚解释模型、知识库、Gateway 相关失败。
- Models 配置后 Chat 可直接使用。
- Knowledge 导入后 Chat 可引用。
- Gateway 可独立给外部工具调用当前本地能力。
- `/v1/responses` 仍明确 reserved。

推荐测试命令：

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
git diff --check
```

### Phase 5：Agent 实验区、安全执行、沙箱和真实 MCP 的后续预留

目标：

- 保留 Agent/Tools/MCP 的实验入口，同时为未来真实执行、安全沙箱和 MCP protocol hardening 留接口。

范围：

- 实验标识。
- fixture tool 边界。
- approval flow。
- trace events。
- MCP grant 不等于可执行的说明。
- future sandbox 需求和安全门槛。

不做什么：

- 不开放任意命令执行。
- 不开放任意外部 MCP 执行。
- 不做 fake workflow canvas。
- 不把 Agent 变成默认聊天主线。

涉及文件区域：

- `src/shared/executionRuntime.ts`
- `src/shared/securityRuntime.ts`
- `src/main/services/store.ts`
- `src/renderer/modules/ToolsPage.tsx`
- `src/renderer/modules/ChatPage.tsx`
- `tests/execution-runtime.test.ts`
- `tests/security-runtime.test.ts`
- `docs/architecture/`

风险：

- 实验功能如果入口太强，会压过聊天主线。
- 权限 UI 如果不清楚，用户会误以为已经支持任意工具。
- 沙箱设计不足时不应开放真实执行。

验收标准：

- Agent/Tools 清楚标为 experimental。
- fixture tool、approval、trace 可验证。
- 外部 MCP 执行和 sandbox 明确是未来能力。
- Chat 不默认调用 Agent/MCP。
- 安全和审计边界清楚。

推荐测试命令：

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:ui-smoke
npm.cmd run scan:security
git diff --check
```

## 11. 第一阶段后续可执行 Codex 任务草案

后续 Codex 可以从以下任务开始，不在本轮执行：

1. 清理旧 Workspace / Dashboard 文档与入口残留
   - 目标：把 README、active build plan 和 progress 中仍误导当前事实的 8 模块/Workspace-first 表述改为 7 模块/chat-first。
   - 验收：源码事实、README、PROJECT_PROGRESS、active plan 不冲突。

2. 设计 simple home 到 chat-first 的信息架构
   - 目标：决定 simple home 是轻量首页、Chat 空态，还是 `/` 仍直达聊天但首屏提供入口。
   - 验收：不恢复 Dashboard，不泄漏 route，不制造 fake actions。

3. 梳理 Chat / Models / Knowledge shared contracts
   - 目标：列出 Chat 依赖 Models/Knowledge 的输入、输出、错误和 UI 状态。
   - 验收：聊天失败原因和跳转入口有稳定 contract。

4. 拆分 NexaStore 前的 service boundary map
   - 目标：按 Store 方法映射未来服务归属、共享类型、测试需求和副作用。
   - 验收：不改业务行为，但下一轮能安全拆 `secretService`、`auditService`、Provider/Model、Chat/Context。

5. 建立普通模式 / 高级模式 UI 与权限边界
   - 目标：定义普通/高级模式显示密度、默认展开、不可隐藏安全状态和权限关系。
   - 验收：没有双实现，不绕过 RBAC/ACL/IPC permission。

## 12. 验收标准

本计划本身的验收标准：

- 与当前源码事实一致。
- 不夸大能力。
- 7 模块表述一致。
- chat-first 表述一致。
- 当前 `/ -> /chat/conversations` 表述一致。
- 普通 / 高级模式边界清楚。
- Gateway 独立核心模块清楚。
- Agent 实验功能定位清楚。
- `NexaStore` 当前集中式现状清楚。
- 服务拆分被写成目标路线，而不是当前完成状态。
- 有明确后续阶段。
- 有禁止事项。
- 有旧逻辑清理原则。
- 可被后续 Codex 直接转成实施任务。

后续实施验收标准：

- 不恢复 Workspace/Dashboard 主入口。
- 不恢复旧 8 模块说法。
- 不把未完成能力写成已完成。
- 不引入双重实现。
- 不破坏 IPC/preload/Store/SQLite/security/audit 边界。
- 每轮完成后更新 `PROJECT_PROGRESS.md`。
- 每轮至少执行 `git diff --check`。
- 涉及源码、配置、路由、测试或 package 变更时执行 `npm.cmd run typecheck` 与 `npm.cmd run test`。
