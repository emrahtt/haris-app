/**
 * Subscription queries + Usage tracking
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";
import { getPlan, type PlanId } from "./plans";
import type {
  Subscription,
  UsageStats,
  BillingPeriod,
  SubscriptionStatus,
  PaymentProvider,
} from "./types";

/* ============================================================
   DEMO STORE (in-memory fallback)
   ============================================================ */
const demoStore = new Map<string, Subscription>();
const demoUsage = new Map<string, UsageStats>();

function getDemoKey(userId: string, month: string) {
  return `${userId}|${month}`;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) + "-01";
}

/* ============================================================
   READ
   ============================================================ */

export async function getCurrentSubscription(
  userId?: string
): Promise<Subscription> {
  const uid = userId || DEMO_USER.id;

  if (isDemoMode) {
    const existing = demoStore.get(uid);
    if (existing) return existing;
    // Default: free plan
    const sub: Subscription = {
      id: `demo-sub-${uid}`,
      userId: uid,
      planId: "pro", // Demo modu Pro gösterelim — özellikleri tanıtmak için
      status: "active",
      provider: "none",
      billingPeriod: "monthly",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400_000).toISOString(),
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoStore.set(uid, sub);
    return sub;
  }

  const supabase = await createClient();
  if (!supabase) return defaultFreeSub(uid);

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  if (!data) {
    // Auto-create free subscription (trigger 0004'te var ama yedek)
    return defaultFreeSub(uid);
  }

  return rowToSubscription(data);
}

export async function getCurrentUsage(userId?: string): Promise<UsageStats> {
  const uid = userId || DEMO_USER.id;
  const month = currentMonth();

  if (isDemoMode) {
    const key = getDemoKey(uid, month);
    const existing = demoUsage.get(key);
    if (existing) return existing;
    const empty: UsageStats = {
      userId: uid,
      periodMonth: month,
      aiCalls: 0,
      scrapingJobs: 0,
      documentsUploaded: 0,
      bytesStored: 0,
      aiLimitWarned: false,
      aiLimitBlocked: false,
    };
    demoUsage.set(key, empty);
    return empty;
  }

  const supabase = await createClient();
  if (!supabase) return emptyUsage(uid, month);

  const { data } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", uid)
    .eq("period_month", month)
    .maybeSingle();

  if (!data) return emptyUsage(uid, month);

  return {
    userId: data.user_id,
    periodMonth: data.period_month,
    aiCalls: data.ai_calls || 0,
    scrapingJobs: data.scraping_jobs || 0,
    documentsUploaded: data.documents_uploaded || 0,
    bytesStored: data.bytes_stored || 0,
    aiLimitWarned: !!data.ai_limit_warned,
    aiLimitBlocked: !!data.ai_limit_blocked,
  };
}

/* ============================================================
   WRITE
   ============================================================ */

export async function upsertSubscription(input: {
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  billingPeriod?: BillingPeriod;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
}): Promise<Subscription> {
  if (isDemoMode) {
    const sub: Subscription = {
      id: `demo-sub-${input.userId}`,
      userId: input.userId,
      planId: input.planId,
      status: input.status,
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId,
      providerCustomerId: input.providerCustomerId,
      billingPeriod: input.billingPeriod || "monthly",
      currentPeriodStart: input.currentPeriodStart || new Date().toISOString(),
      currentPeriodEnd: input.currentPeriodEnd || new Date(Date.now() + 30 * 86400_000).toISOString(),
      trialEndsAt: input.trialEndsAt || null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      createdAt: demoStore.get(input.userId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoStore.set(input.userId, sub);
    return sub;
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase istemcisi yok");

  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: input.userId,
        plan_id: input.planId,
        status: input.status,
        provider: input.provider,
        provider_subscription_id: input.providerSubscriptionId,
        provider_customer_id: input.providerCustomerId,
        billing_period: input.billingPeriod || "monthly",
        current_period_start: input.currentPeriodStart,
        current_period_end: input.currentPeriodEnd,
        trial_ends_at: input.trialEndsAt,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return rowToSubscription(data);
}

/* ============================================================
   USAGE INCREMENT (atomic via RPC)
   ============================================================ */

export async function incrementUsage(
  metric: "ai_calls" | "scraping_jobs" | "documents_uploaded" | "bytes_stored",
  amount = 1,
  userId?: string
): Promise<number> {
  const uid = userId || DEMO_USER.id;

  if (isDemoMode) {
    const month = currentMonth();
    const key = getDemoKey(uid, month);
    const existing = demoUsage.get(key) || emptyUsage(uid, month);
    if (metric === "ai_calls") existing.aiCalls += amount;
    if (metric === "scraping_jobs") existing.scrapingJobs += amount;
    if (metric === "documents_uploaded") existing.documentsUploaded += amount;
    if (metric === "bytes_stored") existing.bytesStored += amount;
    demoUsage.set(key, existing);
    return (
      metric === "ai_calls"
        ? existing.aiCalls
        : metric === "scraping_jobs"
        ? existing.scrapingJobs
        : metric === "documents_uploaded"
        ? existing.documentsUploaded
        : existing.bytesStored
    );
  }

  const supabase = await createClient();
  if (!supabase) return 0;

  const { data, error } = await supabase.rpc("increment_usage", {
    p_user_id: uid,
    p_metric: metric,
    p_amount: amount,
  });

  if (error) {
    console.warn("[incrementUsage]", error);
    return 0;
  }
  return (data?.[0]?.current_value as number) || 0;
}

/* ============================================================
   LIMIT ENFORCEMENT
   ============================================================ */

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  /** Warn'a yakınsa true (>= %80) */
  nearLimit: boolean;
  reason?: string;
}

export async function checkAiCallLimit(
  userId?: string
): Promise<LimitCheckResult> {
  const sub = await getCurrentSubscription(userId);
  const usage = await getCurrentUsage(userId);
  const plan = getPlan(sub.planId);
  const limit = plan.limits.monthlyAiCalls;
  const current = usage.aiCalls;
  const remaining = Math.max(0, limit - current);
  const allowed = current < limit;

  return {
    allowed,
    current,
    limit,
    remaining,
    nearLimit: current >= limit * 0.8,
    reason: allowed
      ? undefined
      : `Aylık AI kotanız doldu (${current}/${limit}). Plan yükseltin veya gelecek aya bekleyin.`,
  };
}

export async function checkScrapingLimit(
  userId?: string
): Promise<LimitCheckResult> {
  const sub = await getCurrentSubscription(userId);
  const usage = await getCurrentUsage(userId);
  const plan = getPlan(sub.planId);
  const limit = plan.limits.monthlyScrapingJobs;
  const current = usage.scrapingJobs;
  const remaining = Math.max(0, limit - current);
  const allowed = current < limit;

  return {
    allowed,
    current,
    limit,
    remaining,
    nearLimit: current >= limit * 0.8,
    reason: allowed ? undefined : `Aylık scraping kotanız doldu (${current}/${limit}).`,
  };
}

/* ============================================================
   HELPERS
   ============================================================ */

function defaultFreeSub(userId: string): Subscription {
  return {
    id: "default-free",
    userId,
    planId: "free",
    status: "active",
    provider: "none",
    billingPeriod: "monthly",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400_000).toISOString(),
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function emptyUsage(uid: string, month: string): UsageStats {
  return {
    userId: uid,
    periodMonth: month,
    aiCalls: 0,
    scrapingJobs: 0,
    documentsUploaded: 0,
    bytesStored: 0,
    aiLimitWarned: false,
    aiLimitBlocked: false,
  };
}

function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    planId: (row.plan_id as PlanId) || "free",
    status: (row.status as SubscriptionStatus) || "active",
    provider: (row.provider as PaymentProvider) || "none",
    providerSubscriptionId: (row.provider_subscription_id as string) || undefined,
    providerCustomerId: (row.provider_customer_id as string) || undefined,
    billingPeriod: (row.billing_period as BillingPeriod) || "monthly",
    currentPeriodStart: (row.current_period_start as string) || null,
    currentPeriodEnd: (row.current_period_end as string) || null,
    trialEndsAt: (row.trial_ends_at as string) || null,
    cancelAtPeriodEnd: !!row.cancel_at_period_end,
    cancelledAt: (row.cancelled_at as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
