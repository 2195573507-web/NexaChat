const ENABLED =
  typeof window !== 'undefined' &&
  (import.meta.env.DEV || import.meta.env.MODE === 'test' || import.meta.env.VITE_NEXACHAT_PERF === '1');

export function markPerformance(name: string): void {
  if (!ENABLED || typeof performance === 'undefined' || typeof performance.mark !== 'function') {
    return;
  }
  performance.mark(`nexachat:${name}`);
}

export function measurePerformance(name: string, start: string, end: string): void {
  if (!ENABLED || typeof performance === 'undefined' || typeof performance.measure !== 'function') {
    return;
  }
  try {
    performance.measure(`nexachat:${name}`, `nexachat:${start}`, `nexachat:${end}`);
  } catch {
    // Missing marks should not break app flows.
  }
}
