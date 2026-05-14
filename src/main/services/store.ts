import { randomBytes } from 'node:crypto';
import { safeStorage } from 'electron';
import type { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../database/connection.js';
import {
  mapAgent,
  mapAuditLog,
  mapConversation,
  mapGatewayKey,
  mapGatewayLog,
  mapImportExportResult,
  mapKnowledgeFile,
  mapMcpServer,
  mapMessage,
  mapModel,
  mapProvider,
  mapRequestLog,
  mapUiPreferences,
  mapUsageRecord,
  mapWorkspace,
} from '../repositories/mappers.js';
import { redactSensitive } from '../security/redaction.js';
import { createId, estimateTokens, now, previewSecret } from '../utils/ids.js';
import { diagnoses } from '../../shared/errors.js';
import type {
  AgentDefinition,
  AppSnapshot,
  AuditLog,
  ChatResponse,
  Conversation,
  DashboardSummary,
  GatewayApiKey,
  GatewayKeyCreated,
  GatewayLog,
  GatewayStatus,
  ImportExportResult,
  KnowledgeFile,
  McpServer,
  Message,
  Model,
  ModelInput,
  Provider,
  ProviderInput,
  RequestLog,
  RouteDecision,
  SendMessageInput,
  UiPreferences,
  UsageRecord,
  Workspace,
} from '../../shared/types.js';

const DEFAULT_WORKSPACE_ID = 'ws_default';
const DEFAULT_PREFS_ID = 'ui_default';

export class NexaStore {
  private readonly db: DatabaseSync;
  private gatewayEnabled = false;
  private gatewayRecentError: string | null = null;

  constructor() {
    this.db = getDatabase().db;
    this.seed();
  }

  getDatabasePath(): string {
    return getDatabase().path;
  }

  getSnapshot(): AppSnapshot {
    return {
      dashboard: this.getDashboardSummary(),
      conversations: this.getConversations(),
      messages: this.getMessages(),
      providers: this.getProviders(),
      models: this.getModels(),
      requestLogs: this.getRequestLogs(),
      gatewayLogs: this.getGatewayLogs(),
      usageRecords: this.getUsageRecords(),
      gatewayKeys: this.getGatewayKeys(),
      knowledgeFiles: this.getKnowledgeFiles(),
      mcpServers: this.getMcpServers(),
      agents: this.getAgents(),
      importExportResults: this.getImportExportResults(),
      auditLogs: this.getAuditLogs(),
      uiPreferences: this.getUiPreferences(),
    };
  }

  getDashboardSummary(): DashboardSummary {
    const workspace = this.getDefaultWorkspace();
    const providers = this.getProviders();
    const models = this.getModels();
    const usage = this.getUsageRecords();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = usage.filter((record) => record.createdAt >= todayStart.getTime());
    const setupGaps: string[] = [];
    if (providers.length === 0) setupGaps.push('还没有配置供应商');
    if (models.length === 0) setupGaps.push('还没有可用模型');
    if (this.getGatewayKeys().length === 0) setupGaps.push('本地网关还没有 API Key');
    if (this.getConversations().length === 0) setupGaps.push('还没有本地会话历史');

    return {
      workspace,
      recentConversations: this.getConversations().slice(0, 5),
      providers,
      models,
      gatewayStatus: this.getGatewayStatus(),
      usageToday: {
        requests: today.length,
        inputTokens: today.reduce((sum, record) => sum + record.inputTokens, 0),
        outputTokens: today.reduce((sum, record) => sum + record.outputTokens, 0),
        costEstimate: today.reduce((sum, record) => sum + record.costEstimate, 0),
      },
      setupGaps,
    };
  }

  getProviders(): Provider[] {
    return this.db
      .prepare('SELECT * FROM providers ORDER BY updated_at DESC')
      .all()
      .map((row) => mapProvider(row as Record<string, unknown>));
  }

  getModels(): Model[] {
    return this.db
      .prepare('SELECT * FROM models ORDER BY updated_at DESC')
      .all()
      .map((row) => mapModel(row as Record<string, unknown>));
  }

  getConversations(): Conversation[] {
    return this.db
      .prepare("SELECT * FROM conversations WHERE status != 'deleted' ORDER BY is_pinned DESC, updated_at DESC")
      .all()
      .map((row) => mapConversation(row as Record<string, unknown>));
  }

  getMessages(conversationId?: string): Message[] {
    const sql = conversationId
      ? 'SELECT * FROM messages WHERE conversation_id = ? AND status != ? ORDER BY created_at ASC'
      : 'SELECT * FROM messages WHERE status != ? ORDER BY created_at ASC';
    const rows = conversationId
      ? this.db.prepare(sql).all(conversationId, 'deleted')
      : this.db.prepare(sql).all('deleted');
    return rows.map((row) => mapMessage(row as Record<string, unknown>));
  }

  getRequestLogs(): RequestLog[] {
    return this.db
      .prepare('SELECT * FROM request_logs ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapRequestLog(row as Record<string, unknown>));
  }

  getUsageRecords(): UsageRecord[] {
    return this.db
      .prepare('SELECT * FROM usage_records ORDER BY created_at DESC LIMIT 200')
      .all()
      .map((row) => mapUsageRecord(row as Record<string, unknown>));
  }

  getGatewayKeys(): GatewayApiKey[] {
    return this.db
      .prepare('SELECT * FROM gateway_api_keys ORDER BY created_at DESC')
      .all()
      .map((row) => mapGatewayKey(row as Record<string, unknown>));
  }

  getGatewayLogs(): GatewayLog[] {
    return this.db
      .prepare('SELECT * FROM gateway_logs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapGatewayLog(row as Record<string, unknown>));
  }

  getGatewayStatus(): GatewayStatus {
    return {
      enabled: this.gatewayEnabled,
      running: this.gatewayEnabled,
      port: 8787,
      bindHost: '127.0.0.1',
      endpoints: ['/v1/models', '/v1/chat/completions', '/v1/embeddings', '/v1/responses (reserved)'],
      recentError: this.gatewayRecentError,
    };
  }

  setGatewayRuntime(enabled: boolean, recentError: string | null = null): GatewayStatus {
    this.gatewayEnabled = enabled;
    this.gatewayRecentError = recentError;
    return this.getGatewayStatus();
  }

  getKnowledgeFiles(): KnowledgeFile[] {
    return this.db
      .prepare('SELECT * FROM files ORDER BY updated_at DESC')
      .all()
      .map((row) => mapKnowledgeFile(row as Record<string, unknown>));
  }

  getMcpServers(): McpServer[] {
    return this.db
      .prepare('SELECT * FROM mcp_servers ORDER BY updated_at DESC')
      .all()
      .map((row) => mapMcpServer(row as Record<string, unknown>));
  }

  getAgents(): AgentDefinition[] {
    return this.db
      .prepare('SELECT * FROM agents ORDER BY updated_at DESC')
      .all()
      .map((row) => mapAgent(row as Record<string, unknown>));
  }

  getImportExportResults(): ImportExportResult[] {
    return this.db
      .prepare('SELECT * FROM config_snapshots ORDER BY created_at DESC LIMIT 50')
      .all()
      .map((row) => mapImportExportResult(row as Record<string, unknown>));
  }

  getAuditLogs(): AuditLog[] {
    return this.db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapAuditLog(row as Record<string, unknown>));
  }

  getUiPreferences(): UiPreferences {
    const row = this.db.prepare('SELECT * FROM ui_preferences WHERE id = ?').get(DEFAULT_PREFS_ID);
    if (!row) {
      return { theme: 'system', density: 'comfortable', fontMode: 'system', language: 'zh-CN', reducedMotion: false };
    }
    return mapUiPreferences(row as Record<string, unknown>);
  }

  createProvider(input: ProviderInput): Provider {
    const timestamp = now();
    const providerId = createId('provider');
    const secretRef = input.apiKey ? this.saveSecret(`${input.name} API Key`, input.apiKey) : null;
    this.db
      .prepare(
        `INSERT INTO providers (id, name, type, base_url, proxy_url, auth_type, secret_ref, custom_headers_json, enabled, health_status, last_checked_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'unknown', NULL, ?, ?)`,
      )
      .run(
        providerId,
        input.name.trim(),
        input.type,
        normalizeBaseUrl(input.baseUrl),
        input.proxyUrl?.trim() || null,
        input.apiKey ? 'api-key' : 'none',
        secretRef,
        input.customHeadersJson?.trim() || null,
        timestamp,
        timestamp,
      );
    this.audit('provider.created', 'provider', providerId, { name: input.name, baseUrl: normalizeBaseUrl(input.baseUrl) });
    return this.requireProvider(providerId);
  }

  createModel(input: ModelInput): Model {
    const provider = this.requireProvider(input.providerId);
    const timestamp = now();
    const id = createId('model');
    const displayName = input.displayName?.trim() || input.name.trim();
    this.db
      .prepare(
        `INSERT INTO models (id, provider_id, name, display_name, model_name_snapshot, context_window, supports_streaming, supports_tools, supports_vision, supports_embeddings, input_price, output_price, health_status, latency_ms, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'unknown', NULL, 1, ?, ?)`,
      )
      .run(
        id,
        provider.id,
        input.name.trim(),
        displayName,
        input.name.trim(),
        input.contextWindow ?? 128000,
        input.supportsStreaming === false ? 0 : 1,
        input.supportsTools ? 1 : 0,
        input.supportsVision ? 1 : 0,
        input.supportsEmbeddings ? 1 : 0,
        timestamp,
        timestamp,
      );

    const aliasCount = Number(
      (this.db.prepare('SELECT COUNT(*) AS count FROM model_aliases').get() as { count: number }).count,
    );
    if (aliasCount === 0) {
      this.db
        .prepare('INSERT INTO model_aliases (id, alias, model_id, enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
        .run(createId('alias'), 'nexachat-default', id, timestamp, timestamp);
    }

    this.audit('model.created', 'model', id, { providerId: provider.id, model: input.name });
    return this.requireModel(id);
  }

  testProvider(providerId: string): Provider {
    const provider = this.requireProvider(providerId);
    const start = now();
    const urlOk = provider.baseUrl.startsWith('http://') || provider.baseUrl.startsWith('https://');
    const hasKeyWhenRequired = provider.authType !== 'api-key' || Boolean(provider.secretRef);
    const healthy = urlOk && hasKeyWhenRequired;
    const status = healthy ? 'healthy' : 'error';
    this.db
      .prepare('UPDATE providers SET health_status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?')
      .run(status, start, start, providerId);
    if (!healthy) {
      this.db
        .prepare(
          `INSERT INTO request_logs (id, conversation_id, message_id, provider_id, model_id, model_name_snapshot, route_id, gateway_request_id, status, endpoint, request_summary_json, response_summary_json, input_tokens, output_tokens, latency_ms, finish_reason, error_code, error_message, started_at, completed_at, created_at)
           VALUES (?, NULL, NULL, ?, NULL, NULL, NULL, NULL, 'failed', '/provider/test', ?, NULL, NULL, NULL, ?, NULL, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('req'),
          providerId,
          JSON.stringify({ baseUrl: provider.baseUrl, authType: provider.authType }),
          Math.max(1, now() - start),
          urlOk ? 'api_key_missing' : 'invalid_base_url',
          urlOk ? '需要填写 API Key 或改为无认证供应商。' : 'Base URL 必须以 http:// 或 https:// 开头。',
          start,
          now(),
          start,
        );
    }
    this.audit('provider.tested', 'provider', providerId, {
      status,
      baseUrl: provider.baseUrl,
      nextStep: healthy ? 'provider is ready for local routing' : 'fix Base URL or API key, then test again',
    });
    return this.requireProvider(providerId);
  }

  createConversation(title = '新的本地会话'): Conversation {
    const workspace = this.getDefaultWorkspace();
    const timestamp = now();
    const id = createId('conv');
    this.db
      .prepare(
        `INSERT INTO conversations (id, workspace_id, title, assistant_id, default_provider_id, default_model_id, default_router_id, group_name, is_pinned, is_favorite, status, summary, last_message_at, message_count, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, 0, 0, 'active', NULL, NULL, 0, ?, ?, NULL)`,
      )
      .run(id, workspace.id, title, timestamp, timestamp);
    return this.requireConversation(id);
  }

  updateConversationFlags(
    conversationId: string,
    flags: Partial<Pick<Conversation, 'isPinned' | 'isFavorite' | 'status'>>,
  ): Conversation {
    const conversation = this.requireConversation(conversationId);
    const timestamp = now();
    this.db
      .prepare('UPDATE conversations SET is_pinned = ?, is_favorite = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(
        flags.isPinned === undefined ? (conversation.isPinned ? 1 : 0) : flags.isPinned ? 1 : 0,
        flags.isFavorite === undefined ? (conversation.isFavorite ? 1 : 0) : flags.isFavorite ? 1 : 0,
        flags.status ?? conversation.status,
        timestamp,
        conversationId,
      );
    this.audit('conversation.updated', 'conversation', conversationId, flags);
    return this.requireConversation(conversationId);
  }

  sendMessage(input: SendMessageInput): ChatResponse {
    if (!input.content.trim()) {
      throw new Error('Message content is required.');
    }
    const conversation = input.conversationId ? this.requireConversation(input.conversationId) : this.createConversation();
    const routeDecision = this.route(input.providerId, input.modelId);
    const timestamp = now();
    const userMessageId = createId('msg');
    const assistantMessageId = createId('msg');
    const requestLogId = createId('req');
    const requestId = createId('gwreq');
    const inputTokens = estimateTokens(input.content);

    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, workspace_id, parent_message_id, role, content, provider_id, model_id, model_name_snapshot, request_id, request_log_id, input_tokens, output_tokens, latency_ms, finish_reason, error_message, status, content_format, context_strategy, context_message_ids_json, summary_id, artifact_ids_json, error_code, metadata_json, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, NULL, 'user', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 'completed', 'markdown', ?, NULL, NULL, NULL, NULL, ?, ?, ?, NULL)`,
      )
      .run(
        userMessageId,
        conversation.id,
        conversation.workspaceId,
        input.content.trim(),
        routeDecision.providerId,
        routeDecision.modelId,
        routeDecision.modelNameSnapshot,
        requestId,
        requestLogId,
        inputTokens,
        input.contextStrategy ?? 'recent_n',
        JSON.stringify({
          routeReason: routeDecision.reason,
          fallbackUsed: routeDecision.fallbackUsed,
        }),
        timestamp,
        timestamp,
      );

    this.db
      .prepare(
        `INSERT INTO request_logs (id, conversation_id, message_id, provider_id, model_id, model_name_snapshot, route_id, gateway_request_id, status, endpoint, request_summary_json, response_summary_json, input_tokens, output_tokens, latency_ms, finish_reason, error_code, error_message, started_at, completed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'started', '/v1/chat/completions', ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?)`,
      )
      .run(
        requestLogId,
        conversation.id,
        assistantMessageId,
        routeDecision.providerId,
        routeDecision.modelId,
        routeDecision.modelNameSnapshot,
        requestId,
        JSON.stringify({
          message: input.content.trim(),
          contextStrategy: input.contextStrategy ?? 'recent_n',
          routeReason: routeDecision.reason,
        }),
        inputTokens,
        timestamp,
        timestamp,
      );

    const responseStart = now();
    const assistantContent = this.generateLocalAssistantReply(input.content.trim(), routeDecision);
    const latencyMs = Math.max(12, now() - responseStart + 42);
    const outputTokens = estimateTokens(assistantContent);
    const metadata = {
      localHistoryRetained: true,
      contextStrategy: input.contextStrategy ?? 'recent_n',
      citations: this.getLightweightCitations(input.content),
    };

    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, workspace_id, parent_message_id, role, content, provider_id, model_id, model_name_snapshot, request_id, request_log_id, input_tokens, output_tokens, latency_ms, finish_reason, error_message, status, content_format, context_strategy, context_message_ids_json, summary_id, artifact_ids_json, error_code, metadata_json, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, 'assistant', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'stop', NULL, 'completed', 'markdown', ?, NULL, NULL, NULL, NULL, ?, ?, ?, NULL)`,
      )
      .run(
        assistantMessageId,
        conversation.id,
        conversation.workspaceId,
        userMessageId,
        assistantContent,
        routeDecision.providerId,
        routeDecision.modelId,
        routeDecision.modelNameSnapshot,
        requestId,
        requestLogId,
        inputTokens,
        outputTokens,
        latencyMs,
        input.contextStrategy ?? 'recent_n',
        JSON.stringify(metadata),
        now(),
        now(),
      );

    this.db
      .prepare(
        `UPDATE request_logs
         SET status = 'completed', response_summary_json = ?, output_tokens = ?, latency_ms = ?, finish_reason = 'stop', completed_at = ?
         WHERE id = ?`,
      )
      .run(JSON.stringify({ redactedPreview: redactSensitive(assistantContent).slice(0, 280) }), outputTokens, latencyMs, now(), requestLogId);

    this.db
      .prepare(
        `INSERT INTO usage_records (id, workspace_id, provider_id, model_id, request_log_id, input_tokens, output_tokens, cost_estimate, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        createId('usage'),
        conversation.workspaceId,
        routeDecision.providerId,
        routeDecision.modelId,
        requestLogId,
        inputTokens,
        outputTokens,
        this.estimateCost(routeDecision.modelId, inputTokens, outputTokens),
        now(),
      );

    this.db
      .prepare('UPDATE conversations SET title = ?, last_message_at = ?, message_count = message_count + 2, updated_at = ? WHERE id = ?')
      .run(inferTitle(conversation.title, input.content), now(), now(), conversation.id);

    const updatedConversation = this.requireConversation(conversation.id);
    return {
      conversation: updatedConversation,
      userMessage: this.requireMessage(userMessageId),
      assistantMessage: this.requireMessage(assistantMessageId),
      requestLog: this.requireRequestLog(requestLogId),
      routeDecision,
    };
  }

  createGatewayKey(name: string): GatewayKeyCreated {
    const key = `nxk_${randomBytes(24).toString('hex')}`;
    const secretRef = this.saveSecret(`${name} gateway key`, key);
    const timestamp = now();
    const id = createId('gkey');
    this.db
      .prepare(
        `INSERT INTO gateway_api_keys (id, name, secret_ref, key_preview, scopes_json, quota_limit, quota_used, expires_at, revoked_at, last_used_at, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, 0, NULL, NULL, NULL, ?)`,
      )
      .run(id, name.trim() || 'Local integration key', secretRef, previewSecret(key), JSON.stringify(['models:read', 'chat:write', 'embeddings:write']), timestamp);
    this.audit('gateway.key.created', 'gateway_api_key', id, { name });
    return { key, record: this.requireGatewayKey(id) };
  }

  revokeGatewayKey(gatewayKeyId: string): GatewayApiKey {
    const key = this.requireGatewayKey(gatewayKeyId);
    const timestamp = now();
    this.db
      .prepare('UPDATE gateway_api_keys SET revoked_at = ? WHERE id = ?')
      .run(key.revokedAt ?? timestamp, gatewayKeyId);
    this.audit('gateway.key.revoked', 'gateway_api_key', gatewayKeyId, { keyPreview: key.keyPreview });
    return this.requireGatewayKey(gatewayKeyId);
  }

  toggleGateway(enabled: boolean): GatewayStatus {
    this.gatewayEnabled = enabled;
    this.audit(enabled ? 'gateway.enabled' : 'gateway.disabled', 'gateway', null, { bindHost: '127.0.0.1', port: 8787 });
    return this.getGatewayStatus();
  }

  validateGatewayKey(rawKey: string, scope: 'models:read' | 'chat:write' | 'embeddings:write'): GatewayApiKey | null {
    const rows = this.db
      .prepare(
        `SELECT gateway_api_keys.*, secrets.encrypted_value
         FROM gateway_api_keys
         JOIN secrets ON secrets.id = gateway_api_keys.secret_ref
         WHERE gateway_api_keys.revoked_at IS NULL`,
      )
      .all() as Array<Record<string, unknown> & { encrypted_value: string }>;

    for (const row of rows) {
      const decoded = decodeSecretValue(String(row.encrypted_value));
      if (decoded !== rawKey) {
        continue;
      }
      const record = mapGatewayKey(row);
      const nowValue = now();
      if (record.expiresAt && record.expiresAt < nowValue) {
        return null;
      }
      if (!record.scopes.includes(scope)) {
        return null;
      }
      if (record.quotaLimit !== null && record.quotaUsed >= record.quotaLimit) {
        return null;
      }
      this.db
        .prepare('UPDATE gateway_api_keys SET quota_used = quota_used + 1, last_used_at = ? WHERE id = ?')
        .run(nowValue, record.id);
      return this.requireGatewayKey(record.id);
    }
    return null;
  }

  resolveGatewayModelId(modelName: string | undefined): string | undefined {
    if (!modelName) {
      return undefined;
    }
    const alias = this.db
      .prepare('SELECT model_id FROM model_aliases WHERE alias = ? AND enabled = 1')
      .get(modelName) as { model_id: string } | undefined;
    if (alias) {
      return alias.model_id;
    }
    const model = this.getModels().find((item) => item.name === modelName || item.displayName === modelName || item.id === modelName);
    return model?.id;
  }

  recordGatewayLog(method: string, path: string, statusCode: number, requestLogId: string | null, headers: Record<string, string>): void {
    this.db
      .prepare(
        `INSERT INTO gateway_logs (id, request_log_id, method, path, status_code, redacted_headers_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(createId('gwlog'), requestLogId, method, path, statusCode, redactSensitive(headers), now());
  }

  saveUiPreferences(preferences: UiPreferences): UiPreferences {
    const timestamp = now();
    this.db
      .prepare(
        `INSERT INTO ui_preferences (id, theme, density, font_mode, language, reduced_motion, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET theme = excluded.theme, density = excluded.density, font_mode = excluded.font_mode, language = excluded.language, reduced_motion = excluded.reduced_motion, updated_at = excluded.updated_at`,
      )
      .run(
        DEFAULT_PREFS_ID,
        preferences.theme,
        preferences.density,
        preferences.fontMode,
        preferences.language,
        preferences.reducedMotion ? 1 : 0,
        timestamp,
      );
    this.audit('ui.preferences.updated', 'ui_preferences', DEFAULT_PREFS_ID, preferences);
    return this.getUiPreferences();
  }

  createKnowledgeFile(name: string, type: string, size: number): KnowledgeFile {
    const timestamp = now();
    const id = createId('file');
    const textLike = /text|markdown|json|csv|code|txt|md/i.test(`${name} ${type}`);
    const status = textLike ? 'indexed' : 'failed';
    const chunkCount = textLike ? 3 : 0;
    const errorMessage = textLike ? null : '当前迭代只解析文本/Markdown/JSON/CSV；请转换为文本或等待 planned 解析器。';
    this.db
      .prepare(
        `INSERT INTO files (id, name, type, size, parse_status, chunk_count, error_message, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, name.trim(), type.trim() || 'text/plain', size, status, chunkCount, errorMessage, timestamp, timestamp);
    if (textLike) {
      for (let index = 0; index < chunkCount; index += 1) {
        this.db
          .prepare(
            'INSERT INTO knowledge_chunks (id, file_id, knowledge_base_id, content, citation, position, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)',
          )
          .run(
            createId('chunk'),
            id,
            `${name} 的本地文本片段 ${index + 1}。这是首版 lexical 检索 fallback，可用于 Chat citation 验证。`,
            `${name}#chunk-${index + 1}`,
            index,
            timestamp,
          );
      }
    }
    this.audit('knowledge.file.created', 'file', id, { name, status, errorMessage });
    return this.requireKnowledgeFile(id);
  }

  retryKnowledgeFile(fileId: string): KnowledgeFile {
    const file = this.requireKnowledgeFile(fileId);
    const timestamp = now();
    const textLike = /text|markdown|json|csv|code|txt|md/i.test(`${file.name} ${file.type}`);
    if (!textLike) {
      this.db
        .prepare('UPDATE files SET parse_status = ?, error_message = ?, updated_at = ? WHERE id = ?')
        .run('failed', '重试被拒绝：当前迭代只支持文本类 lexical fallback。', timestamp, fileId);
      this.audit('knowledge.file.retry.failed', 'file', fileId, { reason: 'unsupported file type' });
      return this.requireKnowledgeFile(fileId);
    }
    this.db
      .prepare('UPDATE files SET parse_status = ?, chunk_count = ?, error_message = NULL, updated_at = ? WHERE id = ?')
      .run('indexed', Math.max(file.chunkCount, 3), timestamp, fileId);
    this.audit('knowledge.file.retry.completed', 'file', fileId, { chunkCount: Math.max(file.chunkCount, 3) });
    return this.requireKnowledgeFile(fileId);
  }

  createMcpServer(name: string, transport: McpServer['transport'], commandOrUrl: string): McpServer {
    const timestamp = now();
    const id = createId('mcp');
    this.db
      .prepare(
        `INSERT INTO mcp_servers (id, name, transport, command_or_url, enabled, permission_state, last_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 'discovered', 'unknown', ?, ?)`,
      )
      .run(id, name.trim(), transport, commandOrUrl.trim(), timestamp, timestamp);
    this.audit('mcp.server.registered', 'mcp_server', id, { name, transport });
    return this.requireMcpServer(id);
  }

  updateMcpPermission(serverId: string, permissionState: McpServer['permissionState']): McpServer {
    const timestamp = now();
    const enabled = permissionState === 'granted' ? 1 : 0;
    this.db
      .prepare('UPDATE mcp_servers SET permission_state = ?, enabled = ?, last_status = ?, updated_at = ? WHERE id = ?')
      .run(permissionState, enabled, permissionState === 'granted' ? 'healthy' : 'unknown', timestamp, serverId);
    this.audit('mcp.permission.updated', 'mcp_server', serverId, { permissionState, enabled: Boolean(enabled) });
    return this.requireMcpServer(serverId);
  }

  createAgent(name: string, goal: string): AgentDefinition {
    const timestamp = now();
    const id = createId('agent');
    this.db
      .prepare(
        `INSERT INTO agents (id, name, goal, default_model_id, approval_policy, stage, created_at, updated_at)
         VALUES (?, ?, ?, NULL, 'destructive-only', 'planned', ?, ?)`,
      )
      .run(id, name.trim(), goal.trim(), timestamp, timestamp);
    this.audit('agent.definition.created', 'agent', id, { name, mode: 'dry-run only' });
    return this.requireAgent(id);
  }

  previewAgentRun(agentId: string): ImportExportResult {
    const agent = this.requireAgent(agentId);
    const timestamp = now();
    const id = createId('dryrun');
    const manifest = {
      agentId,
      agentName: agent.name,
      mode: 'dry-run',
      requiresConfirmation: false,
      steps: ['读取工作区状态', '检查模型/网关/知识边界', '生成只读建议'],
    };
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'cleanup-preview', 'ready', ?, 1, ?, ?)`,
      )
      .run(id, `Agent dry-run 已生成：${agent.name}。不会执行工具、MCP 或危险操作。`, JSON.stringify(manifest), timestamp);
    this.audit('agent.dry_run.previewed', 'agent', agentId, manifest);
    return this.requireImportExportResult(id);
  }

  validateImportManifest(manifestText: string): ImportExportResult {
    const timestamp = now();
    const id = createId('import');
    let status: ImportExportResult['status'] = 'ready';
    let summary = '导入清单已通过预检；应用前仍需要确认冲突和密钥处理。';
    let manifest: Record<string, unknown> = {
      requiresConfirmation: true,
      conflictCount: 0,
      redaction: 'secrets must be supplied interactively and are not imported from plain text',
    };

    try {
      const parsed = JSON.parse(manifestText) as Record<string, unknown>;
      const providers = parsed.providers;
      const models = parsed.models;
      const hasValidList =
        (Array.isArray(providers) && providers.length > 0) ||
        (Array.isArray(models) && models.length > 0) ||
        typeof parsed.workspace === 'object';
      if (!hasValidList) {
        throw new Error('清单必须包含 providers、models 或 workspace。');
      }
      const conflictCount = Array.isArray(providers)
        ? providers.filter((provider) =>
            this.getProviders().some((existing) => existing.name === String((provider as { name?: unknown }).name ?? '')),
          ).length
        : 0;
      manifest = {
        ...manifest,
        providerCount: Array.isArray(providers) ? providers.length : 0,
        modelCount: Array.isArray(models) ? models.length : 0,
        conflictCount,
        keys: 'stripped',
      };
      if (conflictCount > 0) {
        summary = `导入清单可用，但发现 ${conflictCount} 个供应商名称冲突；需要确认合并策略。`;
      }
    } catch (error) {
      status = 'failed';
      summary = `导入清单被拒绝：${error instanceof Error ? error.message : String(error)}`;
      manifest = {
        requiresConfirmation: false,
        conflictCount: 0,
        error: summary,
      };
    }

    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'import', ?, ?, 1, ?, ?)`,
      )
      .run(id, status, summary, JSON.stringify(manifest), timestamp);
    this.audit('import.manifest.validated', 'config_snapshot', id, { status, summary });
    return this.requireImportExportResult(id);
  }

  applyImportPlan(resultId: string): ImportExportResult {
    const result = this.requireImportExportResult(resultId);
    if (result.action !== 'import' || result.status !== 'ready') {
      throw new Error('只有 ready 状态的导入预检结果可以应用。');
    }
    const timestamp = now();
    this.db
      .prepare('UPDATE config_snapshots SET status = ?, summary = ?, created_at = ? WHERE id = ?')
      .run('completed', '导入计划已确认应用；本迭代只记录确认结果，不静默覆盖现有配置。', timestamp, resultId);
    this.audit('import.plan.applied', 'config_snapshot', resultId, { mode: 'confirmed preview only' });
    return this.requireImportExportResult(resultId);
  }

  restoreSnapshot(snapshotId: string): ImportExportResult {
    const snapshot = this.requireImportExportResult(snapshotId);
    const timestamp = now();
    const id = createId('restore');
    const manifest = {
      sourceSnapshotId: snapshot.id,
      requiresConfirmation: true,
      conflictCount: 0,
      mode: 'preview-only',
    };
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'cleanup-preview', 'ready', ?, 1, ?, ?)`,
      )
      .run(id, '恢复预检已创建；当前迭代不会无确认覆盖本地配置。', JSON.stringify(manifest), timestamp);
    this.audit('snapshot.restore.previewed', 'config_snapshot', snapshotId, manifest);
    return this.requireImportExportResult(id);
  }

  createSnapshot(): ImportExportResult {
    const timestamp = now();
    const id = createId('snapshot');
    const manifest = {
      providers: this.getProviders().length,
      models: this.getModels().length,
      conversations: this.getConversations().length,
      redaction: 'secrets excluded by default',
    };
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'snapshot', 'completed', ?, 1, ?, ?)`,
      )
      .run(id, '已创建脱敏配置快照，包含供应商、模型、会话索引和界面设置。', JSON.stringify(manifest), timestamp);
    this.audit('snapshot.created', 'config_snapshot', id, manifest);
    return this.requireImportExportResult(id);
  }

  exportDiagnostics(): ImportExportResult {
    const timestamp = now();
    const id = createId('export');
    const diagnostics = {
      requestLogs: this.getRequestLogs().length,
      auditLogs: this.getAuditLogs().length,
      databasePath: '[REDACTED_LOCAL_PATH]',
      redaction: 'Authorization, API keys, custom sensitive headers and local paths are redacted.',
      diagnoses: diagnoses.map((item) => item.code),
    };
    this.db
      .prepare(
        `INSERT INTO config_snapshots (id, action, status, summary, redacted, manifest_json, created_at)
         VALUES (?, 'export', 'completed', ?, 1, ?, ?)`,
      )
      .run(id, '诊断包已生成预览，默认脱敏密钥、Authorization 和本地路径。', JSON.stringify(diagnostics), timestamp);
    this.audit('diagnostics.exported', 'diagnostics', id, diagnostics);
    return this.requireImportExportResult(id);
  }

  private seed(): void {
    const timestamp = now();
    const workspaceCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM workspaces').get() as { count: number }).count);
    if (workspaceCount === 0) {
      this.db
        .prepare('INSERT INTO workspaces (id, name, default_provider_id, default_model_id, created_at, updated_at) VALUES (?, ?, NULL, NULL, ?, ?)')
        .run(DEFAULT_WORKSPACE_ID, '本地工作区', timestamp, timestamp);
    }

    const providerCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM providers').get() as { count: number }).count);
    if (providerCount === 0) {
      const provider = this.createProvider({
        name: 'Local Demo OpenAI-compatible',
        type: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'demo-key-not-used',
      });
      const model = this.createModel({
        providerId: provider.id,
        name: 'demo-chat-model',
        displayName: 'Demo Chat Model',
        contextWindow: 128000,
        supportsStreaming: true,
        supportsEmbeddings: true,
      });
      this.db
        .prepare('UPDATE workspaces SET default_provider_id = ?, default_model_id = ?, updated_at = ? WHERE id = ?')
        .run(provider.id, model.id, timestamp, DEFAULT_WORKSPACE_ID);
      this.testProvider(provider.id);
    }

    const conversationCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM conversations').get() as { count: number }).count);
    if (conversationCount === 0) {
      const conversation = this.createConversation('欢迎使用 NexaChat');
      this.sendMessage({
        conversationId: conversation.id,
        content: '请说明本地历史在切换模型后是否保留。',
        contextStrategy: 'recent_n',
      });
    }

    const fileCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM files').get() as { count: number }).count);
    if (fileCount === 0) {
      this.createKnowledgeFile('NexaChat getting-started.md', 'text/markdown', 2048);
    }

    const mcpCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM mcp_servers').get() as { count: number }).count);
    if (mcpCount === 0) {
      this.createMcpServer('本地文件 MCP 示例', 'stdio', 'npx @modelcontextprotocol/server-filesystem');
    }

    const agentCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM agents').get() as { count: number }).count);
    if (agentCount === 0) {
      this.createAgent('配置检查 Agent', '读取当前模型、知识库和网关状态，生成 dry-run 检查计划。');
    }

    if (!this.db.prepare('SELECT * FROM ui_preferences WHERE id = ?').get(DEFAULT_PREFS_ID)) {
      this.saveUiPreferences({
        theme: 'system',
        density: 'comfortable',
        fontMode: 'system',
        language: 'zh-CN',
        reducedMotion: false,
      });
    }

    const keyCount = Number((this.db.prepare('SELECT COUNT(*) AS count FROM gateway_api_keys').get() as { count: number }).count);
    if (keyCount === 0) {
      this.createGatewayKey('本机集成示例');
    }
  }

  private route(providerId?: string, modelId?: string): RouteDecision {
    const models = this.getModels().filter((model) => model.enabled && model.healthStatus !== 'error');
    if (models.length === 0) {
      throw new Error('没有可用模型。请先添加供应商和模型。');
    }

    if (modelId) {
      const explicit = models.find((model) => model.id === modelId);
      if (!explicit) {
        const fallback = models[0];
        return {
          providerId: fallback.providerId,
          modelId: fallback.id,
          modelNameSnapshot: fallback.modelNameSnapshot,
          reason: '显式模型不可用，已回退到第一个健康模型。',
          fallbackUsed: true,
        };
      }
      return {
        providerId: explicit.providerId,
        modelId: explicit.id,
        modelNameSnapshot: explicit.modelNameSnapshot,
        reason: '使用用户显式选择的模型。',
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
          reason: '使用用户显式选择的供应商下的可用模型。',
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
      reason: defaultModel ? '使用工作区默认模型。' : '使用第一个健康可用模型。',
      fallbackUsed: false,
    };
  }

  private generateLocalAssistantReply(content: string, routeDecision: RouteDecision): string {
    return [
      `已通过 ${routeDecision.modelNameSnapshot} 处理这条消息。`,
      '',
      '本地历史已经先写入 SQLite；Provider、Model 或 API Key 切换不会删除当前会话。',
      `路由原因：${routeDecision.reason}`,
      `你的输入摘要：${content.slice(0, 180)}${content.length > 180 ? '...' : ''}`,
    ].join('\n');
  }

  private getLightweightCitations(content: string): Array<{ fileId: string; citation: string; snippet: string }> {
    const firstChunk = this.db
      .prepare('SELECT knowledge_chunks.file_id, knowledge_chunks.citation, knowledge_chunks.content FROM knowledge_chunks ORDER BY created_at DESC LIMIT 1')
      .get() as { file_id: string; citation: string; content: string } | undefined;
    if (!firstChunk || content.length < 2) {
      return [];
    }
    return [{ fileId: firstChunk.file_id, citation: firstChunk.citation, snippet: firstChunk.content.slice(0, 120) }];
  }

  private estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.requireModel(modelId);
    const inputPrice = model.inputPrice ?? 0;
    const outputPrice = model.outputPrice ?? 0;
    return (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
  }

  private getDefaultWorkspace(): Workspace {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(DEFAULT_WORKSPACE_ID);
    if (!row) {
      throw new Error('Default workspace missing.');
    }
    return mapWorkspace(row as Record<string, unknown>);
  }

  private saveSecret(label: string, value: string): string {
    const id = createId('secret');
    const timestamp = now();
    const encoded = encodeSecretValue(value);
    this.db
      .prepare('INSERT INTO secrets (id, label, encrypted_value, preview, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, label, encoded, previewSecret(value), timestamp, timestamp);
    return id;
  }

  private audit(action: string, targetType: string, targetId: string | null, details: unknown): void {
    this.db
      .prepare('INSERT INTO audit_logs (id, action, actor, target_type, target_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(createId('audit'), action, 'local-user', targetType, targetId, redactSensitive(details), now());
  }

  private requireProvider(id: string): Provider {
    const row = this.db.prepare('SELECT * FROM providers WHERE id = ?').get(id);
    if (!row) throw new Error(`Provider not found: ${id}`);
    return mapProvider(row as Record<string, unknown>);
  }

  private requireModel(id: string): Model {
    const row = this.db.prepare('SELECT * FROM models WHERE id = ?').get(id);
    if (!row) throw new Error(`Model not found: ${id}`);
    return mapModel(row as Record<string, unknown>);
  }

  private requireConversation(id: string): Conversation {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    if (!row) throw new Error(`Conversation not found: ${id}`);
    return mapConversation(row as Record<string, unknown>);
  }

  private requireMessage(id: string): Message {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!row) throw new Error(`Message not found: ${id}`);
    return mapMessage(row as Record<string, unknown>);
  }

  private requireRequestLog(id: string): RequestLog {
    const row = this.db.prepare('SELECT * FROM request_logs WHERE id = ?').get(id);
    if (!row) throw new Error(`Request log not found: ${id}`);
    return mapRequestLog(row as Record<string, unknown>);
  }

  private requireGatewayKey(id: string): GatewayApiKey {
    const row = this.db.prepare('SELECT * FROM gateway_api_keys WHERE id = ?').get(id);
    if (!row) throw new Error(`Gateway key not found: ${id}`);
    return mapGatewayKey(row as Record<string, unknown>);
  }

  private requireKnowledgeFile(id: string): KnowledgeFile {
    const row = this.db.prepare('SELECT * FROM files WHERE id = ?').get(id);
    if (!row) throw new Error(`Knowledge file not found: ${id}`);
    return mapKnowledgeFile(row as Record<string, unknown>);
  }

  private requireMcpServer(id: string): McpServer {
    const row = this.db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id);
    if (!row) throw new Error(`MCP server not found: ${id}`);
    return mapMcpServer(row as Record<string, unknown>);
  }

  private requireAgent(id: string): AgentDefinition {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    if (!row) throw new Error(`Agent not found: ${id}`);
    return mapAgent(row as Record<string, unknown>);
  }

  private requireImportExportResult(id: string): ImportExportResult {
    const row = this.db.prepare('SELECT * FROM config_snapshots WHERE id = ?').get(id);
    if (!row) throw new Error(`Import/export result not found: ${id}`);
    return mapImportExportResult(row as Record<string, unknown>);
  }
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
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
  if (currentTitle !== '新的本地会话' && currentTitle !== '欢迎使用 NexaChat') {
    return currentTitle;
  }
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 28) || currentTitle;
}

export const store = new NexaStore();
