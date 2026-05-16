# Data Model

## Status / Current Relevance

This document includes early table names that predate the chat-first 7-module mainline. `workspace_id` remains an internal local scope field in the data model where present; it does not mean Workspace is a current first-level module or product entry point.

## SQLite Strategy

SQLite is the source of truth for local NexaChat data. The schema must support local conversations, provider/model source tracing, gateway logs, imports/exports, audit, settings, and future migrations.

All tables should include stable IDs, `created_at`, and `updated_at` where relevant. Timestamps should use integer Unix milliseconds or ISO strings consistently; integer milliseconds are recommended.

## Core Tables

- `workspaces`
- `conversations`
- `messages`
- `message_branches`
- `message_attachments`
- `providers`
- `models`
- `model_aliases`
- `model_routes`
- `assistants`
- `prompts`
- `knowledge_bases`
- `files`
- `knowledge_chunks`
- `memories`
- `tools`
- `mcp_servers`
- `agents`
- `gateway_api_keys`
- `gateway_logs`
- `request_logs`
- `usage_records`
- `eval_sets`
- `eval_results`
- `config_snapshots`
- `audit_logs`
- `app_settings`
- `ui_preferences`

## `conversations`

Purpose: top-level local chat thread. It is not owned by a Provider or API.

Suggested fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | TEXT PRIMARY KEY | Conversation ID. |
| `workspace_id` | TEXT | Internal local scope retained for compatibility; not a current Workspace module. |
| `title` | TEXT NOT NULL | User-visible title. |
| `assistant_id` | TEXT | Default assistant. |
| `default_provider_id` | TEXT | Optional default generation provider. |
| `default_model_id` | TEXT | Optional default generation model. |
| `default_router_id` | TEXT | Optional route rule. |
| `group_name` | TEXT | User grouping. |
| `is_pinned` | INTEGER NOT NULL DEFAULT 0 | Pinned state. |
| `is_favorite` | INTEGER NOT NULL DEFAULT 0 | Favorite state. |
| `status` | TEXT NOT NULL | `active`, `archived`, `deleted`. |
| `summary` | TEXT | Optional conversation summary. |
| `last_message_at` | INTEGER | Last message time. |
| `message_count` | INTEGER NOT NULL DEFAULT 0 | Cached count. |
| `created_at` | INTEGER NOT NULL | Creation time. |
| `updated_at` | INTEGER NOT NULL | Update time. |
| `deleted_at` | INTEGER | Soft deletion time. |

Indexes:

- `idx_conversations_workspace_updated(workspace_id, updated_at)`
- `idx_conversations_status(status)`
- `idx_conversations_pinned(is_pinned, updated_at)`

## `messages`

Purpose: local immutable-ish message record. This table must be detailed enough to guide future table creation.

Required fields:

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `id` | TEXT PRIMARY KEY | Yes | Stable message ID. |
| `conversation_id` | TEXT | Yes | Parent conversation. |
| `parent_message_id` | TEXT | No | Parent for branches, regenerate, edit-and-resend. |
| `role` | TEXT | Yes | `system`, `user`, `assistant`, `tool`, `error`. |
| `content` | TEXT | Yes | Message text or serialized tool result. |
| `provider_id` | TEXT | No | Actual Provider used for assistant/tool generation. |
| `model_id` | TEXT | No | Actual Model used for assistant generation. |
| `model_name_snapshot` | TEXT | No | Model name at generation time, retained after model rename/delete. |
| `request_id` | TEXT | No | Links to request/gateway execution ID. |
| `input_tokens` | INTEGER | No | Input token count or estimate. |
| `output_tokens` | INTEGER | No | Output token count or estimate. |
| `latency_ms` | INTEGER | No | End-to-end generation latency. |
| `finish_reason` | TEXT | No | `stop`, `length`, `tool_calls`, `content_filter`, `error`, `cancelled`. |
| `error_message` | TEXT | No | User/debug-visible error summary. |
| `created_at` | INTEGER | Yes | Creation time. |
| `updated_at` | INTEGER | Yes | Last update time. |

Recommended additional fields:

| Field | Type | Purpose |
|---|---|---|
| `workspace_id` | TEXT | Denormalized workspace filter. |
| `request_log_id` | TEXT | Direct request log relation. |
| `status` | TEXT | `draft`, `streaming`, `completed`, `failed`, `cancelled`, `deleted`. |
| `content_format` | TEXT | `markdown`, `plain_text`, `json`, `tool_result`. |
| `context_strategy` | TEXT | `recent_n`, `summary_recent_n`, `manual`, `token_trim`. |
| `context_message_ids_json` | TEXT | Manual or generated context message IDs. |
| `summary_id` | TEXT | Summary/memory used for this message. |
| `artifact_ids_json` | TEXT | Artifact outputs linked to message. |
| `error_code` | TEXT | Normalized error code. |
| `metadata_json` | TEXT | Extra citations/tool calls/provider metadata. |
| `deleted_at` | INTEGER | Soft deletion time. |

Field use:

- `conversation_id` is the primary history query path.
- `provider_id`, `model_id`, and `model_name_snapshot` make each assistant message traceable even if current defaults change.
- `request_id` and `request_log_id` connect user-visible output to runtime logs.
- `parent_message_id` enables branch conversations and regenerate flows.
- `status` prevents partial streaming responses from being treated as final.
- `context_strategy` makes later audits explain why a response saw a given context.

Suggested indexes:

```sql
CREATE INDEX idx_messages_conversation_created
ON messages(conversation_id, created_at);

CREATE INDEX idx_messages_conversation_status
ON messages(conversation_id, status);

CREATE INDEX idx_messages_provider_model
ON messages(provider_id, model_id);

CREATE INDEX idx_messages_request
ON messages(request_id);

CREATE INDEX idx_messages_request_log
ON messages(request_log_id);

CREATE INDEX idx_messages_parent
ON messages(parent_message_id);

CREATE INDEX idx_messages_workspace_created
ON messages(workspace_id, created_at);
```

Future full-text index:

```sql
CREATE VIRTUAL TABLE messages_fts
USING fts5(content, content='messages', content_rowid='rowid');
```

Relations:

- `messages.conversation_id` -> `conversations.id`
- `messages.provider_id` -> `providers.id`
- `messages.model_id` -> `models.id`
- `messages.request_log_id` -> `request_logs.id`
- `messages.parent_message_id` -> `messages.id`

Important rule: assistant messages store the actual Provider/Model used for that message, not only the current conversation default.

## `message_branches`

Purpose: preserve branch relationships for regenerate and alternate paths.

Fields: `id`, `conversation_id`, `root_message_id`, `branch_message_id`, `label`, `created_at`.

Indexes: `idx_message_branches_conversation(conversation_id)`.

## `message_attachments`

Purpose: attach files/images/artifacts to messages.

Fields: `id`, `message_id`, `file_id`, `artifact_type`, `display_name`, `metadata_json`, `created_at`.

Indexes: `idx_message_attachments_message(message_id)`.

## `providers`

Purpose: connection configuration boundary.

Fields: `id`, `name`, `type`, `base_url`, `proxy_url`, `auth_type`, `secret_ref`, `custom_headers_json`, `enabled`, `health_status`, `last_checked_at`, `created_at`, `updated_at`.

Indexes: `idx_providers_type(type)`, `idx_providers_enabled(enabled)`.

## `models`

Purpose: callable model records under Providers.

Fields: `id`, `provider_id`, `name`, `display_name`, `model_name_snapshot`, `context_window`, `supports_streaming`, `supports_tools`, `supports_vision`, `supports_embeddings`, `input_price`, `output_price`, `health_status`, `latency_ms`, `enabled`, `created_at`, `updated_at`.

Indexes: `idx_models_provider(provider_id)`, `idx_models_health(health_status)`, `idx_models_enabled(enabled)`.

## `request_logs`

Purpose: runtime trace for each model/gateway request.

Fields: `id`, `conversation_id`, `message_id`, `provider_id`, `model_id`, `model_name_snapshot`, `route_id`, `gateway_request_id`, `status`, `endpoint`, `request_summary_json`, `response_summary_json`, `input_tokens`, `output_tokens`, `latency_ms`, `finish_reason`, `error_code`, `error_message`, `started_at`, `completed_at`, `created_at`.

Relations:

- `request_logs.message_id` -> `messages.id`
- `request_logs.conversation_id` -> `conversations.id`
- `request_logs.provider_id` -> `providers.id`
- `request_logs.model_id` -> `models.id`

Indexes: `idx_request_logs_conversation(conversation_id, created_at)`, `idx_request_logs_provider_model(provider_id, model_id)`, `idx_request_logs_status(status)`.

## Other Table Purposes

- `workspaces`: local workspace defaults and isolation.
- `model_aliases`: virtual or user-friendly model names.
- `model_routes`: route conditions and fallback order.
- `assistants`: assistant behavior profiles.
- `prompts`: prompt records and versions.
- `knowledge_bases`: document collections.
- `files`: local file metadata and parse state.
- `knowledge_chunks`: chunks, embeddings references, citations.
- `memories`: explicit memories, summaries, compressed context.
- `tools`: built-in/custom tool registry.
- `mcp_servers`: stdio/SSE/HTTP MCP server configs.
- `agents`: Agent definitions and permissions.
- `gateway_api_keys`: local gateway key metadata and secret references.
- `gateway_logs`: external local API request logs.
- `usage_records`: token and cost estimates.
- `eval_sets`: model evaluation prompts/datasets.
- `eval_results`: evaluation results and comparison outputs.
- `config_snapshots`: settings/config rollback points.
- `audit_logs`: security-relevant user/system actions.
- `app_settings`: app-wide settings.
- `ui_preferences`: theme, density, font, KaiTi / 楷体, language.

## Data Ownership Rules

- Conversations and messages are local user data.
- Provider and Model are generation configuration.
- Router and Gateway do not own messages.
- Request logs explain generation; they are not the chat history itself.
- Deleting a Provider must not delete old messages.
- Deleting a Model must not remove `model_name_snapshot` from old messages.
