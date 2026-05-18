import { safeStorage } from 'electron';

export function encodeSecretValue(value: string): string {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return `safeStorage:v1:${safeStorage.encryptString(value).toString('base64')}`;
    }
  } catch {
    // Electron safeStorage can be unavailable in early test/runtime bootstrap.
  }
  if (!canUseDevelopmentSecretFallback()) {
    throw new Error('Secure secret storage is unavailable; refusing to save new secrets without Electron safeStorage.');
  }
  return `local-dev:v1:${Buffer.from(value, 'utf8').toString('base64')}`;
}

export function decodeSecretValue(value: string): string {
  if (value.startsWith('safeStorage:v1:')) {
    return safeStorage.decryptString(Buffer.from(value.slice('safeStorage:v1:'.length), 'base64'));
  }
  if (value.startsWith('local-dev:v1:')) {
    if (!canUseDevelopmentSecretFallback()) {
      throw new Error('Stored secret uses development fallback storage and cannot be decoded in this environment.');
    }
    return Buffer.from(value.slice('local-dev:v1:'.length), 'base64').toString('utf8');
  }
  throw new Error('Stored secret format is unsupported.');
}

function canUseDevelopmentSecretFallback(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development' ||
    Boolean(process.env.VITEST) ||
    Boolean(process.env.VITE_DEV_SERVER_URL) ||
    process.env.NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE === '1'
  );
}
