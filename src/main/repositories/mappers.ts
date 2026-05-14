import type {
  AgentDefinition,
  AuditLog,
  Conversation,
  GatewayApiKey,
  GatewayLog,
  ImportExportResult,
  KnowledgeFile,
  McpServer,
  Message,
  Model,
  Provider,
  RequestLog,
  UiPreferences,
  UsageRecord,
  Workspace,
} from '../../shared/types.js';

type Row = Record<string, unknown>;

const bool = (value: unknown): boolean => Number(value) === 1;
const nullableNumber = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));
const nullableString = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

export function mapWorkspace(row: Row): Workspace {
  return {
    id: String(row.id),
    name: String(row.name),
    defaultProviderId: nullableString(row.default_provider_id),
    defaultModelId: nullableString(row.default_model_id),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapProvider(row: Row): Provider {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type) as Provider['type'],
    baseUrl: String(row.base_url),
    proxyUrl: nullableString(row.proxy_url),
    authType: String(row.auth_type) as Provider['authType'],
    secretRef: nullableString(row.secret_ref),
    customHeadersJson: nullableString(row.custom_headers_json),
    enabled: bool(row.enabled),
    healthStatus: String(row.health_status) as Provider['healthStatus'],
    lastCheckedAt: nullableNumber(row.last_checked_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapModel(row: Row): Model {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    name: String(row.name),
    displayName: String(row.display_name),
    modelNameSnapshot: String(row.model_name_snapshot),
    contextWindow: Number(row.context_window),
    supportsStreaming: bool(row.supports_streaming),
    supportsTools: bool(row.supports_tools),
    supportsVision: bool(row.supports_vision),
    supportsEmbeddings: bool(row.supports_embeddings),
    inputPrice: nullableNumber(row.input_price),
    outputPrice: nullableNumber(row.output_price),
    healthStatus: String(row.health_status) as Model['healthStatus'],
    latencyMs: nullableNumber(row.latency_ms),
    enabled: bool(row.enabled),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapConversation(row: Row): Conversation {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    title: String(row.title),
    assistantId: nullableString(row.assistant_id),
    defaultProviderId: nullableString(row.default_provider_id),
    defaultModelId: nullableString(row.default_model_id),
    defaultRouterId: nullableString(row.default_router_id),
    groupName: nullableString(row.group_name),
    isPinned: bool(row.is_pinned),
    isFavorite: bool(row.is_favorite),
    status: String(row.status) as Conversation['status'],
    summary: nullableString(row.summary),
    lastMessageAt: nullableNumber(row.last_message_at),
    messageCount: Number(row.message_count),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapMessage(row: Row): Message {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    workspaceId: String(row.workspace_id),
    parentMessageId: nullableString(row.parent_message_id),
    role: String(row.role) as Message['role'],
    content: String(row.content),
    providerId: nullableString(row.provider_id),
    modelId: nullableString(row.model_id),
    modelNameSnapshot: nullableString(row.model_name_snapshot),
    requestId: nullableString(row.request_id),
    requestLogId: nullableString(row.request_log_id),
    inputTokens: nullableNumber(row.input_tokens),
    outputTokens: nullableNumber(row.output_tokens),
    latencyMs: nullableNumber(row.latency_ms),
    finishReason: nullableString(row.finish_reason),
    errorMessage: nullableString(row.error_message),
    status: String(row.status) as Message['status'],
    contentFormat: String(row.content_format) as Message['contentFormat'],
    contextStrategy: String(row.context_strategy) as Message['contextStrategy'],
    contextMessageIdsJson: nullableString(row.context_message_ids_json),
    summaryId: nullableString(row.summary_id),
    artifactIdsJson: nullableString(row.artifact_ids_json),
    errorCode: nullableString(row.error_code),
    metadataJson: nullableString(row.metadata_json),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapRequestLog(row: Row): RequestLog {
  return {
    id: String(row.id),
    conversationId: nullableString(row.conversation_id),
    messageId: nullableString(row.message_id),
    providerId: nullableString(row.provider_id),
    modelId: nullableString(row.model_id),
    modelNameSnapshot: nullableString(row.model_name_snapshot),
    routeId: nullableString(row.route_id),
    gatewayRequestId: nullableString(row.gateway_request_id),
    status: String(row.status) as RequestLog['status'],
    endpoint: String(row.endpoint),
    requestSummaryJson: nullableString(row.request_summary_json),
    responseSummaryJson: nullableString(row.response_summary_json),
    inputTokens: nullableNumber(row.input_tokens),
    outputTokens: nullableNumber(row.output_tokens),
    latencyMs: nullableNumber(row.latency_ms),
    finishReason: nullableString(row.finish_reason),
    errorCode: nullableString(row.error_code),
    errorMessage: nullableString(row.error_message),
    startedAt: Number(row.started_at),
    completedAt: nullableNumber(row.completed_at),
    createdAt: Number(row.created_at),
  };
}

export function mapGatewayLog(row: Row): GatewayLog {
  return {
    id: String(row.id),
    requestLogId: nullableString(row.request_log_id),
    method: String(row.method),
    path: String(row.path),
    statusCode: Number(row.status_code),
    redactedHeadersJson: nullableString(row.redacted_headers_json),
    createdAt: Number(row.created_at),
  };
}

export function mapUsageRecord(row: Row): UsageRecord {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    providerId: nullableString(row.provider_id),
    modelId: nullableString(row.model_id),
    requestLogId: nullableString(row.request_log_id),
    inputTokens: Number(row.input_tokens),
    outputTokens: Number(row.output_tokens),
    costEstimate: Number(row.cost_estimate),
    createdAt: Number(row.created_at),
  };
}

export function mapGatewayKey(row: Row): GatewayApiKey {
  return {
    id: String(row.id),
    name: String(row.name),
    keyPreview: String(row.key_preview),
    scopes: JSON.parse(String(row.scopes_json)) as string[],
    quotaLimit: nullableNumber(row.quota_limit),
    quotaUsed: Number(row.quota_used),
    expiresAt: nullableNumber(row.expires_at),
    revokedAt: nullableNumber(row.revoked_at),
    lastUsedAt: nullableNumber(row.last_used_at),
    createdAt: Number(row.created_at),
  };
}

export function mapKnowledgeFile(row: Row): KnowledgeFile {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    size: Number(row.size),
    parseStatus: String(row.parse_status) as KnowledgeFile['parseStatus'],
    chunkCount: Number(row.chunk_count),
    errorMessage: nullableString(row.error_message),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapMcpServer(row: Row): McpServer {
  return {
    id: String(row.id),
    name: String(row.name),
    transport: String(row.transport) as McpServer['transport'],
    commandOrUrl: String(row.command_or_url),
    enabled: bool(row.enabled),
    permissionState: String(row.permission_state) as McpServer['permissionState'],
    lastStatus: String(row.last_status) as McpServer['lastStatus'],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapAgent(row: Row): AgentDefinition {
  return {
    id: String(row.id),
    name: String(row.name),
    goal: String(row.goal),
    defaultModelId: nullableString(row.default_model_id),
    approvalPolicy: String(row.approval_policy) as AgentDefinition['approvalPolicy'],
    stage: String(row.stage) as AgentDefinition['stage'],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapImportExportResult(row: Row): ImportExportResult {
  const manifestJson = nullableString(row.manifest_json);
  const lowerSummary = String(row.summary).toLowerCase();
  return {
    id: String(row.id),
    action: String(row.action) as ImportExportResult['action'],
    status: String(row.status) as ImportExportResult['status'],
    summary: String(row.summary),
    redacted: bool(row.redacted),
    manifestJson,
    errorMessage: String(row.status) === 'failed' ? String(row.summary) : null,
    conflictCount: manifestJson && /"conflictCount"\s*:/.test(manifestJson)
      ? Number.parseInt(manifestJson.match(/"conflictCount"\s*:\s*(\d+)/)?.[1] ?? '0', 10)
      : lowerSummary.includes('conflict')
        ? 1
        : 0,
    requiresConfirmation: manifestJson ? /"requiresConfirmation"\s*:\s*true/.test(manifestJson) : lowerSummary.includes('确认'),
    createdAt: Number(row.created_at),
  };
}

export function mapAuditLog(row: Row): AuditLog {
  return {
    id: String(row.id),
    action: String(row.action),
    actor: String(row.actor),
    targetType: String(row.target_type),
    targetId: nullableString(row.target_id),
    detailsJson: nullableString(row.details_json),
    createdAt: Number(row.created_at),
  };
}

export function mapUiPreferences(row: Row): UiPreferences {
  return {
    theme: String(row.theme) as UiPreferences['theme'],
    density: String(row.density) as UiPreferences['density'],
    fontMode: String(row.font_mode) as UiPreferences['fontMode'],
    language: String(row.language) as UiPreferences['language'],
    reducedMotion: bool(row.reduced_motion),
  };
}
