"use client";

/**
 * HARIS v2 — Quality Gate Görsel Animasyon (Karar 9)
 *
 * Dilekçe paragraflarını "gerekli/nüans/doldurma" olarak işaretler:
 *  - ✅ Yeşil glow (gerekli)
 *  - 💎 Altın (nüans)
 *  - 🗑️ Kırmızı flash + fade-out (doldurma → atılır)
 *
 * Üstte canlı skor sayaçları, sağda Apple Health stili kalite skoru animasyonu.
 *
 * Doygun, kaliteli, "wow" görsel — kullanıcı isteği üzerine.
 * Risk: 0 (saf CSS animasyon, performans etkisi yok).
 */

import { useEffect, useState } from "react";

interface ParagraphScore {
  index: number;
  category: "gerekli" | "nüans" | "doldurma";
  score: number;
  reason: string;
}

interface QualityReport {
  paragraphs: ParagraphScore[];
  summary: {
    gerekli: number;
    nuans: number;
    doldurma: number;
    kalite_skoru: number;
  };
}

interface Props {
  markdown: string;
  report: QualityReport;
}

const CATEGORY_STYLES = {
  gerekli: {
    badge: "✅ gerekli",
    badgeClass: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    borderClass:
      "border-l-4 border-l-emerald-500/40 shadow-[0_0_24px_-12px_rgba(16,185,129,0.4)]",
  },
  nüans: {
    badge: "💎 nüans",
    badgeClass: "text-[#C9A961] bg-[#C9A961]/10 border-[#C9A961]/30",
    borderClass: "border-l-4 border-l-[#C9A961]/40",
  },
  doldurma: {
    badge: "🗑️ atılıyor",
    badgeClass: "text-rose-300 bg-rose-500/10 border-rose-500/30",
    borderClass: "border-l-4 border-l-rose-500/40",
  },
} as const;

export function QualityGateView({ markdown, report }: Props) {
  // Animasyon: paragrafları sırayla "atılıyor" → kaybolan animasyon
  const [removedIndexes, setRemovedIndexes] = useState<Set<number>>(new Set());
  const [showRemoved, setShowRemoved] = useState(false);
  const [animScore, setAnimScore] = useState(0);

  const paragraphs = markdown.split(/\n\s*\n/).filter((p) => p.trim());

  // Önce paragrafları kategorisine göre eşle
  const labeled = paragraphs.map((text, i) => {
    const meta = report.paragraphs.find((p) => p.index === i + 1) ?? {
      index: i + 1,
      category: "gerekli" as const,
      score: 80,
      reason: "Otomatik gerekli olarak işaretlendi",
    };
    return { text, meta };
  });

  // Quality skor sayacı animasyonu (0 → kalite_skoru)
  useEffect(() => {
    const target = report.summary.kalite_skoru;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setAnimScore(current);
    }, 30);
    return () => clearInterval(interval);
  }, [report.summary.kalite_skoru]);

  // Doldurma paragraflarını 1.5 saniyede sırayla atma animasyonu
  useEffect(() => {
    if (showRemoved) {
      setRemovedIndexes(new Set());
      return;
    }
    const dolduruluk = labeled
      .filter((l) => l.meta.category === "doldurma")
      .map((l) => l.meta.index);
    dolduruluk.forEach((idx, i) => {
      setTimeout(() => {
        setRemovedIndexes((prev) => new Set([...prev, idx]));
      }, 800 + i * 600);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRemoved]);

  const totalPages = Math.ceil(markdown.length / 2500);
  const removedCount = labeled.filter(
    (l) => l.meta.category === "doldurma"
  ).length;
  const finalPages = Math.ceil(
    labeled
      .filter((l) => l.meta.category !== "doldurma" || showRemoved)
      .map((l) => l.text)
      .join("\n\n").length / 2500
  );

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Üst dashboard */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard
          icon="✅"
          label="Gerekli"
          value={report.summary.gerekli}
          colorClass="text-emerald-300"
        />
        <StatCard
          icon="💎"
          label="Nüans"
          value={report.summary.nuans}
          colorClass="text-[#C9A961]"
        />
        <StatCard
          icon="🗑️"
          label="Atılan"
          value={report.summary.doldurma}
          colorClass="text-rose-300"
        />
        <div className="rounded-xl border border-[#C9A961]/30 bg-[#C9A961]/5 p-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            Kalite Skoru
          </div>
          <div className="text-4xl font-bold text-[#C9A961] tabular-nums">
            {animScore}
            <span className="text-lg text-slate-500">/100</span>
          </div>
        </div>
      </div>

      {/* Sayfa sayacı */}
      <div className="mb-4 flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/10">
        <div className="text-sm text-slate-300">
          📄 İlk taslak: <span className="font-semibold">{totalPages} sayfa</span>
          <span className="mx-2 text-slate-600">→</span>
          Kalite Gate sonrası:{" "}
          <span className="font-semibold text-emerald-300">
            {finalPages} sayfa
          </span>
          {removedCount > 0 && (
            <span className="ml-3 text-rose-300">
              ({removedCount} paragraf atıldı)
            </span>
          )}
        </div>
        <button
          onClick={() => setShowRemoved((v) => !v)}
          className="text-xs px-3 py-1 rounded border border-white/10 hover:bg-white/5 text-slate-400"
        >
          {showRemoved ? "🗑️ Atılanları Gizle" : "📜 Atılanları Gör"}
        </button>
      </div>

      {/* Paragraflar */}
      <article className="space-y-3">
        {labeled.map(({ text, meta }) => {
          const isRemoving =
            meta.category === "doldurma" &&
            removedIndexes.has(meta.index) &&
            !showRemoved;
          if (
            meta.category === "doldurma" &&
            removedIndexes.has(meta.index) &&
            !showRemoved
          ) {
            return null; // animasyon sonrası kayboldu
          }
          const style = CATEGORY_STYLES[meta.category];
          return (
            <div
              key={meta.index}
              className={`relative pl-4 pr-3 py-3 rounded-r-md bg-white/[0.02] transition-all duration-500 ${
                style.borderClass
              } ${isRemoving ? "animate-pulse opacity-30 scale-95" : ""} ${
                meta.category === "doldurma" && showRemoved
                  ? "opacity-50"
                  : ""
              }`}
              style={
                meta.category === "gerekli"
                  ? {
                      boxShadow:
                        "inset 3px 0 0 0 rgba(16, 185, 129, 0.6), 0 0 24px -10px rgba(16, 185, 129, 0.3)",
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${style.badgeClass}`}
                >
                  {style.badge}
                </span>
                <span className="text-[10px] text-slate-500">
                  §{meta.index} · puan {meta.score}/100
                </span>
              </div>
              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {text}
              </div>
              <div className="text-[10px] text-slate-500 mt-2 italic">
                Kalite Kontrol: {meta.reason}
              </div>
            </div>
          );
        })}
      </article>

      {/* Footer */}
      <div className="mt-6 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-200/80">
        ✓ <strong>Kalite Gate tamamlandı.</strong> Doldurma paragraflar
        atıldı, gerekli içerik korundu. Skor:{" "}
        <strong>{report.summary.kalite_skoru}/100</strong>. Bu hâliyle
        dilekçenizi indirebilir veya manuel düzenleyebilirsiniz.
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: string;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}
