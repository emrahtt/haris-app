/**
 * HARIS AI Yapılandırması
 *
 * Sağlayıcı seçimi mantığı:
 * 1) HARIS_DEFAULT_MODEL env'de tanımlı ise onu kullan
 * 2) Yoksa OpenAI > Anthropic > Demo Mode sırasıyla dene
 * 3) Hiçbir API key yoksa DEMO MODE → simulated streaming
 */

export const aiConfig = {
  openaiKey: process.env.OPENAI_API_KEY || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  defaultModel: process.env.HARIS_DEFAULT_MODEL || "openai:gpt-4o-mini",
  adversarialModel:
    process.env.HARIS_ADVERSARIAL_MODEL || "anthropic:claude-3-5-sonnet-20241022",
  maxTokens: parseInt(process.env.HARIS_MAX_TOKENS || "4000", 10),
} as const;

export const hasOpenAI = !!aiConfig.openaiKey;
export const hasAnthropic = !!aiConfig.anthropicKey;
export const isAiDemoMode = !hasOpenAI && !hasAnthropic;

export type ProviderId = "openai" | "anthropic";

export interface ModelSpec {
  provider: ProviderId;
  model: string;
}

/** "openai:gpt-4o" string'ini ProviderSpec'e çevirir, env'e göre fallback yapar */
export function parseModel(spec?: string): ModelSpec {
  const s = spec || aiConfig.defaultModel;
  const [provider, ...rest] = s.split(":");
  const model = rest.join(":");

  if (provider === "openai" && hasOpenAI) return { provider: "openai", model };
  if (provider === "anthropic" && hasAnthropic)
    return { provider: "anthropic", model };

  // İstenen sağlayıcı yok → mevcut olana fallback
  if (hasOpenAI) return { provider: "openai", model: "gpt-4o-mini" };
  if (hasAnthropic)
    return { provider: "anthropic", model: "claude-3-5-haiku-20241022" };

  // Hiçbiri yok — demo mode (caller bunu kontrol etmeli)
  return { provider: "openai", model: "demo" };
}
