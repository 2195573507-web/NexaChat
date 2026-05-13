import type { AppApi } from '../shared/types';
import { createMockApi } from './mockApi';

let cachedApi: AppApi | null = null;

export function getAppApi(): AppApi {
  if (cachedApi) {
    return cachedApi;
  }
  cachedApi = window.nexachat ?? createMockApi();
  return cachedApi;
}
