import { createId, now } from '../utils/ids.js';
import { translate } from '../../shared/i18n.js';
import { KNOWLEDGE_RUNTIME_POLICY, chunkKnowledgeText, normalizeKnowledgeImport } from '../../shared/knowledgeRuntime.js';
import { SECURITY_ACTION_PERMISSIONS } from '../../shared/securityRuntime.js';
import type {
  KnowledgeChunk,
  KnowledgeCitation,
  KnowledgeDeleteInput,
  KnowledgeFile,
  KnowledgeImportInput,
  KnowledgeRebuildInput,
  KnowledgeRetrievalInput,
  KnowledgeRetrievalResult,
  KnowledgeRetrievalTrace
} from '../../shared/types.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const DEFAULT_WORKSPACE_ID = 'ws_default';
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);



export function KnowledgeService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class KnowledgeService extends Base {
  getKnowledgeFiles(): KnowledgeFile[] {
    return this.repositories.knowledge.listKnowledgeFiles();
  }


  getKnowledgeChunks(fileId?: string): KnowledgeChunk[] {
    return this.repositories.knowledge.listKnowledgeChunks(fileId);
  }


  getKnowledgeRetrievalTraces(): KnowledgeRetrievalTrace[] {
    return this.repositories.knowledge.listKnowledgeRetrievalTraces();
  }


  getKnowledgeCitations(messageId?: string): KnowledgeCitation[] {
    return this.repositories.knowledge.listKnowledgeCitations(messageId);
  }


  createKnowledgeFile(input: KnowledgeImportInput): KnowledgeFile {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.knowledgeWrite, 'file', null);
    const timestamp = now();
    const id = createId('file');
    const normalized = normalizeKnowledgeImport(input);
    const metadata = {
      parserType: normalized.parserType,
      originalSize: input.size ?? normalized.size,
      importMode: 'inline-text',
      maxImportBytes: KNOWLEDGE_RUNTIME_POLICY.maxImportBytes,
    };
    const chunks = normalized.supported ? chunkKnowledgeText(normalized.content) : [];
    const tokenCount = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
    const errorMessage = normalized.errorKey ? t(normalized.errorKey as Parameters<typeof t>[0]) : null;
    const parseStatus = normalized.supported ? 'indexed' : 'failed';
    const indexStatus = normalized.supported ? 'indexed' : 'failed';
    const embeddingStatus = normalized.supported ? 'embedded' : 'failed';
    this.db
      .prepare(
        `INSERT INTO files (id, workspace_id, knowledge_base_id, name, type, size, parse_status, index_status, embedding_status, parser_type, chunk_count, token_count, content_hash, storage_ref, metadata_json, error_message, parse_started_at, parse_completed_at, deleted_at, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(
        id,
        DEFAULT_WORKSPACE_ID,
        normalized.name,
        normalized.type,
        normalized.size,
        parseStatus,
        indexStatus,
        embeddingStatus,
        normalized.parserType,
        chunks.length,
        tokenCount,
        normalized.contentHash,
        null,
        JSON.stringify(metadata),
        errorMessage,
        timestamp,
        timestamp,
        timestamp,
        timestamp,
      );
    if (normalized.supported) {
      this.indexKnowledgeChunks(id, normalized.name, chunks, timestamp);
    }
    this.audit('knowledge.file.created', 'file', id, {
      name: normalized.name,
      parseStatus,
      indexStatus,
      embeddingStatus,
      chunkCount: chunks.length,
      errorMessage,
    });
    return this.requireKnowledgeFile(id);
  }


  retryKnowledgeFile(input: KnowledgeRebuildInput): KnowledgeFile {
    return this.rebuildKnowledgeFile(input);
  }


  rebuildKnowledgeFile(input: KnowledgeRebuildInput): KnowledgeFile {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.knowledgeWrite, 'file', input.fileId);
    const file = this.requireKnowledgeFile(input.fileId);
    const timestamp = now();
    if (file.deletedAt) {
      throw new Error(t('knowledge.errors.deletedFile'));
    }
    const existingChunks = this.getKnowledgeChunks(file.id);
    if (existingChunks.length === 0 && file.parseStatus === 'failed') {
      this.db
        .prepare('UPDATE files SET parse_status = ?, index_status = ?, embedding_status = ?, error_message = ?, updated_at = ? WHERE id = ?')
        .run('failed', 'failed', 'failed', t('knowledge.errors.rebuildNoSource'), timestamp, file.id);
      this.audit('knowledge.file.rebuild.failed', 'file', file.id, { reason: 'no indexed source chunks' });
      return this.requireKnowledgeFile(file.id);
    }
    const sourceText = existingChunks.map((chunk) => chunk.content).join('\n\n');
    const chunks = chunkKnowledgeText(sourceText);
    this.db.prepare('UPDATE knowledge_chunks SET status = ?, updated_at = ? WHERE file_id = ?').run('deleted', timestamp, file.id);
    this.db
      .prepare(
        `UPDATE files
         SET parse_status = 'indexed', index_status = 'indexed', embedding_status = 'embedded', chunk_count = ?, token_count = ?, error_message = NULL, parse_started_at = ?, parse_completed_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(chunks.length, chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0), timestamp, timestamp, timestamp, file.id);
    this.indexKnowledgeChunks(file.id, file.name, chunks, timestamp);
    this.audit('knowledge.file.rebuilt', 'file', file.id, { chunkCount: chunks.length });
    return this.requireKnowledgeFile(file.id);
  }


  deleteKnowledgeFile(input: KnowledgeDeleteInput): KnowledgeFile {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.knowledgeWrite, 'file', input.fileId);
    const file = this.requireKnowledgeFile(input.fileId);
    const timestamp = now();
    this.db
      .prepare(
        `INSERT INTO knowledge_deletion_tombstones (id, file_id, file_name, chunk_count, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(createId('tombstone'), file.id, file.name, file.chunkCount, 'user-delete', timestamp);
    this.db.prepare('UPDATE knowledge_chunks SET status = ?, updated_at = ? WHERE file_id = ?').run('deleted', timestamp, file.id);
    this.db
      .prepare(
        `UPDATE files
         SET parse_status = 'stale', index_status = 'deleted', embedding_status = 'deleted', chunk_count = 0, deleted_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(timestamp, timestamp, file.id);
    this.audit('knowledge.file.deleted', 'file', file.id, { name: file.name, chunkCount: file.chunkCount });
    return this.requireKnowledgeFile(file.id, { includeDeleted: true });
  }


  previewKnowledgeRetrieval(input: KnowledgeRetrievalInput): KnowledgeRetrievalResult {
    this.requirePermission(SECURITY_ACTION_PERMISSIONS.knowledgeRead, 'knowledge_retrieval', null);
    return this.retrieveKnowledge(input.query, {
      topK: input.topK,
      strategy: input.strategy,
      persistCitations: false,
    });
  }

  };
}
