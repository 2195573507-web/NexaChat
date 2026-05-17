import type { DatabaseSync } from 'node:sqlite';
import type {
  Conversation,
  ConversationExport,
  Message,
  MessageAttachment,
  MessageChunk,
  PromptTemplate,
  PageResult,
  ConversationPageInput,
  MessagePageInput,
} from '../../shared/types.js';
import {
  mapConversation,
  mapConversationExport,
  mapMessage,
  mapMessageAttachment,
  mapMessageChunk,
  mapPromptTemplate,
} from './mappers.js';

export class ChatRepository {
  constructor(private readonly db: DatabaseSync) {}

  pageConversations(input: ConversationPageInput = {}): PageResult<Conversation> {
    const limit = normalizeLimit(input.limit, 30, 100);
    const offset = normalizeOffset(input.offset);
    const query = input.query?.trim().toLowerCase();
    const where = query ? "status != 'deleted' AND (lower(title) LIKE ? OR lower(COALESCE(group_name, '')) LIKE ?)" : "status != 'deleted'";
    const params = query ? [`%${query}%`, `%${query}%`] : [];
    const total = Number((this.db.prepare(`SELECT COUNT(*) AS count FROM conversations WHERE ${where}`).get(...params) as { count: number } | undefined)?.count ?? 0);
    const rows = this.db
      .prepare(`SELECT * FROM conversations WHERE ${where} ORDER BY is_pinned DESC, updated_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map((row) => mapConversation(row as Record<string, unknown>));
    return { items: rows, total, limit, offset, hasMore: offset + rows.length < total };
  }

  pageMessages(input: MessagePageInput): PageResult<Message> {
    const limit = normalizeLimit(input.limit, 40, 200);
    const offset = normalizeOffset(input.offset);
    const total = Number((this.db
      .prepare("SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ? AND status != 'deleted'")
      .get(input.conversationId) as { count: number } | undefined)?.count ?? 0);
    const rows = this.db
      .prepare(
        `SELECT * FROM messages
         WHERE conversation_id = ? AND status != 'deleted'
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(input.conversationId, limit, offset)
      .map((row) => mapMessage(row as Record<string, unknown>))
      .reverse();
    return { items: rows, total, limit, offset, hasMore: offset + rows.length < total };
  }

  listConversations(): Conversation[] {
    return this.db
      .prepare("SELECT * FROM conversations WHERE status != 'deleted' ORDER BY is_pinned DESC, updated_at DESC")
      .all()
      .map((row) => mapConversation(row as Record<string, unknown>));
  }

  listMessages(conversationId?: string): Message[] {
    const sql = conversationId
      ? 'SELECT * FROM messages WHERE conversation_id = ? AND status != ? ORDER BY created_at ASC'
      : 'SELECT * FROM messages WHERE status != ? ORDER BY created_at ASC';
    const rows = conversationId
      ? this.db.prepare(sql).all(conversationId, 'deleted')
      : this.db.prepare(sql).all('deleted');
    return rows.map((row) => mapMessage(row as Record<string, unknown>));
  }

  listMessageChunks(messageId?: string): MessageChunk[] {
    const sql = messageId
      ? 'SELECT * FROM message_chunks WHERE message_id = ? ORDER BY sequence ASC'
      : 'SELECT * FROM message_chunks ORDER BY created_at ASC, sequence ASC LIMIT 500';
    const rows = messageId ? this.db.prepare(sql).all(messageId) : this.db.prepare(sql).all();
    return rows.map((row) => mapMessageChunk(row as Record<string, unknown>));
  }

  listMessageAttachments(conversationId?: string): MessageAttachment[] {
    const sql = conversationId
      ? "SELECT * FROM message_attachments WHERE conversation_id = ? AND status != 'deleted' ORDER BY created_at ASC"
      : "SELECT * FROM message_attachments WHERE status != 'deleted' ORDER BY created_at ASC LIMIT 200";
    const rows = conversationId ? this.db.prepare(sql).all(conversationId) : this.db.prepare(sql).all();
    return rows.map((row) => mapMessageAttachment(row as Record<string, unknown>));
  }

  listPromptTemplates(): PromptTemplate[] {
    return this.db
      .prepare('SELECT * FROM prompt_templates ORDER BY scope ASC, updated_at DESC')
      .all()
      .map((row) => mapPromptTemplate(row as Record<string, unknown>));
  }

  listConversationExports(conversationId?: string): ConversationExport[] {
    const sql = conversationId
      ? 'SELECT * FROM conversation_exports WHERE conversation_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM conversation_exports ORDER BY created_at DESC LIMIT 50';
    const rows = conversationId ? this.db.prepare(sql).all(conversationId) : this.db.prepare(sql).all();
    return rows.map((row) => mapConversationExport(row as Record<string, unknown>));
  }
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const parsed = Math.floor(Number(value ?? fallback));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function normalizeOffset(value: number | undefined): number {
  const parsed = Math.floor(Number(value ?? 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
