/**
 * Dava Sindirim — Birden Fazla Belgeden Toplu Analiz
 *
 * Listeli belgelerden:
 * - Birleştirilmiş kronoloji
 * - Taraflar haritası (kim kimle ilişkili)
 * - Kritik belge tespiti
 * - Tespit edilen anahtar olaylar
 *
 * Output: Faz 3 ajanlarına context olarak verilebilir.
 */

import type { UploadedDoc } from "./types";

export interface TimelineEvent {
  date: string;
  title: string;
  sourceDocId: string;
  sourceDocName: string;
  isCritical: boolean;
}

export interface CaseDigest {
  totalDocs: number;
  readyDocs: number;
  criticalDocs: number;
  /** Tüm belgelerden birleşmiş kronoloji (tarih sıralı) */
  timeline: TimelineEvent[];
  /** Tüm taraflar (frekans sıralı) */
  parties: { name: string; count: number; docIds: string[] }[];
  /** En sık geçen hukuki anahtar kelimeler */
  keywords: { word: string; count: number }[];
  /** Belge türü dağılımı */
  docTypeDistribution: Record<string, number>;
  /** Toplam çıkarılan metin (token tahminli) */
  totalChars: number;
  estimatedTokens: number;
  /** AI'a context olarak verilecek hazır prompt parçası */
  contextSummary: string;
}

export function buildDigest(docs: UploadedDoc[]): CaseDigest {
  const ready = docs.filter((d) => d.status === "ready" && d.classification);
  const critical = ready.filter((d) => d.classification!.isCritical);

  // Kronoloji — her belgenin tarihlerini topla
  const timeline: TimelineEvent[] = [];
  for (const d of ready) {
    if (!d.classification) continue;
    for (const dateStr of d.classification.dates) {
      timeline.push({
        date: dateStr,
        title: d.classification.summary.slice(0, 100) || d.fileName,
        sourceDocId: d.id,
        sourceDocName: d.fileName,
        isCritical: d.classification.isCritical,
      });
    }
  }
  timeline.sort((a, b) => a.date.localeCompare(b.date));

  // Taraflar — frekans sayımı
  const partyMap = new Map<string, { count: number; docIds: Set<string> }>();
  for (const d of ready) {
    if (!d.classification) continue;
    for (const party of d.classification.parties) {
      const existing = partyMap.get(party);
      if (existing) {
        existing.count++;
        existing.docIds.add(d.id);
      } else {
        partyMap.set(party, { count: 1, docIds: new Set([d.id]) });
      }
    }
  }
  const parties = Array.from(partyMap.entries())
    .map(([name, v]) => ({ name, count: v.count, docIds: Array.from(v.docIds) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Anahtar kelimeler
  const kwMap = new Map<string, number>();
  for (const d of ready) {
    if (!d.classification) continue;
    for (const kw of d.classification.keywords) {
      kwMap.set(kw, (kwMap.get(kw) || 0) + 1);
    }
  }
  const keywords = Array.from(kwMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Belge türü dağılımı
  const typeDist: Record<string, number> = {};
  for (const d of ready) {
    if (!d.classification) continue;
    const t = d.classification.docType;
    typeDist[t] = (typeDist[t] || 0) + 1;
  }

  const totalChars = ready.reduce((s, d) => s + (d.textLength || 0), 0);
  const estimatedTokens = Math.round(totalChars / 3); // TR için ~3 char/token

  // Context özet — ajanlara verilecek
  const contextSummary = buildContextSummary({
    docs: ready,
    timeline,
    parties,
    critical,
  });

  return {
    totalDocs: docs.length,
    readyDocs: ready.length,
    criticalDocs: critical.length,
    timeline,
    parties,
    keywords,
    docTypeDistribution: typeDist,
    totalChars,
    estimatedTokens,
    contextSummary,
  };
}

function buildContextSummary(input: {
  docs: UploadedDoc[];
  timeline: TimelineEvent[];
  parties: CaseDigest["parties"];
  critical: UploadedDoc[];
}): string {
  const { docs, timeline, parties, critical } = input;
  let s = `## YÜKLENMİŞ DAVA BELGELERİ (${docs.length} belge)\n\n`;

  // Belge listesi (özet)
  s += `### Belge Envanteri\n`;
  for (const d of docs) {
    const cls = d.classification;
    const star = cls?.isCritical ? "★ " : "";
    s += `- **${star}${d.fileName}** (${cls?.docType || "?"})`;
    if (cls?.summary) s += ` — ${cls.summary.slice(0, 120)}`;
    s += `\n`;
  }

  // Kritik belgeler (tam içerik)
  if (critical.length > 0) {
    s += `\n### Kritik Belge İçerikleri\n`;
    for (const d of critical.slice(0, 5)) {
      const text = d.text || "";
      s += `\n#### ${d.fileName}\n${text.slice(0, 1500)}${
        text.length > 1500 ? "\n[...kesildi...]" : ""
      }\n`;
    }
  }

  // Kronoloji
  if (timeline.length > 0) {
    s += `\n### Olay Zaman Çizelgesi (otomatik tespit)\n`;
    for (const e of timeline.slice(0, 15)) {
      s += `- **${e.date}**: ${e.title} *(kaynak: ${e.sourceDocName})*\n`;
    }
  }

  // Taraflar
  if (parties.length > 0) {
    s += `\n### Tespit Edilen Taraflar\n`;
    for (const p of parties.slice(0, 8)) {
      s += `- **${p.name}** (${p.count} belgede geçer)\n`;
    }
  }

  return s;
}
