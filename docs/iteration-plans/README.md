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

## Next Round

- To be defined after reviewing `docs/implementation/iteration-02-closure.md`.

Iteration 02 is closed in `docs/implementation/iteration-02-closure.md`. It turned the existing second-level tabs into real route-aware subpages so each module no longer renders every function in one crowded surface.
