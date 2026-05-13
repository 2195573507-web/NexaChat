# Local Gateway And Model Router Center Build Plan

## Final Goal

Design a local OpenAI-compatible gateway and model router center that external applications can use while reusing NexaChat's Provider, Model, Router, logging, quota, and security layers.

## Scope

Includes local OpenAI-compatible API, `/v1/chat/completions`, `/v1/responses` reservation, `/v1/models`, `/v1/embeddings`, local API Key generation, key permissions, quotas, expiration, virtual models, aliases, model routing, task/price/speed/context/health routing, fallback, external integration generator, Codex, Claude Code, Cursor / Continue / VSCode, Cherry Studio / Chatbox, curl / Python / Node examples, and gateway logs.

Does not include public internet exposure, multi-tenant hosted gateway, account pool, or forced routing in v1.

## Submodules

- Gateway status.
- API key manager.
- Virtual models.
- Model aliases.
- Route rules.
- External integration generator.
- Gateway logs.
- Local endpoint documentation.

## Key Features

- Local API exposes OpenAI-compatible endpoints.
- `/v1/chat/completions` is the first concrete target.
- `/v1/responses` is reserved for future compatibility.
- `/v1/models` returns enabled virtual and real model entries.
- `/v1/embeddings` routes to embedding-capable models.
- Local API keys have permissions, quotas, expiration, and audit logs.
- Virtual Models and aliases hide provider-specific model names from external tools.
- Router selects models by task, price, speed, context length, health, and fallback rules.
- Integration generator produces configs for Codex, Claude Code, Cursor, Continue, VSCode AI plugins, Cherry Studio, Chatbox, curl, Python, and Node.js.

## Relationship With Other Modules

- Gateway reuses Router for model selection.
- Router uses Provider and Model health.
- API key service protects external access.
- Logs records local gateway requests.
- Usage service tracks tokens and quotas.
- Security redacts keys and request payloads.
- Data configuration exports gateway configs without secrets by default.

## Data Requirements

Main tables: `gateway_api_keys`, `gateway_logs`, `model_aliases`, `model_routes`, `providers`, `models`, `request_logs`, `usage_records`, `audit_logs`.

Inputs: local key, external request, selected virtual model, route rules.  
Outputs: upstream request, stream response, gateway logs, usage record, error diagnostics.

## UI Requirements

- Local Gateway page tabs: 网关状态, API Key, 虚拟模型, 模型路由, 外部接入, 网关日志.
- Gateway status shows port, running state, endpoints, recent errors.
- API Key manager shows name, scope, quota, expiration, last used, revoke action.
- Route editor uses clear rule rows, not raw JSON first.
- External integration generator provides copyable snippets and app-specific fields.
- Gateway logs table links to request logs and model/provider source.

## Security Requirements

- Local gateway disabled by default until user enables it.
- API keys are generated locally and stored securely.
- Key values are shown once, then masked.
- Keys have permissions and expiration.
- No public network binding without explicit warning.
- Gateway logs redact Authorization headers.

## Extension Interfaces

- OpenAI-compatible request normalizer.
- Responses API reservation adapter.
- Virtual model registry.
- Route rule evaluator.
- Local key scope schema.
- External integration template registry.

## Testing Requirements

- Generate local API key and call `/v1/models`.
- Call `/v1/chat/completions` with a virtual model and verify Router selection.
- Verify quota and expiration rejection.
- Verify fallback after unhealthy model.
- Verify generated curl, Python, Node snippets are syntactically clear.

## Acceptance Criteria

- Required endpoints are covered.
- API Key permissions, quota, expiration, and logs are designed.
- Virtual models, aliases, routing, fallback, and external app integration are clear.
- Gateway reuses Router rather than duplicating route logic.

## Risks

- Local gateway can create security exposure if bound broadly.
- OpenAI-compatible differences can cause external app confusion.
- Responses API may change and should remain reserved until implemented.

## Future Enhancements

- External app profile presets.
- Per-app cost budgets.
- `/v1/responses` full support.
- Local gateway health dashboard.
- mTLS or local-only trust options.

