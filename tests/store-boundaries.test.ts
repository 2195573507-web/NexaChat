import { describe, expect, it } from 'vitest';
import { APP_API_METHODS } from '../src/shared/api';
import { STORE_BOUNDARY_MAP, getStoreBoundaryTarget } from '../src/main/services/storeBoundaries';

describe('NexaStore boundary preparation', () => {
  it('documents future service targets without claiming a completed split', () => {
    expect(getStoreBoundaryTarget('sendMessage')?.targetService).toBe('ChatService');
    expect(getStoreBoundaryTarget('createGatewayKey')?.targetService).toBe('GatewayService');
    expect(getStoreBoundaryTarget('createKnowledgeFile')?.targetService).toBe('KnowledgeService');
    expect(getStoreBoundaryTarget('startExecutionRun')?.targetService).toBe('ToolService');
    expect(getStoreBoundaryTarget('restoreSnapshot')?.targetService).toBe('DataService');
    expect(getStoreBoundaryTarget('verifyAuditIntegrity')?.targetService).toBe('SecurityService');
    expect(getStoreBoundaryTarget('runEvaluation')?.targetService).toBe('ObservabilityService');

    for (const entry of STORE_BOUNDARY_MAP) {
      expect(entry.currentOwner).toBe('NexaStore');
      expect(entry.migrationState).toBe('facade-boundary-only');
    }
  });

  it('keeps boundary entries tied to existing API method names where applicable', () => {
    const apiMethodNames = new Set<string>(APP_API_METHODS);
    const facadeMethods = new Set(['getSnapshot', 'authorizeGatewayKey', 'recordGatewayLog', 'getSecurityState']);
    for (const entry of STORE_BOUNDARY_MAP) {
      expect(apiMethodNames.has(entry.method) || facadeMethods.has(entry.method)).toBe(true);
    }
  });
});
