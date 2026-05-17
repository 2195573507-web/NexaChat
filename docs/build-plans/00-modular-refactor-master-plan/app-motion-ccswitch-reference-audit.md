# NexaChat App Motion And CC Switch Reference Audit

Date: 2026-05-17

## Preconditions Checked

- Real repository root was confirmed with `git rev-parse --show-toplevel`: `D:/NexaChat`.
- Local skill fact: `C:\Users\至亲\.codex\skills\using-superpower\SKILL.md` does not exist; `C:\Users\至亲\.codex\skills\using-superpowers\SKILL.md` exists and was used.
- MCP resource and template listings returned no resources.
- Available relevant plugins/skills in this Codex session include Browser / browser-use, webapp-testing, impeccable, planning-with-files-zh, ralph-loop, and using-superpowers.
- No files were created outside the project root.

## CC Switch Reference Snapshot

Reference repository:

- `farion1231/cc-switch` `main` was checked at remote head `4f0f103a8aaf9cf1f75abf7477a718cf53d828b9`.

Files inspected:

- `tailwind.config.cjs`
- `src/index.css`
- `src/components/ui/button.tsx`
- `src/components/AppSwitcher.tsx`
- `src/App.tsx`
- `src/components/providers/ProviderList.tsx`
- `src/components/providers/ProviderCard.tsx`
- `CHANGELOG.md`

Useful patterns:

- System font stack and antialiased rendering are used for a native desktop-tool feel.
- Button feedback is restrained: color/border transitions, focus ring, disabled opacity, and short active feedback rather than decorative effects.
- App switching uses a compact segmented control with `duration-200` and stable selected state.
- Page changes use `AnimatePresence` and `motion.div` for light opacity cross-fade.
- Provider search expands locally and focuses with `requestAnimationFrame`, avoiding a whole-app refresh for a small interaction.
- Provider cards use hover and active/drag feedback locally, with row-level affordance rather than global page effects.
- Changelog history explicitly removed complex circular reveal in favor of cross-fade, which supports a conservative motion approach.

NexaChat should not copy:

- The Tauri/TanStack Query stack or CC Switch's app/provider domain model.
- Heavy glass or header blur patterns from CC Switch's shell.
- Drag-sort behaviors that are not currently part of NexaChat's Provider model.
- Framer Motion as a default dependency. NexaChat can meet this round's requirements with CSS tokens and existing React state boundaries; adding `framer-motion` would add weight without a clear need.

## Current NexaChat State

Current strengths:

- Entry route remains `/chat/conversations`.
- The first-level modules remain exactly: Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings.
- Previous fluidity work already added typed IPC events, Chat stream events, task progress events, renderer subscription cleanup, Chat optimistic user/assistant states, paged Chat/messages/logs APIs, usage aggregation, reduced-motion behavior, local pending states, and performance marks.
- `ChatMessageBubble` and quick actions are already memoized.
- Browser mock and Electron smoke already cover route leakage, horizontal overflow, chat-first shell, and the seven-module contract.

Current problems to address in this round:

- Motion token names are still legacy (`--motion-fast`, `--motion-base`, `--motion-slow`) rather than the requested duration/easing contract.
- Font stack order does not match the requested CC Switch-like system stack; Chinese and Latin fallbacks can be made more predictable without external font files.
- Button feedback exists but is not consistently polished for primary, ghost, danger, icon, disabled, and loading-like states.
- Top tabs, rail items, list rows, cards, notices, message bubbles, and detail panels do not all share one transition vocabulary.
- Page/tab switching is still visually abrupt in several cases because content appears without a consistent fade/cross-fade layer.
- List and row updates have some local pending states, but their visual change is not consistently tied to row/card state.
- Advanced Chat detail panel and generation states appear/disappear without the same motion language as other panels.
- Existing tests validate reduced motion and scroll behavior, but they do not yet assert the exact requested motion tokens or guard against layout-property animation regressions.

## Specific Change List

- Replace/alias the legacy motion vocabulary with shared duration and easing tokens:
  - `--duration-instant: 80ms`
  - `--duration-fast: 120ms`
  - `--duration-normal: 160ms`
  - `--duration-slow: 220ms`
  - `--easing-standard: cubic-bezier(0.2, 0, 0, 1)`
  - `--easing-decelerate: cubic-bezier(0, 0, 0.2, 1)`
  - `--easing-emphasized: cubic-bezier(0.2, 0, 0, 1)`
- Update the shared token registry and token-authority tests.
- Change the sans font stack to the requested system order with `Noto Sans SC` and `Microsoft YaHei UI`, without adding or downloading font files.
- Add antialiasing to the root rendering surface.
- Normalize transitions on buttons, top tabs, rail items, page stacks, notices, card/list rows, quick actions, message bubbles, and panels.
- Use only opacity, transform, background-color, border-color, color, and box-shadow for new motion.
- Keep reduced-motion behavior: state changes remain visible, but movement and complex animation are disabled.
- Add focused regression tests for exact token values, forbidden layout/filter animation properties, button feedback CSS, page cross-fade CSS, and font stack.
- Update `PROJECT_PROGRESS.md` with this round's implementation and verification results.

## Performance And Rendering Findings

- Global snapshot refresh is no longer the only route for every module action, but full refresh remains available for cross-module state. This is acceptable as a fallback and should not be removed in a visual-motion round.
- Chat uses paged message loading and a lightweight render window for long timelines. This addresses the highest-risk full-list flicker path.
- Gateway logs, audit logs, knowledge files/chunks, and usage trend data use paged or aggregate APIs.
- Main-process task progress events exist for long audit/data flows. Worker-thread migration remains a separate heavier architecture task.
- The safest current performance improvement is to make UI feedback immediate and consistent without adding a runtime animation library or remounting pages solely for animation.

## Risk And Rollback

Risks:

- CSS motion changes can create visual regressions without failing business tests.
- Over-animating rows or panels can make a desktop tool feel slower.
- Forced React remounts for page transitions would reset local form state and should be avoided.
- Adding `framer-motion` would add dependency and reduced-motion handling burden for limited benefit.

Rollback plan:

- Revert the CSS token/style patch while keeping the prior IPC, pagination, and Chat behavior.
- If a motion rule causes jank, remove the affected selector transition first rather than disabling the entire token system.
- If reduced-motion tests fail, restore the global `.motion-reduced` and `prefers-reduced-motion` overrides before tuning individual components.
- No database, IPC, Provider, Gateway, or Chat persistence contract changes are planned in this round, so rollback should be visual/test-only.

## Acceptance Notes

- This round intentionally does not restore Workspace/Dashboard-first routes or old 8-module navigation.
- This round intentionally does not introduce `framer-motion`; CSS tokenized cross-fade is sufficient and lower risk.
- This round must close with `typecheck`, `test`, `build`, `test:ui-smoke`, and `test:electron-smoke`.
