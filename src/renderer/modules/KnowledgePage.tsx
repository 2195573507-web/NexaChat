import { FilePlus2, RotateCcw } from 'lucide-react';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel, contextStrategies } from './shared';

export function KnowledgePage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  if (activeTab.id === 'chunks') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>Chunk 与 lexical fallback</h2>
            <p>当前知识库能力是文本类记录和 lexical fallback chunk；不声称 PDF/OCR/vector/rerank 已完成。</p>
            <DataTable
              columns={['文件', '解析状态', 'Chunks', 'Fallback', '错误']}
              rows={snapshot.knowledgeFiles.map((file) => [
                file.name,
                <StateBadge key={`${file.id}-status`} label={file.parseStatus} tone={file.parseStatus === 'indexed' ? 'success' : file.parseStatus === 'failed' ? 'error' : 'warning'} />,
                file.chunkCount,
                /text|markdown|json|csv|code|txt|md/i.test(`${file.name} ${file.type}`) ? 'lexical' : '不支持',
                file.errorMessage ?? '-',
              ])}
            />
          </div>
          <div className="panel">
            <h2>上下文策略引用</h2>
            <p>Chat 会在 assistant message metadata 中保存 context strategy 和 citation 线索；完整引用来源链路等待检索日志和向量索引。</p>
            <DataTable columns={['策略', '值']} rows={contextStrategies.map((strategy) => [strategy.label, strategy.value])} />
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
          featureName="检索预览"
          why="当前可用能力是文本 lexical fallback；embedding、vector index、rerank、PDF/OCR 和引用评分还没有真实链路。"
          dependency="先接入 embedding 模型、向量索引、rerank 选择、检索日志和可审计引用来源。"
        />
        <section className="panel roadmap-panel">
          <h2>当前可见来源</h2>
          <p>已索引文本文件会显示 chunk 数和错误原因；未实现的高级检索能力不会以可点击主按钮出现。</p>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="knowledge" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>知识文件记录</h2>
            <p>首版只支持文本类知识文件记录和 lexical fallback；高级解析不会伪装成上传器。</p>
          </div>
          <button type="button" onClick={() => onAction('文本知识记录已创建', () => api.createKnowledgeFile('manual-note.md', 'text/markdown', 4096))}>
            <FilePlus2 size={16} /> 创建文本记录
          </button>
        </div>
        <DataTable
          columns={['文件', '类型', '大小', '解析状态', 'Chunks', '错误/操作']}
          rows={snapshot.knowledgeFiles.map((file) => [
            file.name,
            file.type,
            file.size,
            <StateBadge key={`${file.id}-status`} label={file.parseStatus} tone={file.parseStatus === 'indexed' ? 'success' : file.parseStatus === 'failed' ? 'error' : 'warning'} />,
            file.chunkCount,
            <div className="cell-actions" key={file.id}>
              <span>{file.errorMessage ?? '-'}</span>
              <button type="button" onClick={() => onAction('知识文件已重试解析', () => api.retryKnowledgeFile(file.id))}>
                <RotateCcw size={16} /> 重试
              </button>
            </div>,
          ])}
        />
      </section>
    </TabPanel>
  );
}
