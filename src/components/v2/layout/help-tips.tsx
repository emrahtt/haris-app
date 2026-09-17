"use client";

/**
 * HARIS v2 — Help Tips (Faz 13.9 Konsolidasyon)
 *
 * Matter sayfasında ilk açılışta kısa "Nasıl Çalışır?" tip'i.
 * localStorage ile bir kere kapatınca tekrar gösterilmez.
 * Sağ alttaki FAB'ın üzerinde küçük ipucu bulut'u.
 */

import { useEffect, useState } from "react";

interface Props {
  /**
   * Faz 16.6: OPSIYONEL.
   * workspace-client.tsx belge sayısını geçiyor; orchestra-rail.tsx ise
   * <HelpTips /> şeklinde propsuz kullanıyor. İkisi de çalışsın diye opsiyonel.
   */
  documentsCount?: number;
}

const STORAGE_KEY = "haris-help-tips-dismissed-v1";

export function HelpTips({ documentsCount = 0 }: Props) {
  const [dismissed, setDismissed] = useState(true); // başlangıçta gizli
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const val = localStorage.getItem(STORAGE_KEY);
    setDismissed(val === "true");
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setDismissed(false);
    setStep(0);
  };

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={handleReset}
        className="fixed bottom-6 left-6 z-40 w-8 h-8 rounded-full bg-slate-800/80 border border-white/10 text-slate-400 hover:text-[#C9A961] hover:bg-slate-800 transition text-sm flex items-center justify-center shadow-lg"
        title="Nasıl çalışır?"
      >
        ?
      </button>
    );
  }

  const steps = [
    {
      title: "👋 Merhaba! HARIS'e Hoş Geldiniz",
      body: (
        <>
          Bu 3 panel Türk hukukuna özel bir <strong>Matter Workspace</strong>.
          <ul className="mt-2 space-y-1 text-slate-300 list-disc list-inside">
            <li><strong>Sol:</strong> Belgeler + iş akışı</li>
            <li><strong>Orta:</strong> Dilekçe Canvas</li>
            <li><strong>Sağ:</strong> Chat + Hafıza + Taraflar</li>
          </ul>
        </>
      ),
    },
    {
      title: "📁 Adım 1: Belgeleri Yükleyin",
      body: (
        <>
          Sol paneldeki <strong>+ Belge Ekle</strong>&apos;e basın. 6 farklı okuma
          yöntemi arasından seçin:
          <ul className="mt-2 space-y-1 text-slate-300 list-disc list-inside">
            <li><strong>Akıllı (Otomatik)</strong>: Bilmiyorsanız bunu seçin</li>
            <li><strong>Claude Opus 5</strong>: Hukuk metinlerinde en iyi</li>
            <li><strong>Best of 3</strong>: Kritik belgeler için</li>
          </ul>
          {documentsCount === 0 && (
            <div className="mt-2 text-amber-300 text-xs">
              ⚠️ Henüz belge yok — önce 1-2 anahtar belge yükleyin
            </div>
          )}
        </>
      ),
    },
    {
      title: "🎼 Adım 2: Orkestrayı Başlatın",
      body: (
        <>
          Belgeler <strong>hazır</strong> olduğunda:
          <ul className="mt-2 space-y-1 text-slate-300 list-disc list-inside">
            <li>Sağ altta <strong>altın FAB</strong> butonuna basın</li>
            <li>Ya da chat&apos;e <code className="text-[#C9A961]">başla</code> yazın</li>
          </ul>
          12 uzman ajan 3 turda çalışır (~2-5 dakika).
        </>
      ),
    },
    {
      title: "💬 Adım 3: Chat ile Yönetin",
      body: (
        <>
          Sağ chat panelinde:
          <ul className="mt-2 space-y-1 text-slate-300 list-disc list-inside">
            <li><code className="text-[#C9A961]">@drafter</code> gibi ajan mention</li>
            <li>&quot;Karşı taraf ne diyor?&quot; gibi doğal soru</li>
            <li>Yanıtın altında <strong>📎 Kaynaklar</strong> chip&apos;leri</li>
          </ul>
        </>
      ),
    },
    {
      title: "⚖️ Bonus: Çıkar Çatışması",
      body: (
        <>
          Sağ panelde <strong>Taraflar</strong> kutusuna müvekkil / karşı taraf
          eklerseniz, aynı kişi başka davanızda karşı taraf ise sistem{" "}
          <strong className="text-red-300">otomatik uyarır</strong> (baro etik gereği).
        </>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed bottom-24 left-6 z-40 w-80 rounded-lg border border-[#C9A961]/40 bg-slate-950/95 backdrop-blur-md shadow-2xl p-4 animate-in slide-in-from-left-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-[#C9A961]">{current.title}</h4>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-300 text-lg leading-none"
          aria-label="Kapat"
        >
          ×
        </button>
      </div>
      <div className="text-xs text-slate-200 leading-relaxed">{current.body}</div>

      {/* Step indicator */}
      <div className="flex gap-1 mt-3">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded ${
              i === step ? "bg-[#C9A961]" : i < step ? "bg-[#C9A961]/40" : "bg-slate-700"
            }`}
          />
        ))}
      </div>

      <div className="flex justify-between mt-3">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30"
        >
          ← Geri
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs px-3 py-1 rounded bg-[#C9A961] text-[#0A1628] hover:bg-[#B89751] font-medium"
          >
            Anladım ✓
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="text-xs px-3 py-1 rounded bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/40 hover:bg-[#C9A961]/30"
          >
            İleri →
          </button>
        )}
      </div>
    </div>
  );
}
