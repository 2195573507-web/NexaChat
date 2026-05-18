import { afterEach, describe, expect, it, vi } from 'vitest';

async function importFreshApi() {
  vi.resetModules();
  return import('../src/renderer/api');
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.nexachat;
});

describe('renderer API boundary', () => {
  it('uses the preload API when Electron exposes window.nexachat', async () => {
    const preloadApi = { getSnapshot: vi.fn() } as unknown as Window['nexachat'];
    window.nexachat = preloadApi;

    const { getAppApi } = await importFreshApi();

    expect(getAppApi()).toBe(preloadApi);
  });

  it('does not silently fall back to browser mock outside explicit mock mode', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_NEXACHAT_BROWSER_MOCK', '');

    const { getAppApi } = await importFreshApi();

    expect(() => getAppApi()).toThrow(/preload API is unavailable/);
  });

  it('allows browser mock only in explicit mock mode', async () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_NEXACHAT_BROWSER_MOCK', '1');

    const { getAppApi } = await importFreshApi();

    expect(typeof getAppApi().getSnapshot).toBe('function');
  });

  it('keeps browser mock API method coverage aligned with AppApi', async () => {
    const { APP_API_METHODS } = await import('../src/shared/api');
    const { createMockApi } = await import('../src/renderer/mockApi');
    const api = createMockApi() as unknown as Record<string, unknown>;
    const allowedMethods = new Set<string>(APP_API_METHODS);
    const implementedMethods = Object.entries(api)
      .filter(([, value]) => typeof value === 'function')
      .map(([name]) => name);

    expect(APP_API_METHODS.filter((method) => typeof api[method] !== 'function')).toEqual([]);
    expect(implementedMethods.filter((method) => !allowedMethods.has(method))).toEqual([]);
  });
});
