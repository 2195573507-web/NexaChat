# Information Architecture

## First-Level Navigation

NexaChat currently has exactly 7 first-level modules:

1. Chat
2. Models
3. Knowledge Base
4. Tools
5. Gateway
6. Data
7. Settings

Workspace and Dashboard are historical planning contexts. They are not current product entry points or first-level modules.

## Second-Level Tabs

### Chat

- Conversations
- Playground
- Context

### Models

- Providers
- Catalog
- Router

### Knowledge Base

- Files
- Chunks
- Retrieval

### Tools

- MCP
- Agents
- Runs

### Gateway

- Overview
- Keys
- Logs
- Usage
- Docs

### Data

- Import
- Backup
- Restore
- Rollback
- Diagnostics

### Settings

- Preferences
- Security
- Audit
- Feedback
- Evals
- Privacy
- About

## Hierarchy Rules

- First-level navigation switches product modules.
- Second-level tabs switch stable surfaces within the module.
- Right rail shows contextual details and should not become a hidden primary page.
- Command palette is reserved for quick navigation and commands.
- Sidebar should be generated from module metadata rather than hardcoded per feature.

## Route Strategy

Current route examples:

- `/chat/conversations`
- `/models/providers`
- `/knowledge/files`
- `/tools/mcp`
- `/gateway/overview`
- `/data/import`
- `/settings/security`

Routes should map to module and tab identity so deep links can restore the right surface.

The root route `/` resolves to `/chat/conversations`. `/workspace/...` and `/dashboard/...` are not current primary routes.

## Permission And Status Metadata

Each module entry should support:

- `label`
- `route`
- `icon`
- `children`
- `permission`
- `status`
- `badge`
- `featureStage`: `ready`, `planned`, `environment-limited`, or `hidden`

Planned features should be labeled as planned, not rendered as working controls.

## Capability Boundaries

- Knowledge Base currently supports text-like import, parsing, chunking, lexical embedding, retrieval preview, and citations. PDF, Office, OCR, external vector databases, rerank, and full RAG evaluation are future capabilities.
- Tools / Agent / MCP are experimental: current scope is registration, permissions, agent definitions, dry-run, fixture execution, approvals, steps, and traces. Arbitrary MCP execution and release-grade Agent sandbox are future capabilities.
- Gateway is an independent core module with `/v1/models`, `/v1/chat/completions`, and `/v1/embeddings`. `/v1/responses` is reserved and returns 501.
