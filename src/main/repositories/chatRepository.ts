import type { DatabaseSync } from 'node:sqlite';
import type {
  Conversation,
  ConversationExport,
  Message,
  MessageAttachment,
  MessageChunk,
  PromptTemplate,
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
