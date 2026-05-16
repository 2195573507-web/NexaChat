# UI Font And ChatGPT Logic Iteration

Date: 2026-05-16

## Preconditions

- Real repository root was confirmed with `git rev-parse --show-toplevel`: `D:/NexaChat`.
- All commands and writes in this iteration are based on that root.
- `using-superpowers` was loaded from `C:/Users/至亲/.codex/skills/using-superpowers/SKILL.md`.
- `using-superpower` was checked and is not installed at `C:/Users/至亲/.codex/skills/using-superpower/SKILL.md`.
- `impeccable` was loaded from `C:/Users/至亲/.codex/skills/impeccable/SKILL.md`.
- The project-local `.agents/skills/impeccable/scripts/load-context.mjs` path does not exist; the installed skill loader was used instead.
- `impeccable` context load found no repo-level `PRODUCT.md` or `DESIGN.md`, so this iteration follows the product-register UI rules and existing NexaChat docs.
- Current Codex plugins available in this session: Browser, Documents, Presentations, Spreadsheets.
- MCP resources and resource templates were checked and returned empty.
- Package scripts checked from `package.json`: `build`, `test`, `typecheck`, `test:ui-smoke`, `test:electron-smoke`, shortcut readback scripts, packaging scripts, and scan scripts exist. `lint`, `test:ui`, `smoke`, and `electron:smoke` do not exist.

## Scope

This is not a chat-only polish pass. It applies the same operation logic and typography system to every first-level module and every second-level page:

- Workspace.
- Chat.
- Models.
- Knowledge.
- Tools and Agent.
- Local Gateway.
- Data configuration.
- Settings and security.

The UI remains NexaChat: a local AI workbench for providers, models, local gateway, knowledge, tools, data, and security. ChatGPT is used only as an operation-logic reference: left history, clear current task, stable input/action areas, low-distraction secondary controls, recoverable state feedback, and predictable history/file/tool access.

Sources checked for current ChatGPT behavior were the OpenAI Help Center [ChatGPT release notes](https://help.openai.com/en/articles/6825453-release-notes) and [File storage and Library in ChatGPT](https://help.openai.com/en/articles/20001052-file-storage-and-library-in-chatgpt). They informed the general logic of sidebar/library/composer/tool access patterns. This iteration maps those patterns to NexaChat workflows without copying brand, text, icons, or protected visual assets.

## Current UI Audit

### Font And Typography Findings

- The renderer already had a split style entry: `src/renderer/styles.css` imports token, base, shell, component, and page layers.
- Typography needed stronger semantic token coverage. `--font-ui` and `--font-mono` existed, but body, controls, chat text, title sizing, and line heights were not fully registered as shared tokens.
- `KaiTi` behavior needed to stay controlled. It is now represented as `--font-message-writing` and scoped only to message content and composer textarea under `.font-kaiti`.
- Component-level raw `font-family`, raw `font-size`, raw `line-height`, and raw color values needed stronger test guardrails.
- Historical design docs still referenced old token names such as `font-cn` and old HEX examples. `docs/design/02-design-system.md` was updated to the current token vocabulary.

### Operation Logic Findings

- All module pages already use the compact desktop shell and route-aware module switcher.
- Each module had working second-level panels, but page-level primary actions were not consistently anchored in the same place.
- Some pages still duplicated primary actions inside page content after adding `PageHeader`.
- Chat had the strongest mismatch: its composer was single-line and the message actions were too limited for the existing backend API.
- Models had a hand-written activity list and a `route-chain` class name that looked too close to old route/debug vocabulary.
- Gateway overview repeated the start/stop action inside the content region.
- Empty, disabled, error, loading, and detail states existed but needed stronger shared component contracts and tests.

## Implemented Changes

### Shared Typography Tokens

Updated `src/renderer/styles/tokens.css` and `src/shared/theme.ts`:

- `--font-sans`
- `--font-ui`
- `--font-mono`
- `--font-message-writing`
- `--font-size-xs`
- `--font-size-sm`
- `--font-size-md`
- `--font-size-lg`
- `--font-size-xl`
- `--font-size-body`
- `--font-size-control`
- `--font-size-chat`
- `--font-size-title`
- `--line-height-tight`
- `--line-height-normal`
- `--line-height-relaxed`
- `--line-height-control`
- `--line-height-badge`

Updated `src/renderer/styles/base.css`, `shell.css`, `components.css`, and `pages.css` so buttons, fields, body text, chat messages, badges, headers, code/log/API text, and composer text use shared typography tokens.

### Shared Component Contract

Updated `src/renderer/components/AppFrame.tsx`:

- Added `PageHeader` for page title, short description, status, and stable primary actions.
- Added `SectionHeader` so panels no longer hand-write their own heading rows.
- Aligned `ConfigList`, `ConfigDetail`, and `ToolSection` around the same header contract.
- Added `ErrorState` and `LoadingState` wrappers.
- Extended `CommandButton` with `disabledReason`.
- Converted `ChatInput` from a single-line input to a textarea with Enter send, Shift+Enter newline, IME composition guard, stable context row, and disabled reason.
- Kept code/log/endpoint/API key display on monospace token styles.

### All Module Operation Logic

Each second-level page now has a `PageHeader` and follows this contract:

- Page title area: current location, short description, state, and primary action.
- Main content area: core list, form, conversation flow, or task workflow.
- Auxiliary area: status, details, logs, docs, or configuration boundaries.
- Empty/disabled states: only core next steps, no fake operational buttons.

Module-specific changes:

- Workspace: clearer low-distraction launcher and status summary, with primary routes into chat, models, knowledge, and gateway.
- Chat: clearer new conversation entry, stable message reading column, controlled conversation strip, multiline composer, Enter/Shift+Enter behavior, model/context selectors near the composer, and low-distraction copy/retry/regenerate/cancel actions.
- Models: provider/model/router pages now anchor add/test actions in the header; provider IDs and model-like values remain readable; health history uses shared `ActivityList`; workflow chain no longer uses route/debug class naming.
- Knowledge: import, chunk, and retrieval pages use stable headers and distinguish real lexical retrieval from unimplemented RAG/OCR/vector boundaries.
- Tools and Agent: MCP, agents, and runs pages preserve dry-run/permission/fixture boundaries instead of presenting fake execution capability.
- Local Gateway: overview, keys, logs/usage, and docs are separated; start/stop and key generation are header-level actions; API key reveal remains one-time and redacted otherwise.
- Data configuration: import, backup, restore, rollback, and diagnostics now follow a clearer preflight/action/result shape.
- Settings and security: preferences, security, audit, feedback, evals, observability, and about pages use the same header/action/list/detail pattern.

## ChatGPT Logic Learned, Without Copying

NexaChat adopts these operation principles:

- Left navigation remains stable and compact.
- The center work surface carries the active task.
- Main actions are predictable and placed in `PageHeader`.
- Secondary operations are lower visual priority.
- Chat input is always easy to locate.
- Message width is capped for reading comfort.
- Conversation history remains close to the chat task.
- File/tool/model controls are available but do not dominate the main flow.
- Empty states present one to three real next actions.
- Error, disabled, and environment-limited states are explicit and recoverable.

NexaChat does not adopt:

- ChatGPT branding, icons, copy, or protected visual assets.
- A chat-only product structure.
- Fake file, RAG, tool, or Agent capabilities.
- Brand-clone layout decisions that would remove NexaChat's local gateway, provider, knowledge, tool, data, and security surfaces.

## Key Modified Files

- `src/shared/theme.ts`
- `src/renderer/styles/tokens.css`
- `src/renderer/styles/base.css`
- `src/renderer/styles/shell.css`
- `src/renderer/styles/components.css`
- `src/renderer/styles/pages.css`
- `src/renderer/components/AppFrame.tsx`
- `src/renderer/modules/DashboardPage.tsx`
- `src/renderer/modules/ChatPage.tsx`
- `src/renderer/modules/ModelsPage.tsx`
- `src/renderer/modules/KnowledgePage.tsx`
- `src/renderer/modules/ToolsPage.tsx`
- `src/renderer/modules/GatewayPage.tsx`
- `src/renderer/modules/DataPage.tsx`
- `src/renderer/modules/SettingsPage.tsx`
- `tests/app.test.tsx`
- `tests/ui-smoke.spec.ts`
- `tests/theme-token-authority.test.ts`
- `docs/architecture/design-token-authority.md`
- `docs/design/02-design-system.md`

## Guardrails

- No remote font dependency was added.
- No large UI framework was introduced.
- No business data structure was changed.
- No old UI fallback shell was added.
- No duplicate sidebar, composer, message list, or page layout was introduced.
- No project-root-external folder was created.
- Dangerous and unavailable capabilities remain disabled, dry-run, reserved, environment-limited, or explicitly bounded.
- API keys remain masked except for the existing one-time reveal flow.

## Acceptance Criteria

### Typography

- Renderer font families flow through `--font-sans`, `--font-ui`, `--font-mono`, or `--font-message-writing`.
- Body, controls, chat text, titles, badges, and monospace values use semantic size and line-height tokens.
- Chinese UI text remains readable at 14px or 15px body scale.
- Logs, endpoints, model IDs, provider IDs, JSON, paths, and API key previews use monospace styling.
- KaiTi is not a global UI font; it is limited to message writing surfaces.

### Operation Logic

- Every first-level module and every second-level page has a visible `PageHeader`.
- Primary actions are in a stable header position.
- Main task content and auxiliary detail/status areas are visually distinct.
- Chat supports multiline input, Enter send, Shift+Enter newline, retry, regenerate, copy, and cancel where supported by the API.
- Empty states and disabled states expose real next steps only.
- History, logs, detail, advanced settings, and dangerous operations are not mixed into the main task path.

### Engineering

- `npm.cmd run typecheck` passes.
- `npm.cmd run test` passes.
- `npm.cmd run build` passes.
- `npm.cmd run test:ui-smoke` passes.
- `npm.cmd run test:electron-smoke` passes.
- Existing shortcut readback script is run and recorded.
- `git diff --check` passes.
- `PROJECT_PROGRESS.md` is updated.
- Commit message: `refactor(ui): refine typography and chat workflow`.
