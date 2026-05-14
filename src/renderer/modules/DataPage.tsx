import { useState } from 'react';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel } from './shared';

export function DataPage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const [manifestText, setManifestText] = useState('{"providers":[{"name":"Local Provider","baseUrl":"http://127.0.0.1:11434/v1"}]}');
  const latestReadyImport = snapshot.importExportResults.find((item) => item.action === 'import' && item.status === 'ready');
  const latestSnapshot = snapshot.importExportResults.find((item) => item.action === 'snapshot');
  if (activeTab.id === 'import-export') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="导入导出"
          why="Provider、Model、Assistant、Prompt、Chat 的完整导入导出依赖冲突解决器和 secret 映射。"
          dependency="先完成 manifest schema、字段映射、冲突确认和 secret redaction。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'backup') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="备份恢复"
          why="脱敏备份、加密完整备份和 restore confirmation 还没有完整安全流程。"
          dependency="先实现备份格式、加密密钥来源、恢复预检和不可逆操作确认。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'cleanup') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="数据清理"
          why="破坏性删除需要预览、影响范围、审计和撤销策略；本轮不开放删除控件。"
          dependency="先实现 cleanup preview、依赖检查、确认短语和审计事件。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'snapshots') {
    return (
      <TabPanel moduleId="data" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>配置快照</h2>
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

  return (
    <TabPanel moduleId="data" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>智能导入向导</h2>
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
        <textarea
          className="manifest-input"
          value={manifestText}
          onChange={(event) => setManifestText(event.target.value)}
          aria-label="导入清单 JSON"
        />
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
