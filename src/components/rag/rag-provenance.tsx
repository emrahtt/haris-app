"use client";

import { useEffect, useState } from "react";
import { Database, Loader2, ChevronRight } from "lucide-react";
import type { RagProvenance } from "@/hooks/use-agent-stream";
import type { SearchResultItem } from "@/hooks/use-research-search";

interface Props {
  rag: RagProvenance;
  /** Kompakt mod — sadece sayım göster */
  compact?: boolean;
}

/**
 * AI yanıtının yanında "Bu kaynaklara dayanılarak üretildi" paneli.
 * Header'lardan gelen id'leri /api/research/search ile resolve eder
 * (tek tek değil, query=id semantik aramayla — production'da /api/research/byIds endpoint'i eklenecek).
 *
 * Burada basitleştirmek için tüm korpusu index endpoint'inden çekip filtreliyoruz.
 */
export function RagProvenancePanel({ rag, compact = false }: Props) {
  const [docs, setDocs] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (rag.ids.length === 0) {
      setLoading(false);
      return;
    }
    // Her id için ayrı arama yapmak yerine, hepsini tek sorgu olarak gönder
    // (basit demo — production'da /api/research/byIds yapılır)
    Promise.all(
      rag.ids.map((id) =>
        fetch("/api/research/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: id, topK: 30 }),
        })
          .then((r) => r.json())
          .then((d) => d.results?.find((r: SearchResultItem) => r.id === id) || null)
      )
    )
      .then((items) => {
        setDocs(items.filter(Boolean));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rag.ids]);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[10.5px] text-[var(--color-gold-bright)] bg-[var(--color-gold)]/10 px-2 py-0.5 rounded-full">
        <Database size={10} /> {rag.count} kaynak
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[var(--color-info)]/[0.06] to-[var(--color-info)]/[0.02] border border-[var(--color-info)]/30 rounded-lg p-3 my-3">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Database size={14} className="text-[var(--color-info)] flex-shrink-0" />
        <div className="flex-1 text-[12px]">
          <strong className="text-[var(--color-info)]">{rag.count} gerçek kaynak</strong>{" "}
          <span className="text-[var(--color-text-2)]">
            kullanılarak üretildi (RAG)
          </span>
        </div>
        <ChevronRight
          size={14}
          className={`text-[var(--color-text-3)] transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--color-info)]/20 space-y-1.5">
          {loading && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-3)]">
              <Loader2 size={11} className="animate-spin" /> Kaynaklar yükleniyor...
            </div>
          )}

          {!loading &&
            docs.map((d, i) => (
              <div
                key={d.id}
                className="flex items-start gap-2 text-[11px] bg-[var(--color-bg-1)] rounded p-2"
              >
                <span className="text-[var(--color-gold-bright)] font-mono">
                  [{i + 1}]
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--color-text)] font-medium truncate">
                    {d.title}
                  </div>
                  <div className="text-[10.5px] text-[var(--color-text-3)] mt-0.5">
                    {d.court || d.lawName} •{" "}
                    <span className="font-mono">
                      {d.caseNo || d.articleNo}
                    </span>{" "}
                    {d.date && `• ${d.date}`}
                  </div>
                </div>
                <span className="text-[10px] text-[var(--color-ok)] font-medium whitespace-nowrap">
                  %{(rag.scores[i] * 100 || 0).toFixed(0)}
                </span>
              </div>
            ))}

          {!loading && docs.length === 0 && (
            <div className="text-[11px] text-[var(--color-text-3)] italic">
              Kaynak detayları yüklenemedi.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
