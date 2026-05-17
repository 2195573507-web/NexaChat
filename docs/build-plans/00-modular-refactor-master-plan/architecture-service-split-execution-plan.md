# Architecture Service Split Execution Plan

## 1. Actual Project Root

- Root confirmed by `git rev-parse --show-toplevel`: `D:/NexaChat`
- Current date: 2026-05-17
- Task: split main-process business logic out of `src/main/services/store.ts` into real domain services while preserving behavior.

## 2. Git Baseline

- Branch: `main`
- Upstream: `origin/main`
- Baseline commit: `decac4733686051dfcd6d17e3c48445b062c1e35`
- Startup status: dirty before this round.

Existing pre-round user/workspace modifications recorded and must not be overwritten:

| File | Status | Notes |
|---|---:|---|
| `src/renderer/modules/ModelsPage.tsx` | Modified | Provider/model UI layout and fetch button changes. |
| `src/renderer/styles/components.css` | Modified | `.field-action-row` layout. |
| `src/renderer/styles/pages.css` | Modified | Provider row responsive layout. |
| `src/shared/i18n.ts` | Modified | Model fetch copy updated. |
| `tests/ui-smoke.spec.ts` | Modified | UI smoke assertions for model fetch/delete controls. |

## 3. Package Scripts

`npm.cmd run` confirmed these required scripts exist:

| Script | Exists |
|---|---:|
| `typecheck` | Yes |
| `test` | Yes |
| `build` | Yes |
| `test:ui-smoke` | Yes |
| `test:electron-smoke` | Yes |

No required script is missing at execution-plan time.

## 4. Current Directory Structure

Main current structure:

| Area | Current responsibility |
|---|---|
| `src/main/database` | SQLite connection, schema, startup migrations. |
| `src/main/repositories` | Row mappers plus domain repositories after this round; all share the same database context. |
| `src/main/security` | Redaction helper. |
| `src/main/services/store.ts` | Centralized business logic for all domains. |
| `src/main/services/localGateway.ts` | Local OpenAI-compatible HTTP gateway handlers. |
| `src/main/adapters/openAiCompatibleAdapter.ts` | Provider HTTP adapter. |
| `src/main/services/openAiCompatibleAdapter.ts` | Compatibility re-export for older imports. |
| `src/main/ipc.ts` | IPC handler registration and permission guard. |
| `src/preload` | Controlled renderer API bridge. |
| `src/renderer` | React UI, no direct SQLite/fs/secret access. |
| `src/shared` | Shared contracts, runtime policies, IPC channel list, navigation, i18n, types. |

## 5. Layer Boundaries

- `src/main`: Electron main process, SQLite, secrets, provider invocation, local gateway, domain services.
- `src/preload`: typed, controlled API bridge only.
- `src/renderer`: UI and state rendering only; must not access SQLite, fs, Node APIs, API keys, or Provider/Gateway secrets.
- `src/shared`: types, contracts, enums, constants, runtime policies; no main/renderer imports.
- `src/main/adapters`: external protocol adapters, including OpenAI-compatible provider calls.
- `src/main/repositories`: low-level database access helpers, row mappers, and stable list/read queries.
- `src/main/services`: domain business rules and orchestration.

## 6. Store Method Migration Matrix

| Method | Target service | DB tables | IPC channel | Adapter/helper | Secret | Audit | Transaction/gateway/test point |
|---|---|---|---|---|---:|---:|---|
| `getSnapshot` | Store facade | all read tables | `app:getSnapshot` | service registry | No | No | Snapshot parity, no audit write. |
| `getDashboardSummary` | DashboardService | workspaces, providers, models, usage_records, gateway_api_keys, conversations | via snapshot | Gateway status helpers | No | No | Dashboard summary unchanged. |
| `getProviders` | ProviderService | providers | snapshot | mapper | Secret ref only | No | Deleted providers filtered. |
| `getModels` | ModelService | models | snapshot, gateway `/v1/models` | mapper | No | No | Disabled models filtered. |
| `getConversations` | ChatService | conversations | snapshot | mapper | No | No | Pin/update ordering unchanged. |
| `getMessages` | ChatService | messages | snapshot | mapper | No | No | Message order unchanged. |
| `getMessageChunks` | ChatService | message_chunks | snapshot | mapper | No | No | Chunk sequence unchanged. |
| `getMessageAttachments` | ChatService | message_attachments | snapshot | mapper | No | No | Attachment status filtering unchanged. |
| `getPromptTemplates` | ChatService | prompt_templates | snapshot | mapper | No | No | Prompt context unchanged. |
| `getConversationExports` | ChatService | conversation_exports | snapshot | mapper | Redacted export option | No | Export list unchanged. |
| `getRequestLogs` | ObservabilityService | request_logs | snapshot | mapper/redaction | No raw prompt | No | Prompt summaries remain redacted. |
| `getUsageRecords` | ObservabilityService | usage_records | snapshot | mapper | No | No | Usage trend uses real records. |
| `getProviderHealthRecords` | ProviderService | provider_health_records | snapshot | mapper | No | No | Health updates preserved. |
| `getFeedbackItems` | ObservabilityService | feedback_items | snapshot | mapper/redaction | No | No | Feedback queries unchanged. |
| `getEvalSets` | ObservabilityService | eval_sets | snapshot | mapper | No | No | Eval set seed unchanged. |
| `getEvalResults` | ObservabilityService | eval_results | snapshot | mapper | No | No | Eval result filtering unchanged. |
| `getObservabilityPrivacySettings` | SettingsService | settings | snapshot | observability runtime | No | No | Defaults unchanged. |
| `queryObservability` | ObservabilityService | request_logs, usage_records, gateway_logs, audit_logs, execution_trace_events, provider_health_records | `observability:query` | shared observability runtime | Redacted | No | Query filters unchanged. |
| `createFeedback` | ObservabilityService | feedback_items, request_logs, messages, audit_logs | `observability:createFeedback` | redaction | Redacted notes | Yes | Linked message/request preserved. |
| `runEvaluation` | ObservabilityService | eval_sets, eval_results, request_logs, usage_records, provider_health_records, audit_logs | `observability:runEval` | OpenAI adapter | Provider key main-only | Yes | Provider eval path unchanged. |
| `saveObservabilityPrivacy` | SettingsService | settings, audit_logs | `observability:savePrivacy` | observability runtime | No | Yes | Privacy setting persisted. |
| `exportObservability` | ObservabilityService | observability read tables, audit_logs | `observability:export` | redacted export builder | Redacted | Yes | Export privacy unchanged. |
| `getGatewayKeys` | GatewayService | gateway_api_keys | snapshot | mapper | Key preview only | No | Raw key never listed. |
| `getGatewayLogs` | GatewayService | gateway_logs | snapshot | mapper | Redacted headers | No | Gateway log ordering unchanged. |
| `getGatewayStatus` | GatewayService | settings, gateway_api_keys | snapshot, `gateway:toggle` | shared gateway runtime | Key count only | No | `/v1/responses` remains reserved. |
| `getSecurityUsers` | SecurityService | security_users | snapshot | mapper | No | No | Local owner session unchanged. |
| `getSecurityRoles` | SecurityService | security_roles | snapshot | mapper | No | No | RBAC unchanged. |
| `getSecuritySessions` | SecurityService | security_sessions | snapshot | mapper | No | No | Active session unchanged. |
| `getAclGrants` | SecurityService | acl_grants | snapshot | mapper | No | No | Deny-before-allow unchanged. |
| `getSecurityState` | SecurityService | security_* and acl_grants | snapshot | shared security runtime | No | No | Permission map unchanged. |
| `setGatewayRuntime` | GatewayService | in-memory runtime state | local gateway | Gateway status | No | No | Listener state unchanged. |
| `getKnowledgeFiles` | KnowledgeService | files | snapshot | mapper | No | No | Deleted files filtered. |
| `getKnowledgeChunks` | KnowledgeService | knowledge_chunks | snapshot | mapper | No | No | Chunk status retained. |
| `getKnowledgeRetrievalTraces` | KnowledgeService | knowledge_retrieval_traces | snapshot | mapper | Query redacted by policy | No | Retrieval preview unchanged. |
| `getKnowledgeCitations` | KnowledgeService | knowledge_citations | snapshot | mapper | No | No | Citations stable. |
| `getMcpServers` | ToolService | mcp_servers | snapshot | mapper | No | No | Experimental MCP boundary unchanged. |
| `getAgents` | ToolService | agents | snapshot | mapper | No | No | Agent dry-run boundary unchanged. |
| `getTools` | ToolService | tools | snapshot | mapper | No | No | Fixture tool list unchanged. |
| `getExecutionRuns` | ToolService | execution_runs | snapshot | mapper | No | No | Run ordering unchanged. |
| `getExecutionSteps` | ToolService | execution_steps | snapshot | mapper | No | No | Step ordering unchanged. |
| `getExecutionTraceEvents` | ToolService | execution_trace_events | snapshot | mapper | Redacted metadata | No | Trace ordering unchanged. |
| `getApprovalRequests` | ToolService | approval_requests | snapshot | mapper | No | No | Approval state unchanged. |
| `getImportExportResults` | DataService | config_snapshots | snapshot | mapper | Redacted manifests | No | Import/export list unchanged. |
| `getDataMobilityJobs` | DataService | data_mobility_jobs | snapshot | mapper | Redacted manifests | No | Job state unchanged. |
| `getDataConflicts` | DataService | data_conflicts | snapshot | mapper | No | No | Conflict filtering unchanged. |
| `getDataBackups` | DataService | data_backups | snapshot | mapper | Encrypted package only | No | No plaintext secret. |
| `getMigrationRuns` | DataService | migration_runs | snapshot | mapper | No | No | Migration records unchanged. |
| `getRollbackRecords` | DataService | rollback_records | snapshot | mapper | No | No | Rollback records unchanged. |
| `getAuditLogs` | AuditService | audit_logs | snapshot | mapper/redaction | Redacted | No | Hash chain preserved. |
| `countAuditAction` | AuditService | audit_logs | snapshot | SQL count | No | No | Read-only. |
| `searchAuditLogs` | AuditService | audit_logs | `audit:search` | redaction | Redacted | Yes | Search audit write preserved. |
| `verifyAuditIntegrity` | AuditService | audit_logs | `audit:verify` | hash chain | No | Optional | Snapshot read stays no-write. |
| `exportAuditLogs` | AuditService | audit_logs | `audit:export` | redacted export | Redacted | Yes | Export redacted. |
| `getUiPreferences` | SettingsService | ui_preferences | snapshot | mapper/theme runtime | No | No | Theme/language/density unchanged. |
| `requirePermission` | SecurityService | security_sessions, roles, acl_grants, audit_logs | all guarded IPC | shared security runtime | No | Denied actions | IPC map unchanged. |
| `createProvider` | ProviderService | providers, secrets, audit_logs | `provider:create` | secret storage/redaction | Main-only | Yes | Provider create unchanged. |
| `deleteProvider` | ProviderService | providers, models, model_aliases, workspaces, audit_logs | `provider:delete` | soft delete | Secret ref not exposed | Yes | Existing soft-delete kept. |
| `fetchProviderModels` | ModelService | providers, provider_health_records | `provider:models:fetch` | OpenAI `/v1/models` adapter | Provider key main-only | No | Existing fetch path kept. |
| `createModel` | ModelService | models, model_aliases, audit_logs | `model:create` | shared model metadata | No | Yes | Model selector unchanged. |
| `testProvider` | ProviderService | providers, provider_health_records, audit_logs | `provider:test` | OpenAI adapter | Provider key main-only | Yes | Health signal unchanged. |
| `createConversation` | ChatService | conversations, audit_logs | `chat:createConversation` | title helper | No | Yes | Default Chat entry unchanged. |
| `updateConversationFlags` | ChatService | conversations, audit_logs | `chat:updateConversationFlags` | status flags | No | Yes | Pin/favorite/archive unchanged. |
| `retryMessage` | ChatService | messages, request_logs, usage_records | `chat:retryMessage` | Provider chain | Provider key main-only | Yes | Retry remains `sendMessage`-based. |
| `regenerateMessage` | ChatService | messages, request_logs, usage_records | `chat:regenerateMessage` | Provider chain | Provider key main-only | Yes | Regenerate metadata unchanged. |
| `cancelMessage` | ChatService | messages, request_logs, chunks, audit_logs | `chat:cancelMessage` | active controller map | No | Yes | Client request id cancellation kept. |
| `compareModels` | ChatService | messages, request_logs, usage_records, audit_logs | `chat:compareModels` | Provider chain | Provider key main-only | Yes | One request log per model. |
| `exportConversation` | ChatService | conversation_exports, messages, attachments, audit_logs | `chat:exportConversation` | redacted export builders | Redacted | Yes | Markdown/JSON unchanged. |
| `sendMessage` | ChatService | conversations, messages, message_chunks, request_logs, usage_records, knowledge_citations, audit_logs | `chat:sendMessage`, gateway chat | OpenAI adapter, KnowledgeService retrieval | Provider key main-only | Yes | Main transaction-sensitive path. |
| `createGatewayKey` | GatewayService | gateway_api_keys, secrets, audit_logs | `gateway:createKey` | secret storage | Raw key one-time only | Yes | Raw key not stored in UI. |
| `updateGatewayKey` | GatewayService | gateway_api_keys, audit_logs | `gateway:updateKey` | gateway runtime | No raw key | Yes | Scopes/quota/rate unchanged. |
| `rotateGatewayKey` | GatewayService | gateway_api_keys, secrets, audit_logs | `gateway:rotateKey` | secret storage | Raw key one-time only | Yes | Old key revoked. |
| `revokeGatewayKey` | GatewayService | gateway_api_keys, audit_logs | `gateway:revokeKey` | gateway runtime | No raw key | Yes | Revoked key denied. |
| `toggleGateway` | GatewayService | settings, audit_logs | `gateway:toggle` | localGateway start/stop | No | Yes | 127.0.0.1:8787 behavior preserved. |
| `authorizeGatewayKey` | GatewayService | gateway_api_keys, secrets | HTTP gateway | scope/quota/rate policy | Raw key compare main-only | No | Scope/quota/rate enforced. |
| `validateGatewayKey` | GatewayService | gateway_api_keys, secrets | compatibility | authorize | Raw key compare main-only | No | Existing helper kept. |
| `resolveGatewayModelId` | ModelService | model_aliases, models | gateway chat | alias/model lookup | No | No | Disabled models excluded. |
| `recordGatewayLog` | GatewayService | gateway_logs, provider_health_records | HTTP gateway | redacted headers | Redacted | No | Logs/health unchanged. |
| `saveUiPreferences` | SettingsService | ui_preferences, audit_logs | `settings:saveUiPreferences` | theme runtime | No | Yes | Preference save unchanged. |
| `createKnowledgeFile` | KnowledgeService | files, chunks, embeddings, audit_logs | `knowledge:createFile` | parser/chunk/lexical embedding | No | Yes | Text-like only. |
| `retryKnowledgeFile` | KnowledgeService | files, chunks, audit_logs | `knowledge:retryFile` | rebuild | No | Yes | Alias to rebuild. |
| `rebuildKnowledgeFile` | KnowledgeService | files, chunks, embeddings, audit_logs | `knowledge:rebuildFile` | chunk/lexical embedding | No | Yes | No PDF/Office/OCR claim. |
| `deleteKnowledgeFile` | KnowledgeService | files, chunks, tombstones, audit_logs | `knowledge:deleteFile` | tombstone | No | Yes | Soft delete kept. |
| `previewKnowledgeRetrieval` | KnowledgeService | retrieval_traces, chunks, embeddings | `knowledge:previewRetrieval` | lexical score | Query only | No | Citations stable. |
| `createMcpServer` | ToolService | mcp_servers, audit_logs | `mcp:createServer` | permission state | No | Yes | Registration only. |
| `updateMcpPermission` | ToolService | mcp_servers, audit_logs | `mcp:updatePermission` | permission state | No | Yes | No executor claim. |
| `createAgent` | ToolService | agents, audit_logs | `agent:create` | definitions | No | Yes | Dry-run boundary. |
| `previewAgentRun` | ToolService | execution_* | `agent:previewRun` | fixtures | No | Yes | Preview only. |
| `startExecutionRun` | ToolService | execution_*, approval_requests, audit_logs | `execution:startRun` | fixture tools | Redacted trace | Yes | Approval boundary. |
| `decideApproval` | ToolService | approval_requests, execution_*, audit_logs | `execution:decideApproval` | fixture tools | Redacted trace | Yes | Approval decision unchanged. |
| `validateImportManifest` | DataService | data_mobility_jobs, data_conflicts, config_snapshots, audit_logs | `data:validateImportManifest` | data runtime | Secrets stripped | Yes | Precheck only. |
| `applyImportPlan` | DataService | providers, models, config_snapshots, rollback_records, audit_logs | `data:applyImportPlan` | manifest runtime | Secrets stripped | Yes | Confirmation required. |
| `restoreSnapshot` | DataService | config_snapshots, providers, models, rollback_records, audit_logs | `data:restoreSnapshot` | data runtime | Redacted | Yes | Rollback confirmation required. |
| `createSnapshot` | DataService | config_snapshots, data_mobility_jobs, audit_logs | `data:createSnapshot` | redacted package | Redacted | Yes | Snapshot metadata only. |
| `exportDiagnostics` | DataService | config_snapshots, data_mobility_jobs, audit_logs | `data:exportDiagnostics` | diagnosis list | Paths redacted | Yes | No raw paths. |
| `exportDataPackage` | DataService | config_snapshots, data_mobility_jobs, audit_logs | `data:exportPackage` | redacted package | Redacted | Yes | No secrets. |
| `createEncryptedBackup` | DataService | data_backups, data_mobility_jobs, audit_logs | `data:createEncryptedBackup` | AES-GCM backup | Encrypted, no renderer secret | Yes | safeStorage fallback not overstated. |
| `createRestorePreflight` | DataService | data_mobility_jobs, data_conflicts, data_backups, audit_logs | `data:createRestorePreflight` | backup decrypt/diff | Encrypted package only | Yes | Preflight only. |
| `applyDataRollback` | DataService | rollback_records, providers, models, data_mobility_jobs, audit_logs | `data:applyRollback` | confirmation phrase | No | Yes | Disable only, no history delete. |

Private helper groups move out of `store.ts` into shared service context/base helpers or the owning service:

| Helper group | Target |
|---|---|
| bootstrap/seed helpers | `serviceRegistry` plus `SecurityService`, `ToolService`, domain seed calls |
| active session/RBAC/ACL helpers | `SecurityService` / shared service context |
| audit hash/write helpers | `AuditService` |
| route/model/provider require helpers | shared service context plus Provider/Model services |
| chat context, attachment, chunk, export helpers | `ChatService` |
| knowledge retrieval, chunk indexing, citation helpers | `KnowledgeService` |
| data manifest, backup, rollback helpers | `DataService` |
| secret encode/decode and provider error normalization | `SecurityService` boundary plus shared service context |

## 7. Split Order

1. Add service registry, shared service context/base, domain services, and compatibility facade.
2. Move Provider/Model methods first because provider delete and model discovery are already validated and must remain behavior-equivalent.
3. Move Chat, then Gateway, because Gateway chat depends on Chat and Model resolution.
4. Move Knowledge and Data.
5. Move Security/Audit/Settings plus existing Tools/Observability to avoid orphaned current APIs.
6. Replace `store.ts` with a thin facade and keep preload/IPC names compatible.
7. Run required verification after major migration and final clean pass.

## 8. Rollback Strategy

- No SQLite schema changes are planned in this round.
- Existing data is preserved because delete/rollback paths remain soft-disable/tombstone behavior.
- If a service migration regresses a domain, revert only that domain service file and facade route, not database contents.
- Generated package/build outputs remain ignored and untracked.

## 9. Risk Register

- Behavior equivalence: preserve SQL ordering, filters, default values, error strings, and status transitions.
- Data safety: no destructive schema or data delete; keep historical `provider_id`, `model_id`, `model_name_snapshot`, and `request_log_id`.
- Transaction-sensitive paths: `sendMessage`, import apply, rollback, backup, gateway auth quota/rate updates, and audit hash writes must keep existing write order and compensation.
- Database context: all services must share the single `getDatabase()` context.
- Secret leakage: Provider and Gateway keys remain main-process only; all errors/logs use redaction.
- Cycles: services are composed by a registry, not direct singleton imports between services.
- Gateway compatibility: `/v1/models`, `/v1/chat/completions`, `/v1/embeddings` remain real; `/v1/responses` remains reserved/501.
- Documentation truth: no current claim of 8 modules, Workspace-first, full PDF/Office/OCR/vector DB, arbitrary MCP executor, full Agent sandbox, or complete `/v1/responses`.

## 10. Behavior That Must Not Change

- First-level modules remain Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings.
- `/` remains routed to `/chat/conversations`.
- Provider delete remains soft delete with model disablement, alias disablement, workspace defaults cleared, and old messages preserved.
- Model list fetch remains main-process Provider adapter path, not renderer direct fetch.
- Chat messages, retries, regenerations, cancellation, exports, chunks, request logs, usage records, and citations keep current semantics.
- Gateway key scope/quota/rate checks and logs remain enforced.
- Knowledge remains text-like lexical retrieval only.
- Data restore remains preflight/confirmed rollback only.
- Renderer remains preload-only.

## 11. Completion Criteria

This round is complete only when:

- The required domain service files exist and contain real migrated business methods.
- `store.ts` is a thin compatibility facade over `serviceRegistry`.
- The existing IPC/preload API remains compatible.
- Required docs are updated.
- `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build`, `npm.cmd run test:ui-smoke`, and `npm.cmd run test:electron-smoke` pass.
- Changes are committed with `refactor: split main architecture into domain services` and pushed to `origin/main`.
