/**
 * HARIS — MODEL KATALOĞU (Faz 16)
 *
 * Bu dosyadaki TÜM model ID'leri 11-14 Eylül 2026 tarihinde resmî/bağımsız
 * kaynaklardan DOĞRULANMIŞTIR. Uydurma isim YOKTUR.
 *
 * Kaynaklar:
 *  - Anthropic: github.com/anthropics/skills (Claude Model Catalog),
 *    benchlm.ai/providers/anthropic, aipricing.guru/anthropic-pricing
 *  - OpenAI:    kingy.ai GPT-5.6 API guide, developersdigest.tech,
 *    ai-toolbox.co (model ID'leri: gpt-5.6-sol / terra / luna)
 *  - Gemini:    ai.google.dev/gemini-api/docs/models,
 *    firebase.google.com/docs/ai-logic/models, requesty.ai/models/google
 *  - Meta:      developer.meta.com/ai/resources/blog/build-with-muse-spark,
 *    promptfoo.dev/docs/providers/meta
 *
 * ÖNEMLİ DOĞRULAMA NOTLARI:
 *  1) "claude-opus-5-1" DİYE BİR MODEL YOK. Opus serisi: 5 → 4.8 → 4.7 → 4.6.
 *     5.1 sürümü olan seri FABLE'dır (claude-fable-5-1, 1 Eylül 2026).
 *  2) gpt-4o ve gpt-4.1, 13 Şubat 2026'da EMEKLİ OLDU. Kodda varsayılan olarak
 *     hâlâ "gpt-4o" geçen yerler düzeltildi (→ gpt-5.6-terra).
 *  3) Meta Model API halka açık önizlemede ve şu an SADECE ABD'li
 *     geliştiricilere açık (dev.meta.ai). Türkiye'den anahtar alınamayabilir.
 *  4) "muse-spark-1.3-contributor" daha ucuzdur AMA prompt ve çıktılarınla
 *     Meta'nın gelecek modellerini EĞİTMESİNE izin verir. Müvekkil verisi için
 *     KVKK açısından SAKINCALI — bu yüzden listede uyarıyla işaretli.
 */

export type ProviderId = "anthropic" | "openai" | "gemini" | "meta";

export type EffortLevel = "low" | "medium" | "high";

export interface CatalogModel {
  /** API'ye gönderilecek GERÇEK model ID */
  id: string;
  /** Ekranda gösterilecek isim */
  name: string;
  provider: ProviderId;
  /** 1M token başına $ — doğrulanamadıysa undefined */
  costIn?: number;
  costOut?: number;
  contextWindow: number;
  maxOutput: number;
  /** Görsel/PDF girdi destekliyor mu */
  vision: boolean;
  /** Reasoning/thinking seviyesi ayarlanabiliyor mu */
  supportsEffort: boolean;
  /** Sağlayıcının kendi çaba seviyesi adları */
  effortValues?: string[];
  /** "current" | "legacy" | "preview" | "limited" */
  status: "current" | "legacy" | "preview" | "limited";
  /** Kullanıcıya gösterilecek uyarı */
  warning?: string;
  /** Kısa kullanım önerisi */
  bestFor?: string;
}

export const MODEL_CATALOG: CatalogModel[] = [
  // ───────────────────────── ANTHROPIC ─────────────────────────
  {
    id: "claude-fable-5-1",
    name: "Claude Fable 5.1",
    provider: "anthropic",
    costIn: 10,
    costOut: 50,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: false,
    status: "current",
    bestFor: "En yetenekli model. Ağır muhakeme, uzun dilekçe, karmaşık dava analizi.",
  },
  {
    id: "claude-fable-5",
    name: "Claude Fable 5",
    provider: "anthropic",
    costIn: 10,
    costOut: 50,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: false,
    status: "current",
    bestFor: "Fable 5.1'in bir önceki sürümü.",
  },
  {
    id: "claude-opus-5",
    name: "Claude Opus 5",
    provider: "anthropic",
    costIn: 5,
    costOut: 25,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: false,
    status: "current",
    bestFor: "Fiyat/performans dengeli üst seviye. Dilekçe yazımı için önerilen.",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "anthropic",
    costIn: 2,
    costOut: 10,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: false,
    status: "current",
    bestFor: "Hızlı işler: sınıflandırma, özet, hafıza çıkarımı. Ucuz.",
  },
  {
    id: "claude-opus-4-8",
    name: "Claude Opus 4.8",
    provider: "anthropic",
    costIn: 5,
    costOut: 25,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: false,
    status: "legacy",
    bestFor: "Legacy ama aktif. Emeklilik: 2027'den önce değil.",
  },
  {
    id: "claude-opus-4-7",
    name: "Claude Opus 4.7",
    provider: "anthropic",
    costIn: 5,
    costOut: 25,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: false,
    status: "legacy",
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    costIn: 5,
    costOut: 25,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: false,
    status: "legacy",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    costIn: 3,
    costOut: 15,
    contextWindow: 200_000,
    maxOutput: 64_000,
    vision: true,
    supportsEffort: false,
    status: "legacy",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    costIn: 1,
    costOut: 5,
    contextWindow: 200_000,
    maxOutput: 64_000,
    vision: true,
    supportsEffort: false,
    status: "current",
    bestFor: "En ucuz Claude. Basit sınıflandırma/özet işleri.",
  },

  // ───────────────────────── OPENAI ─────────────────────────
  {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    provider: "openai",
    costIn: 5,
    costOut: 30,
    contextWindow: 1_050_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: true,
    effortValues: ["none", "low", "medium", "high", "xhigh", "max"],
    status: "current",
    bestFor: "OpenAI'ın amiral gemisi. Karşı argüman / red-team için ideal.",
  },
  {
    id: "gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    provider: "openai",
    costIn: 2,
    costOut: 12,
    contextWindow: 1_050_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: true,
    effortValues: ["none", "low", "medium", "high", "xhigh", "max"],
    status: "current",
    bestFor: "Dengeli günlük iş. PDF/OCR vizyon için önerilen varsayılan.",
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    provider: "openai",
    costIn: 0.2,
    costOut: 1.2,
    contextWindow: 1_050_000,
    maxOutput: 128_000,
    vision: true,
    supportsEffort: true,
    effortValues: ["none", "low", "medium", "high", "xhigh", "max"],
    status: "current",
    bestFor: "Çok ucuz + hızlı. Sınıflandırma, özet, yüksek hacimli iş.",
  },

  // ───────────────────────── GOOGLE GEMINI ─────────────────────────
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    provider: "gemini",
    costIn: 0.75,
    costOut: 3.75,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "current",
    bestFor: "En yeni Gemini (2 Eyl 2026). Ucuz, hızlı, Türkçe + tablo OCR'da iyi.",
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "current",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "gemini",
    costIn: 1.5,
    costOut: 7,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "current",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "gemini",
    costIn: 1.5,
    costOut: 9,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "legacy",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    provider: "gemini",
    costIn: 0.3,
    costOut: 2.5,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    vision: true,
    supportsEffort: false,
    status: "current",
    bestFor: "En ucuz Gemini. Toplu özet/sınıflandırma.",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro (önizleme)",
    provider: "gemini",
    costIn: 2,
    costOut: 12,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "preview",
    bestFor: "En güçlü Gemini (derin muhakeme, varsayılan çaba: HIGH).",
    warning: "Önizleme sürümü — üretimde beklenmedik değişiklik olabilir.",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash (önizleme)",
    provider: "gemini",
    costIn: 0.5,
    costOut: 3,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "preview",
  },

  // ───────────────────────── META (Muse Spark) ─────────────────────────
  {
    id: "muse-spark-1.3",
    name: "Muse Spark 1.3",
    provider: "meta",
    contextWindow: 1_048_576,
    maxOutput: 8_192,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "limited",
    bestFor:
      "Meta'nın en yetenekli modeli (2 Eyl 2026). HARIS'te VARSAYILAN OCR motoru (reasoning_effort: high).",
    warning:
      "Meta Model API halka açık ÖNİZLEMEDE ve şu an sadece ABD'li geliştiricilere açık (dev.meta.ai). Türkiye'den MODEL_API_KEY alınamayabilir.",
  },
  {
    id: "muse-spark-1.2",
    name: "Muse Spark 1.2",
    provider: "meta",
    contextWindow: 1_048_576,
    maxOutput: 8_192,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "limited",
    warning: "Meta Model API önizleme — ABD erişimi gerektirebilir.",
  },
  {
    id: "muse-spark-1.1",
    name: "Muse Spark 1.1",
    provider: "meta",
    costIn: 1.25,
    costOut: 4.25,
    contextWindow: 1_000_000,
    maxOutput: 8_192,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "limited",
    warning: "Meta Model API önizleme — ABD erişimi gerektirebilir.",
  },
  {
    id: "muse-spark-1.3-contributor",
    name: "Muse Spark 1.3 (Contributor — indirimli)",
    provider: "meta",
    contextWindow: 1_048_576,
    maxOutput: 8_192,
    vision: true,
    supportsEffort: true,
    effortValues: ["low", "medium", "high"],
    status: "limited",
    warning:
      "⚠️ KVKK RİSKİ: Bu ID'yi seçmek, prompt ve çıktılarının Meta'nın gelecekteki modellerini EĞİTMESİNE izin verir. Müvekkil verisi içeren hiçbir işte KULLANMA.",
  },
];

// ─────────────────────────────────────────────────────────
// YARDIMCILAR
// ─────────────────────────────────────────────────────────

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  gemini: "Google Gemini",
  meta: "Meta (Muse Spark)",
};

/** Sağlayıcının API anahtarı env'de tanımlı mı? */
export function providerHasKey(provider: ProviderId): boolean {
  switch (provider) {
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "gemini":
      return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    case "meta":
      return !!(process.env.MODEL_API_KEY || process.env.META_API_KEY);
  }
}

export function providerKeyName(provider: ProviderId): string {
  switch (provider) {
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    case "openai":
      return "OPENAI_API_KEY";
    case "gemini":
      return "GEMINI_API_KEY";
    case "meta":
      return "MODEL_API_KEY";
  }
}

export function findModel(id: string): CatalogModel | undefined {
  const needle = id.trim().toLowerCase();
  return MODEL_CATALOG.find((m) => m.id.toLowerCase() === needle);
}

export function modelsByProvider(provider: ProviderId): CatalogModel[] {
  return MODEL_CATALOG.filter((m) => m.provider === provider);
}

/** "anthropic:claude-opus-5" → { provider, modelId } (katalogda yoksa da çözer) */
export function parseModelSpec(
  spec: string
): { provider: ProviderId; modelId: string } | null {
  const raw = spec?.trim();
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx > 0) {
    const provider = raw.slice(0, idx) as ProviderId;
    const modelId = raw.slice(idx + 1);
    if (
      (provider === "anthropic" ||
        provider === "openai" ||
        provider === "gemini" ||
        provider === "meta") &&
      modelId
    ) {
      return { provider, modelId: provider === "openai" ? modelId.toLowerCase() : modelId };
    }
    return null;
  }
  const found = findModel(raw);
  return found ? { provider: found.provider, modelId: found.id } : null;
}

/** Varsayılan maliyet (katalogda bulunamayan model için) */
export function costOf(modelId: string, provider: ProviderId): { input: number; output: number } {
  const found = findModel(modelId);
  if (found?.costIn !== undefined && found?.costOut !== undefined) {
    return { input: found.costIn, output: found.costOut };
  }
  const defaults: Record<ProviderId, { input: number; output: number }> = {
    anthropic: { input: 5, output: 25 },
    openai: { input: 2, output: 12 },
    gemini: { input: 0.75, output: 3.75 },
    meta: { input: 1.25, output: 4.25 },
  };
  return defaults[provider];
}
