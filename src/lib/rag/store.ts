/**
 * HARIS RAG Store — Public API
 *
 * Faz 6+ : vector-store.ts'e delege eder (memory veya pgvector backend).
 * Geriye dönük uyumluluk için aynı interface'i korur.
 */

import type { CorpusDoc } from "./corpus";
import {
  getVectorStore,
  type VectorSearchOptions,
  type VectorSearchResult,
} from "./vector-store";

// Re-export tipler
export type SearchOptions = VectorSearchOptions;
export type SearchResult = VectorSearchResult;

/**
 * Korpus indeksini hazırla.
 */
export async function getIndex(): Promise<unknown[]> {
  const store = await getVectorStore();
  return Array(await store.size()).fill(null); // backward compat — sadece sayım için
}

export function resetIndex() {
  // No-op for legacy; vector-store kendi cache'ini yönetir
}

/**
 * Hybrid arama: semantic + lexical, ağırlıklı birleşim.
 */
export async function search(
  query: string,
  opts: SearchOptions = {}
): Promise<SearchResult[]> {
  const store = await getVectorStore();
  return store.search(query, opts);
}

/** Backend bilgisi (debug) */
export async function getBackendInfo() {
  const store = await getVectorStore();
  return {
    backend: store.backend,
    size: await store.size(),
  };
}

/**
 * Ajan promptuna enjekte edilecek RAG context'i üret.
 */
export function formatContextForAgent(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const blocks = results.map((r, i) => {
    const d = r.doc;
    const header =
      d.category === "mevzuat"
        ? `**[${i + 1}] ${d.lawName} ${d.articleNo}** — ${d.title}`
        : d.category === "doktrin"
        ? `**[${i + 1}] Doktrin** — ${d.title}`
        : `**[${i + 1}] ${d.court} ${d.caseNo} (${d.date})** — ${d.title}`;

    return `${header}\n\n${d.content}\n\n*[İlgi skoru: %${(r.score * 100).toFixed(
      0
    )}, kaynak id: \`${d.id}\`]*`;
  });

  return `# RAG: BAĞLAMA İLİŞKİN KAYNAKLAR\n\nAşağıda HARIS bilgi tabanından alınan, dava bağlamına en uygun ${results.length} kaynak bulunmaktadır. Bunları **atıf yaparak** kullanın; ek olarak bildiğiniz emsalleri ekleyebilirsiniz, ancak **uydurma yapmayın**.\n\n${blocks.join(
    "\n\n---\n\n"
  )}`;
}

// Re-export for compatibility
export type { CorpusDoc };
