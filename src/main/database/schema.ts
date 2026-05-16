export const schemaSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_provider_id TEXT,
  default_model_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  proxy_url TEXT,
  auth_type TEXT NOT NULL,
  secret_ref TEXT,
  custom_headers_json TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  last_checked_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type);
CREATE INDEX IF NOT EXISTS idx_providers_enabled ON providers(enabled);

CREATE TABLE IF NOT EXISTS secrets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  preview TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  model_name_snapshot TEXT NOT NULL,
  context_window INTEGER NOT NULL,
  supports_streaming INTEGER NOT NULL DEFAULT 1,
  supports_tools INTEGER NOT NULL DEFAULT 0,
  supports_vision INTEGER NOT NULL DEFAULT 0,
  supports_embeddings INTEGER NOT NULL DEFAULT 0,
  input_price REAL,
  output_price REAL,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  latency_ms INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(provider_id) REFERENCES providers(id)
);

CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_health ON models(health_status);
CREATE INDEX IF NOT EXISTS idx_models_enabled ON models(enabled);

CREATE TABLE IF NOT EXISTS model_aliases (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL UNIQUE,
  model_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(model_id) REFERENCES models(id)
);

CREATE TABLE IF NOT EXISTS model_routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  match_json TEXT,
  fallback_model_ids_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  assistant_id TEXT,
  default_provider_id TEXT,
  default_model_id TEXT,
  default_router_id TEXT,
  group_name TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  summary TEXT,
  last_message_at INTEGER,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_workspace_updated ON conversations(workspace_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(is_pinned, updated_at);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  parent_message_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  provider_id TEXT,
  model_id TEXT,
  model_name_snapshot TEXT,
  request_id TEXT,
  request_log_id TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  finish_reason TEXT,
  error_message TEXT,
  status TEXT NOT NULL,
  content_format TEXT NOT NULL DEFAULT 'markdown',
  context_strategy TEXT NOT NULL DEFAULT 'recent_n',
  context_message_ids_json TEXT,
  summary_id TEXT,
  artifact_ids_json TEXT,
  error_code TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id),
  FOREIGN KEY(provider_id) REFERENCES providers(id),
  FOREIGN KEY(model_id) REFERENCES models(id),
  FOREIGN KEY(parent_message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_status ON messages(conversation_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_provider_model ON messages(provider_id, model_id);
CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_request_log ON messages(request_log_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_created ON messages(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS message_chunks (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  request_log_id TEXT,
  sequence INTEGER NOT NULL,
  chunk_type TEXT NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(message_id) REFERENCES messages(id),
  FOREIGN KEY(conversation_id) REFERENCES conversations(id),
  FOREIGN KEY(request_log_id) REFERENCES request_logs(id)
);

CREATE INDEX IF NOT EXISTS idx_message_chunks_message_sequence ON message_chunks(message_id, sequence);
CREATE INDEX IF NOT EXISTS idx_message_chunks_request ON message_chunks(request_log_id, sequence);

CREATE TABLE IF NOT EXISTS message_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  conversation_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL,
  storage_ref TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(message_id) REFERENCES messages(id),
  FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_conversation ON message_attachments(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_scope ON prompt_templates(scope, enabled);

CREATE TABLE IF NOT EXISTS conversation_exports (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  format TEXT NOT NULL,
  redacted INTEGER NOT NULL,
  status TEXT NOT NULL,
  content TEXT NOT NULL,
  summary_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_exports_conversation ON conversation_exports(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS request_logs (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  message_id TEXT,
  provider_id TEXT,
  model_id TEXT,
  model_name_snapshot TEXT,
  route_id TEXT,
  gateway_request_id TEXT,
  status TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_summary_json TEXT,
  response_summary_json TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  finish_reason TEXT,
  error_code TEXT,
  error_message TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_request_logs_conversation ON request_logs(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_provider_model ON request_logs(provider_id, model_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  provider_id TEXT,
  model_id TEXT,
  request_log_id TEXT,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_estimate REAL NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS gateway_api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  secret_ref TEXT NOT NULL,
  key_preview TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  disabled_at INTEGER,
  rotated_from_id TEXT,
  last_error_code TEXT,
  rate_limit_per_minute INTEGER,
  rate_window_started_at INTEGER,
  rate_window_count INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER,
  quota_used INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,
  revoked_at INTEGER,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS gateway_logs (
  id TEXT PRIMARY KEY,
  request_log_id TEXT,
  gateway_key_id TEXT,
  key_preview TEXT,
  scope TEXT,
  error_code TEXT,
  latency_ms INTEGER,
  remote_address TEXT,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  redacted_headers_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  knowledge_base_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  parse_status TEXT NOT NULL,
  index_status TEXT NOT NULL DEFAULT 'queued',
  embedding_status TEXT NOT NULL DEFAULT 'queued',
  parser_type TEXT NOT NULL DEFAULT 'unsupported',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT,
  storage_ref TEXT,
  metadata_json TEXT,
  error_message TEXT,
  parse_started_at INTEGER,
  parse_completed_at INTEGER,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY(knowledge_base_id) REFERENCES knowledge_bases(id)
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  knowledge_base_id TEXT,
  content TEXT NOT NULL,
  citation TEXT NOT NULL,
  position INTEGER NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT,
  source_start INTEGER,
  source_end INTEGER,
  page_number INTEGER,
  section_title TEXT,
  status TEXT NOT NULL DEFAULT 'indexed',
  embedding_id TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(file_id) REFERENCES files(id),
  FOREIGN KEY(knowledge_base_id) REFERENCES knowledge_bases(id)
);

CREATE INDEX IF NOT EXISTS idx_files_workspace_status ON files(workspace_id, parse_status, index_status);
CREATE INDEX IF NOT EXISTS idx_files_deleted ON files(deleted_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_file_position ON knowledge_chunks(file_id, position);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_status ON knowledge_chunks(status, file_id);

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id TEXT PRIMARY KEY,
  chunk_id TEXT NOT NULL,
  provider_id TEXT,
  model_id TEXT,
  model_name_snapshot TEXT NOT NULL,
  strategy TEXT NOT NULL,
  dimension INTEGER NOT NULL,
  vector_json TEXT NOT NULL,
  vector_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(chunk_id) REFERENCES knowledge_chunks(id),
  FOREIGN KEY(provider_id) REFERENCES providers(id),
  FOREIGN KEY(model_id) REFERENCES models(id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_chunk ON knowledge_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_status ON knowledge_embeddings(status, strategy);

CREATE TABLE IF NOT EXISTS knowledge_retrieval_traces (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  strategy TEXT NOT NULL,
  top_k INTEGER NOT NULL,
  selected_chunk_ids_json TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  fallback_reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS message_citations (
  id TEXT PRIMARY KEY,
  retrieval_id TEXT,
  message_id TEXT,
  request_log_id TEXT,
  file_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  citation TEXT NOT NULL,
  snippet TEXT NOT NULL,
  score REAL NOT NULL,
  strategy TEXT NOT NULL,
  fallback_reason TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(retrieval_id) REFERENCES knowledge_retrieval_traces(id),
  FOREIGN KEY(message_id) REFERENCES messages(id),
  FOREIGN KEY(request_log_id) REFERENCES request_logs(id),
  FOREIGN KEY(file_id) REFERENCES files(id),
  FOREIGN KEY(chunk_id) REFERENCES knowledge_chunks(id)
);

CREATE INDEX IF NOT EXISTS idx_message_citations_message ON message_citations(message_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_citations_retrieval ON message_citations(retrieval_id);

CREATE TABLE IF NOT EXISTS knowledge_deletion_tombstones (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  chunk_count INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'fixture',
  permission_key TEXT NOT NULL DEFAULT 'tool:read',
  risk_level TEXT NOT NULL DEFAULT 'read',
  requires_approval INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  input_schema_json TEXT NOT NULL,
  output_schema_json TEXT NOT NULL,
  permission_state TEXT NOT NULL,
  audit_mode TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  transport TEXT NOT NULL,
  command_or_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  permission_state TEXT NOT NULL,
  last_status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  default_model_id TEXT,
  approval_policy TEXT NOT NULL,
  stage TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS execution_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  agent_id TEXT,
  tool_id TEXT,
  mcp_server_id TEXT,
  workflow_id TEXT,
  input_json TEXT,
  output_json TEXT,
  error_message TEXT,
  approval_status TEXT,
  sandbox_mode TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS execution_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  parent_step_id TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  tool_id TEXT,
  mcp_server_id TEXT,
  input_json TEXT,
  output_json TEXT,
  error_message TEXT,
  position INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(run_id) REFERENCES execution_runs(id)
);

CREATE TABLE IF NOT EXISTS execution_trace_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_id TEXT,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(run_id) REFERENCES execution_runs(id),
  FOREIGN KEY(step_id) REFERENCES execution_steps(id)
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_id TEXT,
  status TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  reason TEXT NOT NULL,
  decision_reason TEXT,
  decided_at INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  FOREIGN KEY(run_id) REFERENCES execution_runs(id),
  FOREIGN KEY(step_id) REFERENCES execution_steps(id)
);

CREATE TABLE IF NOT EXISTS config_snapshots (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  redacted INTEGER NOT NULL,
  rollback_snapshot_id TEXT,
  source TEXT,
  applied_entity_ids_json TEXT,
  manifest_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ui_preferences (
  id TEXT PRIMARY KEY,
  theme TEXT NOT NULL,
  density TEXT NOT NULL,
  font_mode TEXT NOT NULL,
  language TEXT NOT NULL,
  reduced_motion INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;
