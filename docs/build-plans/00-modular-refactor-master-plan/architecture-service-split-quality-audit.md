# Architecture Service Split Quality Audit

## Scope

- `service` / `repository` / `adapter` / `context` boundaries
- `ipc` / `preload` / `renderer` call path stability and privilege boundaries
- docs truth vs current implementation
- test coverage for the critical seams

## Findings

- `src/main/services/store.ts` is a thin compatibility facade.
- `src/main/services/serviceRegistry.ts` is the sole composition root.
- `src/main/services/serviceContext.ts` is the shared owner for the `DatabaseSync`, repository context, redaction, secret encode/decode, audit helpers, and common service utilities.
- Domain services no longer import each other; the only service-to-service wiring is the registry composition chain.
- Repositories stay read/list focused and do not own secret handling, permission checks, or transaction-heavy behavior.
- Renderer access stays preload-only. No direct renderer path to SQLite, `fs`, `safeStorage`, or raw provider/Gateway secrets was found.
- External HTTP fetches remain in the main-process adapter path, not in renderer code.
- Active docs do not overstate `/v1/responses`, PDF/Office/OCR, external vector DB, arbitrary MCP execution, or a release-grade Agent sandbox as complete.

Audit confirmation from this round:

- `store.ts` still forwards to the service registry only.
- `serviceRegistry.ts` remains the only composition root.
- `serviceContext.ts` still centralizes the shared database context and cross-service helpers.
- No renderer, preload, or IPC path was found that bypasses the main-process boundary.
- No document was found that newly claimed reserved capabilities as complete.

## Issues Found

- Several service files still carried duplicated helper tails after the split.
- Several service files still repeated the Gateway compatibility type surface after it had already been centralized.
- That duplication did not break behavior, but it increased drift risk and made the ownership boundary less obvious.
- No additional boundary breakage was found in IPC, preload, renderer, repository, or adapter ownership.

## Fix Applied

- Moved shared helper ownership back to `serviceContext.ts`.
- Kept `GatewayAuthorizationResult` and `GatewayLogInput` type-only on the shared context surface.
- Removed the duplicate helper tails from domain service files.
- Added `tests/store-boundaries.test.ts` coverage to prevent the helper/type duplication from returning.
- Existing tests already cover provider delete history retention, provider model discovery failure behavior, gateway secret redaction, chat send / retry / regenerate / cancel, audit hash-chain integrity, and data backup / restore precheck boundaries.

## Intentional Deferrals

- Transaction-heavy multi-table writes remain in the owning services/context until each domain has focused behavior coverage.
- Electron `sandbox: false` remains unchanged. Hardening it is a separate compatibility-sensitive round.
- The mixin composition root remains in place to avoid a broad constructor rewrite.
- No schema change was made because the audited boundary problems did not require one.

## Conclusion

- The split is structurally healthy.
- The remaining work is incremental cleanup, not another architecture rescue.
- The current audit found no new structural defect that justified broader refactoring.
