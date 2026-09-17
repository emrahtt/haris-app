"use client";

/**
 * HARIS v2 — Orkestra FAB (Faz 13.8)
 *
 * Floating Action Button (sag alt kose) — her zaman gorunur, dikkat cekici.
 * Ust bardaki 'Sureci Baslat' butonuna alternatif olarak eklenir.
 * Kullanici scroll etse bile bu buton her zaman ekranda.
 */

import { useState } from "react";

interface Props {
  onStart: () => void;
  onOpenTabular?: () => void;
  status: "idle" | "running" | "paused_for_user" | "completed" | "error";
  documentsReady: number;
  documentsTotal: number;
}

export function OrchestraFAB({
  onStart,
  onOpenTabular,
  status,
  documentsReady,
  documentsTotal,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tooltip, setTooltip] = useState(false);

  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const canStart = documentsReady > 0 && !isRunning;

  const label = isRunning
    ? "Çalışıyor..."
    : isCompleted
      ? "Yeniden Başlat"
      : "Süreci Başlat";

  const emoji = isRunning ? "⏳" : isCompleted ? "🔄" : "🎼";

  // Renk state'e göre
  const bg = isRunning
    ? "bg-amber-500 shadow-amber-500/50"
    : isCompleted
      ? "bg-emerald-500 shadow-emerald-500/50"
      : canStart
        ? "bg-[#C9A961] shadow-[#C9A961]/50 hover:shadow-[#C9A961]/70 hover:scale-105"
        : "bg-slate-600 shadow-slate-600/30 cursor-not-allowed";

  const handleClick = () => {
    if (!canStart && !isCompleted) return;
    onStart();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Genişletilmiş menü (opsiyonel — Tabular butonu için) */}
      {expanded && onOpenTabular && (
        <button
          type="button"
          onClick={() => {
            onOpenTabular();
            setExpanded(false);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-white/10 text-slate-200 text-sm shadow-lg hover:bg-slate-700 animate-in slide-in-from-right-2"
        >
          📊 Belge Matrisi
        </button>
      )}

      {/* Ana FAB */}
      <div className="relative">
        {/* Tooltip */}
        {tooltip && !isRunning && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-2 bg-slate-900 border border-[#C9A961]/40 rounded-lg text-xs text-slate-100 shadow-xl">
            {canStart ? (
              <>
                <div className="font-semibold text-[#C9A961]">
                  🎼 12 Ajanlı Orkestrayı Başlat
                </div>
                <div className="text-slate-400 mt-1">
                  {documentsReady} belge işlenmeye hazır
                  {documentsTotal > documentsReady &&
                    ` (${documentsTotal - documentsReady} tanesi işleniyor)`}
                </div>
              </>
            ) : (
              <div className="text-slate-400">
                Önce belge yükleyin ve okunmasını bekleyin
              </div>
            )}
          </div>
        )}

        {/* İkinci menü toggle (küçük çip) */}
        {onOpenTabular && !isRunning && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-800 border border-white/10 text-slate-300 text-xs hover:bg-slate-700 flex items-center justify-center"
            title="Ek seçenekler"
          >
            {expanded ? "×" : "⋯"}
          </button>
        )}

        {/* Belge sayısı çipi (üstte küçük) */}
        {documentsTotal > 0 && !isRunning && (
          <div className="absolute -top-3 right-0 px-2 py-0.5 rounded-full bg-slate-900 border border-[#C9A961]/40 text-[10px] text-[#C9A961] font-semibold shadow">
            {documentsReady}/{documentsTotal} 📄
          </div>
        )}

        <button
          type="button"
          onClick={handleClick}
          onMouseEnter={() => setTooltip(true)}
          onMouseLeave={() => setTooltip(false)}
          disabled={!canStart && !isCompleted}
          className={`${bg} text-[#0A1628] font-bold px-6 py-4 rounded-full shadow-2xl transition-all duration-200 flex items-center gap-2 min-w-[200px] justify-center ${
            isRunning ? "animate-pulse" : ""
          } ${canStart || isCompleted ? "" : "opacity-60"}`}
          aria-label={label}
        >
          <span className="text-xl">{emoji}</span>
          <span className="text-sm uppercase tracking-wider">{label}</span>
        </button>

        {/* Alt yardım metni */}
        {!isRunning && (
          <div className="text-[10px] text-slate-400 text-right mt-1 pr-2">
            {canStart ? (
              <>Kısayol: chat&apos;e <code className="text-[#C9A961]">başla</code> yaz</>
            ) : documentsTotal === 0 ? (
              "📁 Önce belge yükleyin"
            ) : (
              "⏳ Belgeler işleniyor..."
            )}
          </div>
        )}
      </div>
    </div>
  );
}
