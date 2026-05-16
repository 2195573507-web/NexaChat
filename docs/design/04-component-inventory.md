# Component Inventory

## Status / Current Relevance

This design document predates the chat-first 7-module mainline. Keep component guidance only where it matches the current architecture: Chat, Models, Knowledge Base, Tools, Gateway, Data, and Settings.

Each component definition includes purpose, module, input data, interaction behavior, states, and acceptance criteria.

## AppShell

- Purpose: application frame.
- Module: global.
- Input data: navigation groups, current route, workspace, global status.
- Interaction: route switch, sidebar collapse, command entry.
- States: loading, ready, offline, error.
- Acceptance: renders the current 7 modules and does not hardcode feature behavior in Sidebar.

## Sidebar

- Purpose: first-level navigation.
- Module: global.
- Input data: module `label`, `route`, `icon`, `children`, `permission`, `status`.
- Interaction: select module, collapse/expand.
- States: active, hover, disabled, badge, status.
- Acceptance: current 7-module navigation and clear active state.

## Topbar

- Purpose: current workspace/search/current model/gateway state.
- Module: global.
- Input data: workspace, current model, gateway status.
- Interaction: search, new chat, model shortcut, open settings.
- States: normal, gateway offline, sync/loading.
- Acceptance: no cluttered action dumping.

## TopTabs

- Purpose: second-level navigation.
- Module: all modules.
- Input data: tab label, route, count, status.
- Interaction: switch tab.
- States: active, hover, disabled, planned.
- Acceptance: each module shows required tabs.

Historical note: the old `ModuleTabs` component name and `.module-tabs` CSS class are superseded. Current UI uses `.top-tabs`; `.module-tabs` and `.module-subnav-panel` must remain absent.

## PageHeader

- Purpose: page title, description, primary action.
- Module: all pages.
- Input data: title, status, actions.
- Interaction: primary/secondary actions.
- States: normal, loading, warning.
- Acceptance: title fits and actions are clear.

## StatusCard

- Purpose: display status such as gateway/model/knowledge health.
- Module: chat, gateway, model, knowledge.
- Input data: status, label, summary, action.
- Interaction: open detail or repair action.
- States: ok, warning, error, loading, empty.
- Acceptance: not nested inside another card.

## MetricCard

- Purpose: show usage, tokens, cost estimate, latency.
- Module: gateway, settings, observability surfaces.
- Input data: metric value, unit, period, trend.
- Interaction: filter or drill down.
- States: loading, empty, estimate.
- Acceptance: estimate is labeled as estimate.

## DataTable

- Purpose: dense list/table display.
- Module: models, knowledge files, gateway, settings audit.
- Input data: rows, columns, filters, selection.
- Interaction: sort, filter, row action, detail open.
- States: loading, empty, error, selected.
- Acceptance: supports keyboard and no whole-page horizontal overflow.

## ConfigForm

- Purpose: provider/settings/config forms.
- Module: model, data config, settings.
- Input data: schema, values, validation errors.
- Interaction: edit, validate, save, reset.
- States: dirty, saving, saved, invalid, error.
- Acceptance: errors appear near fields.

## SecretInput

- Purpose: API keys and sensitive headers.
- Module: model, gateway, security.
- Input data: masked value, secret reference, validation.
- Interaction: reveal temporary, copy disabled by default, save, test.
- States: empty, masked, dirty, validating, saved, error.
- Acceptance: never logs secret value.

## ProviderCard

- Purpose: provider summary.
- Module: model.
- Input data: name, type, health, model count, last used.
- Interaction: open detail, test connection, disable.
- States: active, disabled, unhealthy, testing.
- Acceptance: shows Provider as connection, not model.

## ModelCard

- Purpose: model summary.
- Module: model, chat selector.
- Input data: model id, provider, capability, context, health.
- Interaction: select, view detail, run speed test.
- States: available, disabled, unhealthy, selected.
- Acceptance: provider and model identity both visible.

## HealthBadge

- Purpose: compact health indication.
- Module: models, gateway, chat.
- Input data: status, latency, last checked.
- Interaction: tooltip, open diagnostics.
- States: healthy, degraded, offline, unknown.
- Acceptance: not color-only.

## ChatLayout

- Purpose: chat page structure.
- Module: chat.
- Input data: conversations, messages, context state, model state.
- Interaction: select conversation, send, stop, switch model, toggle rail.
- States: empty, loading, streaming, error.
- Acceptance: usable at minimum desktop size.

## ConversationList

- Purpose: local conversation navigation.
- Module: chat.
- Input data: conversations, filters, search.
- Interaction: select, pin, favorite, archive, rename.
- States: loading, empty, active, archived, pinned.
- Acceptance: local history remains visible after API switch.

## MessageBubble

- Purpose: render a message.
- Module: chat.
- Input data: role, content, provider/model snapshot, tokens, latency, error, citations.
- Interaction: copy, regenerate, branch, view request log.
- States: streaming, completed, failed, cancelled.
- Acceptance: assistant source trace is available.

## MessageToolbar

- Purpose: message actions.
- Module: chat.
- Input data: message id, allowed actions.
- Interaction: copy, edit, resend, regenerate, favorite, export.
- States: enabled, disabled, loading.
- Acceptance: no layout jump on hover.

## ChatInput

- Purpose: compose and send.
- Module: chat.
- Input data: draft, attachments, selected model, context strategy.
- Interaction: type, attach, send, stop.
- States: empty, ready, uploading, streaming, error.
- Acceptance: stop generation visible while streaming.

## ModelSelector

- Purpose: select model or virtual model.
- Module: chat, gateway.
- Input data: recent models, providers, health, capabilities.
- Interaction: search, select, open model detail.
- States: no model, unavailable, selected.
- Acceptance: unavailable models show reason.

## AssistantSelector

- Purpose: choose assistant behavior.
- Module: chat.
- Input data: assistants, default assistant.
- Interaction: select, edit, create.
- States: none, selected, planned.
- Acceptance: assistant is separate from model.

## ContextStrategySelector

- Purpose: choose context sending strategy.
- Module: chat.
- Input data: recent N, summary, manual selection, token limit.
- Interaction: select strategy, configure limit.
- States: normal, token overflow, manual mode.
- Acceptance: supports four required strategies.

## FileAttachmentPanel

- Purpose: manage chat files.
- Module: chat, knowledge.
- Input data: files, parse status.
- Interaction: attach, remove, retry parse, open details.
- States: uploading, parsing, indexed, failed.
- Acceptance: failures have retry and details.

## ArtifactPanel

- Purpose: show generated artifacts.
- Module: chat.
- Input data: artifact metadata, content type.
- Interaction: open, export, copy.
- States: empty, loading, ready, error.
- Acceptance: artifact output does not replace message history.

## LogViewer

- Purpose: request/gateway/audit logs.
- Module: settings & security.
- Input data: logs, filters.
- Interaction: filter, open detail, copy redacted.
- States: empty, loading, error.
- Acceptance: links to related message and provider/model.

## ErrorDiagnosisPanel

- Purpose: explain errors and repairs.
- Module: settings & security, chat, model.
- Input data: error code, provider, endpoint, request id.
- Interaction: copy error, open logs, repair action.
- States: collapsed, expanded, resolving.
- Acceptance: human reason, technical details, repair suggestion.

## ImportWizard

- Purpose: guided import.
- Module: data config.
- Input data: file/config, detected type, conflicts.
- Interaction: detect, map, review, confirm.
- States: detecting, preview, conflict, importing, done, failed.
- Acceptance: no silent overwrite.

## RouteRuleEditor

- Purpose: model routing rules.
- Module: gateway.
- Input data: rules, conditions, fallbacks.
- Interaction: add/edit/reorder/test rule.
- States: valid, invalid, testing.
- Acceptance: task/price/speed/context/health routing supported.

## ApiKeyManager

- Purpose: local gateway keys.
- Module: gateway, security.
- Input data: key metadata, scope, quota, expiration.
- Interaction: create, reveal once, revoke, rotate.
- States: active, expired, revoked, quota-exceeded.
- Acceptance: key value stored securely and shown once.

## EmptyState

- Purpose: actionable empty state.
- Module: all.
- Input data: reason, action, secondary action.
- Interaction: primary action.
- States: none.
- Acceptance: never just says "no data".

## LoadingState

- Purpose: loading feedback.
- Module: all.
- Input data: operation, progress.
- Interaction: cancel when possible.
- States: skeleton, spinner, progress, streaming.
- Acceptance: over 5 seconds shows explanation.

## ErrorState

- Purpose: recoverable error.
- Module: all.
- Input data: cause, details, actions.
- Interaction: retry, copy, open logs.
- States: warning, error, critical.
- Acceptance: includes fix suggestion.

## ConfirmDialog

- Purpose: dangerous confirmation only.
- Module: global.
- Input data: action, impact, confirmation text.
- Interaction: confirm/cancel.
- States: normal, processing.
- Acceptance: only used for irreversible actions.

## Toast

- Purpose: lightweight feedback.
- Module: global.
- Input data: message, type, action.
- Interaction: dismiss, action.
- States: info, success, warning, error.
- Acceptance: not used as only error explanation.

## CommandPalette

- Purpose: reserved quick command surface.
- Module: global.
- Input data: commands, routes, actions.
- Interaction: search, run command.
- States: reserved, enabled later.
- Acceptance: planned but not fake-complete.
