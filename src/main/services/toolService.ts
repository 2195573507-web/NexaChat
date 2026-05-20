import { createId, now } from '../utils/ids.js';
import { translate } from '../../shared/i18n.js';
import { EXECUTION_APPROVAL_TTL_MS, EXECUTION_RESERVED_RUN_KINDS, EXECUTION_TOOL_IDS, normalizeApprovalDecision, normalizeExecutionStartInput } from '../../shared/executionRuntime.js';
import { SECURITY_ACTION_PERMISSIONS } from '../../shared/securityRuntime.js';
import type {
  AgentDefinition,
  ApprovalDecisionInput,
  ApprovalRequest,
  ExecutionRun,
  ExecutionStartInput,
  ExecutionStep,
  ExecutionTraceEvent,
  McpServer,
  ToolDefinition
} from '../../shared/types.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);
const APPROVAL_EXPIRED_MESSAGE = 'Approval has expired.';



export function ToolService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class ToolService extends Base {
  getMcpServers(): McpServer[] {
    return this.repositories.tool.listMcpServers();
  }


  getAgents(): AgentDefinition[] {
    return this.repositories.tool.listAgents();
  }


  getTools(): ToolDefinition[] {
    return this.repositories.tool.listTools();
  }


  getExecutionRuns(): ExecutionRun[] {
    return this.repositories.tool.listExecutionRuns();
  }


  getExecutionSteps(runId?: string): ExecutionStep[] {
    return this.repositories.tool.listExecutionSteps(runId);
  }


  getExecutionTraceEvents(runId?: string): ExecutionTraceEvent[] {
    return this.repositories.tool.listExecutionTraceEvents(runId);
  }


  getApprovalRequests(): ApprovalRequest[] {
    return this.repositories.tool.listApprovalRequests();
  }


  createMcpServer(name: string, transport: McpServer['transport'], commandOrUrl: string): McpServer {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.mcpWrite, 'mcp_server', null);
    const timestamp = now();
    const id = createId('mcp');
    this.db
      .prepare(
        `INSERT INTO mcp_servers (id, name, transport, command_or_url, enabled, permission_state, last_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 'discovered', 'unknown', ?, ?)`,
      )
      .run(id, name.trim(), transport, commandOrUrl.trim(), timestamp, timestamp);
    this.audit('mcp.server.registered', 'mcp_server', id, { name, transport });
    return this.requireMcpServer(id);
  }


  updateMcpPermission(serverId: string, permissionState: McpServer['permissionState']): McpServer {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.mcpPermissionWrite, 'mcp_server', serverId);
    const timestamp = now();
    const enabled = permissionState === 'granted' ? 1 : 0;
    this.db
      .prepare('UPDATE mcp_servers SET permission_state = ?, enabled = ?, last_status = ?, updated_at = ? WHERE id = ?')
      .run(permissionState, enabled, permissionState === 'granted' ? 'warning' : 'unknown', timestamp, serverId);
    this.audit('mcp.permission.updated', 'mcp_server', serverId, { permissionState, enabled: Boolean(enabled) });
    return this.requireMcpServer(serverId);
  }


  createAgent(name: string, goal: string): AgentDefinition {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.agentWrite, 'agent', null);
    const timestamp = now();
    const id = createId('agent');
    this.db
      .prepare(
        `INSERT INTO agents (id, name, goal, default_model_id, approval_policy, stage, created_at, updated_at)
         VALUES (?, ?, ?, NULL, 'destructive-only', 'planned', ?, ?)`,
      )
      .run(id, name.trim(), goal.trim(), timestamp, timestamp);
    this.audit('agent.definition.created', 'agent', id, { name, mode: 'dry-run only' });
    return this.requireAgent(id);
  }


  previewAgentRun(agentId: string): ExecutionRun {
    return this.startExecutionRun({
      kind: 'agent',
      mode: 'preview',
      agentId,
      toolId: EXECUTION_TOOL_IDS.statusRead,
      inputJson: '{}',
    });
  }


  startExecutionRun(input: ExecutionStartInput): ExecutionRun {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.executionRun, 'execution_run', null);
    const normalized = normalizeExecutionStartInput(input);
    const timestamp = now();
    if (EXECUTION_RESERVED_RUN_KINDS.includes(normalized.kind)) {
      throw new Error(t('tools.execution.reservedKinds.detail'));
    }
    const runId = createId('run');
    const agent = normalized.agentId ? this.requireAgent(normalized.agentId) : null;
    const tool = normalized.toolId ? this.requireTool(normalized.toolId) : this.requireTool(EXECUTION_TOOL_IDS.statusRead);
    const requiresApproval = normalized.mode === 'execute' && tool.requiresApproval;
    const initialStatus: ExecutionRun['status'] = requiresApproval ? 'waiting_approval' : 'completed';
    const mode = normalized.mode ?? 'preview';
    const title = agent
      ? t('tools.execution.title.agent', { agent: agent.name })
      : normalized.kind === 'workflow'
        ? t('tools.execution.title.workflow')
        : t('tools.execution.title.tool', { tool: tool.name });
    const output = requiresApproval ? null : this.executeFixtureTool(tool.id, normalized.inputJson ?? '{}');

    this.db
      .prepare(
        `INSERT INTO execution_runs (id, kind, status, mode, title, agent_id, tool_id, mcp_server_id, workflow_id, input_json, output_json, error_message, approval_status, sandbox_mode, created_at, updated_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
      )
      .run(
        runId,
        normalized.kind,
        initialStatus,
        mode,
        title,
        agent?.id ?? null,
        tool.id,
        normalized.mcpServerId ?? null,
        normalized.workflowId ?? null,
        normalized.inputJson ?? '{}',
        output,
        requiresApproval ? 'pending' : null,
        tool.riskLevel === 'read' ? 'read-only' : 'fixture-only',
        timestamp,
        timestamp,
        requiresApproval ? null : timestamp,
      );

    this.createExecutionStep({
      runId,
      kind: 'plan',
      title: agent ? t('tools.agent.dryRun.step.read') : t('tools.execution.step.plan'),
      status: 'completed',
      position: 1,
      timestamp,
    });
    this.addTrace(runId, null, 'run_planned', title, { kind: normalized.kind, mode });
    this.createExecutionStep({
      runId,
      kind: 'permission',
      title: t('tools.execution.step.permission'),
      status: 'completed',
      toolId: tool.id,
      position: 2,
      timestamp,
    });
    this.addTrace(runId, null, 'permission_checked', t('tools.execution.trace.permissionChecked'), {
      permissionKey: tool.permissionKey,
      riskLevel: tool.riskLevel,
      requiresApproval,
    });

    if (requiresApproval) {
      const stepId = this.createExecutionStep({
        runId,
        kind: 'approval',
        title: t('tools.execution.step.approval'),
        status: 'waiting_approval',
        toolId: tool.id,
        position: 3,
        timestamp,
      });
      const approvalId = createId('approval');
      this.db
        .prepare(
          `INSERT INTO approval_requests (id, run_id, step_id, status, requested_action, risk_level, reason, decision_reason, decided_at, created_at, expires_at)
           VALUES (?, ?, ?, 'pending', ?, ?, ?, NULL, NULL, ?, ?)`,
        )
        .run(approvalId, runId, stepId, tool.name, tool.riskLevel, t('tools.execution.approval.reason', { tool: tool.name }), timestamp, timestamp + EXECUTION_APPROVAL_TTL_MS);
      this.addTrace(runId, stepId, 'approval_requested', t('tools.execution.trace.approvalRequested'), { approvalId, toolId: tool.id, expiresAt: timestamp + EXECUTION_APPROVAL_TTL_MS });
    } else {
      const stepId = this.createExecutionStep({
        runId,
        kind: 'tool',
        title: tool.name,
        status: 'completed',
        toolId: tool.id,
        outputJson: output,
        position: 3,
        timestamp,
      });
      this.addTrace(runId, stepId, 'tool_called', t('tools.execution.trace.toolCalled'), { toolId: tool.id });
      this.addTrace(runId, stepId, 'step_completed', t('tools.execution.trace.stepCompleted'), { outputJson: output });
      this.addTrace(runId, null, 'run_completed', t('tools.execution.trace.runCompleted'), { runId });
    }

    this.audit('execution.run.started', 'execution_run', runId, { kind: normalized.kind, mode, toolId: tool.id });
    return this.requireExecutionRun(runId);
  }


  decideApproval(input: ApprovalDecisionInput): ExecutionRun {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.executionApprove, 'approval_request', input.approvalId);
    const normalized = normalizeApprovalDecision(input);
    const approval = this.requireApprovalRequest(normalized.approvalId);
    const timestamp = now();
    if (approval.status !== 'pending') {
      return this.requireExecutionRun(approval.runId);
    }
    const run = this.requireExecutionRun(approval.runId);
    if (approval.expiresAt !== null && approval.expiresAt <= timestamp) {
      this.db
        .prepare('UPDATE approval_requests SET status = ?, decision_reason = ?, decided_at = ? WHERE id = ?')
        .run('expired', APPROVAL_EXPIRED_MESSAGE, timestamp, approval.id);
      if (approval.stepId) {
        this.db
          .prepare('UPDATE execution_steps SET status = ?, error_message = ?, completed_at = ?, updated_at = ? WHERE id = ?')
          .run('cancelled', APPROVAL_EXPIRED_MESSAGE, timestamp, timestamp, approval.stepId);
      }
      this.db
        .prepare('UPDATE execution_runs SET status = ?, approval_status = ?, error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?')
        .run('cancelled', 'expired', APPROVAL_EXPIRED_MESSAGE, timestamp, timestamp, run.id);
      this.addTrace(run.id, approval.stepId, 'run_cancelled', t('tools.execution.trace.runCancelled'), { approvalId: approval.id, reason: 'approval_expired' });
      this.audit('execution.approval.expired', 'execution_run', run.id, { approvalId: approval.id });
      return this.requireExecutionRun(run.id);
    }
    const tool = run.toolId ? this.requireTool(run.toolId) : this.requireTool(EXECUTION_TOOL_IDS.statusRead);
    const approved = normalized.decision === 'approved';
    const decisionReason = normalized.reason ?? null;
    this.db
      .prepare('UPDATE approval_requests SET status = ?, decision_reason = ?, decided_at = ? WHERE id = ?')
      .run(normalized.decision, decisionReason, timestamp, approval.id);
    if (approval.stepId) {
      this.db
        .prepare('UPDATE execution_steps SET status = ?, output_json = ?, error_message = ?, completed_at = ?, updated_at = ? WHERE id = ?')
        .run(approved ? 'completed' : 'cancelled', JSON.stringify({ decision: normalized.decision }), approved ? null : decisionReason, timestamp, timestamp, approval.stepId);
    }
    this.addTrace(run.id, approval.stepId, 'approval_decided', t('tools.execution.trace.approvalDecided'), normalized);

    if (!approved) {
      this.db
        .prepare('UPDATE execution_runs SET status = ?, approval_status = ?, error_message = ?, updated_at = ?, completed_at = ? WHERE id = ?')
        .run('cancelled', 'denied', decisionReason ?? t('tools.execution.error.denied'), timestamp, timestamp, run.id);
      this.addTrace(run.id, null, 'run_cancelled', t('tools.execution.trace.runCancelled'), { approvalId: approval.id });
      this.audit('execution.approval.denied', 'execution_run', run.id, { approvalId: approval.id, reason: normalized.reason });
      return this.requireExecutionRun(run.id);
    }

    const output = this.executeFixtureTool(tool.id, run.inputJson ?? '{}');
    const toolStepId = this.createExecutionStep({
      runId: run.id,
      kind: 'tool',
      title: tool.name,
      status: 'completed',
      toolId: tool.id,
      inputJson: run.inputJson,
      outputJson: output,
      position: this.getExecutionSteps(run.id).length + 1,
      timestamp,
    });
    this.db
      .prepare('UPDATE execution_runs SET status = ?, output_json = ?, approval_status = ?, updated_at = ?, completed_at = ? WHERE id = ?')
      .run('completed', output, 'approved', timestamp, timestamp, run.id);
    this.addTrace(run.id, toolStepId, 'tool_called', t('tools.execution.trace.toolCalled'), { toolId: tool.id });
    this.addTrace(run.id, toolStepId, 'step_completed', t('tools.execution.trace.stepCompleted'), { outputJson: output });
    this.addTrace(run.id, null, 'run_completed', t('tools.execution.trace.runCompleted'), { runId: run.id });
    this.audit('execution.approval.approved', 'execution_run', run.id, { approvalId: approval.id, toolId: tool.id });
    return this.requireExecutionRun(run.id);
  }

  };
}
