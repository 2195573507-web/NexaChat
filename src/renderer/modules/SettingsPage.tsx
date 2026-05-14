import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import type { UiPreferences } from '../../shared/types';
import { ErrorDiagnosisPanel } from '../components/ErrorDiagnosisPanel';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel, copyText, formatRequestLog } from './shared';

export function SettingsPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const [prefs, setPrefs] = useState<UiPreferences>(snapshot.uiPreferences);
  useEffect(() => setPrefs(snapshot.uiPreferences), [snapshot.uiPreferences]);

  if (activeTab.id === 'usage') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="panel">
          <h2>Token 统计</h2>
          <DataTable
            columns={['Provider', 'Model', 'Tokens', 'Cost', '时间']}
            rows={snapshot.usageRecords.map((record) => [
              record.providerId ?? '-',
              record.modelId ?? '-',
              `${record.inputTokens}/${record.outputTokens}`,
              record.costEstimate.toFixed(6),
              new Date(record.createdAt).toLocaleString(),
            ])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'diagnostics') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="panel">
          <h2>错误诊断</h2>
          <ErrorDiagnosisPanel onOpenLogs={() => onAction('已打开日志目录', () => api.openLogs())} />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'evals') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="模型评测"
          why="Eval sets、评分器、批量模型比较和成本归集尚未实现。"
          dependency="先完成评测集 schema、运行记录、评分器接口和对比报告。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'feedback') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="用户反馈"
          why="反馈列表、标记和处理状态还没有接入真实数据源，不展示假收件箱。"
          dependency="先实现 feedback schema、状态流转、关联日志和隐私边界。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'users') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="用户管理"
          why="用户列表、角色、启用/禁用和重置密码待接入；当前本地单用户运行不提供假管理动作。"
          dependency="先完成账号模型、角色绑定、会话失效和管理员审计。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'permissions') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="权限管理"
          why="RBAC、资源 ACL 和模块权限尚未接入执行路径，不能提供不生效的开关。"
          dependency="先定义权限 schema、资源作用域、拒绝策略和权限变更审计。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'keys') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="panel">
          <h2>安全中心</h2>
          <p>Renderer 只能看到 secret_ref 和预览；API Key、Authorization、自定义敏感 Header 在日志和导出中默认脱敏。</p>
          <DataTable
            columns={['Gateway Key', '预览', 'Scopes', 'Revoked']}
            rows={snapshot.gatewayKeys.map((key) => [key.name, key.keyPreview, key.scopes.join(', '), key.revokedAt ? 'yes' : 'no'])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'audit') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="panel">
          <h2>审计日志</h2>
          <DataTable
            columns={['动作', '目标', '详情', '时间']}
            rows={snapshot.auditLogs.map((log) => [log.action, `${log.targetType}:${log.targetId ?? '-'}`, log.detailsJson ?? '-', new Date(log.createdAt).toLocaleString()])}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'ui') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="panel">
          <h2>系统设置</h2>
          <div className="form-grid">
            <label>
              Theme
              <select value={prefs.theme} onChange={(event) => setPrefs({ ...prefs, theme: event.target.value as UiPreferences['theme'] })}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Density
              <select value={prefs.density} onChange={(event) => setPrefs({ ...prefs, density: event.target.value as UiPreferences['density'] })}>
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>
            <label>
              Font
              <select value={prefs.fontMode} onChange={(event) => setPrefs({ ...prefs, fontMode: event.target.value as UiPreferences['fontMode'] })}>
                <option value="system">System</option>
                <option value="kaiti">KaiTi for message preview</option>
              </select>
            </label>
            <label>
              Language
              <select value={prefs.language} onChange={(event) => setPrefs({ ...prefs, language: event.target.value as UiPreferences['language'] })}>
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </label>
            <label>
              Motion
              <select value={prefs.reducedMotion ? 'reduced' : 'normal'} onChange={(event) => setPrefs({ ...prefs, reducedMotion: event.target.value === 'reduced' })}>
                <option value="normal">Normal</option>
                <option value="reduced">Reduced</option>
              </select>
            </label>
          </div>
          <button type="button" className="primary-button" onClick={() => onAction('界面偏好已持久化', () => api.saveUiPreferences(prefs))}>
            保存系统设置
          </button>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'system') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>数据维护</h2>
            <dl className="detail-list">
              <div><dt>应用版本</dt><dd>0.1.0</dd></div>
              <div><dt>网关端口</dt><dd>{snapshot.dashboard.gatewayStatus.port}</dd></div>
              <div><dt>绑定地址</dt><dd>{snapshot.dashboard.gatewayStatus.bindHost}</dd></div>
              <div><dt>数据位置</dt><dd>Electron userData / SQLite</dd></div>
            </dl>
          </div>
          <div className="panel">
            <h2>诊断导出</h2>
            <p>生成脱敏诊断包预览，用于排查本地网关、Provider 和日志问题。</p>
            <button type="button" onClick={() => onAction('诊断包预览已生成', () => api.exportDiagnostics())}>
              导出诊断包
            </button>
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'desktop') {
    return (
      <TabPanel moduleId="settings" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="桌面入口"
          why="快捷方式状态、图标、启动目标检查和重新关联记录依赖本机安装路径，本页只展示待接入状态，不提供不可验证的假按钮。"
          dependency="先接入桌面快捷方式探测、安装路径校验、图标资源检查和操作审计。"
        />
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="settings" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>运行监控</h2>
            <p>错误行提供复制与打开日志入口，日志内容默认脱敏。</p>
          </div>
          <button type="button" onClick={() => onAction('已打开日志目录', () => api.openLogs())}>打开日志</button>
        </div>
        <DataTable
          columns={['状态', 'Endpoint', '模型', 'Tokens', 'Latency', '错误/动作']}
          rows={snapshot.requestLogs.map((log) => [
            <StateBadge key={`${log.id}-status`} label={log.status} tone={log.status === 'failed' ? 'error' : log.status === 'completed' ? 'success' : 'warning'} />,
            log.endpoint,
            log.modelNameSnapshot ?? '-',
            `${log.inputTokens ?? 0}/${log.outputTokens ?? 0}`,
            log.latencyMs ?? '-',
            <div className="cell-actions" key={log.id}>
              <span>{log.errorMessage ?? '-'}</span>
              <button type="button" onClick={() => copyText(formatRequestLog(log))}>
                <Copy size={16} /> 复制
              </button>
              <button type="button" onClick={() => onAction('已打开日志目录', () => api.openLogs())}>打开</button>
            </div>,
          ])}
        />
      </section>
    </TabPanel>
  );
}
