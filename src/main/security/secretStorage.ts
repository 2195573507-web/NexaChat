import { safeStorage } from 'electron';

export type SecretStorageMode = 'safeStorage' | 'local-dev-fallback' | 'blocked';

export interface SecretStorageDiagnostics {
  mode: SecretStorageMode;
  safeStorageAvailable: boolean;
  releaseProfile: boolean;
  insecureFallbackEnvPresent: boolean;
  electronSmokeEnvPresent: boolean;
}

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

export function getSecretStorageDiagnostics(): SecretStorageDiagnostics {
  const safeStorageAvailable = isSafeStorageAvailable();
  const releaseProfile = isReleaseProfile();
  const insecureFallbackEnvPresent = process.env.NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE === '1';
  const electronSmokeEnvPresent = process.env.NEXACHAT_ELECTRON_SMOKE === '1';
  const fallbackBlocked = releaseProfile && (insecureFallbackEnvPresent || electronSmokeEnvPresent);
  return {
    mode: safeStorageAvailable ? 'safeStorage' : fallbackBlocked ? 'blocked' : canUseDevelopmentSecretFallback() ? 'local-dev-fallback' : 'blocked',
    safeStorageAvailable,
    releaseProfile,
    insecureFallbackEnvPresent,
    electronSmokeEnvPresent,
  };
}

function canUseDevelopmentSecretFallback(): boolean {
  if (isReleaseProfile()) {
    if (process.env.NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE === '1' || process.env.NEXACHAT_ELECTRON_SMOKE === '1') {
      throw new Error('Insecure secret storage fallback is blocked in release context.');
    }
  }
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development' ||
    Boolean(process.env.VITEST) ||
    Boolean(process.env.VITE_DEV_SERVER_URL) ||
    process.env.NEXACHAT_ELECTRON_SMOKE === '1' ||
    process.env.NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE === '1'
  );
}

function isSafeStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function isReleaseProfile(): boolean {
  return process.env.NEXACHAT_RELEASE_PROFILE === '1';
}
