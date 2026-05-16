# NexaChat UI Shell Redesign Build Plan

## Status / Current Relevance

This is a historical UI-shell plan from the Workspace/Dashboard stage. It remains useful for compact desktop-tool styling, no visible route leakage, no horizontal overflow, and no fake action buttons.

Current source facts have changed:

- The current app is chat-first.
- The current first-level modules are 7 modules: Chat, Models, Knowledge Base, Tools, Gateway, Data, and Settings.
- `/` currently resolves to `/chat/conversations`.
- Workspace/Dashboard are not current product entry points.

Use `docs/build-plans/00-modular-refactor-master-plan/architecture-mainline-iteration-plan.md` for current architecture decisions.

## Final Goal

This round turns the current NexaChat desktop shell into a clean, maintainable, product-ready AI conversation hub. The work covers the left sidebar, topbar, workbench home, layout system, visual tokens, route-aware module boundaries, tests, desktop shortcut verification, documentation, commit, and push.

The app must keep the existing Electron + React + TypeScript + Vite stack and preserve every implemented capability. The UI should feel like a compact desktop tool: quiet surfaces, clear hierarchy, predictable navigation, no Liquid Glass, no decorative gradients, no visible route paths, no horizontal overflow, and no fake action buttons.

## Confirmed Project Root

- Confirmed with `git rev-parse --show-toplevel`: `D:/NexaChat`.
- All files created or modified in this round stay inside `D:\NexaChat`.

## Skills And Tooling

- `using-superpowers`: available and read from `C:\Users\至亲\.codex\skills\using-superpowers\SKILL.md`.
- `using-superpower`: not available at `C:\Users\至亲\.codex\skills\using-superpower\SKILL.md`; continuing with the available plural skill and equivalent structured workflow.
- Applicable workflow skills read: brainstorming, ui-ux-pro-max, webapp-testing, ralph-loop, planning-with-files-zh.
- `git`: available.
- `node`: available.
- `npm.cmd`: available and preferred for scripts.
- `gh`: not available; commit and push use Git commands.
- `pnpm`: not available.
- `npm.cmd install`: passed, dependencies up to date, 0 vulnerabilities.

## Current Audit

- Navigation source of truth is `src/shared/navigation.ts`.
- The existing eight product modules already match the target direction: 工作台, 对话, 模型, 知识库, 工具与 Agent, 本地网关, 数据配置, 设置与安全.
- `src/renderer/AppShell.tsx` currently renders the sidebar and topbar. It supports expandable groups but still leaks `tab.route` in child links.
- Sidebar expansion is not persisted yet.
- The main workbench is `src/renderer/modules/DashboardPage.tsx`. It uses real `AppSnapshot` data, but its overview still reads like a debug/status board and repeats setup/status/quick-entry copy.
- Global visual tokens are centralized in `src/renderer/styles.css`, but the layout still has a desktop floor, right rail, and topbar patterns that need tighter overflow control.
- Desktop shortcut exists at `C:\Users\至亲\Desktop\NexaChat.lnk` and points to the current project launch path.

## Parallel Execution Plan

### Task Group A: UI Information Architecture And Navigation

- Keep `src/shared/navigation.ts` as the central registry.
- Ensure every sidebar label is product/module/function text only.
- Remove route text from visible sidebar rendering.
- Make current module and current child page visually distinct.
- Persist expanded sidebar module IDs in `localStorage`.
- Preserve legacy route aliases and canonical `/<module>/<tab>` routing.

### Task Group B: Visual System And Layout

- Strengthen CSS variables for background, surface, border, text, button, focus, hover, active, radius, spacing, and typography.
- Rework AppShell, topbar, sidebar, content grid, and right rail to prevent clipping and horizontal scrolling.
- Keep the style compact, flat, and desktop-tool focused.
- Make 1280, 1440, and 1920 width checks explicit in UI smoke coverage.

### Task Group C: Workbench Home

- Rebuild the workbench overview into four clear areas:
  1. Top overview: workspace, default model, local gateway status.
  2. Core metrics: local sessions, today requests, token usage, latest audit/health.
  3. Action entries: open chat, manage Provider, manage Model, manage Gateway Key, import config, view logs.
  4. Recent activity: requests, imports, audits, conversations.
- Use only existing snapshot data and real navigation targets.
- Keep activity and health tabs focused, but make overview the formal home.

### Task Group D: Tests, Docs, Shortcut, Git

- Update Playwright smoke assertions for no path leakage, no horizontal overflow, sidebar expand/collapse, all child route clicks, workbench quick actions, and 1280/1440/1920 layouts.
- Run available scripts: install, typecheck, test, build, verify, UI smoke, Electron smoke.
- Record missing `lint` and `smoke` scripts if absent and use available equivalents.
- Re-check desktop shortcut COM fields after changes.
- Update `PROJECT_PROGRESS.md`.
- Commit with `ui: redesign app shell navigation and workspace`.
- Push to `origin`.

## Acceptance Criteria

- Sidebar shows only product, module, and feature names.
- No visible `/workspace/...` or other route path appears in the sidebar or workbench home.
- First-level and second-level navigation hierarchy is clear.
- Current module and child page have active states.
- Sidebar expansion/collapse is predictable and persisted.
- Topbar content does not clip at 1280, 1440, or 1920 widths.
- Workbench overview has exactly the four intended product areas.
- Workbench quick actions navigate to real feature pages.
- No horizontal scrollbar appears in the shell, content grid, topbar, or workbench.
- Existing route aliases still resolve.
- Existing implemented capabilities remain reachable.
- TypeScript, tests, build, UI smoke, and Electron smoke pass or are documented with a concrete environment-limited reason.

## Execution Log

- 2026-05-14: Confirmed root, skills, tooling, dependency install, current dirty worktree, navigation source, shell/workbench files, package scripts, and desktop shortcut fields.
- 2026-05-14: Started parallel groups A+B and C+D after writing this plan.
- 2026-05-14: Group A+B updated `AppShell`, sidebar hierarchy, topbar controls, visible route removal, sidebar expansion persistence, and global CSS tokens/layout rules.
- 2026-05-14: Group C rewrote `DashboardPage` into 当前概览, 核心指标, 操作入口, 最近活动 using existing snapshot data and real navigation targets.
- 2026-05-14: Group D updated UI smoke and Electron smoke checks for route leakage, responsive widths, sidebar persistence, quick-entry navigation, no horizontal overflow, and Electron renderer errors.
- 2026-05-14: Desktop shortcut was rechecked through COM readback and already points to the current project launch entry.

## Verification Log

- `npm.cmd install`: passed, dependencies up to date, 0 vulnerabilities.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 1 file / 3 tests.
- `npm.cmd run test:ui-smoke`: passed, 10 Playwright tests.
- `npm.cmd run build`: passed.
- `npm.cmd run verify`: passed.
- `npm.cmd run test:electron-smoke`: passed after serial rerun following build completion. A first parallel run read the old `dist` output and was discarded as a verification-order issue.
- `lint`: no script exists in `package.json`.
- `smoke`: no generic `smoke` script exists; `test:ui-smoke` and `test:electron-smoke` were used as project equivalents.
- Responsive visual audit: passed at 1280, 1440, and 1920 widths; screenshots are in ignored `test-results/ui-shell-redesign/`; no route leak, console errors, or horizontal overflow were detected.
- Desktop shortcut: `C:\Users\至亲\Desktop\NexaChat.lnk` target, arguments, working directory, and icon all point to `D:\NexaChat`.
