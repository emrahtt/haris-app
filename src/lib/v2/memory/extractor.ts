/**
 * HARIS v2 — Auto Entity Extractor (Faz 13.5.1: provider-aware)
 *
 * Belge yüklendiğinde OCR/extract sonrası çalışır.
 * HARIS_QUICK_MODEL provider'ına göre Anthropic veya OpenAI'a router edilir.
 */

import { upsertMemoryBlock } from "./db";

interface ExtractedData {
  entities: Record<string, Record<string, unknown>>;
  facts: Record<string, Record<string, unknown>>;
}

export async function extractAndStoreEntities(
  workspaceId: string,
  userId: string,
  documentId: string,
  documentFilename: string,
  extractedText: string,
  documentCategory?: string
): Promise<{ entities: number; facts: number; error?: string }> {
  if (!extractedText || extractedText.length < 100) {
    return { entities: 0, facts: 0, error: "Metin çok kısa" };
  }

  try {
    const data = await callExtractor(
      extractedText,
      documentFilename,
      documentCategory
    );
    let entityCount = 0;
    let factCount = 0;

    for (const [key, value] of Object.entries(data.entities)) {
      if (value && Object.keys(value).length > 0) {
        await upsertMemoryBlock(workspaceId, userId, {
          type: "entity",
          key,
          value,
          source: "auto_extract",
          sourceDocumentId: documentId,
          confidence: 0.85,
          priority: getPriorityForKey(key),
        });
        entityCount++;
      }
    }

    for (const [key, value] of Object.entries(data.facts)) {
      if (value && Object.keys(value).length > 0) {
        await upsertMemoryBlock(workspaceId, userId, {
          type: "fact",
          key,
          value,
          source: "auto_extract",
          sourceDocumentId: documentId,
          confidence: 0.85,
          priority: getPriorityForKey(key),
        });
        factCount++;
      }
    }

    return { entities: entityCount, facts: factCount };
  } catch (e) {
    console.error("[Entity extract hatası]", e);
    return { entities: 0, facts: 0, error: String(e).slice(0, 200) };
  }
}

async function callExtractor(
  text: string,
  filename: string,
  category?: string
): Promise<ExtractedData> {
  const modelSpec =
    process.env.HARIS_QUICK_MODEL ?? "anthropic:claude-sonnet-4-6";
  const [provider, modelId] = modelSpec.includes(":")
    ? modelSpec.split(":")
    : ["openai", modelSpec];

  const truncated = text.slice(0, 15000);
  const prompt = buildPrompt(filename, category, truncated);

  if (provider === "anthropic") {
    return callAnthropicExtractor(modelId, prompt);
  }
  return callOpenAIExtractor(modelId, prompt);
}

function buildPrompt(
  filename: string,
  category: string | undefined,
  text: string
): string {
  return `Aşağıdaki Türk hukuk belgesinden yapılandırılmış bilgi çıkar.

DOSYA: ${filename}
KATEGORİ: ${category ?? "bilinmiyor"}

METİN (ilk 15K karakter):
"""
${text}
"""

GÖREV: Belgedeki tüm önemli bilgileri JSON olarak çıkar. Her key TÜRKÇE snake_case.

ENTITIES (kişi/kurum):
- davaci, davali, muvekkil, karsi_taraf, avukat_davaci, avukat_davali, hakim, bilirkisi, tanik_1, tanik_2, mahkeme
- Her biri için: {ad, tc?, adres?, telefon?, sicil?, unvan?, aciklama?}

FACTS (ölçülebilir/tespit edilebilir):
- olay_tarihi, olay_yeri, esas_no, karar_no
- dava_turu, hukuki_dayanak (kanun maddeleri)
- talep_tutari (maddi/manevi ayrılı), bilirkişi_hesabi
- kusur_orani {davaci_pct, davali_pct, kaynak}
- kanun_maddeleri (dizi: ["TBK m.49", "KTK m.91"])
- yargitay_atiflari (dizi)
- onemli_tarihler {olay?, dilekce?, tebliğ?, süre?}

ÇIKTI SADECE JSON, başka yazma:
{
  "entities": { "davaci": {"ad": "..."}, ... },
  "facts": { "olay_tarihi": {"value": "12.03.2024"}, ... }
}

Bulamadığın alanları KOYMA (empty object değil, hiç ekleme).`;
}

async function callAnthropicExtractor(
  modelId: string,
  prompt: string
): Promise<ExtractedData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { entities: {}, facts: {} };
  const baseURL =
    process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, "") ||
    "https://api.anthropic.com";

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${baseURL}/v1/messages`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 3000,
        system:
          "Türk hukuk belgelerinden yapılandırılmış bilgi çıkaran bir asistansın. SADECE geçerli JSON döner, hiç başka metin yazmazsın. Türkçe karakterleri koru.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    clearTimeout(tid);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic ${res.status}: ${err.slice(0, 150)}`);
    }

    const data = await res.json();
    const text = Array.isArray(data.content)
      ? data.content
          .filter((c: { type: string }) => c.type === "text")
          .map((c: { text: string }) => c.text)
          .join("\n")
      : "";

    // JSON extract (markdown code block'tan)
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

    const parsed = JSON.parse(jsonStr) as ExtractedData;
    return {
      entities:
        parsed.entities && typeof parsed.entities === "object"
          ? parsed.entities
          : {},
      facts:
        parsed.facts && typeof parsed.facts === "object" ? parsed.facts : {},
    };
  } catch (e) {
    clearTimeout(tid);
    console.error("[Anthropic extractor hatası]", e);
    return { entities: {}, facts: {} };
  }
}

async function callOpenAIExtractor(
  modelId: string,
  prompt: string
): Promise<ExtractedData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { entities: {}, facts: {} };

  const isNewModel =
    modelId.startsWith("gpt-5") ||
    modelId.startsWith("o1") ||
    modelId.startsWith("o3");

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        ...(isNewModel
          ? { max_completion_tokens: 3000 }
          : { max_tokens: 3000 }),
        ...(isNewModel ? {} : { temperature: 0.1 }),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Türk hukuk belgelerinden yapılandırılmış bilgi çıkaran bir asistansın. Sadece JSON döner. Türkçe karakterleri koru.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    clearTimeout(tid);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI ${res.status}: ${err.slice(0, 150)}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as ExtractedData;

    return {
      entities:
        parsed.entities && typeof parsed.entities === "object"
          ? parsed.entities
          : {},
      facts:
        parsed.facts && typeof parsed.facts === "object" ? parsed.facts : {},
    };
  } catch (e) {
    clearTimeout(tid);
    console.error("[OpenAI extractor hatası]", e);
    return { entities: {}, facts: {} };
  }
}

function getPriorityForKey(key: string): number {
  const highPriority = [
    "davaci",
    "davali",
    "muvekkil",
    "olay_tarihi",
    "talep_tutari",
    "esas_no",
    "kusur_orani",
    "hukuki_dayanak",
  ];
  const mediumPriority = [
    "mahkeme",
    "avukat_davaci",
    "avukat_davali",
    "bilirkisi",
    "kanun_maddeleri",
    "yargitay_atiflari",
  ];
  if (highPriority.includes(key)) return 9;
  if (mediumPriority.includes(key)) return 7;
  return 5;
}
