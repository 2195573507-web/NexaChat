# MCP, Agent, And Workflow Runtime Implementation Plan

## Current Reality

- Tools, MCP, Agent, and workflow surfaces are experimental.
- Current code supports registration records, permission state, dry-run previews, safe fixture execution, approval records, and trace events.
- It does not implement arbitrary MCP tool execution, an Agent sandbox, or a workflow runtime.

## Security Model

- Default deny for every external tool and MCP server.
- Separate registration from execution permission.
- Separate read-only tools from write, network, filesystem, shell, and credential-touching tools.
- Require explicit user approval before any non-read-only execution.
- Treat provider prompts, tool inputs, tool outputs, local paths, headers, tokens, and files as sensitive by default.

## Permission Prompts

- Prompt must show tool/server name, transport, action, risk level, input summary, requested resources, timeout, and expected output type.
- Prompt must show whether the action can mutate files, call network, execute commands, or access secrets.
- Approval records must store decision, reason, timestamp, user/session id, run id, step id, and redacted input hash.
- Expired approvals must fail closed.

## Sandboxing Approach

- Start with no arbitrary shell execution.
- First real executor should support allowlisted read-only MCP tools with JSON-schema validation and strict timeouts.
- Higher-risk execution should run in a separate constrained child process with explicit cwd, environment allowlist, output limits, cancellation, and no inherited secrets.
- Agent sandbox should add resource limits, tool budget, network policy, filesystem policy, and step-level cancellation before any autonomous loop is enabled.

## Allowlist And Denylist

- Allowlist by server id, tool name, schema hash, risk level, and permission grant.
- Deny filesystem writes, shell commands, secret reads, arbitrary HTTP requests, and long-running background tasks until the sandbox and approval model are verified.
- Deny unknown transports and malformed server definitions.
- Deny tool results larger than configured output limits.

## Audit Logs

- Every runtime action should write request log or execution trace events with run id, step id, tool id, MCP server id, status, latency, error code, redaction state, input hash, output hash, and approval id.
- Store redacted summaries by default; never persist raw secrets.
- Link workflow/agent runs to chat messages only when the user explicitly starts from chat.

## Test Strategy

- Contract tests for tool schemas, permission states, and approval payloads.
- Unit tests for allowlist/denylist decisions and redaction.
- Integration tests for read-only fixture MCP tool execution.
- Failure tests for timeout, cancellation, malformed schema, denied approval, oversized output, and revoked permission.
- Security smoke tests to prove shell/filesystem/network execution paths stay disabled until intentionally enabled.

## Non-goals

- No arbitrary code execution in this plan phase.
- No unattended autonomous Agent loops.
- No implicit filesystem write access.
- No secret exposure to renderer, tools, or MCP servers.
- No workflow pause/resume runtime until execution state and sandboxing are proven.
