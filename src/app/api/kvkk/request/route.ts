import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { logAudit } from "@/lib/kvkk/audit";
import { KVKK_RESPONSE_DEADLINE_DAYS } from "@/lib/kvkk/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  requestType: z.enum([
    "access",
    "information",
    "transfer_info",
    "correction",
    "deletion",
    "portability",
    "objection",
    "damage_compensation",
  ]),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  tc: z.string().optional(),
  phone: z.string().optional(),
  subject: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
});

/**
 * POST /api/kvkk/request
 *
 * KVKK m.11 başvurusu kabul eder, kayıt altına alır.
 * Anonim de yapılabilir (oturum gerekmez — sadece e-posta).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz form", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // IP + UA
    const h = await headers();
    const ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    const userAgent = h.get("user-agent") || null;

    // Demo modda sadece simüle et
    if (isDemoMode) {
      const deadline = new Date(
        Date.now() + KVKK_RESPONSE_DEADLINE_DAYS * 86400_000
      ).toISOString();
      return NextResponse.json({
        id: `demo-${Date.now()}`,
        deadline,
        demoMode: true,
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase yapılandırılmamış" },
        { status: 500 }
      );
    }

    // Oturum açık ise userId ekle
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("kvkk_requests")
      .insert({
        user_id: user?.id || null,
        request_type: parsed.data.requestType,
        applicant_name: parsed.data.name,
        applicant_email: parsed.data.email,
        applicant_tc: parsed.data.tc || null,
        applicant_phone: parsed.data.phone || null,
        subject: parsed.data.subject,
        description: parsed.data.description,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select("id, deadline_at")
      .single();

    if (error) {
      console.error("[kvkk/request]", error);
      return NextResponse.json(
        { error: "Başvuru kaydedilemedi" },
        { status: 500 }
      );
    }

    await logAudit({
      action: "kvkk.request_submitted",
      userId: user?.id,
      resourceType: "kvkk_request",
      resourceId: data.id,
      metadata: { request_type: parsed.data.requestType },
    });

    // TODO production: KVKK ekibine e-posta bildirimi gönder

    return NextResponse.json({
      id: data.id,
      deadline: data.deadline_at,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Başvuru hatası",
        message: err instanceof Error ? err.message : "x",
      },
      { status: 500 }
    );
  }
}
