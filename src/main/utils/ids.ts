import { randomUUID } from 'node:crypto';

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
}

export function now(): number {
  return Date.now();
}

export function estimateTokens(text: string): number {
  const compact = text.trim();
  if (!compact) {
    return 0;
  }
  return Math.max(1, Math.ceil(compact.length / 4));
}

export function previewSecret(value: string): string {
  if (!value) {
    return 'empty';
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}
