"use client";

import { useEffect, useState } from "react";
import type { CaseDigest } from "@/lib/ingest/digest";
import type { LegalCase } from "@/lib/data/types";

/**
 * Bir davanın "tam context"ini hazırlar:
 * - Statik dava bilgileri
 * - Yüklenen belgeler özet/sindirim raporu
 *
 * Bu context, AI ajanlarına gönderilir.
 */
export function useCaseContext(c: LegalCase) {
  const [digest, setDigest] = useState<CaseDigest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/documents/list?caseId=${encodeURIComponent(c.id)}&digest=true`)
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setDigest(d.digest);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [c.id]);

  const baseContext = `
**Dava:** ${c.title}
**Mahkeme:** ${c.court}
**Esas No:** ${c.esasNo}
**Müvekkil:** ${c.client}
**Karşı Taraf:** ${c.opponent}
**Talep:** ${
    c.maddi ? `${c.maddi.toLocaleString("tr-TR")} TL maddi` : ""
  } ${c.manevi ? `+ ${c.manevi.toLocaleString("tr-TR")} TL manevi tazminat` : ""}

**Olay Özeti:**
${c.summary || "Detaylı özet henüz girilmemiş."}
  `.trim();

  // Belge varsa bağlama ekle
  const fullContext = digest && digest.readyDocs > 0
    ? `${baseContext}\n\n---\n\n${digest.contextSummary}`
    : baseContext;

  return {
    baseContext,
    fullContext,
    digest,
    hasDocuments: !!digest && digest.readyDocs > 0,
    loading,
  };
}
