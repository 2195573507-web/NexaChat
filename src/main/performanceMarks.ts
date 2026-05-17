import { performance } from 'node:perf_hooks';

const ENABLED =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.VITE_NEXACHAT_PERF === '1' ||
  process.env.NEXACHAT_PERF === '1';

export async function measureMainIpc<T>(name: string, action: () => T | Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await action();
  } finally {
    if (ENABLED) {
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
      console.debug(`[nexachat:perf] ${name} ${durationMs}ms`);
    }
  }
}
