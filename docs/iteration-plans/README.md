# NexaChat Iteration Plans

This directory stores all future iteration plans in one place.

## Naming Rule

- Use the pattern `NN-<topic>-iteration-plan.md`.
- `NN` is the iteration number, starting from `01`.
- Plans from the same iteration round should share the same number prefix.
- Keep UI plans and product/function plans in this directory so later rounds stay easy to find.

## Required Sections

Each iteration plan should include:

- Goal
- Current problems or target gaps
- Iteration requirements
- Acceptance criteria
- Risks or non-goals

## Current Round

- `01-ui-iteration-plan.md`
- `01-core-flow-and-function-iteration-plan.md`
- `02-secondary-navigation-and-module-decomposition-iteration-plan.md`

Historical note: Iteration 01 and 02 were written before the chat-first 7-module mainline. They remain useful history, but current architecture work should use `docs/build-plans/00-modular-refactor-master-plan/architecture-mainline-iteration-plan.md`.

## Next Round

- Phase 1 should focus on the Chat mainline and the later simple home / Chat empty-state entry without restoring Workspace/Dashboard-first navigation.
- Phase 2 should focus on Provider / Model real invocation-chain polish.
- Phase 3 should focus on Gateway strengthening.
- Phase 4 should focus on Knowledge Base / RAG expansion beyond the current text-like lexical path.
- Phase 5 should focus on Tools / Agent / MCP moving from experimental fixture/dry-run flows toward real capability only after security boundaries are ready.

Iteration 02 is closed in `docs/implementation/iteration-02-closure.md`. It turned the existing second-level tabs into real route-aware subpages so each module no longer renders every function in one crowded surface.
