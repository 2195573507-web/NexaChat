import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translate } from '../src/shared/i18n';
import { applyKnowledgeRerank, type KnowledgeScoredChunk } from '../src/shared/knowledgeRuntime';

let dataDir = '';
let upstreamMode: 'ok' | 'embedding-error' = 'ok';

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
  upstreamMode = 'ok';
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
  it('keeps rerank disabled by default and preserves scored chunks on rerank errors', async () => {
    const chunks: KnowledgeScoredChunk[] = [{
      id: 'chunk_1',
      fileId: 'file_1',
      fileName: 'note.md',
      content: 'rerank contract chunk',
      citation: 'note.md#chunk-1',
      position: 0,
      strategy: 'lexical',
      vector: [1, 0],
      score: 0.7,
      vectorScore: 0.6,
      lexicalScore: 1,
    }];

    await expect(applyKnowledgeRerank(chunks)).resolves.toMatchObject({
      status: 'disabled',
      chunks,
      errorCode: null,
    });
    await expect(applyKnowledgeRerank(chunks, {
      enabled: true,
      reranker: async () => {
        throw new Error('upstream rerank unavailable');
      },
    })).resolves.toMatchObject({
      status: 'error',
      chunks,
      errorCode: 'rerank_failed',
      errorMessage: 'upstream rerank unavailable',
    });
  });

  it('rejects unsupported binary and Office/OCR-style imports without creating chunks', async () => {
    const { store } = await import('../src/main/services/store');
    const unsupportedParserMessage = translate('zh-CN', 'knowledge.errors.unsupportedParser');

    const unsupportedInputs = [
      { name: 'source.pdf', type: 'application/pdf', content: '%PDF text placeholder' },
      { name: 'meeting-notes.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', content: 'docx placeholder' },
      { name: 'scan.png', type: 'image/png', content: 'ocr placeholder' },
      { name: 'unknown.pdf', content: 'missing mime must still be rejected' },
    ];

    const unsupportedFileIds: string[] = [];
    for (const input of unsupportedInputs) {
      const file = await store.createKnowledgeFile(input);
      unsupportedFileIds.push(file.id);
      expect(file.parseStatus).toBe('failed');
      expect(file.indexStatus).toBe('failed');
      expect(file.embeddingStatus).toBe('failed');
      expect(file.parserType).toBe('unsupported');
      expect(file.errorMessage).toBe(unsupportedParserMessage);
      expect(store.getKnowledgeChunks(file.id)).toHaveLength(0);
    }

    const retrieval = await store.previewKnowledgeRetrieval({ query: 'ocr placeholder' });
    expect(retrieval.citations.some((citation) => unsupportedFileIds.includes(citation.fileId))).toBe(false);
  });

  it('imports text content through parser chunk embedding index retrieval rebuild and delete', async () => {
    const { store } = await import('../src/main/services/store');
    const file = await store.createKnowledgeFile({
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

    const retrieval = await store.previewKnowledgeRetrieval({ query: 'structured citations for chat context', topK: 2 });
    expect(retrieval.trace.resultCount).toBeGreaterThanOrEqual(1);
    expect(retrieval.citations[0].fileId).toBe(file.id);
    expect(retrieval.citations[0].score).toBeGreaterThan(0);

    const rebuilt = await store.rebuildKnowledgeFile({ fileId: file.id });
    expect(rebuilt.parseStatus).toBe('indexed');
    expect(store.getKnowledgeChunks(file.id).every((chunk) => chunk.status === 'indexed')).toBe(true);

    const deleted = store.deleteKnowledgeFile({ fileId: file.id });
    const embeddingRows = store.getRawDatabaseForTesting()
      .prepare("SELECT status FROM knowledge_embeddings WHERE chunk_id IN (SELECT id FROM knowledge_chunks WHERE file_id = ?)")
      .all(file.id) as Array<{ status: string }>;
    expect(deleted.indexStatus).toBe('deleted');
    expect(embeddingRows.length).toBeGreaterThan(0);
    expect(embeddingRows.every((row) => row.status === 'deleted')).toBe(true);
    expect(store.getKnowledgeFiles().some((candidate) => candidate.id === file.id)).toBe(false);
    expect((await store.previewKnowledgeRetrieval({ query: 'structured citations for chat context' })).citations.some((citation) => citation.fileId === file.id)).toBe(false);
  });

  it('uses configured provider embeddings for vector retrieval while keeping lexical fallback available', async () => {
    const { store } = await import('../src/main/services/store');
    const server = createServer(handleRequest);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address.');
    const baseUrl = `http://127.0.0.1:${address.port}/v1`;
    try {
      const provider = store.createProvider({
        name: 'Round 9 Embedding Provider',
        type: 'openai-compatible',
        baseUrl,
        apiKey: 'sk-round-09-embedding',
      });
      const model = store.createModel({ providerId: provider.id, name: 'round-09-embedding', supportsStreaming: false, supportsEmbeddings: true });
      const file = await store.createKnowledgeFile({
        name: 'vector-note.md',
        type: 'text/markdown',
        content: 'Vector retrieval should rank provider-backed citations above unrelated local fallback text.',
      });

      expect(file.embeddingStatus).toBe('embedded');
      const vector = await store.previewKnowledgeRetrieval({ query: 'provider backed vector citations', strategy: 'vector' });
      const vectorTimings = JSON.parse(vector.trace.timingsJson ?? '{}') as Record<string, number>;
      const vectorScoreSummary = JSON.parse(vector.trace.scoreSummaryJson ?? '{}') as Record<string, unknown>;
      expect(vector.trace.strategy).toBe('vector');
      expect(vector.trace.providerId).toBe(provider.id);
      expect(vector.trace.modelId).toBe(model.id);
      expect(vector.trace.candidateCount).toBeGreaterThanOrEqual(1);
      expect(vector.trace.vectorCandidateCount).toBeGreaterThanOrEqual(1);
      expect(vector.trace.finalCitationCount).toBe(vector.citations.length);
      expect(vector.trace.fallbackReason).toBeNull();
      expect(vectorTimings).toEqual(expect.objectContaining({
        totalMs: expect.any(Number),
        candidateQueryMs: expect.any(Number),
        queryEmbeddingAttemptMs: expect.any(Number),
        queryEmbeddingMs: expect.any(Number),
        scoringMs: expect.any(Number),
        tracePersistMs: expect.any(Number),
        citationBuildMs: expect.any(Number),
        rerankMs: 0,
      }));
      expect(vectorScoreSummary.rerank).toBe('disabled');
      expect(vector.citations[0]?.strategy).toBe('vector');
      expect(store.getUsageRecords().some((record) => record.requestType === 'embeddings' && record.status === 'completed')).toBe(true);

      upstreamMode = 'embedding-error';
      const fallback = await store.previewKnowledgeRetrieval({ query: 'provider backed vector citations', strategy: 'vector' });
      const fallbackTimings = JSON.parse(fallback.trace.timingsJson ?? '{}') as Record<string, number>;
      expect(fallback.trace.strategy).toBe('lexical');
      expect(fallback.trace.errorCode).toBe('provider_upstream_error');
      expect(fallback.trace.errorMessage).not.toContain('sk-round-09-embedding');
      expect(fallback.trace.fallbackReason).toBe('provider_upstream_error');
      expect(fallback.trace.lexicalCandidateCount).toBeGreaterThanOrEqual(1);
      expect(fallbackTimings.queryEmbeddingAttemptMs).toEqual(expect.any(Number));
      expect(fallback.citations.every((citation) => citation.strategy === 'lexical')).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
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
      await store.createKnowledgeFile({
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
      expect(citations[0]).toMatchObject({
        messageId: response.assistantMessage.id,
        requestLogId: response.requestLog.id,
        fileName: 'rag-note.md',
        citation: expect.stringContaining('rag-note.md#chunk-'),
        retrievalId: expect.any(String),
      });
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
  if (request.url === '/v1/embeddings') {
    if (upstreamMode === 'embedding-error') {
      writeJson(response, 500, { error: { message: 'embedding failed with sk-round-09-embedding' } });
      return;
    }
    writeJson(response, 200, {
      object: 'list',
      data: [{ object: 'embedding', index: 0, embedding: [0.9, 0.1, 0.1] }],
      usage: { prompt_tokens: 3, total_tokens: 3 },
    });
    return;
  }
  writeJson(response, 404, { error: { message: 'not found' } });
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
