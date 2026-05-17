import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type {
  KnowledgeChunk,
  KnowledgeChunkPageInput,
  KnowledgeCitation,
  KnowledgeFile,
  KnowledgeFilePageInput,
  KnowledgeRetrievalTrace,
  PageResult,
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

  pageKnowledgeFiles(input: KnowledgeFilePageInput = {}): PageResult<KnowledgeFile> {
    const limit = normalizeLimit(input.limit, 50, 200);
    const offset = normalizeOffset(input.offset);
    const where = ['deleted_at IS NULL'];
    const params: SQLInputValue[] = [];
    if (input.status) {
      where.push('index_status = ?');
      params.push(input.status);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = Number((this.db.prepare(`SELECT COUNT(*) AS count FROM files ${whereSql}`).get(...params) as { count: number } | undefined)?.count ?? 0);
    const rows = this.db
      .prepare(`SELECT * FROM files ${whereSql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map((row) => mapKnowledgeFile(row as Record<string, unknown>));
    return { items: rows, total, limit, offset, hasMore: offset + rows.length < total };
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

  pageKnowledgeChunks(input: KnowledgeChunkPageInput = {}): PageResult<KnowledgeChunk> {
    const limit = normalizeLimit(input.limit, 50, 200);
    const offset = normalizeOffset(input.offset);
    const where = ["status != 'deleted'"];
    const params: SQLInputValue[] = [];
    if (input.fileId) {
      where.push('file_id = ?');
      params.push(input.fileId);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = Number((this.db.prepare(`SELECT COUNT(*) AS count FROM knowledge_chunks ${whereSql}`).get(...params) as { count: number } | undefined)?.count ?? 0);
    const rows = this.db
      .prepare(`SELECT * FROM knowledge_chunks ${whereSql} ORDER BY created_at DESC, position ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map((row) => mapKnowledgeChunk(row as Record<string, unknown>));
    return { items: rows, total, limit, offset, hasMore: offset + rows.length < total };
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

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const parsed = Math.floor(Number(value ?? fallback));
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function normalizeOffset(value: number | undefined): number {
  const parsed = Math.floor(Number(value ?? 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
