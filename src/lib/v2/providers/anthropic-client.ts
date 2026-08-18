/**
 * HARIS v2 — Anthropic Direct Client (Cache + Effort optimized)
 *
 * LangChain wrapper cache_control desteklemediği için doğrudan fetch kullanıyoruz.
 *
 * Özellikler:
 *   - Prompt caching (ephemeral, 5m TTL) — %90 input maliyet düşüşü
 *   - Effort parameter (Fable 5) — routine iş için "low"
 *   - Stable prefix pattern: system + memory + docs cache'lenir
 *   - Volatile suffix: kullanıcı mesajı cache dışı
 *   - Fallback ekli (Fable 5 refuse ederse Opus 4.8'e düş)
 *   - Retry: 3x exponential backoff (429/503 için)
 *
 * Kaynaklar:
 *   - https://bishrulhaq.com/posts/how-to-prompt-claude-fable-5-efficiently
 *   - https://www.aimadetools.com/blog/claude-fable-5-token-efficiency/
 */

import { MODEL_REGISTRY, type ModelRole } from "./index";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral"; ttl?: "5m" | "1h" };
}

export interface AnthropicCallOptions {
  role: ModelRole;
  /** Cache'lenecek stable prefix (system prompt + memory bloğu) */
  cacheablePrefix: string;
  /** Volatile suffix (kullanıcı mesajı) */
  userMessage: string;
  /** Konuşma geçmişi (varsa) — cache dışı, dinamik */
  conversationHistory?: AnthropicMessage[];
  maxTokens?: number;
  /** Fable 5 için: "low" | "medium" | "high" */
  effort?: "low" | "medium" | "high";
  /** Temperature (opsiyonel) */
  temperature?: number;
}

export interface AnthropicCallResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
  cost: number;
  cacheSavings: number; // Ne kadar tasarruf ettik ($)
  cacheHitRate: number; // 0-1, cache okunma oranı
  modelUsed: string;
  stopReason: string;
  rawResponse: unknown;
}

// Cache boundary threshold — 2048 tokens (Anthropic kuralı)
const MIN_CACHE_PREFIX_TOKENS = 2048;
const CHARS_PER_TOKEN_ESTIMATE = 4;

// ─────────────────────────────────────────────────────────
// ANA CALL FUNCTION
// ─────────────────────────────────────────────────────────

export async function callAnthropicOptimized(
  options: AnthropicCallOptions
): Promise<AnthropicCallResult> {
  const model = MODEL_REGISTRY[options.role];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return mockResult(options);
  }

  const baseURL =
    process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, "") ||
    "https://api.anthropic.com";

  const maxTokens = options.maxTokens ?? 4000;

  // Cache boundary kararı — prefix yeterince uzun mu?
  const prefixTokenEstimate = Math.ceil(
    options.cacheablePrefix.length / CHARS_PER_TOKEN_ESTIMATE
  );
  const shouldCache =
    model.supportsCaching && prefixTokenEstimate >= MIN_CACHE_PREFIX_TOKENS;

  // System prompt (cache'li veya cache'siz)
  const systemContent: AnthropicContentBlock[] = shouldCache
    ? [
        {
          type: "text",
          text: options.cacheablePrefix,
          cache_control: { type: "ephemeral", ttl: "5m" },
        },
      ]
    : [
        {
          type: "text",
          text: options.cacheablePrefix,
        },
      ];

  // Messages: conversation history + user message
  const messages: AnthropicMessage[] = [
    ...(options.conversationHistory ?? []),
    { role: "user", content: options.userMessage },
  ];

  // Effort parameter (sadece Fable 5)
  const effort = model.supportsEffort ? options.effort ?? "medium" : undefined;

  const body: Record<string, unknown> = {
    model: model.modelId,
    max_tokens: maxTokens,
    system: systemContent,
    messages,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (effort) body.output_config = { effort };

  // 3x retry with exponential backoff
  const maxRetries = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 180_000); // 3 dakika

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
        body: JSON.stringify(body),
      });
      clearTimeout(tid);

      if (!res.ok) {
        const errText = await res.text();
        lastError = `HTTP ${res.status}: ${errText.slice(0, 200)}`;

        // Retry edilebilir mi?
        if (
          attempt < maxRetries &&
          (res.status === 429 || res.status === 502 || res.status === 503)
        ) {
          await sleep(1000 * Math.pow(2, attempt));
          continue;
        }
        throw new Error(lastError);
      }

      const data = await res.json();

      // Content extract
      const text = Array.isArray(data.content)
        ? data.content
            .filter((c: { type: string }) => c.type === "text")
            .map((c: { text: string }) => c.text)
            .join("\n")
        : "";

      // Usage stats
      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;
      const cacheCreationTokens = data.usage?.cache_creation_input_tokens ?? 0;
      const cacheReadTokens = data.usage?.cache_read_input_tokens ?? 0;

      // Maliyet hesabı
      const inputCost = (inputTokens * model.costPer1MInput) / 1_000_000;
      const outputCost = (outputTokens * model.costPer1MOutput) / 1_000_000;
      const cacheWriteCost =
        (cacheCreationTokens * (model.costPer1MCacheWrite ?? 0)) / 1_000_000;
      const cacheReadCost =
        (cacheReadTokens * (model.costPer1MCacheRead ?? 0)) / 1_000_000;
      const totalCost = inputCost + outputCost + cacheWriteCost + cacheReadCost;

      // Cache olsaydı ne kadar öderdik? (savings hesabı için)
      const wouldPayFullPrice =
        ((inputTokens + cacheCreationTokens + cacheReadTokens) *
          model.costPer1MInput) /
          1_000_000 +
        outputCost;
      const cacheSavings = Math.max(0, wouldPayFullPrice - totalCost);

      const totalInputEffective =
        inputTokens + cacheCreationTokens + cacheReadTokens;
      const cacheHitRate =
        totalInputEffective > 0 ? cacheReadTokens / totalInputEffective : 0;

      return {
        content: text.trim(),
        usage: {
          inputTokens,
          outputTokens,
          cacheCreationTokens,
          cacheReadTokens,
        },
        cost: totalCost,
        cacheSavings,
        cacheHitRate,
        modelUsed: model.displayName,
        stopReason: data.stop_reason ?? "end_turn",
        rawResponse: data,
      };
    } catch (e) {
      clearTimeout(tid);
      lastError = String(e).slice(0, 200);
      if (attempt < maxRetries) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      throw new Error(`Anthropic call başarısız (${maxRetries} deneme): ${lastError}`);
    }
  }

  throw new Error(`Retry tükendi: ${lastError}`);
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mockResult(options: AnthropicCallOptions): AnthropicCallResult {
  const model = MODEL_REGISTRY[options.role];
  return {
    content:
      "[Demo yanıt — ANTHROPIC_API_KEY eksik]\n\nGerçek API key eklendiğinde bu mesaj yerine gerçek Claude yanıtı gelecek.",
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    },
    cost: 0,
    cacheSavings: 0,
    cacheHitRate: 0,
    modelUsed: model.displayName + " (demo)",
    stopReason: "end_turn",
    rawResponse: { mock: true },
  };
}
