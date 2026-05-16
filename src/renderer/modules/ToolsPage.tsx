import { Bot, Check, Play, PlugZap, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { EXECUTION_TOOL_IDS } from '../../shared/executionRuntime';
import { MCP_EXAMPLE_ENDPOINT } from '../../shared/uiCopy';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, DataRows, EmptyBlock, Field, InlineNotice, PageHeader, StatusPillLite, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { formatDate, healthState, statusLabel, TabPanel, type TabPageProps } from './shared';

export function ToolsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [serverName, setServerName] = useState<string>('');
  const [serverTarget, setServerTarget] = useState<string>(MCP_EXAMPLE_ENDPOINT);
  const [agentName, setAgentName] = useState<string>('');
  const [agentGoal, setAgentGoal] = useState<string>('');

  if (activeTab.id === 'agents') {
    return (
      <TabPanel moduleId="tools" tab={activeTab}>
        <PageHeader
          eyebrow={t('tools.columns.dryRun')}
          title={t('tools.agent.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={snapshot.agents.length} state={snapshot.agents.length > 0 ? 'ready' : 'muted'} />}
          actions={<CommandButton variant="primary" icon={<Bot size={15} />} disabled={!agentName.trim() || !agentGoal.trim()} onClick={() => onAction(t('tools.toast.agentSaved'), () => api.createAgent(agentName.trim(), agentGoal.trim()))}>{t('tools.agent.create')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('tools.agent.title')} description={activeTab.featureBoundary}>
          <ToolSection title={t('tools.agent.create')} description={t('tools.agent.note')}>
            <div className="form-stack">
              <Field label={t('tools.columns.name')}>
                <input value={agentName} onChange={(event) => setAgentName(event.target.value)} placeholder={t('tools.agent.seedConfigName')} />
              </Field>
              <Field label={t('tools.columns.goal')}>
                <textarea value={agentGoal} onChange={(event) => setAgentGoal(event.target.value)} />
              </Field>
            </div>
          </ToolSection>
          <div className="config-items">
            {snapshot.agents.length > 0 ? snapshot.agents.map((agent) => (
              <div className="config-row" key={agent.id}>
                <span>
                  <strong>{agent.name}</strong>
                  <small>{agent.goal}</small>
                </span>
                <span className="row-actions">
                  <StatusPillLite label={statusLabel(agent.stage, t)} state={agent.stage === 'implemented' ? 'ready' : 'warning'} />
                  <CommandButton icon={<Play size={14} />} onClick={() => onAction(t('tools.toast.dryRun'), () => api.previewAgentRun(agent.id))}>{t('tools.dryRun.generate')}</CommandButton>
                </span>
              </div>
          )) : <EmptyBlock title={t('common.notConfigured')} detail={t('tools.agent.note')} />}
          </div>
        </ConfigList>
        <ConfigDetail title={t('tools.columns.dryRun')} description={t('nav.tools.agents.boundary')}>
          <InlineNotice tone="warning" title={t('tools.columns.dryRun')} detail={t('tools.agent.note')} />
          <DataRows rows={[
            { label: t('tools.columns.approval'), value: snapshot.approvalRequests.filter((approval) => approval.status === 'pending').length },
            { label: t('tools.execution.trace'), value: snapshot.executionTraceEvents.length },
          ]} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'runs') {
    return (
      <TabPanel moduleId="tools" tab={activeTab}>
        <PageHeader
          eyebrow={t('tools.execution.approvals')}
          title={t('tools.runs.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={snapshot.executionRuns.length} state={snapshot.executionRuns.length > 0 ? 'info' : 'muted'} />}
          actions={<CommandButton variant="primary" icon={<Play size={15} />} onClick={() => onAction(t('tools.toast.executionStarted'), () => api.startExecutionRun({ kind: 'tool', mode: 'preview', toolId: EXECUTION_TOOL_IDS.statusRead, inputJson: '{}' }))}>{t('tools.execution.runStatusRead')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('tools.runs.title')} description={activeTab.featureBoundary}>
          <div className="switch-grid">
            <CommandButton icon={<ShieldCheck size={15} />} onClick={() => onAction(t('tools.toast.executionStarted'), () => api.startExecutionRun({ kind: 'tool', mode: 'preview', toolId: EXECUTION_TOOL_IDS.echo, inputJson: '{}' }))}>
              {t('tools.execution.runEchoApproval')}
            </CommandButton>
          </div>
          <ActivityList
            empty={t('app.recent.empty')}
            items={snapshot.executionRuns.slice(0, 12).map((run) => ({
              title: run.title,
              meta: `${statusLabel(run.status, t)} / ${run.sandboxMode}`,
              state: healthState(run.status),
            }))}
          />
        </ConfigList>
        <ConfigDetail title={t('tools.execution.approvals')} description={t('nav.tools.runs.boundary')}>
          <div className="vertical-actions">
            {snapshot.approvalRequests.filter((approval) => approval.status === 'pending').map((approval) => (
              <div className="approval-row" key={approval.id}>
                <strong>{approval.requestedAction}</strong>
                <small>{approval.reason}</small>
                <span className="row-actions">
                  <CommandButton icon={<Check size={14} />} onClick={() => onAction(t('tools.approve'), () => api.decideApproval({ approvalId: approval.id, decision: 'approved' }))}>{t('tools.approve')}</CommandButton>
                  <CommandButton icon={<X size={14} />} onClick={() => onAction(t('tools.deny'), () => api.decideApproval({ approvalId: approval.id, decision: 'denied' }))}>{t('tools.deny')}</CommandButton>
                </span>
              </div>
            ))}
            {snapshot.approvalRequests.every((approval) => approval.status !== 'pending') ? <EmptyBlock title={t('app.status.idle')} detail={t('tools.execution.approvals')} /> : null}
          </div>
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="tools" tab={activeTab}>
      <PageHeader
        eyebrow="MCP"
        title={t('tools.mcp.title')}
        description={activeTab.featureBoundary}
        status={<StatusPillLite label={t('common.countGranted', { count: snapshot.mcpServers.filter((server) => server.permissionState === 'granted').length })} state={snapshot.mcpServers.some((server) => server.permissionState === 'granted') ? 'ready' : 'muted'} />}
        actions={<CommandButton variant="primary" icon={<PlugZap size={15} />} disabled={!serverName.trim() || !serverTarget.trim()} onClick={() => onAction(t('tools.toast.mcpRegistered'), () => api.createMcpServer(serverName.trim(), 'http', serverTarget.trim()))}>{t('tools.mcp.register')}</CommandButton>}
      />
      <div className="tool-layout">
      <ConfigList title={t('tools.mcp.title')} description={activeTab.featureBoundary}>
        <section className="current-config-strip">
          <div><span className="eyebrow">MCP</span><strong>{snapshot.mcpServers.length}</strong><small>{t('common.countGranted', { count: snapshot.mcpServers.filter((server) => server.permissionState === 'granted').length })}</small></div>
          <div><span className="eyebrow">{t('tools.runs.title')}</span><strong>{snapshot.executionRuns.length}</strong><small>{t('tools.execution.sandbox.fixtureOnly')}</small></div>
          <div><span className="eyebrow">{t('tools.columns.approval')}</span><strong>{snapshot.approvalRequests.filter((approval) => approval.status === 'pending').length}</strong><small>{t('stage.environment-limited')}</small></div>
        </section>

        <ToolSection title={t('tools.mcp.register')} description={t('tools.mcp.note')}>
          <div className="form-stack">
            <Field label={t('tools.columns.name')}>
              <input value={serverName} onChange={(event) => setServerName(event.target.value)} />
            </Field>
            <Field label={t('tools.columns.transport')}>
              <input value={serverTarget} onChange={(event) => setServerTarget(event.target.value)} />
            </Field>
          </div>
        </ToolSection>

        <div className="config-items">
          {snapshot.mcpServers.length > 0 ? snapshot.mcpServers.map((server) => (
            <div className="config-row" key={server.id}>
              <span>
                <strong>{server.name}</strong>
                <small>{server.transport} / {server.commandOrUrl} / {formatDate(server.updatedAt, t)}</small>
              </span>
              <span className="row-actions">
                <StatusPillLite label={statusLabel(server.permissionState, t)} state={healthState(server.permissionState)} />
                <CommandButton onClick={() => onAction(server.permissionState === 'granted' ? t('tools.toast.mcpDenied') : t('tools.toast.mcpGranted'), () => api.updateMcpPermission(server.id, server.permissionState === 'granted' ? 'denied' : 'granted'))}>
                  {server.permissionState === 'granted' ? t('tools.deny') : t('tools.grant')}
                </CommandButton>
              </span>
            </div>
          )) : <EmptyBlock title={t('common.notConfigured')} detail={t('tools.mcp.note')} />}
        </div>
      </ConfigList>

      <ConfigDetail title={t('tools.runs.feature')} description={t('nav.tools.mcp.boundary')}>
        <InlineNotice tone="warning" title={t('tools.columns.dryRun')} detail={t('nav.tools.runs.boundary')} />
        <DataRows rows={[
          { label: t('tools.columns.status'), value: t('stage.environment-limited') },
          { label: t('tools.columns.permission'), value: t('common.required') },
          { label: t('tools.execution.trace'), value: snapshot.executionTraceEvents.length },
        ]} />
      </ConfigDetail>
      </div>
    </TabPanel>
  );
}
