import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin, logAdminAction } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  response: z.string().min(10).max(10000),
  newStatus: z.enum(["completed", "rejected", "in_review"]),
});

/**
 * POST /api/admin/kvkk-requests/[id]
 *
 * Admin yanıtı kaydeder + status günceller + audit log atar.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin yetkisi gerekli" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz istek", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (isDemoMode) {
    return NextResponse.json({
      ok: true,
      demoMode: true,
      message: "Demo modunda yanıt simüle edildi (gerçek DB write yapılmadı)",
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase yok" }, { status: 500 });
  }

  const { error } = await supabase
    .from("kvkk_requests")
    .update({
      response: parsed.data.response,
      responded_at: new Date().toISOString(),
      responded_by: admin.userId,
      status: parsed.data.newStatus,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    action: "kvkk_request.responded",
    targetResourceType: "kvkk_request",
    targetResourceId: id,
    metadata: {
      new_status: parsed.data.newStatus,
      response_length: parsed.data.response.length,
    },
  });

  // TODO production: başvurana e-posta gönder (response_text içerikli)

  return NextResponse.json({ ok: true });
}
