import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { safeStorage } from 'electron';
import type { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../database/connection.js';
import { createRepositoryContext, type RepositoryContext } from '../repositories/repositoryContext.js';
import {
  mapApprovalRequest,
  mapAgent,
  mapAuditLog,
  mapConversation,
  mapConversationExport,
  mapDataBackupRecord,
  mapDataConflictRecord,
  mapDataMobilityJob,
  mapEvalResult,
  mapEvalSet,
  mapExecutionRun,
  mapExecutionStep,
  mapExecutionTraceEvent,
  mapFeedbackItem,
  mapGatewayKey,
  mapGatewayLog,
  mapImportExportResult,
  mapKnowledgeChunk,
  mapKnowledgeCitation,
  mapKnowledgeFile,
  mapKnowledgeRetrievalTrace,
  mapMcpServer,
  mapMessage,
  mapMessageAttachment,
  mapMessageChunk,
  mapModel,
  mapPromptTemplate,
  mapProvider,
  mapProviderHealthRecord,
  mapRequestLog,
  mapMigrationRun,
  mapRollbackRecord,
  mapSecurityAclGrant,
  mapSecurityRole,
  mapSecuritySession,
  mapSecurityUser,
  mapToolDefinition,
  mapUiPreferences,
  mapUsageRecord,
  mapWorkspace,
} from '../repositories/mappers.js';
import { redactHeaders, redactSensitive } from '../security/redaction.js';
import { createId, estimateTokens, now, previewSecret } from '../utils/ids.js';
import { diagnoses } from '../../shared/errors.js';
import { translate } from '../../shared/i18n.js';
import {
  PROVIDER_RUNTIME_ERROR_CODES,
  PROVIDER_RUNTIME_POLICY,
  getProviderAdapterName,
} from '../../shared/providerRuntime.js';
import { normalizeThemeMode } from '../../shared/theme.js';
import {
  CONTEXT_STRATEGY_LIMITS,
  MESSAGE_ATTACHMENT_POLICY,
  isAllowedAttachmentMimeType,
  isConversationExportFormat,
} from '../../shared/conversationRuntime.js';
import {
  KNOWLEDGE_RUNTIME_POLICY,
  chunkKnowledgeText,
  lexicalEmbedding,
  normalizeKnowledgeImport,
  scoreKnowledgeChunks,
  stableKnowledgeHash,
  type KnowledgeScoredChunkInput,
} from '../../shared/knowledgeRuntime.js';
import {
  GATEWAY_AVAILABLE_ENDPOINTS,
  GATEWAY_BIND_HOST,
  GATEWAY_DEFAULT_KEY_POLICY,
  GATEWAY_ERROR_CODES,
  GATEWAY_PORT,
  GATEWAY_RATE_WINDOW_MS,
  GATEWAY_SCOPES,
  normalizeGatewayLimit,
  normalizeGatewayRateLimit,
  normalizeGatewayScopes,
  type GatewayErrorCode,
  type GatewayScope,
} from '../../shared/gatewayRuntime.js';
import {
  EXECUTION_TOOL_IDS,
  TOOL_FIXTURES,
  normalizeApprovalDecision,
  normalizeExecutionStartInput,
} from '../../shared/executionRuntime.js';
import {
  SECURITY_ACTION_PERMISSIONS,
  SECURITY_PERMISSION_KEYS,
  SECURITY_ROLES,
  evaluatePermission,
  getSecurityRole,
  type SecurityPermissionKey,
  type SecurityRoleId,
} from '../../shared/securityRuntime.js';
import {
  DATA_CONFIRMATION_PHRASES,
  DATA_MANIFEST_VERSION,
  DATA_MIGRATION_VERSIONS,
  buildRestoreDiffSummary,
  createRedactedBackupPackage,
  detectDataImportSource,
  normalizeDataManifest,
  stableHash,
  type DataBackupProfile,
  type DataBackupPackage,
  type DataConflictInput,
  type NormalizedDataManifest,
} from '../../shared/dataRuntime.js';
import {
  DEFAULT_OBSERVABILITY_PRIVACY_SETTINGS,
  OBSERVABILITY_FEEDBACK_LABELS,
  buildObservabilitySummary,
  buildRedactedObservabilityExport,
  filterObservabilityRequestLogs,
  normalizeObservabilityPrivacySettings,
  normalizeObservabilityQuery,
  type ObservabilityPrivacySettings,
  type ObservabilityQueryInput,
} from '../../shared/observabilityRuntime.js';
import type {
  AgentDefinition,
  AppSnapshot,
  AuditExportResult,
  AuditIntegrityReport,
  ApprovalDecisionInput,
  ApprovalRequest,
  AuditLog,
  CancelMessageInput,
  ChatResponse,
  CompareModelsInput,
  CompareModelsResponse,
  Conversation,
  ConversationExport,
  DashboardSummary,
  DataBackupCreateInput,
  DataBackupRecord,
  DataConflictRecord,
  DataExportOptions,
  DataMobilityJob,
  DataRestorePreflightInput,
  DataRollbackInput,
  EvalResult,
  EvalRunInput,
  EvalSet,
  FeedbackCreateInput,
  FeedbackItem,
  ExecutionRun,
  ExecutionStartInput,
  ExecutionStep,
  ExecutionTraceEvent,
  ExportConversationInput,
  GatewayApiKey,
  GatewayImportPlan,
  GatewayKeyCreated,
  GatewayKeyCreateInput,
  GatewayKeyRotateInput,
  GatewayKeyUpdateInput,
  GatewayLog,
  GatewayStatus,
  ImportPlanApplyOptions,
  ImportExportResult,
  KnowledgeChunk,
  KnowledgeCitation,
  KnowledgeDeleteInput,
  KnowledgeFile,
  KnowledgeImportInput,
  KnowledgeRebuildInput,
  KnowledgeRetrievalInput,
  KnowledgeRetrievalResult,
  KnowledgeRetrievalTrace,
  McpServer,
  Message,
  MessageAttachment,
  MessageAttachmentInput,
  MessageChunk,
  Model,
  ModelInput,
  ObservabilityExportResult,
  ObservabilitySnapshot,
  PromptTemplate,
  Provider,
  ProviderHealthRecord,
  ProviderInput,
  RegenerateMessageInput,
  RequestLog,
  MigrationRun,
  RollbackRecord,
  SecurityAclGrant,
  SecurityRole,
  SecuritySession,
  SecurityState,
  SecurityUser,
  RetryMessageInput,
  RouteDecision,
  SendMessageInput,
  RestoreSnapshotOptions,
  ToolDefinition,
  UiPreferences,
  UsageRecord,
  Workspace,
  ProviderModelOption,
} from '../../shared/types.js';
import {
  ProviderRuntimeError,
  fetchOpenAiCompatibleModels,
  getProviderRequestSummary,
  invokeOpenAiCompatibleChat,
  testOpenAiCompatibleProvider,
  type ChatMessageInput,
} from '../adapters/openAiCompatibleAdapter.js';

const DEFAULT_WORKSPACE_ID = 'ws_default';
const DEFAULT_PREFS_ID = 'ui_default';
const GATEWAY_ENABLED_SETTING_KEY = 'gateway.enabled';
const OBSERVABILITY_PRIVACY_SETTING_KEY = 'observability.privacy';
const DEFAULT_SECURITY_USER_ID = 'user_local_admin';
const DEFAULT_SECURITY_SESSION_ID = 'session_local_admin';
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);

export interface GatewayAuthorizationResult {
  ok: boolean;
  key: GatewayApiKey | null;
  scope: GatewayScope;
  errorCode: GatewayErrorCode | null;
}

export interface GatewayLogInput {
  method: string;
  path: string;
  statusCode: number;
  requestLogId?: string | null;
  key?: GatewayApiKey | null;
  scope?: GatewayScope | null;
  errorCode?: GatewayErrorCode | null;
  headers?: Record<string, string>;
  latencyMs?: number | null;
  remoteAddress?: string | null;
}

export type ServiceConstructor<T = ServiceContext> = new (...args: any[]) => T;

export class ServiceContext {
  protected readonly db: DatabaseSync;
  protected readonly repositories: RepositoryContext;
  protected gatewayEnabled = false;
  protected gatewayListenerState: GatewayStatus['listenerState'] = 'stopped';
  protected gatewayRecentError: string | null = null;
  protected gatewayLastStartError: string | null = null;
  protected readonly activeChatControllers = new Map<string, AbortController>();

  constructor() {
    this.db = getDatabase().db;
    this.repositories = createRepositoryContext(this.db);
    this.seed();
    this.gatewayEnabled = this.getSetting(GATEWAY_ENABLED_SETTING_KEY) === 'true';
  }

  getDatabasePath(): string {
    return getDatabase().path;
  }

  getRawDatabaseForTesting(): DatabaseSync {
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      throw new Error('Raw database access is only available in tests.');
    }
    return this.db;
  }

  protected normalizeBaseUrl(value: string): string {
    return normalizeBaseUrl(value);
  }

  protected buildChatRequestSummary(content: string): Record<string, unknown> {
    return buildChatRequestSummary(content);
  }

  protected decodeStoredSecretValue(value: string): string {
    return decodeSecretValue(value);
  }

  protected inferConversationTitle(currentTitle: string, content: string): string {
    return inferTitle(currentTitle, content);
  }

  protected safeStringArray(value: string): string[] {
    return safeStringArray(value);
  }

  protected scoreEvaluationOutput(output: string, expectedKeywords: string[]): number {
    return scoreEvaluationOutput(output, expectedKeywords);
  }

  protected computeAuditHash(input: {
    id: string;
    action: string;
    actor: string;
    targetType: string;
    targetId: string | null;
    detailsJson: string | null;
    permissionKey: SecurityPermissionKey | null;
    previousHash: string | null;
    createdAt: number;
  }): string {
    return computeAuditHash(input);
  }

  protected seed(): void {
    const timestamp = now();
    this.seedSecurity(timestamp);
    const workspaceCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM workspaces').get() as { count: number }).count);
    if (workspaceCount === 0) {
      this.db
        .prepare('INSERT INTO workspaces (id, name, default_provider_id, default_model_id, created_at, updated_at) VALUES (?, ?, NULL, NULL, ?, ?)')
        .run(DEFAULT_WORKSPACE_ID, t('dashboard.workspace'), timestamp, timestamp);
    }

    const conversationCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM conversations').get() as { count: number }).count);
    if (conversationCount === 0) {
      this.createConversation(t('chat.seed.welcomeConversation'));
    }

    const fileCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM files').get() as { count: number }).count);
    if (fileCount === 0) {
      this.createKnowledgeFile({
        name: 'NexaChat getting-started.md',
        type: 'text/markdown',
        content: t('knowledge.seed.gettingStartedContent'),
      });
    }

    const mcpCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM mcp_servers').get() as { count: number }).count);
    if (mcpCount === 0) {
      this.createMcpServer(t('tools.mcp.seedLocalFile'), 'stdio', 'npx @modelcontextprotocol/server-filesystem');
    }

    const agentCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM agents').get() as { count: number }).count);
    if (agentCount === 0) {
      this.createAgent(t('tools.agent.seedConfigName'), t('tools.agent.seedConfigGoal'));
    }
    this.seedExecutionTools(timestamp);

    const promptCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM prompt_templates').get() as { count: number }).count);
    if (promptCount === 0) {
      this.db
        .prepare(
          `INSERT INTO prompt_templates (id, scope, name, content, enabled, created_at, updated_at)
           VALUES (?, 'global', ?, ?, 1, ?, ?)`,
        )
        .run(
          createId('prompt'),
          t('chat.prompt.defaultName'),
          t('chat.prompt.defaultContent'),
          timestamp,
          timestamp,
        );
    }

    if (!this.db.prepare('SELECT * FROM ui_preferences WHERE id = ?').get(DEFAULT_PREFS_ID)) {
      this.saveUiPreferences({
        theme: 'system',
        density: 'comfortable',
        fontMode: 'system',
        language: 'zh-CN',
        reducedMotion: false,
        advancedMode: false,
      });
    }

    const keyCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM gateway_api_keys').get() as { count: number }).count);
    if (keyCount === 0) {
      this.createGatewayKey('Local app integration');
    }

    const evalSetCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM eval_sets').get() as { count: number }).count);
    if (evalSetCount === 0) {
      this.db
        .prepare(
          `INSERT INTO eval_sets (id, name, description, prompt, expected_keywords_json, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)`,
        )
        .run(
          'eval_round13_basic',
          t('observability.eval.seed.name'),
          t('observability.eval.seed.description'),
          t('observability.eval.seed.prompt'),
          JSON.stringify(['NexaChat', 'local']),
          timestamp,
          timestamp,
        );
    }
  }

  protected seedSecurity(timestamp: number): void {
    for (const role of SECURITY_ROLES) {
      const localizedRole = getSecurityRole(role.id);
      this.db
        .prepare(
          `INSERT INTO security_roles (id, name, description, permission_keys_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, permission_keys_json = excluded.permission_keys_json, updated_at = excluded.updated_at`,
        )
        .run(
          role.id,
          t(localizedRole.nameKey as Parameters<typeof t>[0]),
          t(localizedRole.descriptionKey as Parameters<typeof t>[0]),
          JSON.stringify(role.permissionKeys),
          timestamp,
          timestamp,
        );
    }
    this.backfillAuditHashes();

    const userCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM security_users').get() as { count: number }).count);
    if (userCount === 0) {
      this.db
        .prepare('INSERT INTO security_users (id, display_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(DEFAULT_SECURITY_USER_ID, t('settings.security.localAdmin'), 'active', timestamp, timestamp);
      this.audit('security.bootstrap', 'security_user', DEFAULT_SECURITY_USER_ID, { roleId: 'owner' }, SECURITY_ACTION_PERMISSIONS.securityManage);
    }

    const activeSession = this.db
      .prepare("SELECT * FROM security_sessions WHERE state = 'active' ORDER BY last_seen_at DESC LIMIT 1")
      .get();
    if (!activeSession) {
      this.db
        .prepare(
          `INSERT INTO security_sessions (id, user_id, role_id, state, created_at, expires_at, last_seen_at, revoked_at)
           VALUES (?, ?, ?, 'active', ?, NULL, ?, NULL)`,
        )
        .run(DEFAULT_SECURITY_SESSION_ID, DEFAULT_SECURITY_USER_ID, 'owner', timestamp, timestamp);
      this.audit('security.session.created', 'security_session', DEFAULT_SECURITY_SESSION_ID, { userId: DEFAULT_SECURITY_USER_ID, roleId: 'owner' }, SECURITY_ACTION_PERMISSIONS.securityManage);
    } else {
      this.touchSession(String((activeSession as { id: string }).id));
    }
  }

  protected getActiveSession(): SecuritySession {
    const row = this.db
      .prepare("SELECT * FROM security_sessions WHERE state = 'active' ORDER BY last_seen_at DESC LIMIT 1")
      .get();
    if (row) {
      return mapSecuritySession(row as Record<string, unknown>);
    }
    const timestamp = now();
    this.db
      .prepare(
        `INSERT INTO security_sessions (id, user_id, role_id, state, created_at, expires_at, last_seen_at, revoked_at)
         VALUES (?, ?, ?, 'active', ?, NULL, ?, NULL)`,
      )
      .run(DEFAULT_SECURITY_SESSION_ID, DEFAULT_SECURITY_USER_ID, 'owner', timestamp, timestamp);
    return this.requireSecuritySession(DEFAULT_SECURITY_SESSION_ID);
  }

  protected touchSession(sessionId: string): void {
    this.db.prepare('UPDATE security_sessions SET last_seen_at = ? WHERE id = ?').run(now(), sessionId);
  }

  protected requireSecurityUser(id: string): SecurityUser {
    const row = this.db.prepare('SELECT * FROM security_users WHERE id = ?').get(id);
    if (!row) throw new Error(`Security user not found: ${id}`);
    return mapSecurityUser(row as Record<string, unknown>);
  }

  protected requireSecurityRole(id: SecurityRoleId): SecurityRole {
    const row = this.db.prepare('SELECT * FROM security_roles WHERE id = ?').get(id);
    if (!row) throw new Error(`Security role not found: ${id}`);
    return mapSecurityRole(row as Record<string, unknown>);
  }

  protected requireSecuritySession(id: string): SecuritySession {
    const row = this.db.prepare('SELECT * FROM security_sessions WHERE id = ?').get(id);
    if (!row) throw new Error(`Security session not found: ${id}`);
    return mapSecuritySession(row as Record<string, unknown>);
  }

  protected seedExecutionTools(timestamp: number): void {
    for (const tool of TOOL_FIXTURES) {
      this.db
        .prepare(
          `INSERT INTO tools (id, name, description, kind, permission_key, risk_level, requires_approval, enabled, input_schema_json, output_schema_json, permission_state, audit_mode, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'granted', 'trace', ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, kind = excluded.kind, permission_key = excluded.permission_key, risk_level = excluded.risk_level, requires_approval = excluded.requires_approval, enabled = excluded.enabled, input_schema_json = excluded.input_schema_json, output_schema_json = excluded.output_schema_json, updated_at = excluded.updated_at`,
        )
        .run(
          tool.id,
          tool.name,
          tool.description,
          tool.kind,
          tool.permissionKey,
          tool.riskLevel,
          tool.requiresApproval ? 1 : 0,
          tool.enabled ? 1 : 0,
          tool.inputSchemaJson,
          tool.outputSchemaJson,
          timestamp,
          timestamp,
        );
    }
  }

  protected route(providerId?: string, modelId?: string): RouteDecision {
    const models = this.getModels().filter((model) => model.enabled && model.healthStatus !== 'error');
    if (models.length === 0) {
      throw new Error(t('models.errors.noModel'));
    }

    if (modelId) {
      const explicit = models.find((model) => model.id === modelId);
      if (!explicit) {
        throw new Error(t('chat.route.explicitUnavailable'));
      }
      return {
        providerId: explicit.providerId,
        modelId: explicit.id,
        modelNameSnapshot: explicit.modelNameSnapshot,
        reason: t('chat.route.explicitModel'),
        fallbackUsed: false,
      };
    }

    if (providerId) {
      const providerModel = models.find((model) => model.providerId === providerId);
      if (providerModel) {
        return {
          providerId: providerModel.providerId,
          modelId: providerModel.id,
          modelNameSnapshot: providerModel.modelNameSnapshot,
          reason: t('chat.route.explicitProvider'),
          fallbackUsed: false,
        };
      }
    }

    const workspace = this.getDefaultWorkspace();
    const defaultModel = workspace.defaultModelId ? models.find((model) => model.id === workspace.defaultModelId) : null;
    const selected = defaultModel ?? models[0];
    return {
      providerId: selected.providerId,
      modelId: selected.id,
      modelNameSnapshot: selected.modelNameSnapshot,
      reason: defaultModel ? t('chat.route.workspaceDefault') : t('chat.route.firstHealthy'),
      fallbackUsed: false,
    };
  }

  protected retrieveKnowledge(
    query: string,
    options: {
      topK?: number;
      strategy?: KnowledgeRetrievalInput['strategy'];
      persistCitations?: boolean;
    } = {},
  ): KnowledgeRetrievalResult {
    const strategy = options.strategy ?? 'lexical';
    const topK = Math.min(Math.max(1, Math.floor(options.topK ?? KNOWLEDGE_RUNTIME_POLICY.defaultTopK)), KNOWLEDGE_RUNTIME_POLICY.maxTopK);
    const timestamp = now();
    const candidates = this.db
      .prepare(
        `SELECT
           knowledge_chunks.id,
           knowledge_chunks.file_id,
           knowledge_chunks.content,
           knowledge_chunks.citation,
           knowledge_chunks.position,
           files.name AS file_name,
           knowledge_embeddings.vector_json
         FROM knowledge_chunks
         JOIN files ON files.id = knowledge_chunks.file_id
         LEFT JOIN knowledge_embeddings ON knowledge_embeddings.chunk_id = knowledge_chunks.id AND knowledge_embeddings.status = 'embedded'
         WHERE knowledge_chunks.status = 'indexed'
           AND files.deleted_at IS NULL
           AND files.index_status = 'indexed'
         ORDER BY knowledge_chunks.created_at DESC`,
      )
      .all() as Array<{
        id: string;
        file_id: string;
        content: string;
        citation: string;
        position: number;
        file_name: string;
        vector_json: string | null;
      }>;
    const scoredInput: KnowledgeScoredChunkInput[] = candidates.map((chunk) => ({
      id: chunk.id,
      fileId: chunk.file_id,
      fileName: chunk.file_name,
      content: chunk.content,
      citation: chunk.citation,
      position: Number(chunk.position),
      strategy,
      vector: chunk.vector_json ? JSON.parse(chunk.vector_json) as number[] : lexicalEmbedding(chunk.content),
    }));
    const scored = scoreKnowledgeChunks(query, scoredInput, topK);
    const retrievalId = createId('retrieval');
    const fallbackReason = strategy === 'lexical' ? 'lexical_embedding' : null;
    this.db
      .prepare(
        `INSERT INTO knowledge_retrieval_traces (id, query, strategy, top_k, selected_chunk_ids_json, result_count, fallback_reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(retrievalId, query.trim(), strategy, topK, JSON.stringify(scored.map((chunk) => chunk.id)), scored.length, fallbackReason, timestamp);
    const citations = scored.map((chunk) => this.buildKnowledgeCitation({
      retrievalId,
      chunkId: chunk.id,
      fileId: chunk.fileId,
      fileName: chunk.fileName,
      citation: chunk.citation,
      snippet: chunk.content.slice(0, 220),
      score: chunk.score,
      strategy,
      fallbackReason,
      timestamp,
      persist: options.persistCitations ?? false,
    }));
    return {
      trace: this.requireKnowledgeRetrievalTrace(retrievalId),
      citations,
    };
  }

  protected buildConversationContext(
    conversationId: string,
    strategy: SendMessageInput['contextStrategy'],
    content: string,
    modelContextWindow: number,
    citations: KnowledgeCitation[] = [],
  ): { providerMessages: ChatMessageInput[]; contextMessageIds: string[]; trimReason: string } {
    const normalizedStrategy = strategy ?? 'recent_n';
    const limits = CONTEXT_STRATEGY_LIMITS[normalizedStrategy];
    const prompt = this.getPromptTemplates().find((template) => template.enabled);
    const maxTokens = Math.max(256, Math.floor(modelContextWindow * limits.tokenBudgetRatio));
    let usedTokens = estimateTokens(content) + (prompt ? estimateTokens(prompt.content) : 0);
    const selected: Message[] = [];

    const candidates = this.getMessages(conversationId)
      .filter((message) => message.status === 'completed')
      .filter((message) => message.role === 'user' || message.role === 'assistant' || message.role === 'system' || message.role === 'tool')
      .slice()
      .reverse();

    for (const message of candidates) {
      if (selected.length >= limits.messageLimit) {
        break;
      }
      const messageTokens = estimateTokens(message.content);
      if (usedTokens + messageTokens > maxTokens && selected.length > 0) {
        break;
      }
      selected.push(message);
      usedTokens += messageTokens;
    }

    const ordered = selected.reverse();
    const knowledgeContext = citations.length > 0
      ? [
          t('knowledge.context.providerHeader'),
          ...citations.map((citation, index) => t('knowledge.context.providerCitation', {
            index: index + 1,
            file: citation.fileName,
            citation: citation.citation,
            snippet: citation.snippet,
          })),
        ].join('\n')
      : null;
    const providerMessages: ChatMessageInput[] = [
      ...(prompt ? [{ role: 'system' as const, content: prompt.content }] : []),
      ...(knowledgeContext ? [{ role: 'system' as const, content: knowledgeContext }] : []),
      ...ordered.map((message): ChatMessageInput => ({
        role: message.role === 'error' ? 'assistant' : message.role,
        content: message.content,
      })),
      { role: 'user', content },
    ];
    const availableCount = candidates.length;
    const trimReason = availableCount > ordered.length
      ? t('chat.context.trimmed', { selected: ordered.length, available: availableCount })
      : t('chat.context.untrimmed', { selected: ordered.length });
    return {
      providerMessages,
      contextMessageIds: ordered.map((message) => message.id),
      trimReason,
    };
  }

  protected validateMessageAttachments(inputs: MessageAttachmentInput[]): {
    accepted: Array<MessageAttachmentInput & { id: string }>;
    rejected: Array<MessageAttachmentInput & { reason: string }>;
    summary: { accepted: number; rejected: number; maxBytes: number };
  } {
    const accepted: Array<MessageAttachmentInput & { id: string }> = [];
    const rejected: Array<MessageAttachmentInput & { reason: string }> = [];
    for (const input of inputs) {
      const name = input.name.trim();
      const mimeType = input.mimeType.trim();
      const size = Math.max(0, Math.floor(input.size));
      if (!name || !mimeType) {
        rejected.push({ ...input, reason: t('chat.attachments.errors.metadata') });
        continue;
      }
      if (size > MESSAGE_ATTACHMENT_POLICY.maxBytes) {
        rejected.push({ ...input, reason: t('chat.attachments.errors.size') });
        continue;
      }
      if (!isAllowedAttachmentMimeType(mimeType)) {
        rejected.push({ ...input, reason: t('chat.attachments.errors.type') });
        continue;
      }
      accepted.push({ name, mimeType, size, id: createId('attach') });
    }
    return {
      accepted,
      rejected,
      summary: {
        accepted: accepted.length,
        rejected: rejected.length,
        maxBytes: MESSAGE_ATTACHMENT_POLICY.maxBytes,
      },
    };
  }

  protected insertMessageAttachments(
    messageId: string,
    conversationId: string,
    attachments: Array<MessageAttachmentInput & { id: string }>,
  ): void {
    const timestamp = now();
    for (const attachment of attachments) {
      this.db
        .prepare(
          `INSERT INTO message_attachments (id, message_id, conversation_id, name, mime_type, size, status, storage_ref, error_message, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'accepted', NULL, NULL, ?, ?)`,
        )
        .run(attachment.id, messageId, conversationId, attachment.name, attachment.mimeType, attachment.size, timestamp, timestamp);
    }
  }

  protected insertMessageChunks({
    messageId,
    conversationId,
    requestLogId,
    chunks,
    status,
    chunkType = 'text',
  }: {
    messageId: string;
    conversationId: string;
    requestLogId: string;
    chunks: string[];
    status: MessageChunk['status'];
    chunkType?: MessageChunk['chunkType'];
  }): void {
    const timestamp = now();
    chunks.forEach((chunk, index) => {
      this.db
        .prepare(
          `INSERT INTO message_chunks (id, message_id, conversation_id, request_log_id, sequence, chunk_type, content, token_count, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('chunk'),
          messageId,
          conversationId,
          requestLogId,
          index,
          index === chunks.length - 1 && chunkType === 'text' ? 'final' : chunkType,
          chunk,
          estimateTokens(chunk),
          status,
          timestamp + index,
        );
    });
  }

  protected indexKnowledgeChunks(
    fileId: string,
    fileName: string,
    chunks: ReturnType<typeof chunkKnowledgeText>,
    timestamp: number,
  ): void {
    chunks.forEach((chunk, index) => {
      const chunkId = createId('kchunk');
      const embeddingId = createId('kembed');
      const vector = lexicalEmbedding(chunk.content);
      const citation = `${fileName}#chunk-${index + 1}`;
      this.db
        .prepare(
          `INSERT INTO knowledge_chunks (id, file_id, knowledge_base_id, content, citation, position, token_count, content_hash, source_start, source_end, page_number, section_title, status, embedding_id, metadata_json, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'indexed', ?, ?, ?, ?)`,
        )
        .run(
          chunkId,
          fileId,
          chunk.content,
          citation,
          chunk.position,
          chunk.tokenCount,
          chunk.contentHash,
          chunk.sourceStart,
          chunk.sourceEnd,
          embeddingId,
          JSON.stringify({ strategy: 'lexical', indexDirectory: KNOWLEDGE_RUNTIME_POLICY.indexDirectory }),
          timestamp + index,
          timestamp + index,
        );
      this.db
        .prepare(
          `INSERT INTO knowledge_embeddings (id, chunk_id, provider_id, model_id, model_name_snapshot, strategy, dimension, vector_json, vector_hash, status, created_at)
           VALUES (?, ?, NULL, NULL, ?, 'lexical', ?, ?, ?, 'embedded', ?)`,
        )
        .run(
          embeddingId,
          chunkId,
          KNOWLEDGE_RUNTIME_POLICY.embeddingModel,
          vector.length,
          JSON.stringify(vector),
          stableKnowledgeHash(JSON.stringify(vector)),
          timestamp + index,
        );
    });
  }

  protected buildKnowledgeCitation(input: {
    retrievalId: string | null;
    chunkId: string;
    fileId: string;
    fileName: string;
    citation: string;
    snippet: string;
    score: number;
    strategy: KnowledgeCitation['strategy'];
    fallbackReason: string | null;
    timestamp: number;
    persist: boolean;
  }): KnowledgeCitation {
    const id = createId('citation');
    if (input.persist) {
      this.db
        .prepare(
          `INSERT INTO message_citations (id, retrieval_id, message_id, request_log_id, file_id, chunk_id, file_name, citation, snippet, score, strategy, fallback_reason, created_at)
           VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.retrievalId,
          input.fileId,
          input.chunkId,
          input.fileName,
          input.citation,
          input.snippet,
          input.score,
          input.strategy,
          input.fallbackReason,
          input.timestamp,
        );
    }
    return {
      id,
      retrievalId: input.retrievalId,
      messageId: null,
      requestLogId: null,
      fileId: input.fileId,
      chunkId: input.chunkId,
      fileName: input.fileName,
      citation: input.citation,
      snippet: input.snippet,
      score: input.score,
      strategy: input.strategy,
      fallbackReason: input.fallbackReason,
      createdAt: input.timestamp,
    };
  }

  protected attachKnowledgeCitations(citations: KnowledgeCitation[], messageId: string, requestLogId: string): void {
    for (const citation of citations) {
      this.db
        .prepare(
          `INSERT INTO message_citations (id, retrieval_id, message_id, request_log_id, file_id, chunk_id, file_name, citation, snippet, score, strategy, fallback_reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('citation'),
          citation.retrievalId,
          messageId,
          requestLogId,
          citation.fileId,
          citation.chunkId,
          citation.fileName,
          citation.citation,
          citation.snippet,
          citation.score,
          citation.strategy,
          citation.fallbackReason,
          now(),
        );
    }
  }

  protected buildConversationMarkdownExport(
    conversation: Conversation,
    messages: Message[],
    attachments: MessageAttachment[],
    redacted: boolean,
  ): string {
    const lines = [
      `# ${redacted ? redactSensitive(conversation.title) : conversation.title}`,
      '',
      `- ${t('chat.export.fields.conversationId')}: ${conversation.id}`,
      `- ${t('chat.export.fields.messageCount')}: ${messages.length}`,
      `- ${t('chat.export.fields.attachments')}: ${attachments.length}`,
      '',
    ];
    for (const message of messages) {
      const content = redacted ? redactSensitive(message.content) : message.content;
      lines.push(`## ${message.role} 路 ${message.status}`);
      if (message.modelNameSnapshot) {
        lines.push(`_${message.modelNameSnapshot}_`);
      }
      lines.push('', content, '');
    }
    return lines.join('\n');
  }

  protected buildConversationJsonExport(
    conversation: Conversation,
    messages: Message[],
    attachments: MessageAttachment[],
    redacted: boolean,
  ): string {
    const redactMessage = (message: Message): Message => ({
      ...message,
      content: redacted ? redactSensitive(message.content) : message.content,
      errorMessage: message.errorMessage ? redactSensitive(message.errorMessage) : null,
      metadataJson: message.metadataJson ? redactSensitive(message.metadataJson) : null,
    });
    return JSON.stringify({
      conversation: {
        ...conversation,
        title: redacted ? redactSensitive(conversation.title) : conversation.title,
      },
      messages: messages.map(redactMessage),
      attachments: attachments.map((attachment) => ({
        ...attachment,
        storageRef: redacted ? null : attachment.storageRef,
        errorMessage: attachment.errorMessage ? redactSensitive(attachment.errorMessage) : null,
      })),
      redacted,
      exportedAt: now(),
    }, null, 2);
  }

  protected findLatestMessageId(conversationId: string): string | null {
    const row = this.db
      .prepare("SELECT id FROM messages WHERE conversation_id = ? AND status != 'deleted' ORDER BY created_at DESC LIMIT 1")
      .get(conversationId) as { id: string } | undefined;
    return row?.id ?? null;
  }

  protected findPreviousUserMessage(conversationId: string, beforeCreatedAt: number): Message | null {
    const row = this.db
      .prepare(
        `SELECT * FROM messages
         WHERE conversation_id = ? AND role = 'user' AND status != 'deleted' AND created_at <= ?
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .get(conversationId, beforeCreatedAt) as Record<string, unknown> | undefined;
    return row ? mapMessage(row) : null;
  }

  protected estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.requireModel(modelId);
    const inputPrice = model.inputPrice ?? 0;
    const outputPrice = model.outputPrice ?? 0;
    return (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
  }

  protected getDefaultWorkspace(): Workspace {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(DEFAULT_WORKSPACE_ID);
    if (!row) {
      throw new Error('Default workspace missing.');
    }
    return mapWorkspace(row as Record<string, unknown>);
  }

  protected getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  protected setSetting(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(key, value, now());
  }

  protected markGatewayKeyError(gatewayKeyId: string, errorCode: GatewayErrorCode): void {
    this.db.prepare('UPDATE gateway_api_keys SET last_error_code = ? WHERE id = ?').run(errorCode, gatewayKeyId);
  }

  protected parseManifest(manifestJson: string | null): Record<string, unknown> {
    if (!manifestJson) {
      return {};
    }
    try {
      return JSON.parse(manifestJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  protected detectImportSource(manifest: Record<string, unknown>): GatewayImportPlan['source'] {
    const value = String(manifest.source ?? manifest.kind ?? manifest.type ?? '').toLowerCase();
    if (value.includes('sub2api')) return 'sub2api';
    if (value.includes('ccs')) return 'ccs';
    if (value.includes('ollama')) return 'ollama';
    if (value.includes('lm-studio') || value.includes('lm studio')) return 'lm-studio';
    if (value.includes('nexachat')) return 'nexachat';
    return 'openai-compatible';
  }

  protected normalizeImportProviders(value: unknown): Array<{ name: string; type: Provider['type']; baseUrl: string }> {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.slice(0, 20).map((provider, index) => {
      const item = provider as Record<string, unknown>;
      return {
        name: String(item.name ?? item.label ?? `Imported Provider ${index + 1}`),
        type: 'openai-compatible',
        baseUrl: normalizeBaseUrl(String(item.baseUrl ?? item.base_url ?? item.url ?? 'http://127.0.0.1:11434/v1')),
      };
    });
  }

  protected normalizeImportModels(value: unknown): Array<{ providerName: string | null; name: string; displayName: string }> {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.slice(0, 100).map((model, index) => {
      const item = model as Record<string, unknown>;
      const name = String(item.name ?? item.id ?? item.model ?? `imported-model-${index + 1}`);
      return {
        providerName: item.providerName || item.provider ? String(item.providerName ?? item.provider) : null,
        name,
        displayName: String(item.displayName ?? item.label ?? name),
      };
    });
  }

  protected normalizeGatewayKeyTemplates(value: unknown): Array<{ name: string; scopes: GatewayScope[]; quotaLimit: number | null }> {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.slice(0, 20).map((item, index) => {
      const record = item as Record<string, unknown>;
      return {
        name: String(record.name ?? record.label ?? `Imported Gateway Key Template ${index + 1}`),
        scopes: normalizeGatewayScopes(Array.isArray(record.scopes) ? record.scopes.map(String) : GATEWAY_SCOPES),
        quotaLimit: normalizeGatewayLimit(typeof record.quotaLimit === 'number' ? record.quotaLimit : null),
      };
    });
  }

  protected applyImportMetadata(manifest: Record<string, unknown>): string[] {
    const timestamp = now();
    const appliedEntityIds: string[] = [];
    const providers = Array.isArray(manifest.providers) ? manifest.providers as Array<Record<string, unknown>> : [];
    const providerByName = new Map(this.getProviders().map((provider) => [provider.name, provider]));

    for (const provider of providers) {
      const name = String(provider.name ?? '').trim();
      const baseUrl = normalizeBaseUrl(String(provider.baseUrl ?? ''));
      if (!name || !baseUrl || providerByName.has(name)) {
        continue;
      }
      const id = createId('provider');
      this.db
        .prepare(
          `INSERT INTO providers (id, name, type, base_url, proxy_url, auth_type, secret_ref, custom_headers_json, enabled, health_status, last_checked_at, created_at, updated_at)
           VALUES (?, ?, 'openai-compatible', ?, NULL, 'none', NULL, NULL, 1, 'unknown', NULL, ?, ?)`,
        )
        .run(id, name, baseUrl, timestamp, timestamp);
      appliedEntityIds.push(id);
      providerByName.set(name, this.requireProvider(id));
    }

    const models = Array.isArray(manifest.models) ? manifest.models as Array<Record<string, unknown>> : [];
    const defaultProvider = this.getProviders()[0];
    for (const model of models) {
      const name = String(model.name ?? '').trim();
      if (!name) {
        continue;
      }
      const providerName = model.providerName ? String(model.providerName) : null;
      const provider = providerName ? providerByName.get(providerName) : defaultProvider;
      if (!provider) {
        continue;
      }
      if (this.getModels().some((existing) => existing.providerId === provider.id && existing.name === name)) {
        continue;
      }
      const id = createId('model');
      this.db
        .prepare(
          `INSERT INTO models (id, provider_id, name, display_name, model_name_snapshot, context_window, supports_streaming, supports_tools, supports_vision, supports_embeddings, input_price, output_price, health_status, latency_ms, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 8192, 1, 0, 0, 0, NULL, NULL, 'unknown', NULL, 1, ?, ?)`,
        )
        .run(id, provider.id, name, String(model.displayName ?? name), name, timestamp, timestamp);
      appliedEntityIds.push(id);
    }

    return appliedEntityIds;
  }

  protected parseStringList(value: unknown, key: string): string[] {
    if (!value || typeof value !== 'object') {
      return [];
    }
    const raw = (value as Record<string, unknown>)[key];
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
  }

  protected saveSecret(label: string, value: string): string {
    const id = createId('secret');
    const timestamp = now();
    const encoded = encodeSecretValue(value);
    this.db
      .prepare('INSERT INTO secrets (id, label, encrypted_value, preview, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, label, encoded, previewSecret(value), timestamp, timestamp);
    return id;
  }

  protected getProviderSecret(provider: Provider): string | null {
    if (provider.authType !== 'api-key') {
      return null;
    }
    if (!provider.secretRef) {
      return null;
    }
    const row = this.db.prepare('SELECT encrypted_value FROM secrets WHERE id = ?').get(provider.secretRef) as { encrypted_value: string } | undefined;
    return row ? decodeSecretValue(row.encrypted_value) : null;
  }

  protected normalizeProviderError(error: unknown): { code: string; message: string; retryable: boolean } {
    if (error instanceof ProviderRuntimeError) {
      return { code: error.code, message: redactSensitive(error.message), retryable: error.retryable };
    }
    if (error instanceof Error) {
      return { code: PROVIDER_RUNTIME_ERROR_CODES.upstreamError, message: redactSensitive(error.message), retryable: false };
    }
    return { code: PROVIDER_RUNTIME_ERROR_CODES.upstreamError, message: redactSensitive(String(error)), retryable: false };
  }

  protected audit(
    action: string,
    targetType: string,
    targetId: string | null,
    details: unknown,
    permissionKey: SecurityPermissionKey | null = null,
  ): void {
    const active = this.db
      .prepare("SELECT user_id FROM security_sessions WHERE state = 'active' ORDER BY last_seen_at DESC LIMIT 1")
      .get() as { user_id: string } | undefined;
    const actor = active?.user_id ?? 'system';
    const id = createId('audit');
    const createdAt = now();
    const detailsJson = redactSensitive(details);
    const previousHash = this.getLatestAuditHash();
    const entryHash = computeAuditHash({
      id,
      action,
      actor,
      targetType,
      targetId,
      detailsJson,
      permissionKey,
      previousHash,
      createdAt,
    });
    this.db
      .prepare(
        `INSERT INTO audit_logs (id, action, actor, target_type, target_id, details_json, permission_key, previous_hash, entry_hash, integrity_state, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)`,
      )
      .run(id, action, actor, targetType, targetId, detailsJson, permissionKey, previousHash, entryHash, createdAt);
  }

  protected getLatestAuditHash(): string | null {
    const row = this.db
      .prepare('SELECT entry_hash FROM audit_logs WHERE entry_hash IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1')
      .get() as { entry_hash: string | null } | undefined;
    return row?.entry_hash ?? null;
  }

  protected backfillAuditHashes(): void {
    const rows = this.db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at ASC, id ASC')
      .all()
      .map((row) => mapAuditLog(row as Record<string, unknown>));
    let previousHash: string | null = null;
    for (const row of rows) {
      const entryHash = computeAuditHash({
        id: row.id,
        action: row.action,
        actor: row.actor,
        targetType: row.targetType,
        targetId: row.targetId,
        detailsJson: row.detailsJson,
        permissionKey: row.permissionKey,
        previousHash,
        createdAt: row.createdAt,
      });
      if (row.previousHash !== previousHash || row.entryHash !== entryHash || row.integrityState !== 'verified') {
        this.db
          .prepare("UPDATE audit_logs SET previous_hash = ?, entry_hash = ?, integrity_state = 'verified' WHERE id = ?")
          .run(previousHash, entryHash, row.id);
      }
      previousHash = entryHash;
    }
  }

  protected requireProvider(id: string): Provider {
    const row = this.db.prepare('SELECT * FROM providers WHERE id = ?').get(id);
    if (!row) throw new Error(`Provider not found: ${id}`);
    return mapProvider(row as Record<string, unknown>);
  }

  protected requireModel(id: string): Model {
    const row = this.db.prepare('SELECT * FROM models WHERE id = ?').get(id);
    if (!row) throw new Error(`Model not found: ${id}`);
    return mapModel(row as Record<string, unknown>);
  }

  protected requireConversation(id: string): Conversation {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    if (!row) throw new Error(`Conversation not found: ${id}`);
    return mapConversation(row as Record<string, unknown>);
  }

  protected requireMessage(id: string): Message {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!row) throw new Error(`Message not found: ${id}`);
    return mapMessage(row as Record<string, unknown>);
  }

  protected requireRequestLog(id: string): RequestLog {
    const row = this.db.prepare('SELECT * FROM request_logs WHERE id = ?').get(id);
    if (!row) throw new Error(`Request log not found: ${id}`);
    return mapRequestLog(row as Record<string, unknown>);
  }

  protected requireFeedbackItem(id: string): FeedbackItem {
    const row = this.db.prepare('SELECT * FROM feedback_items WHERE id = ?').get(id);
    if (!row) throw new Error(`Feedback item not found: ${id}`);
    return mapFeedbackItem(row as Record<string, unknown>);
  }

  protected requireEvalSet(id: string): EvalSet {
    const row = this.db.prepare('SELECT * FROM eval_sets WHERE id = ?').get(id);
    if (!row) throw new Error(`Eval set not found: ${id}`);
    return mapEvalSet(row as Record<string, unknown>);
  }

  protected requireEvalResult(id: string): EvalResult {
    const row = this.db.prepare('SELECT * FROM eval_results WHERE id = ?').get(id);
    if (!row) throw new Error(`Eval result not found: ${id}`);
    return mapEvalResult(row as Record<string, unknown>);
  }

  protected recordProviderHealth(
    providerId: string,
    modelId: string | null,
    status: ProviderHealthRecord['status'],
    latencyMs: number | null,
    source: ProviderHealthRecord['source'],
    errorCode: string | null,
    errorMessage: string | null,
  ): void {
    this.db
      .prepare(
        `INSERT INTO provider_health_records (id, provider_id, model_id, status, latency_ms, source, error_code, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(createId('health'), providerId, modelId, status, latencyMs, source, errorCode, errorMessage ? redactSensitive(errorMessage) : null, now());
  }

  protected requireGatewayKey(id: string): GatewayApiKey {
    const row = this.db.prepare('SELECT * FROM gateway_api_keys WHERE id = ?').get(id);
    if (!row) throw new Error(`Gateway key not found: ${id}`);
    return mapGatewayKey(row as Record<string, unknown>);
  }

  protected requireKnowledgeFile(id: string, options: { includeDeleted?: boolean } = {}): KnowledgeFile {
    const row = options.includeDeleted
      ? this.db.prepare('SELECT * FROM files WHERE id = ?').get(id)
      : this.db.prepare('SELECT * FROM files WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!row) throw new Error(`Knowledge file not found: ${id}`);
    return mapKnowledgeFile(row as Record<string, unknown>);
  }

  protected requireKnowledgeRetrievalTrace(id: string): KnowledgeRetrievalTrace {
    const row = this.db.prepare('SELECT * FROM knowledge_retrieval_traces WHERE id = ?').get(id);
    if (!row) throw new Error(`Knowledge retrieval not found: ${id}`);
    return mapKnowledgeRetrievalTrace(row as Record<string, unknown>);
  }

  protected requireMcpServer(id: string): McpServer {
    const row = this.db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id);
    if (!row) throw new Error(`MCP server not found: ${id}`);
    return mapMcpServer(row as Record<string, unknown>);
  }

  protected requireAgent(id: string): AgentDefinition {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    if (!row) throw new Error(`Agent not found: ${id}`);
    return mapAgent(row as Record<string, unknown>);
  }

  protected requireTool(id: string): ToolDefinition {
    const row = this.db.prepare('SELECT * FROM tools WHERE id = ? AND enabled = 1').get(id);
    if (!row) throw new Error(`Tool not found or disabled: ${id}`);
    return mapToolDefinition(row as Record<string, unknown>);
  }

  protected requireExecutionRun(id: string): ExecutionRun {
    const row = this.db.prepare('SELECT * FROM execution_runs WHERE id = ?').get(id);
    if (!row) throw new Error(`Execution run not found: ${id}`);
    return mapExecutionRun(row as Record<string, unknown>);
  }

  protected requireApprovalRequest(id: string): ApprovalRequest {
    const row = this.db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(id);
    if (!row) throw new Error(`Approval request not found: ${id}`);
    return mapApprovalRequest(row as Record<string, unknown>);
  }

  protected createExecutionStep(input: {
    runId: string;
    kind: ExecutionStep['kind'];
    title: string;
    status: ExecutionStep['status'];
    position: number;
    timestamp: number;
    toolId?: string | null;
    mcpServerId?: string | null;
    inputJson?: string | null;
    outputJson?: string | null;
    errorMessage?: string | null;
  }): string {
    const id = createId('step');
    const completed = ['completed', 'failed', 'cancelled'].includes(input.status) ? input.timestamp : null;
    const started = ['running', 'completed', 'failed', 'cancelled'].includes(input.status) ? input.timestamp : null;
    this.db
      .prepare(
        `INSERT INTO execution_steps (id, run_id, parent_step_id, kind, title, status, tool_id, mcp_server_id, input_json, output_json, error_message, position, started_at, completed_at, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.runId,
        input.kind,
        input.title,
        input.status,
        input.toolId ?? null,
        input.mcpServerId ?? null,
        input.inputJson ?? null,
        input.outputJson ?? null,
        input.errorMessage ?? null,
        input.position,
        started,
        completed,
        input.timestamp,
        input.timestamp,
      );
    return id;
  }

  protected addTrace(
    runId: string,
    stepId: string | null,
    eventType: ExecutionTraceEvent['eventType'],
    message: string,
    metadata?: unknown,
  ): void {
    this.db
      .prepare(
        `INSERT INTO execution_trace_events (id, run_id, step_id, event_type, message, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(createId('trace'), runId, stepId, eventType, message, metadata ? JSON.stringify(redactSensitive(metadata)) : null, now());
  }

  protected executeFixtureTool(toolId: string, inputJson: string): string {
    if (toolId === EXECUTION_TOOL_IDS.echo) {
      const parsed = safeJsonParse(inputJson);
      return JSON.stringify({ echo: typeof parsed.message === 'string' ? parsed.message : t('tools.execution.echo.default') });
    }
    return JSON.stringify({
      summary: t('tools.execution.status.summary', {
        models: this.getModels().length,
        knowledge: this.getKnowledgeFiles().length,
        gateway: this.getGatewayStatus().running ? 'running' : 'stopped',
      }),
    });
  }

  protected emptyDataManifest(source: string): NormalizedDataManifest {
    return {
      version: DATA_MANIFEST_VERSION,
      source,
      providers: [],
      models: [],
      gatewayKeyTemplates: [],
      conflictCount: 0,
      conflicts: [],
      redaction: {
        secrets: 'stripped',
        localPaths: 'redacted',
      },
      requiresConfirmation: true,
    };
  }

  protected detectDataConflicts(parsed: Record<string, unknown>): DataConflictInput[] {
    const conflicts: DataConflictInput[] = [];
    const existingProviders = this.getProviders();
    const providers = Array.isArray(parsed.providers) ? parsed.providers as Array<Record<string, unknown>> : [];
    for (const provider of providers) {
      const name = String(provider.name ?? provider.label ?? '').trim();
      const existing = existingProviders.find((candidate) => candidate.name === name);
      if (existing) {
        conflicts.push({
          type: 'provider-name',
          entityKind: 'provider',
          localId: existing.id,
          importName: name,
          strategy: 'keep-local',
        });
      }
    }
    const models = Array.isArray(parsed.models) ? parsed.models as Array<Record<string, unknown>> : [];
    for (const model of models) {
      const name = String(model.name ?? model.id ?? model.model ?? '').trim();
      const existing = this.getModels().find((candidate) => candidate.name === name);
      if (existing) {
        conflicts.push({
          type: 'model-name',
          entityKind: 'model',
          localId: existing.id,
          importName: name,
          strategy: 'keep-local',
        });
      }
    }
    const keyTemplates = parsed.keys ?? parsed.apiKeys ?? parsed.gatewayKeys;
    if (Array.isArray(keyTemplates) && keyTemplates.length > 0) {
      for (const key of keyTemplates.slice(0, 20)) {
        const item = key as Record<string, unknown>;
        conflicts.push({
          type: 'secret-stripped',
          entityKind: 'secret',
          localId: null,
          importName: String(item.name ?? item.label ?? 'Imported secret template'),
          strategy: 'skip',
        });
      }
    }
    return conflicts;
  }

  protected insertDataMobilityJob(input: {
    id: string;
    operationKind: DataMobilityJob['operationKind'];
    status: DataMobilityJob['status'];
    source: string | null;
    profile: DataMobilityJob['profile'];
    summary: string;
    manifestJson: string | null;
    manifestHash: string | null;
    conflictCount: number;
    requiresConfirmation: boolean;
    encrypted: boolean;
    redacted: boolean;
    rollbackRecordId: string | null;
    relatedSnapshotId: string | null;
    timestamp: number;
  }): string {
    this.db
      .prepare(
        `INSERT INTO data_mobility_jobs (id, operation_kind, status, source, manifest_version, profile, summary, manifest_hash, manifest_json, conflict_count, requires_confirmation, encrypted, redacted, rollback_record_id, related_snapshot_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, summary = excluded.summary, manifest_hash = excluded.manifest_hash, manifest_json = excluded.manifest_json, conflict_count = excluded.conflict_count, requires_confirmation = excluded.requires_confirmation, rollback_record_id = excluded.rollback_record_id, related_snapshot_id = excluded.related_snapshot_id, updated_at = excluded.updated_at`,
      )
      .run(
        input.id,
        input.operationKind,
        input.status,
        input.source,
        DATA_MANIFEST_VERSION,
        input.profile,
        input.summary,
        input.manifestHash,
        input.manifestJson,
        input.conflictCount,
        input.requiresConfirmation ? 1 : 0,
        input.encrypted ? 1 : 0,
        input.redacted ? 1 : 0,
        input.rollbackRecordId,
        input.relatedSnapshotId,
        input.timestamp,
        input.timestamp,
      );
    this.ensureMigrationRun(input.timestamp);
    return input.id;
  }

  protected insertDataConflicts(jobId: string, conflicts: DataConflictInput[], timestamp: number): void {
    for (const conflict of conflicts) {
      this.db
        .prepare(
          `INSERT INTO data_conflicts (id, job_id, type, entity_kind, local_id, import_name, strategy, resolved, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('conflict'),
          jobId,
          conflict.type,
          conflict.entityKind,
          conflict.localId,
          conflict.importName,
          conflict.strategy ?? 'keep-local',
          0,
          timestamp,
        );
    }
  }

  protected updateDataMobilityJob(
    id: string,
    status: DataMobilityJob['status'],
    summary: string,
    rollbackRecordId: string | null,
    relatedSnapshotId: string | null,
    timestamp: number,
    manifestJson?: string,
  ): void {
    this.db
      .prepare(
        `UPDATE data_mobility_jobs
         SET status = ?, summary = ?, rollback_record_id = ?, related_snapshot_id = ?, manifest_json = COALESCE(?, manifest_json), manifest_hash = COALESCE(?, manifest_hash), updated_at = ?
         WHERE id = ?`,
      )
      .run(status, summary, rollbackRecordId, relatedSnapshotId, manifestJson ?? null, manifestJson ? stableHash(manifestJson) : null, timestamp, id);
  }

  protected insertRollbackRecord(
    jobId: string,
    rollbackSnapshotId: string | null,
    affectedEntityIds: string[],
    state: RollbackRecord['state'],
    appliedAt: number | null,
    timestamp: number,
  ): string {
    const id = createId('rollback_record');
    this.db
      .prepare(
        `INSERT INTO rollback_records (id, job_id, rollback_snapshot_id, state, affected_entity_ids_json, applied_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, jobId, rollbackSnapshotId, state, JSON.stringify(affectedEntityIds), appliedAt, timestamp);
    return id;
  }

  protected markRollbackApplied(jobId: string, fallbackEntityIds: string[], timestamp: number): void {
    const existing = this.db.prepare("SELECT * FROM rollback_records WHERE job_id = ? AND state = 'available' ORDER BY created_at DESC LIMIT 1").get(jobId);
    if (existing) {
      this.db.prepare("UPDATE rollback_records SET state = 'applied', applied_at = ? WHERE id = ?").run(timestamp, (existing as { id: string }).id);
      return;
    }
    this.insertRollbackRecord(jobId, null, fallbackEntityIds, 'applied', timestamp, timestamp);
  }

  protected buildDataExportPayload(profile: DataBackupProfile): Record<string, unknown> {
    return {
      version: DATA_MANIFEST_VERSION,
      profile,
      exportedAt: now(),
      providers: this.getProviders().map((provider) => ({
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        enabled: provider.enabled,
        authType: provider.authType,
        secretRef: provider.secretRef ? '[REDACTED]' : null,
      })),
      models: this.getModels().map((model) => ({
        providerId: model.providerId,
        name: model.name,
        displayName: model.displayName,
        contextWindow: model.contextWindow,
        enabled: model.enabled,
      })),
      gatewayKeys: this.getGatewayKeys().map((key) => ({
        name: key.name,
        scopes: key.scopes,
        state: key.state,
        keyPreview: key.keyPreview,
      })),
      conversations: this.getConversations().map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        status: conversation.status,
        messageCount: conversation.messageCount,
      })),
      uiPreferences: this.getUiPreferences(),
      security: {
        activeRole: this.getSecurityState().activeRole.id,
        permissionKeys: this.getSecurityState().permissionKeys,
      },
    };
  }

  protected createEncryptedBackupPackage(payload: unknown, passphrase: string): DataBackupPackage {
    const normalized = passphrase.trim();
    if (normalized.length < 8) {
      throw new Error(t('data.backup.errors.passphrase'));
    }
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = pbkdf2Sync(normalized, salt, 120000, 32, 'sha256');
    const plaintext = JSON.stringify(createRedactedBackupPackage(payload, 'encrypted-full'));
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      version: DATA_MANIFEST_VERSION,
      profile: 'encrypted-full',
      encrypted: true,
      redacted: true,
      manifestHash: createHash('sha256').update(plaintext).digest('hex'),
      payload: encrypted.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  protected decryptBackupPackage(pkg: DataBackupPackage, passphrase: string): Record<string, unknown> {
    if (!pkg.encrypted) {
      return JSON.parse(pkg.payload) as Record<string, unknown>;
    }
    if (!pkg.salt || !pkg.iv || !pkg.authTag) {
      throw new Error(t('data.restore.errors.backupInvalid'));
    }
    try {
      const key = pbkdf2Sync(passphrase.trim(), Buffer.from(pkg.salt, 'base64'), 120000, 32, 'sha256');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(pkg.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(pkg.authTag, 'base64'));
      const plaintext = Buffer.concat([decipher.update(Buffer.from(pkg.payload, 'base64')), decipher.final()]).toString('utf8');
      if (createHash('sha256').update(plaintext).digest('hex') !== pkg.manifestHash) {
        throw new Error(t('data.restore.errors.integrity'));
      }
      return JSON.parse(plaintext) as Record<string, unknown>;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : t('data.restore.errors.backupInvalid'));
    }
  }

  protected resolveBackupPackage(input: DataRestorePreflightInput): DataBackupPackage {
    if (input.packageText?.trim()) {
      return JSON.parse(input.packageText) as DataBackupPackage;
    }
    if (input.backupId) {
      const backup = this.requireDataBackup(input.backupId);
      return JSON.parse(backup.packageJson) as DataBackupPackage;
    }
    throw new Error(t('data.restore.errors.backupRequired'));
  }

  protected payloadToDataManifest(payload: Record<string, unknown>): NormalizedDataManifest {
    const nestedPayload = typeof payload.payload === 'string' && !payload.encrypted
      ? JSON.parse(String(payload.payload)) as Record<string, unknown>
      : payload;
    const body = (nestedPayload.profile && typeof nestedPayload.payload === 'string')
      ? JSON.parse(String(nestedPayload.payload)) as Record<string, unknown>
      : nestedPayload;
    const sourcePayload = typeof body.payload === 'object' && body.payload !== null ? body.payload as Record<string, unknown> : body;
    const conflicts = this.detectDataConflicts(sourcePayload);
    try {
      return normalizeDataManifest(sourcePayload, conflicts);
    } catch {
      return this.emptyDataManifest(detectDataImportSource(sourcePayload));
    }
  }

  protected ensureMigrationRun(timestamp: number): void {
    const version = DATA_MIGRATION_VERSIONS[0];
    const existing = this.db.prepare('SELECT id FROM migration_runs WHERE version = ?').get(version);
    if (existing) return;
    this.db
      .prepare('INSERT INTO migration_runs (id, version, status, summary, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(createId('migration'), version, 'completed', t('data.migration.summary.round12'), timestamp, timestamp);
  }

  protected requireDataMobilityJob(id: string): DataMobilityJob {
    const row = this.db.prepare('SELECT * FROM data_mobility_jobs WHERE id = ?').get(id);
    if (!row) throw new Error(`Data mobility job not found: ${id}`);
    return mapDataMobilityJob(row as Record<string, unknown>);
  }

  protected requireDataBackup(id: string): DataBackupRecord {
    const row = this.db.prepare('SELECT * FROM data_backups WHERE id = ?').get(id);
    if (!row) throw new Error(`Data backup not found: ${id}`);
    return mapDataBackupRecord(row as Record<string, unknown>);
  }

  protected requireRollbackRecord(id: string): RollbackRecord {
    const row = this.db.prepare('SELECT * FROM rollback_records WHERE id = ?').get(id);
    if (!row) throw new Error(`Rollback record not found: ${id}`);
    return mapRollbackRecord(row as Record<string, unknown>);
  }

  protected requireImportExportResult(id: string): ImportExportResult {
    const row = this.db.prepare('SELECT * FROM config_snapshots WHERE id = ?').get(id);
    if (!row) throw new Error(`Import/export result not found: ${id}`);
    return mapImportExportResult(row as Record<string, unknown>);
  }

  protected requireConversationExport(id: string): ConversationExport {
    const row = this.db.prepare('SELECT * FROM conversation_exports WHERE id = ?').get(id);
    if (!row) throw new Error(`Conversation export not found: ${id}`);
    return mapConversationExport(row as Record<string, unknown>);
  }
}

export interface ServiceContext {
  getSnapshot(): AppSnapshot;
  getDashboardSummary(): DashboardSummary;
  getProviders(): Provider[];
  getProviderHealthRecords(): ProviderHealthRecord[];
  createProvider(input: ProviderInput): Provider;
  deleteProvider(providerId: string): Provider;
  testProvider(providerId: string): Promise<Provider>;
  getModels(): Model[];
  fetchProviderModels(providerId: string): Promise<ProviderModelOption[]>;
  createModel(input: ModelInput): Model;
  resolveGatewayModelId(modelName: string | undefined): string | undefined;
  getConversations(): Conversation[];
  getMessages(conversationId?: string): Message[];
  getMessageChunks(messageId?: string): MessageChunk[];
  getMessageAttachments(conversationId?: string): MessageAttachment[];
  getPromptTemplates(): PromptTemplate[];
  getConversationExports(conversationId?: string): ConversationExport[];
  createConversation(title?: string): Conversation;
  updateConversationFlags(conversationId: string, flags: Partial<Pick<Conversation, 'isPinned' | 'isFavorite' | 'status'>>): Conversation;
  retryMessage(input: RetryMessageInput): Promise<ChatResponse>;
  regenerateMessage(input: RegenerateMessageInput): Promise<ChatResponse>;
  cancelMessage(input: CancelMessageInput): ChatResponse;
  compareModels(input: CompareModelsInput): Promise<CompareModelsResponse>;
  exportConversation(input: ExportConversationInput): ConversationExport;
  sendMessage(input: SendMessageInput, options?: { onEvent?: (payload: unknown) => void }): Promise<ChatResponse>;
  getGatewayKeys(): GatewayApiKey[];
  getGatewayLogs(): GatewayLog[];
  getGatewayStatus(): GatewayStatus;
  setGatewayRuntime(enabled: boolean, recentError?: string | null, listenerState?: GatewayStatus['listenerState']): GatewayStatus;
  createGatewayKey(input: GatewayKeyCreateInput | string): GatewayKeyCreated;
  updateGatewayKey(input: GatewayKeyUpdateInput): GatewayApiKey;
  rotateGatewayKey(input: GatewayKeyRotateInput): GatewayKeyCreated;
  revokeGatewayKey(gatewayKeyId: string): GatewayApiKey;
  toggleGateway(enabled: boolean): GatewayStatus;
  authorizeGatewayKey(rawKey: string | null, scope: GatewayScope): GatewayAuthorizationResult;
  validateGatewayKey(rawKey: string, scope: GatewayScope): GatewayApiKey | null;
  recordGatewayLog(input: GatewayLogInput): void;
  getKnowledgeFiles(): KnowledgeFile[];
  getKnowledgeChunks(fileId?: string): KnowledgeChunk[];
  getKnowledgeRetrievalTraces(): KnowledgeRetrievalTrace[];
  getKnowledgeCitations(messageId?: string): KnowledgeCitation[];
  createKnowledgeFile(input: KnowledgeImportInput): KnowledgeFile;
  retryKnowledgeFile(input: KnowledgeRebuildInput): KnowledgeFile;
  rebuildKnowledgeFile(input: KnowledgeRebuildInput): KnowledgeFile;
  deleteKnowledgeFile(input: KnowledgeDeleteInput): KnowledgeFile;
  previewKnowledgeRetrieval(input: KnowledgeRetrievalInput): KnowledgeRetrievalResult;
  getMcpServers(): McpServer[];
  getAgents(): AgentDefinition[];
  getTools(): ToolDefinition[];
  getExecutionRuns(): ExecutionRun[];
  getExecutionSteps(runId?: string): ExecutionStep[];
  getExecutionTraceEvents(runId?: string): ExecutionTraceEvent[];
  getApprovalRequests(): ApprovalRequest[];
  createMcpServer(name: string, transport: McpServer['transport'], commandOrUrl: string): McpServer;
  updateMcpPermission(serverId: string, permissionState: McpServer['permissionState']): McpServer;
  createAgent(name: string, goal: string): AgentDefinition;
  previewAgentRun(agentId: string): ExecutionRun;
  startExecutionRun(input: ExecutionStartInput): ExecutionRun;
  decideApproval(input: ApprovalDecisionInput): ExecutionRun;
  getImportExportResults(): ImportExportResult[];
  getDataMobilityJobs(): DataMobilityJob[];
  getDataConflicts(jobId?: string): DataConflictRecord[];
  getDataBackups(): DataBackupRecord[];
  getMigrationRuns(): MigrationRun[];
  getRollbackRecords(): RollbackRecord[];
  validateImportManifest(manifestText: string): ImportExportResult;
  applyImportPlan(resultId: string, options?: ImportPlanApplyOptions): ImportExportResult;
  restoreSnapshot(snapshotId: string, options?: RestoreSnapshotOptions): ImportExportResult;
  createSnapshot(): ImportExportResult;
  exportDiagnostics(): ImportExportResult;
  exportDataPackage(options?: DataExportOptions): ImportExportResult;
  createEncryptedBackup(input: DataBackupCreateInput): DataBackupRecord;
  createRestorePreflight(input: DataRestorePreflightInput): DataMobilityJob;
  applyDataRollback(input: DataRollbackInput): DataMobilityJob;
  getSecurityUsers(): SecurityUser[];
  getSecurityRoles(): SecurityRole[];
  getSecuritySessions(): SecuritySession[];
  getAclGrants(): SecurityAclGrant[];
  getSecurityState(): SecurityState;
  requirePermission(permissionKey: SecurityPermissionKey, resourceType?: string | null, resourceId?: string | null): void;
  getAuditLogs(): AuditLog[];
  countAuditAction(action: string): number;
  searchAuditLogs(query?: string): AuditLog[];
  verifyAuditIntegrity(options?: { persistAudit?: boolean }): AuditIntegrityReport;
  exportAuditLogs(): AuditExportResult;
  getObservabilityPrivacySettings(): ObservabilityPrivacySettings;
  saveObservabilityPrivacy(input: Partial<ObservabilityPrivacySettings>): ObservabilityPrivacySettings;
  getUiPreferences(): UiPreferences;
  saveUiPreferences(preferences: UiPreferences): UiPreferences;
  getRequestLogs(): RequestLog[];
  getUsageRecords(): UsageRecord[];
  getFeedbackItems(): FeedbackItem[];
  getEvalSets(): EvalSet[];
  getEvalResults(evalSetId?: string): EvalResult[];
  queryObservability(input?: ObservabilityQueryInput): ObservabilitySnapshot;
  createFeedback(input: FeedbackCreateInput): FeedbackItem;
  runEvaluation(input: EvalRunInput): Promise<EvalResult>;
  exportObservability(input?: ObservabilityQueryInput): ObservabilityExportResult;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function buildChatRequestSummary(content: string): Record<string, unknown> {
  return {
    promptLength: content.length,
    promptTokenEstimate: estimateTokens(content),
    promptHash: createHash('sha256').update(content).digest('hex').slice(0, 16),
    redactedPreview: redactSensitive(content).slice(0, 120),
  };
}

function encodeSecretValue(value: string): string {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return `safeStorage:v1:${safeStorage.encryptString(value).toString('base64')}`;
    }
  } catch {
    // Electron safeStorage can be unavailable in early test/runtime bootstrap.
  }
  return `local-dev:v1:${Buffer.from(value, 'utf8').toString('base64')}`;
}

function decodeSecretValue(value: string): string {
  if (value.startsWith('safeStorage:v1:')) {
    return safeStorage.decryptString(Buffer.from(value.slice('safeStorage:v1:'.length), 'base64'));
  }
  if (value.startsWith('local-dev:v1:')) {
    return Buffer.from(value.slice('local-dev:v1:'.length), 'base64').toString('utf8');
  }
  return Buffer.from(value, 'base64').toString('utf8');
}

function inferTitle(currentTitle: string, content: string): string {
  if (currentTitle !== t('chat.seed.newConversation') && currentTitle !== t('chat.seed.welcomeConversation')) {
    return currentTitle;
  }
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 28) || currentTitle;
}

function safeJsonParse(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function safeStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function scoreEvaluationOutput(output: string, expectedKeywords: string[]): number {
  if (expectedKeywords.length === 0) {
    return output.trim().length > 0 ? 1 : 0;
  }
  const normalized = output.toLowerCase();
  const matches = expectedKeywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
  return Number((matches.length / expectedKeywords.length).toFixed(3));
}

function computeAuditHash(input: {
  id: string;
  action: string;
  actor: string;
  targetType: string;
  targetId: string | null;
  detailsJson: string | null;
  permissionKey: SecurityPermissionKey | null;
  previousHash: string | null;
  createdAt: number;
}): string {
  return createHash('sha256')
    .update(JSON.stringify({
      id: input.id,
      action: input.action,
      actor: input.actor,
      targetType: input.targetType,
      targetId: input.targetId,
      detailsJson: input.detailsJson,
      permissionKey: input.permissionKey,
      previousHash: input.previousHash,
      createdAt: input.createdAt,
    }))
    .digest('hex');
}
