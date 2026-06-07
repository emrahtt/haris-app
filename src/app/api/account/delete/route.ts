import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { logAudit } from "@/lib/kvkk/audit";
import { ACCOUNT_DELETION_COOLOFF_DAYS } from "@/lib/kvkk/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DeleteSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: "Silmeyi onaylamak için confirm: true gönderin" }),
  }),
  reason: z.string().optional(),
  retentionChoice: z
    .enum(["anonymize", "delete_immediately", "legal_minimum"])
    .default("anonymize"),
});

/**
 * POST /api/account/delete
 *
 * KVKK m.7 — Unutulma Hakkı
 *
 * Cool-off (30 gün) süre ile çalışır:
 * - Talep gönder → 30 gün bekle → kullanıcı vazgeçmedi → silinir
 * - Kullanıcı bu süre içinde DELETE iptal edebilir
 *
 * Yasal saklama (VUK fatura kayıtları, dava arşivleri) için 3 seçenek:
 * - anonymize: kişisel veri silinir, agregat istatistik kalır
 * - delete_immediately: tüm veriler hemen siler (yasal asgari hariç)
 * - legal_minimum: sadece yasal asgari saklama (10 yıl fatura, vb.)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz istek", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (isDemoMode) {
      const scheduledAt = new Date(
        Date.now() + ACCOUNT_DELETION_COOLOFF_DAYS * 86400_000
      ).toISOString();
      return NextResponse.json({
        scheduledAt,
        cooloffDays: ACCOUNT_DELETION_COOLOFF_DAYS,
        demoMode: true,
        message:
          "Demo modunda gerçek silme yapılmaz. Production'da 30 gün cool-off sonrası tüm verileriniz silinir.",
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase yok" }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }

    // RPC çağır
    const { data, error } = await supabase.rpc("request_account_deletion", {
      p_reason: parsed.data.reason || null,
      p_retention: parsed.data.retentionChoice,
    });

    if (error) {
      return NextResponse.json(
        { error: "Silme talebi alınamadı", message: error.message },
        { status: 500 }
      );
    }

    await logAudit({
      action: "account.deletion_requested",
      userId: user.id,
      metadata: {
        retention: parsed.data.retentionChoice,
        reason: parsed.data.reason,
      },
    });

    return NextResponse.json({
      scheduledAt: data?.[0]?.scheduled_at,
      cooloffDays: ACCOUNT_DELETION_COOLOFF_DAYS,
      message:
        `Hesap silme talebiniz alındı. ${ACCOUNT_DELETION_COOLOFF_DAYS} gün cool-off ` +
        `süreniz var — bu süre içinde fikrinizi değiştirebilirsiniz.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Silme talebi hatası",
        message: err instanceof Error ? err.message : "x",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/account/delete (cancel)
 *
 * Bekleyen silme talebini iptal eder (cool-off süresi içinde).
 */
export async function DELETE() {
  if (isDemoMode) {
    return NextResponse.json({ cancelled: true, demoMode: true });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase yok" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("cancel_account_deletion");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    action: "account.deletion_cancelled",
    userId: user.id,
  });

  return NextResponse.json({ cancelled: !!data });
}
