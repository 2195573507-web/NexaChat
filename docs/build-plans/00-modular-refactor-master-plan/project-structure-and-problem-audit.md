# NexaChat Project Structure And Problem Audit

Date: 2026-05-17

Project root confirmed by `git rev-parse --show-toplevel`: `D:/NexaChat`.

Scope: project problem detection, file-structure optimization audit, and low-risk documentation cleanup only. This report does not migrate source structure, remove tracked files, or rewrite runtime behavior.

## 1. Current Project Structure Summary

Confirmed tooling and environment:

- Branch: `main`.
- Base commit before this audit: `6b57032 fix: resolve agent feedback across app modules`.
- Node: `v24.14.1`.
- npm: `11.11.0`.
- PowerShell: `5.1.26100.8457`.
- `rg`, `git`, `node`, and `npm.cmd` are available.
- Codex MCP resources/templates returned empty lists in this session.
- Available Codex desktop capabilities include shell, plans, MCP resource listing, browser/plugin skills, document/spreadsheet/presentation plugins, and local skill files. `using-superpowers` exists; `using-superpower` does not exist as a local skill path.

Important root files and directories:

- `package.json`: Electron + React + TypeScript + Vite app scripts. Main entry is `dist-electron/main/index.js`; verification commands include `typecheck`, `test`, `build`, `test:ui-smoke`, `test:electron-smoke`, and release/quality-gate scripts.
- `tsconfig.json`: strict renderer/test config with Bundler module resolution.
- `tsconfig.main.json`: strict NodeNext config for `src/main`, `src/preload`, and `src/shared`.
- `vite.config.ts`: React/Vitest config, `base: './'`, dev server on `127.0.0.1:5173`.
- `src/main`: Electron main process, SQLite connection/schema, IPC handlers, local Gateway, Store, Provider adapter, diagnostics, redaction.
- `src/preload`: typed `window.nexachat` preload bridge.
- `src/renderer`: React app, AppFrame shell, module pages, browser-only mock API, styles.
- `src/shared`: navigation, API/IPC contracts, i18n, runtime authorities, shared DTOs and quality gates.
- `docs/build-plans`: historical and active build plans. The active mainline is under `00-modular-refactor-master-plan/`.
- `docs/iteration-plans`: historical iteration plans plus an index. It should not keep absorbing all future architecture plans.
- `PROJECT_PROGRESS.md`, `task_plan.md`, `progress.md`, and `findings.md`: execution ledger/history files in the root.
- `README.md` and `README.zh-CN.md`: current public entry docs. `README.zh-CN.md` is valid UTF-8; PowerShell default output can display mojibake if not read as UTF-8.

Size and responsibility hotspots:

- `src/main/services/store.ts`: 4192 lines; current aggregate owner for providers, models, chat, Gateway keys/logs, knowledge, execution, data mobility, security, observability, audit, and secrets.
- `src/shared/i18n.ts`: 2180 lines; bilingual dictionary and translation helper authority.
- `src/renderer/mockApi.ts`: 2073 lines; browser/test behavior mirror of the preload API.
- `PROJECT_PROGRESS.md`: 1561 lines; long-running ledger mixing current state and historical closure notes.

Ignored generated directories currently present:

- `node_modules/`, `dist/`, `dist-electron/`, `release/`, and `test-results/` are ignored by `.gitignore`.
- No empty non-ignored directory and no obvious non-ignored temporary file was found during this pass.

## 2. Current Confirmed Facts

- Product direction is chat-first.
- Current first-level modules are exactly 7: Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings.
- `/` currently resolves to `/chat/conversations`.
- Gateway is an independent core module, not a Chat subfeature.
- Tools / Agent / MCP are experimental modules.
- Knowledge Base currently supports text-like import, parsing, chunking, lexical embedding, retrieval preview, rebuild/delete, and citations. It does not currently support PDF, Office, OCR, or external vector databases.
- `/v1/responses` is reserved and returns 501. It must not be documented as completed.
- `NexaStore` is still the current centralized aggregate service. Service splitting is a planned extraction path, not a completed source fact.
- Workspace/Dashboard are historical planning contexts, not current first-level modules or current entry points.

## 3. Issue List

### P0

No P0 issue was confirmed in this pass. There is no current evidence from source review or the required verification commands that the audited documentation changes cause build, runtime, data-loss, or immediate security failure.

### P1-1: Secret storage fallback can degrade to reversible Base64

- Description: Provider API keys and Gateway keys use Electron `safeStorage` when available, but fallback to a reversible `local-dev:v1:` Base64 encoding when encryption is unavailable.
- Involved files: `src/main/services/store.ts`, `tests/data-runtime.test.ts`, `README.md`, `docs/build-plans/00-modular-refactor-master-plan/architecture-mainline-iteration-plan.md`.
- Evidence: `encodeSecretValue()` uses `safeStorage.isEncryptionAvailable()` and then falls back to `local-dev:v1:${Buffer.from(value, 'utf8').toString('base64')}` in `src/main/services/store.ts:4108-4116`. The test in `tests/data-runtime.test.ts:135-148` checks that the stored value is not literal plaintext, but does not prove strong encryption when safeStorage is unavailable.
- Root cause: The compatibility fallback is not restricted to test/dev mode and is implemented in the same secret path used by production runtime.
- Upstream/downstream impact: Provider creation and Gateway key creation both call the same secret-save path. SQLite `secrets.encrypted_value` can therefore hold reversible encoded secrets in environments where safeStorage fails.
- Recommended fix: Fail closed for production secret writes when safeStorage is unavailable, or introduce a real OS keychain/keytar-backed alternative. Keep `local-dev:v1` only for explicit test/dev bootstrap and legacy compatibility reads.
- Suitable for this round: No. This round is audit/plan first and should not change secret runtime behavior without focused tests.
- Test requirements: Add safeStorage-unavailable production-mode tests; keep data/security/gateway tests green; assert fallback is only allowed under explicit dev/test mode and legacy reads are still supported.

### P1-2: Provider custom headers can persist sensitive values as plaintext

- Description: `ProviderInput.apiKey` is stored through `secret_ref`, but `customHeadersJson` is saved directly into the `providers` table.
- Involved files: `src/main/services/store.ts`, `src/main/services/openAiCompatibleAdapter.ts`, `src/main/database/schema.ts`, `tests/provider-store-integration.test.ts`.
- Evidence: `createProvider()` writes `input.customHeadersJson?.trim() || null` into `providers.custom_headers_json` at `src/main/services/store.ts:1012-1023`. `buildHeaders()` later parses and forwards those headers in `src/main/services/openAiCompatibleAdapter.ts:214-220`.
- Root cause: The Provider model has a dedicated secret channel for `apiKey`, but no equivalent secret extraction or rejection policy for sensitive custom header keys such as `Authorization`, `x-api-key`, `token`, or `secret`.
- Upstream/downstream impact: Users can accidentally place sensitive credentials in custom headers. Logs may redact headers, but SQLite still stores the raw header JSON.
- Recommended fix: Add a custom-header normalization layer that rejects sensitive header keys or stores sensitive values through `secret_ref`-style records while preserving non-sensitive headers.
- Suitable for this round: No. It touches Provider input contracts, migration/compatibility reads, adapter behavior, and tests.
- Test requirements: Add Store tests proving sensitive custom headers are not persisted as plaintext; adapter tests must prove request injection still works for approved non-sensitive headers and any new secret-ref header path.

### P1-3: Request logs duplicate full user prompt content

- Description: `request_logs.request_summary_json` stores the full trimmed user message in addition to `messages.content`.
- Involved files: `src/main/services/store.ts`, `src/main/database/schema.ts`, `src/shared/observabilityRuntime.ts`, `tests/provider-store-integration.test.ts`, `tests/conversation-runtime.test.ts`.
- Evidence: `store.sendMessage()` inserts `request_summary_json` with `{ message: trimmedContent, ... }` in `src/main/services/store.ts:1486-1510`. Observability export later redacts output in `src/shared/observabilityRuntime.ts:225-258`, but the database row has already duplicated the raw prompt.
- Root cause: Request log summary is being used for both debugging metadata and message content capture.
- Upstream/downstream impact: Sensitive user text exists in both `messages` and `request_logs`, increasing the local data exposure surface and making observability privacy settings less effective for already-written logs.
- Recommended fix: Replace the raw `message` field with `redactedPreview`, length, hash, message count, context IDs, route reason, and retrieval metadata.
- Repair status 2026-05-17: Fixed for new Chat request logs in `src/main/services/store.ts`. `request_summary_json` now uses prompt length, token estimate, SHA-256 prompt hash prefix, and redacted preview while preserving context strategy, context IDs, route reason, retrieval ID, citation count, attachment summary, action, and Provider request metadata.
- Remaining follow-up: Existing historical SQLite rows written before this repair can still contain the old `message` field until a dedicated migration or privacy-pruning task rewrites them. This round intentionally did not add a data migration.
- Suitable for direct repair: Completed for new writes in the 2026-05-17 repair round.
- Test requirements: Assert request summaries do not contain raw secret-like prompt text; preserve context strategy, route reason, attachment summary, retrieval IDs, and usage/audit links.

### P2-1: IPC runtime validation only checks argument count

- Description: IPC contracts are centralized, but runtime validation only enforces min/max arity.
- Involved files: `src/shared/ipc.ts`, `src/main/ipc.ts`, `tests/ipc-contract.test.ts`.
- Evidence: `assertIpcPayload()` checks only `args.length` in `src/shared/ipc.ts:152-161`; arity records are in `src/shared/ipc.ts:163-213`. The main handler accepts `handler: (...args: any[])` in `src/main/ipc.ts:36`. Tests in `tests/ipc-contract.test.ts:18-44` focus on arity, not object shape.
- Root cause: TypeScript validates compile-time call sites, but the Electron IPC boundary lacks runtime schema/type guards.
- Upstream/downstream impact: Malformed renderer payloads can enter Store methods and fail inconsistently. High-risk channels include import, backup, Gateway key lifecycle, audit export, and execution approvals.
- Recommended fix: Add per-channel validators or typed schema guards, starting with secrets, Gateway keys, data restore/rollback, import manifest, and execution approvals.
- Suitable for this round: No, except as a future plan. It is cross-cutting.
- Test requirements: Extend IPC contract tests so wrong object fields/types fail at IPC boundary with consistent errors.

### P2-2: Gateway key authorization decrypts and scans every key

- Description: Gateway authentication reads all Gateway keys and decrypts each stored secret to compare against the presented token.
- Involved files: `src/main/services/store.ts`, `src/main/database/schema.ts`, `tests/gateway-runtime.test.ts`.
- Evidence: `authorizeGatewayKey()` selects all Gateway keys joined with `secrets.encrypted_value` in `src/main/services/store.ts:1851-1857`, then decodes each candidate in `src/main/services/store.ts:1859-1864`.
- Root cause: There is no indexed key hash or lookup prefix for Gateway API keys.
- Upstream/downstream impact: More keys means slower local Gateway requests, and success/failure paths can have observable timing differences. Current local scale makes this P2, not P0.
- Recommended fix: Add `key_hash` or equivalent indexed lookup, then verify candidate with a constant-time comparison.
- Suitable for this round: No. It requires schema migration and key lifecycle tests.
- Test requirements: Add migration tests for existing keys, auth tests for active/disabled/revoked/expired/quota/rate states, and smoke tests for `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings`.

### P2-3: Redaction misses raw `nxk_` Gateway keys in some paths

- Description: Gateway keys are generated with an `nxk_` prefix, but redaction patterns do not consistently include this prefix.
- Involved files: `src/main/services/store.ts`, `src/main/security/redaction.ts`, `src/main/desktopDiagnostics.ts`, `tests/desktop-entry.test.ts`.
- Evidence: Gateway keys are generated as `nxk_${randomBytes(24).toString('hex')}` in `src/main/services/store.ts:1767`. General redaction patterns in `src/main/security/redaction.ts:1-7` cover Bearer tokens, `sk-`, and key fields. Desktop diagnostics match `sk-`, `nxa_`, and `Bearer ...`, but not raw `nxk_`, in `src/main/desktopDiagnostics.ts:8-16`.
- Root cause: Gateway key prefix and redaction rules drifted.
- Upstream/downstream impact: If a raw `nxk_...` value appears outside a Bearer header or known JSON key, diagnostic/audit text may fail to mask it.
- Recommended fix: Centralize secret-prefix redaction and include `nxk_[A-Za-z0-9_-]+` in both runtime and desktop diagnostics.
- Repair status 2026-05-17: Fixed in `src/main/security/redaction.ts` and `src/main/desktopDiagnostics.ts`. Runtime redaction now masks raw `nxk_...` values, and desktop diagnostics include the Gateway key prefix in `SECRET_PATTERN`.
- Remaining follow-up: Redaction patterns are still duplicated between runtime, desktop diagnostics, and shared observability export. A later cleanup should centralize the prefix list without changing behavior.
- Suitable for direct repair: Completed in the 2026-05-17 repair round with focused tests.
- Test requirements: Add tests for raw `nxk_`, Bearer `nxk_`, JSON API key fields, diagnostic messages, and observability/audit exports.

### P2-4: Electron renderer sandbox remains disabled

- Description: The renderer uses `contextIsolation: true` and `nodeIntegration: false`, but `sandbox` is explicitly disabled.
- Involved files: `src/main/index.ts`, `scripts/electron-smoke.mjs`, `tests/renderer-api-boundary.test.ts`.
- Evidence: `BrowserWindow` webPreferences set `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: false` in `src/main/index.ts:95-100`.
- Root cause: Preload/runtime compatibility was prioritized; sandbox hardening has not been validated.
- Upstream/downstream impact: This is not a current exploit by itself, but it weakens Electron defense in depth if renderer content or protocol handling later expands.
- Recommended fix: Plan a sandbox-hardening round that turns `sandbox: true` on and validates preload, custom protocol, packaged launch, and smoke scripts.
- Suitable for this round: No. It can break Electron preload behavior if changed blindly.
- Test requirements: `npm.cmd run test:electron-smoke`, preload API assertions, package smoke, protocol asset loading, and desktop diagnostics.

### P2-5: Main Store, i18n, and browser mock are too large for stable ownership

- Description: Three large files carry multiple responsibilities and should be split by authority, but not in this audit round.
- Involved files: `src/main/services/store.ts`, `src/shared/i18n.ts`, `src/renderer/mockApi.ts`, `src/main/services/storeBoundaries.ts`, `tests/store-boundaries.test.ts`.
- Evidence: Current line counts are `store.ts` 4192, `i18n.ts` 2180, and `mockApi.ts` 2073. `STORE_BOUNDARY_MAP` documents future service targets with `migrationState: 'facade-boundary-only'` in `src/main/services/storeBoundaries.ts:19-45`; tests assert this is not a completed split in `tests/store-boundaries.test.ts:5-18`.
- Root cause: Implementation rounds accumulated working behavior into aggregate authorities before extraction.
- Upstream/downstream impact: Changes to secrets/audit/Gateway/Chat can touch the same Store class; i18n changes become noisy; browser mock parity can drift from preload/main behavior.
- Recommended fix: Extract in dependency order: secret/audit helpers, Gateway key/log service, Provider/Model service, Chat/context service, Knowledge service, Data/Observability service; split i18n dictionaries by locale; move mock API into test/browser-only modules.
- Suitable for this round: No. Large source migration is explicitly out of scope.
- Test requirements: Keep `AppApi`/IPC signatures stable; run Store boundary tests, IPC tests, full unit tests, UI smoke, Electron smoke, and release quality gates after each extraction slice.

### P2-6: Browser mock is a second behavior surface that must stay explicitly test-only

- Description: `src/renderer/mockApi.ts` mirrors much of the main-process behavior for Vite/browser smoke tests.
- Involved files: `src/renderer/api.ts`, `src/renderer/mockApi.ts`, `tests/renderer-api-boundary.test.ts`, `scripts/ui-smoke.mjs`.
- Evidence: The renderer only falls back to mock mode when `MODE === 'test'` or `VITE_NEXACHAT_BROWSER_MOCK === '1'` in `src/renderer/api.ts:14-23`; tests assert production does not silently use mock in `tests/renderer-api-boundary.test.ts:23-39`. The file is still 2073 lines and reimplements many API methods.
- Root cause: Browser-based smoke needs a local API without Electron IPC, but parity is manually maintained.
- Upstream/downstream impact: New `AppApi` methods can pass browser smoke while Electron/main parity is stale unless scanners and tests catch every method.
- Recommended fix: Keep the mock behind explicit test/browser mode, split it by domain, and strengthen parity tests against `APP_API_METHODS` and critical behavior fixtures.
- Suitable for this round: No source changes.
- Test requirements: `tests/renderer-api-boundary.test.ts`, `scan:duplicates`, UI smoke, and targeted mock parity tests whenever `AppApi` changes.

### P3-1: Historical docs still contain stale Workspace/Dashboard and 8-module statements

- Description: Some historical closeout/build-plan docs still state old facts in current-sounding language.
- Involved files: `docs/implementation/build-closure.md`, `docs/implementation/round-15-quality-gates-release-convergence-closure.md`, `docs/build-plans/00-operation-logic-and-navigation-refactor/build-plan.md`, `docs/build-plans/ui-navigation-refactor/plan.md`, `scripts/quality-gates.mjs`.
- Evidence: `docs/implementation/build-closure.md:17` says an 8-module registry exists; `docs/implementation/round-15-quality-gates-release-convergence-closure.md:26` said the only root fallback was `/ -> /workspace/overview`, while current `routeAliasRegistry` maps `/` to `/chat/conversations` in `src/shared/navigation.ts:295-297`. The docs scanner in `scripts/quality-gates.mjs:267-285` checks required files/freshness but not stale current-tense architecture claims.
- Root cause: Old closeout documents were kept as history without a comprehensive superseded/current-status marker.
- Upstream/downstream impact: Future agents may follow old Workspace/Dashboard-first or 8-module text instead of the current chat-first 7-module source fact.
- Recommended fix: Add superseded notes to historical docs and add a stale-fact docs scanner rule for active docs.
- Suitable for this round: Partially yes. This round corrected the obvious Round 15 root-fallback line; broader scanner changes should be a later task.
- Test requirements: Add `scan:docs` stale-fact checks or a docs unit test before moving/archiving many historical files.

### P3-2: Root execution ledgers mix current state with long historical logs

- Description: `task_plan.md`, `progress.md`, `findings.md`, and `PROJECT_PROGRESS.md` are all root-level tracked files and continue growing.
- Involved files: `task_plan.md`, `progress.md`, `findings.md`, `PROJECT_PROGRESS.md`, `README.md`.
- Evidence: Current line counts are `PROJECT_PROGRESS.md` 1561, `progress.md` 589, `findings.md` 204, and `task_plan.md` 168. `README.md` lists the root plan/progress files as important documents.
- Root cause: Earlier execution used root-level persistent planning files as working memory and then kept them as durable project artifacts.
- Upstream/downstream impact: Current state, historical notes, and stale facts become harder to separate; future work may update the wrong ledger.
- Recommended fix: Keep `PROJECT_PROGRESS.md` as the current summary/index, and move old session ledgers into a clear `docs/implementation/archive/` or `docs/current/` structure in a dedicated docs round.
- Suitable for this round: No. Moving tracked ledgers is a structural migration and should be planned first.
- Test requirements: Dead-link scan, docs freshness scan, README link updates, and explicit git diff review.

### P3-3: `docs/build-plans` lacks a clear active/archive index

- Description: Build plans include active mainline docs, historical module plans, UI plans, and operation/navigation refactor plans in one directory tree.
- Involved files: `docs/build-plans/00-master-build-plan.md`, `docs/build-plans/00-modular-refactor-master-plan/`, `docs/build-plans/00-operation-logic-and-navigation-refactor/build-plan.md`, `docs/build-plans/ui-navigation-refactor/plan.md`, `docs/iteration-plans/README.md`.
- Evidence: `docs/iteration-plans/README.md` exists and marks older iteration plans as historical, but there is no equivalent top-level `docs/build-plans/README.md` in the current file list. Several build-plan files already contain historical notes, but discovery is inconsistent.
- Root cause: Planning documents were added across multiple rounds without a single build-plan index.
- Upstream/downstream impact: Future plans can keep piling into `docs/iteration-plans` or ambiguous build-plan folders.
- Recommended fix: Add a build-plan index with Current / Active / Historical / Superseded sections, then gradually move or annotate old plans.
- Suitable for this round: No, except this report. A real index should be a focused docs cleanup task.
- Test requirements: Dead-link scan and docs stale-fact scan.

### P3-4: README.zh-CN is valid UTF-8 but easy to misread through default PowerShell output

- Description: A default PowerShell read can display Chinese text as mojibake, while explicit UTF-8 reading shows the file is intact.
- Involved files: `README.zh-CN.md`, `progress.md`, `findings.md`.
- Evidence: `[System.IO.File]::ReadAllText(..., [System.Text.Encoding]::UTF8)` shows readable Chinese for `README.zh-CN.md`. Plain `Get-Content` output in this session displayed mojibake for some Chinese files.
- Root cause: Terminal/codepage display behavior, not file corruption.
- Upstream/downstream impact: Agents may incorrectly report file corruption or patch already-correct UTF-8 text.
- Recommended fix: When auditing Chinese docs on Windows, read with `-Encoding UTF8` or .NET UTF-8 APIs and record that convention in docs/agent guidance if needed.
- Suitable for this round: Yes as a report note only; no file change needed.
- Test requirements: None beyond UTF-8 read verification.

### P3-5: Ignored generated directories are present but should not be deleted blindly

- Description: `dist/`, `dist-electron/`, `release/`, `test-results/`, and `node_modules/` are present and ignored.
- Involved files: `.gitignore`, local ignored directories.
- Evidence: `.gitignore:1-6` ignores `node_modules/`, `dist/`, `dist-electron/`, `release/`, `coverage/`, and `test-results/`. `git status --short --ignored` shows these directories as ignored.
- Root cause: Normal local build/test/package workflow.
- Upstream/downstream impact: These directories can contain stale generated output, but deleting them can slow or disrupt validation and package smoke checks.
- Recommended fix: Do not delete in this audit round. Add an explicit cleanup script only if future work needs reproducible clean builds.
- Suitable for this round: No deletion performed.
- Test requirements: If cleaned later, rerun install/build/package/smoke checks.

## 4. File Structure Optimization Recommendation

Do not perform a broad migration now. The safer target is to create clearer authority boundaries first, then move files in small slices with tests.

Target structure:

```text
D:/NexaChat
  README.md
  README.zh-CN.md
  PROJECT_PROGRESS.md
  docs/
    current/
      architecture.md
      release-gate.md
      ui-boundaries.md
    build-plans/
      README.md
      active/
      archive/
      00-modular-refactor-master-plan/
    iteration-plans/
      README.md
      active/
      archive/
    implementation/
      current/
      archive/
    architecture/
    design/
    testing/
  src/
    main/
      services/
        store.ts
        secret/
        audit/
        gateway/
        provider/
        chat/
        knowledge/
        data/
        observability/
    shared/
      i18n/
        index.ts
        zh-CN.ts
        en-US.ts
      runtime/
    renderer/
      mock/
      modules/
      components/
      styles/
  tests/
    unit/
    integration/
    ui/
```

Migration order:

1. Add docs index discipline first.
   - Acceptance: `README.md`, `README.zh-CN.md`, `docs/build-plans/README.md`, and `docs/iteration-plans/README.md` all agree on 7 modules, `/ -> /chat/conversations`, Gateway independence, and capability boundaries.
2. Mark historical docs.
   - Acceptance: `rg "8-module|8 modules|/workspace/overview|Dashboard-first|Workspace-first" docs README* PROJECT_PROGRESS.md` only finds historical/archive sections or text with explicit superseded/current-relevance notes.
3. Split i18n dictionaries.
   - Acceptance: dictionary parity tests still pass; no CJK literal regressions outside the i18n authority.
4. Split browser mock by AppApi domain.
   - Acceptance: production still throws if preload is missing; browser mock remains explicit via `VITE_NEXACHAT_BROWSER_MOCK=1`; `scan:duplicates` catches missing AppApi methods.
5. Extract Store cross-cutting services first.
   - Acceptance: secret and audit behavior is covered before Provider/Chat/Gateway extraction.
6. Extract Gateway and Provider/Model services.
   - Acceptance: Gateway key lifecycle, local Gateway endpoints, Provider adapter, and Chat/Gateway shared provider chain tests remain green.
7. Extract Chat/Knowledge/Data/Observability in separate rounds.
   - Acceptance: no IPC channel names, `AppApi` signatures, SQLite schema, or `/ -> /chat/conversations` behavior changes unless explicitly planned.

## 5. Prohibited Actions For Future Rounds

- Do not restore the old 8-module architecture.
- Do not restore Workspace/Dashboard-first navigation or entry behavior.
- Do not overstate PDF, Office, OCR, external vector DB, MCP, Agent sandbox, signed installer, or external sandbox capabilities.
- Do not merge Gateway into Chat as an internal-only subfeature.
- Do not keep dumping all plans into `docs/iteration-plans`.
- Do not add double implementations for ordinary/advanced mode, mock/prod runtime, Gateway/Chat provider calls, or import/export paths.
- Do not move source files before tracing IPC/API contracts, Store calls, DB schema/migration impact, tests, and docs references.

## 6. Low-Risk Cleanup Performed

- Corrected one stale documentation sentence in `docs/implementation/round-15-quality-gates-release-convergence-closure.md`: the root fallback now reflects current source behavior `/ -> /chat/conversations`.
- No source file was migrated.
- No tracked file was deleted.
- No generated ignored directory was deleted.
- No duplicate document was removed; duplicates/stale docs are listed as issues and future tasks.

## 7. Verification

The required verification matrix for this round:

| Command | Result | Notes |
| --- | --- | --- |
| `npm.cmd run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm.cmd run test` | Passed | 20 Vitest files / 71 tests passed. Node emitted existing experimental `node:sqlite` warnings. |
| `npm.cmd run build` | Passed | Typecheck, Vite renderer build, and `tsc -p tsconfig.main.json` completed successfully. |
| `npm.cmd run test:ui-smoke` | Passed | 7 Playwright Chromium smoke tests passed. |
| `npm.cmd run test:electron-smoke` | Passed | Electron smoke rendered the NexaChat shell. |

No command failed in this round. The `node:sqlite` warning during unit tests is an existing runtime warning from Node's experimental SQLite module, not caused by the docs-only audit changes.

## 8. Next Round Codex Task List

1. Secret hardening round: restrict `local-dev:v1` fallback and add production safeStorage-unavailable tests.
2. Provider config safety round: reject or secret-store sensitive custom headers; keep adapter behavior and logs redacted.
3. Historical request-log privacy cleanup: optionally migrate or prune old `request_summary_json.message` fields from existing SQLite databases.
4. IPC schema round: add runtime validators for Gateway key, Data restore/rollback/import, execution approval, Provider, and Chat payloads.
5. Docs structure round: add `docs/build-plans/README.md`, mark historical docs, and add stale-fact scanning before moving root ledgers.
6. Store extraction plan round: start with Secret/Audit/GatewayKey services while keeping `NexaStore` as the facade until all tests are green.

## 9. Repair Round 2026-05-17 Status

This repair round implemented the smallest source changes from the audit that had clear root cause, narrow blast radius, and direct test coverage.

Completed repairs:

- P1-3 new Chat request logs no longer duplicate full prompt text in `request_logs.request_summary_json`.
- P2-3 raw `nxk_` Gateway keys are covered by runtime redaction and desktop diagnostics redaction.

Files changed by the repair:

- `src/main/services/store.ts`
- `src/main/security/redaction.ts`
- `src/main/desktopDiagnostics.ts`
- `tests/provider-store-integration.test.ts`
- `tests/desktop-entry.test.ts`
- `tests/observability-runtime.test.ts`
- `tests/redaction.test.ts`

Targeted verification:

- `npm.cmd run test -- tests/provider-store-integration.test.ts tests/security-runtime.test.ts tests/desktop-entry.test.ts tests/observability-runtime.test.ts tests/redaction.test.ts`: Passed, 5 files / 13 tests.
- `npm.cmd run typecheck`: Passed.
- `npm.cmd run test`: Passed, 21 Vitest files / 72 tests.
- `npm.cmd run build`: Passed.
- `npm.cmd run test:ui-smoke`: Passed, 7 Playwright Chromium smoke tests.
- `npm.cmd run test:electron-smoke`: Passed.

Not changed in this repair:

- No safeStorage fallback behavior was changed.
- No Provider custom header storage behavior was changed.
- No IPC schema validation, SQLite schema migration, Electron sandbox change, Store extraction, i18n split, browser mock split, or documentation directory migration was performed.
