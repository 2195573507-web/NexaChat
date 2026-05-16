export const FORM_DEFAULTS = {
  knowledgeImportName: '',
  knowledgeImportContent: '',
  knowledgeRetrievalQuery: '',
  dataImportManifest: '',
  backupPassphrase: '',
  restorePassphrase: '',
  rollbackPhrase: '',
  gatewayKeyName: '',
} as const;

export const GATEWAY_DOCS = {
  bearerPlaceholder: '<one-time-gateway-key>',
  sampleModelPlaceholder: '<configured-model>',
  sampleUserMessage: 'hello',
} as const;

export const MCP_EXAMPLE_ENDPOINT = '' as const;
