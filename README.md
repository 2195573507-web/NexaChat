# NexaChat

NexaChat is a new from-scratch desktop project for a local-first, multi-model AI conversation hub.

Chinese name: AI 对话中枢  
Product positioning: local-first multi-model AI conversation hub  
Desktop app name: NexaChat  
Current status: planning stage / from-scratch build

This repository does not inherit legacy project code, does not reuse old `src` folders, and does not continue an older project structure. The first deliverable is a complete build plan, UI/UX plan, architecture plan, data model, testing plan, and acceptance criteria.

## Core Capabilities

- Local SQLite chat history that belongs to the user, not to any API.
- Provider, model, router, and gateway separated by design.
- Multi-provider support for cloud, OpenAI-compatible, local, and gateway-style APIs.
- Conversations that can continue after switching Provider or Model.
- Local gateway planning for future OpenAI-compatible access by external tools.
- Knowledge, MCP, Agent, import/export, logs, evaluation, and security modules planned with clear v1 boundaries.

## UI Principles

- Simple, clear, local-first, and suitable for long desktop use.
- No complex Liquid Glass, heavy blur, decorative dashboards, or fake feature shells.
- Unified multi-model management without mixing Provider, Model, Router, and Gateway.
- Conversation records are saved locally and remain available after API changes.
- Beginner-friendly empty states and explicit next actions.

## Planning Documents

- Master build plan: `docs/build-plans/00-master-build-plan.md`
- UI/UX master plan: `docs/design/00-ui-ux-master-plan.md`
- Architecture: `docs/architecture/`
- Decisions: `docs/decisions/`
- Research: `docs/research/competitive-research.md`
- Acceptance and future tests: `docs/testing/`

