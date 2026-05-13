# Tools, MCP And Agent Center Build Plan

## Final Goal

Design a tools, MCP, and Agent module that can safely extend Chat with built-in tools, custom tools, MCP servers, Agent Studio, Agent Run Center, execution plans, traces, and human confirmation while avoiding premature empty workflow shells.

## Scope

Includes tool management, built-in tools, custom tools, MCP Server, stdio / SSE / HTTP MCP, tool discovery, MCP permission control, MCP logs, Agent Studio, Agent Run Center, Agent goals, available models/tools/knowledge, execution plans, steps, trace, human approval nodes, workflow reservation, and code sandbox reservation.

Does not include unrestricted arbitrary code execution, full workflow canvas, or autonomous background agents in v1.

## Submodules

- Tool registry.
- Built-in tools.
- Custom tools.
- MCP server registry.
- MCP discovery.
- MCP permissions.
- MCP call logs.
- Agent Studio.
- Agent Run Center.
- Trace viewer.
- Human approval.
- Workflow reservation.
- Code sandbox reservation.

## Key Features

- Tools are registered with name, description, input schema, output schema, permission, and audit mode.
- MCP servers support stdio, SSE, and HTTP transports in the design.
- MCP tool discovery is separate from granting permission.
- Agent definitions specify goal, allowed models, allowed tools, allowed knowledge bases, and approval policy.
- Agent runs create execution plans, steps, traces, logs, and optional human approval checkpoints.
- Workflow and code sandbox are explicitly reserved interfaces, not v1 fake features.

## Relationship With Other Modules

- Chat can invoke approved tools and Agent runs.
- Model module supplies Agent-available models.
- Knowledge module supplies Agent-available knowledge bases.
- Gateway executes model calls for Agent steps.
- Logs and Audit record tool calls, MCP calls, and human approvals.
- Security enforces permissions and secret redaction.

## Data Requirements

Main tables: `tools`, `mcp_servers`, `agents`, `request_logs`, `audit_logs`, `usage_records`, `knowledge_bases`, `models`.

Future tables: `agent_runs`, `agent_steps`, `tool_call_logs`, `mcp_tool_cache`, `workflow_definitions`.

Inputs: tool schemas, MCP server configs, agent goals, permission selections, model/knowledge choices.  
Outputs: tool execution logs, MCP discovery cache, agent run traces, approval decisions.

## UI Requirements

- Tools & Agent page tabs: 工具, MCP, Agent, 运行中心, 工作流预留.
- MCP page shows server list, transport type, connection state, discovered tools, permission status, call logs.
- Agent Studio uses a structured form: goal, default model, allowed tools, knowledge, approval rules.
- Agent Run Center shows plan, steps, trace, status, errors, and human confirmation actions.
- Workflow reservation page explains planned status and does not expose non-working buttons.

## Security Requirements

- MCP server activation requires explicit approval.
- Discovered MCP tools are disabled until granted.
- Tool calls are logged with redacted arguments where needed.
- Human approval nodes are required for destructive operations.
- Code sandbox is not enabled until isolation is implemented.

## Extension Interfaces

- Tool schema registry.
- MCP transport interface.
- MCP discovery cache schema.
- Agent definition schema.
- Agent run and step schema.
- Trace event schema.
- Workflow definition reservation.
- Sandbox execution interface reservation.

## Testing Requirements

- Add MCP server config and discover tools.
- Deny tool permission and verify Chat cannot call it.
- Grant permission and verify call log creation.
- Create Agent definition and dry-run plan.
- Verify human approval state transitions.

## Acceptance Criteria

- Tools, MCP, and Agent responsibilities are separated.
- stdio / SSE / HTTP MCP are included in design.
- MCP permission and call logs are explicit.
- Agent run plan, steps, trace, and human approval are explicit.
- Workflow and code sandbox are reserved, not misrepresented as complete.

## Risks

- Tool execution can become a security boundary breach.
- Agent Studio can become an empty shell if built before Chat/Gateway.
- MCP discovery can confuse users if permission is implicit.

## Future Enhancements

- Visual workflow builder.
- Sandboxed code execution.
- Agent templates.
- MCP marketplace.
- Agent evaluation and replay.

