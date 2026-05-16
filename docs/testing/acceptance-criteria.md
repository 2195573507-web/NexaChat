# Acceptance Criteria

## Status / Current Relevance

This file was originally written for the first planning commit. Current architecture facts take precedence:

- The current first-level modules are 7 modules: Chat, Models, Knowledge Base, Tools, Gateway, Data, and Settings.
- `/` currently resolves to `/chat/conversations`.
- Workspace/Dashboard are historical planning contexts, not current product entry points.
- PDF, Office, OCR, external vector databases, arbitrary MCP execution, and Agent sandbox are future capabilities unless explicitly marked otherwise.

## Document Structure

- `README.md`, `README.zh-CN.md`, and `PROJECT_PROGRESS.md` exist.
- `docs/build-plans` contains 9 build plan files including the master plan.
- `docs/design` contains 8 UI/UX design documents.
- Architecture, decisions, research, and testing documents exist.

## Module Completeness

- The current 7 first-level modules are defined.
- Each module build plan contains Final Goal, Scope, Submodules, Key Features, Relationship With Other Modules, Data Requirements, UI Requirements, Security Requirements, Extension Interfaces, Testing Requirements, Acceptance Criteria, Risks, and Future Enhancements.

## Module Relationships

- Chat to Router is documented.
- Router to Provider/Model is documented.
- Gateway reuses Router.
- Knowledge, MCP, Tool, Agent integrations are documented.
- Security and IPC boundaries are documented.

## Data Model

- Required tables are listed.
- `messages` table includes field descriptions, field purposes, indexes, and relationships to conversations, providers, models, and request_logs.
- Local history ownership rules are explicit.

## Local History

- Conversation history belongs to local SQLite.
- API is only a generation channel.
- Provider and Model can switch within the same conversation.
- Assistant messages record actual Provider/Model/request/token/latency/error metadata.

## Provider / Model / Router / Gateway Separation

- Provider, Model, Router, and Gateway responsibilities are defined.
- Chat calls Router.
- Gateway executes requests and logs results.
- Local gateway reuses Router.

## UI/UX Design

- Navigation, page hierarchy, chat layout, provider page, local history UI, model switch UI, error diagnosis UI, theme/font/KaiTi, empty/loading/error states, desktop sizes, no extra popups, no old project residue are defined.

## Page Structure

- Chat, Model, Provider detail, Model detail, Knowledge, MCP, Agent Run Center, Local Gateway, External Integration, Data Import, Logs, and Settings pages are planned or implemented at their documented boundaries. Dashboard is historical context and must not be restored as the current main entry.

## Component Inventory

- Required components exist with purpose, module, input data, interaction behavior, state, and acceptance criteria.

## Interaction Flows

- Required flows exist: first launch, add Provider, test model, new conversation, API switch continuation, multi-model comparison, CCS import, sub2api import, local API key generation, external app integration, knowledge upload, MCP server add, Agent run, error diagnosis, diagnostic export, theme/font changes.

## Security Design

- API keys are protected through secure storage.
- Redaction is required for logs and exports.
- MCP/tool permissions require explicit control.
- Renderer cannot directly read secrets.

## Import/Export Design

- Intelligent import, config import, provider/model/assistant/prompt/chat import/export, redaction, validation, conflicts, backup/restore, snapshots, cleanup, and migration reservation are defined.

## Logs And Diagnostics

- Request logs, gateway logs, usage, token/cost estimate, error explanation, audit, diagnostic export, and model evaluation are defined.

## Future Implementation Readiness

- Recommended stack, service layer, SQLite schema, IPC boundary, adapter strategy, gateway endpoints, and test strategy are clear enough for the next engineering round.

## Git Submission

- Commit message is `docs: add NexaChat build and UI plans`.
- Branch is `main` before push.
- Remote is `https://github.com/2195573507-web/NexaChat.git`.
- Push to GitHub succeeds, or failure reason and commands are reported.
- Final `git status -sb` is clean.
