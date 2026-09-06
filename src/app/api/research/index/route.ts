import { NextResponse } from "next/server";
import { getBackendInfo } from "@/lib/rag/store";
import { getCorpusStats } from "@/lib/rag/corpus";
import { hasOpenAI, isAiDemoMode } from "@/lib/ai/config";

export const runtime = "nodejs";

/**
 * GET /api/research/index
 *
 * Bilgi tabanı durumunu döndürür (backend dahil).
 */
export async function GET() {
  const start = Date.now();
  const info = await getBackendInfo();
  const duration = Date.now() - start;
  const stats = getCorpusStats();

  return NextResponse.json({
    ready: true,
    backend: info.backend, // "memory" | "pgvector"
    docCount: info.size,
    embeddingProvider:
      isAiDemoMode || !hasOpenAI ? "demo-hash-256" : "openai-3-small-1536",
    embeddingDim: hasOpenAI && !isAiDemoMode ? 1536 : 256,
    indexBuildMs: duration,
    stats,
  });
}
