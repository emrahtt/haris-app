/**
 * HARIS v2 — Model/Env Teşhis Endpoint'i (Faz 14.2)
 *
 * AMAÇ:
 *   Vercel env değişkenlerinin GERÇEKTE neye çözüldüğünü ve hangi AI hesabında
 *   kredi olduğunu tarayıcıdan tek tıkla görmek. Log aramaya gerek kalmaz.
 *
 * KULLANIM (login olduktan sonra):
 *   /api/v2/debug/models            → etkili modeller + uyarılar
 *   /api/v2/debug/models?test=1     → ayrıca her modeli canlı dener (kredi var mı?)
 *
 * GÜVENLİK:
 *   - Sadece giriş yapmış kullanıcı erişebilir
 *   - API anahtarları MASKELİ döner (ilk 6 + son 4 karakter)
 *   - Test çağrıları max 8 token üretir → maliyet ihmal edilebilir
 */

import { NextResponse } from "next/server";
import { isAuthenticatedUser } from "@/lib/v2/workspace/auth";
import {
  friendlyProviderError,
  isAuthError,
  isModelNotFoundError,
  isQuotaError,
} from "@/lib/v2/providers/fallback";
import { MODEL_REGISTRY, getModelEnvReport, type ModelRole } from "@/lib/v2/providers";
import type { ProviderId } from "@/lib/v2/providers/catalog";
import { callProvider } from "@/lib/v2/providers/clients";
import { costOf } from "@/lib/v2/providers/catalog";
import { getActiveStrategy, resolveRoleModel } from "@/lib/v2/strategy/db";
import {
  checkAiGate,
  findInvalidOwnerIds,
  getOwnerUserIds,
  isQuotaEnforcementOn,
} from "@/lib/billing/quota-gate";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";

export const dynamic = "force-dynamic";

interface TestResult {
  provider: ProviderId;
  modelId: string;
  usedByRoles: ModelRole[];
  status: "ok" | "kota_bitti" | "anahtar_gecersiz" | "model_bulunamadi" | "hata";
  httpStatus?: number;
  detail?: string;
  ms: number;
}

export async function GET(req: Request) {
  const authed = await isAuthenticatedUser();
  if (!authed) {
    return NextResponse.json(
      { error: "Bu sayfa için giriş yapmalısın." },
      { status: 401 }
    );
  }

  const userId = await getCurrentUserId();
  const activeStrategy = await getActiveStrategy(userId);
  const gate = await checkAiGate(userId);
  const report = {
    ...getModelEnvReport(),
    kota: {
      sahipMuafiyeti: gate.isOwner,
      takipAcik: isQuotaEnforcementOn(),
      plan: gate.planName,
      kullanilan: gate.used,
      limit: gate.limit,
      kalan: gate.remaining,
      serbest: gate.allowed,
      ownerIds: getOwnerUserIds(),
      gecersizOwnerIds: findInvalidOwnerIds(),
      not:
        "gecersizOwnerIds doluysa: HARIS_OWNER_USER_IDS içine UUID olmayan bir değer yazmışsın (ör. Vercel proje ID'si). Supabase Auth → Users → User UUID gerekli.",
    },
    aktifStrateji: activeStrategy
      ? { id: activeStrategy.id, name: activeStrategy.name, config: activeStrategy.config }
      : null,
    etkiliRoller: await Promise.all(
      (Object.keys(MODEL_REGISTRY) as ModelRole[]).map(async (role) => {
        const r = await resolveRoleModel(role, userId);
        return {
          role,
          kaynak: r.source,
          model: `${r.provider}:${r.modelId}`,
          effort: r.effort ?? null,
          anahtarVar: r.hasKey,
        };
      })
    ),
  };
  const url = new URL(req.url);
  const wantTest = url.searchParams.get("test") === "1";

  if (!wantTest) {
    return NextResponse.json({ ok: true, ...report, test: "Eklemek için: ?test=1" });
  }

  // Hangi modeller test edilecek? (registry'deki benzersiz provider+model çiftleri)
  const targets = new Map<string, TestResult>();
  (Object.keys(MODEL_REGISTRY) as ModelRole[]).forEach((role) => {
    const info = MODEL_REGISTRY[role];
    const key = `${info.provider}:${info.modelId}`;
    const existing = targets.get(key);
    if (existing) {
      existing.usedByRoles.push(role);
    } else {
      targets.set(key, {
        provider: info.provider,
        modelId: info.modelId,
        usedByRoles: [role],
        status: "hata",
        ms: 0,
      });
    }
  });

  const results = await Promise.all(
    [...targets.values()].map((t) => probe(t))
  );

  const broken = results.filter((r) => r.status !== "ok");

  return NextResponse.json({
    ok: broken.length === 0,
    ozet:
      broken.length === 0
        ? "Tüm modeller çalışıyor."
        : `${broken.length} model çalışmıyor: ${broken
            .map((b) => `${b.provider}:${b.modelId} (${b.status})`)
            .join(", ")}`,
    testler: results,
    ...report,
  });
}

async function probe(t: TestResult): Promise<TestResult> {
  const started = Date.now();
  const cost = costOf(t.modelId, t.provider);
  try {
    const r = await callProvider({
      provider: t.provider,
      model: t.modelId,
      system: "Sen bir bağlantı testisin.",
      user: "OK",
      maxTokens: 8,
      costIn: cost.input,
      costOut: cost.output,
    });
    t.ms = Date.now() - started;
    t.status = "ok";
    t.detail = `Çalışıyor · "${r.content.slice(0, 30)}"`;
    return t;
  } catch (e) {
    const errStr = String(e);
    t.ms = Date.now() - started;
    if (isQuotaError(errStr)) {
      t.status = "kota_bitti";
      t.detail = friendlyProviderError(errStr, t.provider, t.modelId);
    } else if (isAuthError(errStr)) {
      t.status = "anahtar_gecersiz";
      t.detail = friendlyProviderError(errStr, t.provider, t.modelId);
    } else if (isModelNotFoundError(errStr)) {
      t.status = "model_bulunamadi";
      t.detail = friendlyProviderError(errStr, t.provider, t.modelId);
    } else {
      t.status = "hata";
      t.detail = errStr.slice(0, 250);
    }
    return t;
  }
}
