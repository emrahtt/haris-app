/**
 * HARIS — Model Stratejisi (Faz 16)
 *
 * Rol bazlı model seçimini veritabanında saklar. Öncelik sırası:
 *   1) Kullanıcının AKTİF stratejisi (Supabase · model_strategies)
 *   2) Vercel env değişkenleri (MODEL_REGISTRY)
 *   3) DEFAULT_STRATEGY (kod içi sabit)
 *
 * Böylece kullanıcı panelden modeli değiştirip kaydeder; env'e dokunmasına
 * ve Redeploy yapmasına gerek kalmaz.
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { MODEL_REGISTRY, type ModelRole } from "@/lib/v2/providers";
import {
  costOf,
  providerHasKey,
  type EffortLevel,
  type ProviderId,
} from "@/lib/v2/providers/catalog";

export interface RoleChoice {
  provider: ProviderId;
  modelId: string;
  /** Reasoning / thinking seviyesi (model destekliyorsa) */
  effort?: EffortLevel;
  /** Bu role özel token tavanı (boşsa rolün varsayılanı) */
  maxTokens?: number;
}

export type StrategyConfig = Partial<Record<ModelRole, RoleChoice>>;

export interface ModelStrategy {
  id: string;
  name: string;
  description: string | null;
  config: StrategyConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedModel {
  role: ModelRole;
  provider: ProviderId;
  modelId: string;
  effort?: EffortLevel;
  maxTokens?: number;
  costPer1MInput: number;
  costPer1MOutput: number;
  /** Seçim nereden geldi — teşhis için */
  source: "strateji" | "env" | "varsayilan";
  /** Sağlayıcının API anahtarı tanımlı mı */
  hasKey: boolean;
}

/**
 * "Default" butonunun geri döndürdüğü sabit standart seçim.
 * Doğrulanmış, güncel ve maliyeti dengeli modeller.
 */
export const DEFAULT_STRATEGY: StrategyConfig = {
  orchestrator: { provider: "anthropic", modelId: "claude-opus-5" },
  // Faz 16.6: HUKUKÎ analiz ve dilekçe yazımında en yetenekli Claude → Fable 5
  analyzer: { provider: "anthropic", modelId: "claude-fable-5" },
  drafter: { provider: "anthropic", modelId: "claude-fable-5", maxTokens: 16000 },
  opposition: { provider: "openai", modelId: "gpt-5.6-sol", effort: "high" },
  quick: { provider: "anthropic", modelId: "claude-sonnet-5" },
  // Faz 16.6: OCR varsayılanı Meta Muse Spark 1.3
  vision: { provider: "meta", modelId: "muse-spark-1.3", effort: "high" },
};

/** Rol → insan okunur Türkçe ad (panel için) */
export const ROLE_LABELS: Record<ModelRole, { name: string; desc: string }> = {
  orchestrator: {
    name: "Orkestra Şefi",
    desc: "Ajanları görevlendirir, süreci yönetir.",
  },
  analyzer: {
    name: "Uzman Analistler",
    desc: "Maddi Hukuk, Usul, İçtihat, Delil, Bilirkişi, Atıf Doğrulayıcı.",
  },
  drafter: {
    name: "Dilekçe Editörü",
    desc: "Nihai dilekçeyi yazar → Canvas'a düşer. En kritik rol.",
  },
  opposition: {
    name: "Karşı Argüman (Şeytan Avukatı)",
    desc: "Diğer ajanları eleştirir, zayıf noktaları bulur.",
  },
  quick: {
    name: "Hızlı İşler",
    desc: "Belge sınıflandırma, özetleme, hafıza çıkarımı, müvekkil iletişim.",
  },
  vision: {
    name: "Vizyon / OCR",
    desc: "Taranmış PDF ve görselleri okur.",
  },
};

// ─────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────

const DEMO_STRATEGIES = new Map<string, ModelStrategy[]>();

function demoList(userId: string): ModelStrategy[] {
  if (!DEMO_STRATEGIES.has(userId)) DEMO_STRATEGIES.set(userId, []);
  return DEMO_STRATEGIES.get(userId)!;
}

function mapRow(r: Record<string, unknown>): ModelStrategy {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    config: (r.config as StrategyConfig) ?? {},
    isActive: !!r.is_active,
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  };
}

export async function listStrategies(userId: string): Promise<ModelStrategy[]> {
  if (isDemoMode) return demoList(userId);
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("model_strategies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

export async function getActiveStrategy(
  userId: string
): Promise<ModelStrategy | null> {
  if (isDemoMode) return demoList(userId).find((s) => s.isActive) ?? null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("model_strategies")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data ? mapRow(data) : null;
}

export async function saveStrategy(
  userId: string,
  input: {
    id?: string;
    name: string;
    description?: string;
    config: StrategyConfig;
    activate?: boolean;
  }
): Promise<ModelStrategy> {
  const name = input.name.trim() || "İsimsiz strateji";
  const activate = input.activate ?? true;

  if (isDemoMode) {
    const list = demoList(userId);
    const now = new Date().toISOString();
    if (input.id) {
      const i = list.findIndex((s) => s.id === input.id);
      if (i >= 0) {
        list[i] = {
          ...list[i],
          name,
          description: input.description ?? null,
          config: input.config,
          isActive: activate,
          updatedAt: now,
        };
        if (activate) list.forEach((s, j) => (s.isActive = j === i));
        return list[i];
      }
    }
    const created: ModelStrategy = {
      id: `demo-${Date.now()}`,
      name,
      description: input.description ?? null,
      config: input.config,
      isActive: activate,
      createdAt: now,
      updatedAt: now,
    };
    if (activate) list.forEach((s) => (s.isActive = false));
    list.unshift(created);
    return created;
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase yapılandırılmamış");

  // Aktif yapılacaksa önce diğerlerini pasifleştir (unique index çakışmasın)
  if (activate) {
    await supabase
      .from("model_strategies")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);
  }

  const payload = {
    user_id: userId,
    name,
    description: input.description ?? null,
    config: input.config,
    is_active: activate,
  };

  const { data, error } = input.id
    ? await supabase
        .from("model_strategies")
        .update(payload)
        .eq("id", input.id)
        .eq("user_id", userId)
        .select()
        .single()
    : await supabase.from("model_strategies").insert(payload).select().single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function deleteStrategy(
  userId: string,
  id: string
): Promise<void> {
  if (isDemoMode) {
    const list = demoList(userId);
    const i = list.findIndex((s) => s.id === id);
    if (i >= 0) list.splice(i, 1);
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("model_strategies")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
}

/** Tüm stratejileri pasifleştir → sistem env'e (Vercel değişkenlerine) döner */
export async function deactivateAllStrategies(userId: string): Promise<void> {
  if (isDemoMode) {
    demoList(userId).forEach((s) => (s.isActive = false));
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("model_strategies")
    .update({ is_active: false })
    .eq("user_id", userId);
}

// ─────────────────────────────────────────────────────────
// ÇÖZÜMLEYİCİ — orkestra ve chat bunu kullanır
// ─────────────────────────────────────────────────────────

const strategyCache = new Map<string, { at: number; value: ModelStrategy | null }>();
const CACHE_TTL_MS = 15_000;

async function cachedActiveStrategy(
  userId: string | undefined
): Promise<ModelStrategy | null> {
  if (!userId) return null;
  const hit = strategyCache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  let value: ModelStrategy | null = null;
  try {
    value = await getActiveStrategy(userId);
  } catch (e) {
    console.warn("[STRATEJI] aktif strateji okunamadı:", e);
  }
  strategyCache.set(userId, { at: Date.now(), value });
  return value;
}

/** Strateji kaydedilince önbelleği temizle */
export function invalidateStrategyCache(userId?: string): void {
  if (userId) strategyCache.delete(userId);
  else strategyCache.clear();
}

export async function resolveRoleModel(
  role: ModelRole,
  userId?: string
): Promise<ResolvedModel> {
  const strategy = await cachedActiveStrategy(userId);
  const choice = strategy?.config?.[role];

  if (choice?.modelId) {
    const cost = costOf(choice.modelId, choice.provider);
    return {
      role,
      provider: choice.provider,
      modelId: choice.modelId,
      effort: choice.effort,
      maxTokens: choice.maxTokens,
      costPer1MInput: cost.input,
      costPer1MOutput: cost.output,
      source: "strateji",
      hasKey: providerHasKey(choice.provider),
    };
  }

  // Env (MODEL_REGISTRY) — Faz 14.2'de doğrulanmış değerler
  const info = MODEL_REGISTRY[role];
  if (info) {
    return {
      role,
      provider: info.provider as ProviderId,
      modelId: info.modelId,
      maxTokens: undefined,
      costPer1MInput: info.costPer1MInput,
      costPer1MOutput: info.costPer1MOutput,
      source: "env",
      hasKey: providerHasKey(info.provider as ProviderId),
    };
  }

  // Kod içi varsayılan
  const fallback = DEFAULT_STRATEGY[role]!;
  const cost = costOf(fallback.modelId, fallback.provider);
  return {
    role,
    provider: fallback.provider,
    modelId: fallback.modelId,
    effort: fallback.effort,
    maxTokens: fallback.maxTokens,
    costPer1MInput: cost.input,
    costPer1MOutput: cost.output,
    source: "varsayilan",
    hasKey: providerHasKey(fallback.provider),
  };
}
