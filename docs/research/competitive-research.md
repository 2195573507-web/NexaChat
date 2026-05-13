# Competitive Research

Research goal: learn specific product and architecture lessons for NexaChat without copying code, UI, or unsupported feature scope.

## Summary

NexaChat v1 should implement local-first chat history, Provider/Model management, Router/Gateway separation, clear configuration, and a clean desktop conversation UI. It should reserve interfaces for knowledge, MCP, Agent, workflow, evaluation, and external gateway use, but avoid shipping empty shells.

## Open WebUI

- Learned functions: multi-model chat, model management, files, tools, web search, admin and analytics surfaces.
- Useful for NexaChat module: Chat, Model, Knowledge, Logs.
- v1 implementation: learn unified model switching and file/context affordances.
- Interface reservation: tools, web search, admin analytics.
- Why not copy: Open WebUI is a broad self-hosted web platform with team/admin concerns; NexaChat v1 is a local desktop app.
- UI lesson: show model/context status near chat; avoid copying broad admin complexity.

## LibreChat

- Learned functions: multi-provider chat, Agents, MCP, plugins, artifacts, files, moderation, limits.
- Useful module: Chat, Tools & Agent, MCP, Settings & Security.
- v1 implementation: provider-neutral chat and artifacts reservation.
- Interface reservation: Agent, MCP, plugins, moderation.
- Why not copy: too many enterprise and platform features for v1.
- UI lesson: assistant/tool concepts should be accessible but not overwhelm first-run chat.

## AnythingLLM

- Learned functions: local-first workspaces, document chat, vector/RAG, agents.
- Useful module: Workspace, Knowledge, Agent.
- v1 implementation: workspace concept and local data posture.
- Interface reservation: RAG pipeline, agent skills.
- Why not copy: full document intelligence would slow the chat core.
- UI lesson: workspace and knowledge state should be visible without replacing chat.

## LobeChat

- Learned functions: provider ecosystem, agents, plugins, artifacts, knowledge, polished chat.
- Useful module: Chat, Provider, Artifact, Agent.
- v1 implementation: model switcher, assistant selector, artifact planning.
- Interface reservation: plugin marketplace and complex agent ecosystem.
- Why not copy: rich visual and plugin surface can expand scope too quickly.
- UI lesson: chat should feel modern and capable, but NexaChat should keep denser desktop controls.

## Cherry Studio

- Learned functions: desktop AI client, providers, knowledge, mini tools, translation, assistants, MCP.
- Useful module: Model, Knowledge, Tools & Agent.
- v1 implementation: desktop multi-provider configuration and conversation ergonomics.
- Interface reservation: mini tools, MCP, translation.
- Why not copy: wide tool collection can dilute product focus.
- UI lesson: configuration should be visible and approachable.

## Chatbox

- Learned functions: cross-platform chat client, local storage, model providers, Markdown, math, code, files.
- Useful module: Chat, Model, UI rendering.
- v1 implementation: local chat, clean message rendering, prompt/library reservation.
- Interface reservation: team/cloud features if any later.
- Why not copy: NexaChat needs explicit Router/Gateway separation beyond a simple chat client.
- UI lesson: lightweight chat clients are useful references for low-friction first use.

## Jan

- Learned functions: local models, cloud models, assistants, MCP, local OpenAI-compatible API.
- Useful module: Model, Gateway, MCP.
- v1 implementation: local/cloud model split and local gateway planning.
- Interface reservation: model hub, MCP runtime.
- Why not copy: local inference management can become a separate product.
- UI lesson: local-first identity should be obvious.

## Dify

- Learned functions: RAG, workflows, agents, app publishing, observability.
- Useful module: Knowledge, Agent, Evaluation.
- v1 implementation: none as full workflow; learn separation.
- Interface reservation: workflow and app-like agent definitions.
- Why not copy: Dify is an AI app platform, not a desktop chat hub.
- UI lesson: complex builders need mature runtime first.

## Flowise

- Learned functions: visual chatflows, agentflows, tools, credentials, nodes.
- Useful module: Tools & Agent, Workflow reservation.
- v1 implementation: reserve schemas only.
- Interface reservation: node/workflow model.
- Why not copy: low-code canvas and credential security are too heavy for v1.
- UI lesson: if added later, execution traces must be clear.

## Langflow

- Learned functions: component-based AI flow builder, agents, tools, MCP integration.
- Useful module: Agent, MCP, Workflow.
- v1 implementation: none beyond interface reservation.
- Interface reservation: component/flow schema.
- Why not copy: developer builder UX differs from local chat UX.
- UI lesson: modular components are useful internally, but not first-level UI clutter.

## n8n

- Learned functions: workflow automation, triggers, integrations, executions, AI nodes.
- Useful module: Workflow reservation, Agent run logs.
- v1 implementation: no automation platform.
- Interface reservation: external automation/webhook hooks.
- Why not copy: general automation would dominate the product.
- UI lesson: execution history and retry concepts are useful for Agent runs.

## OpenAI Agent Builder / AgentKit

- Learned functions: visual agent building, connectors, ChatKit, Evals, tracing.
- Useful module: Agent, Evaluation, Trace.
- v1 implementation: trace/eval concepts in plan only.
- Interface reservation: agent builder and eval runner.
- Why not copy: platform-specific and too advanced before local chat core.
- UI lesson: Agent runs need traceable steps and evaluation loops.

## sub2api

- Learned functions: API proxying, OpenAI-compatible gateway behavior, route-like aggregation.
- Useful module: Local Gateway, Provider import.
- v1 implementation: import reviewed gateway-style endpoint only.
- Interface reservation: compatible endpoint import and route logs.
- Why not copy: account pool/subscription conversion can be risky and out of scope.
- UI lesson: gateway configs need clear risk labels and diagnostics.

## CCS / cc-switch

- Learned functions: provider presets, config switch, doctor, backup/restore, quick status.
- Useful module: Model, Data Config, Diagnostics.
- v1 implementation: clear provider presets, import/export, connection tests.
- Interface reservation: config doctor and recovery flows.
- Why not copy: NexaChat is not only a CLI config switcher.
- UI lesson: simple forms, quick switching, and repair feedback are valuable.

## Cursor / Continue / VSCode AI Plugins

- Learned functions: OpenAI-compatible configuration, model selection, IDE context, local/remote providers.
- Useful module: Local Gateway external integration.
- v1 implementation: generated connection instructions.
- Interface reservation: IDE context bridge.
- Why not copy: NexaChat is not an IDE.
- UI lesson: external app setup should produce exact Base URL, model, key, and examples.

## Linear / Raycast / Notion

- Learned functions: clear hierarchy, command palette, quick actions, databases, keyboard-first flows.
- Useful module: UI shell, Dashboard, CommandPalette reservation.
- v1 implementation: restrained information hierarchy and quick actions.
- Interface reservation: command palette.
- Why not copy: NexaChat does not need issue tracking, launcher, or document database scope.
- UI lesson: fewer clear actions beat many unclear panels.

## NexaChat V1 Landing Decisions

- Implement now in v1 plan: local history, multi-provider config, OpenAI-compatible adapter, model health, clear chat UI, diagnostics, import/export design.
- Reserve interfaces: knowledge/RAG, MCP, Agent, workflow, external gateway `/v1/responses`, evaluation.
- Avoid: enterprise RBAC, visual workflow builder, account pools, IDE agent, project management, cloud document workspace.

