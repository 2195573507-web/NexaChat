import { translate } from '../../shared/i18n.js';
import { SECURITY_PERMISSION_KEYS, evaluatePermission, type SecurityPermissionKey } from '../../shared/securityRuntime.js';
import type {
  SecurityAclGrant,
  SecurityRole,
  SecuritySession,
  SecurityState,
  SecurityUser
} from '../../shared/types.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);



export function SecurityService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class SecurityService extends Base {
  getSecurityUsers(): SecurityUser[] {
    return this.repositories.security.listSecurityUsers();
  }


  getSecurityRoles(): SecurityRole[] {
    return this.repositories.security.listSecurityRoles();
  }


  getSecuritySessions(): SecuritySession[] {
    return this.repositories.security.listSecuritySessions();
  }


  getAclGrants(): SecurityAclGrant[] {
    return this.repositories.security.listAclGrants();
  }


  getSecurityState(): SecurityState {
    const activeSession = this.getActiveSession();
    const activeUser = this.requireSecurityUser(activeSession.userId);
    const activeRole = this.requireSecurityRole(activeSession.roleId);
    return {
      activeUser,
      activeSession,
      activeRole,
      roles: this.getSecurityRoles(),
      aclGrants: this.getAclGrants(),
      permissionKeys: [...SECURITY_PERMISSION_KEYS],
      deniedCount: this.countAuditAction('security.permission.denied'),
    };
  }


  requirePermission(permissionKey: SecurityPermissionKey, resourceType: string | null = null, resourceId: string | null = null): void {
    const session = this.getActiveSession();
    const grants = this.getAclGrants();
    const result = evaluatePermission({
      permissionKey,
      roleId: session.roleId,
      userId: session.userId,
      resourceType,
      resourceId,
      aclGrants: grants,
    });
    this.touchSession(session.id);
    if (!result.allowed) {
      this.audit('security.permission.denied', resourceType ?? 'permission', resourceId, result, permissionKey);
      throw new Error(t('settings.security.permissionDenied', { permission: permissionKey }));
    }
  }

  };
}
