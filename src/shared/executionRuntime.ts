import type {
  ApprovalDecisionInput,
  ExecutionRunKind,
  ExecutionRunStatus,
  ExecutionStartInput,
  ExecutionStepStatus,
  ExecutionTraceEventType,
  ToolDefinition,
} from './types.js';

export const EXECUTION_TOOL_IDS = {
  statusRead: 'nexachat.status.read',
  echo: 'nexachat.echo',
} as const;

export const EXECUTION_RUN_STATUSES: ExecutionRunStatus[] = [
  'planned',
  'running',
  'waiting_approval',
  'completed',
  'failed',
  'cancelled',
];

export const EXECUTION_STEP_STATUSES: ExecutionStepStatus[] = [
  'pending',
  'running',
  'waiting_approval',
  'completed',
  'failed',
  'cancelled',
];

export const EXECUTION_TRACE_EVENT_TYPES: ExecutionTraceEventType[] = [
  'run_planned',
  'permission_checked',
  'approval_requested',
  'approval_decided',
  'step_started',
  'tool_called',
  'step_completed',
  'step_failed',
  'run_completed',
  'run_failed',
  'run_cancelled',
];

export const EXECUTION_RUN_KINDS: ExecutionRunKind[] = ['agent', 'tool', 'mcp-tool', 'workflow'];

export const TOOL_FIXTURES: ToolDefinition[] = [
  {
    id: EXECUTION_TOOL_IDS.statusRead,
    name: 'NexaChat status read',
    description: 'Read-only fixture that summarizes local model, gateway, and knowledge state.',
    kind: 'fixture',
    permissionKey: 'tool:status:read',
    riskLevel: 'read',
    requiresApproval: false,
    enabled: true,
    inputSchemaJson: JSON.stringify({ type: 'object', additionalProperties: false }),
    outputSchemaJson: JSON.stringify({ type: 'object', required: ['summary'] }),
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: EXECUTION_TOOL_IDS.echo,
    name: 'NexaChat echo',
    description: 'Safe no-op fixture for exercising approval, trace, and recovery paths.',
    kind: 'fixture',
    permissionKey: 'tool:echo',
    riskLevel: 'write',
    requiresApproval: true,
    enabled: true,
    inputSchemaJson: JSON.stringify({ type: 'object', properties: { message: { type: 'string' } } }),
    outputSchemaJson: JSON.stringify({ type: 'object', required: ['echo'] }),
    createdAt: 0,
    updatedAt: 0,
  },
];

export function normalizeExecutionStartInput(input: ExecutionStartInput): ExecutionStartInput {
  return {
    ...input,
    kind: EXECUTION_RUN_KINDS.includes(input.kind) ? input.kind : 'tool',
    mode: input.mode ?? 'preview',
    toolId: input.toolId?.trim() || undefined,
    agentId: input.agentId?.trim() || undefined,
    workflowId: input.workflowId?.trim() || undefined,
    inputJson: input.inputJson?.trim() || '{}',
  };
}

export function normalizeApprovalDecision(input: ApprovalDecisionInput): ApprovalDecisionInput {
  return {
    approvalId: input.approvalId.trim(),
    decision: input.decision === 'approved' ? 'approved' : 'denied',
    reason: input.reason?.trim() || null,
  };
}

export function isKnownToolId(toolId: string): boolean {
  return TOOL_FIXTURES.some((tool) => tool.id === toolId);
}
