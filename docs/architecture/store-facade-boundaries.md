# Store Facade Boundaries

Current source fact: `src/main/services/store.ts` is now a compatibility export over `serviceRegistry`. It no longer owns the main business implementation.

## Current Boundary

- `src/main/services/serviceRegistry.ts` is the composition root.
- `src/main/services/serviceContext.ts` owns shared database context, bootstrap, common require helpers, redaction helpers, secret encode/decode helpers, and cross-service utility helpers.
- Domain services own public business behavior:
  - `chatService.ts`
  - `providerService.ts`
  - `modelService.ts`
  - `gatewayService.ts`
  - `knowledgeService.ts`
  - `dataService.ts`
  - `settingsService.ts`
  - `securityService.ts`
  - `auditService.ts`
  - `toolService.ts`
  - `observabilityService.ts`
  - `dashboardService.ts`
- `store.ts` remains only so existing imports of `store` and `NexaStore` continue to work.
- Renderer, preload, IPC channel names, and database schema behavior are unchanged by this split.

## Service Responsibilities

- `ChatService`: conversations, messages, context strategy, retries, regeneration, cancellation, export, and multi-model comparison.
- `ProviderService`: Provider create/delete/test, Provider health records, secret storage handoff, and soft-delete audit.
- `ModelService`: Model create/query, Provider model discovery through the OpenAI-compatible adapter, and Gateway model resolution.
- `GatewayService`: local gateway state, API keys, scopes, quotas, rate limits, logs, `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`, and reserved `/v1/responses` behavior.
- `KnowledgeService`: text-like import, parsing, chunking, lexical embedding, retrieval preview, rebuild/delete, and citations.
- `DataService`: import manifest precheck, import apply, snapshot, diagnostics export, data package export, encrypted backup, restore preflight, and rollback records.
- `SecurityService`: local users, roles, sessions, ACL grants, RBAC/ACL permission checks, and denied-action audit.
- `AuditService`: audit log reads/search/export and hash-chain integrity verification.
- `SettingsService`: UI preferences and observability privacy preferences.
- `ToolService`: MCP registration, permissions, agent definitions, dry-run, fixture execution, approvals, execution steps, and trace events.
- `ObservabilityService`: request logs, usage records, provider health aggregation, feedback, evals, privacy-aware query, and redacted export.
- `DashboardService`: snapshot and dashboard summary assembly only.

## Data And Repository Boundary

- No new SQLite connection is created by any service.
- All services share the `getDatabase()` context through `ServiceContext`.
- Existing row mappers remain in `src/main/repositories/mappers.ts`.
- `src/main/repositories/repositoryContext.ts` creates domain repositories from the same `DatabaseSync` instance.
- Stable read/list queries are now routed through repository classes:
  - `chatRepository.ts`
  - `providerRepository.ts`
  - `modelRepository.ts`
  - `gatewayRepository.ts`
  - `knowledgeRepository.ts`
  - `dataRepository.ts`
  - `settingsRepository.ts`
  - `securityRepository.ts`
  - `auditRepository.ts`
  - `toolRepository.ts`
  - `observabilityRepository.ts`
- High-risk multi-table writes, transaction-sensitive flows, secret handling, backup encryption, and audit hash-chain writes remain in the owning service/context in this round to preserve behavior. They are not in `store.ts`.

## Compatibility Boundary

- IPC handlers continue calling the exported `store` object, but the actual methods are composed from domain services.
- Preload API method names are unchanged.
- Renderer remains preload-only and does not access SQLite, fs, Node APIs, Provider secrets, or Gateway keys.

## Capability Truth

- Gateway current available endpoints are `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings`.
- `/v1/responses` remains reserved and returns 501.
- Knowledge Base currently supports text-like import and lexical retrieval only; PDF, Office, OCR, and external vector databases are not complete.
- Tools / Agent / MCP currently support registration, permissions, dry-run/fixture execution, approvals, steps, and traces; arbitrary MCP execution and release-grade Agent sandbox are not complete.
