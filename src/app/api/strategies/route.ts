/**
 * HARIS — Model Stratejileri API (Faz 16)
 *
 * GET    /api/strategies           → katalog + roller + kayıtlı stratejiler
 * POST   /api/strategies           → strateji kaydet/güncelle (+ aktive et)
 * DELETE /api/strategies?id=...    → strateji sil
 * POST   /api/strategies?default=1 → tümünü pasifleştir (env'e dön)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, isAuthenticatedUser } from "@/lib/v2/workspace/auth";
import {
  MODEL_CATALOG,
  PROVIDER_LABELS,
  providerHasKey,
  providerKeyName,
  type ProviderId,
} from "@/lib/v2/providers/catalog";
import {
  DEFAULT_STRATEGY,
  ROLE_LABELS,
  deactivateAllStrategies,
  deleteStrategy,
  invalidateStrategyCache,
  listStrategies,
  saveStrategy,
  getActiveStrategy,
  type StrategyConfig,
} from "@/lib/v2/strategy/db";
import type { ModelRole } from "@/lib/v2/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = Object.keys(ROLE_LABELS) as ModelRole[];

async function guard() {
  const authed = await isAuthenticatedUser();
  if (!authed) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const userId = await getCurrentUserId();

  const [strategies, active] = await Promise.all([
    listStrategies(userId),
    getActiveStrategy(userId),
  ]);

  return NextResponse.json({
    providers: (Object.keys(PROVIDER_LABELS) as ProviderId[]).map((p) => ({
      id: p,
      label: PROVIDER_LABELS[p],
      hasKey: providerHasKey(p),
      keyName: providerKeyName(p),
    })),
    models: MODEL_CATALOG,
    roles: ROLES.map((r) => ({ id: r, ...ROLE_LABELS[r] })),
    defaultStrategy: DEFAULT_STRATEGY,
    strategies,
    activeId: active?.id ?? null,
  });
}

export async function POST(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;
  const userId = await getCurrentUserId();

  // "Default"a dön → tüm stratejileri pasifleştir, sistem env'e düşer
  if (req.nextUrl.searchParams.get("default") === "1") {
    await deactivateAllStrategies(userId);
    invalidateStrategyCache(userId);
    return NextResponse.json({
      ok: true,
      message:
        "Varsayılana dönüldü. Artık Vercel env değişkenlerindeki modeller kullanılıyor.",
    });
  }

  const body = await req.json().catch(() => ({}));
  const { id, name, description, config, activate } = body as {
    id?: string;
    name?: string;
    description?: string;
    config?: StrategyConfig;
    activate?: boolean;
  };

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Stratejiye bir isim vermelisin." },
      { status: 400 }
    );
  }
  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "Model seçimi boş." }, { status: 400 });
  }

  try {
    const saved = await saveStrategy(userId, {
      id,
      name,
      description,
      config,
      activate: activate ?? true,
    });
    invalidateStrategyCache(userId);
    return NextResponse.json({
      ok: true,
      strategy: saved,
      message: `"${saved.name}" kaydedildi ve etkinleştirildi.`,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;
  const userId = await getCurrentUserId();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await deleteStrategy(userId, id);
  invalidateStrategyCache(userId);
  return NextResponse.json({ ok: true });
}
