import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";
import { logAudit } from "@/lib/kvkk/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/account/export
 *
 * KVKK m.11/d — Veri Taşınabilirliği Hakkı
 * Kullanıcının tüm verilerini JSON formatında indirir.
 */
export async function GET() {
  let userId = DEMO_USER.id;
  let userEmail = DEMO_USER.email;

  if (!isDemoMode) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase yapılandırılmamış" },
        { status: 500 }
      );
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }
    userId = user.id;
    userEmail = user.email || "";
  }

  // Tüm verilerini topla
  const exportData: Record<string, unknown> = {
    export_metadata: {
      user_id: userId,
      email: userEmail,
      exported_at: new Date().toISOString(),
      kvkk_basis: "Madde 11/d — Veri Taşınabilirliği Hakkı",
      format_version: "1.0",
      data_controller: "HARIS Legal AI Yazılım A.Ş.",
    },
  };

  if (isDemoMode) {
    exportData.demo_mode = true;
    exportData.note =
      "Demo modunda gerçek veri yoktur. Production'da tüm dava, belge, dilekçe, " +
      "audit logları ve abonelik bilgileri JSON formatında gelir.";
  } else {
    const supabase = await createClient();
    if (supabase) {
      const [profile, cases, documents, petitions, consents, kvkk, subscription, usage, audits] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("cases").select("*").eq("user_id", userId),
          supabase.from("documents").select("*").eq("user_id", userId),
          supabase.from("petitions").select("*").eq("user_id", userId),
          supabase.from("consent_records").select("*").eq("user_id", userId),
          supabase.from("kvkk_requests").select("*").eq("user_id", userId),
          supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("usage_tracking").select("*").eq("user_id", userId),
          supabase.from("audit_logs").select("*").eq("user_id", userId).limit(1000),
        ]);

      exportData.profile = profile.data;
      exportData.cases = cases.data || [];
      exportData.documents = documents.data || [];
      exportData.petitions = petitions.data || [];
      exportData.consent_records = consents.data || [];
      exportData.kvkk_requests = kvkk.data || [];
      exportData.subscription = subscription.data;
      exportData.usage_tracking = usage.data || [];
      exportData.audit_logs = audits.data || [];
    }
  }

  await logAudit({
    action: "data.export_downloaded",
    userId,
    metadata: { items: Object.keys(exportData).length },
  });

  const json = JSON.stringify(exportData, null, 2);
  const filename = `haris-export-${userId.slice(0, 8)}-${
    new Date().toISOString().slice(0, 10)
  }.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
