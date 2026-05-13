# NexaChat UI/UX Master Plan

## UI Design Goal

Create a desktop UI that makes NexaChat feel like a calm, reliable, local-first AI work tool. The user should understand where they are, what model/channel is active, what data is local, and what action to take next.

## Product Personality

- Professional, quiet, direct, and durable.
- Useful before decorative.
- Beginner-readable without hiding advanced controls.
- Honest about planned features versus implemented features.

## Visual Direction

- Modern, restrained, clean.
- No complex Liquid Glass.
- No heavy blur, high transparency, decorative background blobs, or flashy skeuomorphism.
- No cluttered admin backend.
- Moderate density: enough information for desktop work, not a sparse marketing layout.
- Learn from CCS / cc-switch for clear configuration, Chatbox / Cherry Studio / LobeChat for conversation experience, and Linear / Raycast / Notion for hierarchy and quick actions.

## Interaction Principles

- Keep high-frequency actions one click away: new chat, model switch, attach file, stop generation, retry, open diagnostics.
- Prefer inline panels, right rails, menus, tabs, and drawers over popups.
- Popups are allowed only for dangerous confirmation, system permission, or irreversible actions.
- Every long-running operation has progress and cancel or retry when possible.
- Errors show understandable cause, technical details, repair suggestions, copy error, and open logs.

## Information Architecture

First-level navigation is capped at 8:

1. 工作台
2. 对话
3. 模型
4. 知识库
5. 工具与 Agent
6. 本地网关
7. 数据配置
8. 设置与安全

Canonical module string for validation: 工作台 / 对话 / 模型 / 知识库 / 工具与 Agent / 本地网关 / 数据配置 / 设置与安全.

## Main Navigation

Use a fixed left sidebar with icon + label mode. Compact width is about 72px; expanded width is about 220px. Navigation source should be configuration-driven in future implementation, for example `src/renderer/navigation/moduleGroups.ts`, where each module provides `label`, `route`, `icon`, `children`, `permission`, and `status`.

## Page Layout Strategy

- Main shell: left navigation, topbar, page tabs, main content, optional right detail rail.
- Chat page: left conversation list, center message area, right parameter/context panel.
- Configuration pages: list/detail split view, not modal-first forms.
- Tables: dense but readable, with filters and row actions.
- Cards: individual repeated items only; do not put cards inside cards.

## Component Strategy

Use shared primitives: AppShell, Sidebar, Topbar, ModuleTabs, PageHeader, DataTable, ConfigForm, SecretInput, HealthBadge, ChatLayout, MessageBubble, LogViewer, ImportWizard, RouteRuleEditor, EmptyState, LoadingState, ErrorState, Toast, and reserved CommandPalette.

## Design System Strategy

Define tokens for color, typography, spacing, radius, border, shadow, layout, state, density, and themes. Primary color is used for selected state, primary buttons, links, and informational highlights only. Error, warning, success, and info states have separate tokens.

## Desktop App UX Strategy

- Desktop app name is NexaChat.
- Default future window: 1280 x 820.
- Minimum future window: 1040 x 680.
- Wide layout target: 1440 x 900.
- Only one main window opens on startup.
- No extra onboarding or status popups at launch.
- Future shortcut must be verified after a runnable app exists.

## Empty / Loading / Error States

Every module has a useful empty state, skeleton or progress loading state, and actionable error state. Empty states must include the reason, next action, and at least one button. Error states must include human explanation, collapsible technical details, repair suggestions, copy error button, and open logs button.

## Accessibility

- Visible focus states.
- Keyboard navigation follows visual order.
- Icon-only buttons have labels and tooltips.
- Normal text contrast meets WCAG AA.
- Touch/click targets are at least 44px where practical.
- Error state cannot rely only on color.
- Motion respects reduced-motion settings.

## Theme Strategy

Support light, dark, system theme, and high contrast reservation. Avoid high-saturation palettes and large gradients. Keep background, surface, border, text, and state colors separate.

## Font Strategy

Default UI font uses system sans-serif. Chinese UI text should prefer Microsoft YaHei UI / Microsoft YaHei on Windows. Code and logs use a monospace stack. KaiTi / 楷体 is a user-selectable Chinese creative writing option for message body/preview only, not navigation, buttons, forms, logs, or error text.

## Icon Strategy

Use linear, simple, consistent icons. Prefer Lucide-style icons in future implementation. Avoid emojis as UI icons. Icon-only buttons need tooltips and accessible labels.

## Motion Strategy

Use 120-220ms transitions for hover, active, tab, menu, and panel states. Use opacity and transform. Do not animate layout width/height in ways that shift text unpredictably.

## Responsive / Window Size Strategy

Desktop first. At narrow widths, collapse right rail first, then conversation list. Do not create horizontal scroll for the whole app. Text must not overlap or overflow controls.

## Implementation Notes

Do not hardcode navigation behavior in Sidebar. Future implementation should define module metadata in a central navigation registry and render Sidebar, tabs, permissions, and status from that registry.

## UI Acceptance Criteria

- 8 first-level modules maximum.
- Page hierarchy is visible.
- Chat page remains usable at minimum desktop window size.
- Provider configuration is clear and testable.
- Local history retention after model/API switch is visible.
- Theme, density, font, and KaiTi / 楷体 settings are defined.
- No stale old project name or UI residue appears.
- No fake workflow/agent UI claims completion before implementation.
