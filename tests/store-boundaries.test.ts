import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_API_METHODS } from '../src/shared/api';
import { STORE_BOUNDARY_MAP, getStoreBoundaryTarget } from '../src/main/services/storeBoundaries';

const projectRoot = process.cwd();
const servicesDir = join(projectRoot, 'src/main/services');
const domainServiceFiles = readdirSync(servicesDir)
  .filter((fileName) => fileName.endsWith('Service.ts') && fileName !== 'serviceContext.ts');

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

  it('keeps shared service helpers and gateway compatibility types centralized in ServiceContext', () => {
    const duplicatedHelperPattern =
      /function (normalizeBaseUrl|buildChatRequestSummary|encodeSecretValue|decodeSecretValue|inferTitle|safeJsonParse|safeStringArray|scoreEvaluationOutput|computeAuditHash)\(/;

    for (const fileName of domainServiceFiles) {
      const source = readFileSync(join(servicesDir, fileName), 'utf8');
      expect(source, `${fileName} should not redefine ServiceContext helpers`).not.toMatch(duplicatedHelperPattern);
      if (fileName !== 'gatewayService.ts') {
        expect(source, `${fileName} should not export gateway compatibility types`).not.toContain('GatewayAuthorizationResult');
        expect(source, `${fileName} should not export gateway compatibility types`).not.toContain('GatewayLogInput');
      }
    }
  });

  it('keeps secret storage policy in a focused security helper', () => {
    const serviceContext = readFileSync(join(servicesDir, 'serviceContext.ts'), 'utf8');
    const secretStorage = readFileSync(join(projectRoot, 'src/main/security/secretStorage.ts'), 'utf8');

    expect(serviceContext).toContain("../security/secretStorage.js");
    expect(serviceContext).not.toMatch(/function (encodeSecretValue|decodeSecretValue|canUseDevelopmentSecretFallback)\(/);
    expect(secretStorage).toContain('safeStorage:v1:');
    expect(secretStorage).toContain('local-dev:v1:');
    expect(secretStorage).toContain('Secure secret storage is unavailable');
  });
});
