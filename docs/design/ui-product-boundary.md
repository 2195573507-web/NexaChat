# UI 产品边界

NexaChat 的 UI 方向是紧凑、干净、桌面工具式、聊天优先、低干扰和模块边界清晰。当前 shell 必须保持 7 个顶层模块，不恢复 Workspace-first 或 Dashboard-first 导航。

## 设计原则

- 首屏服务 Chat，而不是营销页或仪表盘首页。
- 使用熟悉的桌面工具控件：侧栏、tabs、按钮、表单、状态 pill、日志表、空状态。
- 保持 restrained palette、系统字体、稳定密度和清晰层级。
- 避免重 blur、Liquid Glass、大面积透明、复杂装饰动画、卡片堆卡片。
- light/dark/system theme 必须避免低对比文字、placeholder、disabled、selected 和 status 状态。

## 真实标签

UI 文案必须诚实标注能力边界：

- `/v1/responses`: basic text，不是完整 OpenAI Responses API。
- Anthropic / Gemini: native first version 可用；tool use、vision 和高级 reasoning 仍不可显示为已完成。
- Knowledge Base: text-like、provider embedding/vector when configured、lexical fallback、retrieval trace、citations。
- Tools / Agent / MCP: metadata registration、dry-run、fixture-only、approval、trace；授权不代表已连接或可执行。
- Data rollback: limited rollback records，不是 full database restore。
- Gateway: local-only，除非明确实现并验证外部网络发布。
- experimental 或 reserved 能力不得显示为 available。

## 禁止回退

- 不恢复旧 8 模块描述。
- 不引入 Workspace/Dashboard-first 入口。
- 不把 `/v1/responses` basic text 描述为完整 OpenAI Responses API；不把 PDF/OCR/rerank/full vector DB RAG、arbitrary MCP execution 或 full restore 描述为当前已实现。
- 不把 encrypted redacted backup package 描述为 full database backup/restore。
- 不用视觉装饰掩盖功能未完成状态。
