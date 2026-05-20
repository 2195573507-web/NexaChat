import type { WebContents } from 'electron';
import { app, ipcMain, shell } from 'electron';
import { cancelBackgroundTask, runBackgroundTask } from './services/backgroundTaskRunner.js';
import { measureMainIpc } from './performanceMarks.js';
import { assertIpcPayload, IPC_CHANNELS, IPC_EVENT_CHANNELS, type IpcChannel, type IpcEventChannel, type IpcEventPayloads } from '../shared/ipc.js';
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
  AuditLogPageInput,
  ConversationPageInput,
  GatewayLogPageInput,
  KnowledgeChunkPageInput,
  KnowledgeFilePageInput,
  MessagePageInput,
  UsageTrendInput,
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
  ModelStateInput,
  ModelUpdateInput,
  ProviderDiscoveryRequest,
  ProviderInput,
  ProviderSaveFromDiscoveryRequest,
  RegenerateMessageInput,
  RetryMessageInput,
  SendMessageInput,
  RestoreSnapshotOptions,
  UiPreferences,
} from '../shared/types.js';
import type { ServiceContext } from './services/serviceContext.js';

export interface IpcHandlerDependencies {
  store: ServiceContext;
  startLocalGateway: () => Promise<void>;
  stopLocalGateway: () => Promise<void>;
}

function handleIpc<C extends IpcChannel>(
  deps: IpcHandlerDependencies,
  channel: C,
  handler: (...args: any[]) => unknown,
): void {
  ipcMain.handle(channel, (_event, ...args: unknown[]) => {
    assertIpcPayload(channel, args);
    deps.store.requirePermission(IPC_PERMISSION_BY_CHANNEL[channel]);
    return handler(...args);
  });
}

function safeSendEvent<C extends IpcEventChannel>(
  webContents: WebContents | null | undefined,
  channel: C,
  payload: IpcEventPayloads[C],
): void {
  if (!webContents || webContents.isDestroyed()) {
    return;
  }
  webContents.send(channel, payload);
}

export function registerIpcHandlers(deps: IpcHandlerDependencies): void {
  const { store, startLocalGateway, stopLocalGateway } = deps;
  handleIpc(deps, IPC_CHANNELS.appGetSnapshot, () => measureMainIpc('getSnapshot', () => store.getSnapshot()));
  handleIpc(deps, IPC_CHANNELS.providerDiscover, (input: ProviderDiscoveryRequest) => store.discoverProvider(input));
  handleIpc(deps, IPC_CHANNELS.providerSaveFromDiscovery, (input: ProviderSaveFromDiscoveryRequest) => store.saveProviderFromDiscovery(input));
  handleIpc(deps, IPC_CHANNELS.providerCreate, (input: ProviderInput) => store.createProvider(input));
  handleIpc(deps, IPC_CHANNELS.providerDelete, (providerId: string) => store.deleteProvider(providerId));
  handleIpc(deps, IPC_CHANNELS.providerModelsFetch, (providerId: string) => store.fetchProviderModels(providerId));
  handleIpc(deps, IPC_CHANNELS.providerTest, (providerId: string) => store.testProvider(providerId));
  handleIpc(deps, IPC_CHANNELS.modelCreate, (input: ModelInput) => store.createModel(input));
  handleIpc(deps, IPC_CHANNELS.modelUpdate, (input: ModelUpdateInput) => store.updateModel(input));
  handleIpc(deps, IPC_CHANNELS.modelDisable, (input: ModelStateInput) => store.disableModel(input));
  handleIpc(deps, IPC_CHANNELS.modelEnable, (input: ModelStateInput) => store.enableModel(input));
  handleIpc(deps, IPC_CHANNELS.modelDelete, (input: ModelStateInput) => store.deleteModel(input));
  handleIpc(deps, IPC_CHANNELS.chatCreateConversation, (title?: string) => store.createConversation(title));
  ipcMain.handle(IPC_CHANNELS.chatSendMessage, async (event, input: SendMessageInput) => {
    const args = [input];
    assertIpcPayload(IPC_CHANNELS.chatSendMessage, args);
    store.requirePermission(IPC_PERMISSION_BY_CHANNEL[IPC_CHANNELS.chatSendMessage]);
    const requestId = input.clientRequestId?.trim() || `req_ipc_${Date.now().toString(36)}`;
    return measureMainIpc('sendMessage', () => store.sendMessage(input, {
      onEvent(payload: Omit<IpcEventPayloads[typeof IPC_EVENT_CHANNELS.chatStream], 'requestId'>) {
        if (payload.type === 'chat.stream.chunk') {
          void measureMainIpc('stream first chunk', () => undefined);
        }
        safeSendEvent(event.sender, IPC_EVENT_CHANNELS.chatStream, {
          clientRequestId: input.clientRequestId,
          requestId,
          ...(payload as Omit<IpcEventPayloads[typeof IPC_EVENT_CHANNELS.chatStream], 'requestId'>),
        });
      },
    }));
  });
  handleIpc(deps, IPC_CHANNELS.chatRetryMessage, (input: RetryMessageInput) => store.retryMessage(input));
  handleIpc(deps, IPC_CHANNELS.chatRegenerateMessage, (input: RegenerateMessageInput) => store.regenerateMessage(input));
  handleIpc(deps, IPC_CHANNELS.chatCancelMessage, (input: CancelMessageInput) => store.cancelMessage(input));
  handleIpc(deps, IPC_CHANNELS.chatCompareModels, (input: CompareModelsInput) => store.compareModels(input));
  handleIpc(deps, IPC_CHANNELS.chatExportConversation, (input: ExportConversationInput) => store.exportConversation(input));
  handleIpc(deps, IPC_CHANNELS.chatListConversations, (input?: ConversationPageInput) => store.listConversations(input));
  handleIpc(deps, IPC_CHANNELS.chatListMessages, (input: MessagePageInput) => store.listMessages(input));
  handleIpc(deps, IPC_CHANNELS.chatUpdateConversationFlags, (conversationId: string, flags) =>
    store.updateConversationFlags(conversationId, flags),
  );
  handleIpc(deps, IPC_CHANNELS.gatewayLogsList, (input?: GatewayLogPageInput) => measureMainIpc('gateway logs query', () => store.listGatewayLogs(input)));
  handleIpc(deps, IPC_CHANNELS.auditLogsList, (input?: AuditLogPageInput) => store.listAuditLogs(input));
  handleIpc(deps, IPC_CHANNELS.knowledgeFilesList, (input?: KnowledgeFilePageInput) => store.listKnowledgeFiles(input));
  handleIpc(deps, IPC_CHANNELS.knowledgeChunksList, (input?: KnowledgeChunkPageInput) => store.listKnowledgeChunks(input));
  handleIpc(deps, IPC_CHANNELS.usageTrendGet, (input?: UsageTrendInput) => store.getUsageTrend(input));
  handleIpc(deps, IPC_CHANNELS.taskCancel, (taskId: string) => cancelBackgroundTask(taskId));
  handleIpc(deps, IPC_CHANNELS.gatewayCreateKey, (input: GatewayKeyCreateInput) => store.createGatewayKey(input));
  handleIpc(deps, IPC_CHANNELS.gatewayUpdateKey, (input: GatewayKeyUpdateInput) => store.updateGatewayKey(input));
  handleIpc(deps, IPC_CHANNELS.gatewayRotateKey, (input: GatewayKeyRotateInput) => store.rotateGatewayKey(input));
  handleIpc(deps, IPC_CHANNELS.gatewayRevokeKey, (gatewayKeyId: string) => store.revokeGatewayKey(gatewayKeyId));
  handleIpc(deps, IPC_CHANNELS.gatewayToggle, async (enabled: boolean) => {
    if (enabled) {
      await startLocalGateway();
      store.toggleGateway(true);
    } else {
      await stopLocalGateway();
      store.toggleGateway(false);
    }
    return store.getGatewayStatus();
  });
  handleIpc(deps, IPC_CHANNELS.settingsSaveUiPreferences, (preferences: UiPreferences) => store.saveUiPreferences(preferences));
  handleIpc(deps, IPC_CHANNELS.knowledgeCreateFile, (input: KnowledgeImportInput) => store.createKnowledgeFile(input));
  handleIpc(deps, IPC_CHANNELS.knowledgeRetryFile, (input: KnowledgeRebuildInput) => store.retryKnowledgeFile(input));
  handleIpc(deps, IPC_CHANNELS.knowledgeRebuildFile, (input: KnowledgeRebuildInput) => store.rebuildKnowledgeFile(input));
  handleIpc(deps, IPC_CHANNELS.knowledgeDeleteFile, (input: KnowledgeDeleteInput) => store.deleteKnowledgeFile(input));
  handleIpc(deps, IPC_CHANNELS.knowledgePreviewRetrieval, (input: KnowledgeRetrievalInput) => store.previewKnowledgeRetrieval(input));
  handleIpc(deps, IPC_CHANNELS.mcpCreateServer, (name: string, transport, commandOrUrl: string) =>
    store.createMcpServer(name, transport, commandOrUrl),
  );
  handleIpc(deps, IPC_CHANNELS.mcpUpdatePermission, (serverId: string, permissionState: McpServer['permissionState']) =>
    store.updateMcpPermission(serverId, permissionState),
  );
  handleIpc(deps, IPC_CHANNELS.agentCreate, (name: string, goal: string) => store.createAgent(name, goal));
  handleIpc(deps, IPC_CHANNELS.agentPreviewRun, (agentId: string) => store.previewAgentRun(agentId));
  handleIpc(deps, IPC_CHANNELS.executionStartRun, (input) => store.startExecutionRun(input));
  handleIpc(deps, IPC_CHANNELS.executionDecideApproval, (input) => store.decideApproval(input));
  handleIpc(deps, IPC_CHANNELS.dataValidateImportManifest, (manifestText: string) => store.validateImportManifest(manifestText));
  handleIpc(deps, IPC_CHANNELS.dataApplyImportPlan, (resultId: string, options?: ImportPlanApplyOptions) => store.applyImportPlan(resultId, options));
  handleIpc(deps, IPC_CHANNELS.dataRestoreSnapshot, (snapshotId: string, options?: RestoreSnapshotOptions) => store.restoreSnapshot(snapshotId, options));
  handleIpc(deps, IPC_CHANNELS.dataCreateSnapshot, () => store.createSnapshot());
  handleIpc(deps, IPC_CHANNELS.dataExportDiagnostics, () => store.exportDiagnostics());
  handleIpc(deps, IPC_CHANNELS.dataExportPackage, (options?: DataExportOptions) => store.exportDataPackage(options));
  ipcMain.handle(IPC_CHANNELS.dataCreateEncryptedBackup, async (event, input: DataBackupCreateInput) => {
    const args = [input];
    assertIpcPayload(IPC_CHANNELS.dataCreateEncryptedBackup, args);
    store.requirePermission(IPC_PERMISSION_BY_CHANNEL[IPC_CHANNELS.dataCreateEncryptedBackup]);
    const taskId = `task_backup_${Date.now().toString(36)}`;
    const emit = (payload: IpcEventPayloads[typeof IPC_EVENT_CHANNELS.taskProgress]) => safeSendEvent(event.sender, IPC_EVENT_CHANNELS.taskProgress, payload);
    return measureMainIpc('backup/restore', () => runBackgroundTask(taskId, 'data.backup', emit, async (context) => {
      await context.checkpoint(0.35, 'backup package building');
      const result = store.createEncryptedBackup(input);
      await context.checkpoint(0.85, 'backup record written');
      return result;
    }));
  });
  ipcMain.handle(IPC_CHANNELS.dataCreateRestorePreflight, async (event, input: DataRestorePreflightInput) => {
    const args = [input];
    assertIpcPayload(IPC_CHANNELS.dataCreateRestorePreflight, args);
    store.requirePermission(IPC_PERMISSION_BY_CHANNEL[IPC_CHANNELS.dataCreateRestorePreflight]);
    const taskId = `task_restore_${Date.now().toString(36)}`;
    const emit = (payload: IpcEventPayloads[typeof IPC_EVENT_CHANNELS.taskProgress]) => safeSendEvent(event.sender, IPC_EVENT_CHANNELS.taskProgress, payload);
    return measureMainIpc('backup/restore', () => runBackgroundTask(taskId, 'data.restore-preflight', emit, async (context) => {
      await context.checkpoint(0.3, 'restore package resolving');
      const result = store.createRestorePreflight(input);
      await context.checkpoint(0.85, 'restore diff ready');
      return result;
    }));
  });
  handleIpc(deps, IPC_CHANNELS.dataApplyRollback, (input: DataRollbackInput) => store.applyDataRollback(input));
  handleIpc(deps, IPC_CHANNELS.observabilityQuery, (input?: ObservabilityQueryInput) => store.queryObservability(input));
  handleIpc(deps, IPC_CHANNELS.observabilityCreateFeedback, (input: FeedbackCreateInput) => store.createFeedback(input));
  handleIpc(deps, IPC_CHANNELS.observabilityRunEval, (input: EvalRunInput) => store.runEvaluation(input));
  handleIpc(deps, IPC_CHANNELS.observabilitySavePrivacy, (input: Partial<ObservabilityPrivacySettings>) => store.saveObservabilityPrivacy(input));
  handleIpc(deps, IPC_CHANNELS.observabilityExport, (input?: ObservabilityQueryInput) => store.exportObservability(input));
  handleIpc(deps, IPC_CHANNELS.auditSearch, (query?: string) => store.searchAuditLogs(query));
  ipcMain.handle(IPC_CHANNELS.auditVerify, async (event) => {
    const args: unknown[] = [];
    assertIpcPayload(IPC_CHANNELS.auditVerify, args);
    store.requirePermission(IPC_PERMISSION_BY_CHANNEL[IPC_CHANNELS.auditVerify]);
    const emit = (payload: IpcEventPayloads[typeof IPC_EVENT_CHANNELS.taskProgress]) => safeSendEvent(event.sender, IPC_EVENT_CHANNELS.taskProgress, payload);
    const taskId = `task_audit_${Date.now().toString(36)}`;
    return measureMainIpc('audit verify', () => runBackgroundTask(taskId, 'audit.verify', emit, async (context) => {
      await context.checkpoint(0.5, 'audit hash chain scanning');
      const result = store.verifyAuditIntegrity();
      await context.checkpoint(0.9, result.status);
      return result;
    }));
  });
  handleIpc(deps, IPC_CHANNELS.auditExport, () => store.exportAuditLogs());
  handleIpc(deps, IPC_CHANNELS.systemOpenLogs, async () => {
    await shell.openPath(app.getPath('logs'));
  });
}
