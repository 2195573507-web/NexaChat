# Technical Stack

## Recommended Stack

- Desktop: Electron.
- Renderer: React + TypeScript + Vite.
- Storage: SQLite.
- Secure storage: Electron safeStorage, with keytar / system Keychain comparison before implementation.
- IPC: preload-based safe IPC bridge with typed DTOs.
- Gateway: local OpenAI-compatible runtime service.
- Adapter: OpenAI-compatible adapter first, then provider-specific adapters.

## Electron + React + TypeScript + Vite

Recommended because it supports Windows desktop delivery, fast renderer development, mature packaging, IPC control, and reuse of React UI patterns.

## SQLite

SQLite is recommended for local conversations, messages, request logs, usage, settings, snapshots, and audit. It supports local-first persistence, transactions, indexes, and FTS5.

## Secure Storage Comparison

- Electron safeStorage: built into Electron, good first choice for local encrypted values.
- keytar: mature cross-platform keychain wrapper, may add native dependency complexity.
- System Keychain directly: strongest platform integration, more implementation work.

Recommendation: wrap all secret storage behind `security-service` so implementation can switch without changing Provider/Gateway code.

## IPC Security Bridge

- Renderer calls typed IPC methods only.
- No direct SQLite access from renderer.
- No direct secret reads from renderer.
- Validate payloads at main-process boundary.
- Return redacted DTOs to UI.

## OpenAI-Compatible Adapter

First provider adapter should support OpenAI-compatible chat completions, model list, embeddings, streaming, timeout, cancellation, and normalized errors.

## Local Gateway Service

Runs local endpoints when enabled:

- `/v1/chat/completions`
- `/v1/models`
- `/v1/embeddings`
- `/v1/responses` reserved

The service reuses Router and Gateway runtime.

## Testing Framework

- Unit: Vitest.
- Renderer component: React Testing Library.
- E2E: Playwright.
- Electron smoke: Playwright or custom launch smoke.
- SQLite tests: migration and repository tests with temp database.

## Packaging

Recommended future packaging: electron-builder or Electron Forge. Packaging choice should be made after first runnable skeleton. Shortcut verification should happen after packaging or stable dev launcher exists.

## UI Styling Options

- CSS Modules: explicit, lightweight, less dependency lock-in.
- Tailwind: fast token usage and utility consistency, but can become noisy.

Recommendation: choose one after skeleton. Either must use design tokens and avoid ad hoc colors.

## Icons

Use Lucide or similar linear icon set. Avoid emoji UI icons.

## Markdown Rendering

Use a Markdown renderer with safe sanitization. Support tables, task lists, code blocks, math extension, and file references.

## Code Highlighting

Use Shiki or highlight.js. Shiki gives strong visual quality; highlight.js may be lighter.

## Math Rendering

Use KaTeX for LaTeX-style math rendering.

## Virtual Lists

Use a virtual list library or custom virtualization for long conversations, logs, and file/model tables.

## Table Components

Use a lightweight headless table approach such as TanStack Table if implementation needs sorting/filtering/selection at scale.

