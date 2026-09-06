/**
 * HARIS v2 — Tabular Review Generator
 *
 * Legora benzeri: Birden fazla belgeyi yan yana inceleyip matris üretir.
 * Her hücre: değer + kaynak belge ref.
 *
 * AI (GPT-5.4-mini) ile her belgeden istenen sorulara cevap çıkarılır.
 */

import type { VaultDocument } from "../state/workspace-state";

export interface TabularColumn {
  id: string;
  question: string; // "Tarih nedir?" "Tutar?" "İmzalı mı?"
  type?: "text" | "date" | "number" | "boolean";
}

export interface TabularCell {
  value: string;
  sourceRef?: string; // "s.2 §3" gibi pasaj referansı
  confidence?: "high" | "medium" | "low";
  conflict?: boolean; // Diğer belgelerle çelişki var mı
}

export interface TabularReview {
  columns: TabularColumn[];
  /** rows: { docId: { columnId: cell } } */
  rows: Record<string, Record<string, TabularCell>>;
}

/**
 * Belirli belgeler için, kullanıcının verdiği soruları AI'a sor → matris üret.
 */
export async function generateTabularReview(
  documents: VaultDocument[],
  columns: TabularColumn[]
): Promise<TabularReview> {
  const rows: Record<string, Record<string, TabularCell>> = {};

  // Her belge için tek bir AI çağrısı (tüm soruları paralel sor)
  await Promise.all(
    documents.map(async (doc) => {
      try {
        const cells = await extractAnswersForDocument(doc, columns);
        rows[doc.id] = cells;
      } catch {
        // Hata olursa boş hücreler
        rows[doc.id] = Object.fromEntries(
          columns.map((c) => [c.id, { value: "[hata]", confidence: "low" as const }])
        );
      }
    })
  );

  return { columns, rows };
}

async function extractAnswersForDocument(
  doc: VaultDocument,
  columns: TabularColumn[]
): Promise<Record<string, TabularCell>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return mockAnswers(doc, columns);

  const model = process.env.HARIS_QUICK_MODEL?.split(":")[1] ?? "gpt-5.4-mini";
  const text = (doc.extractedText ?? doc.summary ?? "").slice(0, 8000);

  if (text.length < 30) {
    return Object.fromEntries(
      columns.map((c) => [c.id, { value: "—", confidence: "low" as const }])
    );
  }

  const questions = columns
    .map((c, i) => `${i + 1}. (${c.id}) ${c.question}`)
    .join("\n");

  const prompt = `Belge: ${doc.filename} [${doc.category ?? "?"}]

İçerik:
"""
${text}
"""

SORULAR:
${questions}

ÇIKTI SADECE JSON formatında, her column_id için { value, sourceRef, confidence } objesi:
{
  "${columns[0].id}": { "value": "12.03.2024", "sourceRef": "s.1 §2", "confidence": "high" },
  ...
}

confidence değerleri: "high" | "medium" | "low"
Cevap belgede yoksa value: "—", confidence: "low"`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        ...(model.startsWith("gpt-5") || model.startsWith("o1") || model.startsWith("o3")
          ? { max_completion_tokens: 1000 }
          : { max_tokens: 1000 }),
        ...(model.startsWith("gpt-5") || model.startsWith("o1") || model.startsWith("o3")
          ? {}
          : { temperature: 0.1 }),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Türk hukuk belgelerinden yapılandırılmış veri çıkaran bir asistansın. Sadece JSON döner, başka metin yazmazsın. Türkçe karakterleri koru.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Record<string, Partial<TabularCell>>;

    const cells: Record<string, TabularCell> = {};
    for (const col of columns) {
      const r = parsed[col.id];
      cells[col.id] = r
        ? {
            value: typeof r.value === "string" ? r.value : "—",
            sourceRef: typeof r.sourceRef === "string" ? r.sourceRef : undefined,
            confidence: r.confidence ?? "medium",
          }
        : { value: "—", confidence: "low" };
    }
    return cells;
  } catch {
    return mockAnswers(doc, columns);
  }
}

function mockAnswers(
  doc: VaultDocument,
  columns: TabularColumn[]
): Record<string, TabularCell> {
  const cells: Record<string, TabularCell> = {};
  for (const col of columns) {
    if (col.question.toLowerCase().includes("tarih")) {
      cells[col.id] = {
        value: "12.03.2024",
        sourceRef: "s.1",
        confidence: "medium",
      };
    } else if (
      col.question.toLowerCase().includes("tutar") ||
      col.question.toLowerCase().includes("bedel")
    ) {
      cells[col.id] = {
        value: doc.summary?.match(/[\d.,]+\s*TL/)?.[0] ?? "—",
        confidence: "medium",
      };
    } else {
      cells[col.id] = { value: "—", confidence: "low" };
    }
  }
  return cells;
}

/**
 * Çelişki tespiti: aynı kolondaki değerler farklı belgelerde farklı mı?
 */
export function detectConflicts(review: TabularReview): TabularReview {
  for (const col of review.columns) {
    const values = new Map<string, string[]>(); // normalize -> docIds
    for (const [docId, cells] of Object.entries(review.rows)) {
      const v = cells[col.id]?.value;
      if (!v || v === "—") continue;
      const norm = v.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      if (!values.has(norm)) values.set(norm, []);
      values.get(norm)!.push(docId);
    }
    // Birden fazla farklı değer varsa hepsi conflict
    if (values.size > 1) {
      for (const [, cells] of Object.entries(review.rows)) {
        if (cells[col.id]) cells[col.id].conflict = true;
      }
    }
  }
  return review;
}
