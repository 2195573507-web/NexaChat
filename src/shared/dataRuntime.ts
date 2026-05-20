export const DATA_MANIFEST_VERSION = 'nexachat.data.v1' as const;

export const DATA_OPERATION_KINDS = [
  'import',
  'export',
  'snapshot',
  'encrypted-backup',
  'restore-preflight',
  'rollback',
  'migration',
  'diagnostics',
] as const;
export type DataOperationKind = (typeof DATA_OPERATION_KINDS)[number];

export const DATA_JOB_STATUSES = ['ready', 'completed', 'failed', 'blocked'] as const;
export type DataJobStatus = (typeof DATA_JOB_STATUSES)[number];

export const DATA_BACKUP_PROFILES = ['metadata-redacted', 'encrypted-redacted', 'encrypted-full'] as const;
export type DataBackupProfile = (typeof DATA_BACKUP_PROFILES)[number];

export const DATA_CONFLICT_TYPES = ['provider-name', 'model-name', 'workspace-default', 'secret-stripped'] as const;
export type DataConflictType = (typeof DATA_CONFLICT_TYPES)[number];

export const DATA_CONFLICT_STRATEGIES = ['keep-local', 'import-as-new', 'skip'] as const;
export type DataConflictStrategy = (typeof DATA_CONFLICT_STRATEGIES)[number];

export const DATA_ROLLBACK_STATES = ['available', 'applied', 'expired', 'blocked'] as const;
export type DataRollbackState = (typeof DATA_ROLLBACK_STATES)[number];

export const DATA_MIGRATION_VERSIONS = ['round-12-data-mobility-v1'] as const;
export type DataMigrationVersion = (typeof DATA_MIGRATION_VERSIONS)[number];

export const DATA_WIZARD_STEPS = [
  'source',
  'preflight',
  'mapping',
  'conflicts',
  'encryption',
  'confirm',
  'result',
] as const;
export type DataWizardStep = (typeof DATA_WIZARD_STEPS)[number];

export interface DataConflictInput {
  type: DataConflictType;
  entityKind: 'provider' | 'model' | 'workspace' | 'secret';
  localId: string | null;
  importName: string;
  strategy?: DataConflictStrategy;
}

export interface NormalizedProviderImport {
  name: string;
  type: 'openai-compatible';
  baseUrl: string;
}

export interface NormalizedModelImport {
  providerName: string | null;
  name: string;
  displayName: string;
}

export interface NormalizedGatewayKeyTemplate {
  name: string;
  scopes: string[];
  quotaLimit: number | null;
}

export interface NormalizedDataManifest {
  version: typeof DATA_MANIFEST_VERSION;
  source: string;
  providers: NormalizedProviderImport[];
  models: NormalizedModelImport[];
  gatewayKeyTemplates: NormalizedGatewayKeyTemplate[];
  conflictCount: number;
  conflicts: DataConflictInput[];
  redaction: {
    secrets: 'stripped';
    localPaths: 'redacted';
  };
  requiresConfirmation: boolean;
}

export interface DataBackupPackage {
  version: typeof DATA_MANIFEST_VERSION;
  profile: DataBackupProfile;
  encrypted: boolean;
  redacted: boolean;
  fullDatabase: false;
  rawDatabaseIncluded: false;
  secrets: 'stripped';
  manifestHash: string;
  payload: string;
  salt?: string;
  iv?: string;
  authTag?: string;
}

export interface RestoreDiffSummary {
  added: string[];
  changed: string[];
  disabled: string[];
  manualSecrets: string[];
  unsupported: string[];
}

export const DATA_CONFIRMATION_PHRASES = {
  applyImport: 'APPLY IMPORT',
  restore: 'RESTORE PREFLIGHT',
  rollback: 'ROLLBACK DATA',
} as const;

export function normalizeDataManifest(input: Record<string, unknown>, conflicts: DataConflictInput[] = []): NormalizedDataManifest {
  const providers = normalizeProviderImports(input.providers);
  const models = normalizeModelImports(input.models);
  const keys = normalizeGatewayKeyTemplates(input.keys ?? input.apiKeys ?? input.gatewayKeys);
  const hasSupportedData = providers.length > 0 || models.length > 0 || keys.length > 0 || typeof input.workspace === 'object';
  if (!hasSupportedData) {
    throw new Error('Manifest must include providers, models, gateway keys, or workspace metadata.');
  }
  return {
    version: DATA_MANIFEST_VERSION,
    source: detectDataImportSource(input),
    providers,
    models,
    gatewayKeyTemplates: keys,
    conflictCount: conflicts.length,
    conflicts,
    redaction: {
      secrets: 'stripped',
      localPaths: 'redacted',
    },
    requiresConfirmation: true,
  };
}

export function detectDataImportSource(manifest: Record<string, unknown>): string {
  const value = String(manifest.source ?? manifest.kind ?? manifest.type ?? '').toLowerCase();
  if (value.includes('sub2api')) return 'sub2api';
  if (value.includes('ccs')) return 'ccs';
  if (value.includes('ollama')) return 'ollama';
  if (value.includes('lm-studio') || value.includes('lm studio')) return 'lm-studio';
  if (value.includes('nexachat')) return 'nexachat';
  return 'openai-compatible';
}

export function normalizeProviderImports(value: unknown): NormalizedProviderImport[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((provider, index) => {
    const item = provider as Record<string, unknown>;
    return {
      name: String(item.name ?? item.label ?? `Imported Provider ${index + 1}`).trim(),
      type: 'openai-compatible' as const,
      baseUrl: normalizeBaseUrl(String(item.baseUrl ?? item.base_url ?? item.url ?? 'http://127.0.0.1:11434/v1')),
    };
  }).filter((provider) => provider.name.length > 0 && provider.baseUrl.length > 0);
}

export function normalizeModelImports(value: unknown): NormalizedModelImport[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).map((model, index) => {
    const item = model as Record<string, unknown>;
    const name = String(item.name ?? item.id ?? item.model ?? `imported-model-${index + 1}`).trim();
    return {
      providerName: item.providerName || item.provider ? String(item.providerName ?? item.provider) : null,
      name,
      displayName: String(item.displayName ?? item.label ?? name),
    };
  }).filter((model) => model.name.length > 0);
}

export function normalizeGatewayKeyTemplates(value: unknown): NormalizedGatewayKeyTemplate[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item, index) => {
    const record = item as Record<string, unknown>;
    const scopes = Array.isArray(record.scopes) ? record.scopes.map(String).filter(Boolean) : [];
    return {
      name: String(record.name ?? record.label ?? `Imported Gateway Key Template ${index + 1}`),
      scopes,
      quotaLimit: typeof record.quotaLimit === 'number' ? Math.max(1, Math.floor(record.quotaLimit)) : null,
    };
  });
}

export function createRedactedBackupPackage(payload: unknown, profile: DataBackupProfile = 'metadata-redacted'): DataBackupPackage {
  const redactedPayload = JSON.stringify(redactBackupPayload(payload));
  return {
    version: DATA_MANIFEST_VERSION,
    profile,
    encrypted: false,
    redacted: true,
    fullDatabase: false,
    rawDatabaseIncluded: false,
    secrets: 'stripped',
    manifestHash: stableHash(redactedPayload),
    payload: redactedPayload,
  };
}

export function buildRestoreDiffSummary(manifest: NormalizedDataManifest): RestoreDiffSummary {
  return {
    added: [
      ...manifest.providers.map((provider) => `provider:${provider.name}`),
      ...manifest.models.map((model) => `model:${model.name}`),
    ],
    changed: manifest.conflicts.map((conflict) => `${conflict.entityKind}:${conflict.importName}`),
    disabled: [],
    manualSecrets: manifest.gatewayKeyTemplates.map((key) => `gateway-key:${key.name}`),
    unsupported: [],
  };
}

export function stableHash(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  }
  return `dh_${hash.toString(16).padStart(8, '0')}`;
}

export function redactBackupPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactBackupPayload(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (lower.includes('secret') || lower.includes('token') || lower.includes('password') || lower.includes('apikey') || lower.includes('api_key') || lower.includes('authorization')) {
      output[key] = '[REDACTED]';
    } else if (lower.includes('path') && typeof raw === 'string') {
      output[key] = '[REDACTED_LOCAL_PATH]';
    } else {
      output[key] = redactBackupPayload(raw);
    }
  }
  return output;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}
