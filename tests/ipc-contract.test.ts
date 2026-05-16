import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_API_METHODS } from '../src/shared/api';
import { IPC_CHANNELS, IPC_CHANNEL_LIST, assertIpcPayload } from '../src/shared/ipc';

const projectRoot = process.cwd();

describe('IPC contract authority', () => {
  it('keeps one unique channel for each preload API method', () => {
    expect(IPC_CHANNEL_LIST).toHaveLength(APP_API_METHODS.length);
    expect(new Set(IPC_CHANNEL_LIST).size).toBe(IPC_CHANNEL_LIST.length);
    expect(IPC_CHANNELS.appGetSnapshot).toBe('app:getSnapshot');
    expect(IPC_CHANNELS.chatSendMessage).toBe('chat:sendMessage');
    expect(IPC_CHANNELS.systemOpenLogs).toBe('system:openLogs');
  });

  it('rejects invalid payload arity at the main-process boundary', () => {
    expect(() => assertIpcPayload(IPC_CHANNELS.appGetSnapshot, [])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.appGetSnapshot, ['extra'])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.chatSendMessage, [])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeCreateFile, [{ name: 'note.md', type: 'text/markdown', content: 'hello' }])).not.toThrow();
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgeCreateFile, ['note.md', 'text/markdown', 1024])).toThrow(/Invalid IPC payload/);
    expect(() => assertIpcPayload(IPC_CHANNELS.knowledgePreviewRetrieval, [{ query: 'hello' }])).not.toThrow();
  });

  it('prevents raw IPC string registration and invocation from returning', () => {
    const mainIpc = readFileSync(join(projectRoot, 'src/main/ipc.ts'), 'utf8');
    const preload = readFileSync(join(projectRoot, 'src/preload/index.ts'), 'utf8');

    expect(mainIpc).not.toMatch(/ipcMain\.handle\(['"]/);
    expect(preload).not.toMatch(/ipcRenderer\.invoke\(['"]/);
    expect(mainIpc).toContain('IPC_CHANNELS.');
    expect(preload).toContain('IPC_CHANNELS.');
  });
});
