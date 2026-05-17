import type { DatabaseSync } from 'node:sqlite';
import type {
  SecurityAclGrant,
  SecurityRole,
  SecuritySession,
  SecurityUser,
} from '../../shared/types.js';
import {
  mapSecurityAclGrant,
  mapSecurityRole,
  mapSecuritySession,
  mapSecurityUser,
} from './mappers.js';

export class SecurityRepository {
  constructor(private readonly db: DatabaseSync) {}

  listSecurityUsers(): SecurityUser[] {
    return this.db
      .prepare('SELECT * FROM security_users ORDER BY created_at ASC')
      .all()
      .map((row) => mapSecurityUser(row as Record<string, unknown>));
  }

  listSecurityRoles(): SecurityRole[] {
    return this.db
      .prepare('SELECT * FROM security_roles ORDER BY id ASC')
      .all()
      .map((row) => mapSecurityRole(row as Record<string, unknown>));
  }

  listSecuritySessions(): SecuritySession[] {
    return this.db
      .prepare('SELECT * FROM security_sessions ORDER BY last_seen_at DESC')
      .all()
      .map((row) => mapSecuritySession(row as Record<string, unknown>));
  }

  listAclGrants(): SecurityAclGrant[] {
    return this.db
      .prepare('SELECT * FROM acl_grants ORDER BY created_at DESC')
      .all()
      .map((row) => mapSecurityAclGrant(row as Record<string, unknown>));
  }
}
