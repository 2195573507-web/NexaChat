import { useState } from 'react';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel } from './shared';

export function DataPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const [manifestText, setManifestText] = useState('{"providers":[{"name":"Local Provider","baseUrl":"http://127.0.0.1:11434/v1"}]}');
  const latestReadyImport = snapshot.importExportResults.find((item) => item.action === 'import' && item.status === 'ready');
  const latestSnapshot = snapshot.importExportResults.find((item) => item.action === 'snapshot');

  if (activeTab.id === 'snapshots') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>快照与恢复预检</h2>
            <p>快照默认脱敏，恢复先生成预检，不直接覆盖本地数据。</p>
            <div className="button-row">
              <button type="button" onClick={() => onAction('脱敏快照已创建', () => api.createSnapshot())}>
                创建配置快照
              </button>
              <button type="button" disabled={!latestSnapshot} onClick={() => latestSnapshot && onAction('恢复预检已创建', () => api.restoreSnapshot(latestSnapshot.id))}>
                恢复预检
              </button>
            </div>
          </div>
          <div className="panel">
            <h2>快照记录</h2>
            <DataTable
              columns={['动作', '状态', '摘要', '确认', '脱敏']}
              rows={snapshot.importExportResults
                .filter((item) => item.action === 'snapshot' || item.summary.includes('恢复'))
                .map((item) => [
                  item.action,
                  <StateBadge key={`${item.id}-status`} label={item.status} tone={item.status === 'failed' ? 'error' : item.status === 'ready' ? 'warning' : 'success'} />,
                  item.summary,
                  item.requiresConfirmation ? '需要' : '否',
                  item.redacted ? 'yes' : 'no',
                ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'diagnostics') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>诊断导出</h2>
            <p>生成脱敏诊断包预览，用于排查本地网关、Provider、Chat 和日志问题。</p>
            <button type="button" className="primary-button" onClick={() => onAction('诊断包预览已生成', () => api.exportDiagnostics())}>
              导出诊断预览
            </button>
          </div>
          <div className="panel">
            <h2>诊断记录</h2>
            <DataTable
              columns={['动作', '状态', '摘要', '脱敏', '时间']}
              rows={snapshot.importExportResults
                .filter((item) => item.action === 'export')
                .map((item) => [
                  item.action,
                  <StateBadge key={`${item.id}-status`} label={item.status} tone={item.status === 'failed' ? 'error' : item.status === 'ready' ? 'warning' : 'success'} />,
                  item.summary,
                  item.redacted ? 'yes' : 'no',
                  new Date(item.createdAt).toLocaleString(),
                ])}
            />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'cleanup') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="安全清理"
          why="破坏性删除需要预览、影响范围、审计和撤销策略；本轮不开放删除控件。"
          dependency="先实现 cleanup preview、依赖检查、确认短语和审计事件。"
        />
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="data" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>导入清单预检</h2>
            <p>先预检清单，再确认应用；无效清单会被拒绝并记录。</p>
          </div>
          <button type="button" className="primary-button" onClick={() => onAction('导入清单已预检', () => api.validateImportManifest(manifestText))}>
            预检清单
          </button>
        </div>
        <div className="wizard-steps">
          {['detect', 'preview', 'map fields', 'conflict review', 'secret handling', 'confirm', 'result'].map((step, index) => (
            <span key={step}>{index + 1}. {step}</span>
          ))}
        </div>
        <textarea className="manifest-input" value={manifestText} onChange={(event) => setManifestText(event.target.value)} aria-label="导入清单 JSON" />
        <p>CCS、sub2api、OpenAI-compatible、Ollama、LM Studio 会先生成 review plan；不会静默覆盖或明文落库 secrets。</p>
      </section>
      <section className="two-column">
        <div className="panel">
          <h2>导入确认</h2>
          <div className="button-row">
            <button type="button" disabled={!latestReadyImport} onClick={() => latestReadyImport && onAction('导入计划已确认应用', () => api.applyImportPlan(latestReadyImport.id))}>
              确认应用导入
            </button>
          </div>
          <p>当前确认只记录已通过预检的应用结果，不伪装成完整 Provider/Model/secret 导入器。</p>
        </div>
        <div className="panel">
          <h2>导入记录</h2>
          <DataTable
            columns={['动作', '状态', '摘要', '冲突', '确认', '脱敏']}
            rows={snapshot.importExportResults.filter((item) => item.action === 'import').map((item) => [
              item.action,
              <StateBadge key={`${item.id}-status`} label={item.status} tone={item.status === 'failed' ? 'error' : item.status === 'ready' ? 'warning' : 'success'} />,
              item.summary,
              item.conflictCount,
              item.requiresConfirmation ? '需要' : '否',
              item.redacted ? 'yes' : 'no',
            ])}
          />
        </div>
      </section>
    </TabPanel>
  );
}
