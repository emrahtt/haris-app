/**
 * HARIS v2 — RAG Types (Faz 13.6)
 *
 * Per-workspace vector RAG için ortak tip tanımları.
 */

export interface Chunk {
  index: number;
  content: string;
  contentHash: string;
  tokenCount: number;
  pageNumber?: number;
  sectionTitle?: string;
  metadata?: Record<string, unknown>;
}

export interface MatterChunkHit {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  sectionTitle?: string;
  similarity: number;
  metadata?: Record<string, unknown>;
  source: "matter";
}

export interface GlobalLawHit {
  id: string;
  category: string;
  title: string;
  content: string;
  court?: string;
  caseNo?: string;
  date?: string;
  articleNo?: string;
  lawName?: string;
  url?: string;
  similarity: number;
  source: "global";
}

export type RagHit = MatterChunkHit | GlobalLawHit;

export interface RetrievalRequest {
  workspaceId: string;
  query: string;
  matterK?: number; // matter chunks kaç tane (default 8)
  globalK?: number; // global law kaç tane (default 5)
  minSimilarity?: number; // default 0.5
  includeGlobal?: boolean; // default true
  filterCategories?: string[]; // ['yargitay', 'mevzuat']
  filterAreas?: string[]; // ['aile_hukuku', 'ticaret']
}

export interface RetrievalResult {
  matter: MatterChunkHit[];
  global: GlobalLawHit[];
  query: string;
  totalHits: number;
  durationMs: number;
}

export interface IndexingStats {
  documentId: string;
  chunksCreated: number;
  chunksSkipped: number; // dedup
  tokensEmbedded: number;
  estimatedCostUsd: number;
  durationMs: number;
  error?: string;
}
