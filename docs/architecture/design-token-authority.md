# Design Token Authority

Date: 2026-05-14

## Source Of Truth

NexaChat uses two linked authorities for the desktop design system:

- `src/shared/theme.ts` owns the typed token names, supported theme modes, and shared token categories.
- `src/renderer/styles.css` owns the concrete CSS variable values for light and dark rendering.

Renderer components should consume semantic CSS variables such as `--color-primary-soft`, `--radius-md`, or `--color-secret-bg`. Components must not add local literal colors or raw radius values unless the value is being introduced as a token.

## Token Categories

- Color tokens: page backgrounds, surfaces, borders, text, status colors, primary action, focus ring, chat accents, code blocks, planned states, and secret disclosure notices.
- Radius tokens: small controls, standard panels, and pill indicators.
- Spacing tokens: shared small-to-large spacing steps.
- Layout tokens: sidebar width and topbar height.
- Typography tokens: UI and monospace font stacks.

## Chain Review

The Round 3 UI chain is:

1. `src/shared/theme.ts` defines allowed token names and modes.
2. `src/renderer/styles.css` assigns light and dark CSS variables.
3. Shared primitives and module pages use only variables.
4. `tests/theme-token-authority.test.ts` scans CSS for literal color and radius regressions.
5. `tests/ui-smoke.spec.ts` verifies responsive shell readability and captures screenshots at 1040, 1280, 1440, and 1920 widths.

## Deletion Rule

Old per-page literal colors and raw border radii are removed when a semantic token exists. Future UI work must extend the token authority first instead of adding local visual values.
