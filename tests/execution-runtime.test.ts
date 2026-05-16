import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXECUTION_TOOL_IDS, EXECUTION_RUN_STATUSES, TOOL_FIXTURES } from '../src/shared/executionRuntime';

let dataDir = '';

vi.mock('electron', () => ({
  app: {
    getPath: () => dataDir,
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value, 'utf8'),
    decryptString: (value: Buffer) => value.toString('utf8'),
  },
}));

beforeEach(() => {
  vi.resetModules();
  dataDir = join(process.cwd(), 'test-results', `round-10-execution-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
});

afterEach(async () => {
  const { closeDatabase } = await import('../src/main/database/connection');
  closeDatabase();
  delete process.env.NEXACHAT_DATA_DIR;
  vi.resetModules();
});

describe('Round 10 execution runtime', () => {
  it('defines one status and tool authority for Agent Tool MCP and Workflow runs', () => {
    expect(EXECUTION_RUN_STATUSES).toContain('waiting_approval');
    expect(TOOL_FIXTURES.map((tool) => tool.id)).toEqual([EXECUTION_TOOL_IDS.statusRead, EXECUTION_TOOL_IDS.echo]);
    expect(TOOL_FIXTURES.find((tool) => tool.id === EXECUTION_TOOL_IDS.echo)?.requiresApproval).toBe(true);
  });

  it('creates execution runs steps traces and approval decisions without config snapshots', async () => {
    const { store } = await import('../src/main/services/store');
    const agent = store.createAgent('Round 10 Agent', 'Verify execution chain');
    const preview = store.previewAgentRun(agent.id);

    expect(preview.kind).toBe('agent');
    expect(preview.status).toBe('completed');
    expect(store.getExecutionSteps(preview.id).length).toBeGreaterThanOrEqual(3);
    expect(store.getExecutionTraceEvents(preview.id).map((event) => event.eventType)).toContain('run_completed');
    expect(store.getImportExportResults().some((result) => result.summary.includes('Round 10 Agent'))).toBe(false);

    const gated = store.startExecutionRun({
      kind: 'tool',
      mode: 'execute',
      toolId: EXECUTION_TOOL_IDS.echo,
      inputJson: JSON.stringify({ message: 'approval path' }),
    });
    expect(gated.status).toBe('waiting_approval');
    const approval = store.getApprovalRequests().find((item) => item.runId === gated.id);
    expect(approval?.status).toBe('pending');

    const completed = store.decideApproval({ approvalId: approval!.id, decision: 'approved', reason: 'test approval' });
    expect(completed.status).toBe('completed');
    expect(completed.approvalStatus).toBe('approved');
    expect(store.getExecutionTraceEvents(completed.id).map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['approval_requested', 'approval_decided', 'tool_called', 'run_completed']),
    );
  });
});
