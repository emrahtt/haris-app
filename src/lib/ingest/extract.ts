/**
 * Metin Çıkarma — Server-side
 *
 * Faz 5 + Faz 6 birleşik:
 * - PDF: pdf-parse (chunked büyük dosyalar için)
 * - Word (.docx): mammoth
 * - Text: doğrudan
 * - Image: GPT-4o Vision (gerçek) veya heuristic (demo)
 * - Audio: Whisper (gerçek) veya demo
 * - Excel: SheetJS
 */

import type { IngestResult, DocMimeCategory } from "./types";
import { performOcr } from "./ocr";
import { performTranscription } from "./transcribe";
import { extractSpreadsheet } from "./spreadsheet";

/* ============================================================
   PDF — Faz 6 chunked iyileştirme
   ============================================================ */
async function extractPdf(buffer: Buffer): Promise<IngestResult> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer, {
      // Tüm sayfaları işle ama maks 200 sayfa (timeout için)
      max: 200,
    });

    const warnings: string[] = [];
    if (result.numpages > 200) {
      warnings.push(`PDF ${result.numpages} sayfa — sadece ilk 200 işlendi`);
    }
    if (result.text.length < 50 && result.numpages > 0) {
      warnings.push(
        "Az metin çıkarıldı. Bu bir tarama (scan) PDF olabilir — OCR gerekebilir (Faz 6+)."
      );
    }

    return {
      text: result.text.trim(),
      pageCount: result.numpages,
      method: "pdf-parse",
      warnings,
    };
  } catch (err) {
    return {
      text: "",
      method: "pdf-parse",
      warnings: [
        `PDF çıkarma hatası: ${err instanceof Error ? err.message : "bilinmeyen"}`,
      ],
    };
  }
}

async function extractWord(buffer: Buffer): Promise<IngestResult> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value.trim(),
      method: "mammoth",
      warnings: result.messages.map((m) => m.message).slice(0, 3),
    };
  } catch (err) {
    return {
      text: "",
      method: "mammoth",
      warnings: [
        `Word çıkarma hatası: ${err instanceof Error ? err.message : "bilinmeyen"}`,
      ],
    };
  }
}

async function extractText(buffer: Buffer): Promise<IngestResult> {
  try {
    return {
      text: buffer.toString("utf-8").trim(),
      method: "text-direct",
      warnings: [],
    };
  } catch (err) {
    return {
      text: "",
      method: "text-direct",
      warnings: [`Text okuma hatası: ${err instanceof Error ? err.message : "x"}`],
    };
  }
}

/* ============================================================
   ANA ÇIKARMA FONKSİYONU — Faz 6 güncellemesi
   ============================================================ */
export async function extractFromBuffer(
  buffer: Buffer,
  mimeType: string,
  category: DocMimeCategory,
  fileName: string
): Promise<IngestResult> {
  switch (category) {
    case "pdf":
      return extractPdf(buffer);
    case "word":
      return extractWord(buffer);
    case "text":
      return extractText(buffer);
    case "image": {
      // ⭐ Faz 6: Gerçek GPT-4o Vision veya akıllı heuristic
      const ocr = await performOcr(buffer, mimeType, fileName);
      return {
        text: ocr.text,
        method: "ocr-demo", // tip uyumluluğu — ama gerçek method ocr.method'da
        warnings: [
          ...ocr.warnings,
          `OCR yöntemi: ${ocr.method} (güven: ${ocr.confidence})`,
        ],
      };
    }
    case "audio": {
      // ⭐ Faz 6: Gerçek Whisper veya demo
      const tr = await performTranscription(buffer, mimeType, fileName);
      return {
        text: tr.text,
        method: "transcript-demo",
        warnings: [
          ...tr.warnings,
          `Transkripsiyon: ${tr.method} (güven: ${tr.confidence}${
            tr.durationSec ? `, ${tr.durationSec}s` : ""
          })`,
        ],
      };
    }
    case "spreadsheet": {
      // ⭐ Faz 6: SheetJS
      const sheet = await extractSpreadsheet(buffer, fileName);
      return {
        text: sheet.text,
        method: "text-direct",
        warnings: [
          ...sheet.warnings,
          `${sheet.sheetCount} sayfa, ${sheet.totalRows} satır`,
        ],
      };
    }
    case "archive":
      return {
        text: `[Arşiv dosyası: ${fileName}]\n\nZIP içeriği otomatik açma Faz 7'de eklenecek.`,
        method: "unsupported",
        warnings: ["ZIP okuma henüz desteklenmiyor"],
      };
    default:
      return {
        text: "",
        method: "unsupported",
        warnings: [`Desteklenmeyen format: ${mimeType}`],
      };
  }
}
