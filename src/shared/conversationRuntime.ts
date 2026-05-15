import type { ContextStrategy } from './types.js';

export const CONVERSATION_STATUS = ['active', 'archived', 'deleted'] as const;
export const MESSAGE_ROLES = ['system', 'user', 'assistant', 'tool', 'error'] as const;
export const MESSAGE_STATUS = ['draft', 'streaming', 'completed', 'failed', 'cancelled', 'deleted'] as const;
export const MESSAGE_CONTENT_FORMATS = ['markdown', 'plain_text', 'json', 'tool_result'] as const;
export const MESSAGE_CHUNK_TYPES = ['text', 'tool_call', 'error', 'final'] as const;
export const MESSAGE_CHUNK_STATUS = ['streaming', 'completed', 'failed', 'cancelled'] as const;
export const CONVERSATION_EXPORT_FORMATS = ['markdown', 'json'] as const;
export const PROMPT_TEMPLATE_SCOPES = ['global', 'conversation'] as const;

export type ConversationStatus = (typeof CONVERSATION_STATUS)[number];
export type MessageRole = (typeof MESSAGE_ROLES)[number];
export type MessageStatus = (typeof MESSAGE_STATUS)[number];
export type MessageContentFormat = (typeof MESSAGE_CONTENT_FORMATS)[number];
export type MessageChunkType = (typeof MESSAGE_CHUNK_TYPES)[number];
export type MessageChunkStatus = (typeof MESSAGE_CHUNK_STATUS)[number];
export type ConversationExportFormat = (typeof CONVERSATION_EXPORT_FORMATS)[number];
export type PromptTemplateScope = (typeof PROMPT_TEMPLATE_SCOPES)[number];

export const MESSAGE_ATTACHMENT_POLICY = {
  maxBytes: 25 * 1024 * 1024,
  allowedMimePrefixes: ['text/', 'application/json', 'application/pdf'],
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

export const CONTEXT_STRATEGY_LIMITS: Record<ContextStrategy, { messageLimit: number; tokenBudgetRatio: number }> = {
  recent_n: { messageLimit: 8, tokenBudgetRatio: 0.45 },
  summary_recent_n: { messageLimit: 12, tokenBudgetRatio: 0.55 },
  manual: { messageLimit: 8, tokenBudgetRatio: 0.45 },
  token_trim: { messageLimit: 24, tokenBudgetRatio: 0.65 },
};

export function isConversationExportFormat(value: string): value is ConversationExportFormat {
  return (CONVERSATION_EXPORT_FORMATS as readonly string[]).includes(value);
}

export function isAllowedAttachmentMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  return (
    MESSAGE_ATTACHMENT_POLICY.allowedMimePrefixes.some((prefix) => normalized.startsWith(prefix)) ||
    (MESSAGE_ATTACHMENT_POLICY.allowedMimeTypes as readonly string[]).includes(normalized)
  );
}
