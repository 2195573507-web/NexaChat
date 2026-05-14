import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel, healthTone } from './shared';

export function ToolsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  if (activeTab.id === 'tools') {
    return (
      <TabPanel moduleId="tools" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="工具"
          why="内置/自定义工具执行还没有安全沙箱、权限模型和审计边界。"
          dependency="先完成工具权限、参数 schema 校验、危险动作审批和执行日志。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'agents') {
    return (
      <TabPanel moduleId="tools" tab={activeTab}>
        <section className="panel">
          <h2>Agent Studio</h2>
          <p>首版真实保存 Agent 定义，但运行中心是 dry-run plan，不启动自治后台任务。</p>
          <button type="button" onClick={() => onAction('Agent 定义已保存，stage=planned', () => api.createAgent('文档检查 Agent', '检查构建计划和实现闭环差异'))}>
            创建 Agent 定义
          </button>
          <DataTable
            columns={['名称', '目标', '审批', '阶段', 'Dry-run']}
            rows={snapshot.agents.map((agent) => [
              agent.name,
              agent.goal,
              agent.approvalPolicy,
              <StateBadge key={`${agent.id}-stage`} label={agent.stage} tone={agent.stage === 'implemented' ? 'success' : 'warning'} />,
              <button type="button" key={agent.id} onClick={() => onAction('Agent dry-run 已生成，未执行工具', () => api.previewAgentRun(agent.id))}>
                生成 dry-run
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
          featureName="运行中心"
          why="当前只支持 Agent dry-run 预览，没有后台执行器、步骤状态、暂停/继续或人工审批运行时。"
          dependency="先实现 run 表、step trace、权限检查、取消语义和人工审批队列。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'workflow') {
    return (
      <TabPanel moduleId="tools" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="工作流预留"
          why="Workflow canvas、真实 trace replay、人工审批驱动的危险操作、任意代码执行均为 reserved。"
          dependency="先定义工作流 DSL、节点权限、沙箱和可回放审计。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'debug') {
    return (
      <TabPanel moduleId="tools" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="调试与回放"
          why="失败重试、步骤回放和日志查看还没有独立运行记录与 trace 数据链路。"
          dependency="先实现 run trace、步骤输入输出归档、错误重放边界和审计日志。"
        />
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="tools" tab={activeTab}>
      <section className="panel">
          <h2>MCP Server Registry</h2>
          <p>Discovery 与 grant 分离；注册不等于授权，Chat 不能调用未授权工具。</p>
          <button type="button" onClick={() => onAction('MCP Server 已注册，默认未授权', () => api.createMcpServer('HTTP MCP 示例', 'http', 'http://127.0.0.1:9000/mcp'))}>
            注册 MCP Server
          </button>
          <DataTable
            columns={['名称', 'Transport', '状态', '权限', '审批']}
            rows={snapshot.mcpServers.map((server) => [
              server.name,
              server.transport,
              <StateBadge key={`${server.id}-health`} label={server.lastStatus} tone={healthTone(server.lastStatus)} />,
              <StateBadge key={`${server.id}-permission`} label={server.permissionState} tone={server.permissionState === 'granted' ? 'success' : server.permissionState === 'denied' ? 'error' : 'warning'} />,
              <div className="button-row" key={server.id}>
                <button type="button" onClick={() => onAction('MCP 已授权，但仍不执行危险动作', () => api.updateMcpPermission(server.id, 'granted'))}>授权</button>
                <button type="button" onClick={() => onAction('MCP 已拒绝，保持不可执行', () => api.updateMcpPermission(server.id, 'denied'))}>拒绝</button>
              </div>,
            ])}
          />
      </section>
    </TabPanel>
  );
}
