export type StoreBoundaryService =
  | 'ChatService'
  | 'ModelService'
  | 'GatewayService'
  | 'KnowledgeService'
  | 'ToolService'
  | 'DataService'
  | 'SecurityService'
  | 'ObservabilityService'
  | 'StoreFacade';

export interface StoreBoundaryMapEntry {
  method: string;
  targetService: StoreBoundaryService;
  currentOwner: 'NexaStore';
  migrationState: 'facade-boundary-only';
}

export const STORE_BOUNDARY_MAP = [
  { method: 'getSnapshot', targetService: 'StoreFacade', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'createConversation', targetService: 'ChatService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'sendMessage', targetService: 'ChatService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'compareModels', targetService: 'ChatService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'createProvider', targetService: 'ModelService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'testProvider', targetService: 'ModelService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'createModel', targetService: 'ModelService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'toggleGateway', targetService: 'GatewayService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'createGatewayKey', targetService: 'GatewayService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'authorizeGatewayKey', targetService: 'GatewayService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'recordGatewayLog', targetService: 'GatewayService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'createKnowledgeFile', targetService: 'KnowledgeService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'previewKnowledgeRetrieval', targetService: 'KnowledgeService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'createMcpServer', targetService: 'ToolService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'createAgent', targetService: 'ToolService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'startExecutionRun', targetService: 'ToolService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'validateImportManifest', targetService: 'DataService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'createEncryptedBackup', targetService: 'DataService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'restoreSnapshot', targetService: 'DataService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'getSecurityState', targetService: 'SecurityService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'searchAuditLogs', targetService: 'SecurityService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'verifyAuditIntegrity', targetService: 'SecurityService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'queryObservability', targetService: 'ObservabilityService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'createFeedback', targetService: 'ObservabilityService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
  { method: 'runEvaluation', targetService: 'ObservabilityService', currentOwner: 'NexaStore', migrationState: 'facade-boundary-only' },
] as const satisfies readonly StoreBoundaryMapEntry[];

export function getStoreBoundaryTarget(method: string): StoreBoundaryMapEntry | null {
  return STORE_BOUNDARY_MAP.find((entry) => entry.method === method) ?? null;
}
