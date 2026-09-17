/**
 * HARIS — AI Kota Kapısı + Sahip Muafiyeti (Faz 16.5)
 *
 * NOT: Bu dosya bilerek "quota-gate.ts" adında. Projede zaten bir
 * "src/lib/billing/gate.ts" var (assertUserCanUseAi / consumeAiCall /
 * getBonusCalls / isBillingOwner). Onun üzerine yazmamak için ayrı dosya.
 *
 * SORUN:
 *   `checkAiCallLimit()` tanımlıydı ama HİÇBİR yerde çağrılmıyordu. Yani v2
 *   tarafında kota kontrolü yoktu: ücretsiz kullanıcı sınırsız AI çağrısı
 *   yapabiliyordu (maliyet riski). Öte yandan daha önce görülen 402 hatası
 *   eski bir build'den kalmaydı ve `HARIS_OWNER_USER_IDS` env'ini okuyan tek
 *   bir satır kod bile yoktu — yani sahip muafiyeti hiç çalışmıyordu.
 *
 * ÇÖZÜM:
 *   - Tek merkezî kapı: checkAiGate(userId)
 *   - HARIS_OWNER_USER_IDS içindeki Supabase Auth UUID'leri HER ZAMAN serbest
 *   - Diğerleri plana göre sınırlandırılır (free = 30 AI çağrısı/ay)
 *   - Kota dolunca 402 + Türkçe, çözüm öneren mesaj
 *   - Kullanım sayacı isteği yavaşlatmasın diye "fire and forget" artar
 *
 * ENV:
 *   HARIS_OWNER_USER_IDS="uuid1, uuid2"     (virgül veya boşlukla ayrılmış)
 *   HARIS_QUOTA_ENFORCEMENT="on" | "off"    (varsayılan: on)
 */

import {
  checkAiCallLimit,
  getCurrentSubscription,
  incrementUsage,
} from "@/lib/billing/subscriptions-db";
import { getPlan } from "@/lib/billing/plans";

export interface AiGateResult {
  allowed: boolean;
  /** HARIS_OWNER_USER_IDS içinde mi */
  isOwner: boolean;
  /** Kota takibi kapalı mı (HARIS_QUOTA_ENFORCEMENT=off) */
  enforcementOff: boolean;
  planId: string;
  planName: string;
  limit: number;
  used: number;
  remaining: number;
  /** Engel sebebi — kullanıcıya gösterilecek Türkçe mesaj */
  reason?: string;
  /** Engel durumunda dönülecek HTTP durumu */
  status: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** HARIS_OWNER_USER_IDS içindeki geçerli UUID'ler */
export function getOwnerUserIds(): string[] {
  const raw = process.env.HARIS_OWNER_USER_IDS ?? "";
  return raw
    .split(/[,\s;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Kullanıcı "sahip" mi?
 * Not: Vercel proje ID'si (ör. FSqtYoqk93esuIhtelLl98Pc) UUID DEĞİLDİR,
 * burada işe yaramaz. Supabase Auth → Users ekranındaki User UUID gerekli.
 */
export function isBillingOwner(userId?: string | null): boolean {
  if (!userId) return false;
  const owners = getOwnerUserIds();
  if (owners.length === 0) return false;
  return owners.includes(userId.trim().toLowerCase());
}

/** Geçersiz (UUID olmayan) sahip kayıtlarını raporla — teşhis için */
export function findInvalidOwnerIds(): string[] {
  return getOwnerUserIds().filter((id) => !UUID_RE.test(id));
}

export function isQuotaEnforcementOn(): boolean {
  const flag = (process.env.HARIS_QUOTA_ENFORCEMENT ?? "on").toLowerCase();
  return flag !== "off" && flag !== "false" && flag !== "0";
}

/**
 * Ana kapı. AI çağıran her route bunu başta çağırmalı.
 */
export async function checkAiGate(userId: string): Promise<AiGateResult> {
  const owner = isBillingOwner(userId);
  const enforcementOff = !isQuotaEnforcementOn();

  let sub;
  try {
    sub = await getCurrentSubscription(userId);
  } catch (e) {
    console.warn("[KOTA] abonelik okunamadı, serbest bırakılıyor:", e);
    return {
      allowed: true,
      isOwner: owner,
      enforcementOff,
      planId: "free",
      planName: "Ücretsiz",
      limit: 0,
      used: 0,
      remaining: 0,
      status: 200,
    };
  }

  const plan = getPlan(sub.planId);

  // Sahip veya takip kapalıysa → her zaman serbest
  if (owner || enforcementOff) {
    const usage = await readUsageSafe(userId);
    return {
      allowed: true,
      isOwner: owner,
      enforcementOff,
      planId: plan.id,
      planName: plan.name,
      limit: plan.limits.monthlyAiCalls,
      used: usage,
      remaining: Math.max(0, plan.limits.monthlyAiCalls - usage),
      status: 200,
    };
  }

  const check = await checkAiCallLimit(userId);
  if (check.allowed) {
    return {
      allowed: true,
      isOwner: owner,
      enforcementOff,
      planId: plan.id,
      planName: plan.name,
      limit: check.limit,
      used: check.current,
      remaining: check.remaining,
      status: 200,
    };
  }

  return {
    allowed: false,
    isOwner: owner,
    enforcementOff,
    planId: plan.id,
    planName: plan.name,
    limit: check.limit,
    used: check.current,
    remaining: 0,
    status: 402,
    reason: [
      `⏸ Aylık AI kotan doldu (${check.current}/${check.limit}).`,
      ``,
      `Plan: ${plan.name}`,
      ``,
      `Ne yapabilirsin:`,
      `1. Planını yükselt: /pricing`,
      `2. Yeni ayın başında kota sıfırlanır`,
      ``,
      `Not: Bu hesabın HARIS sahibi hesabı olduğunu düşünüyorsan, Vercel →`,
      `Settings → Environment Variables → HARIS_OWNER_USER_IDS içine`,
      `Supabase Auth User UUID'ni ekle ve Redeploy yap.`,
    ].join("\n"),
  };
}

/**
 * Kullanım sayacını artır (beklemeden). İsteği yavaşlatmaz.
 * Sahip hesaplar için de sayar — maliyet takibi için yararlı.
 */
export function recordAiCall(userId: string, amount = 1): void {
  void incrementUsage("ai_calls", amount, userId).catch((e) => {
    console.warn("[KOTA] kullanım sayacı güncellenemedi:", e);
  });
}

async function readUsageSafe(userId: string): Promise<number> {
  try {
    const check = await checkAiCallLimit(userId);
    return check.current;
  } catch {
    return 0;
  }
}
