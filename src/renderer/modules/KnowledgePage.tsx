import { FilePlus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { KnowledgeChunk, KnowledgeFile, KnowledgeRetrievalResult } from '../../shared/types';
import { KNOWLEDGE_RUNTIME_POLICY } from '../../shared/knowledgeRuntime';
import { FORM_DEFAULTS } from '../../shared/uiCopy';
import { ActivityList, CommandButton, ConfigDetail, ConfigList, DataRows, EmptyBlock, Field, InlineNotice, PageHeader, StatusPillLite, ToolSection } from '../components/AppFrame';
import { useI18n } from '../i18n';
import { formatDate, healthState, statusLabel, TabPanel, type TabPageProps } from './shared';
import { useLocalPending } from './useLocalPending';

export function KnowledgePage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  const { t } = useI18n();
  const [importName, setImportName] = useState<string>(FORM_DEFAULTS.knowledgeImportName);
  const [importContent, setImportContent] = useState<string>(FORM_DEFAULTS.knowledgeImportContent);
  const [query, setQuery] = useState<string>(FORM_DEFAULTS.knowledgeRetrievalQuery);
  const [retrieval, setRetrieval] = useState<KnowledgeRetrievalResult | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [filePage, setFilePage] = useState({ items: snapshot.knowledgeFiles.filter((file) => !file.deletedAt), total: snapshot.knowledgeFiles.length, hasMore: false, loading: false, error: null as string | null });
  const [chunkPage, setChunkPage] = useState({ items: snapshot.knowledgeChunks, total: snapshot.knowledgeChunks.length, hasMore: false, loading: false, error: null as string | null });
  const pending = useLocalPending();
  const activeFiles = filePage.items;
  const indexedFiles = activeFiles.filter((file) => file.indexStatus === 'indexed');
  const totals = useMemo(() => ({
    files: activeFiles.length,
    chunks: chunkPage.total || snapshot.knowledgeChunks.filter((chunk) => chunk.status === 'indexed').length,
    tokens: activeFiles.reduce((sum, file) => sum + file.tokenCount, 0),
  }), [activeFiles, chunkPage.total, snapshot.knowledgeChunks]);

  useEffect(() => {
    setFilePage((current) => ({ ...current, items: snapshot.knowledgeFiles.filter((file) => !file.deletedAt), total: snapshot.knowledgeFiles.length }));
    setChunkPage((current) => ({ ...current, items: snapshot.knowledgeChunks, total: snapshot.knowledgeChunks.length }));
  }, [snapshot.knowledgeChunks, snapshot.knowledgeFiles]);

  const loadKnowledgeFiles = async (reset = false) => {
    setFilePage((current) => ({ ...current, loading: true, error: null }));
    try {
      const offset = reset ? 0 : filePage.items.length;
      const page = await api.listKnowledgeFiles({ limit: 30, offset });
      setFilePage((current) => ({
        items: reset ? page.items : [...current.items, ...page.items],
        total: page.total,
        hasMore: page.hasMore,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setFilePage((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  };

  const loadKnowledgeChunks = async (reset = false) => {
    setChunkPage((current) => ({ ...current, loading: true, error: null }));
    try {
      const offset = reset ? 0 : chunkPage.items.length;
      const page = await api.listKnowledgeChunks({ limit: 40, offset });
      setChunkPage((current) => ({
        items: reset ? page.items : [...current.items, ...page.items],
        total: page.total,
        hasMore: page.hasMore,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setChunkPage((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }));
    }
  };

  useEffect(() => {
    if (activeTab.id === 'files') {
      void loadKnowledgeFiles(true);
    }
    if (activeTab.id === 'chunks') {
      void loadKnowledgeChunks(true);
    }
  }, [activeTab.id]);

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
            items={chunkPage.items.slice(0, 40).map((chunk: KnowledgeChunk) => ({
              title: chunk.citation,
              meta: t('common.valueSeparator', { left: chunk.tokenCount, right: t('knowledge.columns.tokens') }),
              state: healthState(chunk.status),
            }))}
          />
          {chunkPage.error ? <InlineNotice tone="warning" title={t('app.action.failed')} detail={chunkPage.error} /> : null}
          {chunkPage.hasMore ? (
            <CommandButton disabled={chunkPage.loading} onClick={() => loadKnowledgeChunks()}>
              {chunkPage.loading ? t('app.status.busy') : t('common.loadMore')}
            </CommandButton>
          ) : null}
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
          eyebrow={retrieval?.trace.strategy ?? 'vector'}
          title={t('knowledge.retrieval.title')}
          description={activeTab.featureBoundary}
          status={<StatusPillLite label={indexedFiles.length > 0 ? t('common.indexed') : t('common.notConfigured')} state={indexedFiles.length > 0 ? 'ready' : 'warning'} />}
          actions={<CommandButton variant="primary" icon={<Search size={15} />} disabled={!query.trim() || indexedFiles.length === 0 || pending.isPending('knowledge.retrieve')} disabledReason={indexedFiles.length === 0 ? t('knowledge.retrieval.dependency') : undefined} onClick={() => onAction(t('knowledge.toast.retrieved'), () => pending.runPending('knowledge.retrieve', async () => {
            const result = await api.previewKnowledgeRetrieval({ query, topK: KNOWLEDGE_RUNTIME_POLICY.defaultTopK, strategy: 'vector' });
            setRetrieval(result);
          }))}>{pending.isPending('knowledge.retrieve') ? t('app.status.busy') : t('knowledge.retrieval.run')}</CommandButton>}
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
          {pending.isPending('knowledge.retrieve') ? <InlineNotice tone="info" title={t('app.status.busy')} detail={t('knowledge.retrieval.run')} /> : null}
          {pending.errorFor('knowledge.retrieve') ? <InlineNotice tone="warning" title={t('app.action.failed')} detail={pending.errorFor('knowledge.retrieve')} /> : null}
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
          <StatusPillLite label={retrieval?.trace.strategy ?? 'vector'} state={retrieval?.trace.strategy === 'vector' ? 'ready' : 'warning'} />
          {retrieval?.trace.fallbackReason ? <InlineNotice tone="warning" title={t('knowledge.columns.fallback')} detail={retrieval.trace.fallbackReason} /> : null}
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
        actions={<CommandButton variant="primary" icon={<FilePlus size={15} />} disabled={!importName.trim() || !importContent.trim() || pending.isPending('knowledge.import')} onClick={() => onAction(t('knowledge.toast.created'), () => pending.runPending('knowledge.import', () => api.createKnowledgeFile({ name: importName.trim(), type: 'text/markdown', content: importContent })))}>{pending.isPending('knowledge.import') ? t('app.status.busy') : t('knowledge.import.create')}</CommandButton>}
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
            {pending.isPending('knowledge.import') ? <InlineNotice tone="info" title={t('app.status.busy')} detail={t('knowledge.index.title')} /> : null}
            {pending.errorFor('knowledge.import') ? <InlineNotice tone="warning" title={t('app.action.failed')} detail={pending.errorFor('knowledge.import')} /> : null}
          </div>
        </ToolSection>

        <div className="config-items">
          {activeFiles.length > 0 ? activeFiles.map((file) => (
            <KnowledgeFileRow key={file.id} file={file} pendingDeleteId={pendingDeleteId} setPendingDeleteId={setPendingDeleteId} pending={pending} api={api} onAction={onAction} />
          )) : <EmptyBlock title={t('shared.empty.title')} detail={t('knowledge.files.note')} />}
          {filePage.error ? <InlineNotice tone="warning" title={t('app.action.failed')} detail={filePage.error} /> : null}
          {filePage.hasMore ? (
            <CommandButton disabled={filePage.loading} onClick={() => loadKnowledgeFiles()}>
              {filePage.loading ? t('app.status.busy') : t('common.loadMore')}
            </CommandButton>
          ) : null}
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
  pending,
  api,
  onAction,
}: {
  file: KnowledgeFile;
  pendingDeleteId: string | null;
  setPendingDeleteId: (id: string | null) => void;
  pending: ReturnType<typeof useLocalPending>;
  api: TabPageProps['api'];
  onAction: TabPageProps['onAction'];
}) {
  const { t } = useI18n();
  const rebuildKey = `knowledge.rebuild.${file.id}`;
  const deleteKey = `knowledge.delete.${file.id}`;
  return (
    <div className="config-row">
      <span>
        <strong>{file.name}</strong>
        <small>{statusLabel(file.parseStatus, t)} / {statusLabel(file.indexStatus, t)} / {formatDate(file.updatedAt, t)}</small>
        {file.errorMessage ? <small>{t('knowledge.columns.error')}: {file.errorMessage}</small> : null}
      </span>
      <span className="row-actions">
        <StatusPillLite label={statusLabel(file.indexStatus, t)} state={healthState(file.indexStatus)} />
        <CommandButton icon={<RefreshCw size={14} />} disabled={pending.isPending(rebuildKey)} onClick={() => onAction(t('knowledge.toast.rebuilt'), () => pending.runPending(rebuildKey, () => api.rebuildKnowledgeFile({ fileId: file.id })))}>{pending.isPending(rebuildKey) ? t('app.status.busy') : t('knowledge.rebuild')}</CommandButton>
        <CommandButton variant={pendingDeleteId === file.id ? 'danger' : 'default'} icon={<Trash2 size={14} />} disabled={pending.isPending(deleteKey)} onClick={() => {
          if (pendingDeleteId !== file.id) {
            setPendingDeleteId(file.id);
            return;
          }
          onAction(t('knowledge.toast.deleted'), () => pending.runPending(deleteKey, () => api.deleteKnowledgeFile({ fileId: file.id })));
        }}>{pending.isPending(deleteKey) ? t('app.status.busy') : t('knowledge.delete')}</CommandButton>
      </span>
      {[rebuildKey, deleteKey].map((key) => pending.errorFor(key) ? <InlineNotice key={key} tone="warning" title={t('app.action.failed')} detail={pending.errorFor(key)} /> : null)}
    </div>
  );
}
