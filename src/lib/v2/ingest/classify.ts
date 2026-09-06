/**
 * HARIS v2 — Vaka Alıcısı (Intake Agent) belge sınıflandırma
 *
 * Faz 13.5.1: Provider-aware routing
 *   - HARIS_QUICK_MODEL="anthropic:claude-sonnet-4-6" → Anthropic'e git
 *   - HARIS_QUICK_MODEL="openai:gpt-5.4-mini" → OpenAI'a git
 *   - Auto-detect prefix
 */

import { AGENTS } from "../orchestra/agents";

export interface ClassificationResult {
  category: string;
  summary: string;
  parties: string[];
  date?: string;
  keywords: string[];
}

const VALID_CATEGORIES = [
  "şikayet_dilekçesi",
  "cevap_dilekçesi",
  "bilirkişi_raporu",
  "tanık_beyanı",
  "sözleşme",
  "tutanak",
  "mahkeme_kararı",
  "yazışma",
  "fatura",
  "tıbbi_rapor",
  "diğer",
];

export async function classifyDocument(
  filename: string,
  extractedText: string
): Promise<ClassificationResult> {
  const modelSpec = process.env.HARIS_QUICK_MODEL ?? "anthropic:claude-sonnet-4-6";
  const [provider, modelId] = modelSpec.includes(":")
    ? modelSpec.split(":")
    : ["openai", modelSpec];

  if (extractedText.length < 20) {
    return mockClassify(filename, extractedText);
  }

  const truncated = extractedText.slice(0, 8000);
  const prompt = buildPrompt(filename, truncated);

  try {
    if (provider === "anthropic") {
      return await callAnthropic(modelId, prompt);
    } else {
      return await callOpenAI(modelId, prompt);
    }
  } catch (e) {
    console.error("[classify] hata:", e);
    return mockClassify(filename, extractedText);
  }
}

function buildPrompt(filename: string, text: string): string {
  return `Aşağıdaki Türk hukuk belgesini analiz et.

DOSYA ADI: ${filename}
İÇERİK (ilk 8000 karakter):
"""
${text}
"""

ÇIKTI SADECE JSON (başka yazma):
{
  "category": "şikayet_dilekçesi|cevap_dilekçesi|bilirkişi_raporu|tanık_beyanı|sözleşme|tutanak|mahkeme_kararı|yazışma|fatura|tıbbi_rapor|diğer",
  "summary": "1-2 cümle Türkçe özet",
  "parties": ["taraf adı 1", "taraf adı 2"],
  "date": "YYYY-MM-DD veya null",
  "keywords": ["anahtar kelime 1", "anahtar kelime 2", "anahtar kelime 3"]
}`;
}

async function callAnthropic(
  modelId: string,
  prompt: string
): Promise<ClassificationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY yok");
  const baseURL =
    process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, "") ||
    "https://api.anthropic.com";

  const res = await fetch(`${baseURL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 600,
      system:
        AGENTS.intake.systemPrompt +
        "\n\nSADECE geçerli JSON döndür, başka metin yazma. Türkçe karakterleri koru.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  const text = Array.isArray(data.content)
    ? data.content
        .filter((c: { type: string }) => c.type === "text")
        .map((c: { text: string }) => c.text)
        .join("\n")
    : "";

  // Claude bazen JSON'u markdown code block içine sarar
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

  const parsed = JSON.parse(jsonStr);
  return normalizeResult(parsed);
}

async function callOpenAI(
  modelId: string,
  prompt: string
): Promise<ClassificationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY yok");

  const isNewModel =
    modelId.startsWith("gpt-5") ||
    modelId.startsWith("o1") ||
    modelId.startsWith("o3");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      ...(isNewModel ? {} : { temperature: 0.1 }),
      ...(isNewModel
        ? { max_completion_tokens: 600 }
        : { max_tokens: 600 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: AGENTS.intake.systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return normalizeResult(parsed);
}

function normalizeResult(parsed: {
  category?: string;
  summary?: string;
  parties?: unknown;
  date?: string;
  keywords?: unknown;
}): ClassificationResult {
  return {
    category: VALID_CATEGORIES.includes(parsed.category ?? "")
      ? parsed.category!
      : "diğer",
    summary: parsed.summary ?? "",
    parties: Array.isArray(parsed.parties) ? (parsed.parties as string[]) : [],
    date: parsed.date && parsed.date !== "null" ? parsed.date : undefined,
    keywords: Array.isArray(parsed.keywords)
      ? (parsed.keywords as string[])
      : [],
  };
}

function mockClassify(
  filename: string,
  text: string
): ClassificationResult {
  const lower = filename.toLowerCase();
  let category = "diğer";
  if (lower.includes("şikayet") || lower.includes("dava dilekçe"))
    category = "şikayet_dilekçesi";
  else if (lower.includes("cevap")) category = "cevap_dilekçesi";
  else if (lower.includes("bilirkişi")) category = "bilirkişi_raporu";
  else if (lower.includes("tanık")) category = "tanık_beyanı";
  else if (lower.includes("sözleşme") || lower.includes("kontrat"))
    category = "sözleşme";
  else if (lower.includes("tutanak")) category = "tutanak";
  else if (lower.includes("karar")) category = "mahkeme_kararı";
  else if (lower.includes("fatura")) category = "fatura";
  else if (lower.includes("rapor") && lower.includes("tıbbi"))
    category = "tıbbi_rapor";

  return {
    category,
    summary: text
      ? text.slice(0, 200).replace(/\s+/g, " ") + (text.length > 200 ? "…" : "")
      : `${filename} — demo modda otomatik sınıflandırıldı`,
    parties: [],
    keywords: [],
  };
}
