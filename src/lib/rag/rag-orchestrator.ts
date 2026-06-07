/**
 * RAG ile zenginleştirilmiş ajan çağrısı.
 *
 * Bazı ajanlar (caseHunter, legislationScanner, doctrineScanner) retrieval'dan
 * çok faydalanır — onlar için otomatik olarak korpustan ilgili belgeleri
 * çekip context'e enjekte ederiz.
 *
 * Diğer ajanlar (factAnalyst, riskAnalyst vb.) sadece dava bağlamına bakar.
 */

import type { AgentId } from "@/lib/ai/prompts";
import { search, formatContextForAgent, type SearchResult } from "./store";
import type { DocCategory, LegalArea } from "./corpus";

/** Hangi ajan için hangi kategorilerden retrieval yapalım */
const AGENT_RETRIEVAL_CONFIG: Partial<
  Record<
    AgentId,
    { categories: DocCategory[]; topK: number; lexicalWeight: number }
  >
> = {
  caseHunter: {
    categories: ["yargitay", "danistay", "aym", "aihm"],
    topK: 6,
    lexicalWeight: 0.3,
  },
  legislationScanner: {
    categories: ["mevzuat"],
    topK: 5,
    lexicalWeight: 0.4,
  },
  doctrineScanner: {
    categories: ["doktrin", "yargitay"],
    topK: 4,
    lexicalWeight: 0.3,
  },
  legalClassifier: {
    categories: ["mevzuat", "yargitay"],
    topK: 5,
    lexicalWeight: 0.35,
  },
  petitionWriter: {
    categories: ["mevzuat", "yargitay"],
    topK: 6,
    lexicalWeight: 0.35,
  },
};

/**
 * Bir ajanın hangi area'lara odaklanacağını tespit et.
 * Dava context'inden ipucu çıkarmaya çalışır.
 */
function inferAreasFromContext(context: string): LegalArea[] {
  const lower = context.toLowerCase();
  const areas: LegalArea[] = [];

  if (/trafik|kaza|tazminat|maluliyet|sigorta/i.test(lower)) areas.push("tazminat");
  if (/iş|kıdem|ihbar|işveren|işçi|fesih|mobbing/i.test(lower)) areas.push("is");
  if (/ticari|sözleşme|şirket|tacir|ttk/i.test(lower)) areas.push("ticari");
  if (/boşanma|velayet|nafaka|mal rejimi|evlilik|aile/i.test(lower)) areas.push("aile");
  if (/ceza|suç|sanık|tck|cmk|tutukluluk|meşru müdafaa/i.test(lower))
    areas.push("ceza");
  if (/icra|takip|haciz|iflas|iik/i.test(lower)) areas.push("icra");
  if (/idari|iyuk|idare|işlem iptali/i.test(lower)) areas.push("idari");

  return areas;
}

/**
 * Ajan için retrieval yap; context'e enjekte edilecek RAG bloğunu döndür.
 * Eğer ajan retrieval'dan faydalanmıyorsa null döner.
 */
export async function retrieveForAgent(
  agentId: AgentId,
  context: string,
  query?: string
): Promise<{
  ragBlock: string | null;
  results: SearchResult[];
}> {
  const config = AGENT_RETRIEVAL_CONFIG[agentId];
  if (!config) return { ragBlock: null, results: [] };

  const searchQuery = query || context.slice(0, 500);
  const areas = inferAreasFromContext(context);

  const results = await search(searchQuery, {
    topK: config.topK,
    categories: config.categories,
    areas: areas.length > 0 ? areas : undefined,
    lexicalWeight: config.lexicalWeight,
    minScore: 0.05,
  });

  if (results.length === 0) return { ragBlock: null, results: [] };

  return {
    ragBlock: formatContextForAgent(results),
    results,
  };
}
