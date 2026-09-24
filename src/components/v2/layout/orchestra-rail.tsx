"use client";

/**
 * Dikey işlem çubuğu — Matter (sağ) panelin soluna yapışık.
 * Yatay üst çubuğun 90° döndürülmüş hali: "İşlemi Başlat" en altta,
 * diğer menüler yukarı doğru.
 *
 * FAZ 16.6 EKLEMELERİ:
 *   - Çalışırken dönen animasyon + hangi aşamada olduğu + geçen süre
 *   - ⏹ Durdur butonu (aşamalı orkestra sayesinde gerçekten durdurur)
 *   - "stopped" durumu
 */

import { V1Bridge } from "@/components/v2/layout/v1-bridge";
import { HelpTips } from "@/components/v2/layout/help-tips";

interface Props {
  workspaceId: string;
  orchestraStatus: string;
  isOrchestrating: boolean;
  documentsCount: number;
  onStart: () => void;
  /** Faz 16.6: süreci durdur */
  onStop?: () => void;
  /** Faz 16.6: şu an çalışan aşama (round1 | round2 | draft | quality) */
  currentStage?: string;
  /** Faz 16.6: toplam geçen saniye */
  elapsedSec?: number;
  onTabular: () => void;
  onShare: () => void;
  onSettings: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  round1: "TUR 1/4 · Analiz",
  round2: "TUR 2/4 · Eleştiri",
  draft: "TUR 3/4 · Dilekçe",
  quality: "TUR 4/4 · Kalite",
};

function VerticalLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-semibold tracking-wide whitespace-nowrap"
      style={{
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
      }}
    >
      {children}
    </span>
  );
}

/** Dönen halka animasyonu (çalışıyor göstergesi) */
function Spinner() {
  return (
    <span
      className="block w-4 h-4 rounded-full animate-spin"
      style={{
        border: "2px solid rgba(201,169,97,0.25)",
        borderTopColor: "#C9A961",
      }}
    />
  );
}

export function OrchestraRail({
  workspaceId,
  orchestraStatus,
  isOrchestrating,
  documentsCount,
  onStart,
  onStop,
  currentStage,
  elapsedSec = 0,
  onTabular,
  onShare,
  onSettings,
}: Props) {
  const isRunning = isOrchestrating || orchestraStatus === "running";
  // FAZ 16.8: orchestraStatus "running"de takılı kalmış olsa bile
  // isOrchestrating false ise başlatmaya izin ver (eskiden kilitleniyordu)
  const canStart = !isOrchestrating && documentsCount > 0;

  const startLabel =
    orchestraStatus === "completed"
      ? "Yeniden Başlat"
      : orchestraStatus === "error"
        ? "Tekrar Dene"
        : orchestraStatus === "stopped"
          ? "Devam Et"
          : "İşlemi Başlat";

  const stageLabel = currentStage
    ? STAGE_LABELS[currentStage] ?? currentStage
    : "Hazırlanıyor";

  return (
    <div className="flex flex-col-reverse items-stretch w-11 shrink-0 border-l border-[#C9A961]/40 bg-[#07101c]">
      {/* ── EN ALT: Başlat ─────────────────────────────────── */}
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        title={canStart ? startLabel : "Belge yüklemeden süreç başlatılamaz"}
        className={`flex-none flex items-center justify-center py-3 min-h-[7.5rem] transition ${
          canStart
            ? "bg-[#C9A961] text-[#0A1628] hover:bg-[#e6c479]"
            : "bg-white/5 text-slate-500 cursor-not-allowed"
        }`}
      >
        <VerticalLabel>🎼 {startLabel}</VerticalLabel>
      </button>

      {/* ── Durdur — FAZ 16.7: her zaman görünür, çalışmıyorsa pasif ── */}
      <button
        type="button"
        onClick={onStop}
        disabled={!isRunning || !onStop}
        title={isRunning ? "Süreci durdur" : "Çalışan bir süreç yok"}
        className={`flex-none flex items-center justify-center py-3 min-h-[6rem] border-t border-white/10 transition ${
          isRunning
            ? "bg-red-600 text-white hover:bg-red-500 animate-pulse"
            : "bg-white/[0.03] text-slate-600 cursor-not-allowed"
        }`}
      >
        <VerticalLabel>⏹ Durdur</VerticalLabel>
      </button>

      {/* ── Çalışıyor göstergesi: dönen halka + aşama + süre ── */}
      {isRunning && (
        <div
          className="flex-none flex flex-col items-center justify-center gap-2 py-3 border-t border-white/10 bg-[#C9A961]/5"
          title={`${stageLabel} · ${elapsedSec} saniye`}
        >
          <Spinner />
          <VerticalLabel>
            {stageLabel} · {elapsedSec}sn
          </VerticalLabel>
        </div>
      )}

      {/* ── Tamamlandı / hata durumu rozeti ───────────────── */}
      {!isRunning &&
        (orchestraStatus === "completed" ||
          orchestraStatus === "error" ||
          orchestraStatus === "stopped") && (
          <div
            className={`flex-none flex items-center justify-center py-2 border-t border-white/10 ${
              orchestraStatus === "completed"
                ? "text-emerald-300"
                : orchestraStatus === "error"
                  ? "text-red-300"
                  : "text-slate-400"
            }`}
            title={
              orchestraStatus === "completed"
                ? "Süreç tamamlandı"
                : orchestraStatus === "error"
                  ? "Süreç hatayla durdu — sohbet akışındaki mesaja bak"
                  : "Süreç durduruldu"
            }
          >
            <VerticalLabel>
              {orchestraStatus === "completed"
                ? "✓ Tamamlandı"
                : orchestraStatus === "error"
                  ? "✕ Hata"
                  : "⏹ Durduruldu"}
            </VerticalLabel>
          </div>
        )}

      <button
        type="button"
        onClick={onTabular}
        disabled={documentsCount === 0}
        title="Belge matrisi"
        className="flex-none flex items-center justify-center py-3 min-h-[5.5rem] border-t border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-40"
      >
        <VerticalLabel>📊 Matris</VerticalLabel>
      </button>

      <button
        type="button"
        onClick={onShare}
        title="Paylaş"
        className="flex-none flex items-center justify-center py-3 min-h-[5rem] border-t border-white/10 text-slate-300 hover:bg-white/5"
      >
        <VerticalLabel>🤝 Paylaş</VerticalLabel>
      </button>

      <V1Bridge workspaceId={workspaceId} vertical />

      <button
        type="button"
        onClick={onSettings}
        title="Ayarlar"
        className="flex-none flex items-center justify-center py-3 min-h-[5rem] border-t border-white/10 text-slate-300 hover:bg-white/5"
      >
        <VerticalLabel>⚙️ Ayarlar</VerticalLabel>
      </button>

      {/* Küçük dikey Yardım — Ayarlar'ın yanında (eski büyük sarı buton kaldırıldı) */}
      <HelpTips />

      <div className="flex-1 min-h-2 border-t border-white/5" />
    </div>
  );
}
