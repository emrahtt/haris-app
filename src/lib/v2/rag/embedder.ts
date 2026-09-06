/**
 * HARIS v2 — Embeddings (Faz 13.6)
 *
 * OpenAI text-embedding-3-large kullanır.
 * Batch API (max 100 chunk/request) ile hızlı embed.
 * 1536-dim (truncated) — pgvector default schema ile uyumlu.
 */

const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";
const MAX_BATCH_SIZE = 100;
const EMBEDDING_DIMENSIONS = 1536; // text-embedding-3-large truncated
const MAX_RETRIES = 3;

// Fiyat (Ağustos 2026): text-embedding-3-large = $0.13 / 1M token
const COST_PER_1M_TOKENS = 0.13;

export interface EmbedResult {
  embeddings: number[][];
  tokensUsed: number;
  estimatedCostUsd: number;
  model: string;
  durationMs: number;
}

export interface EmbedError {
  error: string;
  status?: number;
  retryable: boolean;
}

function getEmbeddingModel(): string {
  const spec = process.env.HARIS_EMBEDDING_MODEL;
  if (spec && spec.includes(":")) {
    return spec.split(":")[1];
  }
  return "text-embedding-3-large";
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Tek batch (max 100 chunk) embed
 */
async function embedBatch(
  texts: string[],
  apiKey: string,
  model: string
): Promise<{ embeddings: number[][]; tokensUsed: number }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(OPENAI_EMBEDDING_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: texts,
          dimensions: EMBEDDING_DIMENSIONS,
          encoding_format: "float",
        }),
      });

      if (!res.ok) {
        const bodyText = await res.text();
        // Retryable durumları
        if (res.status === 429 || res.status >= 500) {
          lastError = new Error(`HTTP ${res.status}: ${bodyText.slice(0, 200)}`);
          const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
          await sleep(backoff);
          continue;
        }
        // Non-retryable
        throw new Error(`OpenAI embedding hata (${res.status}): ${bodyText.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        data: { embedding: number[]; index: number }[];
        usage: { total_tokens: number };
      };

      // Sıralı dönüş — index'e göre garanti et
      const sorted = data.data.slice().sort((a, b) => a.index - b.index);
      return {
        embeddings: sorted.map((d) => d.embedding),
        tokensUsed: data.usage.total_tokens,
      };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(Math.min(1000 * Math.pow(2, attempt), 8000));
      }
    }
  }

  throw new Error(
    `Embed batch başarısız (${MAX_RETRIES} deneme): ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Ana embed fonksiyonu — n adet metni embed eder, batch'lere böler.
 */
export async function embedTexts(texts: string[]): Promise<EmbedResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY tanımlı değil. Embedding için OpenAI zorunlu."
    );
  }

  if (texts.length === 0) {
    return {
      embeddings: [],
      tokensUsed: 0,
      estimatedCostUsd: 0,
      model: getEmbeddingModel(),
      durationMs: 0,
    };
  }

  const model = getEmbeddingModel();
  const start = Date.now();

  const allEmbeddings: number[][] = [];
  let totalTokens = 0;

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const result = await embedBatch(batch, apiKey, model);
    allEmbeddings.push(...result.embeddings);
    totalTokens += result.tokensUsed;
  }

  const estimatedCost = (totalTokens / 1_000_000) * COST_PER_1M_TOKENS;

  return {
    embeddings: allEmbeddings,
    tokensUsed: totalTokens,
    estimatedCostUsd: estimatedCost,
    model,
    durationMs: Date.now() - start,
  };
}

/**
 * Tek metin embed (chat query için)
 */
export async function embedQuery(text: string): Promise<number[]> {
  const result = await embedTexts([text.trim()]);
  return result.embeddings[0];
}
