import { FilePlus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { KnowledgeFile, KnowledgeRetrievalResult } from '../../shared/types';
import { KNOWLEDGE_RUNTIME_POLICY } from '../../shared/knowledgeRuntime';
import { FORM_DEFAULTS } from '../../shared/uiCopy';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, DataRows, EmptyBlock, Field, InlineNotice, PageHeader, StatusPillLite, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { formatDate, healthState, statusLabel, TabPanel, type TabPageProps } from './shared';

export function KnowledgePage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [importName, setImportName] = useState<string>(FORM_DEFAULTS.knowledgeImportName);
  const [importContent, setImportContent] = useState<string>(FORM_DEFAULTS.knowledgeImportContent);
  const [query, setQuery] = useState<string>(FORM_DEFAULTS.knowledgeRetrievalQuery);
  const [retrieval, setRetrieval] = useState<KnowledgeRetrievalResult | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const activeFiles = snapshot.knowledgeFiles.filter((file) => !file.deletedAt);
  const indexedFiles = activeFiles.filter((file) => file.indexStatus === 'indexed');
  const totals = useMemo(() => ({
    files: activeFiles.length,
    chunks: snapshot.knowledgeChunks.filter((chunk) => chunk.status === 'indexed').length,
    tokens: activeFiles.reduce((sum, file) => sum + file.tokenCount, 0),
  }), [activeFiles, snapshot.knowledgeChunks]);

  if (activeTab.id === 'chunks') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <PageHeader
          eyebrow={t('knowledge.index.title')}
          title={t('knowledge.chunks.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={t('common.countConfigured', { count: totals.chunks })} state={totals.chunks > 0 ? 'ready' : 'muted'} />}
        />
        <div className="tool-layout">
        <ConfigList title={t('knowledge.chunks.title')} description={activeTab.featureBoundary}>
          <ActivityList
            empty={t('shared.empty.reason')}
            items={snapshot.knowledgeChunks.slice(0, 16).map((chunk) => ({
              title: chunk.citation,
              meta: t('common.valueSeparator', { left: chunk.tokenCount, right: t('knowledge.columns.tokens') }),
              state: healthState(chunk.status),
            }))}
          />
        </ConfigList>
        <ConfigDetail title={t('knowledge.index.title')} description={t('knowledge.chunks.note')}>
          <DataRows
            rows={[
              { label: t('knowledge.columns.file'), value: totals.files },
              { label: t('knowledge.chunks.activeTitle'), value: totals.chunks },
              { label: t('knowledge.columns.tokens'), value: totals.tokens },
            ]}
          />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  if (activeTab.id === 'retrieval') {
    const latest = retrieval?.citations ?? snapshot.knowledgeCitations.slice(0, 8);
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <PageHeader
          eyebrow={t('knowledge.strategy.lexical')}
          title={t('knowledge.retrieval.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={indexedFiles.length > 0 ? t('common.indexed') : t('common.notConfigured')} state={indexedFiles.length > 0 ? 'ready' : 'warning'} />}
          actions={<CommandButton variant="primary" icon={<Search size={15} />} disabled={!query.trim() || indexedFiles.length === 0} disabledReason={indexedFiles.length === 0 ? t('knowledge.retrieval.dependency') : undefined} onClick={() => onAction(t('knowledge.toast.retrieved'), async () => {
            const result = await api.previewKnowledgeRetrieval({ query, topK: KNOWLEDGE_RUNTIME_POLICY.defaultTopK, strategy: 'lexical' });
            setRetrieval(result);
          })}>{t('knowledge.retrieval.run')}</CommandButton>}
        />
        <div className="tool-layout">
        <ConfigList title={t('knowledge.retrieval.title')} description={activeTab.featureBoundary}>
          <ToolSection title={t('knowledge.retrieval.query')} description={t('knowledge.retrieval.note')}>
            <div className="form-stack">
              <Field label={t('knowledge.retrieval.query')}>
                <textarea value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t('knowledge.retrieval.query')} />
              </Field>
            </div>
          </ToolSection>
          <ActivityList
            empty={t('shared.empty.reason')}
            items={latest.map((citation) => ({
              title: `${citation.fileName} / ${citation.citation}`,
              meta: `${t('knowledge.columns.snippet')}: ${citation.snippet} / ${citation.strategy} / ${t('knowledge.columns.score')} ${citation.score.toFixed(2)}`,
              state: 'info',
            }))}
          />
        </ConfigList>
        <ConfigDetail title={t('stage.environment-limited')} description={t('nav.knowledge.retrieval.boundary')}>
          <StatusPillLite label={t('knowledge.strategy.lexical')} state="warning" />
          <InlineNotice tone="warning" title={t('common.required')} detail={t('knowledge.retrieval.dependency')} />
          <InlineNotice tone="info" title={t('knowledge.columns.citation')} detail={t('knowledge.retrieval.note')} />
        </ConfigDetail>
        </div>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="knowledge" tab={activeTab}>
      <PageHeader
        eyebrow={t('knowledge.index.title')}
        title={t('knowledge.files.title')}
        description={activeTab.featureBoundary}
        status={<StatusPillLite label={indexedFiles.length > 0 ? t('common.indexed') : t('common.notConfigured')} state={indexedFiles.length > 0 ? 'ready' : 'warning'} />}
        actions={<CommandButton variant="primary" icon={<FilePlus size={15} />} disabled={!importName.trim() || !importContent.trim()} onClick={() => onAction(t('knowledge.toast.created'), () => api.createKnowledgeFile({ name: importName.trim(), type: 'text/markdown', content: importContent }))}>{t('knowledge.import.create')}</CommandButton>}
      />
      <div className="tool-layout">
      <ConfigList title={t('knowledge.files.title')} description={activeTab.featureBoundary}>
        <section className="current-config-strip">
          <div><span className="eyebrow">{t('knowledge.columns.file')}</span><strong>{totals.files}</strong><small>{t('common.countConfigured', { count: indexedFiles.length })}</small></div>
          <div><span className="eyebrow">{t('knowledge.chunks.activeTitle')}</span><strong>{totals.chunks}</strong><small>{t('common.indexed')}</small></div>
          <div><span className="eyebrow">{t('knowledge.columns.tokens')}</span><strong>{totals.tokens}</strong><small>{t('stage.environment-limited')}</small></div>
        </section>

        <ToolSection title={t('knowledge.createTextRecord')} description={t('knowledge.files.note')}>
          <div className="form-stack">
            <Field label={t('knowledge.import.name')}>
              <input value={importName} onChange={(event) => setImportName(event.target.value)} />
            </Field>
            <Field label={t('knowledge.import.file')}>
              <input
                type="file"
                accept=".txt,.md,.markdown,.json,.csv,text/plain,text/markdown,application/json,text/csv"
                aria-label={t('knowledge.import.file')}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  setImportName(file.name);
                  setImportContent(await file.text());
                }}
              />
            </Field>
            <Field label={t('knowledge.import.content')}>
              <textarea value={importContent} onChange={(event) => setImportContent(event.target.value)} aria-label={t('knowledge.import.content')} />
            </Field>
            <InlineNotice tone="warning" title={t('common.unsupported')} detail={t('knowledge.import.unsupportedNote')} />
          </div>
        </ToolSection>

        <div className="config-items">
          {activeFiles.length > 0 ? activeFiles.map((file) => (
            <KnowledgeFileRow key={file.id} file={file} pendingDeleteId={pendingDeleteId} setPendingDeleteId={setPendingDeleteId} api={api} onAction={onAction} />
          )) : <EmptyBlock title={t('shared.empty.title')} detail={t('knowledge.files.note')} />}
        </div>
      </ConfigList>

      <ConfigDetail title={t('knowledge.index.title')} description={t('nav.knowledge.files.boundary')}>
        <DataRows
          rows={[
            { label: t('common.parsing'), value: activeFiles.filter((file) => file.parseStatus === 'parsing').length },
            { label: t('common.indexing'), value: activeFiles.filter((file) => file.indexStatus === 'indexing').length },
            { label: t('common.failed'), value: activeFiles.filter((file) => file.indexStatus === 'failed' || file.parseStatus === 'failed').length },
          ]}
        />
        <InlineNotice tone="info" title={t('stage.environment-limited')} detail={t('knowledge.chunks.note')} />
        <InlineNotice tone="warning" title={t('common.unsupported')} detail={t('knowledge.import.unsupportedNote')} />
      </ConfigDetail>
      </div>
    </TabPanel>
  );
}

function KnowledgeFileRow({
  file,
  pendingDeleteId,
  setPendingDeleteId,
  api,
  onAction,
}: {
  file: KnowledgeFile;
  pendingDeleteId: string | null;
  setPendingDeleteId: (id: string | null) => void;
  api: TabPageProps['api'];
  onAction: TabPageProps['onAction'];
}) {
  const { t } = useI18n();
  return (
    <div className="config-row">
      <span>
        <strong>{file.name}</strong>
        <small>{statusLabel(file.parseStatus, t)} / {statusLabel(file.indexStatus, t)} / {formatDate(file.updatedAt, t)}</small>
        {file.errorMessage ? <small>{t('knowledge.columns.error')}: {file.errorMessage}</small> : null}
      </span>
      <span className="row-actions">
        <StatusPillLite label={statusLabel(file.indexStatus, t)} state={healthState(file.indexStatus)} />
        <CommandButton icon={<RefreshCw size={14} />} onClick={() => onAction(t('knowledge.toast.rebuilt'), () => api.rebuildKnowledgeFile({ fileId: file.id }))}>{t('knowledge.rebuild')}</CommandButton>
        <CommandButton variant={pendingDeleteId === file.id ? 'danger' : 'default'} icon={<Trash2 size={14} />} onClick={() => {
          if (pendingDeleteId !== file.id) {
            setPendingDeleteId(file.id);
            return;
          }
          onAction(t('knowledge.toast.deleted'), () => api.deleteKnowledgeFile({ fileId: file.id }));
        }}>{t('knowledge.delete')}</CommandButton>
      </span>
    </div>
  );
}
