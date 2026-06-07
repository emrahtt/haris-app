/**
 * Admin Auth Helper
 *
 * Server Components ve API route'larda admin yetkisi kontrolü.
 *
 * Demo modunda DEMO_USER otomatik super_admin sayılır
 * (geliştirme rahatlığı için, production'da hiçbir etkisi yok).
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";
import { headers } from "next/headers";

export type AdminRole =
  | "super_admin"
  | "kvkk_officer"
  | "support"
  | "finance";

export interface AdminUser {
  userId: string;
  email: string;
  fullName: string;
  isAdmin: true;
  adminRole: AdminRole;
}

/**
 * Mevcut kullanıcının admin olup olmadığını kontrol et.
 * Null dönerse admin değil.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  if (isDemoMode) {
    // Demo: DEMO_USER her zaman super_admin (rahatlık için)
    return {
      userId: DEMO_USER.id,
      email: DEMO_USER.email,
      fullName: DEMO_USER.name,
      isAdmin: true,
      adminRole: "super_admin",
    };
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_admin, admin_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return null;

  return {
    userId: user.id,
    email: user.email || "",
    fullName: profile.full_name || "Admin",
    isAdmin: true,
    adminRole: (profile.admin_role as AdminRole) || "super_admin",
  };
}

/**
 * Server Component'lerde guard — admin değilse redirect.
 */
export async function requireAdmin(
  requiredRole?: AdminRole
): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/dashboard?error=admin-required");
  }

  if (requiredRole && admin.adminRole !== "super_admin" && admin.adminRole !== requiredRole) {
    redirect("/admin?error=insufficient-role");
  }

  return admin;
}

/**
 * Admin eylemini logla. Her admin işleminin self-audit'i.
 */
export async function logAdminAction(input: {
  action: string;
  targetUserId?: string;
  targetResourceType?: string;
  targetResourceId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (isDemoMode) return;

  try {
    const admin = await getCurrentAdmin();
    if (!admin) return;

    const supabase = await createClient();
    if (!supabase) return;

    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ipAddress =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        null;
      userAgent = h.get("user-agent");
    } catch {}

    await supabase.from("admin_actions").insert({
      admin_user_id: admin.userId,
      action: input.action,
      target_user_id: input.targetUserId || null,
      target_resource_type: input.targetResourceType,
      target_resource_id: input.targetResourceId,
      reason: input.reason,
      metadata: input.metadata || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    console.warn("[admin/audit]", err);
  }
}
