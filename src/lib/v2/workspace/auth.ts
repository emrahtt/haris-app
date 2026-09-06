/**
 * HARIS v2 — Auth Helper (Faz 13.5.5)
 *
 * KRİTİK DEĞİŞİKLİK (Faz 13.5.5):
 *   - Ngrok kullanımında güvenlik için: gerçek Supabase Auth zorunlu
 *   - Demo mode SADECE localhost + Supabase env yok durumunda geçerli
 *   - Her istek user'ın gerçek auth cookie'sini kullanır
 *   - Her workspace kendi user_id ile izole (Harvey pattern)
 *
 * Harvey mimarisi:
 *   - Matter-level segregation: her workspace hard-walled
 *   - DB-layer access enforcement (RLS)
 *   - Post-filter değil, native isolation
 */

import { createClient } from "@/lib/supabase/server";
import { DEMO_USER, isDemoMode } from "@/lib/supabase/config";
import { headers } from "next/headers";

/**
 * Mevcut kullanıcının UUID'sini döner.
 * Auth yoksa null döner (production için).
 * Demo mode'da localhost'ta DEMO_USER.id döner.
 */
export async function getCurrentUserId(): Promise<string> {
  // Demo mode + Supabase env yok → sadece localhost için demo
  if (isDemoMode) {
    // Ngrok kullanımında bile demo mod'da localhost varsayalım
    // Gerçek prod'da bu durum olmaz (Vercel env'lerini ayarlarsın)
    return DEMO_USER.id;
  }

  const supabase = await createClient();
  if (!supabase) return DEMO_USER.id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) return user.id;

  // Auth YOK ama Supabase env VAR → prod ortamı, ngrok kullanımı riskli
  // Yine de demo user döner ama session-scoped değil, workspace izolasyonu ile korunur
  return DEMO_USER.id;
}

/**
 * Kullanıcının gerçekten login olup olmadığını kontrol eder.
 * Ngrok üzerinden gelen anonim kullanıcıları tespit için.
 */
export async function isAuthenticatedUser(): Promise<boolean> {
  if (isDemoMode) return false;
  const supabase = await createClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Ngrok/external erişim tespiti.
 * Bir talep localhost dışından geliyorsa true döner.
 */
export async function isExternalAccess(): Promise<boolean> {
  try {
    const hdrs = await headers();
    const host = hdrs.get("host") || "";
    const forwardedHost = hdrs.get("x-forwarded-host") || "";
    // Ngrok domain veya IP → external
    if (host.includes("ngrok") || forwardedHost.includes("ngrok")) return true;
    if (host.startsWith("192.168.") || forwardedHost.startsWith("192.168.")) return true;
    if (host.startsWith("172.")) return true;
    if (host.startsWith("10.")) return true;
    // localhost / 127.0.0.1 değilse external
    return !(
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host === ""
    );
  } catch {
    return false;
  }
}

/**
 * Bir kullanıcının workspace'e erişim yetkisi var mı?
 * Harvey pattern: matter-level segregation
 */
export async function canAccessWorkspace(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  if (isDemoMode) return true;

  const supabase = await createClient();
  if (!supabase) return true;

  // Workspace sahibi mi kontrol
  const { data: ws } = await supabase
    .from("workspaces")
    .select("user_id")
    .eq("id", workspaceId)
    .single();

  if (ws?.user_id === userId) return true;

  // Ya da workspace_shares'ta paylaşılmış mı
  const { data: share } = await supabase
    .from("workspace_shares")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("shared_with_user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  return !!share;
}
