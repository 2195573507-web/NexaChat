# Future Test Plan

## Status / Current Relevance

Current architecture facts for future tests:

- NexaChat is chat-first.
- The current first-level modules are 7 modules: Chat, Models, Knowledge Base, Tools, Gateway, Data, and Settings.
- `/` currently resolves to `/chat/conversations`.
- Workspace/Dashboard are historical contexts, not current first-level modules.
- Knowledge Base current tests should cover text-like lexical import/retrieval. PDF, Office, OCR, and external vector databases are future tests.
- Tools/Agent/MCP current tests should cover registration, permissions, dry-run, fixture execution, approvals, steps, and trace events. Arbitrary real MCP execution and Agent sandbox are future tests.

## Unit Test

- Service logic for conversations, messages, providers, models, router, gateway, import/export, logs, usage, security, settings, and UI preferences.
- Context builder tests for recent N, summary + recent N, manual selection, and token trimming.

## Integration Test

- Provider -> Model -> Router -> Gateway -> Message persistence.
- Gateway streaming to message updates.
- Request logs linked to messages and usage records.
- Import/export round trip.

## E2E Test

- First launch.
- Add Provider.
- Test connection.
- Start conversation.
- Stream response.
- Switch Provider/Model and continue conversation.
- Export diagnostics.

## Smoke Test

- App launches one main window.
- Sidebar exposes the 7 current first-level modules.
- No blank first screen.
- Settings can open.
- Logs page can open.

## Provider Connection Test

- OpenAI-compatible success.
- 401 invalid key.
- 404 bad Base URL.
- timeout/proxy failure.
- model_not_found.

## Local Gateway Test

- Generate API key.
- `/v1/models`.
- `/v1/chat/completions`.
- `/v1/embeddings`.
- `/v1/responses` reserved behavior.
- Quota, expiration, revoke.

## Chat History Persistence Test

- Create conversation.
- Save user and assistant messages.
- Restart app.
- Verify local history remains.
- Search messages.

## API Switch History Retention Test

- Start with Provider A / Model A.
- Switch to Provider B / Model B.
- Continue same conversation.
- Verify old messages remain and new assistant message records new source.

## Import/Export Test

- CCS config import.
- sub2api JSON import.
- OpenAI-compatible config import.
- Ollama scan.
- LM Studio scan.
- Provider/Model/Assistant/Prompt/Chat export and import.
- Redacted export.
- Backup restore.

## Security Redaction Test

- API Key never appears in logs.
- Authorization headers redacted.
- Custom sensitive headers redacted.
- Diagnostic export redaction preview.

## UI Navigation Test

- All 7 current first-level modules open.
- Required second-level tabs visible.
- Sidebar active state correct.
- No old project names.

## UI Theme Test

- Light, dark, system.
- High contrast reservation.
- Reduced motion behavior.

## UI Font Setting Test

- Default system font.
- Chinese font.
- Monospace code/log font.
- KaiTi / 楷体 option affects message body only.

## Empty/Loading/Error State Test

- No Provider.
- No Model.
- No Conversation.
- No Knowledge Base.
- No Logs.
- No API Key.
- Model testing.
- Streaming.
- File parsing.
- Knowledge indexing.
- Gateway starting.
- 401, 404, 429, timeout, model_not_found, stream interrupted, SQLite read failure, config import failure.

## Desktop Shortcut Test

- Only after real app exists.
- Shortcut target points to latest usable launch entry.
- Icon and arguments are verified.
- App opens only one main window.

## Git Clean Working Tree Test

- Run `git status -sb`.
- No untracked files.
- No unstaged modifications.
- No staged but uncommitted changes.
