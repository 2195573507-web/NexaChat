export const KNOWLEDGE_SUPPORTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.json', '.csv', '.log'] as const;
export const KNOWLEDGE_SUPPORTED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
  'application/csv',
] as const;

export const KNOWLEDGE_UNSUPPORTED_BINARY_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.tif',
  '.tiff',
] as const;

export const KNOWLEDGE_RUNTIME_POLICY = {
  maxImportBytes: 512 * 1024,
  chunkTargetChars: 720,
  chunkOverlapChars: 96,
  embeddingDimension: 12,
  defaultTopK: 4,
  maxTopK: 8,
  embeddingModel: 'nexachat-lexical-embedding',
  indexDirectory: 'sqlite://knowledge_embeddings',
} as const;

export const KNOWLEDGE_RETRIEVAL_STRATEGIES = ['lexical', 'vector'] as const;
export type KnowledgeRetrievalStrategy = (typeof KNOWLEDGE_RETRIEVAL_STRATEGIES)[number];

export const KNOWLEDGE_PARSE_STATUSES = ['queued', 'parsing', 'indexed', 'failed', 'stale'] as const;
export type KnowledgeParseStatus = (typeof KNOWLEDGE_PARSE_STATUSES)[number];

export const KNOWLEDGE_INDEX_STATUSES = ['queued', 'indexing', 'indexed', 'failed', 'stale', 'deleted'] as const;
export type KnowledgeIndexStatus = (typeof KNOWLEDGE_INDEX_STATUSES)[number];

export const KNOWLEDGE_EMBEDDING_STATUSES = ['queued', 'embedded', 'failed', 'stale', 'deleted'] as const;
export type KnowledgeEmbeddingStatus = (typeof KNOWLEDGE_EMBEDDING_STATUSES)[number];

export const KNOWLEDGE_CHUNK_STATUSES = ['indexed', 'stale', 'deleted', 'failed'] as const;
export type KnowledgeChunkStatus = (typeof KNOWLEDGE_CHUNK_STATUSES)[number];

export const KNOWLEDGE_PARSER_TYPES = ['plain-text', 'markdown', 'json', 'csv', 'unsupported'] as const;
export type KnowledgeParserType = (typeof KNOWLEDGE_PARSER_TYPES)[number];

export interface NormalizedKnowledgeImport {
  name: string;
  type: string;
  content: string;
  size: number;
  parserType: KnowledgeParserType;
  contentHash: string;
  supported: boolean;
  errorKey: string | null;
}

export interface KnowledgeTextChunk {
  content: string;
  position: number;
  sourceStart: number;
  sourceEnd: number;
  tokenCount: number;
  contentHash: string;
}

export interface KnowledgeScoredChunkInput {
  id: string;
  fileId: string;
  fileName: string;
  content: string;
  citation: string;
  position: number;
  strategy: KnowledgeRetrievalStrategy;
  vector: number[];
  vectorProviderId?: string | null;
  vectorModelId?: string | null;
}

export interface KnowledgeScoredChunk extends KnowledgeScoredChunkInput {
  score: number;
  vectorScore: number;
  lexicalScore: number;
}

export function normalizeKnowledgeImport(input: {
  name: string;
  type?: string | null;
  content?: string | null;
  size?: number | null;
}): NormalizedKnowledgeImport {
  const name = sanitizeKnowledgeFileName(input.name);
  const type = (input.type ?? inferMimeType(name)).trim() || inferMimeType(name);
  const content = String(input.content ?? '');
  const size = normalizeKnowledgeSize(input.size, content);
  const parserType = resolveKnowledgeParser(name, type);
  const contentHash = stableKnowledgeHash(content);
  if (parserType === 'unsupported') {
    return { name, type, content, size, parserType, contentHash, supported: false, errorKey: 'knowledge.errors.unsupportedParser' };
  }
  if (size > KNOWLEDGE_RUNTIME_POLICY.maxImportBytes) {
    return { name, type, content, size, parserType, contentHash, supported: false, errorKey: 'knowledge.errors.fileTooLarge' };
  }
  if (!content.trim()) {
    return { name, type, content, size, parserType, contentHash, supported: false, errorKey: 'knowledge.errors.emptyContent' };
  }
  return { name, type, content, size, parserType, contentHash, supported: true, errorKey: null };
}

export function sanitizeKnowledgeFileName(value: string): string {
  const withoutPath = value.replace(/[\\/]+/g, '/').split('/').filter(Boolean).pop() ?? '';
  const trimmed = withoutPath.trim().replace(/\s+/g, ' ');
  return trimmed || 'untitled.txt';
}

export function resolveKnowledgeParser(name: string, type: string): KnowledgeParserType {
  const lowerName = name.toLowerCase();
  const lowerType = type.toLowerCase();
  if (lowerType.includes('markdown') || lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) return 'markdown';
  if (lowerType.includes('json') || lowerName.endsWith('.json')) return 'json';
  if (lowerType.includes('csv') || lowerName.endsWith('.csv')) return 'csv';
  if (lowerType.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.log')) return 'plain-text';
  return 'unsupported';
}

export function normalizeKnowledgeSize(inputSize: number | null | undefined, content: string): number {
  if (Number.isFinite(inputSize) && Number(inputSize) > 0) {
    return Math.floor(Number(inputSize));
  }
  return new TextEncoder().encode(content).length;
}

export function chunkKnowledgeText(content: string): KnowledgeTextChunk[] {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const chunks: KnowledgeTextChunk[] = [];
  const target = KNOWLEDGE_RUNTIME_POLICY.chunkTargetChars;
  const overlap = KNOWLEDGE_RUNTIME_POLICY.chunkOverlapChars;
  let start = 0;
  while (start < normalized.length) {
    const hardEnd = Math.min(normalized.length, start + target);
    const window = normalized.slice(start, hardEnd);
    const boundary = findChunkBoundary(window);
    const end = hardEnd === normalized.length ? hardEnd : start + boundary;
    const text = normalized.slice(start, Math.max(end, start + Math.min(window.length, target))).trim();
    if (text) {
      chunks.push({
        content: text,
        position: chunks.length,
        sourceStart: start,
        sourceEnd: Math.min(normalized.length, start + text.length),
        tokenCount: estimateKnowledgeTokens(text),
        contentHash: stableKnowledgeHash(text),
      });
    }
    if (hardEnd === normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export function lexicalEmbedding(value: string): number[] {
  const buckets = new Array<number>(KNOWLEDGE_RUNTIME_POLICY.embeddingDimension).fill(0);
  const tokens = tokenizeKnowledgeText(value);
  const source = tokens.length > 0 ? tokens.join(' ') : value;
  for (let index = 0; index < source.length; index += 1) {
    buckets[index % buckets.length] += source.charCodeAt(index) / 255;
  }
  const magnitude = Math.sqrt(buckets.reduce((sum, item) => sum + item * item, 0)) || 1;
  return buckets.map((item) => Number((item / magnitude).toFixed(6)));
}

export function scoreKnowledgeChunks(
  query: string,
  chunks: KnowledgeScoredChunkInput[],
  topK: number = KNOWLEDGE_RUNTIME_POLICY.defaultTopK,
  queryVector?: number[] | null,
): KnowledgeScoredChunk[] {
  const normalizedTopK = Math.min(Math.max(1, Math.floor(topK)), KNOWLEDGE_RUNTIME_POLICY.maxTopK);
  const activeQueryVector = queryVector && queryVector.length > 0 ? queryVector : lexicalEmbedding(query);
  const queryTokens = new Set(tokenizeKnowledgeText(query));
  return chunks
    .map((chunk) => {
      const chunkTokens = new Set(tokenizeKnowledgeText(chunk.content));
      const overlap = [...queryTokens].filter((token) => chunkTokens.has(token)).length;
      const overlapScore = queryTokens.size > 0 ? overlap / queryTokens.size : 0;
      const vectorScore = cosineSimilarity(activeQueryVector, chunk.vector);
      const score = chunk.strategy === 'vector'
        ? (vectorScore * 0.82 + overlapScore * 0.18)
        : (vectorScore * 0.7 + overlapScore * 0.3);
      return {
        ...chunk,
        score: Number(score.toFixed(6)),
        vectorScore: Number(vectorScore.toFixed(6)),
        lexicalScore: Number(overlapScore.toFixed(6)),
      };
    })
    .filter((chunk) => chunk.score > 0 || query.trim().length > 0)
    .sort((left, right) => right.score - left.score || left.position - right.position)
    .slice(0, normalizedTopK);
}

export function estimateKnowledgeTokens(value: string): number {
  return Math.max(1, Math.ceil(value.trim().length / 4));
}

export function stableKnowledgeHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return `kh_${hash.toString(16).padStart(8, '0')}`;
}

function inferMimeType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.txt') || lower.endsWith('.log')) return 'text/plain';
  if (KNOWLEDGE_UNSUPPORTED_BINARY_EXTENSIONS.some((extension) => lower.endsWith(extension))) return 'application/octet-stream';
  return 'application/octet-stream';
}

function findChunkBoundary(value: string): number {
  const paragraph = value.lastIndexOf('\n\n');
  if (paragraph >= Math.floor(value.length * 0.55)) return paragraph + 2;
  const sentence = Math.max(value.lastIndexOf('. '), value.lastIndexOf('。'), value.lastIndexOf('! '), value.lastIndexOf('? '));
  if (sentence >= Math.floor(value.length * 0.55)) return sentence + 1;
  const whitespace = value.lastIndexOf(' ');
  if (whitespace >= Math.floor(value.length * 0.65)) return whitespace + 1;
  return value.length;
}

function tokenizeKnowledgeText(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  const divisor = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return divisor ? dot / divisor : 0;
}
