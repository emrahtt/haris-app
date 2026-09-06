import { streamText, type CoreMessage } from "ai";
import { getModel } from "./provider";
import { aiConfig, isAiDemoMode } from "./config";
import { AGENT_PROMPTS, type AgentId } from "./prompts";
import { getDemoResponse } from "./demo-streams";
import { retrieveForAgent } from "@/lib/rag/rag-orchestrator";
import type { SearchResult } from "@/lib/rag/store";

export interface AgentRunInput {
  agentId: AgentId;
  /** Kullanıcının bağlamı (dava bilgisi, kullanıcı sorusu) */
  context: string;
  /** Önceki ajanların çıktıları (orchestrator kullanır) */
  previousOutputs?: Record<string, string>;
  /** Adversarial için: hangi dilekçeye saldırılacak */
  targetText?: string;
  /** Hangi model — yoksa varsayılan */
  modelSpec?: string;
  /** RAG'ı devre dışı bırak (test/debug için) */
  disableRag?: boolean;
}

/**
 * Tek bir ajanı çalıştırır (streaming).
 * - RAG: caseHunter/legislationScanner gibi ajanlar için otomatik retrieval
 * - Demo modda simulated streaming üretir.
 *
 * Response header'larında x-haris-rag-* bilgisi gönderir (UI'da provenance göstermek için)
 */
export async function runAgentStream(input: AgentRunInput) {
  const { agentId, context, previousOutputs, targetText, disableRag } = input;

  // ---- RAG retrieval (gerekiyorsa)
  let ragBlock: string | null = null;
  let ragResults: SearchResult[] = [];
  if (!disableRag) {
    try {
      const rag = await retrieveForAgent(agentId, context);
      ragBlock = rag.ragBlock;
      ragResults = rag.results;
    } catch (err) {
      console.warn("[orchestrator] RAG başarısız:", err);
    }
  }

  // ---- Sistem prompt'unu hazırla
  const systemPrompt = AGENT_PROMPTS[agentId];

  // ---- Kullanıcı mesajını oluştur
  let userMessage = `# DAVA BAĞLAMI\n\n${context}\n`;

  if (ragBlock) {
    userMessage += `\n\n${ragBlock}\n`;
  }

  if (previousOutputs && Object.keys(previousOutputs).length > 0) {
    userMessage += `\n\n# DİĞER AJAN ÇIKTILARI\n\n`;
    for (const [agent, output] of Object.entries(previousOutputs)) {
      userMessage += `## ${agent}\n${output}\n\n---\n\n`;
    }
  }

  if (targetText) {
    userMessage += `\n\n# İNCELENECEK DİLEKÇE\n\n${targetText}`;
  }

  userMessage += `\n\nLütfen rolün gereğince eksiksiz çıktı üret.`;

  // RAG provenance header'ları
  const ragHeaders: Record<string, string> = {};
  if (ragResults.length > 0) {
    ragHeaders["X-Haris-Rag-Count"] = String(ragResults.length);
    ragHeaders["X-Haris-Rag-Ids"] = ragResults.map((r) => r.doc.id).join(",");
    ragHeaders["X-Haris-Rag-Scores"] = ragResults
      .map((r) => r.score.toFixed(3))
      .join(",");
  }

  // ---- DEMO MODE
  if (isAiDemoMode) {
    return createDemoStream(agentId, ragHeaders);
  }

  // ---- GERÇEK AI ÇAĞRISI
  const modelSpec =
    input.modelSpec ||
    (agentId === "adversarial" ? aiConfig.adversarialModel : aiConfig.defaultModel);

  const model = getModel(modelSpec);

  const messages: CoreMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const result = streamText({
    model,
    messages,
    maxTokens: aiConfig.maxTokens,
    temperature: agentId === "petitionWriter" || agentId === "editor" ? 0.3 : 0.6,
  });

  // Vercel AI SDK Response'ı al, header ekle
  const response = result.toTextStreamResponse();
  for (const [k, v] of Object.entries(ragHeaders)) {
    response.headers.set(k, v);
  }
  return response;
}

/**
 * Demo Mode: Hazır yanıtı token-by-token simulated streaming olarak gönder.
 */
function createDemoStream(
  agentId: AgentId,
  extraHeaders: Record<string, string> = {}
): Response {
  const fullText = getDemoResponse(agentId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const words = fullText.split(/(\s+)/);

      for (let i = 0; i < words.length; i++) {
        controller.enqueue(encoder.encode(words[i]));
        const delay = i < 5 ? 100 + Math.random() * 100 : 15 + Math.random() * 35;
        await new Promise((r) => setTimeout(r, delay));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Haris-Mode": "demo",
      ...extraHeaders,
    },
  });
}

/**
 * Çoklu-ajan pipeline'ları
 */
export const AGENT_PIPELINE: Record<string, AgentId[]> = {
  quick: ["factAnalyst", "legalClassifier", "riskAnalyst"],
  deep: [
    "factAnalyst",
    "legalClassifier",
    "legislationScanner",
    "caseHunter",
    "doctrineScanner",
    "procedureExpert",
    "riskAnalyst",
  ],
  petition: ["petitionWriter", "defenseArchitect", "editor", "adversarial"],
  adversarial: ["adversarial"],
};
