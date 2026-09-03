"use client";

/**
 * HARIS v2 — V1 Legacy Bridge (Faz 13.5.6)
 *
 * V2 Matter Workspace'ten V1'in eski özelliklerine erişim + V2→V1 export.
 *
 * Dikey işlem çubuğunda (OrchestraRail) kullanıldığında (`vertical`) etiket,
 * çubuktaki diğer öğelerle aynı şekilde DİKEY yazılır ve menü, çubuğun
 * soluna (Canvas tarafına) açılır.
 */

import Link from "next/link";
import { useState } from "react";

const V1_LINKS = [
  {
    href: "/research",
    icon: "🔬",
    label: "Türk Hukuku RAG",
    desc: "31 belge korpusunda semantic arama (yeni sekme)",
  },
  {
    href: "/library",
    icon: "📚",
    label: "Örnek Dilekçe Kütüphanesi",
    desc: "V1 hazır şablonlar",
  },
  {
    href: "/calendar",
    icon: "📅",
    label: "Duruşma Takvimi",
    desc: "Süre ve duruşma takibi",
  },
  {
    href: "/dashboard",
    icon: "📊",
    label: "V1 Klasik Panel",
    desc: "Eski dashboard (referans)",
  },
];

interface Props {
  workspaceId?: string;
  vertical?: boolean;
}

export function V1Bridge({ workspaceId, vertical }: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    caseId: string;
    caseUrl: string;
  } | null>(null);

  const handleExport = async () => {
    if (!workspaceId) return;
    if (
      !confirm(
        "Bu workspace'i V1 sistemine (cases + documents + petitions) kopyalayalım mı?\n\nMevcut V2 verisi silinmez, sadece V1'e klonlanır."
      )
    )
      return;
    setExporting(true);
    setExportResult(null);
    try {
      const res = await fetch(
        `/api/v2/workspaces/${workspaceId}/export-to-v1`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json();
        alert(`Export hatası: ${err.error}`);
        return;
      }
      const data = await res.json();
      setExportResult({ caseId: data.caseId, caseUrl: data.caseUrl });
    } catch (e) {
      alert(`Hata: ${String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const menu = (
    <>
      {/* V2 → V1 Export butonu */}
      {workspaceId && (
        <>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-start gap-2 px-3 py-2 hover:bg-[#C9A961]/10 text-left border-b border-white/5"
          >
            <span className="text-lg">📤</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#C9A961]">
                {exporting ? "Kopyalanıyor…" : "V1'e Aktar"}
              </div>
              <div className="text-[10px] text-slate-500">
                Bu workspace'i V1'in cases tablosuna kopyala
              </div>
            </div>
          </button>
          {exportResult && (
            <div className="px-3 py-2 bg-emerald-500/5 border-b border-white/5">
              <div className="text-[10px] text-emerald-300 mb-1">
                ✅ V1'e aktarıldı!
              </div>
              <Link
                href={exportResult.caseUrl as never}
                target="_blank"
                className="text-[11px] text-emerald-200 hover:underline"
              >
                V1 case'i aç → {exportResult.caseId.slice(0, 8)}...
              </Link>
            </div>
          )}
        </>
      )}
      {V1_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href as never}
          target="_blank"
          rel="noopener"
          className="flex items-start gap-2 px-3 py-2 hover:bg-white/5 text-slate-300"
        >
          <span className="text-lg">{link.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{link.label}</div>
            <div className="text-[10px] text-slate-500">{link.desc}</div>
          </div>
          <span className="text-[10px] text-slate-600">↗</span>
        </Link>
      ))}
      <div className="mt-1 pt-1 border-t border-white/5 px-3 py-1.5 text-[9px] text-slate-600">
        V1 araçlar yeni sekmede açılır, workspace kaybolmuyor.
      </div>
    </>
  );

  // ── Dikey çubuk varyantı: dikey etiket + Canvas tarafına açılan menü ──
  if (vertical) {
    return (
      <div className="relative flex-none border-t border-white/10">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          title="V1 klasik araçlar"
          aria-label="V1 Araçlar"
          className={`w-full flex items-center justify-center py-3 min-h-[5.5rem] transition ${
            open
              ? "bg-[#C9A961]/15 text-[#C9A961]"
              : "text-slate-300 hover:bg-white/5"
          }`}
        >
          <span
            className="text-[10px] font-semibold tracking-wide whitespace-nowrap"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            🔗 V1 Araçlar
          </span>
          <span className="absolute right-1.5 top-1.5 text-[8px] text-slate-500">
            {open ? "×" : "◂"}
          </span>
        </button>
        {open && (
          <div className="absolute right-full bottom-0 mr-2 w-72 bg-[#0E1B30] border border-white/15 rounded-lg shadow-xl z-50 py-1 max-h-[26rem] overflow-y-auto">
            {menu}
          </div>
        )}
      </div>
    );
  }

  // ── Yatay (eski) varyant ──
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5 text-slate-400"
        title="V1 klasik araçlar"
      >
        🔗 V1 Araçlar {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-[#0E1B30] border border-white/15 rounded-lg shadow-xl z-50 py-1">
          {menu}
        </div>
      )}
    </div>
  );
}
