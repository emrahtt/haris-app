/**
 * Admin Data Queries
 *
 * Sunucu tarafı sorgular — RLS zaten admin yetkisini zorluyor,
 * ek olarak app katmanında da `getCurrentAdmin()` kontrol ediliyor.
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

export interface SystemMetrics {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  payingUsers: number;
  totalCases: number;
  newCases7d: number;
  totalDocuments: number;
  totalStorageBytes: number;
  totalPetitions: number;
  totalRagDocuments: number;
  kvkkPending: number;
  kvkkDeadlineSoon: number;
  deletionsPending: number;
  deletionsOverdue: number;
  aiCallsThisMonth: number;
  scrapingThisMonth: number;
}

const DEMO_METRICS: SystemMetrics = {
  totalUsers: 247,
  newUsers7d: 18,
  newUsers30d: 64,
  payingUsers: 89,
  totalCases: 1843,
  newCases7d: 127,
  totalDocuments: 14_280,
  totalStorageBytes: 47_300_000_000,
  totalPetitions: 956,
  totalRagDocuments: 31,
  kvkkPending: 3,
  kvkkDeadlineSoon: 1,
  deletionsPending: 2,
  deletionsOverdue: 0,
  aiCallsThisMonth: 8_472,
  scrapingThisMonth: 142,
};

export async function getSystemMetrics(): Promise<SystemMetrics> {
  if (isDemoMode) return DEMO_METRICS;

  const supabase = await createClient();
  if (!supabase) return DEMO_METRICS;

  const { data, error } = await supabase.rpc("get_admin_metrics");
  if (error || !data) {
    console.warn("[getSystemMetrics]", error);
    return DEMO_METRICS;
  }

  return snakeToCamel(data as Record<string, unknown>) as unknown as SystemMetrics;
}

export interface KvkkRequestRow {
  id: string;
  requestType: string;
  applicantName: string;
  applicantEmail: string;
  subject: string;
  description: string;
  status: string;
  response: string | null;
  respondedAt: string | null;
  deadlineAt: string;
  createdAt: string;
  userId: string | null;
  ipAddress: string | null;
}

const DEMO_KVKK: KvkkRequestRow[] = [
  {
    id: "demo-req-001",
    requestType: "access",
    applicantName: "Ali Veli",
    applicantEmail: "ali@example.com",
    subject: "Verilerimin işlenme amacı",
    description:
      "KVKK m.11/b kapsamında kişisel verilerimin işlenme amacı hakkında bilgi talep ediyorum.",
    status: "received",
    response: null,
    respondedAt: null,
    deadlineAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 25 * 86400_000).toISOString(),
    userId: null,
    ipAddress: "85.123.45.67",
  },
  {
    id: "demo-req-002",
    requestType: "deletion",
    applicantName: "Ayşe Demir",
    applicantEmail: "ayse@example.com",
    subject: "Hesabımın silinmesi",
    description: "Artık hizmeti kullanmadığım için hesabımın ve tüm verilerimin silinmesini talep ediyorum.",
    status: "in_review",
    response: null,
    respondedAt: null,
    deadlineAt: new Date(Date.now() + 18 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 86400_000).toISOString(),
    userId: "demo-user-001",
    ipAddress: "78.190.12.34",
  },
  {
    id: "demo-req-003",
    requestType: "correction",
    applicantName: "Mehmet Yıldız",
    applicantEmail: "mehmet@example.com",
    subject: "Telefon numarası düzeltme",
    description: "Profilimdeki telefon numarası hatalı, güncellenmesini rica ediyorum.",
    status: "received",
    response: null,
    respondedAt: null,
    deadlineAt: new Date(Date.now() + 27 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    userId: "demo-user-002",
    ipAddress: "212.156.78.90",
  },
];

export async function listKvkkRequests(opts?: {
  status?: string;
  limit?: number;
}): Promise<KvkkRequestRow[]> {
  if (isDemoMode) {
    let rows = [...DEMO_KVKK];
    if (opts?.status) rows = rows.filter((r) => r.status === opts.status);
    return rows.slice(0, opts?.limit ?? 50);
  }

  const supabase = await createClient();
  if (!supabase) return [];

  let q = supabase
    .from("kvkk_requests")
    .select("*")
    .order("deadline_at", { ascending: true })
    .limit(opts?.limit ?? 50);

  if (opts?.status) q = q.eq("status", opts.status);

  const { data } = await q;
  return (data || []).map((r) => snakeToCamel(r as Record<string, unknown>) as unknown as KvkkRequestRow);
}

export async function getKvkkRequest(id: string): Promise<KvkkRequestRow | null> {
  if (isDemoMode) {
    return DEMO_KVKK.find((r) => r.id === id) || null;
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("kvkk_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ? (snakeToCamel(data as Record<string, unknown>) as unknown as KvkkRequestRow) : null;
}

export interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export async function listAuditLogs(opts?: {
  userId?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLogRow[]> {
  if (isDemoMode) {
    return [
      {
        id: "demo-a-1",
        userId: "demo-user-001",
        action: "petition.generated",
        resourceType: "petition",
        resourceId: "p-123",
        metadata: { template: "cevaba-cevap", words: 1240 },
        ipAddress: "85.123.45.67",
        userAgent: "Mozilla/5.0 ...",
        createdAt: new Date(Date.now() - 60_000).toISOString(),
      },
      {
        id: "demo-a-2",
        userId: "demo-user-002",
        action: "consent.granted",
        resourceType: "consent",
        resourceId: null,
        metadata: { consent_type: "kvkk_aydinlatma", version: "v1.0.0-2026-06-06" },
        ipAddress: "78.190.12.34",
        userAgent: "Chrome/120 ...",
        createdAt: new Date(Date.now() - 600_000).toISOString(),
      },
      {
        id: "demo-a-3",
        userId: "demo-user-001",
        action: "document.uploaded",
        resourceType: "document",
        resourceId: "doc-456",
        metadata: { mime: "application/pdf", size: 2480000 },
        ipAddress: "85.123.45.67",
        userAgent: "Mozilla/5.0 ...",
        createdAt: new Date(Date.now() - 3_600_000).toISOString(),
      },
    ];
  }

  const supabase = await createClient();
  if (!supabase) return [];

  let q = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.userId) q = q.eq("user_id", opts.userId);
  if (opts?.action) q = q.eq("action", opts.action);

  const { data } = await q;
  return (data || []).map((r) => snakeToCamel(r as Record<string, unknown>) as unknown as AuditLogRow);
}

export interface DeletionRequestRow {
  id: string;
  userId: string;
  scheduledDeletionAt: string;
  reason: string | null;
  retentionChoice: string;
  status: string;
  createdAt: string;
  /** Joined: kullanıcı bilgisi */
  userEmail?: string;
  userName?: string;
}

export async function listDeletionRequests(opts?: {
  status?: string;
}): Promise<DeletionRequestRow[]> {
  if (isDemoMode) {
    return [
      {
        id: "demo-del-1",
        userId: "demo-user-001",
        scheduledDeletionAt: new Date(Date.now() + 25 * 86400_000).toISOString(),
        reason: "Hizmeti artık kullanmıyorum",
        retentionChoice: "anonymize",
        status: "pending",
        createdAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
        userEmail: "test@example.com",
        userName: "Av. Test Kullanıcı",
      },
      {
        id: "demo-del-2",
        userId: "demo-user-003",
        scheduledDeletionAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
        reason: null,
        retentionChoice: "legal_minimum",
        status: "pending",
        createdAt: new Date(Date.now() - 32 * 86400_000).toISOString(),
        userEmail: "vadesi@example.com",
        userName: "Vadesi Geçen Kullanıcı",
      },
    ];
  }

  const supabase = await createClient();
  if (!supabase) return [];

  let q = supabase
    .from("account_deletion_requests")
    .select("*, profiles!inner(full_name)")
    .order("scheduled_deletion_at", { ascending: true });

  if (opts?.status) q = q.eq("status", opts.status);

  const { data } = await q;
  return (data || []).map((r) => snakeToCamel(r as Record<string, unknown>) as unknown as DeletionRequestRow);
}

export interface UserRow {
  id: string;
  fullName: string;
  firmName: string | null;
  plan: string;
  createdAt: string;
  isAdmin: boolean;
  adminRole: string | null;
}

export async function listUsers(opts?: {
  limit?: number;
  search?: string;
}): Promise<UserRow[]> {
  if (isDemoMode) {
    return [
      {
        id: "demo-user-haris-2026",
        fullName: "Av. Ayşe Yıldız (Demo)",
        firmName: "Yıldız & Ortakları",
        plan: "pro",
        createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
        isAdmin: true,
        adminRole: "super_admin",
      },
      {
        id: "demo-user-001",
        fullName: "Av. Mehmet Demir",
        firmName: "Demir Hukuk",
        plan: "starter",
        createdAt: new Date(Date.now() - 45 * 86400_000).toISOString(),
        isAdmin: false,
        adminRole: null,
      },
      {
        id: "demo-user-002",
        fullName: "Av. Selma Kaya",
        firmName: null,
        plan: "free",
        createdAt: new Date(Date.now() - 12 * 86400_000).toISOString(),
        isAdmin: false,
        adminRole: null,
      },
    ];
  }

  const supabase = await createClient();
  if (!supabase) return [];

  let q = supabase
    .from("profiles")
    .select("id, full_name, firm_name, is_admin, admin_role, created_at, subscriptions(plan_id)")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.search) {
    q = q.ilike("full_name", `%${opts.search}%`);
  }

  const { data } = await q;
  return (data || []).map((r) => {
    type RowWithSubs = {
      id: string;
      full_name: string | null;
      firm_name: string | null;
      is_admin: boolean | null;
      admin_role: string | null;
      created_at: string;
      subscriptions?: { plan_id?: string }[] | { plan_id?: string };
    };
    const row = r as RowWithSubs;
    const subs = Array.isArray(row.subscriptions)
      ? row.subscriptions[0]
      : row.subscriptions;
    return {
      id: row.id,
      fullName: row.full_name || "—",
      firmName: row.firm_name,
      plan: subs?.plan_id || "free",
      createdAt: row.created_at,
      isAdmin: !!row.is_admin,
      adminRole: row.admin_role,
    };
  });
}

/* ============================================================
   HELPERS
   ============================================================ */
function snakeToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const camelKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camelKey] = v;
  }
  return out;
}
