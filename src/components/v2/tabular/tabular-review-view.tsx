"use client";

/**
 * HARIS v2 — Tabular Review (Legora signature feature)
 *
 * Belgeleri yan yana inceleyen matris. Her hücrede kaynak referans + çelişki
 * uyarısı. Kullanıcı kolon ekler/silebilir, AI çağrılır.
 */

import { useState } from "react";
import type { VaultDocument } from "@/lib/v2/state/workspace-state";

interface TabularColumn {
  id: string;
  question: string;
}

interface TabularCell {
  value: string;
  sourceRef?: string;
  confidence?: "high" | "medium" | "low";
  conflict?: boolean;
}

interface TabularReview {
  columns: TabularColumn[];
  rows: Record<string, Record<string, TabularCell>>;
}

interface Props {
  workspaceId: string;
  documents: VaultDocument[];
  onClose: () => void;
}

const DEFAULT_COLUMNS: TabularColumn[] = [
  { id: "tarih", question: "Belge tarihi nedir?" },
  { id: "taraflar", question: "Belgede geçen taraflar kimlerdir?" },
  { id: "tutar", question: "Belirtilen para tutarı/bedel var mı?" },
  { id: "ozet", question: "1 cümle özet" },
];

export function TabularReviewView({ workspaceId, documents, onClose }: Props) {
  const [columns, setColumns] = useState<TabularColumn[]>(DEFAULT_COLUMNS);
  const [review, setReview] = useState<TabularReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");

  const addColumn = () => {
    if (!newQuestion.trim()) return;
    const id = `col_${Date.now()}`;
    setColumns([...columns, { id, question: newQuestion.trim() }]);
    setNewQuestion("");
  };

  const removeColumn = (id: string) => {
    setColumns(columns.filter((c) => c.id !== id));
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v2/workspaces/${workspaceId}/tabular`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columns }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReview(data.review);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0E1B30] border border-white/15 rounded-xl max-w-6xl w-full max-h-[92vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl font-bold text-[#C9A961]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            📊 Belge Matrisi (Tabular Review)
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="text-xs text-slate-400 mb-4">
          {documents.length} belgeyi yan yana inceleyin. Her hücre kaynak
          belgenin ilgili pasajına işaret eder. Çelişen değerler ⚠️ ile
          işaretlenir.
        </div>

        {/* Kolon yönetimi */}
        <div className="mb-4 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
            Sorularınız ({columns.length})
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {columns.map((col) => (
              <div
                key={col.id}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-[#C9A961]/10 border border-[#C9A961]/30 text-[#C9A961]"
              >
                <span>{col.question}</span>
                <button
                  onClick={() => removeColumn(col.id)}
                  className="ml-1 hover:text-rose-300"
                  title="Sil"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addColumn()}
              placeholder="Yeni soru ekle (örn. 'İmza var mı?')"
              className="flex-1 px-3 py-1.5 rounded text-sm bg-black/30 border border-white/10 text-slate-100 placeholder:text-slate-500"
            />
            <button
              onClick={addColumn}
              disabled={!newQuestion.trim()}
              className="px-3 py-1.5 rounded text-sm border border-white/15 hover:bg-white/5"
            >
              + Ekle
            </button>
          </div>
        </div>

        {/* Çalıştır */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={runAnalysis}
            disabled={loading || columns.length === 0 || documents.length === 0}
            className="px-5 py-2 rounded bg-[#C9A961] text-[#0A1628] font-semibold text-sm hover:bg-[#e6c479] disabled:opacity-50"
          >
            {loading
              ? `${documents.length} belgeyi analiz ediyorum…`
              : "🔍 Matrisi Üret"}
          </button>
          {error && (
            <span className="text-xs text-rose-300">Hata: {error}</span>
          )}
        </div>

        {/* Tablo */}
        {review && (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
                    Belge
                  </th>
                  {review.columns.map((col) => (
                    <th
                      key={col.id}
                      className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10 border-l border-white/5"
                    >
                      {col.question}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const cells = review.rows[doc.id] || {};
                  return (
                    <tr key={doc.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-xs border-b border-white/5 max-w-[180px]">
                        <div className="font-medium truncate">{doc.filename}</div>
                        <div className="text-[10px] text-slate-500">
                          {doc.category}
                        </div>
                      </td>
                      {review.columns.map((col) => {
                        const cell = cells[col.id];
                        return (
                          <td
                            key={col.id}
                            className={`px-3 py-2 text-xs border-b border-white/5 border-l border-white/5 ${
                              cell?.conflict ? "bg-amber-500/10" : ""
                            }`}
                            title={
                              cell?.sourceRef
                                ? `Kaynak: ${cell.sourceRef}`
                                : undefined
                            }
                          >
                            <div className="flex items-start gap-1">
                              {cell?.conflict && <span title="Çelişki">⚠️</span>}
                              <div className="flex-1">
                                <div className="text-slate-200">
                                  {cell?.value || "—"}
                                </div>
                                {cell?.sourceRef && (
                                  <div className="text-[9px] text-slate-500 mt-0.5">
                                    {cell.sourceRef}
                                  </div>
                                )}
                                {cell?.confidence === "low" && (
                                  <div className="text-[9px] text-amber-400 mt-0.5">
                                    düşük güven
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!review && !loading && (
          <div className="text-center py-12 text-slate-500 text-sm">
            <div className="text-3xl mb-2">📊</div>
            Sorularınızı belirleyin ve &ldquo;Matrisi Üret&rdquo; deyin.
            Her belgeyi tek tek inceleyip cevapları çıkaracağım.
          </div>
        )}
      </div>
    </div>
  );
}
