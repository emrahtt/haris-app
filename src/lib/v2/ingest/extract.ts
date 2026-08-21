/**
 * HARIS v2 — Belge metin çıkarma (PRODUCTION-GRADE v3)
 *
 * KULLANICI METİN ÇIKARMA YÖNTEMİ SEÇEBİLİR (Faz 13.2):
 *   - "auto"             → Akıllı default (genel kullanım)
 *   - "fast"             → pdf-parse / mammoth (AI yok, hızlı, ucuz)
 *   - "claude_vision"    → Anthropic Sonnet 4.6 + native PDF beta
 *   - "openai_vision"    → PDF → PNG → GPT-4o Vision (kanıtlanmış)
 *   - "gemini_vision"    → PDF → PNG → Gemini Pro Vision (Türkçe + tablo en iyi)
 *   - "best_of_3"        → 3 modeli paralel çalıştır, en uzun çıktıyı seç
 *
 * Hata yönetimi: 3x retry, exponential backoff, Türkçe humanized hata mesajları
 * Büyük PDF: otomatik 3 sayfalık parçalara böl
 */

import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { pdfToPng } from "pdf-to-png-converter";
import { readUdf, isUdfFile } from "../udf/reader";

export type ExtractionMethod =
  | "auto"
  | "fast"
  | "claude_vision"
  | "openai_vision"
  | "gemini_vision"
  | "best_of_3";

export interface ExtractResult {
  text: string;
  pageCount?: number;
  method: string;
  modelUsed?: string;
  usedAI: boolean;
  estimatedCost?: number;
  durationMs?: number;
  error?: string;
  userMessage?: string;
  /** Best-of-3 sonucunda hangi modelin kazandığı + diğer skorları */
  comparison?: Array<{ model: string; chars: number; cost: number }>;
}

const MAX_PDF_SIZE = 30 * 1024 * 1024;
const _CHUNK_THRESHOLD_BYTES = 3 * 1024 * 1024;
const _PAGES_PER_CHUNK = 3;

// ─────────────────────────────────────────────────────────
// ANA FONKSİYON
// ─────────────────────────────────────────────────────────

export async function extractFromFile(
  filename: string,
  mimeType: string,
  buffer: Buffer,
  method: ExtractionMethod = "auto"
): Promise<ExtractResult> {
  const startTime = Date.now();
  const lower = filename.toLowerCase();

  // UDF
  if (isUdfFile(filename, mimeType)) {
    return extractUdf(buffer, startTime);
  }

  // DOCX
  if (
    mimeType.includes("officedocument.wordprocessingml") ||
    lower.endsWith(".docx")
  ) {
    return extractDocx(buffer, startTime);
  }

  // TXT/MD
  if (
    mimeType.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md")
  ) {
    return {
      text: buffer.toString("utf-8"),
      method: "txt",
      modelUsed: "UTF-8 decode",
      usedAI: false,
      durationMs: Date.now() - startTime,
    };
  }

  // Görsel (JPG/PNG)
  if (mimeType.startsWith("image/")) {
    return extractImageWithMethod(buffer, mimeType, method, startTime);
  }

  // PDF
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    return extractPdfWithMethod(buffer, method, startTime);
  }

  return {
    text: "",
    method: "fallback",
    usedAI: false,
    durationMs: Date.now() - startTime,
    error: `Desteklenmeyen dosya türü: ${mimeType}`,
    userMessage: `Bu dosya tipi (${mimeType}) henüz desteklenmiyor.`,
  };
}

// ─────────────────────────────────────────────────────────
// PDF EXTRACTION — Method seçimine göre
// ─────────────────────────────────────────────────────────

async function extractPdfWithMethod(
  buffer: Buffer,
  method: ExtractionMethod,
  startTime: number
): Promise<ExtractResult> {
  if (buffer.length > MAX_PDF_SIZE) {
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    return {
      text: "",
      method: "fallback",
      usedAI: false,
      durationMs: Date.now() - startTime,
      error: `PDF ${sizeMB}MB > 30MB`,
      userMessage: `📄 PDF çok büyük (${sizeMB} MB). Maksimum 30 MB. Dosyayı bölüp tekrar yükleyin.`,
    };
  }

  // pdf-parse ile sayfa sayısı + ham metin (her durumda)
  let pageCount = 0;
  let pdfParseText = "";
  try {
    const parsed = await pdfParse(buffer);
    pageCount = parsed.numpages || 0;
    pdfParseText = parsed.text?.trim() ?? "";
  } catch {
    pageCount = 0;
  }

  // FAST mode → sadece pdf-parse
  if (method === "fast") {
    if (pdfParseText.length > 50) {
      return {
        text: pdfParseText,
        pageCount,
        method: "pdf_parse_fast",
        modelUsed: "pdf-parse (AI yok)",
        usedAI: false,
        durationMs: Date.now() - startTime,
      };
    }
    return {
      text: "",
      pageCount,
      method: "fallback",
      usedAI: false,
      durationMs: Date.now() - startTime,
      error: "Hızlı modda metin boş",
      userMessage:
        "📄 Hızlı modda metin çıkarılamadı (PDF taranmış görsel olabilir). 'Claude Vision', 'OpenAI Vision' veya 'Gemini Vision' deneyin.",
    };
  }

  // AUTO mode → pdf-parse zayıfsa OpenAI Vision'a düş (kanıtlanmış)
  if (method === "auto") {
    if (pdfParseText.length > 200) {
      return {
        text: pdfParseText,
        pageCount,
        method: "auto_pdf_parse",
        modelUsed: "Otomatik (pdf-parse yeterliydi)",
        usedAI: false,
        durationMs: Date.now() - startTime,
      };
    }
    method = "openai_vision"; // fallback
  }

  // CLAUDE VISION — direct PDF
  if (method === "claude_vision") {
    return extractWithClaudeVision(buffer, pageCount, startTime);
  }

  // OPENAI VISION — PDF → PNG → GPT-4o
  if (method === "openai_vision") {
    return extractWithOpenAIVision(buffer, pageCount, startTime);
  }

  // GEMINI VISION — PDF → PNG → Gemini Pro
  if (method === "gemini_vision") {
    return extractWithGeminiVision(buffer, pageCount, startTime);
  }

  // BEST OF 3 — Paralel 3 model, en iyi çıktı seç
  if (method === "best_of_3") {
    return extractBestOf3(buffer, pageCount, startTime);
  }

  // Fallback
  return extractWithOpenAIVision(buffer, pageCount, startTime);
}

// ─────────────────────────────────────────────────────────
// CLAUDE VISION (Anthropic PDF beta — bazen çalışmıyor)
// ─────────────────────────────────────────────────────────

async function extractWithClaudeVision(
  buffer: Buffer,
  pageCount: number,
  startTime: number
): Promise<ExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResult(startTime, "ANTHROPIC_API_KEY eksik", "🔑 Claude API key eksik");
  }

  const baseURL =
    process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, "") ||
    "https://api.anthropic.com";
  const model =
    process.env.HARIS_ANALYZER_MODEL?.split(":")[1] ?? "claude-sonnet-4-6";

  const maxTokens = Math.min(Math.max((pageCount || 5) * 800, 4000), 16000);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch(`${baseURL}/v1/messages`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "pdfs-2024-09-25",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: TURKISH_OCR_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: buffer.toString("base64"),
                  },
                },
                { type: "text", text: "Bu PDF'in tüm içeriğini Türkçe metne çevir." },
              ],
            },
          ],
        }),
      });
      clearTimeout(tid);

      if (!res.ok) {
        const errText = await res.text();
        if (attempt < 3 && (res.status === 429 || res.status >= 500)) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        return errorResult(
          startTime,
          `Claude HTTP ${res.status}: ${errText.slice(0, 200)}`,
          humanizeError(`HTTP ${res.status}`)
        );
      }

      const data = await res.json();
      const text = Array.isArray(data.content)
        ? data.content
            .filter((c: { type: string }) => c.type === "text")
            .map((c: { text: string }) => c.text)
            .join("\n")
        : "";

      if (looksLikeAIFailure(text)) {
        // Claude PDF beta çalışmadı → OpenAI Vision'a düş
        console.log("[Claude Vision boş yanıt → OpenAI Vision fallback]");
        return extractWithOpenAIVision(buffer, pageCount, startTime);
      }

      const ti = data.usage?.input_tokens || 0;
      const to = data.usage?.output_tokens || 0;
      const cost = (ti * 3 + to * 15) / 1_000_000;

      return {
        text: text.trim(),
        pageCount,
        method: "claude_vision",
        modelUsed: "Claude Sonnet 4.6 Vision",
        usedAI: true,
        estimatedCost: cost,
        durationMs: Date.now() - startTime,
      };
    } catch (e) {
      clearTimeout(tid);
      if (attempt < 3) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return errorResult(startTime, String(e), humanizeError(String(e)));
    }
  }
  return errorResult(startTime, "Tüm retry'lar tükendi", "❌ Claude Vision başarısız");
}

// ─────────────────────────────────────────────────────────
// OPENAI VISION — PDF → PNG → GPT-4o (kanıtlanmış pipeline)
// ─────────────────────────────────────────────────────────

async function extractWithOpenAIVision(
  buffer: Buffer,
  pageCount: number,
  startTime: number
): Promise<ExtractResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorResult(startTime, "OPENAI_API_KEY eksik", "🔑 OpenAI API key eksik");
  }

  try {
    // PDF → PNG sayfaları (Windows path fix — mutlak path olarak options ver)
    let pngPages;
    try {
      pngPages = await pdfToPng(buffer, {
        viewportScale: 2.0,
        useSystemFonts: false,
      });
    } catch (pngErr) {
      const errStr = String(pngErr);
      // Windows cmaps trailing slash bug — Claude Vision fallback
      if (errStr.includes("Invalid factory url") || errStr.includes("cmaps")) {
        console.warn("[PDF→PNG Windows bug, Claude native PDF'e fallback]");
        return extractWithClaudeVision(buffer, pageCount, startTime);
      }
      throw pngErr;
    }

    if (pngPages.length === 0) {
      return errorResult(startTime, "PDF→PNG dönüşüm 0 sayfa döndü", "📄 PDF işlenemedi");
    }

    // Her sayfa için GPT-4o Vision (paralel, max 3)
    const model = process.env.HARIS_VISION_MODEL?.split(":")[1] ?? "gpt-4o";
    const tasks = pngPages.map((page, i) => async () => {
      return callOpenAIVisionPage(
        apiKey,
        model,
        page.content as Buffer,
        i + 1,
        pngPages.length
      );
    });
    const results = await runWithLimit(tasks, 3);

    // Birleştir
    let combinedText = "";
    let totalCost = 0;
    let failedPages = 0;
    results.forEach((r, i) => {
      if (r.success) {
        combinedText += `\n\n--- SAYFA ${i + 1} ---\n\n${r.text}`;
        totalCost += r.cost || 0;
      } else {
        failedPages++;
        combinedText += `\n\n--- SAYFA ${i + 1} (BAŞARISIZ) ---\n[${r.error}]`;
      }
    });

    if (combinedText.length < 30) {
      return errorResult(
        startTime,
        "Tüm sayfalar başarısız",
        "❌ GPT-4o Vision hiçbir sayfayı okuyamadı"
      );
    }

    return {
      text: combinedText.trim(),
      pageCount: pngPages.length,
      method: "openai_vision",
      modelUsed: `GPT-4o Vision (${pngPages.length} sayfa)`,
      usedAI: true,
      estimatedCost: totalCost,
      durationMs: Date.now() - startTime,
      userMessage:
        failedPages > 0
          ? `⚠️ ${failedPages}/${pngPages.length} sayfa okunamadı. Geri kalanı işlendi.`
          : undefined,
    };
  } catch (e) {
    return errorResult(startTime, String(e), humanizeError(String(e)));
  }
}

async function callOpenAIVisionPage(
  apiKey: string,
  model: string,
  pngBuffer: Buffer,
  pageNum: number,
  totalPages: number
): Promise<{ success: boolean; text: string; cost?: number; error?: string }> {
  const base64 = pngBuffer.toString("base64");

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          ...(model.startsWith("gpt-5") || model.startsWith("o1") || model.startsWith("o3")
            ? { max_completion_tokens: 4000 }
            : { max_tokens: 4000 }),
          messages: [
            { role: "system", content: TURKISH_OCR_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Sayfa ${pageNum}/${totalPages}. Bu görseldeki tüm metni Türkçe olarak çıkar. Tablo, grafik, damga, imza varsa belirt.`,
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/png;base64,${base64}` },
                },
              ],
            },
          ],
        }),
      });
      clearTimeout(tid);

      if (!res.ok) {
        const errText = await res.text();
        if (attempt < 3 && (res.status === 429 || res.status >= 500)) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        return {
          success: false,
          text: "",
          error: `GPT-4o HTTP ${res.status}: ${errText.slice(0, 100)}`,
        };
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      const ti = data.usage?.prompt_tokens || 0;
      const to = data.usage?.completion_tokens || 0;
      const cost = (ti * 2.5 + to * 10) / 1_000_000;

      if (!text || text.length < 5) {
        return { success: false, text: "", error: "Boş yanıt" };
      }

      return { success: true, text, cost };
    } catch (e) {
      clearTimeout(tid);
      if (attempt < 3) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return { success: false, text: "", error: String(e).slice(0, 100) };
    }
  }
  return { success: false, text: "", error: "Tüm retry'lar tükendi" };
}

// ─────────────────────────────────────────────────────────
// GEMINI VISION — PDF → PNG → Gemini Pro Vision
// ─────────────────────────────────────────────────────────

async function extractWithGeminiVision(
  buffer: Buffer,
  pageCount: number,
  startTime: number
): Promise<ExtractResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return errorResult(
      startTime,
      "GEMINI_API_KEY eksik",
      "🔑 Gemini API key eksik (.env.local'a GEMINI_API_KEY ekleyin)"
    );
  }

  const baseURL =
    process.env.GEMINI_BASE_URL?.replace(/\/$/, "") ||
    "https://generativelanguage.googleapis.com/v1beta";
  const model = process.env.HARIS_GEMINI_MODEL || "gemini-2.0-flash-exp";

  try {
    let pngPages;
    try {
      pngPages = await pdfToPng(buffer, {
        viewportScale: 2.0,
        useSystemFonts: false,
      });
    } catch (pngErr) {
      const errStr = String(pngErr);
      if (errStr.includes("Invalid factory url") || errStr.includes("cmaps")) {
        console.warn("[PDF→PNG Windows bug (Gemini), Claude native PDF'e fallback]");
        return extractWithClaudeVision(buffer, pageCount, startTime);
      }
      throw pngErr;
    }
    if (pngPages.length === 0) {
      return errorResult(startTime, "PDF→PNG 0 sayfa", "📄 PDF işlenemedi");
    }

    const tasks = pngPages.map((page, i) => async () => {
      return callGeminiVisionPage(
        apiKey,
        baseURL,
        model,
        page.content as Buffer,
        i + 1,
        pngPages.length
      );
    });
    const results = await runWithLimit(tasks, 3);

    let combinedText = "";
    let totalCost = 0;
    let failedPages = 0;
    results.forEach((r, i) => {
      if (r.success) {
        combinedText += `\n\n--- SAYFA ${i + 1} ---\n\n${r.text}`;
        totalCost += r.cost || 0;
      } else {
        failedPages++;
        combinedText += `\n\n--- SAYFA ${i + 1} (BAŞARISIZ) ---\n[${r.error}]`;
      }
    });

    if (combinedText.length < 30) {
      return errorResult(
        startTime,
        "Tüm sayfalar başarısız",
        "❌ Gemini Vision hiçbir sayfayı okuyamadı"
      );
    }

    return {
      text: combinedText.trim(),
      pageCount: pngPages.length,
      method: "gemini_vision",
      modelUsed: `Gemini ${model} (${pngPages.length} sayfa)`,
      usedAI: true,
      estimatedCost: totalCost,
      durationMs: Date.now() - startTime,
      userMessage:
        failedPages > 0
          ? `⚠️ ${failedPages}/${pngPages.length} sayfa okunamadı.`
          : undefined,
    };
  } catch (e) {
    return errorResult(startTime, String(e), humanizeError(String(e)));
  }
}

async function callGeminiVisionPage(
  apiKey: string,
  baseURL: string,
  model: string,
  pngBuffer: Buffer,
  pageNum: number,
  totalPages: number
): Promise<{ success: boolean; text: string; cost?: number; error?: string }> {
  const base64 = pngBuffer.toString("base64");
  const url = `${baseURL}/models/${model}:generateContent?key=${apiKey}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: TURKISH_OCR_SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Sayfa ${pageNum}/${totalPages}. Bu görseldeki tüm metni Türkçe olarak çıkar. Tablo varsa markdown, grafik varsa [GRAFİK: ...] olarak belirt.`,
                },
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
          },
        }),
      });
      clearTimeout(tid);

      if (!res.ok) {
        const errText = await res.text();
        if (attempt < 3 && (res.status === 429 || res.status >= 500)) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        return {
          success: false,
          text: "",
          error: `Gemini HTTP ${res.status}: ${errText.slice(0, 100)}`,
        };
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const ti = data.usageMetadata?.promptTokenCount || 0;
      const to = data.usageMetadata?.candidatesTokenCount || 0;
      // Gemini 2.0 Flash: ~$0.10/M in, $0.40/M out
      const cost = (ti * 0.1 + to * 0.4) / 1_000_000;

      if (!text || text.length < 5) {
        return { success: false, text: "", error: "Boş yanıt" };
      }

      return { success: true, text, cost };
    } catch (e) {
      clearTimeout(tid);
      if (attempt < 3) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return { success: false, text: "", error: String(e).slice(0, 100) };
    }
  }
  return { success: false, text: "", error: "Retry tükendi" };
}

// ─────────────────────────────────────────────────────────
// BEST OF 3 — Paralel 3 model, en uzun ve anlamlı çıktıyı seç
// ─────────────────────────────────────────────────────────

async function extractBestOf3(
  buffer: Buffer,
  pageCount: number,
  startTime: number
): Promise<ExtractResult> {
  const tasks = [
    () =>
      extractWithClaudeVision(buffer, pageCount, startTime).then((r) => ({
        ...r,
        modelLabel: "Claude",
      })),
    () =>
      extractWithOpenAIVision(buffer, pageCount, startTime).then((r) => ({
        ...r,
        modelLabel: "GPT-4o",
      })),
    () =>
      extractWithGeminiVision(buffer, pageCount, startTime).then((r) => ({
        ...r,
        modelLabel: "Gemini",
      })),
  ];

  const results = await Promise.all(tasks.map((t) => t()));

  // En anlamlı çıktıyı seç: hata olmayan + en uzun
  const valid = results.filter(
    (r) => r.text && r.text.length > 50 && !looksLikeAIFailure(r.text)
  );

  const comparison = results.map((r) => ({
    model: r.modelLabel,
    chars: r.text?.length || 0,
    cost: r.estimatedCost || 0,
  }));

  if (valid.length === 0) {
    return {
      text: results[1].text || results[0].text || results[2].text || "",
      pageCount,
      method: "best_of_3",
      modelUsed: "Best-of-3 (tümü başarısız)",
      usedAI: true,
      estimatedCost: comparison.reduce((s, c) => s + c.cost, 0),
      durationMs: Date.now() - startTime,
      comparison,
      error: "Tüm 3 model başarısız",
      userMessage: "❌ Hiçbir AI okuyamadı. Dosya çok düşük kalite olabilir.",
    };
  }

  // En uzun çıktıyı seç (genelde en kapsamlı)
  const best = valid.reduce((a, b) =>
    (b.text?.length || 0) > (a.text?.length || 0) ? b : a
  );

  return {
    text: best.text,
    pageCount,
    method: "best_of_3",
    modelUsed: `Best-of-3 → ${best.modelLabel} kazandı`,
    usedAI: true,
    estimatedCost: comparison.reduce((s, c) => s + c.cost, 0),
    durationMs: Date.now() - startTime,
    comparison,
  };
}

// ─────────────────────────────────────────────────────────
// GÖRSEL (JPG/PNG)
// ─────────────────────────────────────────────────────────

async function extractImageWithMethod(
  buffer: Buffer,
  mimeType: string,
  method: ExtractionMethod,
  startTime: number
): Promise<ExtractResult> {
  // Görsel için PNG conversion gereksiz, doğrudan vision'a yolla
  const apiKey = process.env.OPENAI_API_KEY;

  // gemini_vision seçilmişse Gemini'ye yolla
  if (method === "gemini_vision") {
    const geminiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      const baseURL =
        process.env.GEMINI_BASE_URL?.replace(/\/$/, "") ||
        "https://generativelanguage.googleapis.com/v1beta";
      const model = process.env.HARIS_GEMINI_MODEL || "gemini-2.0-flash-exp";
      const r = await callGeminiVisionPage(geminiKey, baseURL, model, buffer, 1, 1);
      return {
        text: r.text,
        method: "image_gemini",
        modelUsed: `Gemini ${model}`,
        usedAI: true,
        estimatedCost: r.cost,
        durationMs: Date.now() - startTime,
        error: r.success ? undefined : r.error,
        userMessage: r.success ? undefined : humanizeError(r.error),
      };
    }
  }

  if (!apiKey) {
    return errorResult(startTime, "OPENAI_API_KEY eksik", "🔑 OpenAI key eksik");
  }
  const model = process.env.HARIS_VISION_MODEL?.split(":")[1] ?? "gpt-4o";
  const r = await callOpenAIVisionPage(apiKey, model, buffer, 1, 1);
  return {
    text: r.text,
    method: "image_ocr",
    modelUsed: "GPT-4o Vision",
    usedAI: true,
    estimatedCost: r.cost,
    durationMs: Date.now() - startTime,
    error: r.success ? undefined : r.error,
    userMessage: r.success ? undefined : humanizeError(r.error),
  };
}

// ─────────────────────────────────────────────────────────
// DOCX / UDF
// ─────────────────────────────────────────────────────────

async function extractDocx(buffer: Buffer, startTime: number): Promise<ExtractResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value.trim(),
      method: "docx",
      modelUsed: "Mammoth (Word parse)",
      usedAI: false,
      durationMs: Date.now() - startTime,
    };
  } catch (e) {
    return errorResult(startTime, String(e), "Word açılamadı");
  }
}

async function extractUdf(buffer: Buffer, startTime: number): Promise<ExtractResult> {
  const udf = await readUdf(buffer);
  if (udf.error) {
    return errorResult(startTime, udf.error, "UDF açılamadı");
  }
  let text = udf.text;
  if (udf.metadata.sicilNo || udf.metadata.dogrulamaKodu) {
    text =
      `[UYAP Metadata]\n` +
      (udf.metadata.sicilNo ? `Sicil: ${udf.metadata.sicilNo}\n` : "") +
      (udf.metadata.dogrulamaKodu
        ? `Doğrulama Kodu: ${udf.metadata.dogrulamaKodu}\n`
        : "") +
      (udf.metadata.yazar ? `Yazar: ${udf.metadata.yazar}\n` : "") +
      (udf.hasSignature ? `Durum: E-imzalı\n` : "") +
      `\n---\n\n` +
      text;
  }
  return {
    text,
    method: "udf",
    modelUsed: "Doğrudan UDF parse",
    usedAI: false,
    durationMs: Date.now() - startTime,
  };
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

const TURKISH_OCR_SYSTEM_PROMPT = `Sen profesyonel Türk hukuk belge OCR uzmanısın. Türkçe karakterleri (ç, ğ, ı, ö, ş, ü, İ, Ç, Ğ, Ş, Ö, Ü) HATASIZ koru. ASLA Arapça, Farsça, İbranice veya başka alfabe ekleme.

KURALLAR:
1. Sadece belgedeki metni döndür, kendi yorumun YOK
2. Tabloları Markdown table formatında (| sütun | sütun |) yaz
3. Grafikleri açıkla: [GRAFİK: kısa açıklama]
4. Damga/imza/kaşeyi belirt: [DAMGA] [İMZA] [KAŞE]
5. Sayfa numarası: --- SAYFA N ---
6. Paragraf yapısı, madde numaraları, listeler korunmalı
7. Mahkeme adı, esas no, tarih en üste`;

function looksLikeAIFailure(text: string): boolean {
  if (!text || text.length < 30) return true;
  const lower = text.toLowerCase();
  return (
    /pdf.{0,30}(boş|empty|okunamı|cannot|unable|unsupported|içerik.{0,10}çıkarıla)/i.test(
      text
    ) ||
    /(belge|dosya).{0,30}(çıkarıla|okunamı|boş.{0,5}görün)/i.test(text) ||
    (lower.includes("dosyayı paylaşabildiğin") && text.length < 600) ||
    (lower.includes("sorry") && text.length < 300)
  );
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runWithLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  const queue = tasks.map((t, i) => ({ task: t, index: i }));
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      results[item.index] = await item.task();
    }
  });
  await Promise.all(workers);
  return results;
}

function humanizeError(err?: string): string {
  if (!err) return "Bilinmeyen hata";
  if (err.includes("fetch failed")) return "İnternet bağlantısı koptu";
  if (err.includes("timeout") || err.includes("aborted"))
    return "İşlem çok uzun sürdü (90s+), dosya çok karmaşık olabilir";
  if (err.includes("429") || err.includes("rate limit"))
    return "API rate limit — birkaç dakika bekleyin";
  if (err.includes("401") || err.includes("403"))
    return "API key geçersiz";
  if (err.includes("503") || err.includes("502"))
    return "AI sunucusu geçici hizmet dışı";
  if (err.includes("Arapça")) return "AI yanlış dilde çıktı, tekrar deneyin";
  return err.slice(0, 150);
}

function errorResult(
  startTime: number,
  techError: string,
  userMsg: string
): ExtractResult {
  return {
    text: "",
    method: "fallback",
    usedAI: false,
    durationMs: Date.now() - startTime,
    error: techError,
    userMessage: userMsg,
  };
}
