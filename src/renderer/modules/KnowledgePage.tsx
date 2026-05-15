import { FilePlus2, RotateCcw } from 'lucide-react';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel, contextStrategies } from './shared';

export function KnowledgePage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  if (activeTab.id === 'chunks') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('knowledge.chunks.title')}</h2>
            <p>{t('knowledge.chunks.note')}</p>
            <DataTable
              columns={[t('knowledge.columns.file'), t('knowledge.columns.parseStatus'), t('knowledge.columns.chunks'), t('knowledge.columns.fallback'), t('knowledge.columns.error')]}
              rows={snapshot.knowledgeFiles.map((file) => [
                file.name,
                <StateBadge key={`${file.id}-status`} label={file.parseStatus} tone={file.parseStatus === 'indexed' ? 'success' : file.parseStatus === 'failed' ? 'error' : 'warning'} />,
                file.chunkCount,
                /text|markdown|json|csv|code|txt|md/i.test(`${file.name} ${file.type}`) ? 'lexical' : t('common.unsupported'),
                file.errorMessage ?? '-',
              ])}
            />
          </div>
          <div className="panel">
            <h2>{t('knowledge.context.title')}</h2>
            <p>{t('knowledge.context.note')}</p>
            <DataTable columns={[t('knowledge.columns.strategy'), t('knowledge.columns.value')]} rows={contextStrategies.map((strategy) => [t(strategy.labelKey), strategy.value])} />
          </div>
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'retrieval') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName={t('knowledge.retrieval.feature')}
          why={t('knowledge.retrieval.why')}
          dependency={t('knowledge.retrieval.dependency')}
        />
        <section className="panel roadmap-panel">
          <h2>{t('knowledge.sources.title')}</h2>
          <p>{t('knowledge.sources.note')}</p>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="knowledge" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{t('knowledge.files.title')}</h2>
            <p>{t('knowledge.files.note')}</p>
          </div>
          <button type="button" onClick={() => onAction(t('knowledge.toast.created'), () => api.createKnowledgeFile('manual-note.md', 'text/markdown', 4096))}>
            <FilePlus2 size={16} /> {t('knowledge.createTextRecord')}
          </button>
        </div>
        <DataTable
          columns={[t('knowledge.columns.file'), t('knowledge.columns.type'), t('knowledge.columns.size'), t('knowledge.columns.parseStatus'), t('knowledge.columns.chunks'), t('knowledge.columns.errorAction')]}
          rows={snapshot.knowledgeFiles.map((file) => [
            file.name,
            file.type,
            file.size,
            <StateBadge key={`${file.id}-status`} label={file.parseStatus} tone={file.parseStatus === 'indexed' ? 'success' : file.parseStatus === 'failed' ? 'error' : 'warning'} />,
            file.chunkCount,
            <div className="cell-actions" key={file.id}>
              <span>{file.errorMessage ?? '-'}</span>
              <button type="button" onClick={() => onAction(t('knowledge.toast.retried'), () => api.retryKnowledgeFile(file.id))}>
                <RotateCcw size={16} /> {t('knowledge.retry')}
              </button>
            </div>,
          ])}
        />
      </section>
    </TabPanel>
  );
}
