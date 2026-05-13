# Config, Data And Import Export Center Build Plan

## Final Goal

Design a data configuration center that helps users import, export, validate, redact, back up, restore, snapshot, roll back, clean, and migrate NexaChat data.

## Scope

Includes intelligent config import wizard, CCS import, sub2api JSON import, OpenAI-compatible config import, Ollama scan, LM Studio scan, Provider/Model/Assistant/Prompt/chat import/export, redaction, validation, conflict detection, backup/restore, snapshot rollback, cleanup, and migration reservation.

Does not include importing secrets without user review or silently overwriting existing configurations.

## Submodules

- Intelligent import wizard.
- Provider import/export.
- Model import/export.
- Assistant import/export.
- Prompt import/export.
- Chat history import/export.
- Backup/restore.
- Config snapshots.
- Data cleanup.
- Migration reservation.

## Key Features

- Import wizard detects file/config type and routes to specific review steps.
- CCS and cc-switch-style configs map to Provider presets and model routes.
- sub2api JSON maps to OpenAI-compatible gateway Provider entries with caution labels.
- Ollama and LM Studio scanning detects local endpoints and available models.
- All imported secrets are reviewed, masked, and stored through security service.
- Conflict detection shows existing Provider/Model/Assistant/Prompt differences before write.
- Snapshot rollback captures settings and configuration, not necessarily large file stores by default.

## Relationship With Other Modules

- Provider/Model center consumes imported provider and model data.
- Chat module imports/exports conversations.
- Assistant and Prompt Lab consume assistant/prompt imports.
- Gateway consumes imported route and alias configs.
- Security handles redaction and secret storage.
- Audit logs record imports, exports, cleanup, and rollback.

## Data Requirements

Main tables: `providers`, `models`, `model_aliases`, `model_routes`, `assistants`, `prompts`, `conversations`, `messages`, `message_attachments`, `config_snapshots`, `audit_logs`, `app_settings`, `ui_preferences`.

Inputs: JSON/YAML/env snippets, local scans, backup archives, exported history.  
Outputs: validated import plan, created/updated records, snapshots, backups, cleanup logs.

## UI Requirements

- Data Config page tabs: 智能导入, 导入导出, 备份恢复, 配置快照, 数据清理.
- ImportWizard uses steps: detect, preview, map fields, conflict review, secret handling, confirm, result.
- Conflict UI shows keep existing, overwrite, duplicate, skip.
- Export UI separates redacted export and encrypted full backup.
- Cleanup UI clearly states impacted rows and files.

## Security Requirements

- Redacted export is default.
- Full backup with secrets requires explicit encryption/password step.
- Imported custom headers are marked sensitive when likely secret.
- Cleanup and rollback are audited.
- Chat export can redact file paths and sensitive message content when requested.

## Extension Interfaces

- Import detector registry.
- Import mapper interface.
- Export manifest schema.
- Snapshot schema.
- Conflict resolver interface.
- Migration runner reservation.

## Testing Requirements

- Import CCS-style provider config.
- Import sub2api JSON into reviewed provider entries.
- Scan Ollama and LM Studio.
- Export Provider/Model without secrets.
- Export and re-import chat history.
- Create snapshot and rollback settings.
- Run cleanup preview before deletion.

## Acceptance Criteria

- All requested import/export categories are represented.
- Redaction, validation, conflict detection, backup, restore, snapshot, cleanup, and migration reservation are explicit.
- UI wizard steps are clear and safe.
- No import silently activates risky secrets or overwrites data.

## Risks

- Import formats may vary widely.
- Users may expect unsupported configs to work automatically.
- Full backups with secrets need robust encryption before implementation.

## Future Enhancements

- One-click migration from known apps.
- Scheduled backups.
- Cloud drive backup target.
- Import dry-run report.
- Schema migration UI.

