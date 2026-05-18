import type {
  CancelMessageInput,
  ChatResponse,
  ApprovalDecisionInput,
  CompareModelsInput,
  ExecutionStartInput,
  EvalRunInput,
  ExportConversationInput,
  FeedbackCreateInput,
  GatewayKeyCreateInput,
  GatewayKeyRotateInput,
  GatewayKeyUpdateInput,
  KnowledgeDeleteInput,
  KnowledgeImportInput,
  KnowledgeRebuildInput,
  KnowledgeRetrievalInput,
  McpServer,
  ModelInput,
  ProviderDiscoveryRequest,
  ProviderInput,
  ProviderSaveFromDiscoveryRequest,
  RegenerateMessageInput,
  RetryMessageInput,
  SendMessageInput,
  UiPreferences,
  ImportPlanApplyOptions,
  RestoreSnapshotOptions,
  DataBackupCreateInput,
  DataExportOptions,
  DataRestorePreflightInput,
  DataRollbackInput,
  ObservabilityPrivacySettings,
  ObservabilityQueryInput,
  AuditLogPageInput,
  ConversationPageInput,
  GatewayLogPageInput,
  KnowledgeChunkPageInput,
  KnowledgeFilePageInput,
  MessagePageInput,
  UsageTrendInput,
} from './types.js';

export const IPC_CHANNELS = {
  appGetSnapshot: 'app:getSnapshot',
  providerDiscover: 'provider:discover',
  providerSaveFromDiscovery: 'provider:saveFromDiscovery',
  providerCreate: 'provider:create',
  providerDelete: 'provider:delete',
  providerModelsFetch: 'provider:models:fetch',
  providerTest: 'provider:test',
  modelCreate: 'model:create',
  chatCreateConversation: 'chat:createConversation',
  chatSendMessage: 'chat:sendMessage',
  chatRetryMessage: 'chat:retryMessage',
  chatRegenerateMessage: 'chat:regenerateMessage',
  chatCancelMessage: 'chat:cancelMessage',
  chatCompareModels: 'chat:compareModels',
  chatExportConversation: 'chat:exportConversation',
  chatListConversations: 'chat:listConversations',
  chatListMessages: 'chat:listMessages',
  chatUpdateConversationFlags: 'chat:updateConversationFlags',
  gatewayLogsList: 'gateway:logs:list',
  auditLogsList: 'audit:logs:list',
  knowledgeFilesList: 'knowledge:files:list',
  knowledgeChunksList: 'knowledge:chunks:list',
  usageTrendGet: 'usage:trend:get',
  taskCancel: 'task:cancel',
  gatewayCreateKey: 'gateway:createKey',
  gatewayUpdateKey: 'gateway:updateKey',
  gatewayRotateKey: 'gateway:rotateKey',
  gatewayRevokeKey: 'gateway:revokeKey',
  gatewayToggle: 'gateway:toggle',
  settingsSaveUiPreferences: 'settings:saveUiPreferences',
  knowledgeCreateFile: 'knowledge:createFile',
  knowledgeRetryFile: 'knowledge:retryFile',
  knowledgeRebuildFile: 'knowledge:rebuildFile',
  knowledgeDeleteFile: 'knowledge:deleteFile',
  knowledgePreviewRetrieval: 'knowledge:previewRetrieval',
  mcpCreateServer: 'mcp:createServer',
  mcpUpdatePermission: 'mcp:updatePermission',
  agentCreate: 'agent:create',
  agentPreviewRun: 'agent:previewRun',
  executionStartRun: 'execution:startRun',
  executionDecideApproval: 'execution:decideApproval',
  dataValidateImportManifest: 'data:validateImportManifest',
  dataApplyImportPlan: 'data:applyImportPlan',
  dataRestoreSnapshot: 'data:restoreSnapshot',
  dataCreateSnapshot: 'data:createSnapshot',
  dataExportDiagnostics: 'data:exportDiagnostics',
  dataExportPackage: 'data:exportPackage',
  dataCreateEncryptedBackup: 'data:createEncryptedBackup',
  dataCreateRestorePreflight: 'data:createRestorePreflight',
  dataApplyRollback: 'data:applyRollback',
  observabilityQuery: 'observability:query',
  observabilityCreateFeedback: 'observability:createFeedback',
  observabilityRunEval: 'observability:runEval',
  observabilitySavePrivacy: 'observability:savePrivacy',
  observabilityExport: 'observability:export',
  auditSearch: 'audit:search',
  auditVerify: 'audit:verify',
  auditExport: 'audit:export',
  systemOpenLogs: 'system:openLogs',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export const IPC_EVENT_CHANNELS = {
  chatStream: 'chat:stream:event',
  taskProgress: 'task:progress:event',
} as const;

export type IpcEventChannel = (typeof IPC_EVENT_CHANNELS)[keyof typeof IPC_EVENT_CHANNELS];

export type IpcEventPhase =
  | 'queued'
  | 'started'
  | 'sending'
  | 'streaming'
  | 'processing'
  | 'writing'
  | 'completed'
  | 'failed'
  | 'canceled';

export type ChatStreamEventType =
  | 'chat.stream.started'
  | 'chat.stream.chunk'
  | 'chat.stream.progress'
  | 'chat.stream.completed'
  | 'chat.stream.failed'
  | 'chat.stream.canceled';

export type TaskEventType =
  | 'task.started'
  | 'task.progress'
  | 'task.completed'
  | 'task.failed'
  | 'task.canceled';

export interface IpcEventBase {
  type: ChatStreamEventType | TaskEventType;
  phase: IpcEventPhase;
  timestamp: number;
  progress?: number;
  message?: string;
  error?: string;
}

export interface ChatStreamEventPayload extends IpcEventBase {
  type: ChatStreamEventType;
  requestId: string;
  clientRequestId?: string;
  conversationId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  chunk?: string;
  visibleContent?: string;
  response?: ChatResponse;
  fallback?: boolean;
}

export interface TaskEventPayload extends IpcEventBase {
  type: TaskEventType;
  taskId: string;
  taskKind: 'audit.verify' | 'data.backup' | 'data.restore-preflight' | 'knowledge.import' | 'knowledge.rebuild' | 'compare.models' | string;
  entityId?: string;
}

export type IpcEventPayloads = {
  [IPC_EVENT_CHANNELS.chatStream]: ChatStreamEventPayload;
  [IPC_EVENT_CHANNELS.taskProgress]: TaskEventPayload;
};

export const IPC_EVENT_CHANNEL_LIST = Object.values(IPC_EVENT_CHANNELS);

export type IpcInvokeArgs = {
  [IPC_CHANNELS.appGetSnapshot]: [];
  [IPC_CHANNELS.providerDiscover]: [ProviderDiscoveryRequest];
  [IPC_CHANNELS.providerSaveFromDiscovery]: [ProviderSaveFromDiscoveryRequest];
  [IPC_CHANNELS.providerCreate]: [ProviderInput];
  [IPC_CHANNELS.providerDelete]: [string];
  [IPC_CHANNELS.providerModelsFetch]: [string];
  [IPC_CHANNELS.providerTest]: [string];
  [IPC_CHANNELS.modelCreate]: [ModelInput];
  [IPC_CHANNELS.chatCreateConversation]: [string?];
  [IPC_CHANNELS.chatSendMessage]: [SendMessageInput];
  [IPC_CHANNELS.chatRetryMessage]: [RetryMessageInput];
  [IPC_CHANNELS.chatRegenerateMessage]: [RegenerateMessageInput];
  [IPC_CHANNELS.chatCancelMessage]: [CancelMessageInput];
  [IPC_CHANNELS.chatCompareModels]: [CompareModelsInput];
  [IPC_CHANNELS.chatExportConversation]: [ExportConversationInput];
  [IPC_CHANNELS.chatListConversations]: [ConversationPageInput?];
  [IPC_CHANNELS.chatListMessages]: [MessagePageInput];
  [IPC_CHANNELS.chatUpdateConversationFlags]: [
    string,
    Partial<{
      isPinned: boolean;
      isFavorite: boolean;
      status: 'active' | 'archived' | 'deleted';
    }>,
  ];
  [IPC_CHANNELS.gatewayLogsList]: [GatewayLogPageInput?];
  [IPC_CHANNELS.auditLogsList]: [AuditLogPageInput?];
  [IPC_CHANNELS.knowledgeFilesList]: [KnowledgeFilePageInput?];
  [IPC_CHANNELS.knowledgeChunksList]: [KnowledgeChunkPageInput?];
  [IPC_CHANNELS.usageTrendGet]: [UsageTrendInput?];
  [IPC_CHANNELS.taskCancel]: [string];
  [IPC_CHANNELS.gatewayCreateKey]: [GatewayKeyCreateInput];
  [IPC_CHANNELS.gatewayUpdateKey]: [GatewayKeyUpdateInput];
  [IPC_CHANNELS.gatewayRotateKey]: [GatewayKeyRotateInput];
  [IPC_CHANNELS.gatewayRevokeKey]: [string];
  [IPC_CHANNELS.gatewayToggle]: [boolean];
  [IPC_CHANNELS.settingsSaveUiPreferences]: [UiPreferences];
  [IPC_CHANNELS.knowledgeCreateFile]: [KnowledgeImportInput];
  [IPC_CHANNELS.knowledgeRetryFile]: [KnowledgeRebuildInput];
  [IPC_CHANNELS.knowledgeRebuildFile]: [KnowledgeRebuildInput];
  [IPC_CHANNELS.knowledgeDeleteFile]: [KnowledgeDeleteInput];
  [IPC_CHANNELS.knowledgePreviewRetrieval]: [KnowledgeRetrievalInput];
  [IPC_CHANNELS.mcpCreateServer]: [string, McpServer['transport'], string];
  [IPC_CHANNELS.mcpUpdatePermission]: [string, McpServer['permissionState']];
  [IPC_CHANNELS.agentCreate]: [string, string];
  [IPC_CHANNELS.agentPreviewRun]: [string];
  [IPC_CHANNELS.executionStartRun]: [ExecutionStartInput];
  [IPC_CHANNELS.executionDecideApproval]: [ApprovalDecisionInput];
  [IPC_CHANNELS.dataValidateImportManifest]: [string];
  [IPC_CHANNELS.dataApplyImportPlan]: [string, ImportPlanApplyOptions?];
  [IPC_CHANNELS.dataRestoreSnapshot]: [string, RestoreSnapshotOptions?];
  [IPC_CHANNELS.dataCreateSnapshot]: [];
  [IPC_CHANNELS.dataExportDiagnostics]: [];
  [IPC_CHANNELS.dataExportPackage]: [DataExportOptions?];
  [IPC_CHANNELS.dataCreateEncryptedBackup]: [DataBackupCreateInput];
  [IPC_CHANNELS.dataCreateRestorePreflight]: [DataRestorePreflightInput];
  [IPC_CHANNELS.dataApplyRollback]: [DataRollbackInput];
  [IPC_CHANNELS.observabilityQuery]: [ObservabilityQueryInput?];
  [IPC_CHANNELS.observabilityCreateFeedback]: [FeedbackCreateInput];
  [IPC_CHANNELS.observabilityRunEval]: [EvalRunInput];
  [IPC_CHANNELS.observabilitySavePrivacy]: [Partial<ObservabilityPrivacySettings>];
  [IPC_CHANNELS.observabilityExport]: [ObservabilityQueryInput?];
  [IPC_CHANNELS.auditSearch]: [string?];
  [IPC_CHANNELS.auditVerify]: [];
  [IPC_CHANNELS.auditExport]: [];
  [IPC_CHANNELS.systemOpenLogs]: [];
};

export const IPC_CHANNEL_LIST = Object.values(IPC_CHANNELS);

export function isIpcChannel(value: string): value is IpcChannel {
  return (IPC_CHANNEL_LIST as string[]).includes(value);
}

export function isIpcEventChannel(value: string): value is IpcEventChannel {
  return (IPC_EVENT_CHANNEL_LIST as string[]).includes(value);
}

export function assertIpcPayload<C extends IpcChannel>(channel: C, args: unknown[]): asserts args is IpcInvokeArgs[C] {
  const expected = ipcPayloadArity[channel];
  if (!expected) {
    throw new Error(`Unknown IPC channel: ${channel}`);
  }
  const valid = args.length >= expected.min && args.length <= expected.max;
  if (!valid) {
    throw new Error(`Invalid IPC payload for ${channel}: expected ${expected.min}-${expected.max} arguments, received ${args.length}.`);
  }
  const validator = ipcPayloadValidators[channel];
  if (!validator) {
    return;
  }
  const error = validator(args);
  if (error) {
    throw new Error(`Invalid IPC payload for ${channel}: ${error}.`);
  }
}

type IpcPayloadValidator = (args: unknown[]) => string | null;

const providerTypes = new Set<ProviderInput['type']>([
  'openai-compatible',
  'openai',
  'anthropic',
  'gemini',
  'deepseek',
  'qwen',
  'ollama',
  'lm-studio',
  'custom',
]);

const gatewayScopes = new Set(['models:read', 'chat:write', 'embeddings:write']);
const executionKinds = new Set(['agent', 'tool', 'mcp-tool', 'workflow']);
const executionModes = new Set(['preview', 'execute']);
const mcpTransports = new Set(['stdio', 'sse', 'http']);
const mcpPermissionStates = new Set(['discovered', 'denied', 'granted']);
const uiThemes = new Set(['light', 'dark', 'system']);
const uiDensities = new Set(['comfortable', 'compact']);
const uiFontModes = new Set(['system', 'kaiti']);
const uiLanguages = new Set(['zh-CN', 'en-US']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unknownKeys(value: Record<string, unknown>, allowed: readonly string[]): string[] {
  const allowedSet = new Set(allowed);
  return Object.keys(value).filter((key) => !allowedSet.has(key));
}

function validateObject(value: unknown, label: string, allowed: readonly string[]): Record<string, unknown> | string {
  if (!isRecord(value)) {
    return `${label} must be an object`;
  }
  const extra = unknownKeys(value, allowed);
  if (extra.length > 0) {
    return `${label} contains unsupported fields: ${extra.join(', ')}`;
  }
  return value;
}

function requireString(value: Record<string, unknown>, key: string, options: { max?: number; allowEmpty?: boolean } = {}): string | null {
  const current = value[key];
  if (typeof current !== 'string') {
    return `${key} must be a string`;
  }
  if (!options.allowEmpty && current.trim().length === 0) {
    return `${key} must not be empty`;
  }
  if (options.max !== undefined && current.length > options.max) {
    return `${key} must be at most ${options.max} characters`;
  }
  return null;
}

function optionalString(value: Record<string, unknown>, key: string, max: number): string | null {
  const current = value[key];
  if (current === undefined) return null;
  if (typeof current !== 'string') {
    return `${key} must be a string`;
  }
  if (current.length > max) {
    return `${key} must be at most ${max} characters`;
  }
  return null;
}

function optionalBoolean(value: Record<string, unknown>, key: string): string | null {
  const current = value[key];
  return current === undefined || typeof current === 'boolean' ? null : `${key} must be a boolean`;
}

function optionalNumberOrNull(value: Record<string, unknown>, key: string, options: { min?: number; max?: number } = {}): string | null {
  const current = value[key];
  if (current === undefined || current === null) return null;
  if (typeof current !== 'number' || !Number.isFinite(current)) {
    return `${key} must be a finite number or null`;
  }
  if (options.min !== undefined && current < options.min) {
    return `${key} must be at least ${options.min}`;
  }
  if (options.max !== undefined && current > options.max) {
    return `${key} must be at most ${options.max}`;
  }
  return null;
}

function optionalStringArray(value: Record<string, unknown>, key: string, maxItems: number, maxItemLength: number): string | null {
  const current = value[key];
  if (current === undefined) return null;
  if (!Array.isArray(current)) {
    return `${key} must be an array`;
  }
  if (current.length > maxItems) {
    return `${key} must contain at most ${maxItems} items`;
  }
  for (const item of current) {
    if (typeof item !== 'string' || item.trim().length === 0 || item.length > maxItemLength) {
      return `${key} must contain non-empty strings up to ${maxItemLength} characters`;
    }
  }
  return null;
}

function validateProviderInput(input: unknown): string | null {
  const value = validateObject(input, 'provider input', ['name', 'type', 'baseUrl', 'apiKey', 'proxyUrl', 'customHeadersJson']);
  if (typeof value === 'string') return value;
  return (
    requireString(value, 'name', { max: 120 }) ??
    requireString(value, 'baseUrl', { max: 2048 }) ??
    (typeof value.type === 'string' && providerTypes.has(value.type as ProviderInput['type']) ? null : 'type must be a known provider type') ??
    optionalString(value, 'apiKey', 4096) ??
    optionalString(value, 'proxyUrl', 2048) ??
    optionalString(value, 'customHeadersJson', 8192)
  );
}

function validateProviderDiscoveryRequest(input: unknown): string | null {
  const value = validateObject(input, 'provider discovery request', ['address', 'apiKey', 'providerName', 'providerType', 'baseUrl', 'customHeadersJson', 'timeoutMs']);
  if (typeof value === 'string') return value;
  return (
    requireString(value, 'address', { max: 2048 }) ??
    optionalString(value, 'apiKey', 4096) ??
    optionalString(value, 'providerName', 120) ??
    optionalString(value, 'baseUrl', 2048) ??
    optionalString(value, 'customHeadersJson', 8192) ??
    optionalNumberOrNull(value, 'timeoutMs', { min: 1, max: 120_000 }) ??
    (value.providerType === undefined || (typeof value.providerType === 'string' && providerTypes.has(value.providerType as ProviderInput['type'])) ? null : 'providerType must be a known provider type')
  );
}

function validateProviderSaveFromDiscovery(input: unknown): string | null {
  const value = validateObject(input, 'provider discovery save request', ['providerName', 'providerType', 'baseUrl', 'apiKey', 'customHeadersJson', 'modelNames', 'capabilities']);
  if (typeof value === 'string') return value;
  return (
    requireString(value, 'providerName', { max: 120 }) ??
    requireString(value, 'baseUrl', { max: 2048 }) ??
    (typeof value.providerType === 'string' && providerTypes.has(value.providerType as ProviderInput['type']) ? null : 'providerType must be a known provider type') ??
    optionalString(value, 'apiKey', 4096) ??
    optionalString(value, 'customHeadersJson', 8192) ??
    optionalStringArray(value, 'modelNames', 200, 180) ??
    (value.capabilities === undefined || isRecord(value.capabilities) ? null : 'capabilities must be an object')
  );
}

function validateModelInput(input: unknown): string | null {
  const value = validateObject(input, 'model input', ['providerId', 'name', 'displayName', 'contextWindow', 'supportsStreaming', 'supportsTools', 'supportsVision', 'supportsEmbeddings']);
  if (typeof value === 'string') return value;
  return (
    requireString(value, 'providerId', { max: 120 }) ??
    requireString(value, 'name', { max: 180 }) ??
    optionalString(value, 'displayName', 180) ??
    optionalNumberOrNull(value, 'contextWindow', { min: 1, max: 10_000_000 }) ??
    optionalBoolean(value, 'supportsStreaming') ??
    optionalBoolean(value, 'supportsTools') ??
    optionalBoolean(value, 'supportsVision') ??
    optionalBoolean(value, 'supportsEmbeddings')
  );
}

function validateGatewayScopes(value: Record<string, unknown>, key: string): string | null {
  const current = value[key];
  if (current === undefined) return null;
  if (!Array.isArray(current)) return `${key} must be an array`;
  for (const scope of current) {
    if (typeof scope !== 'string' || !gatewayScopes.has(scope)) {
      return `${key} contains an unsupported scope`;
    }
  }
  return null;
}

function validateGatewayCreateKey(input: unknown): string | null {
  const value = validateObject(input, 'gateway key create input', ['name', 'scopes', 'quotaLimit', 'rateLimitPerMinute', 'expiresAt']);
  if (typeof value === 'string') return value;
  return (
    requireString(value, 'name', { max: 120 }) ??
    validateGatewayScopes(value, 'scopes') ??
    optionalNumberOrNull(value, 'quotaLimit', { min: 1 }) ??
    optionalNumberOrNull(value, 'rateLimitPerMinute', { min: 1 }) ??
    optionalNumberOrNull(value, 'expiresAt', { min: 0 })
  );
}

function validateGatewayUpdateKey(input: unknown): string | null {
  const value = validateObject(input, 'gateway key update input', ['gatewayKeyId', 'name', 'disabled', 'scopes', 'quotaLimit', 'rateLimitPerMinute', 'expiresAt']);
  if (typeof value === 'string') return value;
  return (
    requireString(value, 'gatewayKeyId', { max: 120 }) ??
    optionalString(value, 'name', 120) ??
    optionalBoolean(value, 'disabled') ??
    validateGatewayScopes(value, 'scopes') ??
    optionalNumberOrNull(value, 'quotaLimit', { min: 1 }) ??
    optionalNumberOrNull(value, 'rateLimitPerMinute', { min: 1 }) ??
    optionalNumberOrNull(value, 'expiresAt', { min: 0 })
  );
}

function validateIdObject(input: unknown, label: string, key: string): string | null {
  const value = validateObject(input, label, [key]);
  return typeof value === 'string' ? value : requireString(value, key, { max: 120 });
}

function validateUiPreferences(input: unknown): string | null {
  const value = validateObject(input, 'UI preferences', ['theme', 'density', 'fontMode', 'language', 'reducedMotion', 'advancedMode']);
  if (typeof value === 'string') return value;
  return (
    (typeof value.theme === 'string' && uiThemes.has(value.theme) ? null : 'theme must be light, dark, or system') ??
    (typeof value.density === 'string' && uiDensities.has(value.density) ? null : 'density must be comfortable or compact') ??
    (typeof value.fontMode === 'string' && uiFontModes.has(value.fontMode) ? null : 'fontMode must be system or kaiti') ??
    (typeof value.language === 'string' && uiLanguages.has(value.language) ? null : 'language must be zh-CN or en-US') ??
    (typeof value.reducedMotion === 'boolean' ? null : 'reducedMotion must be a boolean') ??
    (typeof value.advancedMode === 'boolean' ? null : 'advancedMode must be a boolean')
  );
}

function validateExecutionStart(input: unknown): string | null {
  const value = validateObject(input, 'execution start input', ['kind', 'mode', 'agentId', 'toolId', 'mcpServerId', 'workflowId', 'inputJson']);
  if (typeof value === 'string') return value;
  return (
    (typeof value.kind === 'string' && executionKinds.has(value.kind) ? null : 'kind must be a known execution kind') ??
    (value.mode === undefined || (typeof value.mode === 'string' && executionModes.has(value.mode)) ? null : 'mode must be preview or execute') ??
    optionalString(value, 'agentId', 120) ??
    optionalString(value, 'toolId', 160) ??
    optionalString(value, 'mcpServerId', 120) ??
    optionalString(value, 'workflowId', 120) ??
    optionalString(value, 'inputJson', 32_000)
  );
}

function validateApprovalDecision(input: unknown): string | null {
  const value = validateObject(input, 'approval decision input', ['approvalId', 'decision', 'reason']);
  if (typeof value === 'string') return value;
  return (
    requireString(value, 'approvalId', { max: 120 }) ??
    (value.decision === 'approved' || value.decision === 'denied' ? null : 'decision must be approved or denied') ??
    optionalString(value, 'reason', 1000)
  );
}

function validateDataBackup(input: unknown): string | null {
  const value = validateObject(input, 'data backup input', ['profile', 'passphrase']);
  if (typeof value === 'string') return value;
  return requireString(value, 'passphrase', { max: 4096 });
}

function validateRestorePreflight(input: unknown): string | null {
  const value = validateObject(input, 'data restore preflight input', ['backupId', 'packageText', 'passphrase']);
  if (typeof value === 'string') return value;
  return (
    optionalString(value, 'backupId', 120) ??
    optionalString(value, 'packageText', 5_000_000) ??
    optionalString(value, 'passphrase', 4096)
  );
}

function validateDataRollback(input: unknown): string | null {
  const value = validateObject(input, 'data rollback input', ['rollbackId', 'confirmationPhrase']);
  if (typeof value === 'string') return value;
  return requireString(value, 'rollbackId', { max: 120 }) ?? optionalString(value, 'confirmationPhrase', 120);
}

function validateMcpCreate(args: unknown[]): string | null {
  const [name, transport, commandOrUrl] = args;
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 120) return 'name must be a non-empty string up to 120 characters';
  if (typeof transport !== 'string' || !mcpTransports.has(transport)) return 'transport must be stdio, sse, or http';
  if (typeof commandOrUrl !== 'string' || commandOrUrl.trim().length === 0 || commandOrUrl.length > 2048) return 'commandOrUrl must be a non-empty string up to 2048 characters';
  return null;
}

function validateMcpPermission(args: unknown[]): string | null {
  const [serverId, permissionState] = args;
  if (typeof serverId !== 'string' || serverId.trim().length === 0 || serverId.length > 120) return 'serverId must be a non-empty string up to 120 characters';
  if (typeof permissionState !== 'string' || !mcpPermissionStates.has(permissionState)) return 'permissionState must be discovered, denied, or granted';
  return null;
}

const ipcPayloadValidators: Partial<Record<IpcChannel, IpcPayloadValidator>> = {
  [IPC_CHANNELS.providerDiscover]: ([input]) => validateProviderDiscoveryRequest(input),
  [IPC_CHANNELS.providerSaveFromDiscovery]: ([input]) => validateProviderSaveFromDiscovery(input),
  [IPC_CHANNELS.providerCreate]: ([input]) => validateProviderInput(input),
  [IPC_CHANNELS.modelCreate]: ([input]) => validateModelInput(input),
  [IPC_CHANNELS.gatewayCreateKey]: ([input]) => validateGatewayCreateKey(input),
  [IPC_CHANNELS.gatewayUpdateKey]: ([input]) => validateGatewayUpdateKey(input),
  [IPC_CHANNELS.gatewayRotateKey]: ([input]) => validateIdObject(input, 'gateway key rotate input', 'gatewayKeyId'),
  [IPC_CHANNELS.gatewayRevokeKey]: ([gatewayKeyId]) => typeof gatewayKeyId === 'string' && gatewayKeyId.trim().length > 0 && gatewayKeyId.length <= 120 ? null : 'gatewayKeyId must be a non-empty string up to 120 characters',
  [IPC_CHANNELS.gatewayToggle]: ([enabled]) => typeof enabled === 'boolean' ? null : 'enabled must be a boolean',
  [IPC_CHANNELS.settingsSaveUiPreferences]: ([input]) => validateUiPreferences(input),
  [IPC_CHANNELS.mcpCreateServer]: validateMcpCreate,
  [IPC_CHANNELS.mcpUpdatePermission]: validateMcpPermission,
  [IPC_CHANNELS.agentCreate]: ([name, goal]) => (
    typeof name === 'string' && name.trim().length > 0 && name.length <= 120 &&
    typeof goal === 'string' && goal.trim().length > 0 && goal.length <= 4000
      ? null
      : 'agent name and goal must be non-empty strings within length limits'
  ),
  [IPC_CHANNELS.agentPreviewRun]: ([agentId]) => typeof agentId === 'string' && agentId.trim().length > 0 && agentId.length <= 120 ? null : 'agentId must be a non-empty string up to 120 characters',
  [IPC_CHANNELS.executionStartRun]: ([input]) => validateExecutionStart(input),
  [IPC_CHANNELS.executionDecideApproval]: ([input]) => validateApprovalDecision(input),
  [IPC_CHANNELS.dataValidateImportManifest]: ([manifestText]) => typeof manifestText === 'string' && manifestText.length <= 5_000_000 ? null : 'manifestText must be a string up to 5000000 characters',
  [IPC_CHANNELS.dataApplyImportPlan]: ([resultId, options]) => {
    if (typeof resultId !== 'string' || resultId.trim().length === 0 || resultId.length > 120) return 'resultId must be a non-empty string up to 120 characters';
    if (options === undefined) return null;
    const value = validateObject(options, 'import plan options', ['mode', 'conflictStrategy', 'confirmationPhrase']);
    return typeof value === 'string' ? value : optionalString(value, 'confirmationPhrase', 120);
  },
  [IPC_CHANNELS.dataRestoreSnapshot]: ([snapshotId, options]) => {
    if (typeof snapshotId !== 'string' || snapshotId.trim().length === 0 || snapshotId.length > 120) return 'snapshotId must be a non-empty string up to 120 characters';
    if (options === undefined) return null;
    const value = validateObject(options, 'restore snapshot options', ['mode', 'confirmationPhrase']);
    return typeof value === 'string' ? value : optionalString(value, 'confirmationPhrase', 120);
  },
  [IPC_CHANNELS.dataExportPackage]: ([options]) => {
    if (options === undefined) return null;
    const value = validateObject(options, 'data export options', ['profile']);
    return typeof value === 'string' ? value : null;
  },
  [IPC_CHANNELS.dataCreateEncryptedBackup]: ([input]) => validateDataBackup(input),
  [IPC_CHANNELS.dataCreateRestorePreflight]: ([input]) => validateRestorePreflight(input),
  [IPC_CHANNELS.dataApplyRollback]: ([input]) => validateDataRollback(input),
  [IPC_CHANNELS.observabilityCreateFeedback]: ([input]) => {
    const value = validateObject(input, 'feedback input', ['label', 'notes', 'route', 'severity']);
    return typeof value === 'string' ? value : requireString(value, 'label', { max: 80 }) ?? optionalString(value, 'notes', 4000);
  },
  [IPC_CHANNELS.observabilityRunEval]: ([input]) => {
    const value = validateObject(input, 'eval run input', ['evalSetId', 'modelId']);
    return typeof value === 'string' ? value : requireString(value, 'evalSetId', { max: 120 }) ?? optionalString(value, 'modelId', 120);
  },
  [IPC_CHANNELS.observabilitySavePrivacy]: ([input]) => {
    const value = validateObject(input, 'observability privacy input', ['includePromptSnippets', 'includeErrorDetails', 'retentionDays', 'updatedAt']);
    if (typeof value === 'string') return value;
    return optionalBoolean(value, 'includePromptSnippets') ?? optionalBoolean(value, 'includeErrorDetails') ?? optionalNumberOrNull(value, 'retentionDays', { min: 1, max: 3650 }) ?? optionalNumberOrNull(value, 'updatedAt', { min: 0 });
  },
};

const ipcPayloadArity: Record<IpcChannel, { min: number; max: number }> = {
  [IPC_CHANNELS.appGetSnapshot]: { min: 0, max: 0 },
  [IPC_CHANNELS.providerDiscover]: { min: 1, max: 1 },
  [IPC_CHANNELS.providerSaveFromDiscovery]: { min: 1, max: 1 },
  [IPC_CHANNELS.providerCreate]: { min: 1, max: 1 },
  [IPC_CHANNELS.providerDelete]: { min: 1, max: 1 },
  [IPC_CHANNELS.providerModelsFetch]: { min: 1, max: 1 },
  [IPC_CHANNELS.providerTest]: { min: 1, max: 1 },
  [IPC_CHANNELS.modelCreate]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatCreateConversation]: { min: 0, max: 1 },
  [IPC_CHANNELS.chatSendMessage]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatRetryMessage]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatRegenerateMessage]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatCancelMessage]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatCompareModels]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatExportConversation]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatListConversations]: { min: 0, max: 1 },
  [IPC_CHANNELS.chatListMessages]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatUpdateConversationFlags]: { min: 2, max: 2 },
  [IPC_CHANNELS.gatewayLogsList]: { min: 0, max: 1 },
  [IPC_CHANNELS.auditLogsList]: { min: 0, max: 1 },
  [IPC_CHANNELS.knowledgeFilesList]: { min: 0, max: 1 },
  [IPC_CHANNELS.knowledgeChunksList]: { min: 0, max: 1 },
  [IPC_CHANNELS.usageTrendGet]: { min: 0, max: 1 },
  [IPC_CHANNELS.taskCancel]: { min: 1, max: 1 },
  [IPC_CHANNELS.gatewayCreateKey]: { min: 1, max: 1 },
  [IPC_CHANNELS.gatewayUpdateKey]: { min: 1, max: 1 },
  [IPC_CHANNELS.gatewayRotateKey]: { min: 1, max: 1 },
  [IPC_CHANNELS.gatewayRevokeKey]: { min: 1, max: 1 },
  [IPC_CHANNELS.gatewayToggle]: { min: 1, max: 1 },
  [IPC_CHANNELS.settingsSaveUiPreferences]: { min: 1, max: 1 },
  [IPC_CHANNELS.knowledgeCreateFile]: { min: 1, max: 1 },
  [IPC_CHANNELS.knowledgeRetryFile]: { min: 1, max: 1 },
  [IPC_CHANNELS.knowledgeRebuildFile]: { min: 1, max: 1 },
  [IPC_CHANNELS.knowledgeDeleteFile]: { min: 1, max: 1 },
  [IPC_CHANNELS.knowledgePreviewRetrieval]: { min: 1, max: 1 },
  [IPC_CHANNELS.mcpCreateServer]: { min: 3, max: 3 },
  [IPC_CHANNELS.mcpUpdatePermission]: { min: 2, max: 2 },
  [IPC_CHANNELS.agentCreate]: { min: 2, max: 2 },
  [IPC_CHANNELS.agentPreviewRun]: { min: 1, max: 1 },
  [IPC_CHANNELS.executionStartRun]: { min: 1, max: 1 },
  [IPC_CHANNELS.executionDecideApproval]: { min: 1, max: 1 },
  [IPC_CHANNELS.dataValidateImportManifest]: { min: 1, max: 1 },
  [IPC_CHANNELS.dataApplyImportPlan]: { min: 1, max: 2 },
  [IPC_CHANNELS.dataRestoreSnapshot]: { min: 1, max: 2 },
  [IPC_CHANNELS.dataCreateSnapshot]: { min: 0, max: 0 },
  [IPC_CHANNELS.dataExportDiagnostics]: { min: 0, max: 0 },
  [IPC_CHANNELS.dataExportPackage]: { min: 0, max: 1 },
  [IPC_CHANNELS.dataCreateEncryptedBackup]: { min: 1, max: 1 },
  [IPC_CHANNELS.dataCreateRestorePreflight]: { min: 1, max: 1 },
  [IPC_CHANNELS.dataApplyRollback]: { min: 1, max: 1 },
  [IPC_CHANNELS.observabilityQuery]: { min: 0, max: 1 },
  [IPC_CHANNELS.observabilityCreateFeedback]: { min: 1, max: 1 },
  [IPC_CHANNELS.observabilityRunEval]: { min: 1, max: 1 },
  [IPC_CHANNELS.observabilitySavePrivacy]: { min: 1, max: 1 },
  [IPC_CHANNELS.observabilityExport]: { min: 0, max: 1 },
  [IPC_CHANNELS.auditSearch]: { min: 0, max: 1 },
  [IPC_CHANNELS.auditVerify]: { min: 0, max: 0 },
  [IPC_CHANNELS.auditExport]: { min: 0, max: 0 },
  [IPC_CHANNELS.systemOpenLogs]: { min: 0, max: 0 },
};
