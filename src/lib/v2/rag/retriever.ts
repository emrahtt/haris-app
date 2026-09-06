/**
 * HARIS v2 — RAG Retriever (Faz 13.6)
 *
 * Dual search:
 *   1) Matter-scoped chunks (o davanın belgeleri)
 *   2) Global law (mevzuat + Yargıtay içtihat)
 *
 * Sonuçları score'a göre sıralar ve LLM prompt'una hazır formata getirir.
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { embedQuery } from "./embedder";
import type {
  RetrievalRequest,
  RetrievalResult,
  MatterChunkHit,
  GlobalLawHit,
} from "./types";

export async function retrieve(req: RetrievalRequest): Promise<RetrievalResult> {
  const start = Date.now();
  const {
    workspaceId,
    query,
    matterK = 8,
    globalK = 5,
    minSimilarity = 0.5,
    includeGlobal = true,
    filterCategories,
    filterAreas,
  } = req;

  const emptyResult: RetrievalResult = {
    matter: [],
    global: [],
    query,
    totalHits: 0,
    durationMs: 0,
  };

  if (!query || query.trim().length === 0) {
    return { ...emptyResult, durationMs: Date.now() - start };
  }

  if (isDemoMode) {
    // Demo modda RAG yok — orkestra doğrudan tüm text'e bakar
    return { ...emptyResult, durationMs: Date.now() - start };
  }

  const supabase = await createClient();
  if (!supabase) return { ...emptyResult, durationMs: Date.now() - start };

  // 1) Query'yi embed et (bir kez, iki arama için ortak)
  let embedding: number[];
  try {
    embedding = await embedQuery(query);
  } catch (err) {
    console.error("[retrieve] embed hatası:", err);
    return { ...emptyResult, durationMs: Date.now() - start };
  }

  // 2) Paralel: matter + global arama
  const [matterRes, globalRes] = await Promise.allSettled([
    supabase.rpc("search_workspace_chunks", {
      p_workspace_id: workspaceId,
      query_embedding: embedding,
      match_count: matterK,
      min_similarity: minSimilarity,
    }),
    includeGlobal
      ? supabase.rpc("search_global_law", {
          query_embedding: embedding,
          match_count: globalK,
          filter_categories: filterCategories ?? null,
          filter_areas: filterAreas ?? null,
        })
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  const matter: MatterChunkHit[] = [];
  const global: GlobalLawHit[] = [];

  if (matterRes.status === "fulfilled" && !matterRes.value.error && matterRes.value.data) {
    for (const row of matterRes.value.data as MatterRowRaw[]) {
      matter.push({
        id: row.id,
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        pageNumber: row.page_number ?? undefined,
        sectionTitle: row.section_title ?? undefined,
        similarity: row.similarity,
        metadata: row.metadata ?? undefined,
        source: "matter",
      });
    }
  } else if (matterRes.status === "fulfilled" && matterRes.value.error) {
    console.error("[retrieve] matter hatası:", matterRes.value.error);
  }

  if (
    includeGlobal &&
    globalRes.status === "fulfilled" &&
    !("error" in globalRes.value && globalRes.value.error) &&
    globalRes.value.data
  ) {
    for (const row of globalRes.value.data as GlobalRowRaw[]) {
      global.push({
        id: row.id,
        category: row.category,
        title: row.title,
        content: row.content,
        court: row.court ?? undefined,
        caseNo: row.case_no ?? undefined,
        date: row.date ?? undefined,
        articleNo: row.article_no ?? undefined,
        lawName: row.law_name ?? undefined,
        url: row.url ?? undefined,
        similarity: row.similarity,
        source: "global",
      });
    }
  }

  return {
    matter,
    global,
    query,
    totalHits: matter.length + global.length,
    durationMs: Date.now() - start,
  };
}

/**
 * Retrieval sonucunu LLM prompt'una uygun Türkçe blok haline getirir.
 * Orchestrator ajanlar bunu system prompt'a inject eder.
 */
export function formatRetrievalForPrompt(result: RetrievalResult): string {
  if (result.totalHits === 0) {
    return "";
  }

  const parts: string[] = [];

  if (result.matter.length > 0) {
    parts.push("═══ DAVA DOSYASI (İlgili Bölümler) ═══");
    for (const hit of result.matter) {
      const header = [
        hit.sectionTitle ? `📄 ${hit.sectionTitle}` : `📄 Chunk #${hit.chunkIndex}`,
        hit.pageNumber ? `s.${hit.pageNumber}` : null,
        `benzerlik: ${(hit.similarity * 100).toFixed(0)}%`,
      ]
        .filter(Boolean)
        .join(" · ");
      parts.push(`[${header}]\n${hit.content}\n`);
    }
  }

  if (result.global.length > 0) {
    parts.push("\n═══ MEVZUAT & İÇTİHAT (Referans) ═══");
    for (const hit of result.global) {
      const header = [
        hit.category.toUpperCase(),
        hit.lawName ?? hit.court,
        hit.articleNo ? `m.${hit.articleNo}` : hit.caseNo,
        hit.date,
      ]
        .filter(Boolean)
        .join(" · ");
      parts.push(`[${header}]\n${hit.title}\n${hit.content.slice(0, 800)}${
        hit.content.length > 800 ? "..." : ""
      }\n`);
    }
  }

  return parts.join("\n");
}

// ─────────────────────────────────────────────────────────
// TYPES for raw Supabase rows
// ─────────────────────────────────────────────────────────
interface MatterRowRaw {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  section_title: string | null;
  similarity: number;
  metadata: Record<string, unknown> | null;
}

interface GlobalRowRaw {
  id: string;
  category: string;
  title: string;
  content: string;
  court: string | null;
  case_no: string | null;
  date: string | null;
  article_no: string | null;
  law_name: string | null;
  url: string | null;
  similarity: number;
}
