# Provider Smart Add Implementation Plan

Goal: Implement a CCS-style Provider Smart Add flow in NexaChat without duplicating provider/model paths, preserving the chat-first seven-module app direction.

## Phases

| Phase | Status | Notes |
| --- | --- | --- |
| 1. Audit current Provider flow | Complete | Identified ProviderService.createProvider, ModelService.fetchProviderModels, createModel, IPC/preload, adapter, mock, and tests. |
| 2. Shared discovery contracts | Complete | Added request/result/capability/error/save-from-discovery types. |
| 3. Main-process discovery | Complete | Added URL normalization, candidates, OpenAI-compatible probing, chat test, structured redacted errors, IPC. |
| 4. Renderer Smart Add UX | Complete | Simple default mode, hidden advanced settings, preview before save, no renderer probing. |
| 5. Model sync integration | Complete | Save-from-discovery reuses existing provider and model creation paths. |
| 6. Tests and validation | Complete | Added discovery/store/IP C/renderer/UI smoke coverage and ran required commands. |
| 7. Docs, commit, push | In progress | PROJECT_PROGRESS.md updated; commit and push pending. |

## Decisions

- Use `D:/NexaChat` only after confirming it with `git rev-parse --show-toplevel`.
- Keep all new files inside the repository root.
- Do not add duplicate provider creation or model synchronization flows.
- Treat streaming/usage/embeddings as unknown or not tested unless actually detected through existing safe contracts.

## Validation Results

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 25 files / 108 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 7 tests.
- `npm.cmd run test:electron-smoke`: passed.
- `git diff --check`: passed with Windows line-ending warnings only.
