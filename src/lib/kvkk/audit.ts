/**
 * KVKK m.12 — Audit Log helper
 *
 * Veri sorumlusu yükümlülüğü gereği kritik eylemleri kayıt altına alır.
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";
import { headers } from "next/headers";

export type AuditAction =
  | "consent.granted"
  | "consent.withdrawn"
  | "account.signin"
  | "account.signout"
  | "account.deletion_requested"
  | "account.deletion_cancelled"
  | "account.deleted"
  | "data.export_requested"
  | "data.export_downloaded"
  | "kvkk.request_submitted"
  | "kvkk.request_responded"
  | "document.uploaded"
  | "document.deleted"
  | "case.created"
  | "case.deleted"
  | "petition.generated"
  | "subscription.changed";

interface AuditInput {
  action: AuditAction;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(input: AuditInput): Promise<void> {
  if (isDemoMode) return; // Demo modda log yok

  try {
    const supabase = await createClient();
    if (!supabase) return;

    // IP + User-Agent (KVKK m.12 kanıtı)
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ipAddress =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        null;
      userAgent = h.get("user-agent");
    } catch {
      // headers() context yoksa (cron, vs.)
    }

    let userId = input.userId;
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id || DEMO_USER.id;
    }

    await supabase.from("audit_logs").insert({
      user_id: userId === DEMO_USER.id ? null : userId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      metadata: input.metadata || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    // Audit logging FAIL-SAFE — uygulamayı kırmasın
    console.warn("[audit] log başarısız:", err);
  }
}
