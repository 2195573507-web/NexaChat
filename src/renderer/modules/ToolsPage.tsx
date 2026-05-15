import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel, healthTone } from './shared';

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
                {t('tools.dryRun.generate')}
              </button>,
            ])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'runs') {
    return (
      <TabPanel moduleId="tools" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName={t('tools.runs.feature')}
          why={t('tools.runs.why')}
          dependency={t('tools.runs.dependency')}
        />
        <section className="panel">
          <h2>{t('tools.runs.existing')}</h2>
          <DataTable
            columns={[t('tools.columns.action'), t('tools.columns.status'), t('tools.columns.summary'), t('tools.columns.time')]}
            rows={snapshot.importExportResults
              .filter((result) => result.action === 'cleanup-preview' && result.summary.includes('Agent dry-run'))
              .map((result) => [result.action, result.status, result.summary, new Date(result.createdAt).toLocaleString()])}
          />
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="tools" tab={activeTab}>
      <section className="panel">
        <h2>{t('tools.mcp.title')}</h2>
        <p>{t('tools.mcp.note')}</p>
        <button type="button" onClick={() => onAction(t('tools.toast.mcpRegistered'), () => api.createMcpServer(t('tools.mcp.seedName'), 'http', 'http://127.0.0.1:9000/mcp'))}>
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
      </section>
    </TabPanel>
  );
}
