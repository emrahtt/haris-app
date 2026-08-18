/**
 * HARIS v2 — Bedesten (Yargıtay) Arama Tool'u
 *
 * İçtihat Tarama Ajanı ve Atıf Doğrulayıcı Ajanı tarafından kullanılır.
 * Mevcut Faz 7.5 BedestenClient'ı sarar, AI-friendly arayüz sunar.
 *
 * Akış:
 *   1. AI ajan "trafik kazası tazminat müterafik kusur" gibi sorgu üretir
 *   2. searchYargitay() çağrılır → top N Yargıtay kararı döner
 *   3. AI alakalılığa göre 3-5 tanesini seçer, atıf olarak kullanır
 *   4. Halüsinasyon yok — sadece gerçek kararlar
 */

import {
  BedestenClient,
  BedestenRateLimitedError,
} from "@/lib/scraping/adapters/bedesten-client";

export interface SearchedDecision {
  documentId: string;
  court: string; // "Yargıtay 4. Hukuk Dairesi"
  esasNo: string | null; // "2023/12345"
  kararNo: string | null; // "2024/567"
  kararTarihi: string; // "12.03.2024"
  kararTuru?: string;
  /** Tam atıf metni: "Yargıtay 4. HD, E.2023/12345, K.2024/567, T.12.03.2024" */
  citation: string;
}

export interface SearchResult {
  query: string;
  total: number;
  decisions: SearchedDecision[];
  rateLimited?: boolean;
  error?: string;
}

const bedesten = new BedestenClient();

/**
 * Yargıtay'da arama yap, top N gerçek kararı döner.
 * AI ajanlarının tool olarak çağırması için tasarlandı.
 */
export async function searchYargitay(
  query: string,
  options: {
    limit?: number;
    courtType?: "YARGITAYKARARI" | "DANISTAYKARAR" | "ISTINAFHUKUK";
    dateStart?: string;
    dateEnd?: string;
  } = {}
): Promise<SearchResult> {
  // Production switch
  if (process.env.YGT_SCRAPER_ENABLED !== "true") {
    return mockSearchResult(query);
  }

  const limit = Math.min(options.limit ?? 5, 10);

  try {
    const result = await bedesten.searchDocuments({
      phrase: query,
      courtType: options.courtType ?? "YARGITAYKARARI",
      pageSize: limit,
      pageNumber: 1,
      sortDirection: "desc",
      ...(options.dateStart && { dateStart: options.dateStart }),
      ...(options.dateEnd && { dateEnd: options.dateEnd }),
    });

    const decisions: SearchedDecision[] = result.decisions.map((d) => ({
      documentId: d.documentId,
      court: d.birimAdi ?? "Yargıtay",
      esasNo: d.esasNo,
      kararNo: d.kararNo,
      kararTarihi: d.kararTarihiStr,
      kararTuru: d.kararTuru,
      citation: formatCitation(d.birimAdi, d.esasNo, d.kararNo, d.kararTarihiStr),
    }));

    return {
      query,
      total: result.total,
      decisions,
    };
  } catch (e) {
    if (e instanceof BedestenRateLimitedError) {
      return {
        query,
        total: 0,
        decisions: [],
        rateLimited: true,
        error: "Bedesten rate limit aşıldı (10 req/30s). Birkaç saniye sonra tekrar deneyin.",
      };
    }
    return {
      query,
      total: 0,
      decisions: [],
      error: String(e).slice(0, 200),
    };
  }
}

/**
 * Belirli bir kararın TAM METNİNİ getir.
 * Atıf Doğrulayıcı Ajanı için kritik.
 */
export async function getYargitayDecisionContent(
  documentId: string
): Promise<{ content?: string; error?: string }> {
  if (process.env.YGT_SCRAPER_ENABLED !== "true") {
    return {
      content: `[Demo karar metni]\n\nKaraya konu olay: Trafik kazası tazminat davası. Mahkeme, müterafik kusur oranını dikkate alarak tazminatın %25 oranında indirilmesine karar vermiştir.\n\nGerçek karar metni için YGT_SCRAPER_ENABLED=true ortam değişkenini ayarlayın.`,
    };
  }
  try {
    const result = await bedesten.getDocument(documentId);
    return { content: result.textContent };
  } catch (e) {
    return { error: String(e).slice(0, 200) };
  }
}

/**
 * Yargıtay atıf formatı: "Yargıtay X. HD, E.2023/12345, K.2024/567, T.12.03.2024"
 */
function formatCitation(
  court: string | null,
  esas: string | null,
  karar: string | null,
  tarih: string
): string {
  const courtShort = (court ?? "Yargıtay")
    .replace("Hukuk Dairesi", "HD")
    .replace("Ceza Dairesi", "CD")
    .replace("Hukuk Genel Kurulu", "HGK")
    .replace("Ceza Genel Kurulu", "CGK")
    .trim();
  const parts = [courtShort];
  if (esas) parts.push(`E.${esas}`);
  if (karar) parts.push(`K.${karar}`);
  if (tarih) parts.push(`T.${tarih}`);
  return parts.join(", ");
}

function mockSearchResult(query: string): SearchResult {
  return {
    query,
    total: 0,
    decisions: [
      {
        documentId: "demo-001",
        court: "Yargıtay 4. Hukuk Dairesi",
        esasNo: "2023/4521",
        kararNo: "2024/892",
        kararTarihi: "12.03.2024",
        citation: "Yargıtay 4. HD, E.2023/4521, K.2024/892, T.12.03.2024",
      },
      {
        documentId: "demo-002",
        court: "Yargıtay 17. Hukuk Dairesi",
        esasNo: "2022/7890",
        kararNo: "2023/345",
        kararTarihi: "05.06.2023",
        citation: "Yargıtay 17. HD, E.2022/7890, K.2023/345, T.05.06.2023",
      },
    ],
    error: "Demo mod (YGT_SCRAPER_ENABLED=true değil)",
  };
}

/**
 * AI ajan için tool definition (OpenAI/Anthropic function calling formatı).
 */
export const BEDESTEN_TOOL_DEFINITION = {
  name: "search_yargitay",
  description:
    "Yargıtay/Danıştay'da gerçek karar arama. Türk hukuku içtihat aramalarında kullanın. Halüsinasyon yapmayın — sadece bu tool'un döndürdüğü kararları atıf olarak kullanın.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Arama sorgusu (Türkçe hukuki kavramlar). Örn: 'trafik kazası tazminat müterafik kusur'",
      },
      limit: {
        type: "number",
        description: "Maks. dönecek karar sayısı (1-10, default 5)",
      },
      courtType: {
        type: "string",
        enum: ["YARGITAYKARARI", "DANISTAYKARAR", "ISTINAFHUKUK"],
        description: "Mahkeme türü, default YARGITAYKARARI",
      },
    },
    required: ["query"],
  },
};
