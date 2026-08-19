"use client";

/**
 * HARIS v2 — Conflict Banner (Faz 13.6)
 *
 * Yeni dava / party eklerken çıkar çatışması yakalanınca kırmızı banner.
 * Kullanıcı onaylarsa devam eder, dialog log'a düşer.
 */

import { useState } from "react";
import type { ConflictHit } from "@/lib/v2/conflict/db";

interface Props {
  hits: ConflictHit[];
  onOverride: (justification: string) => Promise<void> | void;
  onCancel: () => void;
  onDismiss?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  muvekkil: "Müvekkil",
  karsi_taraf: "Karşı Taraf",
  ilgili_taraf: "İlgili Taraf",
  tanik: "Tanık",
  bilirkisi: "Bilirkişi",
};

const SEVERITY_STYLES = {
  critical: {
    border: "border-red-500/60",
    bg: "bg-red-950/40",
    text: "text-red-200",
    accent: "text-red-400",
    badge: "bg-red-500/20 text-red-200 border-red-500/40",
    icon: "⚠️",
    title: "KRİTİK ÇIKAR ÇATIŞMASI",
  },
  warning: {
    border: "border-amber-500/60",
    bg: "bg-amber-950/40",
    text: "text-amber-200",
    accent: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    icon: "⚡",
    title: "UYARI: Muhtemel Çakışma",
  },
  info: {
    border: "border-sky-500/40",
    bg: "bg-sky-950/30",
    text: "text-sky-200",
    accent: "text-sky-400",
    badge: "bg-sky-500/20 text-sky-200 border-sky-500/40",
    icon: "ℹ️",
    title: "Bilgi: İlişkili Kayıt",
  },
};

export function ConflictBanner({ hits, onOverride, onCancel, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (hits.length === 0) return null;

  const critical = hits.filter((h) => h.severity === "critical");
  const warning = hits.filter((h) => h.severity === "warning");
  const info = hits.filter((h) => h.severity === "info");
  const topSeverity = critical.length > 0 ? "critical" : warning.length > 0 ? "warning" : "info";
  const style = SEVERITY_STYLES[topSeverity];

  const handleOverride = async () => {
    if (topSeverity === "critical" && justification.trim().length < 20) {
      alert(
        "Kritik çıkar çatışmalarını atlamak için en az 20 karakterlik bir gerekçe yazmanız zorunludur (baro denetim kaydı için)."
      );
      return;
    }
    setSubmitting(true);
    try {
      await onOverride(justification.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-lg border-2 ${style.border} ${style.bg} p-4 shadow-lg`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{style.icon}</span>
            <h3 className={`text-lg font-bold ${style.text}`}>{style.title}</h3>
          </div>
          <p className={`text-sm ${style.text} mb-3`}>
            Bu kişi <strong>{hits.length}</strong> önceki davada zaten kayıtlı.{" "}
            {critical.length > 0 && (
              <span className="font-bold">
                {critical.length} kritik çakışma var — devam etmeden önce mutlaka
                kontrol edin.
              </span>
            )}
          </p>

          {/* Özet çipler */}
          <div className="flex flex-wrap gap-2 mb-3">
            {critical.length > 0 && (
              <span className="text-xs px-2 py-1 rounded border bg-red-500/20 text-red-200 border-red-500/40">
                {critical.length} Kritik (Karşı Taraf)
              </span>
            )}
            {warning.length > 0 && (
              <span className="text-xs px-2 py-1 rounded border bg-amber-500/20 text-amber-200 border-amber-500/40">
                {warning.length} Uyarı (Müvekkil)
              </span>
            )}
            {info.length > 0 && (
              <span className="text-xs px-2 py-1 rounded border bg-sky-500/20 text-sky-200 border-sky-500/40">
                {info.length} Bilgi
              </span>
            )}
          </div>

          {/* Detay listesi */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={`text-xs underline ${style.accent} hover:opacity-80 mb-3`}
          >
            {expanded ? "▼ Detayları gizle" : "▶ Detayları göster"}
          </button>

          {expanded && (
            <div className="space-y-2 mb-3 border-t border-slate-700 pt-3">
              {hits.map((h) => {
                const s = SEVERITY_STYLES[h.severity];
                return (
                  <div
                    key={h.partyId}
                    className={`text-sm ${s.text} border-l-4 ${s.border} pl-3 py-1`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded border ${s.badge}`}>
                        {ROLE_LABELS[h.partyRole] ?? h.partyRole}
                      </span>
                      <span className="font-medium">{h.partyName}</span>
                    </div>
                    <div className="text-xs mt-1 opacity-90">
                      📁 <em>{h.workspaceTitle}</em>
                      {h.caseType && ` · ${h.caseType}`}
                      <span className="ml-2 opacity-70">
                        (
                        {h.matchType === "tc_match"
                          ? "TC eşleşmesi"
                          : h.matchType === "exact_name"
                            ? "isim eşleşmesi"
                            : "benzer isim"}
                        )
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Kritik ise justification zorunlu */}
          {(topSeverity === "critical" || topSeverity === "warning") && (
            <div className="mb-3">
              <label className={`block text-xs ${style.text} mb-1 font-medium`}>
                Gerekçe {topSeverity === "critical" && "(zorunlu, min 20 karakter)"}
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Örn: Önceki davada temsil sona ermiş, müvekkil onayı alındı..."
                className="w-full text-sm bg-slate-900/60 border border-slate-700 rounded p-2 text-slate-100 placeholder:text-slate-500 focus:border-[#C9A961] focus:outline-none"
                rows={2}
              />
              <div className={`text-xs mt-1 ${style.accent}`}>
                Bu gerekçe baro denetim kayıtları için saklanır.
              </div>
            </div>
          )}

          {/* Aksiyon butonları */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleOverride}
              disabled={submitting}
              className={`px-4 py-2 text-sm rounded font-medium transition ${
                topSeverity === "critical"
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : topSeverity === "warning"
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-[#C9A961] hover:bg-[#B89751] text-[#0A1628]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? "Kaydediliyor..." : "Anladım, Devam Et"}
            </button>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`${style.accent} hover:opacity-80 text-xl leading-none`}
            aria-label="Kapat"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
