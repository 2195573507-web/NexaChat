import { useCallback, useMemo, useState } from 'react';

export interface PendingEntry {
  phase: 'pending' | 'failed';
  message?: string;
}

export function useLocalPending() {
  const [entries, setEntries] = useState<Record<string, PendingEntry>>({});

  const isPending = useCallback((key: string) => entries[key]?.phase === 'pending', [entries]);
  const errorFor = useCallback((key: string) => entries[key]?.phase === 'failed' ? entries[key]?.message : undefined, [entries]);
  const runPending = useCallback(async <T,>(key: string, action: () => Promise<T>): Promise<T> => {
    if (entries[key]?.phase === 'pending') {
      throw new Error(`Action already pending: ${key}`);
    }
    setEntries((current) => ({ ...current, [key]: { phase: 'pending' } }));
    try {
      const result = await action();
      setEntries((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setEntries((current) => ({ ...current, [key]: { phase: 'failed', message } }));
      throw error;
    }
  }, [entries]);

  return useMemo(() => ({ entries, errorFor, isPending, runPending }), [entries, errorFor, isPending, runPending]);
}
