/**
 * HARIS — Model Test API (Faz 16)
 *
 * POST /api/strategies/test  { provider, modelId, effort? }
 * → Modeli canlı olarak 8 token'lık bir istekle dener.
 *   Kredi var mı, model adı doğru mu, anahtar geçerli mi — hepsini söyler.
 *
 * Maliyet: ihmal edilebilir (8 token çıktı).
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedUser } from "@/lib/v2/workspace/auth";
import { callProvider } from "@/lib/v2/providers/clients";
import { costOf, providerHasKey, providerKeyName, type ProviderId } from "@/lib/v2/providers/catalog";
import { friendlyProviderError, isQuotaError, isAuthError, isModelNotFoundError } from "@/lib/v2/providers/fallback";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authed = await isAuthenticatedUser();
  if (!authed) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const provider = body.provider as ProviderId;
  const modelId = String(body.modelId ?? "").trim();
  const effort = body.effort as "low" | "medium" | "high" | undefined;

  if (!provider || !modelId) {
    return NextResponse.json({ error: "provider ve modelId gerekli" }, { status: 400 });
  }

  if (!providerHasKey(provider)) {
    return NextResponse.json({
      ok: false,
      status: "anahtar_yok",
      message: `${providerKeyName(provider)} Vercel env'de tanımlı değil. Önce onu ekle, sonra Redeploy yap.`,
    });
  }

  const started = Date.now();
  const cost = costOf(modelId, provider);

  try {
    const result = await callProvider({
      provider,
      model: modelId,
      system: "Sen bir bağlantı testisin. Sadece 'OK' yaz.",
      user: "OK",
      maxTokens: 8,
      effort,
      costIn: cost.input,
      costOut: cost.output,
    });

    return NextResponse.json({
      ok: true,
      status: "calisiyor",
      ms: Date.now() - started,
      message: `✅ ${modelId} çalışıyor (${((Date.now() - started) / 1000).toFixed(1)} sn)`,
      yanit: result.content.slice(0, 60),
    });
  } catch (e) {
    const errStr = String(e);
    let status = "hata";
    if (isQuotaError(errStr)) status = "kota_bitti";
    else if (isAuthError(errStr)) status = "anahtar_gecersiz";
    else if (isModelNotFoundError(errStr)) status = "model_bulunamadi";

    return NextResponse.json({
      ok: false,
      status,
      ms: Date.now() - started,
      message: friendlyProviderError(errStr, provider, modelId),
    });
  }
}
