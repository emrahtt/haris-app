"use client";

/**
 * Dikey işlem çubuğu — Matter (sağ) panelin soluna yapışık.
 * Yatay üst çubuğun 90° döndürülmüş hali: "İşlemi Başlat" en altta,
 * diğer menüler yukarı doğru.
 */

import { V1Bridge } from "@/components/v2/layout/v1-bridge";
import { HelpTips } from "@/components/v2/layout/help-tips";

interface Props {
  workspaceId: string;
  orchestraStatus: string;
  isOrchestrating: boolean;
  documentsCount: number;
  onStart: () => void;
  onTabular: () => void;
  onShare: () => void;
  onSettings: () => void;
}

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

export function OrchestraRail({
  workspaceId,
  orchestraStatus,
  isOrchestrating,
  documentsCount,
  onStart,
  onTabular,
  onShare,
  onSettings,
}: Props) {
  const canStart =
    !isOrchestrating &&
    orchestraStatus !== "running" &&
    documentsCount > 0;

  const startLabel =
    orchestraStatus === "running"
      ? "Çalışıyor…"
      : orchestraStatus === "completed"
        ? "Yeniden Başlat"
        : "İşlemi Başlat";

  return (
    <div className="flex flex-col-reverse items-stretch w-11 shrink-0 border-l border-[#C9A961]/40 bg-[#07101c]">
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        title={startLabel}
        className={`flex-none flex items-center justify-center py-3 min-h-[7.5rem] transition ${
          canStart
            ? "bg-[#C9A961] text-[#0A1628] hover:bg-[#e6c479]"
            : "bg-white/5 text-slate-500 cursor-not-allowed"
        }`}
      >
        <VerticalLabel>
          {orchestraStatus === "running" ? "⏳ " : "🎼 "}
          {startLabel}
        </VerticalLabel>
      </button>

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
