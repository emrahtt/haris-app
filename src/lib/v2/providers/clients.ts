/**
 * HARIS — Doğrudan sağlayıcı istemcileri (Faz 16)
 *
 * Yeni sağlayıcılar: Google Gemini + Meta (Muse Spark).
 * Meta Model API, OpenAI-uyumlu olduğu için (api.meta.ai/v1) aynı istemci
 * farklı base URL + anahtarla kullanılıyor.
 *
 * Doğrulanmış API şekilleri:
 *  Gemini: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 *          header: x-goog-api-key · thinking: generationConfig.thinkingConfig.thinkingLevel
 *  Meta:   POST https://api.meta.ai/v1/chat/completions
 *          header: Authorization: Bearer $MODEL_API_KEY · reasoning_effort destekli
 */

import type { EffortLevel, ProviderId } from "./catalog";

export interface DirectCallOptions {
  provider: ProviderId;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  effort?: EffortLevel;
  temperature?: number;
  jsonMode?: boolean;
  costIn: number;
  costOut: number;
}

export interface DirectCallResult {
  content: string;
  tokensUsed: { input: number; output: number };
  cost: number;
  modelUsed: string;
  rawResponse: unknown;
}

const TIMEOUT_MS = 180_000;

/** Giriş noktası: sağlayıcıya göre doğru istemciyi seçer */
export async function callProvider(
  opts: DirectCallOptions
): Promise<DirectCallResult> {
  switch (opts.provider) {
    case "gemini":
      return callGemini(opts);
    case "meta":
      return callMeta(opts);
    case "openai":
      return callOpenAICompat(opts, "https://api.openai.com/v1", process.env.OPENAI_API_KEY);
    case "anthropic":
      return callAnthropicDirect(opts);
  }
}

// ───────────────────────── GOOGLE GEMINI ─────────────────────────

async function callGemini(opts: DirectCallOptions): Promise<DirectCallResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY tanımlı değil (Google AI Studio → Get API key)");
  }

  const baseURL =
    process.env.GEMINI_BASE_URL?.replace(/\/$/, "") ||
    "https://generativelanguage.googleapis.com/v1beta";

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: opts.maxTokens,
  };
  // Gemini 3.x "thinking level" = reasoning effort karşılığı
  if (opts.effort) {
    generationConfig.thinkingConfig = { thinkingLevel: opts.effort };
  }
  // gpt-5 / reasoning modellerde temperature reddediliyor; Gemini'de serbest
  if (opts.temperature !== undefined) generationConfig.temperature = opts.temperature;
  if (opts.jsonMode) generationConfig.responseMimeType = "application/json";

  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig,
  };

  const res = await fetchWithTimeout(
    `${baseURL}/models/${opts.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);

  const data = JSON.parse(text);
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const content = parts
    .filter((p: { text?: string }) => typeof p.text === "string")
    .map((p: { text: string }) => p.text)
    .join("\n")
    .trim();

  const inputTokens = data?.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = data?.usageMetadata?.candidatesTokenCount ?? 0;

  return {
    content,
    tokensUsed: { input: inputTokens, output: outputTokens },
    cost: (inputTokens * opts.costIn + outputTokens * opts.costOut) / 1_000_000,
    modelUsed: `Gemini ${opts.model}`,
    rawResponse: data,
  };
}

// ───────────────────────── META (Muse Spark) ─────────────────────────

async function callMeta(opts: DirectCallOptions): Promise<DirectCallResult> {
  const apiKey = process.env.MODEL_API_KEY || process.env.META_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MODEL_API_KEY tanımlı değil. Meta Model API anahtarı: https://dev.meta.ai (şu an yalnızca ABD erişimli önizleme)"
    );
  }
  const baseURL =
    process.env.META_BASE_URL?.replace(/\/$/, "") || "https://api.meta.ai/v1";
  return callOpenAICompat(opts, baseURL, apiKey, "Meta");
}

// ───────────────── OPENAI-UYUMLU (OpenAI + Meta) ─────────────────

async function callOpenAICompat(
  opts: DirectCallOptions,
  baseURL: string,
  apiKey: string | undefined,
  label = "OpenAI"
): Promise<DirectCallResult> {
  if (!apiKey) throw new Error(`${label} API anahtarı tanımlı değil`);

  const isReasoning =
    opts.model.startsWith("gpt-5") ||
    opts.model.startsWith("o1") ||
    opts.model.startsWith("o3") ||
    opts.model.startsWith("o4") ||
    opts.model.startsWith("muse-spark");

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    ...(isReasoning
      ? { max_completion_tokens: opts.maxTokens }
      : { max_tokens: opts.maxTokens, temperature: opts.temperature ?? 0.3 }),
    ...(isReasoning && opts.effort ? { reasoning_effort: opts.effort } : {}),
    ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  const res = await fetchWithTimeout(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`${label} ${res.status}: ${text.slice(0, 300)}`);

  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content ?? "";
  const inputTokens = data?.usage?.prompt_tokens ?? 0;
  const outputTokens = data?.usage?.completion_tokens ?? 0;

  return {
    content,
    tokensUsed: { input: inputTokens, output: outputTokens },
    cost: (inputTokens * opts.costIn + outputTokens * opts.costOut) / 1_000_000,
    modelUsed: `${label} ${opts.model}`,
    rawResponse: data,
  };
}

// ───────────────────────── ANTHROPIC ─────────────────────────

async function callAnthropicDirect(
  opts: DirectCallOptions
): Promise<DirectCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY tanımlı değil");

  const baseURL =
    process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, "") ||
    "https://api.anthropic.com";

  const res = await fetchWithTimeout(`${baseURL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${text.slice(0, 300)}`);

  const data = JSON.parse(text);
  const content = Array.isArray(data.content)
    ? data.content
        .filter((c: { type: string }) => c.type === "text")
        .map((c: { text: string }) => c.text)
        .join("\n")
    : "";
  const inputTokens = data?.usage?.input_tokens ?? 0;
  const outputTokens = data?.usage?.output_tokens ?? 0;

  return {
    content,
    tokensUsed: { input: inputTokens, output: outputTokens },
    cost: (inputTokens * opts.costIn + outputTokens * opts.costOut) / 1_000_000,
    modelUsed: `Claude ${opts.model}`,
    rawResponse: data,
  };
}

// ───────────────────────── YARDIMCI ─────────────────────────

async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}
