"use client";

/**
 * HARIS v2 — OCR Yöntem Seçici Modal
 *
 * Kullanıcı belge yüklerken hangi AI ile okunacağını seçer:
 *   - Akıllı (auto) — varsayılan, çoğu durumda iyi
 *   - Hızlı — AI yok, pdf-parse, ucuz/anlık
 *   - Claude Vision — Anthropic native PDF
 *   - GPT-4o Vision — kanıtlanmış pipeline (PDF → PNG)
 *   - Gemini Pro Vision — Türkçe + tablo en iyi, ucuz
 *   - Best of 3 — 3 modeli paralel, en iyiyi seç (en pahalı)
 */

import { useState } from "react";

export type ExtractionMethod =
  | "auto"
  | "fast"
  | "claude_vision"
  | "openai_vision"
  | "gemini_vision"
  | "best_of_3";

interface Props {
  files: File[];
  defaultMethod?: ExtractionMethod;
  onConfirm: (method: ExtractionMethod) => void;
  onCancel: () => void;
}

interface MethodOption {
  id: ExtractionMethod;
  emoji: string;
  label: string;
  desc: string;
  costEstimate: string;
  speed: string;
  quality: "Düşük" | "Orta" | "Yüksek" | "En yüksek";
  qualityColor: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
}

const METHODS: MethodOption[] = [
  {
    id: "auto",
    emoji: "🤖",
    label: "Akıllı (Otomatik)",
    desc: "Önce ücretsiz dener, başarısızsa GPT-4o Vision'a düşer",
    costEstimate: "$0 - $0.10 / belge",
    speed: "Hızlı",
    quality: "Orta",
    qualityColor: "text-emerald-300",
    recommended: true,
    pros: ["Çoğu durumda yeterli", "Düşük maliyet"],
    cons: ["Karmaşık tablo/grafik için yetersiz olabilir"],
  },
  {
    id: "fast",
    emoji: "⚡",
    label: "Hızlı (AI Yok)",
    desc: "Sadece pdf-parse / mammoth, AI çağrısı yok",
    costEstimate: "$0",
    speed: "Anlık",
    quality: "Düşük",
    qualityColor: "text-slate-400",
    pros: ["Bedava", "1-2 saniye"],
    cons: ["Tablo/grafik kaybolur", "Taranmış PDF okunmaz"],
  },
  {
    id: "claude_vision",
    emoji: "🟣",
    label: "Claude Sonnet 4.6 Vision",
    desc: "Anthropic native PDF (bazen OneProvider'da boş yanıt verebilir)",
    costEstimate: "$0.01 - $0.10 / belge",
    speed: "Orta (60-120 sn)",
    quality: "Yüksek",
    qualityColor: "text-violet-300",
    pros: ["Hukuk metinlerinde güçlü", "Türkçe iyi"],
    cons: ["OneProvider proxy bazen başarısız"],
  },
  {
    id: "openai_vision",
    emoji: "🟢",
    label: "GPT-4o Vision (Kanıtlanmış)",
    desc: "PDF → Yüksek çözünürlük PNG → GPT-4o sayfa sayfa okur",
    costEstimate: "$0.03 - $0.30 / belge",
    speed: "Orta (30-90 sn)",
    quality: "Yüksek",
    qualityColor: "text-emerald-300",
    pros: ["Her PDF'i kesin okur", "Tablo/grafik destekler", "Damga/imza tespit"],
    cons: ["Sayfa başına maliyet"],
  },
  {
    id: "gemini_vision",
    emoji: "🔵",
    label: "Gemini Vision (Türkçe Lider)",
    desc: "Google Gemini, PDF → PNG → Vision (en iyi Türkçe + en ucuz)",
    costEstimate: "$0.001 - $0.02 / belge",
    speed: "Hızlı (15-60 sn)",
    quality: "En yüksek",
    qualityColor: "text-sky-300",
    pros: ["EN UCUZ", "Türkçe karakter mükemmel", "Tablo çok iyi"],
    cons: ["GEMINI_API_KEY env gerekir"],
  },
  {
    id: "best_of_3",
    emoji: "👑",
    label: "Best of 3 (En İyi Sonuç)",
    desc: "Claude + GPT-4o + Gemini paralel çalışır, en uzun/iyi sonucu seçer",
    costEstimate: "$0.05 - $0.50 / belge",
    speed: "Yavaş (60-180 sn)",
    quality: "En yüksek",
    qualityColor: "text-[#C9A961]",
    pros: ["Hata payı en düşük", "Karmaşık belgeler için ideal"],
    cons: ["3 kat maliyet", "Üç AI birden çağırır"],
  },
];

export function MethodPicker({
  files,
  defaultMethod = "auto",
  onConfirm,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<ExtractionMethod>(defaultMethod);
  const [rememberChoice, setRememberChoice] = useState(false);

  const handleConfirm = () => {
    if (rememberChoice) {
      try {
        localStorage.setItem("haris_default_ocr_method", selected);
      } catch {
        // ignore
      }
    }
    onConfirm(selected);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#0E1B30] border border-white/15 rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-xl font-bold text-[#C9A961]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              🔬 OCR / Belge Okuma Yöntemi
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {files.length} dosya seçildi:{" "}
              {files.slice(0, 3).map((f) => f.name).join(", ")}
              {files.length > 3 && ` (+${files.length - 3} dosya)`}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="text-xs text-slate-400 mb-3 p-2 rounded border border-amber-500/20 bg-amber-500/5">
          💡 <strong>Hukuk belgesi mi?</strong> Tablolar, damgalar, imzalar
          önemliyse <strong>Gemini Vision</strong> veya{" "}
          <strong>Best of 3</strong> seçin. Sadece düz metin için{" "}
          <strong>Hızlı</strong> yeter.
        </div>

        {/* Method kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {METHODS.map((m) => {
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`text-left p-3 rounded-lg border transition relative ${
                  isSelected
                    ? "border-[#C9A961] bg-[#C9A961]/10 ring-1 ring-[#C9A961]/30"
                    : "border-white/10 hover:border-white/30 bg-white/[0.02]"
                }`}
              >
                {m.recommended && (
                  <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ÖNERİLEN
                  </span>
                )}
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-2xl">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-100">
                      {m.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {m.desc}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] mb-2">
                  <span className="text-slate-500">⏱ {m.speed}</span>
                  <span className="text-slate-500">💰 {m.costEstimate}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-semibold ${m.qualityColor}`}>
                    Kalite: {m.quality}
                  </span>
                </div>
                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[10px] space-y-1">
                    <div>
                      <span className="text-emerald-400">✓ </span>
                      <span className="text-slate-400">{m.pros.join(" · ")}</span>
                    </div>
                    <div>
                      <span className="text-amber-400">⚠ </span>
                      <span className="text-slate-400">{m.cons.join(" · ")}</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Hatırlama checkbox */}
        <label className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <input
            type="checkbox"
            checked={rememberChoice}
            onChange={(e) => setRememberChoice(e.target.checked)}
            className="rounded"
          />
          Bu seçimi sonraki yüklemeler için varsayılan yap
        </label>

        {/* Butonlar */}
        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded text-sm text-slate-400 hover:text-slate-200"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded bg-[#C9A961] text-[#0A1628] font-semibold text-sm hover:bg-[#e6c479]"
          >
            🚀 {files.length} Belgeyi Yükle
          </button>
        </div>
      </div>
    </div>
  );
}
