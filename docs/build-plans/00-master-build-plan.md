# NexaChat Master Build Plan

## Final Goal

Build NexaChat from scratch as a local-first, multi-model AI conversation hub. The final product should let users manage Providers, Models, local conversations, knowledge context, tools, MCP, Agent runs, a local gateway, data import/export, logs, evaluation, security, and system settings without mixing module responsibilities.

## Product Positioning

- English name: NexaChat
- Chinese name: AI 对话中枢
- Desktop app name: NexaChat
- Positioning: local-first multi-model AI conversation hub
- First delivery stage: planning only, no formal business code

## Lessons Learned From Previous Project

- Do not create too many first-level navigation items.
- Do not mix Provider, Model, Router, and Gateway into one page or service.
- Do not bind conversation history to one API.
- Do not create empty Workflow or Agent shells before the chat and model core is reliable.
- Do not place process files randomly in the root.
- Do not make the UI a cluttered admin backend.
- Do not rely on heavy Liquid Glass, blur, large transparency, or decorative motion.
- Keep completion labels honest: completed, in progress, and planned must mean different things.

## Research Sources

Research is documented in `docs/research/competitive-research.md`. The plan learns specific points from Open WebUI, LibreChat, AnythingLLM, LobeChat, Cherry Studio, Chatbox, Jan, Dify, Flowise, Langflow, n8n, OpenAI Agent Builder / AgentKit, sub2api, CCS / cc-switch, Cursor, Continue, VSCode AI tools, Linear, Raycast, and Notion.

## Full Module Map

1. 工作台: dashboard, workspace, recent conversations, model health, gateway state, quick actions.
2. 对话: local history, assistant center, Prompt Lab, multi-model comparison, artifacts.
3. 模型: Provider Hub, Model Hub, capability matrix, parameter templates, health checks.
4. 知识库: files, RAG, embeddings, rerank, project context, temporary context, memories.
5. 工具与 Agent: tools, MCP servers, Agent Studio, Agent Run Center, traces, human approval.
6. 本地网关: local OpenAI-compatible API, API keys, virtual models, routes, external integration generator.
7. 数据配置: intelligent import, import/export, backup/restore, snapshots, cleanup, migration reservation.
8. 设置与安全: logs, usage, evaluation, API key security, audit, UI/system settings.

## Scope

This master plan covers project positioning, module boundaries, relationships, architecture, data strategy, UI direction, security strategy, testing, acceptance, risks, and implementation order. It does not initialize source code, runtime dependencies, or a runnable desktop app in this planning round.

## Submodules

- Master product and module map.
- Architecture and service layer.
- Data and local storage strategy.
- Security and local secret strategy.
- UI/UX strategy.
- Testing and acceptance strategy.
- Risk and future expansion planning.

## Key Features

- 8-module product structure.
- Local SQLite-first chat history.
- Provider / Model / Router / Gateway separation.
- Desktop app strategy.
- Safe IPC and secure secret direction.
- Competitive research and ADR-backed decisions.
- Clear acceptance gates for future implementation.

## Module Relationships

Chat calls Router for model selection. Router selects Provider and Model. Gateway executes requests through Provider adapters and writes request logs. Message records are persisted by chat and message services in local SQLite. Knowledge, tools, MCP, and Agent modules provide optional context or execution capabilities to Chat. Config affects Provider, Model, Router, and Gateway. Security protects API keys and sensitive logs. UI calls main-process capabilities through a safe IPC bridge.

## Relationship With Other Modules

The master plan coordinates all module relationships. Workspace summarizes Chat, Model, Knowledge, Gateway, and Logs. Chat consumes Model, Router, Gateway, Knowledge, Tool/MCP/Agent, Logs, Data Config, and Security. Model feeds Router and Gateway. Gateway feeds Logs, Usage, Security, and external app integration. Data Config imports and exports settings for all modules. Settings & Security applies redaction, audit, and UI preferences across the whole app.

## Architecture Overview

Recommended layers:

- Renderer UI: React components, navigation, page state, command palette reservation.
- Renderer domain clients: typed IPC callers, no direct database or secret access.
- Main process services: business logic and module boundaries.
- Repositories: SQLite data access.
- Gateway runtime: provider adapters, streaming, cancellation, retry, timeout, usage logging.
- Security boundary: safeStorage / keychain abstraction and redaction.

Required service split:

- `workspace-service`
- `chat-service`
- `conversation-service`
- `message-service`
- `provider-service`
- `model-service`
- `router-service`
- `gateway-service`
- `api-key-service`
- `knowledge-service`
- `file-service`
- `embedding-service`
- `memory-service`
- `tool-service`
- `mcp-service`
- `agent-service`
- `prompt-service`
- `import-export-service`
- `log-service`
- `usage-service`
- `eval-service`
- `security-service`
- `audit-service`
- `settings-service`
- `ui-preferences-service`

## Data Architecture

SQLite is the source of truth for local user data. The core database tables are workspaces, conversations, messages, providers, models, request_logs, usage_records, assistants, prompts, knowledge records, gateway keys, config snapshots, audit logs, settings, and UI preferences. Data model details are defined in `docs/architecture/data-model.md`.

## Data Requirements

- Chat history, request logs, usage, settings, and UI preferences are stored locally.
- API secrets use secure storage references, not plain text table fields.
- Messages keep provider/model/request metadata.
- Data imports and exports use versioned manifests and redaction.

## Security Architecture

- API keys are never stored as plain text in normal settings rows.
- Provider records store key references, not raw secrets.
- Use Electron safeStorage where available, with keytar / system Keychain comparison documented for future implementation.
- Renderer cannot read secrets directly.
- Request logs and diagnostics export must redact keys, Authorization headers, and custom sensitive headers.
- MCP and Agent tool calls require explicit permission design before execution.

## Security Requirements

- Renderer cannot access raw secrets.
- Logs and diagnostic exports redact API keys, authorization headers, and sensitive custom headers.
- Gateway keys have scopes, quotas, expiration, revoke, and audit.
- MCP and Agent permissions are explicit.
- Dangerous cleanup, rollback, and deletion actions are audited.

## Local Storage Strategy

- SQLite: structured data, chat history, requests, usage, settings, snapshots.
- File system: attachments, parsed document cache, diagnostic package exports.
- Secure storage: API keys and local gateway keys.
- Backup: snapshot SQLite plus external files into a versioned export package.

## Local Chat History Strategy

Chat history belongs to the local database, not to any API. API channels generate replies only. Provider and Model can change at any time. History must remain searchable, exportable, backupable, and traceable. Every assistant message records provider, model, model name snapshot, request id, tokens, latency, finish reason, and error details.

## Provider / Model / Router / Gateway Separation

- Provider: connection endpoint and credential boundary.
- Model: callable model plus capability and parameter metadata.
- Router: strategy for selecting Provider + Model by user choice, task, health, price, speed, context length, or fallback.
- Gateway: runtime that exposes local APIs, executes requests, streams responses, records logs, and reuses Router.

## Desktop App Strategy

NexaChat is a desktop app. Future implementation should use Electron + React + TypeScript + Vite unless a later ADR changes it. The app must open only one main application window and no extra startup windows. A desktop shortcut should be verified after a real runnable app exists; this round only documents the requirement and does not create a fake shortcut.

## UI/UX Strategy Summary

The UI must be compact, clean, and long-use friendly. It should learn from cc-switch-style clear configuration, Chatbox / Cherry Studio / LobeChat conversation experience, and Linear / Raycast / Notion information hierarchy. It must not use complex Liquid Glass, cluttered admin panels, decorative hero pages, or fake feature buttons.

## UI Requirements

- First-level navigation has at most 8 modules: 工作台, 对话, 模型, 知识库, 工具与 Agent, 本地网关, 数据配置, 设置与安全.
- Chat uses left conversation list, center messages, right context/parameter rail.
- Provider and gateway configuration use list/detail pages and inline validation, not chained popups.
- Empty/loading/error states are actionable and close to the source of the state.
- Theme, density, font, KaiTi / 楷体, desktop window size, and no-extra-popup behavior are specified in design documents.

## Testing Strategy

- Document structure validation for this planning round.
- Future unit tests for services.
- Future integration tests for Provider / Model / Router / Gateway.
- Future SQLite persistence tests for local history.
- Future UI/E2E tests for navigation, chat, provider configuration, empty/loading/error states, theme and font settings.
- Future gateway tests for `/v1/chat/completions`, `/v1/models`, `/v1/embeddings`, and `/v1/responses` reservation.

## Testing Requirements

- Validate that every required planning file exists.
- Validate each build plan includes required section headings.
- Validate data model includes the detailed `messages` table fields, indexes, and relationships.
- Validate UI documents include navigation, layouts, component inventory, interaction flows, state design, and UI acceptance criteria.
- Validate Git branch, remote, commit, push, and clean working tree.

## Acceptance Criteria

- All required planning files exist.
- All module plans define goal, scope, relationships, data, UI, security, tests, risks, and acceptance criteria.
- The 8-module navigation is explicit.
- The local SQLite history model is explicit.
- Provider / Model / Router / Gateway separation is explicit.
- UI design covers layout, components, interactions, state, theme, font, KaiTi / 楷体, window size, and no-extra-popup policy.
- Git remote points to `https://github.com/2195573507-web/NexaChat.git`.
- Final branch is `main`.
- Work is committed and pushed.
- `git status -sb` is clean.

## Future Expansion Interfaces

- Provider adapter interface.
- Model capability matrix.
- Router rule schema.
- Local gateway API key scope schema.
- Knowledge retriever interface.
- Embedding and rerank provider interfaces.
- MCP server registry.
- Agent run and trace schema.
- Workflow reservation interface.
- Import/export manifest schema.
- Evaluation set and result schema.

## Extension Interfaces

The master extension surface includes Provider adapters, model capability descriptors, router rules, gateway API templates, knowledge retrievers, embedding/rerank providers, MCP registry, Agent run traces, workflow reservations, import/export manifests, evaluation schemas, and UI navigation metadata.

## Risk List

- Overplanning without implementation proof.
- Too many v1 modules causing a cluttered product.
- Gateway becoming diagnostic-only without real forwarding.
- Secret leakage in logs or exports.
- SQLite schema drift without migrations.
- UI navigation becoming a feature dump.
- Agent and workflow appearing as empty shells.
- External API compatibility differences increasing test cost.

## Development Order Recommendation

1. Initialize project skeleton and app shell.
2. Add SQLite schema and migration layer.
3. Implement Provider / Model center with one OpenAI-compatible path.
4. Implement Chat + local history persistence.
5. Add Router and Gateway runtime.
6. Add request logs and diagnostics.
7. Add import/export basics.
8. Add knowledge, MCP, Agent, evaluation, and advanced settings in later rounds only after the core loop is verified.

## Future Enhancements

- Real runnable Electron app shell.
- Verified local gateway runtime.
- Real knowledge indexing and RAG.
- MCP and Agent execution after permission design.
- Evaluation runner.
- Desktop shortcut creation and verification after packaging.

## Definition of Done

For this planning round, done means all required documents exist, content passes structural checks, Git commit exists with message `docs: add NexaChat build and UI plans`, push to GitHub succeeds or the exact failure is documented, and final `git status -sb` is clean.
