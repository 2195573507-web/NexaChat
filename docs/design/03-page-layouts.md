# Page Layouts

## Main Window Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Topbar: workspace, search, current model, gateway status      │
├──────────┬────────────────┬─────────────────────┬───────────┤
│ Sidebar  │ Module Panel   │ Main Content        │ Right Rail │
│ 72/220px │ 280-340px      │ flexible            │ 320-420px  │
└──────────┴────────────────┴─────────────────────┴───────────┘
```

## Left First-Level Navigation

Sidebar shows 8 modules with icon, label, active state, optional badge, and status dot. It should never become a hardcoded feature dump.

## Topbar

Topbar includes current workspace, command/search entry, new chat action, current model shortcut, gateway state, and settings/account entry. It must not contain every module action.

## Dashboard Page

- Main: overview metrics, setup state, recent conversations, recent models.
- Right rail: quick actions and recent diagnostics.
- Empty state: create first workspace or add first Provider.

## Chat Page

- Left: conversation list with search, group, pinned, favorites, archive.
- Center: message timeline and input composer.
- Top: conversation title, model switcher, assistant selector, route status.
- Right: parameters, knowledge toggles, tools, context strategy, citations, request details.
- Input: attachment button, context strategy selector, knowledge/tool switches, send, stop generation.
- Message menu: copy, regenerate, edit then resend, branch, favorite, export, view request log.
- Model switch notice: "Local history remains in this conversation after model/API changes."
- Context overflow notice: shown above input with trim strategy options.

## Model Page

- Tabs: providers, model list, capability matrix, parameter templates, health.
- Provider list/detail split view.
- Model detail shows capabilities, context, pricing estimate, health, latency, parameters.

## Provider Detail Page

- Sections: connection, auth, proxy, custom headers, model fetch, test result, recent errors.
- SecretInput masks API Key and shows save/test state inline.
- No popup for normal editing.

## Model Detail Page

- Summary: provider, model id, display name, context length, capabilities.
- Health panel: latest latency, failures, success rate.
- Parameter template editor.
- Usage estimate placeholder.

## Knowledge Page

- File table with parse/index status.
- Knowledge base detail with document list and retrieval test panel.
- Right rail shows selected file metadata and errors.

## MCP Page

- MCP server list, transport type, connection state.
- Discovered tools table with permission toggles.
- Call logs and error diagnosis.

## Agent Run Center Page

- Run list by status.
- Plan and steps in main area.
- Trace and human approval actions in right rail.
- Planned workflow area clearly marked as reserved.

## Local Gateway Page

- Gateway status: running, port, endpoints, bind mode.
- API Key list and creation flow.
- Virtual models and route rule editor.
- Gateway logs linked to request logs.

## External Integration Generator Page

- App selector: Codex, Claude Code, Cursor, Continue, VSCode AI plugins, Cherry Studio, Chatbox, curl, Python, Node.js.
- Generated base URL, model, API key instructions, and copy buttons.
- Warnings for local-only binding and key visibility.

## Data Import Page

- ImportWizard: detect, preview, map fields, conflict review, secrets, confirm, result.
- No silent overwrite.
- Redaction preview before export.

## Logs Page

- Request log table with filters.
- Error diagnosis panel.
- Usage and token summary.
- Link from log row to conversation/message/provider/model.

## Settings Page

- Tabs: request logs, usage, error diagnosis, eval, key security, audit, UI settings, system settings.
- UI settings: theme, density, font, KaiTi / 楷体, language, reduced motion.
- System settings: data path, local gateway port, desktop shortcut requirement.

