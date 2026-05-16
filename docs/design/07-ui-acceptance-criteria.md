# UI Acceptance Criteria

## Navigation Structure

- Exactly 7 first-level modules are visible: Chat, Models, Knowledge Base, Tools, Gateway, Data, and Settings.
- Required second-level tabs are defined for each module.
- Sidebar active state is clear.
- Navigation is config-driven in design and not hardcoded feature sprawl.
- `/` opens `/chat/conversations`; `/workspace` is not restored as the main entry.

## Page Hierarchy

- Topbar, sidebar/module rail, top tabs, main content, and optional right rail have clear roles.
- No page appears as a marketing hero instead of the actual tool.
- Cards are used for repeated items, not nested page sections.
- `.module-tabs` and `.module-subnav-panel` are old UI surfaces and must remain absent.

## Chat Usability

- Chat page has left conversation list, middle message area, task-oriented quick actions, top model switching, input box, send, and message action menu.
- Ordinary mode shows user tasks such as new chat, continue conversation, choose model, knowledge Q&A, import config, gateway status, and preferences.
- Advanced mode may reveal the parameter/context rail and technical details such as provider id, model id, gateway endpoint, request logs, traces, permissions, and ACL.
- Streaming output is visible and stoppable.
- Context overflow warning is visible and actionable.
- Model switch states local history is retained.

## Provider Configuration

- Provider detail supports Base URL, API Key, Proxy URL, Custom Headers, connection test, model fetch, manual model add, health check, and recent errors.
- SecretInput masks values and never exposes secrets in logs.

## Local History UI

- Conversation list supports search, grouping, pin, favorite, archive.
- History remains visible after API/Provider/Model switch.
- Each assistant message can show Provider, Model, tokens, latency, and request log link.

## Model Switch UI

- Model selector shows provider, model, health, capability, and unavailable reasons.
- Switching model does not clear message timeline.

## Error Diagnosis UI

- Errors include human reason, technical details collapsed, repair suggestions, copy error, and open logs.
- Covers 401, 403, 404, 429, 500, timeout, model_not_found, stream interrupted, SQLite failure, and import failure.

## Theme Switching

- Light, dark, and system themes are planned.
- High contrast is reserved.
- Theme changes persist in UI preferences.
- Advanced mode persists in UI preferences.

## Font Setting

- Default system font is planned.
- Chinese font stack is planned.
- Monospace font is planned for code/logs.
- Font changes do not break button or table layout.

## KaiTi / 楷体 Option

- KaiTi / 楷体 option is present.
- It is not default.
- It affects message body or creative preview only.
- It does not affect navigation, buttons, forms, logs, or error text.

## Empty States

- No Provider, no Model, no Conversation, no Knowledge Base, no Logs, and no API Key states all have reason and action.

## Loading States

- Model test, streaming output, file parsing, knowledge indexing, and gateway starting have progress/status indicators.

## Error States

- Required error states have understandable reason, technical details, repair suggestions, copy error, and open logs.

## Desktop Window Size

- Default future window: 1280 x 820.
- Minimum future window: 1040 x 680.
- Main chat remains usable at minimum size by collapsing right rail first.

## No Extra Popups

- Startup opens only the main window.
- Normal actions do not use modal popups.
- Dangerous destructive actions may use confirmation dialogs.

## No Old Project Name

- UI docs must reference NexaChat and AI 对话中枢 only.
- Old project names must not appear as product labels.

## No Old UI Residue

- No Liquid Glass default direction.
- No old sidebar sprawl.
- No fake workflow/agent completion claim.
- No Dashboard-first or Workspace-first entry point.

## Capability Boundaries

- Gateway shows `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings` as available endpoints; `/v1/responses` is reserved / 501.
- Knowledge Base does not claim PDF, Office, OCR, external vector DB, rerank, or full RAG evaluation as current capabilities.
- Tools / Agent / MCP does not claim arbitrary MCP executor, arbitrary code execution, or release-grade Agent sandbox.
