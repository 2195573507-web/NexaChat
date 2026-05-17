import type { DatabaseSync } from 'node:sqlite';
import type {
  KnowledgeChunk,
  KnowledgeCitation,
  KnowledgeFile,
  KnowledgeRetrievalTrace,
} from '../../shared/types.js';
import {
  mapKnowledgeChunk,
  mapKnowledgeCitation,
  mapKnowledgeFile,
  mapKnowledgeRetrievalTrace,
} from './mappers.js';

export class KnowledgeRepository {
  constructor(private readonly db: DatabaseSync) {}

  listKnowledgeFiles(): KnowledgeFile[] {
    return this.db
      .prepare('SELECT * FROM files WHERE deleted_at IS NULL ORDER BY updated_at DESC')
      .all()
      .map((row) => mapKnowledgeFile(row as Record<string, unknown>));
  }

  listKnowledgeChunks(fileId?: string): KnowledgeChunk[] {
    const sql = fileId
      ? 'SELECT * FROM knowledge_chunks WHERE file_id = ? AND status != ? ORDER BY position ASC'
      : 'SELECT * FROM knowledge_chunks WHERE status != ? ORDER BY created_at DESC, position ASC LIMIT 500';
    const rows = fileId
      ? this.db.prepare(sql).all(fileId, 'deleted')
      : this.db.prepare(sql).all('deleted');
    return rows.map((row) => mapKnowledgeChunk(row as Record<string, unknown>));
  }

  listKnowledgeRetrievalTraces(): KnowledgeRetrievalTrace[] {
    return this.db
      .prepare('SELECT * FROM knowledge_retrieval_traces ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => mapKnowledgeRetrievalTrace(row as Record<string, unknown>));
  }

  listKnowledgeCitations(messageId?: string): KnowledgeCitation[] {
    const sql = messageId
      ? 'SELECT * FROM message_citations WHERE message_id = ? ORDER BY score DESC, created_at ASC'
      : 'SELECT * FROM message_citations ORDER BY created_at DESC LIMIT 200';
    const rows = messageId ? this.db.prepare(sql).all(messageId) : this.db.prepare(sql).all();
    return rows.map((row) => mapKnowledgeCitation(row as Record<string, unknown>));
  }
}
