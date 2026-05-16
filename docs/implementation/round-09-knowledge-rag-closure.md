# Round 9 Knowledge Base, RAG And File Processing Closure

Date: 2026-05-16

Status: Completed as implementation and verification; commit hash pending.

## Root-Cause And Chain Review

Round 9 addressed the gap where knowledge records existed, but the production path was still metadata-oriented: file creation generated placeholder chunks, citations used a latest-chunk shortcut, and the UI could not prove that import, chunking, retrieval, chat citation, rebuild, and delete shared one chain.

Implemented chain:

- Knowledge import input -> parser normalization -> chunking -> lexical embedding vector -> SQLite file/chunk metadata.
- Retrieval request -> indexed chunk candidates -> lexical scoring -> retrieval trace -> structured citations.
- Chat send -> retrieval -> provider context injection -> assistant metadata -> persisted message citations.
- Rebuild -> tombstone previous chunks -> rebuild from source chunks -> refreshed file/index/embedding status.
- Delete -> deletion tombstone -> chunk deletion -> file tombstone -> active snapshot filtering.
- Renderer -> preload -> IPC -> Store and browser mock now share the same typed AppApi contract for knowledge actions.

PDF, Office, and OCR parsing remain explicitly staged because the round did not add parser dependencies. The UI names the active strategy as lexical embedding instead of pretending a vector database or OCR parser exists.

## Main Changes

- Added `src/shared/knowledgeRuntime.ts` as the Round 9 authority for parser policy, import normalization, chunking, stable hashes, lexical embedding, and scoring.
- Extended shared types with `KnowledgeChunk`, `KnowledgeEmbedding`, `KnowledgeRetrievalTrace`, `KnowledgeCitation`, and typed import/rebuild/delete/retrieval contracts.
- Added additive schema and migration coverage for knowledge file status fields, chunks, embeddings, retrieval traces, citations, and deletion tombstones.
- Updated Store so supported text/Markdown/JSON/CSV/code-like imports create real chunks from supplied content, unsupported imports fail honestly, retrieval persists traces/citations when needed, chat injects retrieval context, and delete/rebuild keep file/chunk/index state consistent.
- Updated the local Gateway `/v1/embeddings` compatibility path to reuse the shared lexical embedding authority.
- Updated main IPC, preload, shared API, and browser mock to expose object-based knowledge import, retry, rebuild, delete, and retrieval preview methods.
- Reworked the Knowledge module UI with import content, index health, chunk status, retrieval preview, citations, rebuild, and delete controls.
- Updated Chat to render structured citation lists on assistant messages.
- Added `tests/knowledge-runtime.test.ts` and extended IPC, app, i18n, and UI smoke coverage.

## Deleted Or Replaced Old Links

- Replaced placeholder knowledge chunk generation with parser-normalized content chunking.
- Removed the latest-chunk citation shortcut from the production chat citation path.
- Replaced file-count-only knowledge snapshots with structured active files, chunks, retrieval traces, and citations.
- Replaced UI-only retry/fallback presentation with typed rebuild/delete/retrieval actions.
- Browser mock remains explicit UI-smoke fallback only, and now filters deleted knowledge files to match production snapshot semantics.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed through build and verify |
| `npm.cmd run test -- tests/knowledge-runtime.test.ts tests/ipc-contract.test.ts tests/i18n-authority.test.ts` | Passed, 3 files / 8 tests |
| `npm.cmd run test` | Passed, 11 files / 35 tests |
| `npm.cmd run test:ui-smoke` | Passed, 12 Playwright tests |
| `npm.cmd run build` | Passed |
| `npm.cmd run verify` | Passed, including typecheck, full unit test suite, and build |
| `npm.cmd run test:electron-smoke` | Passed, Electron shell rendered |
| `git diff --check` | Passed with LF/CRLF conversion warnings only |

Desktop shortcut check:

- `C:/Users/至亲/Desktop/NexaChat.lnk` exists.
- TargetPath: `D:/NexaChat/node_modules/electron/dist/electron.exe`.
- Arguments: `"D:/NexaChat"`.
- WorkingDirectory: `D:/NexaChat`.
- IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
- No shortcut was modified.

## Acceptance Result

Passed at the Round 9 boundary. Supported text/Markdown content can be imported and indexed, retrieval returns structured citations, chat can display cited context, rebuild/delete keep chunks and file state consistent, and unsupported parser categories do not claim fake PDF/Office/OCR/vector behavior.

## Commit

- Delivery commit hash: pending.
- Push result: pending until closeout.
- Remaining issues: None for Round 9. Round 10 owns the unified Agent, MCP, Tool, Workflow execution/run/trace/approval model.
