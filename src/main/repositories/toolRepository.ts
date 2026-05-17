import type { DatabaseSync } from 'node:sqlite';
import type {
  AgentDefinition,
  ApprovalRequest,
  ExecutionRun,
  ExecutionStep,
  ExecutionTraceEvent,
  McpServer,
  ToolDefinition,
} from '../../shared/types.js';
import {
  mapAgent,
  mapApprovalRequest,
  mapExecutionRun,
  mapExecutionStep,
  mapExecutionTraceEvent,
  mapMcpServer,
  mapToolDefinition,
} from './mappers.js';

export class ToolRepository {
  constructor(private readonly db: DatabaseSync) {}

  listMcpServers(): McpServer[] {
    return this.db
      .prepare('SELECT * FROM mcp_servers ORDER BY updated_at DESC')
      .all()
      .map((row) => mapMcpServer(row as Record<string, unknown>));
  }

  listAgents(): AgentDefinition[] {
    return this.db
      .prepare('SELECT * FROM agents ORDER BY updated_at DESC')
      .all()
      .map((row) => mapAgent(row as Record<string, unknown>));
  }

  listTools(): ToolDefinition[] {
    return this.db
      .prepare('SELECT * FROM tools ORDER BY name ASC')
      .all()
      .map((row) => mapToolDefinition(row as Record<string, unknown>));
  }

  listExecutionRuns(): ExecutionRun[] {
    return this.db
      .prepare('SELECT * FROM execution_runs ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapExecutionRun(row as Record<string, unknown>));
  }

  listExecutionSteps(runId?: string): ExecutionStep[] {
    const rows = runId
      ? this.db.prepare('SELECT * FROM execution_steps WHERE run_id = ? ORDER BY position ASC, created_at ASC').all(runId)
      : this.db.prepare('SELECT * FROM execution_steps ORDER BY created_at DESC LIMIT 300').all();
    return rows.map((row) => mapExecutionStep(row as Record<string, unknown>));
  }

  listExecutionTraceEvents(runId?: string): ExecutionTraceEvent[] {
    const rows = runId
      ? this.db.prepare('SELECT * FROM execution_trace_events WHERE run_id = ? ORDER BY created_at ASC').all(runId)
      : this.db.prepare('SELECT * FROM execution_trace_events ORDER BY created_at DESC LIMIT 300').all();
    return rows.map((row) => mapExecutionTraceEvent(row as Record<string, unknown>));
  }

  listApprovalRequests(): ApprovalRequest[] {
    return this.db
      .prepare('SELECT * FROM approval_requests ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapApprovalRequest(row as Record<string, unknown>));
  }
}
