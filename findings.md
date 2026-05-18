# Provider Smart Add Findings

## Baseline

- Actual repository root confirmed by `git rev-parse --show-toplevel`: `D:/NexaChat`.
- Initial `git status --short` was clean.
- `node_modules/` exists and `package.json` defines the required validation scripts, so no dependency install is needed before implementation.

## Existing Contract Signals

- Provider creation is exposed through `src/shared/api.ts`, `src/preload/index.ts`, `src/main/ipc.ts`, and implemented in `src/main/services/providerService.ts`.
- Provider model fetch is already an existing workflow exposed as `fetchProviderModels(providerId)` and implemented in `ModelService`; it should be reused rather than duplicated.
- OpenAI-compatible network access already belongs in `src/main/adapters/openAiCompatibleAdapter.ts`; renderer code must not probe provider endpoints directly.
- Provider deletion is a soft-delete workflow and must remain intact.


## Audit Notes

- The singular skill path using-superpower was checked and is not installed; using-superpowers is installed and was loaded.
- UI design context files (PRODUCT.md/DESIGN.md) are absent in the repo; product-register rules from the installed impeccable skill apply for restrained task UI.
- Embeddings endpoint support in this repo is local Gateway lexical embedding, not upstream Provider embedding probing; Provider discovery should report embeddings as not tested unless a safe upstream adapter test is added.

- Save-from-discovery reuses ProviderService.createProvider() and createModel() through the service registry, preserving existing secret storage, permission checks, and model creation behavior.

## Implementation Findings

- Discovery chooses the best candidate by model-list success, chat-test success, model count, and latency.
- URL handling accepts bare domains, strips endpoint inputs like `/v1/models`, avoids `/v1/v1`, and trims trailing slashes.
- Discovery response objects intentionally never include raw API keys; logs and audit details only include counts, status, capability flags, and URLs.
- Existing manual Provider creation still uses `createProvider()` and remains available inside advanced settings.
- The UI smoke path now asserts the simple Smart Add controls are visible and advanced Provider name is hidden by default.
