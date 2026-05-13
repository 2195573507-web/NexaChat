# Information Architecture

## First-Level Navigation

NexaChat has at most 8 first-level modules:

1. 工作台
2. 对话
3. 模型
4. 知识库
5. 工具与 Agent
6. 本地网关
7. 数据配置
8. 设置与安全

## Second-Level Tabs

### 工作台

- 总览
- 工作区
- 最近活动
- 快捷操作

### 对话

- 会话
- 助手
- Prompt Lab
- 多模型对比
- Artifacts
- 本地历史

### 模型

- 供应商
- 模型列表
- 能力矩阵
- 参数模板
- 健康检测

### 知识库

- 文件
- 知识库
- 检索设置
- 上下文
- 记忆

### 工具与 Agent

- 工具
- MCP
- Agent
- 运行中心
- 工作流预留

### 本地网关

- 网关状态
- API Key
- 虚拟模型
- 模型路由
- 外部接入
- 网关日志

### 数据配置

- 智能导入
- 导入导出
- 备份恢复
- 配置快照
- 数据清理

### 设置与安全

- 请求日志
- 用量统计
- 错误诊断
- 模型评测
- 密钥安全
- 审计
- 界面设置
- 系统设置

## Hierarchy Rules

- First-level navigation switches product modules.
- Second-level tabs switch stable surfaces within the module.
- Right rail shows contextual details and should not become a hidden primary page.
- Command palette is reserved for quick navigation and commands.
- Sidebar should be generated from module metadata rather than hardcoded per feature.

## Route Strategy

Future route examples:

- `/dashboard/overview`
- `/chat/conversations`
- `/models/providers`
- `/knowledge/files`
- `/tools/mcp`
- `/gateway/routes`
- `/data/import`
- `/settings/security`

Routes should map to module and tab identity so deep links can restore the right surface.

## Permission And Status Metadata

Each module entry should support:

- `label`
- `route`
- `icon`
- `children`
- `permission`
- `status`
- `badge`
- `featureStage`: `ready`, `planned`, `environment-limited`, or `hidden`

Planned features should be labeled as planned, not rendered as working controls.

