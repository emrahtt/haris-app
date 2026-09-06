"use client";

/**
 * HARIS v2 — Vault Panel (PRODUCTION-GRADE, v2)
 *
 * Düzeltme (Faz 13.1.1): HTML iç içe button hatası giderildi
 *   - Dış container artık <div> (önceden <button>'du)
 *   - Tıklama keyboard accessible (role="button" + tabIndex + onKeyDown)
 *   - 🗑 ve 🔄 butonları artık iç içe değil
 */

import { useState } from "react";
import type { VaultDocument } from "@/lib/v2/state/workspace-state";

interface VaultPanelProps {
  documents: VaultDocument[];
  onAddFiles?: () => void;
  onSelectDocument?: (id: string) => void;
  onDeleteDocument?: (id: string) => Promise<void> | void;
  onRetryDocument?: (id: string) => Promise<void> | void;
}

const STATUS_CONFIG: Record<
  VaultDocument["status"],
  { label: string; color: string; bgColor?: string }
> = {
  uploading: { label: "Yükleniyor…", color: "text-slate-400" },
  extracting: {
    label: "🤖 AI okuyor…",
    color: "text-sky-300",
    bgColor: "bg-sky-500/5",
  },
  classifying: {
    label: "🧠 AI sınıflıyor…",
    color: "text-violet-300",
    bgColor: "bg-violet-500/5",
  },
  ready: { label: "✓ Hazır", color: "text-emerald-300" },
  error: { label: "✗ Hata", color: "text-rose-300", bgColor: "bg-rose-500/5" },
};

const CATEGORY_ICONS: Record<string, string> = {
  şikayet_dilekçesi: "📋",
  cevap_dilekçesi: "⚖️",
  bilirkişi_raporu: "🧪",
  tanık_beyanı: "👤",
  sözleşme: "📜",
  tutanak: "📝",
  mahkeme_kararı: "🏛️",
  yazışma: "✉️",
  fatura: "🧾",
  tıbbi_rapor: "🩺",
  uyap_belgesi: "⚖️",
  diğer: "📄",
};

export function VaultPanel({
  documents,
  onAddFiles,
  onSelectDocument,
  onDeleteDocument,
  onRetryDocument,
}: VaultPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [fullTextId, setFullTextId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string, filename: string) => {
    e.stopPropagation();
    if (!confirm(`"${filename}" silinsin mi?`)) return;
    if (!onDeleteDocument) return;
    setActioningId(id);
    try {
      await onDeleteDocument(id);
    } finally {
      setActioningId(null);
    }
  };

  const handleRetry = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onRetryDocument) return;
    setActioningId(id);
    try {
      await onRetryDocument(id);
    } finally {
      setActioningId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    onSelectDocument?.(id);
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-2 opacity-40">📁</div>
        <div className="text-sm text-slate-500 mb-3">Henüz belge yok</div>
        <button
          onClick={onAddFiles}
          className="text-xs px-3 py-1.5 rounded-md border border-[#C9A961]/30 text-[#C9A961] hover:bg-[#C9A961]/10"
        >
          + Belge Ekle
        </button>
      </div>
    );
  }

  // Kategoriye göre grupla
  const grouped = documents.reduce<Record<string, VaultDocument[]>>(
    (acc, doc) => {
      const cat = doc.category ?? "diğer";
      (acc[cat] ??= []).push(doc);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, docs]) => (
        <div key={category}>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <span>{CATEGORY_ICONS[category] ?? "📄"}</span>
            <span>{category.replace(/_/g, " ")}</span>
            <span className="text-slate-600">({docs.length})</span>
          </div>
          <div className="space-y-1">
            {docs.map((doc) => {
              const statusCfg = STATUS_CONFIG[doc.status];
              const isExpanded = expandedId === doc.id;
              const isActioning = actioningId === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`group rounded-md transition ${
                    statusCfg.bgColor ?? ""
                  } ${
                    doc.status === "error"
                      ? "border border-rose-500/30"
                      : "border border-transparent hover:border-white/10"
                  }`}
                >
                  {/* Dış container — div + role="button" + keyboard accessible */}
                  <div
                    role="button"
                    tabIndex={isActioning ? -1 : 0}
                    aria-expanded={isExpanded}
                    aria-disabled={isActioning}
                    onClick={() => !isActioning && toggleExpand(doc.id)}
                    onKeyDown={(e) => {
                      if (isActioning) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpand(doc.id);
                      }
                    }}
                    className={`w-full text-left p-2 hover:bg-white/[0.02] rounded-md ${
                      isActioning ? "opacity-60 cursor-wait" : "cursor-pointer"
                    }`}
                  >
                    {/* Filename + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200 truncate">
                          {doc.filename}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        {doc.status === "error" && onRetryDocument && (
                          <button
                            type="button"
                            onClick={(e) => handleRetry(e, doc.id)}
                            disabled={isActioning}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
                            title="Tekrar dene"
                          >
                            🔄
                          </button>
                        )}
                        {onDeleteDocument && (
                          <button
                            type="button"
                            onClick={(e) =>
                              handleDelete(e, doc.id, doc.filename)
                            }
                            disabled={isActioning}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200"
                            title="Sil"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Status row */}
                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      <span className={`text-[10px] ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      <span className="text-[10px] text-slate-600 shrink-0">
                        {(doc.sizeBytes / 1024).toFixed(0)} KB
                        {doc.pageCount ? ` · ${doc.pageCount}s` : ""}
                      </span>
                    </div>

                    {/* AI Rozeti (model kullanıldıysa) */}
                    {doc.modelUsed && (
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                            doc.extractionMethod?.includes("vision") ||
                            doc.extractionMethod === "image_ocr"
                              ? "border-[#C9A961]/40 bg-[#C9A961]/10 text-[#C9A961]"
                              : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          🤖 {doc.modelUsed}
                        </span>
                        {doc.extractionCost !== undefined &&
                          doc.extractionCost > 0 && (
                            <span className="text-[9px] text-slate-500">
                              ${doc.extractionCost.toFixed(4)}
                            </span>
                          )}
                        {doc.extractionDurationMs &&
                          doc.extractionDurationMs > 1000 && (
                            <span className="text-[9px] text-slate-500">
                              {(doc.extractionDurationMs / 1000).toFixed(1)}s
                            </span>
                          )}
                      </div>
                    )}

                    {/* Özet veya Hata mesajı */}
                    {doc.status === "ready" && doc.summary && (
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {doc.summary}
                      </div>
                    )}
                    {doc.status === "error" && doc.errorMessage && (
                      <div className="text-xs text-rose-200/90 mt-1 line-clamp-3 leading-relaxed">
                        {doc.errorMessage}
                      </div>
                    )}

                    {/* Genişletilmiş detay */}
                    {isExpanded && (doc.extractedText || doc.errorMessage) && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        {doc.errorMessage && doc.status === "error" && (
                          <details className="text-[10px] text-slate-400 mb-2">
                            <summary className="cursor-pointer hover:text-slate-200">
                              🔧 Teknik detay
                            </summary>
                            <pre className="mt-1 text-[9px] bg-black/30 p-2 rounded whitespace-pre-wrap break-all">
                              {doc.extractionMethod &&
                                `Method: ${doc.extractionMethod}\n`}
                              {doc.errorDetail || doc.errorMessage}
                            </pre>
                          </details>
                        )}
                        {doc.extractedText && (
                          <div className="text-[10px] text-slate-400">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-500 uppercase tracking-wider">
                                İçerik {fullTextId === doc.id ? "(TAM)" : "(önizleme)"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">
                                  {doc.extractedText.length.toLocaleString("tr-TR")} karakter
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFullTextId(fullTextId === doc.id ? null : doc.id);
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-[#C9A961]/20 hover:bg-[#C9A961]/30 text-[#C9A961]"
                                >
                                  {fullTextId === doc.id ? "🔼 Kısalt" : "🔽 Tüm metni göster"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard?.writeText(doc.extractedText ?? "");
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                                  title="Tüm metni kopyala"
                                >
                                  📋
                                </button>
                              </div>
                            </div>
                            <div
                              className={`bg-black/20 p-2 rounded ${
                                fullTextId === doc.id ? "max-h-[600px]" : "max-h-40"
                              } overflow-y-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed`}
                            >
                              {fullTextId === doc.id
                                ? doc.extractedText
                                : doc.extractedText.slice(0, 1500) +
                                  (doc.extractedText.length > 1500
                                    ? `\n\n[... ${(
                                        doc.extractedText.length - 1500
                                      ).toLocaleString("tr-TR")} karakter daha var, "Tüm metni göster" tıklayın]`
                                    : "")}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={onAddFiles}
        className="w-full text-xs px-3 py-2 rounded-md border border-dashed border-white/15 text-slate-500 hover:border-[#C9A961]/40 hover:text-[#C9A961] transition"
      >
        + Belge Ekle
      </button>
    </div>
  );
}
