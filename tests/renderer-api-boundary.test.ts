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
});

