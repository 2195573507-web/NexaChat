# RAG Foundation Implementation Map

## Current Facts

- Repository root was confirmed with `git rev-parse --show-toplevel`; the actual root is recorded in `PROJECT_PROGRESS.md` and the final run report.
- Current top-level modules remain Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings.
- Root route remains `/ -> /chat/conversations`.
- Gateway remains a standalone core module.
- Knowledge import currently supports text-like inputs only: text, Markdown, JSON, CSV, and log-like text.
- PDF, Office, OCR, real rerank models, arbitrary MCP execution, Agent sandbox, and workflow runtime are not complete.

## Existing Contracts

- Provider calls flow through `src/main/adapters/providerAdapterRegistry.ts`.
- OpenAI-compatible provider calls use `src/main/adapters/openAiCompatibleAdapter.ts`.
- Knowledge runtime contracts live in `src/shared/knowledgeRuntime.ts` and `src/shared/types.ts`.
- SQLite schema lives in `src/main/database/schema.ts`; additive startup migrations live in `src/main/database/connection.ts`.
- Main process owns provider calls, knowledge retrieval, context assembly, citation persistence, and usage records.
- Renderer reads snapshot/API results and displays status; it does not access SQLite, raw provider secrets, or raw filesystem paths.

## Gaps Addressed In This Run

- OpenAI-compatible embeddings now have a real `/embeddings` adapter path.
- Anthropic and Gemini native adapters explicitly do not support embeddings in this implementation.
- Local vector storage uses SQLite `knowledge_embeddings.vector_json` with deterministic cosine scoring.
- Retrieval is vector-first when provider-backed embeddings exist and falls back to lexical with a recorded reason when they do not.
- Retrieval traces now include provider/model, candidate counts, citation counts, score summary, timings, and error fields.
- Chat already persisted citations; this run routes chat retrieval through the updated async retrieval path.
- Usage records now share request type, total token, estimated flag, latency, status, and error fields across chat, eval, and embeddings.

## Files Modified

- `src/shared/providerRuntime.ts`
- `src/shared/knowledgeRuntime.ts`
- `src/shared/types.ts`
- `src/shared/ipc.ts`
- `src/main/adapters/openAiCompatibleAdapter.ts`
- `src/main/adapters/providerAdapterRegistry.ts`
- `src/main/database/schema.ts`
- `src/main/database/connection.ts`
- `src/main/repositories/mappers.ts`
- `src/main/services/serviceContext.ts`
- `src/main/services/knowledgeService.ts`
- `src/main/services/chatService.ts`
- `src/main/services/localGateway.ts`
- `src/main/services/providerDiscovery.ts`
- `src/main/services/observabilityService.ts`
- `src/renderer/modules/KnowledgePage.tsx`

## Risks

- Provider-backed embedding requires a configured enabled model with `supportsEmbeddings=true`; otherwise Knowledge uses lexical fallback and Gateway `/v1/embeddings` returns a clear error.
- Embedding vectors are stored in SQLite JSON for maintainability, not a specialized vector DB.
- Query text in retrieval traces is redacted and truncated, but still intentionally auditable.
- Constructor seed uses lexical indexing because provider-backed embeddings cannot be awaited safely during synchronous service construction.
- Rerank is only represented as a disabled placeholder in score metadata.

## Acceptance Criteria

- OpenAI-compatible embeddings call a real provider endpoint and redact secrets.
- Unsupported providers/models return explicit embedding errors.
- SQLite can store vector metadata and vectors without external vector services.
- Vector similarity ordering is deterministic and excludes deleted chunks/files.
- Retrieval logs include provider/model, counts, scores, timings, errors, and selected chunk ids.
- Citations carry retrieval id, file id, chunk id, source filename, snippet, score, strategy, and fallback reason.
- Chat responses can attach persisted citations from the main-process retrieval path.
- Usage records distinguish chat, gateway chat, responses, embeddings, evals, estimated token counts, failures, and latency.

## Non-goals

- Complete OpenAI Responses API.
- Tools, multimodal, background, or advanced reasoning support.
- PDF, Office, or OCR import.
- External vector database integration.
- Real reranker model execution.
- Real MCP executor, Agent sandbox, or workflow runtime.
- Electron sandbox enablement.
