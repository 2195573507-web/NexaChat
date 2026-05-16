import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let dataDir = '';

vi.mock('electron', () => ({
  app: {
    getPath: () => dataDir,
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value, 'utf8'),
    decryptString: (value: Buffer) => value.toString('utf8'),
  },
}));

beforeEach(() => {
  vi.resetModules();
  dataDir = join(process.cwd(), 'test-results', `round-09-knowledge-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dataDir, { recursive: true });
  process.env.NEXACHAT_DATA_DIR = dataDir;
});

afterEach(async () => {
  const { closeDatabase } = await import('../src/main/database/connection');
  closeDatabase();
  delete process.env.NEXACHAT_DATA_DIR;
  vi.resetModules();
});

describe('Round 9 knowledge runtime', () => {
  it('imports text content through parser chunk embedding index retrieval rebuild and delete', async () => {
    const { store } = await import('../src/main/services/store');
    const file = store.createKnowledgeFile({
      name: 'round-09.md',
      type: 'text/markdown',
      content: [
        '# Round 9',
        'NexaChat persists local knowledge chunks in SQLite.',
        'Retrieval returns structured citations for chat context.',
        'Rebuild clears stale chunks and delete writes tombstones.',
      ].join('\n\n'),
    });

    expect(file.parseStatus).toBe('indexed');
    expect(file.indexStatus).toBe('indexed');
    expect(file.embeddingStatus).toBe('embedded');
    expect(file.chunkCount).toBeGreaterThanOrEqual(1);
    expect(store.getKnowledgeChunks(file.id)).toHaveLength(file.chunkCount);

    const retrieval = store.previewKnowledgeRetrieval({ query: 'structured citations for chat context', topK: 2 });
    expect(retrieval.trace.resultCount).toBeGreaterThanOrEqual(1);
    expect(retrieval.citations[0].fileId).toBe(file.id);
    expect(retrieval.citations[0].score).toBeGreaterThan(0);

    const rebuilt = store.rebuildKnowledgeFile({ fileId: file.id });
    expect(rebuilt.parseStatus).toBe('indexed');
    expect(store.getKnowledgeChunks(file.id).every((chunk) => chunk.status === 'indexed')).toBe(true);

    const deleted = store.deleteKnowledgeFile({ fileId: file.id });
    expect(deleted.indexStatus).toBe('deleted');
    expect(store.getKnowledgeFiles().some((candidate) => candidate.id === file.id)).toBe(false);
    expect(store.previewKnowledgeRetrieval({ query: 'structured citations for chat context' }).citations.some((citation) => citation.fileId === file.id)).toBe(false);
  });

  it('injects retrieved knowledge into chat and persists message citations', async () => {
    const { store } = await import('../src/main/services/store');
    const server = createServer(handleRequest);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address.');
    const baseUrl = `http://127.0.0.1:${address.port}/v1`;
    try {
      const provider = store.createProvider({
        name: 'Round 9 Provider',
        type: 'openai-compatible',
        baseUrl,
        apiKey: 'sk-round-09',
      });
      const model = store.createModel({ providerId: provider.id, name: 'round-09-chat', supportsStreaming: false });
      store.createKnowledgeFile({
        name: 'rag-note.md',
        type: 'text/markdown',
        content: 'RAG citations are persisted as structured message citation records and injected into provider context.',
      });

      const conversation = store.createConversation('Round 9 chat');
      const response = await store.sendMessage({
        conversationId: conversation.id,
        content: 'How are RAG citations persisted?',
        modelId: model.id,
      });

      const citations = store.getKnowledgeCitations(response.assistantMessage.id);
      expect(citations.length).toBeGreaterThanOrEqual(1);
      expect(response.assistantMessage.metadataJson).toContain('retrievalId');
      expect(response.requestLog.requestSummaryJson).toContain('knowledgeCitationCount');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  if (request.url === '/v1/models') {
    writeJson(response, 200, { object: 'list', data: [{ id: 'round-09-chat', object: 'model' }] });
    return;
  }
  if (request.url === '/v1/chat/completions') {
    writeJson(response, 200, {
      id: 'round_09_chatcmpl_test',
      object: 'chat.completion',
      model: 'round-09-chat',
      choices: [{ index: 0, message: { role: 'assistant', content: 'knowledge-aware response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 9, completion_tokens: 4, total_tokens: 13 },
    });
    return;
  }
  writeJson(response, 404, { error: { message: 'not found' } });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
