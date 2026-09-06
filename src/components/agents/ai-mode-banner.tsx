import { isAiDemoMode, aiConfig, hasOpenAI, hasAnthropic } from "@/lib/ai/config";
import { Sparkles, Zap, Info } from "lucide-react";

/**
 * Ajan paneli üstündeki büyük AI durum kartı.
 * Demo modu kullanıcıyı yönlendirir; canlı modda ayarları gösterir.
 */
export function AIModeBanner() {
  if (isAiDemoMode) {
    return (
      <div className="bg-gradient-to-br from-[var(--color-warn)]/10 to-[var(--color-gold)]/5 border border-[var(--color-warn)]/30 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-warn)]/20 text-[var(--color-warn)] flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--color-warn)] text-[15px] mb-1">
              Demo Stream Modu Aktif
            </h3>
            <p className="text-[13px] text-[var(--color-text-2)] mb-3">
              Şu an her ajan, önceden hazırlanmış gerçekçi Türk hukuku yanıtlarını
              token-by-token simulated streaming ile gönderiyor. Tüm UI, gerçek AI ile aynı
              davranıyor.
            </p>
            <div className="bg-[var(--color-bg-deep)] rounded-lg p-3 text-[12px] text-[var(--color-text-2)] font-mono">
              <div className="text-[var(--color-text-3)] mb-1.5"># Gerçek AI&apos;ı aktif etmek için:</div>
              <div>
                <span className="text-[var(--color-gold-bright)]">OPENAI_API_KEY</span>=sk-...
              </div>
              <div>
                <span className="text-[var(--color-gold-bright)]">ANTHROPIC_API_KEY</span>
                =sk-ant-...
              </div>
              <div className="text-[var(--color-text-3)] mt-2 text-[11px]">
                (.env.local dosyasına ekleyin, npm run dev&apos;i yeniden başlatın)
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const provider = hasOpenAI && hasAnthropic ? "OpenAI + Anthropic" : hasOpenAI ? "OpenAI" : "Anthropic";

  return (
    <div className="bg-gradient-to-br from-[var(--color-ok)]/10 to-[var(--color-info)]/5 border border-[var(--color-ok)]/30 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--color-ok)]/20 text-[var(--color-ok)] flex items-center justify-center flex-shrink-0">
          <Zap size={18} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--color-ok)] text-[15px] mb-1">
            Canlı AI Modu Aktif — {provider}
          </h3>
          <p className="text-[13px] text-[var(--color-text-2)] mb-3">
            Tüm ajan çağrıları gerçek LLM API&apos;leri üzerinden yapılıyor. Streaming
            gerçek token akışıdır.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
            <div className="bg-[var(--color-bg-2)] rounded-md p-2.5">
              <div className="text-[var(--color-text-3)] text-[10px] uppercase tracking-wider mb-0.5">
                Varsayılan Model
              </div>
              <div className="text-[var(--color-gold-bright)] font-mono">
                {aiConfig.defaultModel}
              </div>
            </div>
            <div className="bg-[var(--color-bg-2)] rounded-md p-2.5">
              <div className="text-[var(--color-text-3)] text-[10px] uppercase tracking-wider mb-0.5">
                Adversarial Model
              </div>
              <div className="text-[var(--color-gold-bright)] font-mono">
                {aiConfig.adversarialModel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIInfoFootnote() {
  return (
    <div className="mt-4 flex items-start gap-2 text-[11px] text-[var(--color-text-3)] bg-[var(--color-bg-1)] rounded-md p-2.5">
      <Info size={12} className="flex-shrink-0 mt-0.5" />
      <div>
        Aşağıdaki ajan aktivite kayıtları örnek verilerdir. Gerçek ajan çağrılarını
        görmek için Dava Detay → Derin Analiz veya Dilekçe Üret sekmelerini kullanın.
      </div>
    </div>
  );
}
