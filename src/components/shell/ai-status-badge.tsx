import { isAiDemoMode, aiConfig, hasOpenAI, hasAnthropic } from "@/lib/ai/config";
import { Sparkles, Zap } from "lucide-react";

/**
 * Topbar'da gösterilen küçük AI durum rozeti.
 * Demo modunda → "Demo Stream" (sarı)
 * Gerçek API → "Canlı AI" (yeşil)
 */
export function AIStatusBadge() {
  if (isAiDemoMode) {
    return (
      <div
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] bg-[var(--color-warn)]/10 text-[var(--color-warn)] border border-[var(--color-warn)]/20"
        title="Demo Mode: Önceden hazırlanmış yanıtlar token-by-token simüle ediliyor. Gerçek AI için OPENAI_API_KEY veya ANTHROPIC_API_KEY ekleyin."
      >
        <Sparkles size={11} />
        <span className="font-medium">Demo Stream</span>
      </div>
    );
  }

  const provider = hasOpenAI && hasAnthropic ? "OpenAI + Anthropic" : hasOpenAI ? "OpenAI" : "Anthropic";

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] bg-[var(--color-ok)]/10 text-[var(--color-ok)] border border-[var(--color-ok)]/20"
      title={`Canlı AI: ${aiConfig.defaultModel}`}
    >
      <Zap size={11} />
      <span className="font-medium">Canlı AI</span>
      <span className="opacity-60">• {provider}</span>
    </div>
  );
}
