/**
 * Bedesten API Client — Yargıtay/Danıştay'ın Resmi Backend
 *
 * Kaynak: https://bedesten.adalet.gov.tr
 * Bu, karararama.yargitay.gov.tr arayüzünün arkasında çalışan **resmi JSON API**'dır.
 *
 * Avantajları (HTML scraping'e göre):
 * - JSON yanıt → parse kolay, breaking-change az
 * - Captcha YOK (UyapMevzuat application identity ile gelir)
 * - Pagination + filter + tarih + daire desteği
 * - Mahkemenin kendi sayfası, etik ve KVKK açısından temiz
 *
 * KURALLAR:
 * 1. Rate limit: 10 req / 30s window → biz 1 req / 3.5s yaparız (~%14 marj)
 * 2. AdaletApplicationName: UyapMevzuat header zorunlu
 * 3. Origin: mevzuat.adalet.gov.tr (CORS bypass için)
 * 4. 429 dönerse 30s pause + structured response
 *
 * Referans implementasyon: github.com/saidsurucu/yargi-mcp (MIT license)
 */

import { chamberCodeToFullName, type YargitayChamberCode } from "./yargitay-chambers";

const BASE_URL = "https://bedesten.adalet.gov.tr";
const SEARCH_ENDPOINT = "/emsal-karar/searchDocuments";
const DOCUMENT_ENDPOINT = "/emsal-karar/getDocumentContent";

// Rate limit config (env ile override edilebilir)
const RATE_REFILL_MS = parseFloat(process.env.BEDESTEN_RATE_REFILL_S || "3.5") * 1000;
const RATE_MAX_WAIT_MS = parseFloat(process.env.BEDESTEN_RATE_MAX_WAIT_S || "8") * 1000;

const COMMON_HEADERS: Record<string, string> = {
  "Accept": "*/*",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "AdaletApplicationName": "UyapMevzuat",
  "Content-Type": "application/json; charset=utf-8",
  "Origin": "https://mevzuat.adalet.gov.tr",
  "Referer": "https://mevzuat.adalet.gov.tr/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
};

/* ============================================================
   Rate Limiter (Token Bucket)
   ============================================================ */

class RateLimiter {
  private lastRequestAt = 0;
  private penalizedUntil = 0;

  async acquire(): Promise<void> {
    const now = Date.now();

    // Penalize edilmiş mi (429 sonrası)?
    if (now < this.penalizedUntil) {
      const wait = this.penalizedUntil - now;
      if (wait > RATE_MAX_WAIT_MS) {
        throw new BedestenRateLimitedError(wait / 1000);
      }
      await sleep(wait);
    }

    // Normal spacing
    const sinceLastReq = now - this.lastRequestAt;
    if (sinceLastReq < RATE_REFILL_MS) {
      const wait = RATE_REFILL_MS - sinceLastReq;
      if (wait > RATE_MAX_WAIT_MS) {
        throw new BedestenRateLimitedError(wait / 1000);
      }
      await sleep(wait);
    }

    this.lastRequestAt = Date.now();
  }

  penalize(retryAfterSec: number) {
    const capped = Math.max(1, Math.min(retryAfterSec, 60));
    this.penalizedUntil = Date.now() + (capped + 0.5) * 1000;
  }
}

export class BedestenRateLimitedError extends Error {
  constructor(public retryAfter: number) {
    super(`Bedesten rate-limit aşıldı (~${retryAfter.toFixed(1)}s bekle)`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ============================================================
   Request / Response Types
   ============================================================ */

export type BedestenCourtType =
  | "YARGITAYKARARI"
  | "DANISTAYKARAR"
  | "YERELHUKUK"
  | "ISTINAFHUKUK"
  | "KYB";

export interface BedestenSearchInput {
  phrase: string;
  courtType?: BedestenCourtType;
  chamber?: YargitayChamberCode;
  dateStart?: string; // ISO 8601 — örn: "2024-01-01T00:00:00Z"
  dateEnd?: string;
  pageSize?: number; // 1-10
  pageNumber?: number; // 1-indexed
  sortDirection?: "asc" | "desc";
}

interface BedestenDecisionEntry {
  documentId: string;
  itemType: { name: string; description: string };
  birimAdi: string | null;
  esasNoYil?: number;
  esasNoSira?: number;
  kararNoYil?: number;
  kararNoSira?: number;
  kararTarihi: string;
  kararTarihiStr: string;
  kararNo: string | null;
  esasNo: string | null;
  kararTuru?: string;
}

export interface BedestenSearchResult {
  total: number;
  start: number;
  decisions: BedestenDecisionEntry[];
}

export interface BedestenDocumentResult {
  documentId: string;
  /** Düz metin (HTML/PDF'ten temizlenmiş) */
  textContent: string;
  /** Orijinal mime: text/html veya application/pdf */
  mimeType: string;
  /** Base64'ten decode edilmiş ham içerik */
  rawContent: string;
}

/* ============================================================
   Client
   ============================================================ */

export class BedestenClient {
  private limiter = new RateLimiter();
  private requestTimeoutMs: number;

  constructor(opts: { timeoutMs?: number } = {}) {
    this.requestTimeoutMs = opts.timeoutMs ?? 60_000;
  }

  /**
   * Arama yap. Kararları döndürür (henüz içerik yok, sadece liste).
   */
  async searchDocuments(input: BedestenSearchInput): Promise<BedestenSearchResult> {
    await this.limiter.acquire();

    const body: Record<string, unknown> = {
      data: {
        pageSize: Math.min(10, Math.max(1, input.pageSize ?? 10)),
        pageNumber: input.pageNumber ?? 1,
        itemTypeList: [input.courtType ?? "YARGITAYKARARI"],
        phrase: input.phrase,
        sortFields: ["KARAR_TARIHI"],
        sortDirection: input.sortDirection ?? "desc",
      },
      applicationName: "UyapMevzuat",
      paging: true,
    };

    // Chamber (varsa)
    const chamberName = input.chamber ? chamberCodeToFullName(input.chamber) : "";
    if (chamberName) {
      (body.data as Record<string, unknown>).birimAdi = chamberName;
    }

    // Date filter
    if (input.dateStart) {
      (body.data as Record<string, unknown>).kararTarihiStart = input.dateStart;
    }
    if (input.dateEnd) {
      (body.data as Record<string, unknown>).kararTarihiEnd = input.dateEnd;
    }

    const response = await this.fetchWithTimeout(`${BASE_URL}${SEARCH_ENDPOINT}`, {
      method: "POST",
      headers: COMMON_HEADERS,
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = parseFloat(response.headers.get("Retry-After") || "30");
      this.limiter.penalize(retryAfter);
      throw new BedestenRateLimitedError(retryAfter);
    }

    if (!response.ok) {
      throw new Error(`Bedesten search ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      data?: {
        emsalKararList?: BedestenDecisionEntry[];
        total?: number;
        start?: number;
      };
      metadata?: Record<string, unknown>;
    };

    return {
      total: json.data?.total ?? 0,
      start: json.data?.start ?? 0,
      decisions: json.data?.emsalKararList ?? [],
    };
  }

  /**
   * Belirli bir karar metnini çek (HTML veya PDF döner).
   */
  async getDocument(documentId: string): Promise<BedestenDocumentResult> {
    await this.limiter.acquire();

    const body = {
      data: { documentId },
      applicationName: "UyapMevzuat",
    };

    const response = await this.fetchWithTimeout(`${BASE_URL}${DOCUMENT_ENDPOINT}`, {
      method: "POST",
      headers: COMMON_HEADERS,
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = parseFloat(response.headers.get("Retry-After") || "30");
      this.limiter.penalize(retryAfter);
      throw new BedestenRateLimitedError(retryAfter);
    }

    if (!response.ok) {
      throw new Error(`Bedesten document ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      data?: { content: string; mimeType: string };
    };

    if (!json.data?.content) {
      throw new Error("Belge içeriği boş");
    }

    const mimeType = json.data.mimeType || "text/html";
    const rawContent = Buffer.from(json.data.content, "base64").toString("utf-8");

    return {
      documentId,
      mimeType,
      rawContent,
      textContent: rawContent, // text temizliği decoder.ts'de yapılır
    };
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
