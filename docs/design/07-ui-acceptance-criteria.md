# UI Acceptance Criteria

## Navigation Structure

- Exactly the planned 8 first-level modules or fewer are visible.
- Required second-level tabs are defined for each module.
- Sidebar active state is clear.
- Navigation is config-driven in design and not hardcoded feature sprawl.

## Page Hierarchy

- Topbar, Sidebar, ModuleTabs, main content, and right rail have clear roles.
- No page appears as a marketing hero instead of the actual tool.
- Cards are used for repeated items, not nested page sections.

## Chat Usability

- Chat page has left conversation list, middle message area, top model switching, right parameter/context rail, input box, attachment, send, stop generation, and message action menu.
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

