export interface Diagnosis {
  code: string;
  titleKey: string;
  reasonKey: string;
  suggestionKeys: string[];
}

export const diagnoses: Diagnosis[] = [
  {
    code: '401',
    titleKey: 'diagnosis.401.title',
    reasonKey: 'diagnosis.401.reason',
    suggestionKeys: ['diagnosis.401.suggestion.key', 'diagnosis.401.suggestion.account', 'diagnosis.401.suggestion.retest'],
  },
  {
    code: '403',
    titleKey: 'diagnosis.403.title',
    reasonKey: 'diagnosis.403.reason',
    suggestionKeys: ['diagnosis.403.suggestion.permission', 'diagnosis.403.suggestion.switch', 'diagnosis.403.suggestion.org'],
  },
  {
    code: '404',
    titleKey: 'diagnosis.404.title',
    reasonKey: 'diagnosis.404.reason',
    suggestionKeys: ['diagnosis.404.suggestion.baseUrl', 'diagnosis.404.suggestion.refresh', 'diagnosis.404.suggestion.alias'],
  },
  {
    code: '429',
    titleKey: 'diagnosis.429.title',
    reasonKey: 'diagnosis.429.reason',
    suggestionKeys: ['diagnosis.429.suggestion.retry', 'diagnosis.429.suggestion.switch', 'diagnosis.429.suggestion.concurrency'],
  },
  {
    code: '500',
    titleKey: 'diagnosis.500.title',
    reasonKey: 'diagnosis.500.reason',
    suggestionKeys: ['diagnosis.500.suggestion.retry', 'diagnosis.500.suggestion.status', 'diagnosis.500.suggestion.route'],
  },
  {
    code: 'timeout',
    titleKey: 'diagnosis.timeout.title',
    reasonKey: 'diagnosis.timeout.reason',
    suggestionKeys: ['diagnosis.timeout.suggestion.proxy', 'diagnosis.timeout.suggestion.timeout', 'diagnosis.timeout.suggestion.network'],
  },
  {
    code: 'model_not_found',
    titleKey: 'diagnosis.modelNotFound.title',
    reasonKey: 'diagnosis.modelNotFound.reason',
    suggestionKeys: ['diagnosis.modelNotFound.suggestion.refresh', 'diagnosis.modelNotFound.suggestion.select', 'diagnosis.modelNotFound.suggestion.alias'],
  },
  {
    code: 'stream_interrupted',
    titleKey: 'diagnosis.streamInterrupted.title',
    reasonKey: 'diagnosis.streamInterrupted.reason',
    suggestionKeys: ['diagnosis.streamInterrupted.suggestion.continue', 'diagnosis.streamInterrupted.suggestion.retry', 'diagnosis.streamInterrupted.suggestion.nonStreaming'],
  },
  {
    code: 'sqlite_failure',
    titleKey: 'diagnosis.sqliteFailure.title',
    reasonKey: 'diagnosis.sqliteFailure.reason',
    suggestionKeys: ['diagnosis.sqliteFailure.suggestion.closeProcess', 'diagnosis.sqliteFailure.suggestion.retry', 'diagnosis.sqliteFailure.suggestion.restore', 'diagnosis.sqliteFailure.suggestion.export'],
  },
  {
    code: 'import_failure',
    titleKey: 'diagnosis.importFailure.title',
    reasonKey: 'diagnosis.importFailure.reason',
    suggestionKeys: ['diagnosis.importFailure.suggestion.mapping', 'diagnosis.importFailure.suggestion.skip', 'diagnosis.importFailure.suggestion.template'],
  },
];
