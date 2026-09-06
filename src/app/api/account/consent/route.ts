import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";
import { logAudit } from "@/lib/kvkk/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ConsentSchema = z.object({
  consentType: z.enum([
    "kvkk_aydinlatma",
    "terms_of_service",
    "privacy_policy",
    "cookie_essential",
    "cookie_analytics",
    "cookie_marketing",
    "marketing_emails",
    "data_processing",
  ]),
  granted: z.boolean(),
  documentVersion: z.string().min(1),
});

/**
 * POST /api/account/consent
 *
 * Kullanıcının onay/red işlemini kayıt altına alır.
 * KVKK m.10 + m.12 yükümlülüğü — IP ve User-Agent dahil.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz istek", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const h = await headers();
    const ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    const userAgent = h.get("user-agent") || null;

    if (isDemoMode) {
      return NextResponse.json({
        ok: true,
        demoMode: true,
        consent: parsed.data,
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

    const { error } = await supabase.from("consent_records").insert({
      user_id: user.id,
      consent_type: parsed.data.consentType,
      granted: parsed.data.granted,
      document_version: parsed.data.documentVersion,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      action: parsed.data.granted ? "consent.granted" : "consent.withdrawn",
      userId: user.id,
      resourceType: "consent",
      metadata: {
        consent_type: parsed.data.consentType,
        version: parsed.data.documentVersion,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Consent kaydedilemedi",
        message: err instanceof Error ? err.message : "x",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/account/consent
 *
 * Kullanıcının mevcut onay durumunu döner.
 */
export async function GET() {
  if (isDemoMode) {
    return NextResponse.json({
      consents: [],
      userId: DEMO_USER.id,
      demoMode: true,
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ consents: [] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  // Her consent_type için en son kayıt
  const { data } = await supabase
    .from("consent_records")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Type başına en son granted durumu
  const latest = new Map<string, Record<string, unknown>>();
  for (const row of data || []) {
    if (!latest.has(row.consent_type)) {
      latest.set(row.consent_type, row);
    }
  }

  return NextResponse.json({
    consents: Array.from(latest.values()),
  });
}
