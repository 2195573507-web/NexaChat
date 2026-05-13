# Logs, Evaluation, Security And System Center Build Plan

## Final Goal

Design a system center for request logs, usage, token and cost estimates, error diagnosis, model evaluation, health monitoring, API key protection, redaction, audit, diagnostic exports, UI settings, font/theme/language settings, system settings, and desktop shortcut requirements.

## Scope

Includes request logs, usage statistics, token statistics, cost estimates, error diagnosis for 401 / 403 / 404 / 429 / 500 / timeout / model_not_found / stream interrupted, model evaluation, model comparison tests, health monitoring, API key encryption, Electron safeStorage / Keychain approach, sensitive redaction, audit logs, diagnostic package export, UI settings, font settings, theme settings, language settings, system settings, and desktop shortcut verification requirements.

Does not include enterprise SOC/audit export, hosted billing, or real desktop shortcut creation before a runnable app exists.

## Submodules

- Request logs.
- Usage statistics.
- Error diagnosis.
- Model evaluation.
- Health monitoring.
- Key security.
- Audit logs.
- Diagnostic export.
- UI settings.
- System settings.
- Desktop shortcut requirement.

## Key Features

- Request logs link Provider, Model, Router, Gateway, Conversation, Message, token usage, latency, status, and errors.
- Error diagnosis maps common API and network errors to understandable causes and next actions.
- Usage statistics estimate tokens and costs by workspace, provider, model, conversation, and day.
- Evaluation sets and results support future model comparison.
- API keys are encrypted or stored through system secure storage.
- Diagnostic package export redacts secrets and can include logs, settings summary, environment, and schema versions.
- UI settings include theme, density, font, KaiTi / 楷体 option, language, reduced motion.
- Desktop shortcut must point to the latest runnable entry after future app updates.

## Relationship With Other Modules

- Gateway emits request and gateway logs.
- Chat links assistant messages to request logs.
- Provider/Model health updates use log outcomes.
- Usage service consumes request logs.
- Security service redacts secrets and stores keys.
- Audit service records imports, exports, key changes, MCP permissions, cleanup, and dangerous actions.
- UI preferences affect all renderer pages.

## Data Requirements

Main tables: `request_logs`, `usage_records`, `eval_sets`, `eval_results`, `gateway_logs`, `audit_logs`, `app_settings`, `ui_preferences`, `providers`, `models`, `messages`, `gateway_api_keys`.

Inputs: gateway events, errors, usage metadata, eval prompts, UI settings, system settings.  
Outputs: log tables, usage metrics, eval results, health states, diagnostic packages, audit entries.

## UI Requirements

- Settings & Security tabs: 请求日志, 用量统计, 错误诊断, 模型评测, 密钥安全, 审计, 界面设置, 系统设置.
- Error diagnosis panels show human explanation, technical details collapsed, repair suggestions, copy error, and open logs.
- Usage pages include filters and clear estimates, not fake billing precision.
- Key security page shows provider key status without exposing values.
- UI settings include theme, font, KaiTi / 楷体, density, language, reduced motion.
- System settings mention desktop shortcut verification but do not fake completion without a runnable app.

## Security Requirements

- API keys stored through Electron safeStorage or comparable system Keychain layer.
- Logs redact Authorization, API keys, tokens, secret custom headers, and local sensitive paths in export mode.
- Audit logs record security-relevant actions.
- Diagnostic export has preview and redaction summary.
- Renderer accesses security actions only through safe IPC.

## Extension Interfaces

- Error diagnosis dictionary.
- Log redaction pipeline.
- Usage aggregation interface.
- Evaluation runner interface.
- Health monitor interface.
- Diagnostic package manifest.
- UI preferences schema.
- Desktop shortcut verification interface.

## Testing Requirements

- Generate synthetic errors for 401, 403, 404, 429, 500, timeout, model_not_found, stream interrupted.
- Verify diagnosis messages and repair actions.
- Verify request log links to conversation/message/provider/model.
- Verify redaction in diagnostic export.
- Verify theme, font, KaiTi, density, and language preference persistence.
- Verify shortcut only after app exists.

## Acceptance Criteria

- Request logs, usage, token/cost estimates, errors, evaluation, health, key security, redaction, audit, diagnostics, UI/system settings are designed.
- Common error categories have understandable explanations and repair actions.
- Electron safeStorage / system Keychain direction is explicit.
- Desktop shortcut requirement is documented honestly without fake result.

## Risks

- Cost estimates can be inaccurate if model pricing drifts.
- Logs can leak sensitive data without strict redaction.
- Evaluation can become a separate product if introduced too early.

## Future Enhancements

- Automated eval schedules.
- Provider SLA dashboard.
- Encrypted diagnostics sharing.
- Per-workspace retention policy.
- Shortcut repair tool after app packaging.

