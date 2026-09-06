/**
 * HARIS Scraping — Job Runner
 *
 * Verilen job'u çalıştırır:
 *   1. Adapter seç
 *   2. Decision'ları stream et
 *   3. scraped_decisions tablosuna yaz
 *   4. Her decision için embedding üret → rag_documents'a upsert
 *   5. Job durumunu güncelle
 *
 * Çalışma modu:
 *   - Demo (Supabase yok): yalnızca in-memory progress, persistence yok
 *   - Production: scraped_decisions + rag_documents tablolarına yazar
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { embedText } from "@/lib/rag/embeddings";
import { getAdapter } from "./registry";
import type {
  ScrapingJob,
  ScrapingJobInput,
  ScrapedDecision,
} from "./types";

export interface JobRunResult {
  jobId: string;
  source: string;
  totalFound: number;
  totalScraped: number;
  totalIndexed: number;
  totalFailed: number;
  durationMs: number;
  status: "done" | "failed";
  errorMessage?: string;
  /** Demo mode için akış sırasında üretilen decision'lar */
  decisions?: ScrapedDecision[];
}

/**
 * Job'u çalıştır. Stream API döner (UI canlı progress alabilir).
 */
export async function* runJob(
  input: ScrapingJobInput,
  jobId?: string
): AsyncGenerator<
  {
    type: "progress" | "decision" | "indexed" | "done" | "error";
    payload: unknown;
  },
  void,
  unknown
> {
  const start = Date.now();
  const adapter = getAdapter(input.source);
  const id = jobId || `local-${Date.now()}`;

  // Job kaydını oluştur (eğer DB varsa)
  let supabase = null;
  if (!isDemoMode) {
    supabase = await createClient();
    if (supabase && !jobId) {
      const { data } = await supabase
        .from("scraping_jobs")
        .insert({
          source: input.source,
          query: input.query,
          filter_court: input.filterCourt,
          filter_date_from: input.filterDateFrom,
          filter_date_to: input.filterDateTo,
          status: "running",
          started_at: new Date().toISOString(),
          trigger_type: input.triggerType || "manual",
          triggered_by: input.triggeredBy,
        })
        .select()
        .single();
      if (data) {
        (input as { _jobId?: string })._jobId = data.id;
      }
    }
  }

  let totalScraped = 0;
  let totalIndexed = 0;
  let totalFailed = 0;
  let totalFound = 0;

  try {
    // Adapter'dan decision'ları stream et
    for await (const decision of adapter.scrape(input, (p) => {
      totalFound = p.found;
      // progress event'i caller akıştan beklenirken yield edemiyoruz,
      // bu yüzden generator dışında log'lanıyor (UI ayrı yield event'leri alır)
    })) {
      decision.jobId = id;
      yield { type: "decision", payload: decision };
      totalScraped++;

      yield {
        type: "progress",
        payload: { found: totalFound, scraped: totalScraped, indexed: totalIndexed },
      };

      // Persistence + embedding (sadece DB modunda)
      if (supabase) {
        try {
          // 1) scraped_decisions'a yaz
          const { data: scraped } = await supabase
            .from("scraped_decisions")
            .upsert(
              {
                job_id: id,
                source: decision.source,
                source_id: decision.sourceId,
                source_url: decision.sourceUrl,
                court: decision.court,
                esas_no: decision.esasNo,
                karar_no: decision.kararNo,
                karar_date: decision.kararDate,
                title: decision.title,
                content: decision.content,
                metadata: decision.metadata || {},
              },
              { onConflict: "source,source_id" }
            )
            .select()
            .single();

          // 2) Embedding üret + rag_documents'a upsert
          const ragId = `${decision.source}-${
            decision.sourceId ||
            (decision.esasNo + "-" + decision.kararNo).replace(/[^a-z0-9-]/gi, "_")
          }`;
          const embedText_input = [
            decision.title,
            decision.court,
            decision.tags.join(" "),
            decision.content,
          ]
            .filter(Boolean)
            .join(". ");
          const embedding = await embedText(embedText_input);

          await supabase.from("rag_documents").upsert(
            {
              id: ragId,
              category: decision.category,
              areas: decision.areas,
              court: decision.court,
              case_no: `${decision.esasNo || ""} ${decision.kararNo || ""}`.trim(),
              date: decision.kararDate,
              title: decision.title,
              content: decision.content,
              tags: decision.tags,
              url: decision.sourceUrl,
              embedding,
            },
            { onConflict: "id" }
          );

          // 3) scraped_decisions'ı işaretle
          if (scraped) {
            await supabase
              .from("scraped_decisions")
              .update({ is_indexed: true, rag_document_id: ragId })
              .eq("id", scraped.id);
          }

          totalIndexed++;
          yield { type: "indexed", payload: { ragId, totalIndexed } };
        } catch (err) {
          totalFailed++;
          console.warn("[runJob] decision persistence başarısız:", err);
        }
      } else {
        // Demo mode: indexed sayar ama yazmaz
        totalIndexed++;
      }
    }

    // Job'u tamamla
    if (supabase) {
      await supabase
        .from("scraping_jobs")
        .update({
          status: "done",
          finished_at: new Date().toISOString(),
          total_found: totalFound,
          total_scraped: totalScraped,
          total_indexed: totalIndexed,
          total_failed: totalFailed,
        })
        .eq("id", id);
    }

    yield {
      type: "done",
      payload: {
        jobId: id,
        source: input.source,
        totalFound,
        totalScraped,
        totalIndexed,
        totalFailed,
        durationMs: Date.now() - start,
      } as JobRunResult,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    if (supabase) {
      await supabase
        .from("scraping_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: errorMessage,
          total_scraped: totalScraped,
          total_indexed: totalIndexed,
          total_failed: totalFailed,
        })
        .eq("id", id);
    }
    yield {
      type: "error",
      payload: { errorMessage, totalScraped, totalIndexed },
    };
  }
}

/**
 * Job'u tamamen tüket ve sonucu döner (non-streaming caller'lar için).
 */
export async function runJobToCompletion(
  input: ScrapingJobInput
): Promise<JobRunResult> {
  const decisions: ScrapedDecision[] = [];
  let lastResult: JobRunResult | null = null;
  let lastError: string | undefined;

  for await (const event of runJob(input)) {
    if (event.type === "decision") {
      decisions.push(event.payload as ScrapedDecision);
    } else if (event.type === "done") {
      lastResult = event.payload as JobRunResult;
    } else if (event.type === "error") {
      lastError = (event.payload as { errorMessage: string }).errorMessage;
    }
  }

  if (lastResult) {
    lastResult.decisions = decisions;
    return lastResult;
  }

  return {
    jobId: "local",
    source: input.source,
    totalFound: 0,
    totalScraped: decisions.length,
    totalIndexed: 0,
    totalFailed: 0,
    durationMs: 0,
    status: "failed",
    errorMessage: lastError || "Job tamamlanamadı",
    decisions,
  };
}

/**
 * Recent jobs'u listele
 */
export async function listRecentJobs(limit = 20): Promise<ScrapingJob[]> {
  if (isDemoMode) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("scraping_jobs")
    .select("*")
    .order("scheduled_at", { ascending: false })
    .limit(limit);
  return (data || []).map(dbRowToJob);
}

function dbRowToJob(row: Record<string, unknown>): ScrapingJob {
  return {
    id: row.id as string,
    source: row.source as ScrapingJob["source"],
    query: row.query as string | undefined,
    filterCourt: row.filter_court as string | undefined,
    filterDateFrom: row.filter_date_from as string | undefined,
    filterDateTo: row.filter_date_to as string | undefined,
    status: row.status as ScrapingJob["status"],
    scheduledAt: row.scheduled_at as string,
    startedAt: (row.started_at as string) || null,
    finishedAt: (row.finished_at as string) || null,
    totalFound: (row.total_found as number) || 0,
    totalScraped: (row.total_scraped as number) || 0,
    totalIndexed: (row.total_indexed as number) || 0,
    totalFailed: (row.total_failed as number) || 0,
    errorMessage: (row.error_message as string) || null,
    createdAt: row.created_at as string,
    triggerType: row.trigger_type as ScrapingJob["triggerType"],
    triggeredBy: (row.triggered_by as string) || undefined,
  };
}
