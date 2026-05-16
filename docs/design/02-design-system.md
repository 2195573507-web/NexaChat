# Design System

## Color Tokens

Runtime color values live in `src/renderer/styles/tokens.css` and are registered in `src/shared/theme.ts`.

Use semantic variables such as `--color-bg`, `--color-rail`, `--color-surface`, `--color-panel`, `--color-muted`, `--color-border`, `--color-border-strong`, `--color-text`, `--color-text-muted`, `--color-text-subtle`, `--color-primary`, `--color-primary-soft`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, `--color-code`, `--color-code-text`, and `--color-on-primary`.

Do not add raw color values in page or component CSS. State tints may use `color-mix()` only when the mix derives from existing tokens.

## Typography Tokens

- `--font-sans`: Inter first when installed, then native Windows/macOS/Linux UI and Chinese system fallbacks.
- `--font-ui`: alias to `--font-sans` for app controls.
- `--font-mono`: code, model IDs, provider IDs, API keys, endpoints, JSON, logs, and filesystem paths.
- `--font-message-writing`: optional message-writing font used only when `.font-kaiti` is enabled.

Size tokens:

- `--font-size-xs`: 12px
- `--font-size-sm`: 13px
- `--font-size-md`: 14px
- `--font-size-lg`: 16px
- `--font-size-xl`: 21px
- `--font-size-body`: body text.
- `--font-size-control`: buttons, inputs, labels.
- `--font-size-chat`: chat message reading text.
- `--font-size-title`: page and panel title text.

Line-height tokens:

- `--line-height-tight`
- `--line-height-normal`
- `--line-height-relaxed`
- `--line-height-control`
- `--line-height-badge`

Do not scale fonts by viewport width.

## Spacing Tokens

- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px

Use spacing tokens through shared shell, component, and page styles instead of page-local one-off values.

## Radius Tokens

- `--radius-sm`: compact controls.
- `--radius-md`: standard panels and cards.
- `--radius-pill`: badges and status pills.

Cards should stay at 8px or less unless a future design system changes it.

## Shadow Tokens

- `--shadow-focus`: focus ring only.

Main panels should rely on borders and surfaces rather than large shadows.

## Layout Tokens

- `--rail-width`: compact module rail width.
- `--switcher-width`: left task switcher width.

## Component States

Every interactive component supports:

- default
- hover
- active
- selected
- disabled
- focus
- loading
- error

## Theme Modes

- Light theme.
- Dark theme.
- System theme.
- High contrast reservation.

## Density Modes

- Comfortable: larger gaps, roomier rows.
- Compact: smaller gaps, denser lists.

## Icon Style

Use one linear icon family in implementation. No emojis as UI icons.

## Explicit Anti-Patterns

- Do not use too many gradients.
- Do not use bright high-saturation palettes.
- Do not use large-scale glassmorphism.
- Do not make the UI dominated by a single purple/blue gradient family.
- Primary color is for selected state, buttons, links, and status highlights only.
- Do not add raw `font-family`, `font-size`, `line-height`, or raw color values outside the token system.
