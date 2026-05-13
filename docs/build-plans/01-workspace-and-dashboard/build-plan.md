# Workspace And Dashboard Build Plan

## Final Goal

Create the entry module for NexaChat that gives users a clear overview of workspaces, recent conversations, model health, local gateway state, knowledge status, and fast actions without becoming a generic admin dashboard.

## Scope

Includes Dashboard, Workspace, recent conversations, recent models, daily usage, model health, gateway status, knowledge base status, quick actions, workspace-specific configuration, and workspace import/export planning.

Does not include full team collaboration, RBAC, remote sync, or project management workflows in v1.

## Submodules

- Dashboard overview.
- Workspace list and workspace details.
- Recent conversations.
- Recent models.
- Today usage.
- Model health state.
- Gateway state.
- Knowledge base state.
- Quick actions.
- Workspace import/export.

## Key Features

- Dashboard shows the minimum state needed to start work: default workspace, last conversations, current model, gateway health, and setup gaps.
- Workspace stores local preferences such as default Provider, default Model, default Router, knowledge collections, and UI density.
- Quick actions include new conversation, add Provider, import config, open gateway integration, upload file, and view diagnostics.
- Import/export packages workspace configuration without raw secrets unless the user explicitly exports a protected backup.

## Relationship With Other Modules

- Conversation module provides recent conversation metadata.
- Model module provides recent models and health.
- Knowledge module provides index status and file parsing state.
- Gateway module provides local API status.
- Logs module provides recent errors and usage.
- Data configuration module provides workspace import/export.

## Data Requirements

Main tables: `workspaces`, `conversations`, `models`, `providers`, `knowledge_bases`, `gateway_logs`, `usage_records`, `config_snapshots`, `ui_preferences`.

Inputs: workspace settings, usage records, model health records, gateway state, recent activity.  
Outputs: selected workspace, workspace defaults, import/export packages, quick action routing.

## UI Requirements

- Page layout: compact overview grid plus recent activity list.
- Dashboard cards: recent conversations, recent models, today usage, model health, gateway status, knowledge status.
- Cards must not nest other cards.
- Empty state: no workspace shows one default local workspace creation action.
- Quick actions are icon+text buttons with clear labels.
- Do not show a large hero page.

## Security Requirements

- Workspace export must redact API keys by default.
- Workspace import must validate Provider URLs and custom headers before activation.
- Workspace-specific configuration cannot grant MCP or Agent permissions implicitly.

## Extension Interfaces

- Workspace profile schema.
- Workspace-scoped Provider/Model defaults.
- Workspace import/export manifest.
- Workspace activity stream.

## Testing Requirements

- Dashboard renders with no Provider, no Model, no conversations.
- Recent conversation and model lists update from local SQLite.
- Workspace import rejects invalid schema.
- Export redacts secrets.
- Quick actions route to the right module.

## Acceptance Criteria

- User can identify setup state within 5 seconds.
- Dashboard shows recent conversations, recent models, usage, health, gateway, and knowledge state.
- Workspace can define independent defaults.
- Workspace import/export is specified with redaction and conflict behavior.
- Relationship with chat, model, knowledge, gateway, and logs is explicit.

## Risks

- Dashboard becomes a cluttered admin homepage.
- Usage and health cards may imply runtime features before implementation.
- Workspace settings could duplicate global settings.

## Future Enhancements

- Multi-workspace sync.
- Workspace templates.
- Workspace-level cost budgets.
- Workspace activity timeline.

