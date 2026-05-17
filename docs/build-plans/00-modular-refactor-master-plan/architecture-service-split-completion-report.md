# Architecture Service Split Completion Report

## Summary

- Project root: `D:/NexaChat`
- Branch/upstream: `main` / `origin/main`
- Baseline commit: `decac4733686051dfcd6d17e3c48445b062c1e35`
- Final commit: assigned by Git after this report is committed; the final response records the post-push commit hash.
- Scope: main-process architecture service split and boundary-quality audit only. No UI redesign, route change, SQLite schema rewrite, or capability inflation was introduced.

## Before

`src/main/services/store.ts` was the main aggregate owner for Provider, Model, Chat, Gateway, Knowledge, Tools, Data, Security, Audit, Settings, and Observability behavior. That made transactions, permission checks, audit writes, secret redaction, Provider calls, and Gateway coordination hard to reason about in isolation.

## After

`src/main/services/store.ts` is now only a compatibility export:

```ts
export { serviceRegistry as store, NexaServiceRegistry as NexaStore } from './serviceRegistry.js';
export type { GatewayAuthorizationResult, GatewayLogInput } from './serviceContext.js';
```

The composition root is `src/main/services/serviceRegistry.ts`. It builds one registry instance from domain service mixins over `ServiceContext`. `ServiceContext` owns the single shared `DatabaseSync` instance, repository context, seed/bootstrap helpers, shared require helpers, secret encode/decode, common redaction, audit hash helpers, and cross-service utilities.

## Audit Addendum

This round re-checked the split after the code was in place.

- `store.ts` still behaves as a thin facade.
- `serviceRegistry.ts` is still the only composition root.
- `serviceContext.ts` still centralizes shared database context, bootstrap, redaction, secret handling, audit hashing, and the Gateway compat types.
- No domain service reintroduced service-to-service imports or helper duplication.
- Renderer access still stays preload-only.
- Main-process adapter-only HTTP calls still own the live provider protocol path.
- Docs still do not overstate reserved capabilities as complete.

## Service Responsibilities

- `ChatService`: conversation list/create/update, messages, send, retry, regenerate, cancel, compare, context policy, chunks, request logs, usage records, citations, and export.
- `ProviderService`: Provider create, delete, test, query, health records, soft-delete behavior, secret storage handoff, and Provider audit.
- `ModelService`: model create/query, Provider model discovery, fallback-visible model selection data, and Gateway model resolution.
- `GatewayService`: API key create/update/rotate/revoke, scopes, quota, rate limit, key authorization, Gateway logs, `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`, and reserved `/v1/responses` behavior.
- `KnowledgeService`: text-like file import, parsing, chunking, lexical embedding, retrieval preview, rebuild/delete, retrieval traces, and citations.
- `DataService`: import manifest precheck, import apply, snapshots, diagnostics export, data package export, encrypted backup records, restore preflight, rollback records, and data audit.
- `SettingsService`: UI preferences and observability privacy preference persistence.
- `SecurityService`: users, roles, sessions, RBAC, ACL grants, IPC permission mapping enforcement, permission checks, and denied-action audit.
- `AuditService`: audit log list/search/export and hash-chain integrity verification.
- `ToolService`: MCP registration and permission state, agent definitions, dry-run/fixture execution, approval requests, execution steps, and trace events.
- `ObservabilityService`: request logs, usage records, provider health aggregation, feedback, evals, privacy-aware query, and redacted export.
- `DashboardService`: snapshot assembly and dashboard summary only.

## Repository Responsibilities

All repositories are created by `src/main/repositories/repositoryContext.ts` from the same `DatabaseSync` instance. No repository opens its own SQLite connection.

- `chatRepository.ts`: conversations, messages, chunks, attachments, prompt templates, and conversation exports list/read queries.
- `providerRepository.ts`: Provider and Provider health list/read queries.
- `modelRepository.ts`: model list/read queries.
- `gatewayRepository.ts`: Gateway key and Gateway log list/read queries.
- `knowledgeRepository.ts`: knowledge file, chunk, retrieval trace, and citation list/read queries.
- `dataRepository.ts`: import/export result, mobility job, conflict, backup, migration, and rollback list/read queries.
- `settingsRepository.ts`: UI preferences read/default mapping.
- `securityRepository.ts`: users, roles, sessions, and ACL grants list/read queries.
- `auditRepository.ts`: audit log list and action count queries.
- `toolRepository.ts`: MCP, agent, tool, execution run/step/trace, and approval request list/read queries.
- `observabilityRepository.ts`: request log, usage, feedback, eval set, and eval result list/read queries.
- `mappers.ts`: row-to-contract mappers.

High-risk multi-table writes, transaction-sensitive flows, audit hash-chain writes, encrypted backup/decrypt paths, and Provider/Gateway secret flows remain in the owning service/context for this round. They were not left in `store.ts`. This preserves current behavior and leaves smaller repository extraction targets for future focused tests.

## Boundaries

- IPC handlers keep their names and call the exported `store` compatibility object; the actual methods are domain-service methods on `serviceRegistry`.
- Preload API names remain compatible.
- Renderer still calls only through `window.nexachat`; it does not access SQLite, fs, Node APIs, raw Provider keys, Gateway keys, or main internals.
- `src/shared/contracts/*` now re-exports domain request/response types and runtime authorities without importing main or renderer code.
- `src/main/adapters/openAiCompatibleAdapter.ts` owns OpenAI-compatible HTTP protocol adaptation. `src/main/services/openAiCompatibleAdapter.ts` remains a compatibility re-export only.

## Transactions And Data Safety

- No SQLite schema change was made.
- Provider deletion remains soft-delete plus related model disablement, alias disablement, workspace/conversation default clearing, and Provider audit.
- Chat send/retry/regenerate/cancel keeps existing request log, usage record, chunk, model/provider snapshot, and citation behavior.
- Gateway quota/rate/scope checks and log writes remain in the same service-owned path.
- Data import/apply/restore/rollback and backup paths keep existing confirmation, preflight, rollback, and audit behavior.
- Existing historical message fields such as `model_name_snapshot`, `provider_id`, `model_id`, and `request_log_id` are not changed.

## Secret Redaction And Audit

- Provider and Gateway raw keys remain main-process only.
- Gateway key create/rotate still expose raw key only in the one-time return value.
- Redaction continues through `src/main/security/redaction.ts`, Provider adapter request summaries, observability export redaction, audit export redaction, and desktop diagnostic redaction.
- Critical operations continue to write audit logs from the owning service: Provider delete, Gateway key lifecycle, data restore/rollback/backup, settings/privacy changes, permission denials, audit export/search/verify, and tool/execution actions.

## Removed Old Path

- The old monolithic `store.ts` implementation was removed from `store.ts`.
- Public business methods were moved into domain service files and no service calls back into `store.ts` for real business behavior.
- The OpenAI-compatible adapter moved out of `services` into `adapters`; the old path is only a compatibility re-export.

## Compatibility Layers Kept

- `src/main/services/store.ts`: compatibility export for existing imports of `store` and `NexaStore`.
- `src/main/services/openAiCompatibleAdapter.ts`: compatibility re-export for older adapter imports.
- IPC channel names and preload API names remain unchanged.

These compatibility layers do not contain real business logic.

## Capability Truth

- Current first-level modules remain Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings.
- `/` remains `/chat/conversations`.
- Gateway current available endpoints remain `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings`.
- `/v1/responses` remains reserved / 501, not complete.
- Knowledge Base remains text-like import, parsing, chunking, lexical embedding, retrieval preview, rebuild/delete, and citations. PDF, Office, OCR, and external vector DB are not completed.
- Tools / Agent / MCP remain registration, permissions, dry-run/fixture execution, approvals, steps, and traces. Arbitrary MCP execution and release-grade Agent sandbox are not completed.

## Verification

Final required verification:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 22 files / 81 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 7 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed, Electron shell rendered.
- `git diff --check`: passed with LF/CRLF conversion warnings only.

## Remaining Work

- Move transaction-heavy SQL from services/context into repositories only after focused behavior tests exist for each domain. This is intentionally deferred to avoid a broad SQL rewrite in the architecture split round.
- Reduce duplicated broad imports in generated service files. TypeScript accepts them, and cleanup should be mechanical in a separate low-risk pass.
- Consider replacing the mixin composition with explicit service instances once all call sites no longer rely on the legacy aggregate `store` shape.
- The audit round found no additional structural defect that required code change beyond the helper/type centralization already completed.

## Risk Notes

- The service split is complete for public domain behavior and `store.ts` is no longer the business owner.
- Repository extraction is partial by design and documented as such.
- No user data deletion, schema rewrite, route change, UI redesign, or fake capability claim was introduced.
- The remaining risk is incremental drift, not a broken boundary contract.
