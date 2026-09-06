/**
 * HARIS v2 — RAG Indexer (Faz 13.6)
 *
 * Yeni belge yüklendiğinde otomatik çağırılır:
 *   1) Text'i chunk'lara böl
 *   2) Batch embed et
 *   3) workspace_document_chunks tablosuna yaz
 *
 * Dedup: content_hash ile aynı chunk tekrar embed edilmez.
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { chunkText } from "./chunker";
import { embedTexts } from "./embedder";
import type { IndexingStats } from "./types";

/**
 * Ana index fonksiyonu.
 * Bir belgenin text içeriğini alır → chunk → embed → DB'ye yazar.
 */
export async function indexDocument(params: {
  workspaceId: string;
  documentId: string;
  text: string;
  metadata?: Record<string, unknown>;
}): Promise<IndexingStats> {
  const start = Date.now();
  const { workspaceId, documentId, text, metadata } = params;

  const baseStats: IndexingStats = {
    documentId,
    chunksCreated: 0,
    chunksSkipped: 0,
    tokensEmbedded: 0,
    estimatedCostUsd: 0,
    durationMs: 0,
  };

  if (!text || text.trim().length === 0) {
    return { ...baseStats, error: "Boş metin", durationMs: Date.now() - start };
  }

  // Demo modda index'lemeye gerek yok — orkestraya doğrudan text gider
  if (isDemoMode) {
    return {
      ...baseStats,
      error: "Demo mod (index'leme atlandı)",
      durationMs: Date.now() - start,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ...baseStats,
      error: "Supabase istemcisi oluşturulamadı",
      durationMs: Date.now() - start,
    };
  }

  // 1) Chunk
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return { ...baseStats, error: "Chunk üretilemedi", durationMs: Date.now() - start };
  }

  // 2) Dedup — mevcut chunk hash'leri al (aynı workspace'te)
  const { data: existingHashes } = await supabase
    .from("workspace_document_chunks")
    .select("content_hash")
    .eq("workspace_id", workspaceId)
    .in(
      "content_hash",
      chunks.map((c) => c.contentHash)
    );

  const existingSet = new Set(
    (existingHashes ?? []).map((r: { content_hash: string }) => r.content_hash)
  );
  const toEmbed = chunks.filter((c) => !existingSet.has(c.contentHash));
  const skipped = chunks.length - toEmbed.length;

  if (toEmbed.length === 0) {
    return {
      ...baseStats,
      chunksSkipped: skipped,
      durationMs: Date.now() - start,
    };
  }

  // 3) Batch embed
  let embedResult;
  try {
    embedResult = await embedTexts(toEmbed.map((c) => c.content));
  } catch (err) {
    return {
      ...baseStats,
      error: `Embedding hatası: ${
        err instanceof Error ? err.message : String(err)
      }`,
      chunksSkipped: skipped,
      durationMs: Date.now() - start,
    };
  }

  // 4) DB'ye yaz (batch insert)
  const rows = toEmbed.map((chunk, i) => ({
    workspace_id: workspaceId,
    document_id: documentId,
    chunk_index: chunk.index,
    content: chunk.content,
    content_hash: chunk.contentHash,
    token_count: chunk.tokenCount,
    page_number: chunk.pageNumber ?? null,
    section_title: chunk.sectionTitle ?? null,
    embedding: embedResult.embeddings[i],
    metadata: {
      ...(chunk.metadata ?? {}),
      ...(metadata ?? {}),
    },
  }));

  const { error: insertError } = await supabase
    .from("workspace_document_chunks")
    .insert(rows);

  if (insertError) {
    return {
      ...baseStats,
      chunksSkipped: skipped,
      tokensEmbedded: embedResult.tokensUsed,
      estimatedCostUsd: embedResult.estimatedCostUsd,
      error: `DB insert hatası: ${insertError.message}`,
      durationMs: Date.now() - start,
    };
  }

  return {
    documentId,
    chunksCreated: toEmbed.length,
    chunksSkipped: skipped,
    tokensEmbedded: embedResult.tokensUsed,
    estimatedCostUsd: embedResult.estimatedCostUsd,
    durationMs: Date.now() - start,
  };
}

/**
 * Bir belgenin tüm chunk'larını sil (belge silinince çağırılır)
 * Not: workspace_document_chunks CASCADE → belge silinince otomatik silinir.
 * Bu fonksiyon manuel re-index için (retry, method değişimi vb.)
 */
export async function deleteDocumentChunks(documentId: string): Promise<number> {
  if (isDemoMode) return 0;
  const supabase = await createClient();
  if (!supabase) return 0;

  const { error, count } = await supabase
    .from("workspace_document_chunks")
    .delete({ count: "exact" })
    .eq("document_id", documentId);

  if (error) {
    console.error("[deleteDocumentChunks]", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Basit stats logger (server console için)
 */
export function logIndexingStats(filename: string, stats: IndexingStats): void {
  const chunkInfo = stats.error
    ? `❌ ${stats.error}`
    : `${stats.chunksCreated} chunk (${stats.chunksSkipped} dedup) · ${stats.tokensEmbedded} tok · $${stats.estimatedCostUsd.toFixed(4)}`;
  console.log(
    `[RAG index] ${filename}: ${chunkInfo} · ${stats.durationMs}ms`
  );
}
