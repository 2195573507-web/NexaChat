import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_API_METHODS } from '../src/shared/api';
import { IPC_CHANNELS, IPC_CHANNEL_LIST, IPC_EVENT_CHANNELS, IPC_EVENT_CHANNEL_LIST, assertIpcPayload, isIpcEventChannel, type ChatStreamEventPayload, type TaskEventPayload } from '../src/shared/ipc';

const projectRoot = process.cwd();

describe('IPC contract authority', () => {
  it('keeps one unique channel for each preload API method', () => {
    expect(IPC_CHANNEL_LIST).toHaveLength(APP_API_METHODS.length - 1);
    expect(new Set(IPC_CHANNEL_LIST).size).toBe(IPC_CHANNEL_LIST.length);
    expect(new Set(IPC_EVENT_CHANNEL_LIST).size).toBe(IPC_EVENT_CHANNEL_LIST.length);
    expect(IPC_CHANNELS.appGetSnapshot).toBe('app:getSnapshot');
    expect(IPC_CHANNELS.chatSendMessage).toBe('chat:sendMessage');
    expect(IPC_CHANNELS.systemOpenLogs).toBe('system:openLogs');
    expect(IPC_EVENT_CHANNELS.chatStream).toBe('chat:stream:event');
    expect(IPC_EVENT_CHANNELS.taskProgress).toBe('task:progress:event');
    expect(isIpcEventChannel(IPC_EVENT_CHANNELS.chatStream)).toBe(true);
    expect(isIpcEventChannel('ipcRenderer')).toBe(false);
  });

  it('rejects invalid payload arity at the main-process boundary', () => {
    expect(() => assertIpcPayload(IPC_CHANNELS.appGetSnapshot, [])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.appGetSnapshot, ['extra'])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.providerDiscover, [{ address: 'https://api.example.com', apiKey: 'sk-hidden' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.providerSaveFromDiscovery, [{ providerName: 'Detected', providerType: 'openai-compatible', baseUrl: 'https://api.example.com/v1', modelNames: ['chat'] }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.providerDelete, ['provider_1'])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.providerModelsFetch, ['provider_1'])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.modelUpdate, [{ modelId: 'model_1', displayName: 'Updated model', supportsStreaming: true }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.modelDisable, [{ modelId: 'model_1' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.modelEnable, [{ modelId: 'model_1' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.modelDelete, [{ modelId: 'model_1' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.chatSendMessage, [])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.chatListConversations, [])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.chatListConversations, [{ limit: 30, offset: 0 }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.chatListMessages, [{ conversationId: 'conversation_1', limit: 60 }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.chatListMessages, [])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.gatewayLogsList, [{ limit: 24, statusCode: 200 }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.auditLogsList, [{ limit: 30, query: 'chat' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeFilesList, [{ limit: 30, status: 'indexed' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeChunksList, [{ fileId: 'file_1' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.usageTrendGet, [{ bucketMs: 86_400_000, limit: 14 }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.taskCancel, ['task_1'])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.taskCancel, [])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeCreateFile, [{ name: 'note.md', type: 'text/markdown', content: 'hello' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeCreateFile, ['note.md', 'text/markdown', 1024])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgePreviewRetrieval, [{ query: 'hello' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.executionStartRun, [{ kind: 'tool', mode: 'preview', toolId: 'nexachat.status.read' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.executionDecideApproval, [{ approvalId: 'approval_1', decision: 'approved' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.auditSearch, ['gateway'])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.auditVerify, [])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.auditExport, [])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.dataApplyImportPlan, ['import_1', { mode: 'apply-metadata' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.dataRestoreSnapshot, ['snapshot_1', { mode: 'rollback' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.dataExportPackage, [])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.dataCreateEncryptedBackup, [{ passphrase: 'round-12-passphrase' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.dataCreateRestorePreflight, [{ backupId: 'backup_1', passphrase: 'round-12-passphrase' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.dataApplyRollback, [{ rollbackId: 'rollback_1', confirmationPhrase: 'ROLLBACK DATA' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.observabilityQuery, [])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.observabilityQuery, [{ status: 'completed' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.observabilityCreateFeedback, [{ label: 'bug', notes: 'local only' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.observabilityRunEval, [{ evalSetId: 'eval_round13_basic' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.observabilitySavePrivacy, [{ includePromptSnippets: false }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.observabilityExport, [])).not.toThrow();
  });

  it('rejects malformed high-risk IPC payload shapes before service handlers run', () => {
    expect(() => assertIpcPayload(IPC_CHANNELS.providerCreate, [{ name: 'Provider', type: 'unknown', baseUrl: 'https://api.example.com/v1' }]))
      .toThrow(/known provider type/);
    expect(() => assertIpcPayload(IPC_CHANNELS.providerCreate, [{ name: 'Provider', type: 'openai-compatible', baseUrl: 'https://api.example.com/v1', unsafe: true }]))
      .toThrow(/unsupported fields: unsafe/);
    expect(() => assertIpcPayload(IPC_CHANNELS.providerDiscover, [{ address: 'https://api.example.com/v1', timeoutMs: 999_999 }]))
      .toThrow(/timeoutMs/);
    expect(() => assertIpcPayload(IPC_CHANNELS.providerSaveFromDiscovery, [{ providerName: 'Detected', providerType: 'openai-compatible', baseUrl: 'https://api.example.com/v1', modelNames: Array.from({ length: 201 }, (_, index) => `m${index}`) }]))
      .toThrow(/modelNames/);
    expect(() => assertIpcPayload(IPC_CHANNELS.modelUpdate, [{ modelId: 'model_1', displayName: 'Updated model', unsafe: true }]))
      .toThrow(/unsupported fields: unsafe/);
    expect(() => assertIpcPayload(IPC_CHANNELS.modelUpdate, [{ modelId: 'model_1', contextWindow: 0 }]))
      .toThrow(/contextWindow/);
    expect(() => assertIpcPayload(IPC_CHANNELS.modelDisable, [{}]))
      .toThrow(/modelId/);
    expect(() => assertIpcPayload(IPC_CHANNELS.modelEnable, [{ modelId: 42 }]))
      .toThrow(/modelId/);
    expect(() => assertIpcPayload(IPC_CHANNELS.modelDelete, [{ modelId: 'model_1', hardDelete: true }]))
      .toThrow(/unsupported fields: hardDelete/);
    expect(() => assertIpcPayload(IPC_CHANNELS.gatewayCreateKey, [{ name: 'Gateway Key', scopes: ['responses:write'] }]))
      .toThrow(/unsupported scope/);
    expect(() => assertIpcPayload(IPC_CHANNELS.gatewayUpdateKey, [{ gatewayKeyId: 'gkey_1', quotaLimit: -1 }]))
      .toThrow(/quotaLimit/);
    expect(() => assertIpcPayload(IPC_CHANNELS.gatewayRotateKey, [{ gatewayKeyId: 'gkey_1', extra: true }]))
      .toThrow(/unsupported fields: extra/);
    expect(() => assertIpcPayload(IPC_CHANNELS.settingsSaveUiPreferences, [{ theme: 'dark', density: 'compact', fontMode: 'system', language: 'zh-CN', reducedMotion: 'no', advancedMode: false }]))
      .toThrow(/reducedMotion/);
    expect(() => assertIpcPayload(IPC_CHANNELS.executionStartRun, [{ kind: 'shell', mode: 'execute' }]))
      .toThrow(/known execution kind/);
    expect(() => assertIpcPayload(IPC_CHANNELS.executionDecideApproval, [{ approvalId: 'approval_1', decision: 'maybe' }]))
      .toThrow(/approved or denied/);
    expect(() => assertIpcPayload(IPC_CHANNELS.dataCreateEncryptedBackup, [{ profile: 'metadata-redacted' }]))
      .toThrow(/passphrase/);
    expect(() => assertIpcPayload(IPC_CHANNELS.dataApplyRollback, [{ rollbackId: 'rollback_1', confirmationPhrase: 'ROLLBACK DATA', fullRestore: true }]))
      .toThrow(/unsupported fields: fullRestore/);
    expect(() => assertIpcPayload(IPC_CHANNELS.mcpCreateServer, ['MCP', 'ftp', 'http://127.0.0.1:9']))
      .toThrow(/transport/);
    expect(() => assertIpcPayload(IPC_CHANNELS.observabilitySavePrivacy, [{ includePromptSnippets: false, retentionDays: 0 }]))
      .toThrow(/retentionDays/);
  });

  it('keeps chat stream and task progress payloads typed around request identity and progress', () => {
    const chunk: ChatStreamEventPayload = {
      type: 'chat.stream.chunk',
      phase: 'streaming',
      requestId: 'req_1',
      clientRequestId: 'client_1',
      conversationId: 'conversation_1',
      timestamp: Date.now(),
      progress: 0.5,
      chunk: 'partial',
    };
    const completed: TaskEventPayload = {
      type: 'task.completed',
      phase: 'completed',
      taskId: 'task_1',
      taskKind: 'data.backup',
      timestamp: Date.now(),
      progress: 1,
      message: 'done',
    };

    expect(chunk.requestId).toBe('req_1');
    expect(chunk.type).toBe('chat.stream.chunk');
    expect(completed.taskId).toBe('task_1');
    expect(completed.progress).toBe(1);
  });

  it('prevents raw IPC string registration and invocation from returning', () => {
    const mainIpc = readFileSync(join(projectRoot, 'src/main/ipc.ts'), 'utf8');
    const preload = readFileSync(join(projectRoot, 'src/preload/index.ts'), 'utf8');

    expect(mainIpc).not.toMatch(/ipcMain\.handle\(['"]/);
    expect(preload).not.toMatch(/ipcRenderer\.invoke\(['"]/);
    expect(preload).not.toMatch(/exposeInMainWorld\([^)]*ipcRenderer/);
    expect(preload).toContain('ipcRenderer.removeListener(channel, listener)');
    expect(mainIpc).toContain('IPC_CHANNELS.');
    expect(preload).toContain('IPC_CHANNELS.');
  });
});
