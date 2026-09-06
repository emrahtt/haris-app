import { NextResponse } from "next/server";
import { listRecentJobs } from "@/lib/scraping/job-runner";
import { listAdapters } from "@/lib/scraping/registry";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/scraping/jobs
 *
 * Son scraping job'larını + sistem istatistiklerini döner.
 */
export async function GET() {
  const adapters = listAdapters();

  if (isDemoMode) {
    return NextResponse.json({
      jobs: [],
      stats: [],
      adapters,
      mode: "demo",
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ jobs: [], stats: [], adapters, mode: "no-supabase" });
  }

  const jobs = await listRecentJobs(20);

  const { data: stats } = await supabase.from("scraping_stats").select("*");

  return NextResponse.json({
    jobs,
    stats: stats || [],
    adapters,
    mode: "production",
  });
}
