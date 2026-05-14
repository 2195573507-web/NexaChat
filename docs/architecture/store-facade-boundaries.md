# Store Facade Boundaries

Date: 2026-05-14

Owner round: Round 1, Architecture Boundary Reorganization.

## Current Role

`src/main/services/store.ts` is currently the factual facade for all main-process business behavior. It owns local data access, seed data, Provider/Model management, Chat, Gateway Key validation, Knowledge records, MCP registry, Agent dry-run, Data import/export previews, UI preferences, secrets, route decisions, and audit append events.

This was acceptable for the first runnable desktop build, but it is now too broad for the full-app roadmap.

## Facade Responsibilities To Keep

The `NexaStore` facade may keep:

- IPC-facing orchestration methods that compose multiple domain services.
- Cross-domain transaction boundaries where one user action writes several tables.
- Snapshot assembly for renderer refreshes until a dedicated query service exists.
- Bootstrapping and seed orchestration until migration and first-run services exist.

The facade should not keep:

- Domain validation rules.
- Secret encoding and key lifecycle internals.
- Provider adapter invocation logic.
- Knowledge parsing/indexing logic.
- Gateway scope/quota policy.
- Agent/MCP/workflow execution logic.
- Import/export conflict resolution.
- Audit integrity and hash-chain logic.

## First Extraction Targets

| Target | Current Source | Extraction Goal |
| --- | --- | --- |
| `secretService` | `saveSecret`, `decodeSecretValue`, provider/gateway key writes | One secret authority with redaction and safeStorage boundaries. |
| `auditService` | `audit` and scattered audit action names | One action registry and append/integrity API. |
| `providerModelService` | `createProvider`, `createModel`, `testProvider`, model aliases | Provider/model validation and health behavior outside facade. |
| `conversationService` | `createConversation`, `sendMessage`, message writes | Conversation/message persistence and audit hooks. |
| `gatewayKeyService` | `createGatewayKey`, `validateGatewayKey`, `recordGatewayLog` | Key lifecycle, scopes, quota, redacted logs. |
| `knowledgeService` | `createKnowledgeFile`, `retryKnowledgeFile` | File/chunk/index lifecycle. |
| `mcpService` | MCP create/update permission methods | Registry and permission state. |
| `agentService` | Agent create/preview methods | Dry-run now, execution model later. |
| `dataLifecycleService` | import/export/snapshot/restore/diagnostics methods | Manifest, conflict, backup, rollback boundaries. |

## Extraction Order

1. Extract pure constants and helper ownership without behavior changes.
2. Extract secret and audit services because other domains depend on them.
3. Extract Provider/Model service and keep facade method signatures stable.
4. Extract Conversation/Chat service after Provider/Model contracts are stable.
5. Extract Gateway Key and Local Gateway policy after real Provider invocation lands.
6. Extract Knowledge, MCP, Agent, and Data Lifecycle in their feature rounds.
7. Replace facade snapshot assembly with a query service once domain repositories exist.

## Tests Required For Each Extraction

- Existing renderer, UI smoke, and Electron smoke must keep passing.
- Each extracted service needs unit tests around validation, persistence, and audit/log side effects.
- IPC contract tests must keep proving renderer/preload/main use the shared channel registry.
- Migration tests are required before any table shape changes.

