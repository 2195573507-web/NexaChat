import { Play, ShieldCheck } from 'lucide-react';
import { EXECUTION_TOOL_IDS } from '../../shared/executionRuntime';
import { MCP_EXAMPLE_ENDPOINT } from '../../shared/uiCopy';
import { MetricTile, PageSection } from '../components/ui';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, healthTone, statusLabel } from './shared';

export function ToolsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  if (activeTab.id === 'agents') {
    return (
      <TabPanel moduleId="tools" tab={activeTab}>
        <section className="panel">
          <h2>{t('tools.agent.title')}</h2>
          <p>{t('tools.agent.note')}</p>
          <button type="button" onClick={() => onAction(t('tools.toast.agentSaved'), () => api.createAgent(t('tools.agent.seedName'), t('tools.agent.seedGoal')))}>
            {t('tools.agent.create')}
          </button>
          <DataTable
            columns={[t('tools.columns.name'), t('tools.columns.goal'), t('tools.columns.approval'), t('tools.columns.stage'), t('tools.columns.dryRun')]}
            rows={snapshot.agents.map((agent) => [
              agent.name,
              agent.goal,
              agent.approvalPolicy,
              <StateBadge key={`${agent.id}-stage`} label={agent.stage} tone={agent.stage === 'implemented' ? 'success' : 'warning'} />,
              <button type="button" key={agent.id} onClick={() => onAction(t('tools.toast.dryRun'), () => api.previewAgentRun(agent.id))}>
                <Play size={16} /> {t('tools.dryRun.generate')}
              </button>,
            ])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'runs') {
    const latestRun = snapshot.executionRuns[0];
    const latestSteps = latestRun ? snapshot.executionSteps.filter((step) => step.runId === latestRun.id).sort((left, right) => left.position - right.position) : [];
    const latestTrace = latestRun ? snapshot.executionTraceEvents.filter((event) => event.runId === latestRun.id).slice(0, 12) : [];
    const pendingApprovals = snapshot.approvalRequests.filter((approval) => approval.status === 'pending');
    return (
      <TabPanel moduleId="tools" tab={activeTab}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{t('tools.runs.title')}</h2>
              <p>{t('tools.runs.note')}</p>
            </div>
            <StateBadge label={t('tools.execution.sandbox.fixtureOnly')} tone="warning" />
          </div>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => onAction(t('tools.toast.executionStarted'), () => api.startExecutionRun({ kind: 'tool', mode: 'preview', toolId: EXECUTION_TOOL_IDS.statusRead, inputJson: '{}' }))}>
              <ShieldCheck size={16} /> {t('tools.execution.runStatusRead')}
            </button>
            <button type="button" onClick={() => onAction(t('tools.toast.approvalRequested'), () => api.startExecutionRun({ kind: 'tool', mode: 'execute', toolId: EXECUTION_TOOL_IDS.echo, inputJson: JSON.stringify({ message: t('tools.execution.echo.default') }) }))}>
              <Play size={16} /> {t('tools.execution.runEchoApproval')}
            </button>
          </div>
          <DataTable
            columns={[t('tools.columns.run'), t('tools.columns.kind'), t('tools.columns.status'), t('tools.columns.approval'), t('tools.columns.time')]}
            rows={snapshot.executionRuns.map((run) => [
              run.title,
              run.kind,
              <StateBadge key={`${run.id}-status`} label={statusLabel(run.status, t)} tone={run.status === 'completed' ? 'success' : run.status === 'failed' || run.status === 'cancelled' ? 'error' : 'warning'} />,
              run.approvalStatus ?? '-',
              new Date(run.createdAt).toLocaleString(),
            ])}
          />
        </section>
        <section className="two-column">
          <div className="panel">
            <h2>{t('tools.execution.steps')}</h2>
            <DataTable
              columns={[t('tools.columns.step'), t('tools.columns.status'), t('tools.columns.tool'), t('tools.columns.output')]}
              rows={latestSteps.map((step) => [
                step.title,
                <StateBadge key={`${step.id}-status`} label={statusLabel(step.status, t)} tone={step.status === 'completed' ? 'success' : step.status === 'failed' || step.status === 'cancelled' ? 'error' : 'warning'} />,
                step.toolId ?? '-',
                step.outputJson ?? step.errorMessage ?? '-',
              ])}
            />
          </div>
          <div className="panel">
            <h2>{t('tools.execution.approvals')}</h2>
            <DataTable
              columns={[t('tools.columns.action'), t('tools.columns.risk'), t('tools.columns.status'), t('tools.columns.approval')]}
              rows={pendingApprovals.map((approval) => [
                approval.requestedAction,
                approval.riskLevel,
                <StateBadge key={`${approval.id}-status`} label={statusLabel(approval.status, t)} tone="warning" />,
                <div className="button-row compact" key={approval.id}>
                  <button type="button" onClick={() => onAction(t('tools.toast.approved'), () => api.decideApproval({ approvalId: approval.id, decision: 'approved', reason: t('tools.execution.approval.approvedReason') }))}>{t('tools.approve')}</button>
                  <button type="button" onClick={() => onAction(t('tools.toast.denied'), () => api.decideApproval({ approvalId: approval.id, decision: 'denied', reason: t('tools.execution.approval.deniedReason') }))}>{t('tools.deny')}</button>
                </div>,
              ])}
            />
          </div>
        </section>
        <section className="panel">
          <h2>{t('tools.execution.trace')}</h2>
          <DataTable
            columns={[t('tools.columns.event'), t('tools.columns.summary'), t('tools.columns.time')]}
            rows={latestTrace.map((event) => [event.eventType, event.message, new Date(event.createdAt).toLocaleString()])}
          />
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="tools" tab={activeTab}>
      <section className="tools-control-strip">
        <MetricTile label={t('tools.mcp.title')} value={snapshot.mcpServers.length} detail={t('common.countGranted', { count: snapshot.mcpServers.filter((server) => server.permissionState === 'granted').length })} tone="info" />
        <MetricTile label={t('tools.agent.title')} value={snapshot.agents.length} detail={t('tools.agent.note')} />
        <MetricTile label={t('tools.runs.title')} value={snapshot.executionRuns.length} detail={t('tools.execution.sandbox.fixtureOnly')} tone="warning" />
      </section>
      <PageSection title={t('tools.mcp.title')} description={t('tools.mcp.note')} className="tools-boundary-panel">
        <div className="tools-boundary-grid">
          <div>
            <span className="page-eyebrow">{t('tools.columns.status')}</span>
            <h3>{MCP_EXAMPLE_ENDPOINT ? t('common.available') : t('common.notConfigured')}</h3>
            <p>{t('tools.mcp.register.disabled')}</p>
          </div>
          <div>
            <span className="page-eyebrow">{t('tools.columns.permission')}</span>
            <h3>{t('tools.grant')} / {t('tools.deny')}</h3>
            <p>{t('nav.tools.mcp.boundary')}</p>
          </div>
          <div>
            <span className="page-eyebrow">{t('tools.columns.approval')}</span>
            <h3>{t('tools.execution.sandbox.fixtureOnly')}</h3>
            <p>{t('nav.tools.runs.boundary')}</p>
          </div>
        </div>
        <button type="button" disabled={!MCP_EXAMPLE_ENDPOINT} title={t('tools.mcp.register.disabled')} onClick={() => onAction(t('tools.toast.mcpRegistered'), () => api.createMcpServer(t('tools.mcp.seedName'), 'http', MCP_EXAMPLE_ENDPOINT))}>
          {t('tools.mcp.register')}
        </button>
        <DataTable
          columns={[t('tools.columns.name'), t('tools.columns.transport'), t('tools.columns.status'), t('tools.columns.permission'), t('tools.columns.approval')]}
          rows={snapshot.mcpServers.map((server) => [
            server.name,
            server.transport,
            <StateBadge key={`${server.id}-health`} label={server.lastStatus} tone={healthTone(server.lastStatus)} />,
            <StateBadge key={`${server.id}-permission`} label={server.permissionState} tone={server.permissionState === 'granted' ? 'success' : server.permissionState === 'denied' ? 'error' : 'warning'} />,
            <div className="button-row" key={server.id}>
              <button type="button" onClick={() => onAction(t('tools.toast.mcpGranted'), () => api.updateMcpPermission(server.id, 'granted'))}>{t('tools.grant')}</button>
              <button type="button" onClick={() => onAction(t('tools.toast.mcpDenied'), () => api.updateMcpPermission(server.id, 'denied'))}>{t('tools.deny')}</button>
            </div>,
          ])}
        />
      </PageSection>
    </TabPanel>
  );
}
