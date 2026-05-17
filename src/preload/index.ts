import { contextBridge, ipcRenderer } from 'electron';
import type { AppApi } from '../shared/api.js';
import {
  IPC_CHANNELS,
  isIpcEventChannel,
  type IpcChannel,
  type IpcEventChannel,
  type IpcEventPayloads,
  type IpcInvokeArgs,
} from '../shared/ipc.js';
import type {
  CancelMessageInput,
  CompareModelsInput,
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
  ModelInput,
  ProviderInput,
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
} from '../shared/types.js';

function invoke<C extends IpcChannel>(channel: C, ...args: IpcInvokeArgs[C]) {
  return ipcRenderer.invoke(channel, ...args);
}

function subscribe<C extends IpcEventChannel>(channel: C, handler: (payload: IpcEventPayloads[C]) => void): () => void {
  if (!isIpcEventChannel(channel)) {
    throw new Error(`Unsupported IPC event channel: ${channel}`);
  }
  const listener = (_event: Electron.IpcRendererEvent, payload: IpcEventPayloads[C]) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api: AppApi = {
  getSnapshot: () => invoke(IPC_CHANNELS.appGetSnapshot),
  createProvider: (input: ProviderInput) => invoke(IPC_CHANNELS.providerCreate, input),
  deleteProvider: (providerId: string) => invoke(IPC_CHANNELS.providerDelete, providerId),
  fetchProviderModels: (providerId: string) => invoke(IPC_CHANNELS.providerModelsFetch, providerId),
  createModel: (input: ModelInput) => invoke(IPC_CHANNELS.modelCreate, input),
  testProvider: (providerId: string) => invoke(IPC_CHANNELS.providerTest, providerId),
  sendMessage: (input: SendMessageInput) => invoke(IPC_CHANNELS.chatSendMessage, input),
  retryMessage: (input: RetryMessageInput) => invoke(IPC_CHANNELS.chatRetryMessage, input),
  regenerateMessage: (input: RegenerateMessageInput) => invoke(IPC_CHANNELS.chatRegenerateMessage, input),
  cancelMessage: (input: CancelMessageInput) => invoke(IPC_CHANNELS.chatCancelMessage, input),
  compareModels: (input: CompareModelsInput) => invoke(IPC_CHANNELS.chatCompareModels, input),
  exportConversation: (input: ExportConversationInput) => invoke(IPC_CHANNELS.chatExportConversation, input),
  createConversation: (title?: string) => invoke(IPC_CHANNELS.chatCreateConversation, title),
  listConversations: (input?: ConversationPageInput) => invoke(IPC_CHANNELS.chatListConversations, input),
  listMessages: (input: MessagePageInput) => invoke(IPC_CHANNELS.chatListMessages, input),
  listGatewayLogs: (input?: GatewayLogPageInput) => invoke(IPC_CHANNELS.gatewayLogsList, input),
  listAuditLogs: (input?: AuditLogPageInput) => invoke(IPC_CHANNELS.auditLogsList, input),
  listKnowledgeFiles: (input?: KnowledgeFilePageInput) => invoke(IPC_CHANNELS.knowledgeFilesList, input),
  listKnowledgeChunks: (input?: KnowledgeChunkPageInput) => invoke(IPC_CHANNELS.knowledgeChunksList, input),
  getUsageTrend: (input?: UsageTrendInput) => invoke(IPC_CHANNELS.usageTrendGet, input),
  cancelTask: (taskId: string) => invoke(IPC_CHANNELS.taskCancel, taskId),
  updateConversationFlags: (conversationId, flags) => invoke(IPC_CHANNELS.chatUpdateConversationFlags, conversationId, flags),
  createGatewayKey: (input: GatewayKeyCreateInput) => invoke(IPC_CHANNELS.gatewayCreateKey, input),
  updateGatewayKey: (input: GatewayKeyUpdateInput) => invoke(IPC_CHANNELS.gatewayUpdateKey, input),
  rotateGatewayKey: (input: GatewayKeyRotateInput) => invoke(IPC_CHANNELS.gatewayRotateKey, input),
  revokeGatewayKey: (gatewayKeyId: string) => invoke(IPC_CHANNELS.gatewayRevokeKey, gatewayKeyId),
  toggleGateway: (enabled: boolean) => invoke(IPC_CHANNELS.gatewayToggle, enabled),
  saveUiPreferences: (preferences: UiPreferences) => invoke(IPC_CHANNELS.settingsSaveUiPreferences, preferences),
  createKnowledgeFile: (input: KnowledgeImportInput) => invoke(IPC_CHANNELS.knowledgeCreateFile, input),
  retryKnowledgeFile: (input: KnowledgeRebuildInput) => invoke(IPC_CHANNELS.knowledgeRetryFile, input),
  rebuildKnowledgeFile: (input: KnowledgeRebuildInput) => invoke(IPC_CHANNELS.knowledgeRebuildFile, input),
  deleteKnowledgeFile: (input: KnowledgeDeleteInput) => invoke(IPC_CHANNELS.knowledgeDeleteFile, input),
  previewKnowledgeRetrieval: (input: KnowledgeRetrievalInput) => invoke(IPC_CHANNELS.knowledgePreviewRetrieval, input),
  createMcpServer: (name, transport, commandOrUrl) => invoke(IPC_CHANNELS.mcpCreateServer, name, transport, commandOrUrl),
  updateMcpPermission: (serverId, permissionState) => invoke(IPC_CHANNELS.mcpUpdatePermission, serverId, permissionState),
  createAgent: (name: string, goal: string) => invoke(IPC_CHANNELS.agentCreate, name, goal),
  previewAgentRun: (agentId: string) => invoke(IPC_CHANNELS.agentPreviewRun, agentId),
  startExecutionRun: (input) => invoke(IPC_CHANNELS.executionStartRun, input),
  decideApproval: (input) => invoke(IPC_CHANNELS.executionDecideApproval, input),
  validateImportManifest: (manifestText: string) => invoke(IPC_CHANNELS.dataValidateImportManifest, manifestText),
  applyImportPlan: (resultId: string, options?: ImportPlanApplyOptions) => invoke(IPC_CHANNELS.dataApplyImportPlan, resultId, options),
  restoreSnapshot: (snapshotId: string, options?: RestoreSnapshotOptions) => invoke(IPC_CHANNELS.dataRestoreSnapshot, snapshotId, options),
  createSnapshot: () => invoke(IPC_CHANNELS.dataCreateSnapshot),
  exportDiagnostics: () => invoke(IPC_CHANNELS.dataExportDiagnostics),
  exportDataPackage: (options?: DataExportOptions) => invoke(IPC_CHANNELS.dataExportPackage, options),
  createEncryptedBackup: (input: DataBackupCreateInput) => invoke(IPC_CHANNELS.dataCreateEncryptedBackup, input),
  createRestorePreflight: (input: DataRestorePreflightInput) => invoke(IPC_CHANNELS.dataCreateRestorePreflight, input),
  applyDataRollback: (input: DataRollbackInput) => invoke(IPC_CHANNELS.dataApplyRollback, input),
  queryObservability: (input?: ObservabilityQueryInput) => invoke(IPC_CHANNELS.observabilityQuery, input),
  createFeedback: (input: FeedbackCreateInput) => invoke(IPC_CHANNELS.observabilityCreateFeedback, input),
  runEvaluation: (input: EvalRunInput) => invoke(IPC_CHANNELS.observabilityRunEval, input),
  saveObservabilityPrivacy: (input: Partial<ObservabilityPrivacySettings>) => invoke(IPC_CHANNELS.observabilitySavePrivacy, input),
  exportObservability: (input?: ObservabilityQueryInput) => invoke(IPC_CHANNELS.observabilityExport, input),
  searchAuditLogs: (query?: string) => invoke(IPC_CHANNELS.auditSearch, query),
  verifyAuditIntegrity: () => invoke(IPC_CHANNELS.auditVerify),
  exportAuditLogs: () => invoke(IPC_CHANNELS.auditExport),
  openLogs: () => invoke(IPC_CHANNELS.systemOpenLogs),
  subscribe,
};

contextBridge.exposeInMainWorld('nexachat', api);
