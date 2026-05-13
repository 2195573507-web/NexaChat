# Interaction Flows

## First Launch Flow

- Entry: application start.
- User actions: view setup state, choose add Provider or start with local scanned model if available.
- System feedback: one main window, no extra popup, setup checklist in Dashboard.
- Success state: user reaches chat input with a valid model selected.
- Failure state: no Provider/model shows actionable empty state.
- Related data tables: `app_settings`, `ui_preferences`, `providers`, `models`.
- Acceptance criteria: first user can identify next action within 10 seconds.

## Add Provider Flow

- Entry: 模型 / 供应商 / 添加.
- User actions: choose provider type, enter Base URL/API Key/proxy/headers, save and test.
- System feedback: inline validation, connection status, recent error detail.
- Success state: provider saved with secret reference and health state.
- Failure state: shows 401/timeout/endpoint/model list failure with repair suggestions.
- Related data tables: `providers`, `models`, `audit_logs`, `request_logs`.
- Acceptance criteria: Provider is created without exposing API Key in logs.

## Test Model Connection Flow

- Entry: Provider detail or Model detail.
- User actions: click test connection or speed test.
- System feedback: testing state, latency, normalized error.
- Success state: model health updated.
- Failure state: diagnosis panel opens inline.
- Related data tables: `providers`, `models`, `request_logs`, `usage_records`.
- Acceptance criteria: success/failure is visible and logged.

## New Conversation Flow

- Entry: 对话 / 会话 / 新建.
- User actions: type prompt, optionally select model/assistant/context, send.
- System feedback: user message saved, assistant streaming starts.
- Success state: assistant message completed and stored locally.
- Failure state: assistant message failed with retry and request log link.
- Related data tables: `conversations`, `messages`, `request_logs`, `usage_records`.
- Acceptance criteria: restart keeps conversation.

## Continue History After API Switch Flow

- Entry: existing conversation top model selector.
- User actions: switch Provider/Model/API and continue sending.
- System feedback: inline note says local history remains; new assistant message shows new provider/model snapshot.
- Success state: conversation contains messages from multiple Providers/Models.
- Failure state: model unavailable does not hide or delete history.
- Related data tables: `conversations`, `messages`, `providers`, `models`, `request_logs`.
- Acceptance criteria: historical messages remain visible and searchable.

## Multi-Model Comparison Flow

- Entry: 对话 / 多模型对比.
- User actions: choose prompt, select models, run comparison.
- System feedback: parallel response columns with status and latency.
- Success state: comparison result can be saved as conversation branch or artifact.
- Failure state: per-model errors shown independently.
- Related data tables: `messages`, `request_logs`, `usage_records`, `models`.
- Acceptance criteria: one model failure does not cancel all results.

## Import CCS Config Flow

- Entry: 数据配置 / 智能导入.
- User actions: choose CCS config file, preview mapped providers/routes, resolve conflicts.
- System feedback: detected type, redaction, conflicts.
- Success state: provider/model/route records created.
- Failure state: invalid format with line/detail and no partial activation.
- Related data tables: `providers`, `models`, `model_routes`, `config_snapshots`, `audit_logs`.
- Acceptance criteria: secrets reviewed and not logged.

## Import sub2api JSON Flow

- Entry: 数据配置 / 智能导入.
- User actions: choose JSON, map endpoint to OpenAI-compatible provider, review risk label.
- System feedback: gateway-style provider warning, conflict choices.
- Success state: reviewed provider entries created.
- Failure state: schema mismatch or unsafe header shown with fix.
- Related data tables: `providers`, `models`, `model_routes`, `audit_logs`.
- Acceptance criteria: no silent key import or overwrite.

## Generate Local API Key Flow

- Entry: 本地网关 / API Key.
- User actions: create key, set name/scope/quota/expiration, copy once.
- System feedback: key shown once, then masked.
- Success state: key active and auditable.
- Failure state: invalid scope or storage failure with repair actions.
- Related data tables: `gateway_api_keys`, `audit_logs`.
- Acceptance criteria: key is never recoverable in plain text after creation.

## External App Integration Flow

- Entry: 本地网关 / 外部接入.
- User actions: choose app profile, select virtual model/key, copy config.
- System feedback: Base URL, model, API key usage, endpoint warnings.
- Success state: user has app-specific instructions.
- Failure state: gateway disabled or no key/model shows setup actions.
- Related data tables: `gateway_api_keys`, `model_aliases`, `model_routes`.
- Acceptance criteria: includes Codex, Claude Code, Cursor, Continue, VSCode, Cherry Studio, Chatbox, curl, Python, Node.js.

## Knowledge File Upload Flow

- Entry: 知识库 / 文件 or chat attachment.
- User actions: upload PDF/Word/Excel/PPT/Markdown/TXT/CSV/JSON/code file.
- System feedback: upload, parse, chunk, embed, index progress.
- Success state: file indexed and available for retrieval.
- Failure state: parse/index error with retry and logs.
- Related data tables: `files`, `knowledge_chunks`, `knowledge_bases`, `request_logs`.
- Acceptance criteria: status is visible and recoverable.

## MCP Server Add Flow

- Entry: 工具与 Agent / MCP.
- User actions: add stdio/SSE/HTTP server, test connection, discover tools, grant permission.
- System feedback: connection and tool discovery states.
- Success state: approved tools are available to Chat/Agent.
- Failure state: server error and permission denied state shown.
- Related data tables: `mcp_servers`, `tools`, `audit_logs`.
- Acceptance criteria: discovery does not imply permission.

## Agent Run Flow

- Entry: 工具与 Agent / Agent or Run Center.
- User actions: choose agent, goal, model, tools, knowledge, start.
- System feedback: plan, steps, trace, tool calls, human approval nodes.
- Success state: run completed with trace and output.
- Failure state: failed step shows retry/stop/log actions.
- Related data tables: `agents`, `request_logs`, `audit_logs`, `usage_records`.
- Acceptance criteria: destructive actions require confirmation.

## Error Diagnosis Flow

- Entry: error banner, log row, provider test, chat failed message.
- User actions: open diagnosis, read reason, copy error, open logs, apply repair.
- System feedback: human explanation, technical details collapsed, actions.
- Success state: user knows next step.
- Failure state: unknown error still has copy/open logs actions.
- Related data tables: `request_logs`, `gateway_logs`, `audit_logs`.
- Acceptance criteria: covers 401, 403, 404, 429, 500, timeout, model_not_found, stream interrupted.

## Diagnostic Package Export Flow

- Entry: 设置与安全 / 系统设置 or 错误诊断.
- User actions: choose content, preview redaction, export.
- System feedback: package manifest and redaction summary.
- Success state: local diagnostic archive created.
- Failure state: file write failure with path and retry.
- Related data tables: `request_logs`, `gateway_logs`, `audit_logs`, `app_settings`.
- Acceptance criteria: secrets redacted by default.

## Modify Theme / Font Flow

- Entry: 设置与安全 / 界面设置.
- User actions: choose theme, density, font, KaiTi / 楷体 option, language.
- System feedback: live preview and saved state.
- Success state: preference persists after restart.
- Failure state: unavailable font falls back with explanation.
- Related data tables: `ui_preferences`, `app_settings`.
- Acceptance criteria: KaiTi option exists but is not default UI font.

