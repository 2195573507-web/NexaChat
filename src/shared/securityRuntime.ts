import { IPC_CHANNELS, type IpcChannel } from './ipc.js';

export const SECURITY_PERMISSION_KEYS = [
  'app:snapshot:read',
  'provider:write',
  'provider:test',
  'model:write',
  'chat:write',
  'chat:manage',
  'chat:export',
  'gateway:key:write',
  'gateway:runtime:write',
  'knowledge:read',
  'knowledge:write',
  'mcp:write',
  'mcp:permission:write',
  'agent:write',
  'execution:run',
  'execution:approve',
  'data:import',
  'data:restore',
  'data:export',
  'settings:write',
  'system:logs:open',
  'audit:read',
  'audit:export',
  'audit:verify',
  'observability:read',
  'observability:write',
  'observability:export',
  'security:manage',
] as const;

export type SecurityPermissionKey = (typeof SECURITY_PERMISSION_KEYS)[number];

export const SECURITY_ROLE_IDS = ['owner', 'operator', 'viewer'] as const;
export type SecurityRoleId = (typeof SECURITY_ROLE_IDS)[number];

export const SECURITY_SESSION_STATES = ['active', 'expired', 'revoked'] as const;
export type SecuritySessionState = (typeof SECURITY_SESSION_STATES)[number];

export const SECURITY_USER_STATUSES = ['active', 'disabled'] as const;
export type SecurityUserStatus = (typeof SECURITY_USER_STATUSES)[number];

export const ACL_EFFECTS = ['allow', 'deny'] as const;
export type AclEffect = (typeof ACL_EFFECTS)[number];

export type AuditIntegrityStatus = 'verified' | 'broken' | 'empty';

export interface SecurityRoleDefinition {
  id: SecurityRoleId;
  nameKey: string;
  descriptionKey: string;
  permissionKeys: SecurityPermissionKey[];
}

export interface PermissionCheckInput {
  permissionKey: SecurityPermissionKey;
  roleId: SecurityRoleId;
  userId: string;
  resourceType?: string | null;
  resourceId?: string | null;
  aclGrants?: SecurityAclGrantLike[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  permissionKey: SecurityPermissionKey;
  roleId: SecurityRoleId;
  userId: string;
  reason: 'role' | 'acl-allow' | 'acl-deny' | 'missing-permission';
}

export interface SecurityAclGrantLike {
  subjectType: 'user' | 'role';
  subjectId: string;
  resourceType: string;
  resourceId: string | null;
  permissionKey: SecurityPermissionKey;
  effect: AclEffect;
  expiresAt: number | null;
}

export const SECURITY_ROLES: SecurityRoleDefinition[] = [
  {
    id: 'owner',
    nameKey: 'settings.security.role.owner',
    descriptionKey: 'settings.security.role.owner.note',
    permissionKeys: [...SECURITY_PERMISSION_KEYS],
  },
  {
    id: 'operator',
    nameKey: 'settings.security.role.operator',
    descriptionKey: 'settings.security.role.operator.note',
    permissionKeys: [
      'app:snapshot:read',
      'provider:write',
      'provider:test',
      'model:write',
      'chat:write',
      'chat:manage',
      'chat:export',
      'gateway:key:write',
      'gateway:runtime:write',
      'knowledge:read',
      'knowledge:write',
      'mcp:write',
      'mcp:permission:write',
      'agent:write',
      'execution:run',
      'execution:approve',
      'data:import',
      'data:export',
      'settings:write',
      'system:logs:open',
      'audit:read',
      'audit:verify',
      'observability:read',
      'observability:write',
      'observability:export',
    ],
  },
  {
    id: 'viewer',
    nameKey: 'settings.security.role.viewer',
    descriptionKey: 'settings.security.role.viewer.note',
    permissionKeys: [
      'app:snapshot:read',
      'knowledge:read',
      'audit:read',
      'audit:verify',
      'observability:read',
      'observability:export',
      'data:export',
      'system:logs:open',
    ],
  },
];

export const IPC_PERMISSION_BY_CHANNEL = {
  [IPC_CHANNELS.appGetSnapshot]: 'app:snapshot:read',
  [IPC_CHANNELS.providerDiscover]: 'provider:test',
  [IPC_CHANNELS.providerSaveFromDiscovery]: 'provider:write',
  [IPC_CHANNELS.providerCreate]: 'provider:write',
  [IPC_CHANNELS.providerDelete]: 'provider:write',
  [IPC_CHANNELS.providerModelsFetch]: 'provider:test',
  [IPC_CHANNELS.providerTest]: 'provider:test',
  [IPC_CHANNELS.modelCreate]: 'model:write',
  [IPC_CHANNELS.modelUpdate]: 'model:write',
  [IPC_CHANNELS.modelDisable]: 'model:write',
  [IPC_CHANNELS.modelEnable]: 'model:write',
  [IPC_CHANNELS.modelDelete]: 'model:write',
  [IPC_CHANNELS.chatCreateConversation]: 'chat:write',
  [IPC_CHANNELS.chatSendMessage]: 'chat:write',
  [IPC_CHANNELS.chatRetryMessage]: 'chat:write',
  [IPC_CHANNELS.chatRegenerateMessage]: 'chat:write',
  [IPC_CHANNELS.chatCancelMessage]: 'chat:manage',
  [IPC_CHANNELS.chatCompareModels]: 'chat:write',
  [IPC_CHANNELS.chatExportConversation]: 'chat:export',
  [IPC_CHANNELS.chatListConversations]: 'app:snapshot:read',
  [IPC_CHANNELS.chatListMessages]: 'app:snapshot:read',
  [IPC_CHANNELS.chatUpdateConversationFlags]: 'chat:manage',
  [IPC_CHANNELS.gatewayLogsList]: 'observability:read',
  [IPC_CHANNELS.auditLogsList]: 'audit:read',
  [IPC_CHANNELS.knowledgeFilesList]: 'knowledge:read',
  [IPC_CHANNELS.knowledgeChunksList]: 'knowledge:read',
  [IPC_CHANNELS.usageTrendGet]: 'observability:read',
  [IPC_CHANNELS.taskCancel]: 'execution:run',
  [IPC_CHANNELS.gatewayCreateKey]: 'gateway:key:write',
  [IPC_CHANNELS.gatewayUpdateKey]: 'gateway:key:write',
  [IPC_CHANNELS.gatewayRotateKey]: 'gateway:key:write',
  [IPC_CHANNELS.gatewayRevokeKey]: 'gateway:key:write',
  [IPC_CHANNELS.gatewayToggle]: 'gateway:runtime:write',
  [IPC_CHANNELS.settingsSaveUiPreferences]: 'settings:write',
  [IPC_CHANNELS.knowledgeCreateFile]: 'knowledge:write',
  [IPC_CHANNELS.knowledgeRetryFile]: 'knowledge:write',
  [IPC_CHANNELS.knowledgeRebuildFile]: 'knowledge:write',
  [IPC_CHANNELS.knowledgeDeleteFile]: 'knowledge:write',
  [IPC_CHANNELS.knowledgePreviewRetrieval]: 'knowledge:read',
  [IPC_CHANNELS.mcpCreateServer]: 'mcp:write',
  [IPC_CHANNELS.mcpUpdatePermission]: 'mcp:permission:write',
  [IPC_CHANNELS.agentCreate]: 'agent:write',
  [IPC_CHANNELS.agentPreviewRun]: 'execution:run',
  [IPC_CHANNELS.executionStartRun]: 'execution:run',
  [IPC_CHANNELS.executionDecideApproval]: 'execution:approve',
  [IPC_CHANNELS.dataValidateImportManifest]: 'data:import',
  [IPC_CHANNELS.dataApplyImportPlan]: 'data:import',
  [IPC_CHANNELS.dataRestoreSnapshot]: 'data:restore',
  [IPC_CHANNELS.dataCreateSnapshot]: 'data:export',
  [IPC_CHANNELS.dataExportDiagnostics]: 'data:export',
  [IPC_CHANNELS.dataExportPackage]: 'data:export',
  [IPC_CHANNELS.dataCreateEncryptedBackup]: 'data:export',
  [IPC_CHANNELS.dataCreateRestorePreflight]: 'data:restore',
  [IPC_CHANNELS.dataApplyRollback]: 'data:restore',
  [IPC_CHANNELS.auditSearch]: 'audit:read',
  [IPC_CHANNELS.auditVerify]: 'audit:verify',
  [IPC_CHANNELS.auditExport]: 'audit:export',
  [IPC_CHANNELS.observabilityQuery]: 'observability:read',
  [IPC_CHANNELS.observabilityCreateFeedback]: 'observability:write',
  [IPC_CHANNELS.observabilityRunEval]: 'observability:write',
  [IPC_CHANNELS.observabilitySavePrivacy]: 'observability:write',
  [IPC_CHANNELS.observabilityExport]: 'observability:export',
  [IPC_CHANNELS.systemOpenLogs]: 'system:logs:open',
} as const satisfies Record<IpcChannel, SecurityPermissionKey>;

export const SECURITY_REDACTION_KEYS = [
  'authorization',
  'api-key',
  'apikey',
  'x-api-key',
  'token',
  'secret',
  'password',
  'credential',
] as const;

export const SECURITY_ACTION_PERMISSIONS = {
  snapshotRead: 'app:snapshot:read',
  providerWrite: 'provider:write',
  providerTest: 'provider:test',
  modelWrite: 'model:write',
  chatWrite: 'chat:write',
  chatManage: 'chat:manage',
  chatExport: 'chat:export',
  gatewayKeyWrite: 'gateway:key:write',
  gatewayRuntimeWrite: 'gateway:runtime:write',
  knowledgeRead: 'knowledge:read',
  knowledgeWrite: 'knowledge:write',
  mcpWrite: 'mcp:write',
  mcpPermissionWrite: 'mcp:permission:write',
  agentWrite: 'agent:write',
  executionRun: 'execution:run',
  executionApprove: 'execution:approve',
  dataImport: 'data:import',
  dataRestore: 'data:restore',
  dataExport: 'data:export',
  settingsWrite: 'settings:write',
  systemLogsOpen: 'system:logs:open',
  auditRead: 'audit:read',
  auditExport: 'audit:export',
  auditVerify: 'audit:verify',
  observabilityRead: 'observability:read',
  observabilityWrite: 'observability:write',
  observabilityExport: 'observability:export',
  securityManage: 'security:manage',
} as const satisfies Record<string, SecurityPermissionKey>;

export const SECURITY_AUDIT_ACTIONS = [
  'security.bootstrap',
  'security.session.created',
  'security.session.activated',
  'security.permission.denied',
  'audit.integrity.verified',
  'audit.exported',
  'audit.searched',
] as const;

export function isSecurityPermissionKey(value: string): value is SecurityPermissionKey {
  return (SECURITY_PERMISSION_KEYS as readonly string[]).includes(value);
}

export function isSecurityRoleId(value: string): value is SecurityRoleId {
  return (SECURITY_ROLE_IDS as readonly string[]).includes(value);
}

export function getSecurityRole(roleId: SecurityRoleId): SecurityRoleDefinition {
  return SECURITY_ROLES.find((role) => role.id === roleId) ?? SECURITY_ROLES[0];
}

export function evaluatePermission(input: PermissionCheckInput): PermissionCheckResult {
  const activeAclGrants = (input.aclGrants ?? []).filter((grant) => !grant.expiresAt || grant.expiresAt > Date.now());
  const matchingAclGrants = activeAclGrants.filter((grant) => matchesAclGrant(grant, input));
  if (matchingAclGrants.some((grant) => grant.effect === 'deny')) {
    return { ...baseResult(input), allowed: false, reason: 'acl-deny' };
  }
  if (getSecurityRole(input.roleId).permissionKeys.includes(input.permissionKey)) {
    return { ...baseResult(input), allowed: true, reason: 'role' };
  }
  if (matchingAclGrants.some((grant) => grant.effect === 'allow')) {
    return { ...baseResult(input), allowed: true, reason: 'acl-allow' };
  }
  return { ...baseResult(input), allowed: false, reason: 'missing-permission' };
}

function baseResult(input: PermissionCheckInput) {
  return {
    permissionKey: input.permissionKey,
    roleId: input.roleId,
    userId: input.userId,
  };
}

function matchesAclGrant(grant: SecurityAclGrantLike, input: PermissionCheckInput): boolean {
  const subjectMatches =
    (grant.subjectType === 'user' && grant.subjectId === input.userId) ||
    (grant.subjectType === 'role' && grant.subjectId === input.roleId);
  if (!subjectMatches || grant.permissionKey !== input.permissionKey) {
    return false;
  }
  if (grant.resourceType !== '*' && grant.resourceType !== (input.resourceType ?? '*')) {
    return false;
  }
  return grant.resourceId === null || grant.resourceId === input.resourceId;
}
