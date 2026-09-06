import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/process-deletions
 *
 * Her gün UTC 04:00 — Cool-off süresi dolmuş silme taleplerini işler.
 * KVKK m.7 yükümlülüğü.
 *
 * vercel.json'da schedule: "0 4 * * *"
 */
export async function GET(req: NextRequest) {
  // Vercel Cron auth
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const results: Record<string, unknown>[] = [];

  if (isDemoMode) {
    return NextResponse.json({
      startedAt,
      demoMode: true,
      message: "Demo modunda silme yok — sadece simulasyon",
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase yok" }, { status: 500 });
  }

  // Vadesi dolmuş bekleyen talepleri bul
  const { data: pending } = await supabase
    .from("account_deletion_requests")
    .select("id, user_id")
    .eq("status", "pending")
    .lt("scheduled_deletion_at", new Date().toISOString())
    .limit(50); // Bir cron'da max 50

  if (!pending || pending.length === 0) {
    return NextResponse.json({
      startedAt,
      finishedAt: new Date().toISOString(),
      processed: 0,
      message: "İşlenecek silme talebi yok",
    });
  }

  for (const req of pending) {
    try {
      const { data, error } = await supabase.rpc("execute_account_deletion", {
        p_request_id: req.id,
        p_triggered_by: "cron",
      });

      if (error) {
        results.push({ requestId: req.id, error: error.message });
      } else {
        results.push({
          requestId: req.id,
          ...(data?.[0] || {}),
        });
      }
    } catch (err) {
      results.push({
        requestId: req.id,
        error: err instanceof Error ? err.message : "x",
      });
    }
  }

  return NextResponse.json({
    startedAt,
    finishedAt: new Date().toISOString(),
    processed: results.length,
    results,
  });
}
