# Model And Provider Center Build Plan

## Final Goal

Create a clear Provider Hub and Model Hub that separates connection configuration, model capability metadata, routing eligibility, health checks, and parameter templates.

## Scope

Includes Provider Hub, Model Hub, OpenAI-compatible providers, OpenAI, Azure OpenAI, Claude / Anthropic, Gemini, DeepSeek, Qwen, Doubao, Kimi, Zhipu, OpenRouter, Groq, Mistral, xAI, Ollama, LM Studio, vLLM, llama.cpp server, CPA, CCS, sub2api, custom providers, Base URL, API Key, Proxy URL, Custom Headers, connection tests, model list fetch, manual models, model capability matrix, speed tests, health checks, and parameter templates.

Does not include account pool management, subscription conversion, bypass logic, or provider-specific billing automation in v1.

## Submodules

- Provider Hub.
- Model Hub.
- Provider detail page.
- Model detail page.
- Capability matrix.
- Parameter templates.
- Connection tests.
- Health checks.
- Speed tests.

## Key Features

- Provider records store endpoint type, Base URL, proxy, auth method, custom headers, and secret reference.
- Model records store provider relation, model name, display name, context length, streaming/tool/vision/embedding support, pricing estimate, health and latency.
- OpenAI-compatible provider support is the first generic path.
- Local providers such as Ollama, LM Studio, vLLM, and llama.cpp server can be scanned or manually configured.
- CPA, CCS, and sub2api are treated as external gateway-style endpoints, not first-class business logic to copy.
- Capability matrix helps Router and UI filter models.

## Relationship With Other Modules

- Chat selects models and stores model snapshots in messages.
- Router reads provider/model health and capability.
- Gateway uses provider adapter configuration.
- Logs record provider/model request results.
- Import/export imports provider/model configs with redaction.
- Security protects API keys and custom sensitive headers.

## Data Requirements

Main tables: `providers`, `models`, `model_aliases`, `model_routes`, `request_logs`, `usage_records`, `config_snapshots`, `audit_logs`.

Inputs: provider type, Base URL, API Key, proxy, headers, model fetch responses, manual model metadata.  
Outputs: provider config, model records, health state, capability matrix, parameter templates.

## UI Requirements

- Provider page has list and detail split view.
- Provider detail sections: connection, authentication, proxy, headers, models, tests, recent errors.
- SecretInput hides API keys and exposes test/save actions.
- Model list supports filters by provider, capability, health, context length, local/cloud.
- Capability matrix is a dense table with clear status icons.
- No modal required for normal provider editing.

## Security Requirements

- API Key is stored through `security-service`, not directly in Provider row.
- Custom headers support sensitive marking and redaction.
- Connection test logs redact Authorization and API key fields.
- Import must not activate unknown custom headers without review.

## Extension Interfaces

- Provider adapter interface.
- Model list fetch interface.
- Model capability schema.
- Parameter template schema.
- Provider health probe interface.

## Testing Requirements

- Add OpenAI-compatible provider and test connection.
- Add local Ollama/LM Studio provider by scan or manual Base URL.
- Fetch models when API supports it and manually add when not.
- Validate redaction in logs and exports.
- Measure model latency and update health.

## Acceptance Criteria

- Provider / Model are distinct data entities.
- All requested provider families are represented in the plan.
- Base URL, API Key, Proxy URL, Custom Headers, connection test, model fetch, manual model, health check, speed test, and parameter templates are covered.
- UI page structure and security behavior are clear.

## Risks

- Too many provider presets may clutter v1.
- Provider APIs differ in model listing and streaming.
- Gateway-style providers such as sub2api can introduce compliance risk.

## Future Enhancements

- Provider marketplace.
- Cost tracking per model.
- Automatic provider failover by region.
- Provider-specific advanced options with schema-driven forms.

