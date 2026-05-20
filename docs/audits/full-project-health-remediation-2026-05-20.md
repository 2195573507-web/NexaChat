# NexaChat Full Project Health Remediation - 2026-05-20

## Baseline
- Real repo root: detected with `git rev-parse --show-toplevel`; this historical note avoids storing the local absolute path.
- Branch: `main`
- Baseline commit: `56de597a2ebde458714043095d6114b0d6f04247`
- Date/timezone: 2026-05-20, Asia/Shanghai
- OS/environment: Windows_NT 10.0.26200 x64, 24 CPU threads
- Node: `v24.14.1`
- npm: `11.11.0` via `npm.cmd`; direct `npm` remains subject to PowerShell `npm.ps1` execution policy
- Package manager: npm (`package-lock.json`)
- Initial git status: clean
- Working note: this file is the audit/remediation record for the run.

## Available Scripts
Captured from `package.json`: `dev`, `dev:electron`, `typecheck`, `build:renderer`, `build:main`, `build`, `start`, `test`, `test:ui-smoke`, `test:electron-smoke`, `package:win-unpacked`, `package:installer-script`, `package:release`, `test:package-smoke`, `test:installer-smoke`, `test:shortcut-readback`, `test:shortcut-readback:local`, `test:shortcut-readback:packaged`, `test:desktop-entry`, `shortcut:package`, `shortcut:local`, `scan:hardcode`, `scan:duplicates`, `scan:security`, `scan:dead-links`, `scan:docs`, `scan:quality`, `verify:release`, `verify`.

Missing scripts: `lint`, `format:check`.

## Source Structure
- `src/main`: Electron main process, SQLite connection, service mixins, repositories, Gateway server, adapters, security helpers.
- `src/preload`: allowlisted `window.nexachat` bridge over IPC.
- `src/renderer`: React shell, seven module pages, UI styling and browser mock API.
- `src/shared`: AppApi, IPC channels and payload guards, navigation, runtime policy, shared types and contracts.
- `tests`: runtime, contract, renderer, UI smoke, Electron smoke and quality gate coverage.
- `scripts`: smoke harnesses, packaging helpers and quality gates.
- `docs`: architecture, design boundaries, testing checklist and audit history.

## Product Truth Snapshot
- Current product is chat-first.
- Top-level modules are exactly: Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings.
- Root route `/` resolves to `/chat/conversations`.
- Gateway is a core standalone module.
- Tools / Agent / MCP are experimental and fixture/dry-run/approval oriented.
- Knowledge Base support is text-like only: `.txt`, `.md`, `.markdown`, `.json`, `.csv`, `.log` plus text/json/csv MIME.
- `/v1/responses` is reserved and returns 501.
- Current-facing docs and UI searches did not find unqualified Workspace-first, Dashboard-first, PDF/Office/OCR/vector DB, arbitrary MCP, Agent sandbox, or full-restore claims.

## Baseline Validation
| Command | Baseline result | Evidence |
|---|---|---|
| `npm.cmd run typecheck` | passed | TypeScript completed. |
| `npm.cmd run test` | passed | 26 files / 125 tests; known `node:sqlite` experimental warning. |
| `npm.cmd run build` | passed | renderer and main builds completed. |
| `npm.cmd run test:ui-smoke` | failed before fix | Vite selected port 5175 while Playwright was fixed to 5173, causing 7 smoke failures. |
| `npm.cmd run test:electron-smoke` | passed | Electron smoke rendered the NexaChat shell. |
| `npm.cmd run scan:quality` | failed before cleanup, then passed | Temporary root planning files conflicted with quality gates; deletion restored pass. |
| `npm.cmd run lint` | script not found | no script in `package.json`. |
| `npm.cmd run format:check` | script not found | no script in `package.json`. |

## Findings
| ID | Severity | Area/Module | Evidence | Root Cause | User Impact | Fix Strategy | Files Changed | Tests/Validation | Status |
|---|---|---|---|---|---|---|---|---|---|
| FPH-001 | P1 | UI smoke/runtime validation | `test:ui-smoke` failed when Vite moved from 5173 to 5175. | Smoke harness started Vite with flexible port, while Playwright config hardcoded 5173. | False red UI signal and unreliable route/module validation on developer machines with occupied ports. | Detect free local port first, start Vite with `--strictPort`, pass `PLAYWRIGHT_BASE_URL` into Playwright config. | `scripts/ui-smoke.mjs`, `playwright.config.ts` | `npm.cmd run test:ui-smoke` passed, 7 tests on 5175. | fixed |
| FPH-002 | P1 | IPC / Observability / Settings | Existing IPC guard rejected current `saveObservabilityPrivacy` fields and `createFeedback` IDs used by UI/runtime. | Runtime DTO evolved from old privacy shape, but shared IPC validator kept obsolete field allowlist. | Privacy and feedback actions could fail at IPC boundary despite valid UI state. | Update validator to current retention/export/local-path/cloud-telemetry privacy fields and feedback `messageId`/`requestLogId`. | `src/shared/ipc.ts`, `tests/ipc-contract.test.ts` | `npm.cmd run test -- tests/ipc-contract.test.ts tests/observability-store.test.ts tests/app.test.tsx` passed earlier; full test passed later. | fixed |
| FPH-003 | P2 | IPC contracts | Chat, Knowledge, pagination, export, UsageTrend and Data option channels had mostly arity checks. | Payload validation coverage had grown unevenly across modules. | Malformed renderer or plugin calls could reach service handlers and create unclear failures. | Add explicit shape, enum, numeric bound and unknown-field guards for high-use module channels. | `src/shared/ipc.ts`, `tests/ipc-contract.test.ts` | IPC contract tests cover valid and malformed payloads; full test passed. | fixed |
| FPH-004 | P2 | Data module / SQLite integrity | `applyImportPlan`, rollback, backup/export/restore jobs performed related writes without a shared write transaction. Regression test can simulate an import failure after metadata insert. | Data mobility service methods wrote config snapshots, mobility jobs, rollback records and entity state as separate statements. | Mid-operation failure could leave half-applied import metadata, orphan rollback state, or misleading job records. | Add nested write transaction helper with SQLite savepoints and wrap Data multi-write operations. Add failure regression test. | `src/main/services/serviceContext.ts`, `src/main/services/dataService.ts`, `tests/data-runtime.test.ts` | `npm.cmd run test -- tests/data-runtime.test.ts tests/ipc-contract.test.ts`; later full test passed. | fixed |
| FPH-005 | P2 | Gateway `/v1/chat/completions` SSE | For `stream: true` with a selected model that uses JSON upstream (`supportsStreaming: false`), Gateway opened SSE but emitted no assistant content. | Gateway assumed chunk events always appear when client asks for SSE; service correctly used non-streaming provider path. | OpenAI-compatible clients could receive an empty stream despite a successful provider response. | When client requests SSE but request log response was not streamed upstream, emit one truthful content delta from the completed assistant message, then finish and send usage metadata. | `src/main/services/localGateway.ts`, `tests/gateway-provider-chain.test.ts` | Gateway provider-chain tests include streaming upstream and JSON-upstream SSE fallback; full test passed. | fixed |
| FPH-006 | P2 | Repo hygiene / quality gates | `scan:quality` failed while temporary root `task_plan.md`, `findings.md`, `progress.md` existed. | Planning skill creates root files, but project quality gates prohibit those stale process files. | Quality gates fail and root source-of-truth becomes ambiguous. | Delete temporary root planning files and keep this timestamped audit report as the durable working note. | removed temporary root planning files; `docs/audits/full-project-health-remediation-2026-05-20.md` | `npm.cmd run scan:quality` passed. | fixed |
| FPH-007 | P3 | Architecture maintainability | `ServiceContext` remains broad and is documented as a known risk; service mixin boundaries are enforced by tests. | Historical service facade owns shared helper methods for routes, secrets, data, knowledge and audit. | Maintainers still need care when moving helpers across services. | Avoid mechanical split during this run; add a focused transaction helper because it reduced a concrete data-safety risk. Keep broader decomposition as an explicit future architecture task. | `src/main/services/serviceContext.ts`, audit record | `tests/store-boundaries.test.ts` remains part of full suite. | intentionally deferred |

## Remediation Summary
- Stabilized browser UI smoke port selection and Playwright base URL injection.
- Reconciled IPC payload validation with current renderer/service contracts and added missing shape guards.
- Added a nested write transaction helper and wrapped Data module multi-write paths.
- Fixed Gateway SSE compatibility for `stream: true` requests against non-streaming JSON upstream responses.
- Removed temporary root planning artifacts that conflicted with repo quality gates.
- Preserved current product truth: chat-first, 7 modules, Gateway core, Tools/MCP experimental, Knowledge text-like only, `/v1/responses` reserved.

## Module Validation
| Module | Evidence | Status |
|---|---|---|
| Chat | UI smoke opened `/` to `/chat/conversations`, sent a message through browser mock, verified retry/regenerate/cancel controls, no route leaks or horizontal overflow. | passed |
| Models | UI smoke verified provider Smart Add fields, API-key password input, provider fetch/delete controls, catalog model fetch path and redaction-oriented status labels. | passed |
| Knowledge Base | UI smoke imported text content, ran lexical retrieval, verified citation/snippet display and unsupported PDF/Office/OCR/vector note. `knowledge-runtime` tests remain in full suite. | passed |
| Tools | UI smoke verified MCP registration boundary, disabled unsafe registration state, fixture status-read execution, agent preview and run trace visibility. | passed |
| Gateway | UI smoke generated key and verified reserved `/v1/responses` docs; Gateway runtime tests cover scopes, quota, rate limit, reserved endpoint, embeddings, provider forwarding and SSE fallback. | passed |
| Data | UI smoke verified import confirmation gating and diagnostics export; data runtime tests cover import preflight/apply/rollback, encrypted backup, restore preflight, redaction and new transaction rollback. | passed |
| Settings | UI smoke verified theme, language, density, reduced motion, security, audit, feedback gating, light/dark/system readability and no overflow. | passed |

## Audit Coverage Notes
- Product truth and docs: searched README, docs, source i18n, tests for stale Workspace/Dashboard, old module counts, fake PDF/OCR/vector/MCP/sandbox/full-restore claims.
- Architecture/layering: inspected renderer shell, module registry, preload bridge, main IPC handlers, shared IPC, service registry, `ServiceContext`, Chat, Provider, Gateway, Knowledge, Tools and Data services.
- Electron/security: verified current documented controls remain `contextIsolation: true`, `nodeIntegration: false`, preload allowlist, no raw `ipcRenderer` exposure, runtime IPC guards and redaction tests.
- SQLite/data: inspected schema-driven services, Data mobility write sequences, rollback records, encrypted backup and restore preflight behavior.
- UI/UX/accessibility: used UI smoke for seven modules, route sync, empty/error/loading states, readable contrast, reduced motion, focusable controls and no horizontal overflow.
- Performance: confirmed existing pagination/list limits for chat, logs, audit, knowledge and usage trend; no broad state rewrite was justified in this remediation.
- Packaging readiness: build, Electron smoke and existing package scripts were inspected; packaging smoke was not required by the user command list and was not run.

## Final Validation
| Command | Result | Evidence |
|---|---|---|
| `npm.cmd run typecheck` | passed | TypeScript completed. |
| `npm.cmd run test` | passed | 26 files / 127 tests; known `node:sqlite` experimental warning. |
| `npm.cmd run build` | passed | renderer Vite build and main `tsc -p tsconfig.main.json` completed. |
| `npm.cmd run test:ui-smoke` | passed | 7 Playwright tests, free port 5175 in latest run. |
| `npm.cmd run test:electron-smoke` | passed | Electron smoke rendered NexaChat shell. |
| `npm.cmd run scan:quality` | passed | `Quality gate passed: all-scans`. |
| `npm.cmd run lint` | script not found | no script in `package.json`. |
| `npm.cmd run format:check` | script not found | no script in `package.json`. |
| `git diff --check` | passed | only Git CRLF normalization warnings. |
| `git status --short` | pending final commit | expected modified remediation files before commit. |

## Remaining Risks
- `ServiceContext` is still a broad facade. Further splitting should be a dedicated architecture change with boundary tests and no behavioral churn.
- Electron `sandbox: false` remains intentionally documented. Enabling sandbox needs a focused compatibility pass across preload, smoke tests, packaging, protocol loading, file input and log-opening paths.
- `node:sqlite` remains experimental in Node 24 and emits warnings during tests.
- UI smoke is strong browser-level coverage, but it is not a full manual QA replacement for every destructive provider/data path with real user secrets.
