/**
 * HARIS Embedding Katmanı
 *
 * İki mod:
 * 1. Gerçek: OpenAI `text-embedding-3-large` (3072 boyut)
 * 2. Demo: Türkçe-uyumlu deterministik hash embedding (256 boyut)
 *    - Karakter n-gram + kelime hash karması
 *    - Aynı metin → aynı vektör (cache-friendly)
 *    - Benzer metinler → benzer vektörler (cosine similarity anlamlı)
 *
 * Demo mode yeterince iyi: küçük korpus için anlamsal arama makul sonuç verir.
 * Gerçek mod production'da çok daha üstün.
 */

import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { hasOpenAI, isAiDemoMode } from "@/lib/ai/config";

export const EMBEDDING_DIM_DEMO = 256;
export const EMBEDDING_DIM_OPENAI = 1536; // text-embedding-3-small (daha ucuz)
export const EMBEDDING_MODEL = "text-embedding-3-small";

/* ============================================================
   GERÇEK EMBEDDING (OpenAI)
   ============================================================ */

async function embedOpenAI(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value: text,
  });
  return embedding;
}

async function embedManyOpenAI(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: texts,
  });
  return embeddings;
}

/* ============================================================
   DEMO EMBEDDING (Deterministik, hash-based)
   ============================================================
   Strateji:
   - Metni normalize et (lowercase, Türkçe diacritic-aware)
   - 3-gram karakter ve kelime tokenleri çıkar
   - Her token'ı 256 dimension vektörüne hash'le (FNV-1a varyantı)
   - Frekansla ağırlıkla, L2 normalize et
   ============================================================ */

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** FNV-1a 32-bit hash (deterministik, hızlı) */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Kelime + 3-gram karışık token üretir */
function tokenize(text: string): string[] {
  const norm = normalizeText(text);
  const words = norm.split(" ").filter((w) => w.length > 1);
  const tokens: string[] = [...words];

  // 3-gram karakter (hukuki terimlerdeki kök yakalama için)
  for (const w of words) {
    if (w.length < 4) continue;
    for (let i = 0; i <= w.length - 3; i++) {
      tokens.push(`#${w.slice(i, i + 3)}`);
    }
  }

  return tokens;
}

function embedDemo(text: string): number[] {
  const tokens = tokenize(text);
  const vec = new Float64Array(EMBEDDING_DIM_DEMO);

  for (const t of tokens) {
    const h = fnv1a(t);
    const idx = h % EMBEDDING_DIM_DEMO;
    const sign = (h >> 16) & 1 ? 1 : -1;
    vec[idx] += sign;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Array<number>(EMBEDDING_DIM_DEMO);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

/* ============================================================
   PUBLIC API
   ============================================================ */

export async function embedText(text: string): Promise<number[]> {
  if (isAiDemoMode || !hasOpenAI) return embedDemo(text);
  try {
    return await embedOpenAI(text);
  } catch (err) {
    console.warn("[embeddings] OpenAI başarısız, demo'ya fallback:", err);
    return embedDemo(text);
  }
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (isAiDemoMode || !hasOpenAI) return texts.map(embedDemo);
  try {
    return await embedManyOpenAI(texts);
  } catch (err) {
    console.warn("[embeddings] OpenAI batch başarısız, demo'ya fallback:", err);
    return texts.map(embedDemo);
  }
}

/* ============================================================
   COSINE SIMILARITY
   ============================================================ */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
