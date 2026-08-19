/**
 * HARIS v2 — Semantic Chunker (Faz 13.6)
 *
 * Türkçe hukuki belgeler için optimize edilmiş chunking:
 * - Paragraf sınırlarına saygı gösterir
 * - Madde / Bölüm başlıklarını tespit eder (Madde 5, MADDE 5, § 5, vb.)
 * - Hedef: ~500 token/chunk, 50 token overlap
 * - Tablo/liste bloklarını bölmemeye çalışır
 */

import crypto from "node:crypto";
import type { Chunk } from "./types";

const TARGET_CHUNK_TOKENS = 500;
const OVERLAP_TOKENS = 50;
const HARD_MAX_CHARS = 3000; // güvenlik üst sınırı

// Kabaca: 1 token ≈ 4 karakter (Türkçe için ortalama 3.5)
const CHARS_PER_TOKEN = 3.8;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Bölüm başlığı tespit — dönerse (başlık, kalan içerik).
 * Türk hukuk metni pattern'leri:
 *   - "MADDE 5", "Madde 5 —", "MADDE 5 -"
 *   - "§ 5", "§ 5.1"
 *   - "BÖLÜM 1", "Bölüm 1"
 *   - "İKİNCİ KISIM"
 *   - Roman rakamları: "I. GİRİŞ", "II. VAKIA"
 */
const SECTION_HEADER_RE =
  /^(MADDE\s+\d+[a-z]?|Madde\s+\d+[a-z]?|§\s*\d+(?:\.\d+)?|B(?:Ö|O)L(?:Ü|U)M\s+[IVX0-9]+|[IVX]{1,4}\.\s+[A-ZÇĞİÖŞÜ][^.\n]{2,60}|(?:B(?:İ|I)R(?:İ|I)NC(?:İ|I)|(?:İ|I)K(?:İ|I)NC(?:İ|I)|(?:Ü|U)ÇÜNCÜ|D(?:Ö|O)RD(?:Ü|U)NC(?:Ü|U)|BE(?:Ş|S)(?:İ|I)NC(?:İ|I))\s+KISIM)/;

function detectSection(paragraph: string): string | null {
  const firstLine = paragraph.split("\n")[0].trim();
  if (firstLine.length > 100) return null;
  const m = firstLine.match(SECTION_HEADER_RE);
  return m ? firstLine : null;
}

/**
 * Metni paragraflara böl (çift satır atlaması).
 */
function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Bir paragraf çok uzunsa cümle bazında daha da böl.
 */
function splitLongParagraph(paragraph: string, maxTokens: number): string[] {
  if (estimateTokens(paragraph) <= maxTokens) return [paragraph];

  // Cümle sonları: . ! ? sonrası boşluk + büyük harf
  const sentences = paragraph
    .split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/)
    .filter((s) => s.trim().length > 0);

  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (estimateTokens(current + " " + s) > maxTokens && current.length > 0) {
      out.push(current.trim());
      current = s;
    } else {
      current = current ? current + " " + s : s;
    }
  }
  if (current.trim().length > 0) out.push(current.trim());
  return out;
}

/**
 * Ana chunker fonksiyonu.
 * Input: temiz text (OCR / pdf-parse çıktısı)
 * Output: Chunk[] — DB'ye yazılmaya hazır
 */
export function chunkText(
  text: string,
  opts?: {
    targetTokens?: number;
    overlapTokens?: number;
    hardMaxChars?: number;
  }
): Chunk[] {
  const target = opts?.targetTokens ?? TARGET_CHUNK_TOKENS;
  const overlap = opts?.overlapTokens ?? OVERLAP_TOKENS;
  const hardMax = opts?.hardMaxChars ?? HARD_MAX_CHARS;

  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return [];

  const chunks: Chunk[] = [];
  let buffer = "";
  let bufferTokens = 0;
  let currentSection: string | undefined = undefined;
  let chunkIndex = 0;

  const flush = () => {
    if (buffer.trim().length === 0) return;
    const content = buffer.trim();
    chunks.push({
      index: chunkIndex++,
      content,
      contentHash: sha256(content),
      tokenCount: estimateTokens(content),
      sectionTitle: currentSection,
    });
    // overlap: sonraki chunk'a son ~overlap token'ı taşı
    if (overlap > 0 && content.length > 0) {
      const overlapChars = Math.min(overlap * CHARS_PER_TOKEN, content.length);
      buffer = content.slice(content.length - overlapChars);
      bufferTokens = estimateTokens(buffer);
    } else {
      buffer = "";
      bufferTokens = 0;
    }
  };

  for (const raw of paragraphs) {
    const section = detectSection(raw);
    if (section) {
      // Yeni bölüm başlığı → önceki buffer'ı flush et
      if (bufferTokens > target / 2) flush();
      currentSection = section;
    }

    // Çok uzun paragrafları alt-cümlelere böl
    const parts = splitLongParagraph(raw, target - overlap);

    for (const part of parts) {
      const partTokens = estimateTokens(part);

      // Buffer taşarsa flush
      if (
        (bufferTokens + partTokens > target && bufferTokens > 0) ||
        buffer.length + part.length > hardMax
      ) {
        flush();
      }

      buffer = buffer ? buffer + "\n\n" + part : part;
      bufferTokens = estimateTokens(buffer);
    }
  }

  if (buffer.trim().length > 0) {
    const content = buffer.trim();
    chunks.push({
      index: chunkIndex++,
      content,
      contentHash: sha256(content),
      tokenCount: estimateTokens(content),
      sectionTitle: currentSection,
    });
  }

  return chunks;
}

/**
 * Basit test helper — chunk istatistiği
 */
export function chunkStats(chunks: Chunk[]) {
  const totalTokens = chunks.reduce((s, c) => s + c.tokenCount, 0);
  const avg = chunks.length > 0 ? Math.round(totalTokens / chunks.length) : 0;
  return {
    count: chunks.length,
    totalTokens,
    avgTokens: avg,
    minTokens: chunks.length > 0 ? Math.min(...chunks.map((c) => c.tokenCount)) : 0,
    maxTokens: chunks.length > 0 ? Math.max(...chunks.map((c) => c.tokenCount)) : 0,
    sections: [...new Set(chunks.map((c) => c.sectionTitle).filter(Boolean))],
  };
}
