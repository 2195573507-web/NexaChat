# Design Token Authority

Date: 2026-05-14

## Source Of Truth

NexaChat uses two linked authorities for the desktop design system:

- `src/shared/theme.ts` owns the typed token names, supported theme modes, and shared token categories.
- `src/renderer/styles.css` is the style entry point and imports the split renderer style layers. `src/renderer/styles/tokens.css` owns the concrete CSS variable values for light and dark rendering.

Renderer components should consume semantic CSS variables such as `--color-primary-soft`, `--radius-md`, or `--color-secret-bg`. Components must not add local literal colors or raw radius values unless the value is being introduced as a token.

## Token Categories

- Color tokens: page backgrounds, surfaces, borders, text, status colors, primary action, focus ring, chat accents, code blocks, planned states, and secret disclosure notices.
- Radius tokens: small controls, standard panels, and pill indicators.
- Spacing tokens: shared small-to-large spacing steps.
- Layout tokens: sidebar width and topbar height.
- Typography tokens: sans/UI/mono/message-writing font stacks, fixed UI/chat type sizes, and semantic line-height steps.
- Motion tokens: `--duration-instant`, `--duration-fast`, `--duration-normal`, `--duration-slow`, `--easing-standard`, `--easing-decelerate`, and `--easing-emphasized`. New UI motion must use these tokens rather than literal durations or ad hoc easing.

## Chain Review

The current UI/theme chain is:

1. `src/shared/theme.ts` defines allowed token names and modes.
2. `src/shared/theme.ts` normalizes stored theme values and resolves `system` against `prefers-color-scheme`.
3. `src/renderer/components/AppFrame.tsx` applies the resolved `theme-light` or `theme-dark` class and exposes `data-theme-mode` plus `data-resolved-theme`.
4. `src/renderer/styles.css` imports `tokens`, `base`, `shell`, `components`, and `pages`; `tokens.css` assigns light variables in `:root` and dark overrides in `.theme-dark`.
5. Shared primitives and module pages use only variables.
6. `tests/theme-token-authority.test.ts` scans CSS for literal color, radius, raw font, raw font-size, and raw line-height regressions, verifies light/dark color-token parity, and covers theme resolver behavior.
7. `tests/ui-smoke.spec.ts` verifies responsive shell readability, theme switching, system-theme changes, and captures ignored screenshots under `test-results/`.

## Motion Rules

NexaChat uses CSS-based, tokenized motion for the desktop shell. The allowed low-cost properties are opacity, transform, background-color, border-color, color, and box-shadow. Do not animate width, height, top, left, filter, backdrop-filter, or grid templates. Reduced motion keeps visible state changes but removes movement and long-running animations through both `prefers-reduced-motion` and the persisted `.motion-reduced` class.

## Deletion Rule

Old per-page literal colors and raw border radii are removed when a semantic token exists. Future UI work must extend the token authority first instead of adding local visual values.
