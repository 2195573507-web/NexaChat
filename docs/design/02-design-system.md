# Design System

## Color Tokens

### Light Theme

- `color-bg`: `#F7F8FA`
- `color-surface`: `#FFFFFF`
- `color-surface-muted`: `#F1F3F5`
- `color-border`: `#DDE1E6`
- `color-text`: `#1F2328`
- `color-text-muted`: `#667085`
- `color-text-subtle`: `#98A2B3`
- `color-primary`: `#2563EB`
- `color-info`: `#0EA5E9`
- `color-success`: `#16A34A`
- `color-warning`: `#D97706`
- `color-error`: `#DC2626`

### Dark Theme

- `color-bg`: `#111318`
- `color-surface`: `#171A21`
- `color-surface-muted`: `#20242D`
- `color-border`: `#303642`
- `color-text`: `#F2F4F7`
- `color-text-muted`: `#B4BCC8`
- `color-text-subtle`: `#7D8794`
- `color-primary`: `#60A5FA`
- `color-info`: `#38BDF8`
- `color-success`: `#4ADE80`
- `color-warning`: `#FBBF24`
- `color-error`: `#F87171`

## Typography Tokens

- `font-ui`: `"Inter", "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif`
- `font-cn`: `"Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif`
- `font-mono`: `"JetBrains Mono", "Cascadia Code", "SFMono-Regular", Consolas, monospace`
- `font-kaiti`: `"KaiTi", "STKaiti", "楷体", "楷体_GB2312", serif`

Size tokens:

- `text-xs`: 12px
- `text-sm`: 13px
- `text-md`: 14px
- `text-lg`: 16px
- `text-title`: 20px
- `text-page-title`: 24px

Do not scale fonts by viewport width.

## Spacing Tokens

- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-5`: 20px
- `space-6`: 24px
- `space-8`: 32px

## Radius Tokens

- `radius-xs`: 4px
- `radius-sm`: 6px
- `radius-md`: 8px
- `radius-lg`: 10px for menus/dialogs only

Cards should stay at 8px or less unless a future design system changes it.

## Shadow Tokens

- `shadow-none`
- `shadow-menu`: small elevation for menus.
- `shadow-dialog`: controlled elevation for confirmations.

Main panels should rely on borders and surfaces rather than large shadows.

## Border Tokens

- `border-default`
- `border-subtle`
- `border-focus`
- `border-error`
- `border-warning`
- `border-success`

## Layout Tokens

- `sidebar-collapsed`: 72px
- `sidebar-expanded`: 220px
- `topbar-height`: 48px
- `conversation-list-width`: 300px
- `right-rail-width`: 360px
- `window-default`: 1280 x 820
- `window-min`: 1040 x 680

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

- Comfortable: larger gaps, 40px controls, roomier rows.
- Compact: smaller gaps, 32-36px controls, denser lists.

## Icon Style

Linear, simple, consistent. No emojis as UI icons. Use one icon family in implementation.

## Explicit Anti-Patterns

- Do not use too many gradients.
- Do not use bright high-saturation palettes.
- Do not use large-scale glassmorphism.
- Do not make the UI dominated by a single purple/blue gradient family.
- Primary color is for selected state, buttons, links, and status highlights only.

