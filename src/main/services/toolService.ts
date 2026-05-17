import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { safeStorage } from 'electron';
import type { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../database/connection.js';
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

import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

export function ToolService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ToolService extends Base {
  getMcpServers(): McpServer[] {
    return this.repositories.tool.listMcpServers();
  }


  getAgents(): AgentDefinition[] {
    return this.repositories.tool.listAgents();
  }


  getTools(): ToolDefinition[] {
    return this.repositories.tool.listTools();
  }


  getExecutionRuns(): ExecutionRun[] {
    return this.repositories.tool.listExecutionRuns();
  }


  getExecutionSteps(runId?: string): ExecutionStep[] {
    return this.repositories.tool.listExecutionSteps(runId);
  }


  getExecutionTraceEvents(runId?: string): ExecutionTraceEvent[] {
    return this.repositories.tool.listExecutionTraceEvents(runId);
  }


  getApprovalRequests(): ApprovalRequest[] {
    return this.repositories.tool.listApprovalRequests();
  }


  createMcpServer(name: string, transport: McpServer['transport'], commandOrUrl: string): McpServer {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.mcpWrite, 'mcp_server', null);
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
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.mcpPermissionWrite, 'mcp_server', serverId);
    const timestamp = now();
    const enabled = permissionState === 'granted' ? 1 : 0;
    this.db
      .prepare('UPDATE mcp_servers SET permission_state = ?, enabled = ?, last_status = ?, updated_at = ? WHERE id = ?')
      .run(permissionState, enabled, permissionState === 'granted' ? 'warning' : 'unknown', timestamp, serverId);
    this.audit('mcp.permission.updated', 'mcp_server', serverId, { permissionState, enabled: Boolean(enabled) });
    return this.requireMcpServer(serverId);
  }


  createAgent(name: string, goal: string): AgentDefinition {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.agentWrite, 'agent', null);
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


  previewAgentRun(agentId: string): ExecutionRun {
    return this.startExecutionRun({
      kind: 'agent',
      mode: 'preview',
      agentId,
      toolId: EXECUTION_TOOL_IDS.statusRead,
      inputJson: '{}',
    });
  }


  startExecutionRun(input: ExecutionStartInput): ExecutionRun {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.executionRun, 'execution_run', null);
    const normalized = normalizeExecutionStartInput(input);
    const timestamp = now();
    const runId = createId('run');
    const agent = normalized.agentId ? this.requireAgent(normalized.agentId) : null;
    const tool = normalized.toolId ? this.requireTool(normalized.toolId) : this.requireTool(EXECUTION_TOOL_IDS.statusRead);
    const requiresApproval = normalized.mode === 'execute' && tool.requiresApproval;
    const initialStatus: ExecutionRun['status'] = requiresApproval ? 'waiting_approval' : 'completed';
    const mode = normalized.mode ?? 'preview';
    const title = agent
      ? t('tools.execution.title.agent', { agent: agent.name })
      : normalized.kind === 'workflow'
        ? t('tools.execution.title.workflow')
        : t('tools.execution.title.tool', { tool: tool.name });
    const output = requiresApproval ? null : this.executeFixtureTool(tool.id, normalized.inputJson ?? '{}');

    this.db
      .prepare(
        `INSERT INTO execution_runs (id, kind, status, mode, title, agent_id, tool_id, mcp_server_id, workflow_id, input_json, output_json, error_message, approval_status, sandbox_mode, created_at, updated_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
      )
      .run(
        runId,
        normalized.kind,
        initialStatus,
        mode,
        title,
        agent?.id ?? null,
        tool.id,
        normalized.mcpServerId ?? null,
        normalized.workflowId ?? null,
        normalized.inputJson ?? '{}',
        output,
        requiresApproval ? 'pending' : null,
        tool.riskLevel === 'read' ? 'read-only' : 'fixture-only',
        timestamp,
        timestamp,
        requiresApproval ? null : timestamp,
      );

    this.createExecutionStep({
      runId,
      kind: 'plan',
      title: agent ? t('tools.agent.dryRun.step.read') : t('tools.execution.step.plan'),
      status: 'completed',
      position: 1,
      timestamp,
    });
    this.addTrace(runId, null, 'run_planned', title, { kind: normalized.kind, mode });
    this.createExecutionStep({
      runId,
      kind: 'permission',
      title: t('tools.execution.step.permission'),
      status: 'completed',
      toolId: tool.id,
      position: 2,
      timestamp,
    });
    this.addTrace(runId, null, 'permission_checked', t('tools.execution.trace.permissionChecked'), {
      permissionKey: tool.permissionKey,
      riskLevel: tool.riskLevel,
      requiresApproval,
    });

    if (requiresApproval) {
      const stepId = this.createExecutionStep({
        runId,
        kind: 'approval',
        title: t('tools.execution.step.approval'),
        status: 'waiting_approval',
        toolId: tool.id,
        position: 3,
        timestamp,
      });
      const approvalId = createId('approval');
      this.db
        .prepare(
          `INSERT INTO approval_requests (id, run_id, step_id, status, requested_action, risk_level, reason, decision_reason, decided_at, created_at, expires_at)
           VALUES (?, ?, ?, 'pending', ?, ?, ?, NULL, NULL, ?, NULL)`,
        )
        .run(approvalId, runId, stepId, tool.name, tool.riskLevel, t('tools.execution.approval.reason', { tool: tool.name }), timestamp);
      this.addTrace(runId, stepId, 'approval_requested', t('tools.execution.trace.approvalRequested'), { approvalId, toolId: tool.id });
    } else {
      const stepId = this.createExecutionStep({
        runId,
        kind: 'tool',
        title: tool.name,
        status: 'completed',
        toolId: tool.id,
        outputJson: output,
        position: 3,
        timestamp,
      });
      this.addTrace(runId, stepId, 'tool_called', t('tools.execution.trace.toolCalled'), { toolId: tool.id });
      this.addTrace(runId, stepId, 'step_completed', t('tools.execution.trace.stepCompleted'), { outputJson: output });
      this.addTrace(runId, null, 'run_completed', t('tools.execution.trace.runCompleted'), { runId });
    }

    this.audit('execution.run.started', 'execution_run', runId, { kind: normalized.kind, mode, toolId: tool.id });
    return this.requireExecutionRun(runId);
  }


  decideApproval(input: ApprovalDecisionInput): ExecutionRun {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.executionApprove, 'approval_request', input.approvalId);
    const normalized = normalizeApprovalDecision(input);
    const approval = this.requireApprovalRequest(normalized.approvalId);
    const timestamp = now();
    if (approval.status !== 'pending') {
      return this.requireExecutionRun(approval.runId);
    }
    const run = this.requireExecutionRun(approval.runId);
    const tool = run.toolId ? this.requireTool(run.toolId) : this.requireTool(EXECUTION_TOOL_IDS.statusRead);
    const approved = normalized.decision === 'approved';
    const decisionReason = normalized.reason ?? null;
    this.db
      .prepare('UPDATE approval_requests SET status = ?, decision_reason = ?, decided_at = ? WHERE id = ?')
      .run(normalized.decision, decisionReason, timestamp, approval.id);
    if (approval.stepId) {
      this.db
        .prepare('UPDATE execution_steps SET status = ?, output_json = ?, error_message = ?, completed_at = ?, updated_at = ? WHERE id = ?')
        .run(approved ? 'completed' : 'cancelled', JSON.stringify({ decision: normalized.decision }), approved ? null : decisionReason, timestamp, timestamp, approval.stepId);
    }
    this.addTrace(run.id, approval.stepId, 'approval_decided', t('tools.execution.trace.approvalDecided'), normalized);

    if (!approved) {
      this.db
        .prepare('UPDATE execution_runs SET status = ?, approval_status = ?, error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?')
        .run('cancelled', 'denied', decisionReason ?? t('tools.execution.error.denied'), timestamp, timestamp, run.id);
      this.addTrace(run.id, null, 'run_cancelled', t('tools.execution.trace.runCancelled'), { approvalId: approval.id });
      this.audit('execution.approval.denied', 'execution_run', run.id, { approvalId: approval.id, reason: normalized.reason });
      return this.requireExecutionRun(run.id);
    }

    const output = this.executeFixtureTool(tool.id, run.inputJson ?? '{}');
    const toolStepId = this.createExecutionStep({
      runId: run.id,
      kind: 'tool',
      title: tool.name,
      status: 'completed',
      toolId: tool.id,
      inputJson: run.inputJson,
      outputJson: output,
      position: this.getExecutionSteps(run.id).length + 1,
      timestamp,
    });
    this.db
      .prepare('UPDATE execution_runs SET status = ?, output_json = ?, approval_status = ?, updated_at = ?, completed_at = ? WHERE id = ?')
      .run('completed', output, 'approved', timestamp, timestamp, run.id);
    this.addTrace(run.id, toolStepId, 'tool_called', t('tools.execution.trace.toolCalled'), { toolId: tool.id });
    this.addTrace(run.id, toolStepId, 'step_completed', t('tools.execution.trace.stepCompleted'), { outputJson: output });
    this.addTrace(run.id, null, 'run_completed', t('tools.execution.trace.runCompleted'), { runId: run.id });
    this.audit('execution.approval.approved', 'execution_run', run.id, { approvalId: approval.id, toolId: tool.id });
    return this.requireExecutionRun(run.id);
  }

  };
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
