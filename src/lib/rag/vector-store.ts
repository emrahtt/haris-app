/**
 * HARIS Vector Store — Pluggable Backend
 *
 * Aynı interface, iki implementasyon:
 * 1. InMemoryStore (Faz 4) — 100-1000 belge ölçeği, anlık
 * 2. PgVectorStore (Faz 6) — 100K+ belge, HNSW index, milisaniye arama
 *
 * Otomatik seçim:
 * - Supabase yapılandırılmış + tablo varsa → PgVector
 * - Yoksa → In-memory
 */

import type { CorpusDoc, DocCategory, LegalArea } from "./corpus";
import { CORPUS } from "./corpus";
import { embedBatch, cosineSimilarity } from "./embeddings";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

export interface VectorSearchOptions {
  topK?: number;
  categories?: DocCategory[];
  areas?: LegalArea[];
  minScore?: number;
  lexicalWeight?: number;
}

export interface VectorSearchResult {
  doc: CorpusDoc;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  matchedTerms: string[];
}

export interface VectorStore {
  /** Backend adı (debug için) */
  readonly backend: "memory" | "pgvector";
  /** Belge sayısı */
  size(): Promise<number>;
  /** Arama */
  search(query: string, opts?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  /** İlk indeksleme (idempotent) */
  ensureReady(): Promise<void>;
  /** Test/reset */
  reset?(): void;
}

/* ============================================================
   1) IN-MEMORY STORE (Faz 4'ün çekirdek mantığı)
   ============================================================ */

interface IndexedDoc {
  doc: CorpusDoc;
  embedding: number[];
  tokens: string[];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g");
}

function tokenizeWords(text: string): string[] {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function buildEmbedText(d: CorpusDoc): string {
  return [
    d.title,
    d.lawName || "",
    d.articleNo || "",
    d.court || "",
    d.tags.join(" "),
    d.content,
  ].filter(Boolean).join(". ");
}

function lexicalScore(
  queryTokens: string[],
  docTokens: string[]
): { score: number; matched: string[] } {
  const docSet = new Set(docTokens);
  const matched: string[] = [];
  let hits = 0;
  for (const qt of queryTokens) {
    if (docSet.has(qt)) {
      hits++;
      matched.push(qt);
      continue;
    }
    for (const dt of docTokens) {
      if (dt.includes(qt) || qt.includes(dt)) {
        hits += 0.5;
        matched.push(qt);
        break;
      }
    }
  }
  return {
    score: queryTokens.length === 0 ? 0 : Math.min(1, hits / queryTokens.length),
    matched: [...new Set(matched)],
  };
}

class InMemoryStore implements VectorStore {
  readonly backend = "memory" as const;
  private index: IndexedDoc[] | null = null;
  private buildPromise: Promise<IndexedDoc[]> | null = null;

  async ensureReady(): Promise<void> {
    await this.getIndex();
  }

  async size(): Promise<number> {
    const idx = await this.getIndex();
    return idx.length;
  }

  reset() {
    this.index = null;
    this.buildPromise = null;
  }

  private async getIndex(): Promise<IndexedDoc[]> {
    if (this.index) return this.index;
    if (this.buildPromise) return this.buildPromise;

    this.buildPromise = (async () => {
      const texts = CORPUS.map(buildEmbedText);
      const embeddings = await embedBatch(texts);
      const indexed: IndexedDoc[] = CORPUS.map((doc, i) => ({
        doc,
        embedding: embeddings[i],
        tokens: tokenizeWords(
          `${doc.title} ${doc.content} ${doc.tags.join(" ")}`
        ),
      }));
      this.index = indexed;
      return indexed;
    })();
    return this.buildPromise;
  }

  async search(
    query: string,
    opts: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const {
      topK = 10,
      categories,
      areas,
      minScore = 0,
      lexicalWeight = 0.35,
    } = opts;
    if (!query.trim()) return [];

    const index = await this.getIndex();
    const [queryEmbedding] = await embedBatch([query]);
    const queryTokens = tokenizeWords(query);

    let candidates = index;
    if (categories?.length) {
      candidates = candidates.filter((c) =>
        categories.includes(c.doc.category)
      );
    }
    if (areas?.length) {
      candidates = candidates.filter((c) =>
        c.doc.areas.some((a) => areas.includes(a))
      );
    }

    return candidates
      .map((c) => {
        const sem = Math.max(0, cosineSimilarity(queryEmbedding, c.embedding));
        const { score: lex, matched } = lexicalScore(queryTokens, c.tokens);
        const combined = (1 - lexicalWeight) * sem + lexicalWeight * lex;
        return {
          doc: c.doc,
          score: combined,
          semanticScore: sem,
          lexicalScore: lex,
          matchedTerms: matched.slice(0, 6),
        };
      })
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

/* ============================================================
   2) PGVECTOR STORE (Production)
   ============================================================ */

class PgVectorStore implements VectorStore {
  readonly backend = "pgvector" as const;
  private isReady = false;
  private fallback: InMemoryStore;

  constructor() {
    this.fallback = new InMemoryStore();
  }

  async ensureReady(): Promise<void> {
    if (this.isReady) return;
    try {
      const supabase = await createClient();
      if (!supabase) {
        await this.fallback.ensureReady();
        this.isReady = true;
        return;
      }
      // rag_documents tablosu var mı kontrolü
      const { count, error } = await supabase
        .from("rag_documents")
        .select("*", { count: "exact", head: true });

      if (error) {
        // Tablo yok → fallback'e geç
        console.warn("[pgvector] rag_documents tablosu yok, in-memory'ye geçiliyor");
        await this.fallback.ensureReady();
        this.isReady = true;
        return;
      }

      // Tablo boşsa indeksle
      if (!count || count === 0) {
        await this.indexCorpus(supabase);
      }
      this.isReady = true;
    } catch (err) {
      console.warn("[pgvector] hazırlama başarısız, fallback:", err);
      await this.fallback.ensureReady();
      this.isReady = true;
    }
  }

  async size(): Promise<number> {
    try {
      const supabase = await createClient();
      if (!supabase) return this.fallback.size();
      const { count } = await supabase
        .from("rag_documents")
        .select("*", { count: "exact", head: true });
      return count || 0;
    } catch {
      return this.fallback.size();
    }
  }

  async search(
    query: string,
    opts: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const supabase = await createClient();
      if (!supabase) return this.fallback.search(query, opts);

      const [queryEmbedding] = await embedBatch([query]);
      const queryTokens = tokenizeWords(query);

      // pgvector arama RPC fonksiyonu kullanır (SQL migration'da tanımlı)
      const { data, error } = await supabase.rpc("search_rag_documents", {
        query_embedding: queryEmbedding,
        match_count: opts.topK || 10,
        filter_categories: opts.categories || null,
        filter_areas: opts.areas || null,
      });

      if (error || !data) {
        console.warn("[pgvector] arama başarısız, fallback:", error);
        return this.fallback.search(query, opts);
      }

      // Lexical scoring'i client-side ekle
      const lexicalWeight = opts.lexicalWeight ?? 0.35;
      return (data as PgRow[]).map((row) => {
        const docTokens = tokenizeWords(
          `${row.title} ${row.content} ${(row.tags || []).join(" ")}`
        );
        const { score: lex, matched } = lexicalScore(queryTokens, docTokens);
        const sem = 1 - (row.distance || 0); // pgvector cosine distance → similarity
        const combined = (1 - lexicalWeight) * sem + lexicalWeight * lex;

        return {
          doc: pgRowToDoc(row),
          score: combined,
          semanticScore: sem,
          lexicalScore: lex,
          matchedTerms: matched.slice(0, 6),
        };
      });
    } catch (err) {
      console.warn("[pgvector] arama hatası, fallback:", err);
      return this.fallback.search(query, opts);
    }
  }

  /** Korpusu Supabase'e yükle (idempotent) */
  private async indexCorpus(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>): Promise<void> {
    const texts = CORPUS.map((d) => buildEmbedText(d));
    const embeddings = await embedBatch(texts);

    const rows = CORPUS.map((d, i) => ({
      id: d.id,
      category: d.category,
      areas: d.areas,
      court: d.court || null,
      case_no: d.caseNo || null,
      date: d.date || null,
      article_no: d.articleNo || null,
      law_name: d.lawName || null,
      title: d.title,
      content: d.content,
      tags: d.tags,
      url: d.url || null,
      embedding: embeddings[i],
    }));

    // Batch upsert
    const { error } = await supabase
      .from("rag_documents")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("[pgvector] indexleme hatası:", error);
      throw error;
    }
    console.log(`[pgvector] ${rows.length} belge indekslendi`);
  }
}

interface PgRow {
  id: string;
  category: DocCategory;
  areas: LegalArea[];
  court: string | null;
  case_no: string | null;
  date: string | null;
  article_no: string | null;
  law_name: string | null;
  title: string;
  content: string;
  tags: string[];
  url: string | null;
  distance: number;
}

function pgRowToDoc(row: PgRow): CorpusDoc {
  return {
    id: row.id,
    category: row.category,
    areas: row.areas,
    court: row.court || undefined,
    caseNo: row.case_no || undefined,
    date: row.date || undefined,
    articleNo: row.article_no || undefined,
    lawName: row.law_name || undefined,
    title: row.title,
    content: row.content,
    tags: row.tags || [],
    url: row.url || undefined,
  };
}

/* ============================================================
   FACTORY — Otomatik backend seçimi
   ============================================================ */

let cachedStore: VectorStore | null = null;

export async function getVectorStore(): Promise<VectorStore> {
  if (cachedStore) return cachedStore;
  cachedStore = isDemoMode ? new InMemoryStore() : new PgVectorStore();
  await cachedStore.ensureReady();
  return cachedStore;
}

/** Test/cache reset */
export function _resetVectorStore() {
  cachedStore = null;
}
