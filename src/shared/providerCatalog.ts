import type { ProviderType } from './types.js';

export type ProviderCatalogEntry = {
  type: ProviderType;
  labelKey:
    | 'provider.type.openaiCompatible'
    | 'provider.type.openai'
    | 'provider.type.anthropic'
    | 'provider.type.gemini'
    | 'provider.type.deepseek'
    | 'provider.type.qwen'
    | 'provider.type.ollama'
    | 'provider.type.lmStudio'
    | 'provider.type.custom';
  requiresAdapter: boolean;
};

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  { type: 'openai-compatible', labelKey: 'provider.type.openaiCompatible', requiresAdapter: true },
  { type: 'openai', labelKey: 'provider.type.openai', requiresAdapter: true },
  { type: 'anthropic', labelKey: 'provider.type.anthropic', requiresAdapter: true },
  { type: 'gemini', labelKey: 'provider.type.gemini', requiresAdapter: true },
  { type: 'deepseek', labelKey: 'provider.type.deepseek', requiresAdapter: true },
  { type: 'qwen', labelKey: 'provider.type.qwen', requiresAdapter: true },
  { type: 'ollama', labelKey: 'provider.type.ollama', requiresAdapter: true },
  { type: 'lm-studio', labelKey: 'provider.type.lmStudio', requiresAdapter: true },
  { type: 'custom', labelKey: 'provider.type.custom', requiresAdapter: true },
];

export const DEFAULT_PROVIDER_FORM = {
  type: 'openai-compatible' as ProviderType,
  name: '',
  baseUrl: '',
  apiKey: '',
};

export const DEFAULT_MODEL_FORM = {
  name: '',
};
