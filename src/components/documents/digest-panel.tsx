"use client";

import { Card } from "@/components/ui/card";
import type { CaseDigest } from "@/lib/ingest/digest";
import { LEGAL_DOC_TYPE_LABELS, type LegalDocType } from "@/lib/ingest/types";
import { Calendar, Users, Hash, FileBarChart } from "lucide-react";

export function DigestPanel({ digest }: { digest: CaseDigest }) {
  return (
    <>
      {/* Genel istatistik */}
      <Card>
        <h4 className="font-serif text-[var(--color-gold-bright)] text-[15px] mb-3 flex items-center gap-2">
          <FileBarChart size={14} /> Dava Sindirim Raporu
        </h4>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <Stat label="Belge" value={digest.readyDocs} />
          <Stat label="Kritik" value={digest.criticalDocs} highlight="danger" />
          <Stat
            label="Token (~)"
            value={`${(digest.estimatedTokens / 1000).toFixed(1)}K`}
          />
        </div>
        <div className="text-[10.5px] text-[var(--color-text-3)] text-center">
          Toplam {(digest.totalChars / 1000).toFixed(1)}K karakter işlendi
        </div>

        {/* Belge tipi dağılımı */}
        {Object.keys(digest.docTypeDistribution).length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-line)]">
            <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider mb-2">
              Tür Dağılımı
            </div>
            <div className="space-y-1">
              {Object.entries(digest.docTypeDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between text-[11.5px]">
                    <span className="text-[var(--color-text-2)]">
                      {LEGAL_DOC_TYPE_LABELS[type as LegalDocType] || type}
                    </span>
                    <span className="text-[var(--color-gold-bright)] font-medium">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>

      {/* Kronoloji */}
      {digest.timeline.length > 0 && (
        <Card>
          <h4 className="font-serif text-[var(--color-gold-bright)] text-[15px] mb-3 flex items-center gap-2">
            <Calendar size={14} /> Otomatik Kronoloji
          </h4>
          <div className="relative pl-4">
            <div className="absolute left-1 top-1 bottom-1 w-0.5 bg-[var(--color-line-2)]" />
            {digest.timeline.slice(0, 10).map((e, i) => (
              <div key={i} className="relative pb-3 last:pb-0">
                <div
                  className={`absolute -left-3 top-1 w-2.5 h-2.5 rounded-full border-2 ${
                    e.isCritical
                      ? "bg-[var(--color-danger)] border-[var(--color-danger)]"
                      : "bg-[var(--color-bg-1)] border-[var(--color-gold)]"
                  }`}
                />
                <div className="text-[10.5px] text-[var(--color-gold-bright)] font-medium font-mono">
                  {e.date}
                </div>
                <div className="text-[12px] text-[var(--color-text)] line-clamp-2 mt-0.5">
                  {e.title}
                </div>
                <div className="text-[10px] text-[var(--color-text-3)] mt-0.5 truncate">
                  📄 {e.sourceDocName}
                </div>
              </div>
            ))}
            {digest.timeline.length > 10 && (
              <div className="text-[10.5px] text-[var(--color-text-3)] mt-2 pl-1">
                +{digest.timeline.length - 10} daha...
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Taraflar */}
      {digest.parties.length > 0 && (
        <Card>
          <h4 className="font-serif text-[var(--color-gold-bright)] text-[15px] mb-3 flex items-center gap-2">
            <Users size={14} /> Tespit Edilen Taraflar
          </h4>
          <div className="space-y-1.5">
            {digest.parties.slice(0, 8).map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between text-[11.5px]"
              >
                <span className="text-[var(--color-text-2)] truncate flex-1">
                  {p.name}
                </span>
                <span className="text-[10.5px] text-[var(--color-text-3)] ml-2">
                  {p.count} belge
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Anahtar kelimeler */}
      {digest.keywords.length > 0 && (
        <Card>
          <h4 className="font-serif text-[var(--color-gold-bright)] text-[15px] mb-3 flex items-center gap-2">
            <Hash size={14} /> Sık Geçen Terimler
          </h4>
          <div className="flex flex-wrap gap-1">
            {digest.keywords.slice(0, 15).map((k) => (
              <span
                key={k.word}
                className="text-[10.5px] bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)] px-2 py-0.5 rounded-full"
                style={{
                  fontSize: `${Math.min(13, 10 + k.count)}px`,
                  opacity: Math.min(1, 0.6 + k.count * 0.15),
                }}
              >
                {k.word}
              </span>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: "danger" | "ok";
}) {
  return (
    <div className="bg-[var(--color-bg-2)] rounded-lg p-2">
      <div
        className={`font-serif text-[20px] font-bold ${
          highlight === "danger"
            ? "text-[var(--color-danger)]"
            : highlight === "ok"
            ? "text-[var(--color-ok)]"
            : "text-[var(--color-gold-bright)]"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-[var(--color-text-3)] uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
