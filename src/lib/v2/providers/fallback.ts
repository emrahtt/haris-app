/**
 * HARIS v2 — Provider Fallback + Hata Açıklama (Faz 14.1)
 *
 * SORUN:
 *   Anthropic hesabında kredi bittiğinde orkestra "Anthropic 400: credit balance
 *   is too low" hatasıyla tamamen duruyordu. Dilekçe Canvas'a hiç düşmüyordu.
 *
 * ÇÖZÜM:
 *   1) Kredi/bakiye/limit hataları tek yerden tanınır (isQuotaError).
 *   2) Bir sağlayıcı kotası biterse otomatik olarak DİĞER sağlayıcıya düşülür
 *      (getFallbackSpec) — HARIS_FALLBACK_MODEL env'i ile yönlendirilebilir.
 *   3) İkisi de çalışmazsa kullanıcıya ham JSON değil, Türkçe ve çözüm öneren
 *      bir mesaj gösterilir (friendlyProviderError).
 *
 * ENV:
 *   HARIS_ENABLE_PROVIDER_FALLBACK = "true" (varsayılan: true)
 *   HARIS_FALLBACK_MODEL           = "openai:gpt-5.6-sol"  (Anthropic çökerse)
 *   HARIS_FALLBACK_ANTHROPIC_MODEL = "anthropic:claude-sonnet-5" (OpenAI çökerse)
 */

import { costOf, providerHasKey, type ProviderId } from "./catalog";

export type ProviderName = ProviderId;

export interface FallbackSpec {
  provider: ProviderName;
  modelId: string;
  costPer1MInput: number;
  costPer1MOutput: number;
}

// ─────────────────────────────────────────────────────────
// HATA TESPİTİ
// ─────────────────────────────────────────────────────────

/** Bakiye / kredi / kota bitmesi — retry ile düzelmez, para gerekir. */
const QUOTA_PATTERNS = [
  "credit balance is too low",
  "credit balance",
  "purchase credits",
  "insufficient_quota",
  "insufficient quota",
  "insufficient balance",
  "not enough credits",
  "exceeded your current quota",
  "billing_hard_limit",
  "plans & billing",
  "billing",
  "payment required",
  "bakiye",
  "kredi",
];

/** Kimlik doğrulama hatası — key yanlış/süresi dolmuş. */
const AUTH_PATTERNS = [
  "invalid api key",
  "invalid_api_key",
  "authentication_error",
  "unauthorized",
  "permission_error",
  "forbidden",
];

/** Model bulunamadı — model adı yanlış yazılmış. */
const NOT_FOUND_PATTERNS = [
  "model_not_found",
  "not_found_error",
  "does not exist",
  "no such model",
];

function lower(input: unknown): string {
  return String(input ?? "").toLowerCase();
}

function matches(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}

/**
 * Hata metni/HTTP durumu "para-kota" problemi mi?
 * Not: 402 her zaman kota; 429 bazen kota bazen hız limiti.
 */
export function isQuotaError(input: unknown, status?: number): boolean {
  const text = lower(input);
  if (status === 402) return true;
  if (matches(text, QUOTA_PATTERNS)) return true;
  // "429 ... quota" → kota. Sadece "429 rate limit" → değil.
  if (status === 429 && (text.includes("quota") || text.includes("credit"))) return true;
  if (text.includes("429") && (text.includes("quota") || text.includes("credit balance"))) return true;
  return false;
}

export function isAuthError(input: unknown, status?: number): boolean {
  if (status === 401 || status === 403) return true;
  return matches(lower(input), AUTH_PATTERNS);
}

export function isModelNotFoundError(input: unknown, status?: number): boolean {
  if (status === 404) return true;
  return matches(lower(input), NOT_FOUND_PATTERNS);
}

/** Retry etmeye değer mi? (geçici sunucu hatası / hız limiti) */
export function isRetryableError(input: unknown, status?: number): boolean {
  if (isQuotaError(input, status) || isAuthError(input, status)) return false;
  if (status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const text = lower(input);
  return (
    text.includes("429") ||
    text.includes("500") ||
    text.includes("502") ||
    text.includes("503") ||
    text.includes("504") ||
    text.includes("timeout") ||
    text.includes("aborted") ||
    text.includes("econnreset")
  );
}

// ─────────────────────────────────────────────────────────
// FALLBACK MODEL SEÇİMİ
// ─────────────────────────────────────────────────────────

export function isFallbackEnabled(): boolean {
  const flag = process.env.HARIS_ENABLE_PROVIDER_FALLBACK;
  if (flag === undefined || flag === "") return true; // varsayılan AÇIK
  return flag.toLowerCase() !== "false" && flag !== "0";
}

function parseSpec(spec: string | undefined): { provider: ProviderName; modelId: string } | null {
  if (!spec) return null;
  const [prov, modelId] = spec.split(":");
  if ((prov === "anthropic" || prov === "openai") && modelId) return { provider: prov, modelId };
  return null;
}

const FALLBACK_DEFAULT_MODEL: Record<ProviderId, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-5.6-terra",
  gemini: "gemini-3.8-flash",
  meta: "muse-spark-1.3",
};

/**
 * Çöken sağlayıcının YERİNE geçecek modeli döndürür.
 * Sıra: env ile açıkça tanımlanan → anahtarı olan diğer sağlayıcılar.
 */
export function getFallbackSpec(failedProvider: ProviderName): FallbackSpec | null {
  if (!isFallbackEnabled()) return null;

  const explicitSpec =
    process.env.HARIS_FALLBACK_MODEL ||
    process.env.HARIS_FALLBACK_ANTHROPIC_MODEL;
  const explicit = explicitSpec ? parseSpec(explicitSpec) : null;

  const candidates: ProviderId[] =
    explicit && explicit.provider !== failedProvider
      ? [explicit.provider, "anthropic", "openai", "gemini", "meta"]
      : ["anthropic", "openai", "gemini", "meta"];

  for (const provider of candidates) {
    if (provider === failedProvider) continue;
    if (!providerHasKey(provider)) continue;
    const modelId =
      explicit && explicit.provider === provider
        ? explicit.modelId
        : FALLBACK_DEFAULT_MODEL[provider];
    const cost = costOf(modelId, provider);
    return {
      provider,
      modelId,
      costPer1MInput: cost.input,
      costPer1MOutput: cost.output,
    };
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// KULLANICI DOSTU TÜRKÇE HATA MESAJI
// ─────────────────────────────────────────────────────────

const KEY_NAMES: Record<ProviderName, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  meta: "MODEL_API_KEY",
};

const BILLING_URLS: Record<ProviderName, string> = {
  anthropic:
    "1. https://console.anthropic.com/settings/billing adresine gir\n2. \"Add credit\" ile en az 5$ yükle\n3. 1-2 dakikada aktifleşir, sonra tekrar \"Süreci Başlat\" de",
  openai:
    "1. https://platform.openai.com/settings/organization/billing adresine gir\n2. \"Add to credit balance\" ile kredi yükle\n3. Sonra tekrar \"Süreci Başlat\" de",
  gemini:
    "1. https://aistudio.google.com/usage adresine gir\n2. Ücretsiz katman limiti dolmuş olabilir; faturalı projeye geç\n3. Sonra tekrar \"Süreci Başlat\" de",
  meta:
    "1. https://dev.meta.ai paneline gir\n2. Model API kotasını/kredi bakiyeni kontrol et",
};

const PROVIDER_LABEL: Record<ProviderName, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  gemini: "Google Gemini",
  meta: "Meta (Muse Spark)",
};

/**
 * Ham JSON hatasını, avukatın anlayacağı Türkçe mesaja çevirir.
 */
export function friendlyProviderError(
  err: unknown,
  provider: ProviderName,
  modelId?: string
): string {
  const text = String(err ?? "");
  const label = PROVIDER_LABEL[provider];
  const modelSuffix = modelId ? ` (${modelId})` : "";

  if (isQuotaError(text)) {
    return [
      `💳 ${label} hesabının kredisi bitti${modelSuffix}.`,
      ``,
      `Yapman gereken:`,
      BILLING_URLS[provider],
      ``,
      `Geçici çözüm: Vercel → Settings → Environment Variables içinde`,
      provider === "anthropic"
        ? `HARIS_FALLBACK_MODEL=openai:gpt-5.6-sol tanımlıysa ve OPENAI_API_KEY'in kredisiz değilse sistem otomatik GPT'ye düşer.`
        : `HARIS_FALLBACK_ANTHROPIC_MODEL=anthropic:claude-sonnet-5 tanımlıysa sistem otomatik Claude'a düşer.`,
    ].join("\n");
  }

  if (isAuthError(text)) {
    return `🔑 ${label} API anahtarı geçersiz veya süresi dolmuş${modelSuffix}.\n\nÇözüm: Vercel → Settings → Environment Variables → ${
      KEY_NAMES[provider]
    } değerini kontrol et, gerekirse yenile ve Redeploy yap.`;
  }

  if (isModelNotFoundError(text)) {
    return `❌ "${modelId ?? "?"}" modeli ${label} tarafında bulunamadı.\n\nÇözüm: Vercel env değişkenindeki model adını kontrol et (ör. HARIS_DRAFTER_MODEL=anthropic:claude-opus-5). Yazım hatası olmamalı.`;
  }

  if (isRetryableError(text)) {
    return `🔌 ${label} sunucusu geçici olarak yanıt vermiyor. 30-60 saniye bekleyip "Süreci Başlat" ile tekrar dene.`;
  }

  // Bilinmeyen hata → kısa özet (uzun JSON'u kullanıcıya boca etme)
  const short = text.length > 220 ? `${text.slice(0, 220)}…` : text;
  return `⚠️ ${label} çağrısı başarısız oldu.\n\n${short}`;
}
