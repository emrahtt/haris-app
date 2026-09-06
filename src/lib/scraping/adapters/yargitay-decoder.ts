/**
 * Yargıtay Karar Metni Decoder
 *
 * Bedesten API içerikleri iki tipte gelir:
 *   - text/html      → cheerio ile parse
 *   - application/pdf → pdf-parse ile (base64 decode sonrası)
 *
 * Output: temizlenmiş düz metin (markdown'a yakın yapı)
 */

import * as cheerio from "cheerio";

interface DecodeInput {
  rawContent: string;
  mimeType: string;
}

interface DecodeResult {
  text: string;
  warnings: string[];
}

/**
 * Karar metnindeki tipik artıkları temizle
 */
function normalizeText(s: string): string {
  return s
    // Non-breaking space → normal space
    .replace(/\u00a0/g, " ")
    // Çoklu boşluk → tek boşluk
    .replace(/[ \t]+/g, " ")
    // Satır içi çoklu newline → tek newline
    .replace(/\n{3,}/g, "\n\n")
    // Baş/son boşluk
    .trim();
}

/**
 * HTML'i markdown-benzeri düz metne çevir
 */
function htmlToText(html: string): string {
  const $ = cheerio.load(html);

  // Script/style tag'lerini at
  $("script, style, noscript").remove();

  // Önemli bloklar için satır sonu ekle
  $("p, br, div, tr, h1, h2, h3, h4, h5, h6, li").each((_, el) => {
    $(el).append("\n");
  });

  // Tablo satırları için tab separator
  $("td, th").each((_, el) => {
    $(el).append("\t");
  });

  // Başlık tag'lerini markdown'a çevir
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = parseInt(el.tagName.slice(1), 10);
    const prefix = "#".repeat(level);
    const text = $(el).text();
    $(el).text(`\n${prefix} ${text}\n`);
  });

  // Liste item
  $("li").each((_, el) => {
    const text = $(el).text();
    $(el).text(`- ${text}`);
  });

  // Tüm text'i çek
  const text = $("body").length ? $("body").text() : $.root().text();
  return normalizeText(text);
}

/**
 * PDF'i metne çevir
 */
async function pdfToText(base64Content: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Content, "base64");
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer, { max: 50 });
    return normalizeText(result.text);
  } catch (err) {
    throw new Error(
      `PDF decode hatası: ${err instanceof Error ? err.message : "x"}`
    );
  }
}

export async function decodeBedestenContent(
  input: DecodeInput
): Promise<DecodeResult> {
  const warnings: string[] = [];

  // PDF
  if (input.mimeType.includes("pdf")) {
    try {
      const text = await pdfToText(input.rawContent);
      if (text.length < 100) {
        warnings.push("PDF'den çok az metin çıkarıldı — tarama olabilir");
      }
      return { text, warnings };
    } catch (err) {
      warnings.push(err instanceof Error ? err.message : "PDF decode hatası");
      return { text: "", warnings };
    }
  }

  // HTML (default)
  try {
    // Eğer rawContent zaten HTML değil base64 ise (mimeType hatalıysa) decode et
    let html = input.rawContent;
    if (/^[A-Za-z0-9+/=]+$/.test(html.slice(0, 100).replace(/\s/g, ""))) {
      try {
        html = Buffer.from(html, "base64").toString("utf-8");
      } catch {
        // Zaten plain text
      }
    }

    const text = htmlToText(html);
    if (text.length < 50) {
      warnings.push("HTML'den çok az metin çıkarıldı");
    }
    return { text, warnings };
  } catch (err) {
    warnings.push(err instanceof Error ? err.message : "HTML decode hatası");
    return { text: input.rawContent, warnings };
  }
}

/**
 * Karar metninden esas/karar no, mahkeme adı çıkarma (yedek parser)
 */
export interface DecisionMetadataExtract {
  esasNo?: string;
  kararNo?: string;
  kararTarihi?: string;
  court?: string;
}

export function extractDecisionMetadata(text: string): DecisionMetadataExtract {
  const result: DecisionMetadataExtract = {};

  // Esas No: "Esas No: 2022/8932" veya "E. 2022/8932"
  const esasMatch = text.match(/(?:Esas\s+No|E\.)\s*:?\s*(\d{4}\/\d+)/i);
  if (esasMatch) result.esasNo = esasMatch[1];

  // Karar No: "Karar No: 2023/4521" veya "K. 2023/4521"
  const kararMatch = text.match(/(?:Karar\s+No|K\.)\s*:?\s*(\d{4}\/\d+)/i);
  if (kararMatch) result.kararNo = kararMatch[1];

  // Karar Tarihi: "15.09.2023" veya "15/09/2023"
  const dateMatch = text.match(
    /(?:Karar\s+Tarihi|T\.)\s*:?\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i
  );
  if (dateMatch) {
    // ISO format'a çevir
    const m = dateMatch[1].match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) {
      result.kararTarihi = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
  }

  // Mahkeme: "Yargıtay 17. Hukuk Dairesi"
  const courtMatch = text.match(
    /(Yargıtay\s+(?:[\dIVXLCDM]+\.\s+(?:Hukuk|Ceza)\s+Dairesi|Hukuk\s+Genel\s+Kurulu|Ceza\s+Genel\s+Kurulu|Büyük\s+Genel\s+Kurulu))/i
  );
  if (courtMatch) result.court = courtMatch[1];

  return result;
}
