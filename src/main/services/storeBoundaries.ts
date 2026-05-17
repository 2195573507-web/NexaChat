export type StoreBoundaryService =
  | 'ChatService'
  | 'ProviderService'
  | 'ModelService'
  | 'GatewayService'
  | 'KnowledgeService'
  | 'ToolService'
  | 'DataService'
  | 'SecurityService'
  | 'AuditService'
  | 'SettingsService'
  | 'ObservabilityService'
  | 'StoreFacade';

export interface StoreBoundaryMapEntry {
  method: string;
  targetService: StoreBoundaryService;
  currentOwner: StoreBoundaryService;
  migrationState: 'service-implemented' | 'facade-compatibility';
}

export const STORE_BOUNDARY_MAP = [
  { method: 'getSnapshot', targetService: 'StoreFacade', currentOwner: 'StoreFacade', migrationState: 'facade-compatibility' },
  { method: 'createConversation', targetService: 'ChatService', currentOwner: 'ChatService', migrationState: 'service-implemented' },
  { method: 'sendMessage', targetService: 'ChatService', currentOwner: 'ChatService', migrationState: 'service-implemented' },
  { method: 'retryMessage', targetService: 'ChatService', currentOwner: 'ChatService', migrationState: 'service-implemented' },
  { method: 'regenerateMessage', targetService: 'ChatService', currentOwner: 'ChatService', migrationState: 'service-implemented' },
  { method: 'cancelMessage', targetService: 'ChatService', currentOwner: 'ChatService', migrationState: 'service-implemented' },
  { method: 'exportConversation', targetService: 'ChatService', currentOwner: 'ChatService', migrationState: 'service-implemented' },
  { method: 'compareModels', targetService: 'ChatService', currentOwner: 'ChatService', migrationState: 'service-implemented' },
  { method: 'createProvider', targetService: 'ProviderService', currentOwner: 'ProviderService', migrationState: 'service-implemented' },
  { method: 'deleteProvider', targetService: 'ProviderService', currentOwner: 'ProviderService', migrationState: 'service-implemented' },
  { method: 'testProvider', targetService: 'ProviderService', currentOwner: 'ProviderService', migrationState: 'service-implemented' },
  { method: 'fetchProviderModels', targetService: 'ModelService', currentOwner: 'ModelService', migrationState: 'service-implemented' },
  { method: 'createModel', targetService: 'ModelService', currentOwner: 'ModelService', migrationState: 'service-implemented' },
  { method: 'resolveGatewayModelId', targetService: 'ModelService', currentOwner: 'ModelService', migrationState: 'service-implemented' },
  { method: 'toggleGateway', targetService: 'GatewayService', currentOwner: 'GatewayService', migrationState: 'service-implemented' },
  { method: 'createGatewayKey', targetService: 'GatewayService', currentOwner: 'GatewayService', migrationState: 'service-implemented' },
  { method: 'updateGatewayKey', targetService: 'GatewayService', currentOwner: 'GatewayService', migrationState: 'service-implemented' },
  { method: 'rotateGatewayKey', targetService: 'GatewayService', currentOwner: 'GatewayService', migrationState: 'service-implemented' },
  { method: 'revokeGatewayKey', targetService: 'GatewayService', currentOwner: 'GatewayService', migrationState: 'service-implemented' },
  { method: 'authorizeGatewayKey', targetService: 'GatewayService', currentOwner: 'GatewayService', migrationState: 'service-implemented' },
  { method: 'recordGatewayLog', targetService: 'GatewayService', currentOwner: 'GatewayService', migrationState: 'service-implemented' },
  { method: 'createKnowledgeFile', targetService: 'KnowledgeService', currentOwner: 'KnowledgeService', migrationState: 'service-implemented' },
  { method: 'rebuildKnowledgeFile', targetService: 'KnowledgeService', currentOwner: 'KnowledgeService', migrationState: 'service-implemented' },
  { method: 'deleteKnowledgeFile', targetService: 'KnowledgeService', currentOwner: 'KnowledgeService', migrationState: 'service-implemented' },
  { method: 'previewKnowledgeRetrieval', targetService: 'KnowledgeService', currentOwner: 'KnowledgeService', migrationState: 'service-implemented' },
  { method: 'createMcpServer', targetService: 'ToolService', currentOwner: 'ToolService', migrationState: 'service-implemented' },
  { method: 'createAgent', targetService: 'ToolService', currentOwner: 'ToolService', migrationState: 'service-implemented' },
  { method: 'startExecutionRun', targetService: 'ToolService', currentOwner: 'ToolService', migrationState: 'service-implemented' },
  { method: 'validateImportManifest', targetService: 'DataService', currentOwner: 'DataService', migrationState: 'service-implemented' },
  { method: 'applyImportPlan', targetService: 'DataService', currentOwner: 'DataService', migrationState: 'service-implemented' },
  { method: 'createSnapshot', targetService: 'DataService', currentOwner: 'DataService', migrationState: 'service-implemented' },
  { method: 'createEncryptedBackup', targetService: 'DataService', currentOwner: 'DataService', migrationState: 'service-implemented' },
  { method: 'createRestorePreflight', targetService: 'DataService', currentOwner: 'DataService', migrationState: 'service-implemented' },
  { method: 'applyDataRollback', targetService: 'DataService', currentOwner: 'DataService', migrationState: 'service-implemented' },
  { method: 'restoreSnapshot', targetService: 'DataService', currentOwner: 'DataService', migrationState: 'service-implemented' },
  { method: 'getSecurityState', targetService: 'SecurityService', currentOwner: 'SecurityService', migrationState: 'service-implemented' },
  { method: 'requirePermission', targetService: 'SecurityService', currentOwner: 'SecurityService', migrationState: 'service-implemented' },
  { method: 'searchAuditLogs', targetService: 'AuditService', currentOwner: 'AuditService', migrationState: 'service-implemented' },
  { method: 'verifyAuditIntegrity', targetService: 'AuditService', currentOwner: 'AuditService', migrationState: 'service-implemented' },
  { method: 'exportAuditLogs', targetService: 'AuditService', currentOwner: 'AuditService', migrationState: 'service-implemented' },
  { method: 'saveUiPreferences', targetService: 'SettingsService', currentOwner: 'SettingsService', migrationState: 'service-implemented' },
  { method: 'saveObservabilityPrivacy', targetService: 'SettingsService', currentOwner: 'SettingsService', migrationState: 'service-implemented' },
  { method: 'queryObservability', targetService: 'ObservabilityService', currentOwner: 'ObservabilityService', migrationState: 'service-implemented' },
  { method: 'createFeedback', targetService: 'ObservabilityService', currentOwner: 'ObservabilityService', migrationState: 'service-implemented' },
  { method: 'runEvaluation', targetService: 'ObservabilityService', currentOwner: 'ObservabilityService', migrationState: 'service-implemented' },
] as const satisfies readonly StoreBoundaryMapEntry[];

export function getStoreBoundaryTarget(method: string): StoreBoundaryMapEntry | null {
  return STORE_BOUNDARY_MAP.find((entry) => entry.method === method) ?? null;
}
