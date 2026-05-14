import type { AppApi } from '../shared/api';
import { createMockApi } from './mockApi';

let cachedApi: AppApi | null = null;

export function getAppApi(): AppApi {
  if (cachedApi) {
    return cachedApi;
  }
  if (window.nexachat) {
    cachedApi = window.nexachat;
    return cachedApi;
  }
  if (shouldUseBrowserMock()) {
    cachedApi = createMockApi();
    return cachedApi;
  }
  throw new Error('NexaChat preload API is unavailable. Restart the desktop app or run browser smoke with VITE_NEXACHAT_BROWSER_MOCK=1.');
}

function shouldUseBrowserMock(): boolean {
  return import.meta.env.MODE === 'test' || import.meta.env.VITE_NEXACHAT_BROWSER_MOCK === '1';
}
