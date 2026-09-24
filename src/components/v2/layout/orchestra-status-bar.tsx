"use client";

/**
 * HARIS v2 — Orkestra Durum Çubuğu (Faz 16.7)
 *
 * Canvas'ın tepesinde yapışkan (sticky) durur ve şunları söyler:
 *   - Şu an HANGİ aşama / HANGİ ajan çalışıyor
 *   - Kaç saniye geçti
 *   - Metnin DEĞİŞEBİLECEĞİ uyarısı (v1 taslak → v2 kalite kontrollü sürüm)
 *   - Bitince "✓ TAMAMLANDI — metin artık değişmeyecek"
 *
 * Kullanıcının şikâyeti: "dilekçe yazılıyor, tamam sanıyorum, sonra değişiyor"
 * Sebebi: draft aşaması v1'i gönderir, quality aşaması v2'yi. Bu çubuk o
 * geçişi açıkça anlatır.
 */

interface Props {
  isRunning: boolean;
  stage?: string;
  elapsedSec?: number;
  status: string;
  /** Şu an çalışan ajanın görünen adı (ör. "✍️ Dilekçe Editörü") */
  activeAgent?: string;
  /** Canvas'taki dilekçe sürümü (1 = taslak, 2 = kalite kontrollü) */
  petitionVersion?: number;
  /** Toplam aşama sayısı */
  totalStages?: number;
}

const STAGE_INFO: Record<
  string,
  { title: string; detail: string; index: number }
> = {
  round1: {
    title: "Uzman ajanlar davayı inceliyor",
    detail: "Maddi Hukuk, Usul, İçtihat, Delil ve Karşı Argüman ajanları paralel çalışıyor.",
    index: 1,
  },
  round2: {
    title: "Karşı Argüman ajanı eleştiriyor",
    detail: "Diğer ajanların zayıf noktaları tespit edilip güçlendiriliyor.",
    index: 2,
  },
  draft: {
    title: "Dilekçe Editörü dilekçeyi yazıyor",
    detail: "Metin tamamlanınca Canvas'a v1 olarak düşecek. Bu aşama en uzun sürenidir.",
    index: 3,
  },
  quality: {
    title: "Kalite Kontrol dilekçeyi puanlıyor",
    detail: "⚠️ Metin GÜNCELLENEBİLİR — paragraflar puanlanıp v2 sürümü gönderilecek.",
    index: 4,
  },
};

export function OrchestraStatusBar({
  isRunning,
  stage,
  elapsedSec = 0,
  status,
  activeAgent,
  petitionVersion,
  totalStages = 4,
}: Props) {
  // ── ÇALIŞIYOR ──────────────────────────────────────────
  if (isRunning) {
    const info = stage ? STAGE_INFO[stage] : undefined;
    return (
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 border-b text-[13px]"
        style={{
          background: "linear-gradient(90deg, rgba(201,169,97,0.16), rgba(14,27,48,0.95))",
          borderColor: "rgba(201,169,97,0.35)",
        }}
      >
        <span
          className="block w-4 h-4 shrink-0 rounded-full animate-spin"
          style={{
            border: "2px solid rgba(201,169,97,0.25)",
            borderTopColor: "#C9A961",
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#e8d5a8] truncate">
            {info?.title ?? "Orkestra çalışıyor"}
            {info ? ` · ${info.index}/${totalStages}. aşama` : ""}
            {activeAgent ? ` · ${activeAgent}` : ""}
          </div>
          <div className="text-[11.5px] text-slate-400 truncate">
            {info?.detail ?? "Ajanlar görevlendiriliyor…"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[#C9A961] font-mono text-[13px]">{elapsedSec}sn</div>
          <div className="text-[10px] text-slate-500">
            {petitionVersion ? `sürüm v${petitionVersion}` : "sürüm bekleniyor"}
          </div>
        </div>
      </div>
    );
  }

  // ── TAMAMLANDI ─────────────────────────────────────────
  if (status === "completed") {
    return (
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2 border-b text-[13px]"
        style={{
          background: "rgba(20,83,45,0.28)",
          borderColor: "rgba(74,222,128,0.35)",
        }}
      >
        <span className="text-emerald-300 text-base">✓</span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-emerald-200">TAMAMLANDI</span>
          <span className="text-slate-300">
            {" "}
            — dilekçe üretimi bitti, metin artık değişmeyecek.
            {petitionVersion ? ` (sürüm v${petitionVersion})` : ""}
          </span>
        </div>
      </div>
    );
  }

  // ── HATA ───────────────────────────────────────────────
  if (status === "error") {
    return (
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2 border-b text-[13px]"
        style={{ background: "rgba(127,29,29,0.30)", borderColor: "rgba(248,113,113,0.4)" }}
      >
        <span className="text-red-300 text-base">✕</span>
        <div className="flex-1 min-w-0 text-red-100">
          <span className="font-semibold">SÜREÇ DURDU</span> — ayrıntı sağdaki sohbet
          akışında. Düzeltip &quot;İşlemi Başlat&quot; ile tekrar deneyebilirsin.
        </div>
      </div>
    );
  }

  // ── KULLANICI DURDURDU ─────────────────────────────────
  if (status === "stopped") {
    return (
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2 border-b text-[13px]"
        style={{ background: "rgba(100,116,139,0.22)", borderColor: "rgba(148,163,184,0.35)" }}
      >
        <span className="text-slate-300 text-base">⏹</span>
        <div className="flex-1 min-w-0 text-slate-200">
          <span className="font-semibold">DURDURULDU</span> — tamamlanan aşamaların
          çıktıları kaydedildi. Devam etmek için tekrar başlat.
        </div>
      </div>
    );
  }

  // ── BEKLEMEDE: sadece sürüm bilgisi ────────────────────
  if (petitionVersion) {
    return (
      <div
        className="sticky top-0 z-30 flex items-center gap-2 px-4 py-1.5 border-b text-[11.5px] text-slate-400"
        style={{ background: "rgba(14,27,48,0.9)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <span>📄</span>
        <span>
          Dilekçe sürüm v{petitionVersion}
          {petitionVersion < 2 ? " (taslak — kalite kontrolü bekliyor)" : " (kalite kontrollü)"}
        </span>
      </div>
    );
  }

  return null;
}
