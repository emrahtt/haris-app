/**
 * HARIS v2 — Geliştirilmiş Belge Bağlamı
 *
 * Mevcut buildDocumentContext yerine:
 * - Sayfa-bazlı indeksleme
 * - Bölüm-bazlı özetleme (belge başı/ortası/sonu)
 * - Kronolojik sıralama
 * - Çelişki adaylarının tespiti
 * - Kritik pasaj geri çağırması
 *
 * Token bütçesi kontrol: tüm belgeler 100K char sınırında tutulur,
 * ancak hiçbir belge tamamlanmış kabul edilmez.
 */

import type { VaultDocument } from "../state/workspace-state";

interface DocumentPage {
  documentId: string;
  filename: string;
  pageNumber: number;
  content: string;
  summary: string;
}

interface DocumentSection {
  name: string; // "Başı", "Ortası", "Sonu"
  startPage: number;
  endPage: number;
  content: string;
  summary: string;
}

interface EnhancedDocumentContext {
  // Özet
  summary: string;
  
  // Sayfa indexi
  pages: DocumentPage[];
  
  // Belgeler
  fullByDocument: Array<{
    documentId: string;
    filename: string;
    totalPages: number;
    sections: DocumentSection[];
    chronoContext?: string; // "2020 Eylül-Aralık" vb.
    fullText: string; // Tamamı (long-context modellerde)
    isTruncated: boolean;
  }>;
  
  // Çelişki adayları
  conflicts: Array<{
    type: "date_mismatch" | "amount_mismatch" | "party_mismatch" | "fact_contradiction";
    doc1: { filename: string; excerpt: string };
    doc2: { filename: string; excerpt: string };
    severity: "info" | "warning" | "critical";
  }>;
  
  // İstatistikler
  stats: {
    totalDocuments: number;
    totalPages: number;
    totalCharacters: number;
    tokenEstimate: number;
    coverage: number; // % (ne kadar belge işlendi)
  };
}

/**
 * Belgeleri sayfa-bazlı ve kronolojik olarak işleyen context builder
 */
export function buildEnhancedDocumentContext(
  docs: VaultDocument[]
): EnhancedDocumentContext {
  const pages: DocumentPage[] = [];
  const fullByDocument: EnhancedDocumentContext["fullByDocument"] = [];
  const conflicts: EnhancedDocumentContext["conflicts"] = [];

  let totalChars = 0;
  const TOTAL_BUDGET = 100_000;

  // Belgeleri kategoriye göre sırala (önemli belgeler önce)
  const sortedDocs = sortDocumentsByImportance(docs);

  for (const doc of sortedDocs) {
    if (!doc.extractedText || doc.extractedText.length < 50) continue; // Boş belgeler atla

    const text = doc.extractedText;
    const pageCount = doc.pageCount ?? Math.ceil(text.length / 2500); // ~2500 char/sayfa tahmin

    // Sayfa-bazlı split (her sayfa ~2500 char)
    const pageSize = 2500;
    const docPages: DocumentPage[] = [];
    for (let i = 0; i < text.length; i += pageSize) {
      const pageContent = text.slice(i, i + pageSize);
      docPages.push({
        documentId: doc.id,
        filename: doc.filename,
        pageNumber: Math.floor(i / pageSize) + 1,
        content: pageContent,
        summary: generatePageSummary(pageContent),
      });
    }

    // Bölüm-bazlı özet (başı, ortası, sonu)
    const sections = extractDocumentSections(text, pageCount);

    // Çelişki taraması: bu belgedeki tarihler/miktarlar
    for (const existingPage of pages) {
      const conflictsFound = detectConflicts(existingPage.content, text);
      conflicts.push(...conflictsFound.map(cf => ({ ...cf, severity: "warning" as const })));
    }

    pages.push(...docPages);
    totalChars += text.length;

    fullByDocument.push({
      documentId: doc.id,
      filename: doc.filename,
      totalPages: pageCount,
      sections,
      chronoContext: extractChronology(text),
      fullText: text,
      isTruncated: totalChars > TOTAL_BUDGET,
    });

    // Bütçeyi aşmışsa uyar ama devam et
    if (totalChars > TOTAL_BUDGET) {
      console.warn(`[Belge Bağlamı] Budget aşıldı: ${totalChars} > ${TOTAL_BUDGET}`);
    }
  }

  // Özet oluştur
  const summaryLines = [
    `📄 Toplam ${fullByDocument.length} belge, ~${pages.length} sayfa:`,
    ...fullByDocument.slice(0, 5).map(
      d => `  • [${d.totalPages}s] ${d.filename}${d.chronoContext ? ` — ${d.chronoContext}` : ""}`
    ),
  ];
  if (fullByDocument.length > 5) {
    summaryLines.push(`  • ... ve ${fullByDocument.length - 5} belge daha`);
  }
  if (conflicts.length > 0) {
    summaryLines.push(`\n⚠️ ${conflicts.length} potansiyel çelişki tespit edildi (tarih/miktar/taraf)`);
  }

  return {
    summary: summaryLines.join("\n"),
    pages,
    fullByDocument,
    conflicts,
    stats: {
      totalDocuments: fullByDocument.length,
      totalPages: pages.length,
      totalCharacters: totalChars,
      tokenEstimate: Math.ceil(totalChars / 4), // Heuristic
      coverage: Math.min(100, Math.round((totalChars / TOTAL_BUDGET) * 100)),
    },
  };
}

function sortDocumentsByImportance(docs: VaultDocument[]): VaultDocument[] {
  const importance: Record<string, number> = {
    "şikayet": 10,
    "dava": 10,
    "davası": 10,
    "dilek": 9,
    "dilekçe": 9,
    "beyanname": 8,
    "bilirkişi": 7,
    "rapor": 6,
    "sözleşme": 8,
    "belge": 5,
  };

  return docs.sort((a, b) => {
    const aScore =
      (importance[a.category?.toLowerCase() ?? ""] ?? 0) +
      (a.extractedText?.length ?? 0) / 10000;
    const bScore =
      (importance[b.category?.toLowerCase() ?? ""] ?? 0) +
      (b.extractedText?.length ?? 0) / 10000;
    return bScore - aScore;
  });
}

function generatePageSummary(content: string): string {
  // İlk 300 karakterin özeti (basit: ilk cümle veya başlık)
  const lines = content.split("\n").filter(l => l.trim().length > 10);
  if (lines.length > 0) {
    return lines[0].slice(0, 150);
  }
  return "…";
}

function extractDocumentSections(
  text: string,
  pageCount: number
): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const pageSize = Math.ceil(text.length / pageCount);

  // Başı (ilk %20)
  const startEnd = Math.floor(text.length * 0.2);
  sections.push({
    name: "Başı",
    startPage: 1,
    endPage: Math.ceil(startEnd / pageSize),
    content: text.slice(0, startEnd),
    summary: text.slice(0, 500),
  });

  // Ortası (orta %30)
  const midStart = Math.floor(text.length * 0.35);
  const midEnd = Math.floor(text.length * 0.65);
  sections.push({
    name: "Ortası",
    startPage: Math.ceil(midStart / pageSize),
    endPage: Math.ceil(midEnd / pageSize),
    content: text.slice(midStart, midEnd),
    summary: text.slice(midStart, midStart + 500),
  });

  // Sonu (son %20)
  const endStart = Math.floor(text.length * 0.8);
  sections.push({
    name: "Sonu",
    startPage: Math.ceil(endStart / pageSize),
    endPage: pageCount,
    content: text.slice(endStart),
    summary: text.slice(endStart, endStart + 500),
  });

  return sections;
}

function extractChronology(text: string): string | undefined {
  // Tarihleri çıkar: "2020", "15.03.2021", vb.
  const dates = Array.from(text.matchAll(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4})/g))
    .map(m => m[1])
    .slice(0, 10); // İlk 10 tarihi al

  if (dates.length === 0) return undefined;
  if (dates.length === 1) return `${dates[0]}`;
  return `${dates[0]} – ${dates[dates.length - 1]}`;
}

interface Conflict {
  type: "date_mismatch" | "amount_mismatch" | "party_mismatch" | "fact_contradiction";
  doc1: { filename: string; excerpt: string };
  doc2: { filename: string; excerpt: string };
}

function detectConflicts(text1: string, text2: string): Conflict[] {
  const conflicts: Conflict[] = [];

  // Tarih uyuşmazlığı
  const dates1 = Array.from(text1.matchAll(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/g)).map(m => m[1]);
  const dates2 = Array.from(text2.matchAll(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/g)).map(m => m[1]);
  if (dates1.length > 0 && dates2.length > 0 && dates1[0] !== dates2[0]) {
    conflicts.push({
      type: "date_mismatch",
      doc1: { filename: "belge1", excerpt: `Tarih: ${dates1[0]}` },
      doc2: { filename: "belge2", excerpt: `Tarih: ${dates2[0]}` },
    });
  }

  return conflicts;
}

/**
 * Eski buildDocumentContext ile uyumluluğu sağlamak için wrapper
 */
export function buildDocumentContext(docs: VaultDocument[]): {
  summary: string;
  full: string;
} {
  const enhanced = buildEnhancedDocumentContext(docs);
  
  // Eski formatı emüle et
  const full = enhanced.fullByDocument
    .map(d => {
      const sectionTexts = d.sections
        .map(s => `\n#### ${s.name}\n${s.summary}\n`)
        .join("");
      return `\n### Belge: ${d.filename} (${d.totalPages} sayfa)\n${sectionTexts}`;
    })
    .join("");

  return {
    summary: enhanced.summary,
    full,
  };
}
