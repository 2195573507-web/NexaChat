# NexaChat

NexaChat is a chat-first, local-first, multi-model AI desktop workbench built with Electron, React, TypeScript, Vite, and SQLite.

Desktop app name: NexaChat  
Current status: Round 0-15 implementation history exists, and the active architecture line is now the chat-first 7-module service split documented in `docs/build-plans/00-modular-refactor-master-plan/architecture-service-split-completion-report.md`.

## Current Architecture Facts

- The real first-level modules are 7 modules: Chat, Models, Knowledge Base, Tools, Gateway, Data, and Settings.
- The root route `/` currently resolves to `/chat/conversations`.
- Workspace and Dashboard are not the current product entry point or first-level module.
- Chat now includes lightweight task quick actions. A standalone simple home remains a later product target, not a completed current capability.
- Ordinary mode organizes work by user tasks. Advanced mode persists in UI preferences and reveals technical details without creating a second implementation path.
- Gateway is an independent core module, not an internal-only implementation detail.
- Agent, Tools, and MCP are experimental capabilities and must not be described as unrestricted execution.
- `src/main/services/store.ts` is now a thin compatibility export over `serviceRegistry`; domain logic lives in main-process services such as `ChatService`, `ProviderService`, `ModelService`, `GatewayService`, `KnowledgeService`, `DataService`, `SecurityService`, `AuditService`, and `SettingsService`.

## Current Real Capabilities

- Electron desktop shell with one main window, packaged Windows launch, installer-script smoke, startup diagnostics, and a verified desktop shortcut.
- React renderer with route-aware pages under the 7 current modules: Chat, Models, Knowledge Base, Tools, Gateway, Data, and Settings.
- Chat-first entry with quick actions for new chat, model selection, knowledge Q&A, Gateway status, config import, and preferences while keeping `/` routed to `/chat/conversations`.
- Unified authorities for navigation, IPC, API contracts, i18n, theme tokens, Provider runtime, Gateway runtime, Knowledge runtime, execution runtime, security, data mobility, observability, desktop entry, and quality gates.
- Live Chinese/English switching, dark/light/system theme switching, compact flat desktop-tool styling, and UI smoke coverage for route leakage and horizontal overflow.
- Main-process SQLite schema plus service/repository boundaries for providers, models, conversations, message chunks, request logs, usage, Gateway keys/logs, knowledge files/chunks/lexical embeddings, execution runs, audit logs, backups, observability records, and UI preferences.
- Safe preload IPC bridge with centralized channel authority and permission enforcement; the renderer does not access SQLite or raw secrets directly.
- OpenAI-compatible Provider adapter chain for Provider test, Chat, Gateway chat completions, retry, timeout, cancellation, request logs, usage, and audit surfaces.
- Local OpenAI-compatible Gateway with `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings`. `/v1/responses` is reserved and returns 501 in this build.
- Knowledge Base supports text-like file import, parsing, chunking, lexical embedding, retrieval preview, rebuild/delete, and chat citations.
- Tools/Agent supports MCP server registration, permissions, agent definitions, dry-run preview, fixture tool execution, approval requests, execution steps, and trace events.
- Data mobility supports redacted export packages, encrypted backup records, restore preflight, conflicts, migration records, and rollback records.
- Security and observability cover local owner session, RBAC/ACL evaluation, IPC and Store enforcement, audit hash-chain integrity, search, redacted export, usage, request logs, Gateway logs, Provider health, feedback, evals, and privacy settings.

## Planned Capabilities

- Standalone simple home design that keeps `/` and Chat routing explicit if it is added later.
- Provider and Model invocation polish across real upstream configurations, streaming lifecycle, and user-facing recovery.
- Gateway hardening around compatibility, logs, scope policy, and external integration guidance.
- Knowledge Base expansion toward richer RAG, stronger embeddings, rerank, and additional parser classes.
- Tools/Agent/MCP progression from experimental fixture/dry-run flows toward real execution only after permission, sandbox, audit, and protocol hardening are in place.

## Not Implemented Boundaries

- Knowledge Base does not currently support PDF, Office, OCR, or an external vector database as completed capabilities.
- `/v1/responses` is not complete; it is reserved and should be documented as 501 behavior.
- Tools/Agent/MCP does not execute arbitrary real MCP tools, arbitrary code, or a release-grade Agent sandbox.
- Release-grade signed installer security and broad external sandbox guarantees are not current facts.
- Repository extraction is intentionally incremental: stable list/read queries are in repository classes, while high-risk multi-table writes and transaction-sensitive helpers remain in the owning service/context until they can be moved under focused tests.

## Release Gate

Use the single release-quality command before claiming a build is ready:

```powershell
npm.cmd run verify:release
```

It runs typecheck, unit tests, production build, UI smoke, Electron smoke, package release, packaged desktop-entry smoke, hardcode scan, duplicate authority scan, security scan, dead-link scan, docs freshness scan, and `git diff --check`.

## Run

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run dev:electron
```

Build and start the desktop app:

```powershell
npm.cmd run build
npm.cmd run start
```

## Verify

```powershell
npm.cmd run verify:release
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run verify
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
npm.cmd run test:desktop-entry
```

## Documents

- Full-app blueprint: `docs/iteration-plans/NexaChat-Full-App-Multi-Round-Iteration-Plan-20260514.md`
- Final acceptance: `docs/implementation/full-app-final-acceptance-20260516.md`
- Round execution matrix: `docs/implementation/full-app-round-execution-matrix.md`
- Master build plan: `docs/build-plans/00-master-build-plan.md`
- Active execution plan: `task_plan.md`
- Service split completion report: `docs/build-plans/00-modular-refactor-master-plan/architecture-service-split-completion-report.md`
- Build findings: `findings.md`
- Progress log: `progress.md`
- UI/UX master plan: `docs/design/00-ui-ux-master-plan.md`
- Architecture: `docs/architecture/`
- Acceptance and future tests: `docs/testing/`
