import { NextRequest, NextResponse } from "next/server";
import { runJobToCompletion } from "@/lib/scraping/job-runner";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/scraping/cron
 *
 * Vercel Cron tarafından tetiklenir (vercel.json'da tanımlı).
 * Günlük rutin scraping işlerini başlatır.
 *
 * Güvenlik: CRON_SECRET header ile doğrulama.
 */
export async function GET(req: NextRequest) {
  // Auth: Vercel Cron token kontrol
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const results: Record<string, unknown>[] = [];

  // Günlük scraping işleri (config'lenebilir)
  const DAILY_JOBS = [
    {
      source: "yargitay" as const,
      query: "trafik kazası tazminat",
      limit: 5,
      triggerType: "cron" as const,
    },
    {
      source: "yargitay" as const,
      query: "iş kıdem ihbar tazminat",
      limit: 5,
      triggerType: "cron" as const,
    },
    {
      source: "yargitay" as const,
      query: "boşanma velayet",
      limit: 5,
      triggerType: "cron" as const,
    },
  ];

  for (const job of DAILY_JOBS) {
    try {
      const result = await runJobToCompletion(job);
      const { decisions: _d, source: _s, ...rest } = result;
      results.push({
        source: job.source,
        query: job.query,
        ...rest,
      });
      void _d; void _s;
    } catch (err) {
      results.push({
        sourceFailed: job.source,
        queryFailed: job.query,
        error: err instanceof Error ? err.message : "x",
      });
    }
  }

  return NextResponse.json({
    startedAt,
    finishedAt: new Date().toISOString(),
    jobs: results,
    totalIndexed: results.reduce(
      (sum, r) => sum + ((r.totalIndexed as number) || 0),
      0
    ),
  });
}
