import type {
  AgentDefinition,
  ApprovalRequest,
  AuditExportResult,
  AuditIntegrityReport,
  AuditLog,
  Conversation,
  ConversationExport,
  DataBackupRecord,
  DataConflictRecord,
  DataMobilityJob,
  ExecutionRun,
  ExecutionStep,
  ExecutionTraceEvent,
  EvalResult,
  EvalSet,
  FeedbackItem,
  GatewayApiKey,
  GatewayLog,
  ImportExportResult,
  KnowledgeChunk,
  KnowledgeCitation,
  KnowledgeEmbedding,
  KnowledgeFile,
  KnowledgeRetrievalTrace,
  McpServer,
  Message,
  MessageAttachment,
  MessageChunk,
  Model,
  PromptTemplate,
  Provider,
  ProviderHealthRecord,
  RequestLog,
  MigrationRun,
  RollbackRecord,
  SecurityAclGrant,
  SecurityRole,
  SecuritySession,
  SecurityUser,
  ToolDefinition,
  UiPreferences,
  UsageRecord,
  Workspace,
} from '../../shared/types.js';
import { normalizeThemeMode } from '../../shared/theme.js';
import { resolveGatewayKeyState } from '../../shared/gatewayRuntime.js';

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

export function mapMessageChunk(row: Row): MessageChunk {
  return {
    id: String(row.id),
    messageId: String(row.message_id),
    conversationId: String(row.conversation_id),
    requestLogId: nullableString(row.request_log_id),
    sequence: Number(row.sequence),
    chunkType: String(row.chunk_type) as MessageChunk['chunkType'],
    content: String(row.content),
    tokenCount: nullableNumber(row.token_count),
    status: String(row.status) as MessageChunk['status'],
    createdAt: Number(row.created_at),
  };
}

export function mapMessageAttachment(row: Row): MessageAttachment {
  return {
    id: String(row.id),
    messageId: nullableString(row.message_id),
    conversationId: String(row.conversation_id),
    name: String(row.name),
    mimeType: String(row.mime_type),
    size: Number(row.size),
    status: String(row.status) as MessageAttachment['status'],
    storageRef: nullableString(row.storage_ref),
    errorMessage: nullableString(row.error_message),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapPromptTemplate(row: Row): PromptTemplate {
  return {
    id: String(row.id),
    scope: String(row.scope) as PromptTemplate['scope'],
    name: String(row.name),
    content: String(row.content),
    enabled: bool(row.enabled),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapConversationExport(row: Row): ConversationExport {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    format: String(row.format) as ConversationExport['format'],
    redacted: bool(row.redacted),
    status: String(row.status) as ConversationExport['status'],
    content: String(row.content),
    summaryJson: nullableString(row.summary_json),
    createdAt: Number(row.created_at),
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
    gatewayKeyId: nullableString(row.gateway_key_id),
    keyPreview: nullableString(row.key_preview),
    scope: nullableString(row.scope) as GatewayLog['scope'],
    errorCode: nullableString(row.error_code) as GatewayLog['errorCode'],
    latencyMs: nullableNumber(row.latency_ms),
    remoteAddress: nullableString(row.remote_address),
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

export function mapProviderHealthRecord(row: Row): ProviderHealthRecord {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    modelId: nullableString(row.model_id),
    status: String(row.status) as ProviderHealthRecord['status'],
    latencyMs: nullableNumber(row.latency_ms),
    source: String(row.source) as ProviderHealthRecord['source'],
    errorCode: nullableString(row.error_code),
    errorMessage: nullableString(row.error_message),
    createdAt: Number(row.created_at),
  };
}

export function mapFeedbackItem(row: Row): FeedbackItem {
  return {
    id: String(row.id),
    label: String(row.label) as FeedbackItem['label'],
    messageId: nullableString(row.message_id),
    requestLogId: nullableString(row.request_log_id),
    notes: nullableString(row.notes),
    metadataJson: nullableString(row.metadata_json),
    createdAt: Number(row.created_at),
  };
}

export function mapEvalSet(row: Row): EvalSet {
  return {
    id: String(row.id),
    name: String(row.name),
    description: nullableString(row.description),
    prompt: String(row.prompt),
    expectedKeywordsJson: String(row.expected_keywords_json),
    status: String(row.status) as EvalSet['status'],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapEvalResult(row: Row): EvalResult {
  return {
    id: String(row.id),
    evalSetId: String(row.eval_set_id),
    providerId: nullableString(row.provider_id),
    modelId: nullableString(row.model_id),
    requestLogId: nullableString(row.request_log_id),
    status: String(row.status) as EvalResult['status'],
    score: nullableNumber(row.score),
    latencyMs: nullableNumber(row.latency_ms),
    outputPreview: nullableString(row.output_preview),
    errorCode: nullableString(row.error_code),
    errorMessage: nullableString(row.error_message),
    createdAt: Number(row.created_at),
  };
}

export function mapGatewayKey(row: Row): GatewayApiKey {
  const quotaLimit = nullableNumber(row.quota_limit);
  const quotaUsed = Number(row.quota_used);
  const disabledAt = nullableNumber(row.disabled_at);
  const revokedAt = nullableNumber(row.revoked_at);
  const expiresAt = nullableNumber(row.expires_at);
  return {
    id: String(row.id),
    name: String(row.name),
    keyPreview: String(row.key_preview),
    scopes: JSON.parse(String(row.scopes_json)) as GatewayApiKey['scopes'],
    state: resolveGatewayKeyState({
      disabled: Boolean(disabledAt),
      revokedAt,
      expiresAt,
      quotaLimit,
      quotaUsed,
    }),
    disabledAt,
    rotatedFromId: nullableString(row.rotated_from_id),
    lastErrorCode: nullableString(row.last_error_code) as GatewayApiKey['lastErrorCode'],
    rateLimitPerMinute: nullableNumber(row.rate_limit_per_minute),
    rateWindowStartedAt: nullableNumber(row.rate_window_started_at),
    rateWindowCount: Number(row.rate_window_count ?? 0),
    quotaLimit,
    quotaUsed,
    expiresAt,
    revokedAt,
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
    indexStatus: String(row.index_status ?? 'queued') as KnowledgeFile['indexStatus'],
    embeddingStatus: String(row.embedding_status ?? 'queued') as KnowledgeFile['embeddingStatus'],
    parserType: String(row.parser_type ?? 'unsupported') as KnowledgeFile['parserType'],
    chunkCount: Number(row.chunk_count),
    tokenCount: Number(row.token_count ?? 0),
    contentHash: nullableString(row.content_hash),
    storageRef: nullableString(row.storage_ref),
    metadataJson: nullableString(row.metadata_json),
    errorMessage: nullableString(row.error_message),
    deletedAt: nullableNumber(row.deleted_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapKnowledgeChunk(row: Row): KnowledgeChunk {
  return {
    id: String(row.id),
    fileId: String(row.file_id),
    knowledgeBaseId: nullableString(row.knowledge_base_id),
    content: String(row.content),
    citation: String(row.citation),
    position: Number(row.position),
    tokenCount: Number(row.token_count ?? 0),
    contentHash: nullableString(row.content_hash),
    sourceStart: nullableNumber(row.source_start),
    sourceEnd: nullableNumber(row.source_end),
    pageNumber: nullableNumber(row.page_number),
    sectionTitle: nullableString(row.section_title),
    status: String(row.status ?? 'indexed') as KnowledgeChunk['status'],
    embeddingId: nullableString(row.embedding_id),
    metadataJson: nullableString(row.metadata_json),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at ?? row.created_at),
  };
}

export function mapKnowledgeEmbedding(row: Row): KnowledgeEmbedding {
  return {
    id: String(row.id),
    chunkId: String(row.chunk_id),
    providerId: nullableString(row.provider_id),
    modelId: nullableString(row.model_id),
    modelNameSnapshot: String(row.model_name_snapshot),
    strategy: String(row.strategy) as KnowledgeEmbedding['strategy'],
    dimension: Number(row.dimension),
    vectorJson: String(row.vector_json),
    vectorHash: String(row.vector_hash),
    status: String(row.status) as KnowledgeEmbedding['status'],
    createdAt: Number(row.created_at),
  };
}

export function mapKnowledgeRetrievalTrace(row: Row): KnowledgeRetrievalTrace {
  return {
    id: String(row.id),
    query: String(row.query),
    strategy: String(row.strategy) as KnowledgeRetrievalTrace['strategy'],
    topK: Number(row.top_k),
    selectedChunkIdsJson: String(row.selected_chunk_ids_json),
    resultCount: Number(row.result_count),
    fallbackReason: nullableString(row.fallback_reason),
    createdAt: Number(row.created_at),
  };
}

export function mapKnowledgeCitation(row: Row): KnowledgeCitation {
  return {
    id: String(row.id),
    retrievalId: nullableString(row.retrieval_id),
    messageId: nullableString(row.message_id),
    requestLogId: nullableString(row.request_log_id),
    fileId: String(row.file_id),
    chunkId: String(row.chunk_id),
    fileName: String(row.file_name),
    citation: String(row.citation),
    snippet: String(row.snippet),
    score: Number(row.score),
    strategy: String(row.strategy) as KnowledgeCitation['strategy'],
    fallbackReason: nullableString(row.fallback_reason),
    createdAt: Number(row.created_at),
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

export function mapToolDefinition(row: Row): ToolDefinition {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    kind: String(row.kind) as ToolDefinition['kind'],
    permissionKey: String(row.permission_key),
    riskLevel: String(row.risk_level) as ToolDefinition['riskLevel'],
    requiresApproval: bool(row.requires_approval),
    enabled: bool(row.enabled),
    inputSchemaJson: String(row.input_schema_json),
    outputSchemaJson: String(row.output_schema_json),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapExecutionRun(row: Row): ExecutionRun {
  return {
    id: String(row.id),
    kind: String(row.kind) as ExecutionRun['kind'],
    status: String(row.status) as ExecutionRun['status'],
    mode: String(row.mode) as ExecutionRun['mode'],
    title: String(row.title),
    agentId: nullableString(row.agent_id),
    toolId: nullableString(row.tool_id),
    mcpServerId: nullableString(row.mcp_server_id),
    workflowId: nullableString(row.workflow_id),
    inputJson: nullableString(row.input_json),
    outputJson: nullableString(row.output_json),
    errorMessage: nullableString(row.error_message),
    approvalStatus: nullableString(row.approval_status) as ExecutionRun['approvalStatus'],
    sandboxMode: String(row.sandbox_mode) as ExecutionRun['sandboxMode'],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    completedAt: nullableNumber(row.completed_at),
  };
}

export function mapExecutionStep(row: Row): ExecutionStep {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    parentStepId: nullableString(row.parent_step_id),
    kind: String(row.kind) as ExecutionStep['kind'],
    title: String(row.title),
    status: String(row.status) as ExecutionStep['status'],
    toolId: nullableString(row.tool_id),
    mcpServerId: nullableString(row.mcp_server_id),
    inputJson: nullableString(row.input_json),
    outputJson: nullableString(row.output_json),
    errorMessage: nullableString(row.error_message),
    position: Number(row.position),
    startedAt: nullableNumber(row.started_at),
    completedAt: nullableNumber(row.completed_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapExecutionTraceEvent(row: Row): ExecutionTraceEvent {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    stepId: nullableString(row.step_id),
    eventType: String(row.event_type) as ExecutionTraceEvent['eventType'],
    message: String(row.message),
    metadataJson: nullableString(row.metadata_json),
    createdAt: Number(row.created_at),
  };
}

export function mapApprovalRequest(row: Row): ApprovalRequest {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    stepId: nullableString(row.step_id),
    status: String(row.status) as ApprovalRequest['status'],
    requestedAction: String(row.requested_action),
    riskLevel: String(row.risk_level) as ApprovalRequest['riskLevel'],
    reason: String(row.reason),
    decisionReason: nullableString(row.decision_reason),
    decidedAt: nullableNumber(row.decided_at),
    createdAt: Number(row.created_at),
    expiresAt: nullableNumber(row.expires_at),
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
    rollbackSnapshotId: nullableString(row.rollback_snapshot_id),
    source: nullableString(row.source),
    appliedEntityIdsJson: nullableString(row.applied_entity_ids_json),
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

export function mapDataMobilityJob(row: Row): DataMobilityJob {
  return {
    id: String(row.id),
    operationKind: String(row.operation_kind) as DataMobilityJob['operationKind'],
    status: String(row.status) as DataMobilityJob['status'],
    source: nullableString(row.source),
    manifestVersion: String(row.manifest_version),
    profile: nullableString(row.profile) as DataMobilityJob['profile'],
    summary: String(row.summary),
    manifestHash: nullableString(row.manifest_hash),
    manifestJson: nullableString(row.manifest_json),
    conflictCount: Number(row.conflict_count),
    requiresConfirmation: bool(row.requires_confirmation),
    encrypted: bool(row.encrypted),
    redacted: bool(row.redacted),
    rollbackRecordId: nullableString(row.rollback_record_id),
    relatedSnapshotId: nullableString(row.related_snapshot_id),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapDataConflictRecord(row: Row): DataConflictRecord {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    type: String(row.type) as DataConflictRecord['type'],
    entityKind: String(row.entity_kind) as DataConflictRecord['entityKind'],
    localId: nullableString(row.local_id),
    importName: String(row.import_name),
    strategy: String(row.strategy) as DataConflictRecord['strategy'],
    resolved: bool(row.resolved),
    createdAt: Number(row.created_at),
  };
}

export function mapDataBackupRecord(row: Row): DataBackupRecord {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    profile: String(row.profile) as DataBackupRecord['profile'],
    encrypted: bool(row.encrypted),
    redacted: bool(row.redacted),
    manifestHash: String(row.manifest_hash),
    packageJson: String(row.package_json),
    createdAt: Number(row.created_at),
  };
}

export function mapMigrationRun(row: Row): MigrationRun {
  return {
    id: String(row.id),
    version: String(row.version) as MigrationRun['version'],
    status: String(row.status) as MigrationRun['status'],
    summary: String(row.summary),
    createdAt: Number(row.created_at),
    completedAt: nullableNumber(row.completed_at),
  };
}

export function mapRollbackRecord(row: Row): RollbackRecord {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    rollbackSnapshotId: nullableString(row.rollback_snapshot_id),
    state: String(row.state) as RollbackRecord['state'],
    affectedEntityIdsJson: String(row.affected_entity_ids_json),
    appliedAt: nullableNumber(row.applied_at),
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
    permissionKey: nullableString(row.permission_key) as AuditLog['permissionKey'],
    previousHash: nullableString(row.previous_hash),
    entryHash: nullableString(row.entry_hash),
    integrityState: String(row.integrity_state ?? 'verified') as AuditLog['integrityState'],
    createdAt: Number(row.created_at),
  };
}

export function mapSecurityUser(row: Row): SecurityUser {
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    status: String(row.status) as SecurityUser['status'],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapSecurityRole(row: Row): SecurityRole {
  return {
    id: String(row.id) as SecurityRole['id'],
    name: String(row.name),
    description: String(row.description),
    permissionKeys: JSON.parse(String(row.permission_keys_json)) as SecurityRole['permissionKeys'],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function mapSecuritySession(row: Row): SecuritySession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    roleId: String(row.role_id) as SecuritySession['roleId'],
    state: String(row.state) as SecuritySession['state'],
    createdAt: Number(row.created_at),
    expiresAt: nullableNumber(row.expires_at),
    lastSeenAt: Number(row.last_seen_at),
    revokedAt: nullableNumber(row.revoked_at),
  };
}

export function mapSecurityAclGrant(row: Row): SecurityAclGrant {
  return {
    id: String(row.id),
    subjectType: String(row.subject_type) as SecurityAclGrant['subjectType'],
    subjectId: String(row.subject_id),
    resourceType: String(row.resource_type),
    resourceId: nullableString(row.resource_id),
    permissionKey: String(row.permission_key) as SecurityAclGrant['permissionKey'],
    effect: String(row.effect) as SecurityAclGrant['effect'],
    createdAt: Number(row.created_at),
    expiresAt: nullableNumber(row.expires_at),
  };
}

export function mapAuditIntegrityReport(row: Row): AuditIntegrityReport {
  return {
    status: String(row.status) as AuditIntegrityReport['status'],
    checkedAt: Number(row.checked_at),
    checkedCount: Number(row.checked_count),
    firstBrokenAuditId: nullableString(row.first_broken_audit_id),
    lastHash: nullableString(row.last_hash),
  };
}

export function mapAuditExportResult(row: Row): AuditExportResult {
  return {
    id: String(row.id),
    redacted: bool(row.redacted),
    content: String(row.content),
    integrity: mapAuditIntegrityReport(row.integrity as Row),
    createdAt: Number(row.created_at),
  };
}

export function mapUiPreferences(row: Row): UiPreferences {
  return {
    theme: normalizeThemeMode(nullableString(row.theme)),
    density: String(row.density) as UiPreferences['density'],
    fontMode: String(row.font_mode) as UiPreferences['fontMode'],
    language: String(row.language) as UiPreferences['language'],
    reducedMotion: bool(row.reduced_motion),
  };
}
