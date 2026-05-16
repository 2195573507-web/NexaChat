import { app, ipcMain, shell } from 'electron';
import { store } from './services/store.js';
import { startLocalGateway, stopLocalGateway } from './services/localGateway.js';
import { assertIpcPayload, IPC_CHANNELS, type IpcChannel } from '../shared/ipc.js';
import { IPC_PERMISSION_BY_CHANNEL } from '../shared/securityRuntime.js';
import type {
  CancelMessageInput,
  CompareModelsInput,
  EvalRunInput,
  ExportConversationInput,
  FeedbackCreateInput,
  DataBackupCreateInput,
  DataExportOptions,
  DataRestorePreflightInput,
  DataRollbackInput,
  ObservabilityPrivacySettings,
  ObservabilityQueryInput,
  GatewayKeyCreateInput,
  GatewayKeyRotateInput,
  GatewayKeyUpdateInput,
  ImportPlanApplyOptions,
  KnowledgeDeleteInput,
  KnowledgeImportInput,
  KnowledgeRebuildInput,
  KnowledgeRetrievalInput,
  McpServer,
  ModelInput,
  ProviderInput,
  RegenerateMessageInput,
  RetryMessageInput,
  SendMessageInput,
  RestoreSnapshotOptions,
  UiPreferences,
} from '../shared/types.js';

function handleIpc<C extends IpcChannel>(channel: C, handler: (...args: any[]) => unknown): void {
  ipcMain.handle(channel, (_event, ...args: unknown[]) => {
    assertIpcPayload(channel, args);
    store.requirePermission(IPC_PERMISSION_BY_CHANNEL[channel]);
    return handler(...args);
  });
}

export function registerIpcHandlers(): void {
  handleIpc(IPC_CHANNELS.appGetSnapshot, () => store.getSnapshot());
  handleIpc(IPC_CHANNELS.providerCreate, (input: ProviderInput) => store.createProvider(input));
  handleIpc(IPC_CHANNELS.providerTest, (providerId: string) => store.testProvider(providerId));
  handleIpc(IPC_CHANNELS.modelCreate, (input: ModelInput) => store.createModel(input));
  handleIpc(IPC_CHANNELS.chatCreateConversation, (title?: string) => store.createConversation(title));
  handleIpc(IPC_CHANNELS.chatSendMessage, (input: SendMessageInput) => store.sendMessage(input));
  handleIpc(IPC_CHANNELS.chatRetryMessage, (input: RetryMessageInput) => store.retryMessage(input));
  handleIpc(IPC_CHANNELS.chatRegenerateMessage, (input: RegenerateMessageInput) => store.regenerateMessage(input));
  handleIpc(IPC_CHANNELS.chatCancelMessage, (input: CancelMessageInput) => store.cancelMessage(input));
  handleIpc(IPC_CHANNELS.chatCompareModels, (input: CompareModelsInput) => store.compareModels(input));
  handleIpc(IPC_CHANNELS.chatExportConversation, (input: ExportConversationInput) => store.exportConversation(input));
  handleIpc(IPC_CHANNELS.chatUpdateConversationFlags, (conversationId: string, flags) =>
    store.updateConversationFlags(conversationId, flags),
  );
  handleIpc(IPC_CHANNELS.gatewayCreateKey, (input: GatewayKeyCreateInput) => store.createGatewayKey(input));
  handleIpc(IPC_CHANNELS.gatewayUpdateKey, (input: GatewayKeyUpdateInput) => store.updateGatewayKey(input));
  handleIpc(IPC_CHANNELS.gatewayRotateKey, (input: GatewayKeyRotateInput) => store.rotateGatewayKey(input));
  handleIpc(IPC_CHANNELS.gatewayRevokeKey, (gatewayKeyId: string) => store.revokeGatewayKey(gatewayKeyId));
  handleIpc(IPC_CHANNELS.gatewayToggle, async (enabled: boolean) => {
    if (enabled) {
      await startLocalGateway();
      store.toggleGateway(true);
    } else {
      await stopLocalGateway();
      store.toggleGateway(false);
    }
    return store.getGatewayStatus();
  });
  handleIpc(IPC_CHANNELS.settingsSaveUiPreferences, (preferences: UiPreferences) => store.saveUiPreferences(preferences));
  handleIpc(IPC_CHANNELS.knowledgeCreateFile, (input: KnowledgeImportInput) => store.createKnowledgeFile(input));
  handleIpc(IPC_CHANNELS.knowledgeRetryFile, (input: KnowledgeRebuildInput) => store.retryKnowledgeFile(input));
  handleIpc(IPC_CHANNELS.knowledgeRebuildFile, (input: KnowledgeRebuildInput) => store.rebuildKnowledgeFile(input));
  handleIpc(IPC_CHANNELS.knowledgeDeleteFile, (input: KnowledgeDeleteInput) => store.deleteKnowledgeFile(input));
  handleIpc(IPC_CHANNELS.knowledgePreviewRetrieval, (input: KnowledgeRetrievalInput) => store.previewKnowledgeRetrieval(input));
  handleIpc(IPC_CHANNELS.mcpCreateServer, (name: string, transport, commandOrUrl: string) =>
    store.createMcpServer(name, transport, commandOrUrl),
  );
  handleIpc(IPC_CHANNELS.mcpUpdatePermission, (serverId: string, permissionState: McpServer['permissionState']) =>
    store.updateMcpPermission(serverId, permissionState),
  );
  handleIpc(IPC_CHANNELS.agentCreate, (name: string, goal: string) => store.createAgent(name, goal));
  handleIpc(IPC_CHANNELS.agentPreviewRun, (agentId: string) => store.previewAgentRun(agentId));
  handleIpc(IPC_CHANNELS.executionStartRun, (input) => store.startExecutionRun(input));
  handleIpc(IPC_CHANNELS.executionDecideApproval, (input) => store.decideApproval(input));
  handleIpc(IPC_CHANNELS.dataValidateImportManifest, (manifestText: string) => store.validateImportManifest(manifestText));
  handleIpc(IPC_CHANNELS.dataApplyImportPlan, (resultId: string, options?: ImportPlanApplyOptions) => store.applyImportPlan(resultId, options));
  handleIpc(IPC_CHANNELS.dataRestoreSnapshot, (snapshotId: string, options?: RestoreSnapshotOptions) => store.restoreSnapshot(snapshotId, options));
  handleIpc(IPC_CHANNELS.dataCreateSnapshot, () => store.createSnapshot());
  handleIpc(IPC_CHANNELS.dataExportDiagnostics, () => store.exportDiagnostics());
  handleIpc(IPC_CHANNELS.dataExportPackage, (options?: DataExportOptions) => store.exportDataPackage(options));
  handleIpc(IPC_CHANNELS.dataCreateEncryptedBackup, (input: DataBackupCreateInput) => store.createEncryptedBackup(input));
  handleIpc(IPC_CHANNELS.dataCreateRestorePreflight, (input: DataRestorePreflightInput) => store.createRestorePreflight(input));
  handleIpc(IPC_CHANNELS.dataApplyRollback, (input: DataRollbackInput) => store.applyDataRollback(input));
  handleIpc(IPC_CHANNELS.observabilityQuery, (input?: ObservabilityQueryInput) => store.queryObservability(input));
  handleIpc(IPC_CHANNELS.observabilityCreateFeedback, (input: FeedbackCreateInput) => store.createFeedback(input));
  handleIpc(IPC_CHANNELS.observabilityRunEval, (input: EvalRunInput) => store.runEvaluation(input));
  handleIpc(IPC_CHANNELS.observabilitySavePrivacy, (input: Partial<ObservabilityPrivacySettings>) => store.saveObservabilityPrivacy(input));
  handleIpc(IPC_CHANNELS.observabilityExport, (input?: ObservabilityQueryInput) => store.exportObservability(input));
  handleIpc(IPC_CHANNELS.auditSearch, (query?: string) => store.searchAuditLogs(query));
  handleIpc(IPC_CHANNELS.auditVerify, () => store.verifyAuditIntegrity());
  handleIpc(IPC_CHANNELS.auditExport, () => store.exportAuditLogs());
  handleIpc(IPC_CHANNELS.systemOpenLogs, async () => {
    await shell.openPath(app.getPath('logs'));
  });
}
