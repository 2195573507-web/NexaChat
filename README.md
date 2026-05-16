# NexaChat

NexaChat is a local-first, multi-model AI conversation hub built as a desktop app with Electron, React, TypeScript, Vite, and SQLite.

Desktop app name: NexaChat  
Current status: Round 0-15 full-app blueprint complete and release-gated.

## What Works Now

- Electron desktop shell with one main window, packaged Windows launch, installer-script smoke, startup diagnostics, and a verified desktop shortcut.
- React renderer with eight first-level modules and route-aware second-level pages: Workspace, Chat, Models, Knowledge, Tools and Agent, Local Gateway, Data Config, and Settings/Security.
- Unified authorities for navigation, IPC, API contracts, i18n, theme tokens, Provider runtime, Gateway runtime, Knowledge/RAG, execution, security, data mobility, observability, desktop entry, and quality gates.
- Live Chinese/English switching, dark/light/system theme switching, compact flat desktop-tool styling, and UI smoke coverage for route leakage and horizontal overflow.
- Main-process SQLite schema and local Store for providers, models, conversations, message chunks, request logs, usage, Gateway keys/logs, knowledge files/chunks/embeddings, execution runs, audit logs, backups, observability records, and UI preferences.
- Safe preload IPC bridge with centralized channel authority and permission enforcement; the renderer does not access SQLite or raw secrets directly.
- Real OpenAI-compatible Provider adapter chain for Provider test, Chat, Gateway chat completions, retry, timeout, cancellation, request logs, usage, and audit surfaces.
- Local OpenAI-compatible Gateway with `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`, reserved `/v1/responses`, API Key lifecycle, scopes, quota/rate policy, redacted logs, and CORS/options handling.
- Knowledge import, chunking, lexical embedding fallback, retrieval preview, rebuild/delete, and chat citations for supported text-like content; unsupported PDF/Office/OCR inputs fail honestly until parser dependencies are approved.
- Tool/Agent/Workflow execution model with safe fixtures, run steps, trace events, approval requests, and a shared Run Center boundary.
- Security model with local owner session, RBAC/ACL evaluation, IPC and Store enforcement, audit hash-chain integrity, search, and redacted export.
- Data mobility with redacted export packages, encrypted backup records, restore preflight, conflicts, migration records, and rollback records.
- Observability with usage, request logs, Gateway logs, Provider health, feedback, evals, privacy settings, and redacted observability export.

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
- Build findings: `findings.md`
- Progress log: `progress.md`
- UI/UX master plan: `docs/design/00-ui-ux-master-plan.md`
- Architecture: `docs/architecture/`
- Acceptance and future tests: `docs/testing/`
