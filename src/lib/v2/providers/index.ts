/**
 * HARIS v2 — Model Provider Registry (Faz 13.5.5)
 *
 * YENİ:
 *   - "opposition" role → GPT-5.6 Sol (karşı argüman için farklı sağlayıcı)
 *   - Adversarial diversity: farklı model + farklı bakış açısı = daha güçlü red-team
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ProviderId } from "./catalog";

export type ModelRole =
  | "orchestrator"
  | "analyzer"
  | "opposition" // YENİ: Karşı Argüman için (GPT-5.6 Sol)
  | "drafter"
  | "quick"
  | "vision";

export interface ModelInfo {
  role: ModelRole;
  provider: ProviderId;
  modelId: string;
  displayName: string;
  contextWindow: number;
  costPer1MInput: number;
  costPer1MOutput: number;
  costPer1MCacheWrite?: number;
  costPer1MCacheRead?: number;
  supportsCaching: boolean;
  supportsEffort: boolean;
}

/**
 * FAZ 14.2 — Model env çözümleme (sessiz hata YOK)
 *
 * ESKİ DAVRANIŞ (tehlikeliydi):
 *   HARIS_DRAFTER_MODEL=gemini-3.8-flash
 *   → provider bulunamadı → sessizce "anthropic"
 *   → modelId bulunamadı  → sessizce "claude-opus-5"
 *   Kullanıcı Gemini yazdığını sanırken sistem Claude'a gitti, kredi bitince
 *   "Dilekçe üretilemedi: Anthropic 400 credit balance" patladı.
 *
 * YENİ DAVRANIŞ:
 *   1) "provider:model" yoksa model adından provider TAHMİN edilir
 *      (claude-... → anthropic, gpt-/o1/o3 → openai)
 *   2) Tahmin edilemiyorsa (ör. gemini-*) → UYARI loglanır ve varsayılana dönülür
 *   3) OpenAI model adları küçük harfe normalize edilir (gpt-5.6-Sol → gpt-5.6-sol)
 *   4) Tüm uyarılar getModelEnvReport() ile /api/v2/debug/models üzerinden görünür
 */

export interface ModelEnvWarning {
  envKey: string;
  rawValue: string;
  problem: string;
  resolvedTo: string;
}

const MODEL_ENV_WARNINGS: ModelEnvWarning[] = [];
let warningsLogged = false;

/** Rol → env anahtarı adı (sabit tablo yerine hesaplanır: başlatma sırası riski yok) */
function envKeyForRole(role?: string): string {
  return role ? `HARIS_${role.toUpperCase()}_MODEL` : "?";
}

/** Model adından sağlayıcı tahmini (Faz 16.6: 4 sağlayıcı) */
function inferProvider(modelId: string): ProviderId | null {
  const m = modelId.toLowerCase().trim();
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("gemini") || m.startsWith("gemma")) return "gemini";
  if (m.startsWith("muse-") || m.startsWith("llama")) return "meta";
  if (
    m.startsWith("gpt") ||
    m.startsWith("o1") ||
    m.startsWith("o3") ||
    m.startsWith("o4") ||
    m.startsWith("chatgpt") ||
    m.startsWith("text-embedding")
  ) {
    return "openai";
  }
  return null;
}

function addWarning(w: ModelEnvWarning): void {
  const exists = MODEL_ENV_WARNINGS.some(
    (x) => x.envKey === w.envKey && x.rawValue === w.rawValue
  );
  if (exists) return; // aynı uyarıyı tekrar tekrar loglama
  MODEL_ENV_WARNINGS.push(w);
  if (!warningsLogged) {
    warningsLogged = true;
    console.warn(
      "[HARIS MODEL ENV] Geçersiz/eksik model tanımı tespit edildi. Ayrıntı: /api/v2/debug/models"
    );
  }
  console.warn(
    `[HARIS MODEL ENV] ${w.envKey}="${w.rawValue}" → ${w.problem} → kullanılan: ${w.resolvedTo}`
  );
}

const KNOWN_PROVIDERS: ProviderId[] = ["anthropic", "openai", "gemini", "meta"];

const DEFAULT_MODEL_FOR: Record<ProviderId, string> = {
  anthropic: "claude-opus-5",
  openai: "gpt-5.6-sol",
  gemini: "gemini-3.8-flash",
  meta: "muse-spark-1.3",
};

function isKnownProvider(v: string): v is ProviderId {
  return (KNOWN_PROVIDERS as string[]).includes(v);
}

function parseProvider(
  spec: string | undefined,
  def: ProviderId,
  role?: ModelRole
): ProviderId {
  const envKey = envKeyForRole(role);
  if (!spec || !spec.trim()) return def;

  const raw = spec.trim();
  const parts = raw.split(":");

  if (parts.length >= 2 && isKnownProvider(parts[0])) {
    const provider = parts[0];
    const modelId = parts.slice(1).join(":");
    // OpenAI model adları küçük harf olmalı
    if (provider === "openai" && modelId !== modelId.toLowerCase()) {
      addWarning({
        envKey,
        rawValue: raw,
        problem: `OpenAI model adları küçük harf olmalı ("${modelId}" → "${modelId.toLowerCase()}")`,
        resolvedTo: `openai:${modelId.toLowerCase()}`,
      });
    }
    return provider;
  }

  // Önek YOK → model adından tahmin et
  const inferred = inferProvider(raw);
  if (inferred) {
    addWarning({
      envKey,
      rawValue: raw,
      problem: `"provider:" öneki eksik, model adından tahmin edildi`,
      resolvedTo: `${inferred}:${raw.toLowerCase()}`,
    });
    return inferred;
  }

  // Tahmin de edilemedi (ör. gemini-3.8-flash) → desteklenmiyor
  addWarning({
    envKey,
    rawValue: raw,
    problem: `Desteklenmeyen model/sağlayıcı. Geçerli önekler: "anthropic:", "openai:", "gemini:", "meta:"`,
    resolvedTo: `${def}:${DEFAULT_MODEL_FOR[def]}`,
  });
  return def;
}

function parseModelId(
  spec: string | undefined,
  def: string,
  provider?: ProviderId,
  role?: ModelRole
): string {
  const envKey = envKeyForRole(role);
  if (!spec || !spec.trim()) return def;

  const raw = spec.trim();
  const parts = raw.split(":");

  if (parts.length >= 2 && isKnownProvider(parts[0])) {
    const modelId = parts.slice(1).join(":");
    return parts[0] === "openai" ? modelId.toLowerCase() : modelId;
  }

  // Önek yok: tahmin edilebiliyorsa model adını KULLAN (sessizce def'e düşme)
  const inferred = inferProvider(raw);
  if (inferred) return raw.toLowerCase();

  // Desteklenmeyen model → varsayılana dön (uyarı zaten parseProvider'da loglandı)
  void envKey;
  return provider === "openai" ? def.toLowerCase() : def;
}

export const MODEL_REGISTRY: Record<ModelRole, ModelInfo> = {
  orchestrator: {
    role: "orchestrator",
    provider: parseProvider(process.env.HARIS_ORCHESTRATOR_MODEL, "anthropic", "orchestrator"),
    modelId: parseModelId(process.env.HARIS_ORCHESTRATOR_MODEL, "claude-opus-5", parseProvider(process.env.HARIS_ORCHESTRATOR_MODEL, "anthropic", "orchestrator"), "orchestrator"),
    displayName: getDisplayName(process.env.HARIS_ORCHESTRATOR_MODEL, "Claude Opus 5"),
    contextWindow: 200_000,
    costPer1MInput: 5,
    costPer1MOutput: 25,
    costPer1MCacheWrite: 6.25,
    costPer1MCacheRead: 0.5,
    supportsCaching: true,
    supportsEffort: false,
  },
  analyzer: {
    role: "analyzer",
    provider: parseProvider(process.env.HARIS_ANALYZER_MODEL, "anthropic", "analyzer"),
    modelId: parseModelId(process.env.HARIS_ANALYZER_MODEL, "claude-opus-5", parseProvider(process.env.HARIS_ANALYZER_MODEL, "anthropic", "analyzer"), "analyzer"),
    displayName: getDisplayName(process.env.HARIS_ANALYZER_MODEL, "Claude Opus 5"),
    contextWindow: 200_000,
    costPer1MInput: 5,
    costPer1MOutput: 25,
    costPer1MCacheWrite: 6.25,
    costPer1MCacheRead: 0.5,
    supportsCaching: true,
    supportsEffort: false,
  },
  // YENİ: Karşı Argüman için farklı model (Adversarial Diversity)
  opposition: {
    role: "opposition",
    provider: parseProvider(process.env.HARIS_OPPOSITION_MODEL, "openai", "opposition"),
    modelId: parseModelId(process.env.HARIS_OPPOSITION_MODEL, "gpt-5.6-sol", parseProvider(process.env.HARIS_OPPOSITION_MODEL, "openai", "opposition"), "opposition"),
    displayName: getDisplayName(process.env.HARIS_OPPOSITION_MODEL, "GPT-5.6 Sol"),
    contextWindow: 128_000,
    costPer1MInput: 5,
    costPer1MOutput: 15,
    supportsCaching: false,
    supportsEffort: false,
  },
  drafter: {
    role: "drafter",
    provider: parseProvider(process.env.HARIS_DRAFTER_MODEL, "anthropic", "drafter"),
    modelId: parseModelId(process.env.HARIS_DRAFTER_MODEL, "claude-opus-5", parseProvider(process.env.HARIS_DRAFTER_MODEL, "anthropic", "drafter"), "drafter"),
    displayName: getDisplayName(process.env.HARIS_DRAFTER_MODEL, "Claude Opus 5"),
    contextWindow: 200_000,
    costPer1MInput: 5,
    costPer1MOutput: 25,
    costPer1MCacheWrite: 6.25,
    costPer1MCacheRead: 0.5,
    supportsCaching: true,
    supportsEffort: false,
  },
  quick: {
    role: "quick",
    provider: parseProvider(process.env.HARIS_QUICK_MODEL, "anthropic", "quick"),
    modelId: parseModelId(process.env.HARIS_QUICK_MODEL, "claude-sonnet-5", parseProvider(process.env.HARIS_QUICK_MODEL, "anthropic", "quick"), "quick"),
    displayName: getDisplayName(process.env.HARIS_QUICK_MODEL, "Claude Sonnet 5"),
    contextWindow: 200_000,
    costPer1MInput: 3,
    costPer1MOutput: 15,
    costPer1MCacheWrite: 3.75,
    costPer1MCacheRead: 0.3,
    supportsCaching: true,
    supportsEffort: false,
  },
  vision: {
    role: "vision",
    provider: parseProvider(process.env.HARIS_VISION_MODEL, "anthropic", "vision"),
    modelId: parseModelId(process.env.HARIS_VISION_MODEL, "claude-opus-5", parseProvider(process.env.HARIS_VISION_MODEL, "anthropic", "vision"), "vision"),
    displayName: getDisplayName(process.env.HARIS_VISION_MODEL, "Claude Opus 5 Vision"),
    contextWindow: 200_000,
    costPer1MInput: 5,
    costPer1MOutput: 25,
    supportsCaching: false,
    supportsEffort: false,
  },
};

const hasOpenAI = () => !!process.env.OPENAI_API_KEY?.startsWith("sk-");
const hasAnthropic = () => !!process.env.ANTHROPIC_API_KEY;

export function isDemoMode(): boolean {
  return !hasOpenAI() || !hasAnthropic();
}

export function getChatModel(role: ModelRole): BaseChatModel {
  const info = MODEL_REGISTRY[role];

  if (info.provider === "anthropic") {
    if (!hasAnthropic()) return mockChatModel(info);
    return new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: info.modelId,
      temperature: role === "orchestrator" ? 0.3 : 0.5,
      maxTokens: role === "drafter" ? 16000 : 4000,
      ...(process.env.ANTHROPIC_BASE_URL && {
        clientOptions: { baseURL: process.env.ANTHROPIC_BASE_URL },
      }),
    });
  }

  if (info.provider === "openai") {
    if (!hasOpenAI()) return mockChatModel(info);
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      model: info.modelId,
      temperature: role === "drafter" ? 0.4 : 0.3,
      maxTokens: role === "drafter" ? 16000 : 4000,
    });
  }

  // Gemini / Meta: LangChain sarmalayıcısı yok → doğrudan istemci kullanılıyor
  // (callProvider). Bu fonksiyon yalnızca V1 akışlarında çağrılıyor.
  if (info.provider === "gemini" || info.provider === "meta") {
    return mockChatModel(info);
  }

  throw new Error(`Bilinmeyen provider: ${info.provider}`);
}

export function getEmbeddings(): OpenAIEmbeddings | null {
  if (!hasOpenAI()) return null;
  return new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.HARIS_EMBEDDING_MODEL?.split(":")[1] ?? "text-embedding-3-large",
  });
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function getDisplayName(spec: string | undefined, def: string): string {
  const modelId = parseModelId(spec, "");
  if (!modelId) return def;

  // Popüler modeller için güzel isimler
  const nameMap: Record<string, string> = {
    "claude-opus-5": "Claude Opus 5",
    "claude-opus-4-8": "Claude Opus 4.8",
    "claude-opus-4-7": "Claude Opus 4.7",
    "claude-opus-4-6": "Claude Opus 4.6",
    "claude-sonnet-5": "Claude Sonnet 5",
    "claude-sonnet-4-6": "Claude Sonnet 4.6",
    "claude-fable-5": "Claude Fable 5",
    "claude-mythos-5": "Claude Mythos 5",
    "claude-haiku-4-5": "Claude Haiku 4.5",
    "claude-fable-5-1": "Claude Fable 5.1",
    "gemini-3.8-flash": "Gemini 3.8 Flash",
    "gemini-3.7-flash": "Gemini 3.7 Flash",
    "gemini-3.6-flash": "Gemini 3.6 Flash",
    "gemini-3.5-flash": "Gemini 3.5 Flash",
    "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
    "gemini-3.1-pro-preview": "Gemini 3.1 Pro",
    "gemini-3-flash-preview": "Gemini 3 Flash",
    "muse-spark-1.3": "Muse Spark 1.3",
    "muse-spark-1.2": "Muse Spark 1.2",
    "muse-spark-1.1": "Muse Spark 1.1",
    "gpt-5.6-sol": "GPT-5.6 Sol",
    "gpt-5.6-sol-ultra": "GPT-5.6 Sol Ultra",
    "gpt-5.6-terra": "GPT-5.6 Terra",
    "gpt-5.6-luna": "GPT-5.6 Luna",
    "gpt-5.5": "GPT-5.5",
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o mini",
  };

  return nameMap[modelId] || modelId;
}

function mockChatModel(info: ModelInfo): BaseChatModel {
  const ChatOpenAIMock = ChatOpenAI as unknown as new (
    config: Record<string, unknown>
  ) => BaseChatModel;
  return new ChatOpenAIMock({
    apiKey: "mock-key",
    model: info.modelId,
    configuration: { baseURL: "http://localhost:9999/mock" },
  });
}

// ─────────────────────────────────────────────────────────
// OCR / VİZYON MODEL ÇÖZÜMLEYİCİLERİ (Faz 14.2)
//
// ESKİ HATA: extract.ts env'i ":" ile bölüp SADECE model adını alıyordu,
// provider önekini çöpe atıyordu. Yani HARIS_VISION_MODEL=anthropic:claude-opus-5
// iken "OpenAI Vision" seçilirse OpenAI'a "claude-opus-5" gönderilip 404 alınıyordu.
// Artık her fonksiyon KENDİ sağlayıcısına ait modeli kullanır.
// ─────────────────────────────────────────────────────────

function modelIdForProvider(
  envKeys: string[],
  provider: ProviderId
): string | null {
  for (const key of envKeys) {
    const spec = process.env[key]?.trim();
    if (!spec) continue;
    const parts = spec.split(":");
    if (parts.length >= 2) {
      if (parts[0] === provider) {
        const id = parts.slice(1).join(":");
        return provider === "openai" ? id.toLowerCase() : id;
      }
      continue;
    }
    if (inferProvider(spec) === provider) {
      return provider === "openai" ? spec.toLowerCase() : spec;
    }
  }
  return null;
}

/** PDF/OCR → Claude Vision için doğru model adı */
export function resolveClaudeVisionModel(): string {
  return (
    modelIdForProvider(["HARIS_VISION_MODEL", "HARIS_ANALYZER_MODEL"], "anthropic") ??
    "claude-sonnet-5"
  );
}

/** PDF/OCR → OpenAI Vision için doğru model adı */
export function resolveOpenAIVisionModel(): string {
  return (
    modelIdForProvider(["HARIS_META_VISION_MODEL", "HARIS_VISION_MODEL"], "openai") ??
    "gpt-5.6-terra"
  );
}

/**
 * PDF/OCR → Meta Muse Spark Vision için model adı (Faz 16.6 varsayılan OCR)
 * Sıra: HARIS_META_VISION_MODEL → HARIS_VISION_MODEL (meta: ise) → muse-spark-1.3
 */
export function resolveMetaVisionModel(): string {
  const explicit = process.env.HARIS_META_VISION_MODEL?.trim();
  if (explicit) {
    const parsed = explicit.includes(":") ? explicit.split(":").slice(1).join(":") : explicit;
    if (parsed) return parsed;
  }
  const spec = process.env.HARIS_VISION_MODEL?.trim();
  if (spec?.startsWith("meta:")) return spec.slice(5);
  return "muse-spark-1.3";
}

// ─────────────────────────────────────────────────────────
// TEŞHİS — /api/v2/debug/models bu raporu döner
// ─────────────────────────────────────────────────────────

/** Vercel env'deki model tanımlarının GERÇEKTE neye çözüldüğünü gösterir. */
export function getModelEnvReport() {
  return {
    effective: (Object.keys(MODEL_REGISTRY) as ModelRole[]).map((role) => ({
      role,
      envKey: envKeyForRole(role),
      envValue: process.env[envKeyForRole(role)] ?? null,
      provider: MODEL_REGISTRY[role].provider,
      modelId: MODEL_REGISTRY[role].modelId,
      displayName: MODEL_REGISTRY[role].displayName,
    })),
    warnings: MODEL_ENV_WARNINGS,
    otherModels: {
      HARIS_EMBEDDING_MODEL: process.env.HARIS_EMBEDDING_MODEL ?? null,
      HARIS_GEMINI_MODEL: process.env.HARIS_GEMINI_MODEL ?? null,
      HARIS_DEFAULT_MODEL: process.env.HARIS_DEFAULT_MODEL ?? null,
      HARIS_ADVERSARIAL_MODEL: process.env.HARIS_ADVERSARIAL_MODEL ?? null,
      HARIS_FALLBACK_MODEL: process.env.HARIS_FALLBACK_MODEL ?? null,
      HARIS_FALLBACK_ANTHROPIC_MODEL:
        process.env.HARIS_FALLBACK_ANTHROPIC_MODEL ?? null,
    },
    keys: {
      ANTHROPIC_API_KEY: maskKey(process.env.ANTHROPIC_API_KEY),
      OPENAI_API_KEY: maskKey(process.env.OPENAI_API_KEY),
      GEMINI_API_KEY: maskKey(
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      ),
      ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL ?? null,
    },
    note: "HARIS_GEMINI_MODEL yalnızca PDF/OCR (Gemini Vision) içindir; orkestra modellerini etkilemez. HARIS_DEFAULT_MODEL ve HARIS_ADVERSARIAL_MODEL yalnızca V1 ekranlarında kullanılır.",
  };
}

function maskKey(key: string | undefined): string | null {
  if (!key) return null;
  if (key.length <= 10) return "****";
  return `${key.slice(0, 6)}…${key.slice(-4)} (${key.length} karakter)`;
}
