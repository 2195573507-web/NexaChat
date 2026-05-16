import type {
  CancelMessageInput,
  ApprovalDecisionInput,
  CompareModelsInput,
  ExecutionStartInput,
  ExportConversationInput,
  GatewayKeyCreateInput,
  GatewayKeyRotateInput,
  GatewayKeyUpdateInput,
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
  UiPreferences,
  ImportPlanApplyOptions,
  RestoreSnapshotOptions,
} from './types.js';

export const IPC_CHANNELS = {
  appGetSnapshot: 'app:getSnapshot',
  providerCreate: 'provider:create',
  providerTest: 'provider:test',
  modelCreate: 'model:create',
  chatCreateConversation: 'chat:createConversation',
  chatSendMessage: 'chat:sendMessage',
  chatRetryMessage: 'chat:retryMessage',
  chatRegenerateMessage: 'chat:regenerateMessage',
  chatCancelMessage: 'chat:cancelMessage',
  chatCompareModels: 'chat:compareModels',
  chatExportConversation: 'chat:exportConversation',
  chatUpdateConversationFlags: 'chat:updateConversationFlags',
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
  systemOpenLogs: 'system:openLogs',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type IpcInvokeArgs = {
  [IPC_CHANNELS.appGetSnapshot]: [];
  [IPC_CHANNELS.providerCreate]: [ProviderInput];
  [IPC_CHANNELS.providerTest]: [string];
  [IPC_CHANNELS.modelCreate]: [ModelInput];
  [IPC_CHANNELS.chatCreateConversation]: [string?];
  [IPC_CHANNELS.chatSendMessage]: [SendMessageInput];
  [IPC_CHANNELS.chatRetryMessage]: [RetryMessageInput];
  [IPC_CHANNELS.chatRegenerateMessage]: [RegenerateMessageInput];
  [IPC_CHANNELS.chatCancelMessage]: [CancelMessageInput];
  [IPC_CHANNELS.chatCompareModels]: [CompareModelsInput];
  [IPC_CHANNELS.chatExportConversation]: [ExportConversationInput];
  [IPC_CHANNELS.chatUpdateConversationFlags]: [
    string,
    Partial<{
      isPinned: boolean;
      isFavorite: boolean;
      status: 'active' | 'archived' | 'deleted';
    }>,
  ];
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
  [IPC_CHANNELS.systemOpenLogs]: [];
};

export const IPC_CHANNEL_LIST = Object.values(IPC_CHANNELS);

export function isIpcChannel(value: string): value is IpcChannel {
  return (IPC_CHANNEL_LIST as string[]).includes(value);
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
}

const ipcPayloadArity: Record<IpcChannel, { min: number; max: number }> = {
  [IPC_CHANNELS.appGetSnapshot]: { min: 0, max: 0 },
  [IPC_CHANNELS.providerCreate]: { min: 1, max: 1 },
  [IPC_CHANNELS.providerTest]: { min: 1, max: 1 },
  [IPC_CHANNELS.modelCreate]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatCreateConversation]: { min: 0, max: 1 },
  [IPC_CHANNELS.chatSendMessage]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatRetryMessage]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatRegenerateMessage]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatCancelMessage]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatCompareModels]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatExportConversation]: { min: 1, max: 1 },
  [IPC_CHANNELS.chatUpdateConversationFlags]: { min: 2, max: 2 },
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
  [IPC_CHANNELS.systemOpenLogs]: { min: 0, max: 0 },
};
