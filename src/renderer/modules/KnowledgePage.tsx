import { useMemo, useState } from 'react';
import { FilePlus2, RefreshCw, RotateCcw, Search, Trash2 } from 'lucide-react';
import { KNOWLEDGE_RUNTIME_POLICY } from '../../shared/knowledgeRuntime';
import { FORM_DEFAULTS } from '../../shared/uiCopy';
import type { KnowledgeFile, KnowledgeRetrievalResult } from '../../shared/types';
import { FormField } from '../components/ui';
import { useI18n } from '../i18n';
import type { TabPageProps } from './shared';
import { DataTable, StateBadge, TabPanel, statusLabel } from './shared';

export function KnowledgePage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [importName, setImportName] = useState<string>(FORM_DEFAULTS.knowledgeImportName);
  const [importContent, setImportContent] = useState<string>(FORM_DEFAULTS.knowledgeImportContent);
  const [query, setQuery] = useState<string>(FORM_DEFAULTS.knowledgeRetrievalQuery);
  const [retrieval, setRetrieval] = useState<KnowledgeRetrievalResult | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const indexedFiles = snapshot.knowledgeFiles.filter((file) => file.indexStatus === 'indexed' && !file.deletedAt);
  const activeChunks = snapshot.knowledgeChunks.filter((chunk) => chunk.status === 'indexed');
  const latestRetrieval = retrieval ?? {
    trace: snapshot.knowledgeRetrievals[0],
    citations: snapshot.knowledgeCitations.filter((citation) => citation.retrievalId === snapshot.knowledgeRetrievals[0]?.id),
  };

  const totals = useMemo(() => ({
    files: indexedFiles.length,
    chunks: activeChunks.length,
    citations: snapshot.knowledgeCitations.length,
  }), [activeChunks.length, indexedFiles.length, snapshot.knowledgeCitations.length]);

  if (activeTab.id === 'chunks') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>{t('knowledge.chunks.title')}</h2>
            <p>{t('knowledge.chunks.note')}</p>
            <DataTable
              columns={[t('knowledge.columns.file'), t('knowledge.columns.parseStatus'), t('knowledge.columns.indexStatus'), t('knowledge.columns.embeddingStatus'), t('knowledge.columns.chunks')]}
              rows={snapshot.knowledgeFiles.map((file) => [
                file.name,
                <StateBadge key={`${file.id}-parse`} label={statusLabel(file.parseStatus, t)} tone={file.parseStatus === 'indexed' ? 'success' : file.parseStatus === 'failed' ? 'error' : 'warning'} />,
                <StateBadge key={`${file.id}-index`} label={statusLabel(file.indexStatus, t)} tone={file.indexStatus === 'indexed' ? 'success' : file.indexStatus === 'failed' || file.indexStatus === 'deleted' ? 'error' : 'warning'} />,
                <StateBadge key={`${file.id}-embedding`} label={statusLabel(file.embeddingStatus, t)} tone={file.embeddingStatus === 'embedded' ? 'success' : file.embeddingStatus === 'failed' || file.embeddingStatus === 'deleted' ? 'error' : 'warning'} />,
                t('knowledge.chunkCountWithTokens', { chunks: file.chunkCount, tokens: file.tokenCount }),
              ])}
            />
          </div>
          <div className="panel">
            <h2>{t('knowledge.index.title')}</h2>
            <dl className="detail-list">
              <div><dt>{t('knowledge.index.strategy')}</dt><dd>{t('knowledge.strategy.lexical')}</dd></div>
              <div><dt>{t('knowledge.index.embeddingModel')}</dt><dd>{KNOWLEDGE_RUNTIME_POLICY.embeddingModel}</dd></div>
              <div><dt>{t('knowledge.index.directory')}</dt><dd>{KNOWLEDGE_RUNTIME_POLICY.indexDirectory}</dd></div>
              <div><dt>{t('knowledge.index.health')}</dt><dd>{t('knowledge.index.healthValue', totals)}</dd></div>
            </dl>
          </div>
        </section>
        <section className="panel">
          <h2>{t('knowledge.chunks.activeTitle')}</h2>
          <DataTable
            columns={[t('knowledge.columns.file'), t('knowledge.columns.citation'), t('knowledge.columns.tokens'), t('knowledge.columns.snippet')]}
            rows={activeChunks.slice(0, 20).map((chunk) => {
              const file = snapshot.knowledgeFiles.find((candidate) => candidate.id === chunk.fileId);
              return [file?.name ?? chunk.fileId, chunk.citation, chunk.tokenCount, chunk.content.slice(0, 180)];
            })}
          />
        </section>
      </TabPanel>
    );
  }

  if (activeTab.id === 'retrieval') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{t('knowledge.retrieval.title')}</h2>
              <p>{t('knowledge.retrieval.note')}</p>
            </div>
            <StateBadge label={t('knowledge.strategy.lexical')} tone="warning" />
          </div>
          <div className="form-grid single-column">
            <FormField label={t('knowledge.retrieval.query')} help={t('knowledge.retrieval.help')}>
              <textarea className="manifest-input" value={query} onChange={(event) => setQuery(event.target.value)} />
            </FormField>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              disabled={!query.trim()}
              onClick={() => onAction(t('knowledge.toast.retrieved'), async () => {
                const result = await api.previewKnowledgeRetrieval({ query, topK: KNOWLEDGE_RUNTIME_POLICY.defaultTopK, strategy: 'lexical' });
                setRetrieval(result);
              })}
            >
              <Search size={16} /> {t('knowledge.retrieval.run')}
            </button>
          </div>
        </section>
        <section className="panel">
          <h2>{t('knowledge.citations.title')}</h2>
          <DataTable
            columns={[t('knowledge.columns.file'), t('knowledge.columns.score'), t('knowledge.columns.citation'), t('knowledge.columns.snippet')]}
            rows={(latestRetrieval.citations ?? []).map((citation) => [
              citation.fileName,
              citation.score.toFixed(3),
              citation.citation,
              citation.snippet,
            ])}
          />
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
          <StateBadge label={t('knowledge.index.healthValue', totals)} tone={totals.files > 0 ? 'success' : 'warning'} />
        </div>
        <div className="form-grid single-column">
          <FormField label={t('knowledge.import.name')} help={t('knowledge.import.name.help')}>
            <input value={importName} onChange={(event) => setImportName(event.target.value)} placeholder={t('knowledge.import.name.placeholder')} />
          </FormField>
          <FormField label={t('knowledge.import.content')} help={t('knowledge.import.content.help')}>
            <textarea className="manifest-input knowledge-import-input" value={importContent} onChange={(event) => setImportContent(event.target.value)} />
          </FormField>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            disabled={!importName.trim() || !importContent.trim()}
            onClick={() => onAction(t('knowledge.toast.created'), () => api.createKnowledgeFile({
              name: importName,
              type: importName.toLowerCase().endsWith('.md') ? 'text/markdown' : 'text/plain',
              content: importContent,
            }))}
          >
            <FilePlus2 size={16} /> {t('knowledge.import.create')}
          </button>
        </div>
      </section>
      <section className="panel">
        <DataTable
          columns={[t('knowledge.columns.file'), t('knowledge.columns.type'), t('knowledge.columns.size'), t('knowledge.columns.parseStatus'), t('knowledge.columns.indexStatus'), t('knowledge.columns.chunks'), t('knowledge.columns.errorAction')]}
          rows={snapshot.knowledgeFiles.map((file) => [
            file.name,
            file.type,
            file.size,
            <StateBadge key={`${file.id}-parse`} label={statusLabel(file.parseStatus, t)} tone={file.parseStatus === 'indexed' ? 'success' : file.parseStatus === 'failed' ? 'error' : 'warning'} />,
            <StateBadge key={`${file.id}-index`} label={statusLabel(file.indexStatus, t)} tone={file.indexStatus === 'indexed' ? 'success' : file.indexStatus === 'deleted' ? 'error' : 'warning'} />,
            file.chunkCount,
            <div className="cell-actions" key={file.id}>
              <span>{file.errorMessage ?? '-'}</span>
              <div className="button-row compact">
                <button type="button" onClick={() => onAction(t('knowledge.toast.retried'), () => api.retryKnowledgeFile({ fileId: file.id }))}>
                  <RotateCcw size={16} /> {t('knowledge.retry')}
                </button>
                <button type="button" onClick={() => onAction(t('knowledge.toast.rebuilt'), () => api.rebuildKnowledgeFile({ fileId: file.id }))}>
                  <RefreshCw size={16} /> {t('knowledge.rebuild')}
                </button>
                <button type="button" className={pendingDeleteId === file.id ? 'danger-button' : undefined} onClick={() => handleDeleteFile(file)}>
                  <Trash2 size={16} /> {t('knowledge.delete')}
                </button>
              </div>
            </div>,
          ])}
        />
      </section>
    </TabPanel>
  );

  function handleDeleteFile(file: KnowledgeFile) {
    if (pendingDeleteId !== file.id) {
      setPendingDeleteId(file.id);
      return;
    }
    setPendingDeleteId(null);
    onAction(t('knowledge.toast.deleted'), () => api.deleteKnowledgeFile({ fileId: file.id }));
  }
}
