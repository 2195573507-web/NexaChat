# NexaChat

NexaChat is a local-first, multi-model AI conversation hub built as a desktop app with Electron, React, TypeScript, Vite, and SQLite.

Chinese name: AI 对话中枢  
Desktop app name: NexaChat  
Current status: runnable implementation pass complete

## What Works Now

- Electron desktop shell with one main window.
- React renderer with the planned 8 first-level modules: 工作台, 对话, 模型, 知识库, 工具与 Agent, 本地网关, 数据配置, 设置与安全.
- Config-driven navigation with implemented, planned, and reserved feature-stage labels.
- Main-process SQLite schema and local store for workspaces, providers, models, conversations, messages, request logs, usage, gateway keys/logs, knowledge files, MCP servers, agents, snapshots, audit logs, and UI preferences.
- Safe preload IPC bridge. The renderer does not access SQLite or raw secrets directly.
- Core Provider -> Model -> Router -> Gateway -> Chat loop with local history persistence.
- Assistant messages record provider, model, model snapshot, request id, tokens, latency, finish reason, status, context strategy, and metadata.
- Local OpenAI-compatible gateway on `127.0.0.1:8787` with `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`, and reserved `/v1/responses`.
- Redaction helpers for Authorization, API keys, sensitive headers, and diagnostics.
- Browser fallback API for Vite and Playwright testing.

## Planned Or Reserved

- Real upstream provider forwarding is not complete; current generation is deterministic local assistant output for validating routing, persistence, gateway shape, and logs.
- Full RAG, real embedding providers, rerank, Office/PDF parsing, OCR, and vector database evaluation are planned.
- MCP execution, custom tool execution, real Agent runs, workflow canvas, trace replay, human approval execution, and code sandbox are reserved.
- Full conflict-aware import/restore/migration flows and encrypted secret backup are planned.
- Packaging, installer, and desktop shortcut verification are not part of this pass.

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
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run verify
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
```

## Documents

- Master build plan: `docs/build-plans/00-master-build-plan.md`
- Implementation closure: `docs/implementation/build-closure.md`
- Active execution plan: `task_plan.md`
- Build findings: `findings.md`
- Progress log: `progress.md`
- UI/UX master plan: `docs/design/00-ui-ux-master-plan.md`
- Architecture: `docs/architecture/`
- Acceptance and future tests: `docs/testing/`
