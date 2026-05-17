import { describe, expect, it } from 'vitest';
import { APP_API_METHODS } from '../src/shared/api';
import { STORE_BOUNDARY_MAP, getStoreBoundaryTarget } from '../src/main/services/storeBoundaries';

describe('main-process service boundaries', () => {
  it('documents implemented service targets for the compatibility facade', () => {
    expect(getStoreBoundaryTarget('sendMessage')?.targetService).toBe('ChatService');
    expect(getStoreBoundaryTarget('createGatewayKey')?.targetService).toBe('GatewayService');
    expect(getStoreBoundaryTarget('createKnowledgeFile')?.targetService).toBe('KnowledgeService');
    expect(getStoreBoundaryTarget('startExecutionRun')?.targetService).toBe('ToolService');
    expect(getStoreBoundaryTarget('restoreSnapshot')?.targetService).toBe('DataService');
    expect(getStoreBoundaryTarget('verifyAuditIntegrity')?.targetService).toBe('AuditService');
    expect(getStoreBoundaryTarget('runEvaluation')?.targetService).toBe('ObservabilityService');

    for (const entry of STORE_BOUNDARY_MAP) {
      if (entry.targetService === 'StoreFacade') {
        expect(entry.migrationState).toBe('facade-compatibility');
      } else {
        expect(entry.currentOwner).toBe(entry.targetService);
        expect(entry.migrationState).toBe('service-implemented');
      }
    }
  });

  it('keeps boundary entries tied to existing API method names where applicable', () => {
    const apiMethodNames = new Set<string>(APP_API_METHODS);
    const facadeMethods = new Set([
      'getSnapshot',
      'authorizeGatewayKey',
      'recordGatewayLog',
      'getSecurityState',
      'requirePermission',
      'resolveGatewayModelId',
    ]);
    for (const entry of STORE_BOUNDARY_MAP) {
      expect(apiMethodNames.has(entry.method) || facadeMethods.has(entry.method)).toBe(true);
    }
  });
});
