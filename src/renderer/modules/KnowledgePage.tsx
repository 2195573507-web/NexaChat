import { FilePlus2, RotateCcw } from 'lucide-react';
import type { TabPageProps } from './shared';
import { DataTable, PlannedTabPlaceholder, StateBadge, TabPanel, contextStrategies } from './shared';

export function KnowledgePage({ activeTab, snapshot, api, onAction }: TabPageProps) {
  if (activeTab.id === 'bases') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="知识库分组"
          why="当前只有文件级记录，还没有知识库表、文档归属和库级默认检索策略。"
          dependency="先实现 knowledge base 数据模型、成员关系、导入/删除审计和库级权限。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'retrieval') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="检索设置"
          why="当前可用能力是 lexical fallback；embedding、rerank、top-k 和召回评测尚未接入真实链路。"
          dependency="先接入 embedding 模型、向量索引、rerank 选择和可审计检索日志。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'memory') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="记忆"
          why="显式记忆、摘要、压缩、删除和审计事件还没有独立模型，不能把普通聊天历史伪装成长期记忆。"
          dependency="先实现 memory store、摘要策略、用户可见删除和审计链。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'maintenance') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <PlannedTabPlaceholder
          tab={activeTab}
          featureName="清理维护"
          why="失效内容清理、重复内容合并和维护审计还没有落地，当前不开放任何破坏性或伪维护操作。"
          dependency="先完成 cleanup preview、依赖检查、确认短语和维护审计事件。"
        />
      </TabPanel>
    );
  }

  if (activeTab.id === 'context') {
    return (
      <TabPanel moduleId="knowledge" tab={activeTab}>
        <section className="two-column">
          <div className="panel">
            <h2>上下文策略</h2>
            <p>Chat 会在 assistant message metadata 中保存 context strategy 和 citation 线索，当前不声称完整向量 RAG 已完成。</p>
            <DataTable
              columns={['策略', '说明']}
              rows={contextStrategies.map((strategy) => [strategy.label, strategy.value])}
            />
          </div>
          <div className="panel">
            <h2>Lexical 检索测试</h2>
            <p>此测试只创建一条本地文本知识文件，作为 lexical fallback 的可见状态。</p>
            <button type="button" onClick={() => onAction('lexical 检索测试已写入本地历史', () => api.createKnowledgeFile('lexical-test.md', 'text/markdown', 512))}>
              运行 lexical 检索测试
            </button>
          </div>
        </section>
      </TabPanel>
    );
  }

  return (
    <TabPanel moduleId="knowledge" tab={activeTab}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>文件与索引状态</h2>
            <p>首版实现 TXT / MD / 文本类 lexical fallback；PDF/Office/OCR/embedding 实调标为 planned。</p>
          </div>
          <button type="button" onClick={() => onAction('文本文件已加入知识库索引', () => api.createKnowledgeFile('notes.md', 'text/markdown', 4096))}>
            <FilePlus2 size={16} /> 添加文本文件
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
