# Chat, Assistant And Local History Build Plan

## Final Goal

Build NexaChat's core conversation system around local SQLite history. Conversations must survive API, Provider, and Model switches. APIs are reply generation channels only; they do not own chat history.

## Scope

Includes local conversation records, session list, grouping, search, pinning, favorites, archive, cross-API continuation, context sending strategies, assistant center, Prompt Lab, prompt versioning, multi-model comparison, artifacts, rich message rendering, streaming output, regenerate, edit-and-resend, branch conversations, and import/export.

Does not include remote sync, team shared history, complex RBAC, or full workflow automation in v1.

## Submodules

- Local conversation history.
- Conversation list, groups, search, pinned, favorites, archive.
- Message timeline and message operations.
- Context strategy selector.
- Assistant center.
- Prompt Lab and prompt versions.
- Multi-model comparison.
- Artifact output.
- Conversation import/export.

## Key Features

- Conversation records are saved in local SQLite.
- History never belongs to a single API.
- API, Provider, and Model are generation channels and can change at any time.
- A single `conversation` can start with DeepSeek, continue with Claude, and continue again with Ollama.
- Each assistant message records actual `provider_id`, `model_id`, `model_name_snapshot`, `request_id`, token counts, latency, finish reason, and error information.
- Conversation search supports title, message content, provider/model filters, favorites, archived state, and date ranges.
- Context strategies:
  - Recent N turns.
  - Summary + recent N turns.
  - Manual context selection.
  - Token-based automatic trimming.
- Rich rendering supports Markdown, code highlight, tables, math, images, file references, citations, tool call summaries, and artifacts.
- Message operations include streaming, stop generation, regenerate, edit then resend, branch, copy, favorite, and export.

## Relationship With Other Modules

- Model module provides selectable Provider/Model records and capability flags.
- Router module chooses execution target when the user does not explicitly lock a model.
- Gateway module executes requests and returns streaming events.
- Knowledge module contributes retrieved context and citations.
- Tool/MCP/Agent module contributes tool calls and traces.
- Logs module stores request details and errors.
- Data configuration module imports and exports conversations.
- Security module redacts sensitive content in diagnostics.

## Data Requirements

Main tables: `conversations`, `messages`, `message_branches`, `message_attachments`, `assistants`, `prompts`, `request_logs`, `usage_records`, `files`, `knowledge_chunks`, `memories`, `config_snapshots`.

Inputs:

- User message text, attachments, selected assistant, selected model, selected context strategy, selected knowledge bases, enabled tools.

Outputs:

- User message row.
- Assistant message row.
- Request log row.
- Usage record row.
- Optional artifacts, attachments, citations, and branches.

Storage:

- Structured conversation and message data in SQLite.
- Attachments and artifact files in local file storage with SQLite metadata.
- Search index via SQLite FTS5.

## Required `messages` Fields

Every assistant message must support the following fields, defined fully in `docs/architecture/data-model.md`:

- `id`
- `conversation_id`
- `parent_message_id`
- `role`
- `content`
- `provider_id`
- `model_id`
- `model_name_snapshot`
- `request_id`
- `input_tokens`
- `output_tokens`
- `latency_ms`
- `finish_reason`
- `error_message`
- `created_at`
- `updated_at`

Additional recommended fields include `status`, `content_format`, `context_strategy`, `context_message_ids_json`, `summary_id`, `artifact_ids_json`, `error_code`, `metadata_json`, and `deleted_at`.

## Context Sending Strategy

- Recent N turns: send the latest user/assistant turns until a configured count or token budget is reached.
- Summary + recent N turns: prepend a stored conversation summary, then send recent turns.
- Manual selection: user selects exact messages or ranges to include.
- Token automatic trimming: estimate tokens and trim from oldest low-priority messages while keeping system prompt, pinned context, latest user request, and manually selected context.

The context strategy is saved per request log so a response can be audited later.

## UI Requirements

- Conversation page uses three-column layout: session list, message area, right parameter/context panel.
- Left session list supports grouping, search, pinned, favorites, archived filter, and recent model badges.
- Message area shows model snapshot on assistant messages, token/latency details on demand, and error details in an expandable area.
- Top model switcher must state that switching Provider/Model does not delete local history.
- Input box includes attachment, send, stop, model selector, assistant selector, context strategy selector, knowledge/tool toggles.
- Context overflow warning appears near input, not as a blocking popup.
- Empty conversation state offers direct prompt entry, add Provider, import conversation, and choose assistant.

## Security Requirements

- Message exports must optionally redact secrets, custom headers, and private file paths.
- Prompt versions must not silently include API keys.
- Diagnostic exports must separate visible message content from request metadata.
- Tool/MCP-generated content must be labeled and traceable.

## Extension Interfaces

- Assistant definition schema.
- Prompt version schema.
- Message branch schema.
- Artifact metadata schema.
- Context builder interface.
- Conversation import/export manifest.
- Future sync conflict resolution fields.

## Testing Requirements

- Create conversation, send user message, receive assistant message, restart, and verify history remains.
- Switch Provider/Model mid-conversation and verify history remains and assistant message records actual source.
- Validate all context strategies.
- Verify streaming, stop, regenerate, edit-and-resend, branch, archive, favorite, pin, search, import, and export flows.
- Verify SQLite FTS search and pagination.
- Verify error message persistence and request log linkage.

## Acceptance Criteria

- Conversation history is persisted in local SQLite.
- History does not belong to any API.
- API is only the generation channel.
- The same conversation can use DeepSeek, Claude, and Ollama in sequence.
- Switching Provider, Model, Base URL, API Key, or Router does not delete or hide history.
- Every assistant message records the real Provider, Model, model name snapshot, request id, tokens, latency, finish reason, and errors.
- The UI clearly explains local history retention after API switch.
- Context sending supports recent N, summary + recent N, manual selection, and token trimming.

## Risks

- Context trimming can silently omit important information if not visible.
- Message branching can complicate list ordering.
- Multi-model comparison may duplicate request and usage records.
- Artifact rendering may grow into a full document editor too early.

## Future Enhancements

- Semantic search over history.
- Cross-device encrypted sync.
- Conversation timeline visualization.
- Fine-grained memory controls.
- Multi-user shared history after local-first core is stable.

