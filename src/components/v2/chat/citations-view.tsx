"use client";

/**
 * HARIS v2 — Citations View (Faz 13.7)
 *
 * Chat mesajı altında AI'ın kullandığı kaynakları tıklanabilir chip'ler
 * halinde gösterir. Harvey/CoCounsel citation pattern.
 */

import { useState } from "react";

export interface MatterCitation {
  documentId: string;
  filename: string;
  sectionTitle?: string;
  pageNumber?: number;
  snippet: string;
  similarity: number;
}

export interface GlobalCitation {
  id: string;
  category: string;
  title: string;
  court?: string;
  caseNo?: string;
  lawName?: string;
  articleNo?: string;
  date?: string;
  url?: string;
  snippet: string;
  similarity: number;
}

export interface Citations {
  matter: MatterCitation[];
  global: GlobalCitation[];
  totalHits: number;
  durationMs?: number;
}

interface Props {
  citations: Citations;
}

const CATEGORY_LABELS: Record<string, string> = {
  yargitay: "Yargıtay",
  danistay: "Danıştay",
  aym: "AYM",
  aihm: "AİHM",
  mevzuat: "Mevzuat",
  doktrin: "Doktrin",
};

const CATEGORY_COLORS: Record<string, string> = {
  yargitay: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  danistay: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  aym: "text-red-300 border-red-500/40 bg-red-500/10",
  aihm: "text-blue-300 border-blue-500/40 bg-blue-500/10",
  mevzuat: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  doktrin: "text-violet-300 border-violet-500/40 bg-violet-500/10",
};

export function CitationsView({ citations }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!citations || citations.totalHits === 0) return null;

  const toggle = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  return (
    <div className="mt-2 border-t border-white/5 pt-2 space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider">
        <span>📎 Kaynaklar</span>
        <span className="opacity-60">
          {citations.matter.length} dava belgesi · {citations.global.length} mevzuat
        </span>
      </div>

      {/* MATTER CITATIONS */}
      {citations.matter.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {citations.matter.map((c, i) => {
            const id = `matter-${i}`;
            const isOpen = expanded === id;
            return (
              <div key={id} className="w-full">
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="text-[11px] px-2 py-1 rounded border border-[#C9A961]/40 bg-[#C9A961]/10 text-[#C9A961] hover:bg-[#C9A961]/20 transition inline-flex items-center gap-1.5 max-w-full"
                  title={`Benzerlik: ${(c.similarity * 100).toFixed(0)}%`}
                >
                  <span className="opacity-70">📄</span>
                  <span className="truncate max-w-[280px]">
                    {c.filename}
                    {c.sectionTitle && ` · ${c.sectionTitle}`}
                    {c.pageNumber && ` · s.${c.pageNumber}`}
                  </span>
                  <span className="opacity-60 text-[9px]">
                    {(c.similarity * 100).toFixed(0)}%
                  </span>
                  <span className="opacity-60">{isOpen ? "▼" : "▶"}</span>
                </button>
                {isOpen && (
                  <div className="mt-1 p-2 text-[11px] rounded bg-slate-900/80 border border-[#C9A961]/20 text-slate-300 italic whitespace-pre-wrap">
                    &ldquo;{c.snippet}
                    {c.snippet.length >= 200 ? "..." : ""}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* GLOBAL CITATIONS */}
      {citations.global.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {citations.global.map((c, i) => {
            const id = `global-${i}`;
            const isOpen = expanded === id;
            const color =
              CATEGORY_COLORS[c.category] ??
              "text-slate-300 border-slate-500/40 bg-slate-500/10";
            const label = CATEGORY_LABELS[c.category] ?? c.category;
            return (
              <div key={id} className="w-full">
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className={`text-[11px] px-2 py-1 rounded border transition inline-flex items-center gap-1.5 max-w-full hover:opacity-80 ${color}`}
                  title={`Benzerlik: ${(c.similarity * 100).toFixed(0)}%`}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="truncate max-w-[260px]">
                    {c.lawName ?? c.court ?? c.title}
                    {c.articleNo && ` m.${c.articleNo}`}
                    {c.caseNo && ` · ${c.caseNo}`}
                    {c.date && ` · ${c.date}`}
                  </span>
                  <span className="opacity-60 text-[9px]">
                    {(c.similarity * 100).toFixed(0)}%
                  </span>
                  <span className="opacity-60">{isOpen ? "▼" : "▶"}</span>
                </button>
                {isOpen && (
                  <div className="mt-1 p-2 text-[11px] rounded bg-slate-900/80 border-slate-700 text-slate-300 space-y-1">
                    <div className="font-medium text-slate-200">{c.title}</div>
                    <div className="italic whitespace-pre-wrap opacity-90">
                      &ldquo;{c.snippet}
                      {c.snippet.length >= 200 ? "..." : ""}&rdquo;
                    </div>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1 text-[10px] underline opacity-80 hover:opacity-100"
                      >
                        🔗 Kaynak
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
