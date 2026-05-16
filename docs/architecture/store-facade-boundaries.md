# Store Facade Boundaries

Current source fact: `src/main/services/store.ts` still owns the aggregate `NexaStore` service. This document and `src/main/services/storeBoundaries.ts` are a low-risk split preparation step, not a completed service split.

## Current Boundary

- `NexaStore` remains the current facade for SQLite access, IPC-facing workflows, seeding, security checks, audit writes, and snapshot assembly.
- Renderer, preload, IPC channel names, and database schema behavior are unchanged by this boundary map.
- The boundary map is pure metadata for future extraction planning and tests. It must not be used to claim that ChatService, ModelService, GatewayService, KnowledgeService, ToolService, DataService, SecurityService, or ObservabilityService are already implemented as standalone services.

## Future Targets

- ChatService: conversations, messages, context strategy, retries, regeneration, export, and multi-model comparison.
- ModelService: Provider and Model configuration, OpenAI-compatible health checks, and provider adapter invocation policy.
- GatewayService: local gateway state, API keys, scopes, quotas, logs, `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`, and reserved `/v1/responses` behavior.
- KnowledgeService: text-like import, parsing, chunking, lexical embedding, retrieval preview, and citations.
- ToolService: MCP registration, permissions, agent definitions, dry-run, fixture execution, approvals, execution steps, and trace events.
- DataService: import/export, manifest precheck, snapshot, backup, restore, rollback, and diagnostics.
- SecurityService: UI preferences, RBAC, ACL, permissions, audit logs, redaction, and integrity checks.
- ObservabilityService: usage, request logs, provider health, feedback, evals, privacy, and redacted export.

## Extraction Order

1. Keep the facade stable and move only pure constants, mappers, validation, and query helpers first.
2. Extract secret and audit helpers before domains that depend on redaction, permissions, and append-only logs.
3. Extract ModelService and GatewayService around existing Provider/Gateway runtime contracts without changing IPC method names.
4. Extract ChatService only after Provider, Model, Gateway, and Knowledge call boundaries are stable.
5. Extract KnowledgeService, ToolService, DataService, SecurityService, and ObservabilityService one domain at a time with focused tests.
6. Replace facade snapshot assembly with a query service only after domain services are stable.

## Tests Required For Each Future Extraction

- Existing renderer tests, UI smoke, Electron smoke, and release verification must keep passing.
- IPC contract tests must prove renderer, preload, and main use the shared API/channel authority.
- Migration tests are required before any table shape or startup schema behavior changes.
- Gateway tests must continue covering `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`, and reserved `/v1/responses`.
- Knowledge tests must keep text-like import/retrieval honest and must not claim PDF, Office, OCR, or external vector DB support before implementation.
- Tools/Agent tests must keep dry-run, fixture execution, approvals, steps, and traces separate from arbitrary MCP or sandbox claims.

## Non-Goals For This Round

- No database schema rewrite.
- No IPC contract rename.
- No duplicate service implementation.
- No claim that service splitting is complete.
