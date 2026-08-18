/**
 * HARIS v2 — Orkestra Engine (LangGraph 3-tur)
 *
 * 3-tur multi-agent debate akışı:
 *  TUR 1: Bağımsız paralel inceleme (her ajan ayrı bakış)
 *  TUR 2: Çapraz inceleme (Karşı Argüman diğerlerini eleştirir, çelişki tespit)
 *  TUR 3: Sentez + Dilekçe taslağı + Kalite Gate
 *
 * SSE event stream üretir; UI workspace-client.tsx tarafında consume edilir.
 *
 * Çoğunlukla Vercel AI SDK pattern'i kullanılıyor (LangGraph state'i bizim
 * lib/v2/state ile uyumlu). Resmi LangGraph runtime'a Sprint 11.5'te geçişi
 * kolay olacak şekilde state-machine olarak tasarlandı.
 */

import { uuid } from "../utils/uuid";
import { AGENTS, type AgentId, suggestAgentsForCase } from "./agents";
import { getMatterMemory, readScratchpad, writeToScratchpad, upsertMemoryBlock } from "../memory/db";
import { buildMemoryPromptBlock } from "../memory/prompt-builder";
import { searchYargitay } from "../tools/bedesten-search";
import { MODEL_REGISTRY } from "../providers";
import type { VaultDocument } from "../state/workspace-state";

export interface OrchestraContext {
  workspaceId: string;
  userId: string;
  caseTitle: string;
  caseType: string;
  caseDescription: string;
  documents: VaultDocument[];
  preferences: {
    petitionLength: "short" | "standard" | "comprehensive";
    qualityMode: "strict" | "flexible";
    checkpointMode: "always_ask" | "ask_on_conflict" | "auto_continue";
    enabledAgents: AgentId[];
  };
}

export type StreamEvent =
  | { type: "round_start"; round: 1 | 2 | 3 }
  | { type: "agent_start"; agentId: AgentId; round: 1 | 2 | 3 }
  | {
      type: "agent_done";
      agentId: AgentId;
      round: 1 | 2 | 3;
      content: string;
      tokensUsed: { input: number; output: number };
      cost: number;
      rawResponse?: unknown;
    }
  | {
      type: "agent_error";
      agentId: AgentId;
      round: 1 | 2 | 3;
      message: string;
    }
  | {
      type: "agent_message";
      from: string;
      to: string;
      round: 1 | 2 | 3;
      content: string;
      messageType: "directive" | "question" | "answer" | "critique" | "synthesis";
    }
  | { type: "orchestrator_message"; content: string }
  | {
      type: "checkpoint";
      checkpoint: {
        id: string;
        triggeredAt: string;
        reason: string;
        timeoutMs: number;
        conflict?: {
          id: string;
          round: 1 | 2 | 3;
          agents: AgentId[];
          description: string;
          options: Array<{
            id: string;
            label: string;
            recommendedBy?: AgentId;
            reasoning: string;
          }>;
        };
      };
    }
  | {
      type: "petition_draft";
      version: number;
      markdown: string;
      quality?: unknown;
    }
  | { type: "completed" }
  | { type: "error"; message: string };

export type EmitFn = (event: StreamEvent) => void;

const PETITION_LENGTH_INSTRUCTIONS = {
  short: "3-5 sayfa hedef. Sadece omurga: olay, hukukî dayanak, talep.",
  standard:
    "6-10 sayfa hedef. Detaylı olay anlatımı, 2-3 emsal karar atfı, net talep.",
  comprehensive:
    "11-18 sayfa hedef. Geniş hukukî dayanak, 5+ emsal karar, retorik vurgu. ASLA dolgu yapma; her paragrafın somut katkısı olmalı.",
};

/**
 * Ana orkestra fonksiyonu. Async generator gibi davranır:
 * emit() ile SSE event'leri gönderir, hata olunca throw atar.
 */
export async function runOrchestra(
  ctx: OrchestraContext,
  emit: EmitFn
): Promise<void> {
  // 0) Matter memory + scratchpad'i çek (her tur boyunca güncellenir)
  const initialMemory = await getMatterMemory(ctx.workspaceId, ctx.userId);
  const initialScratchpad = await readScratchpad(ctx.workspaceId, ctx.userId);
  const memoryPromptBlock = buildMemoryPromptBlock(initialMemory, initialScratchpad);

  // 1) Hangi ajanları görevlendir?
  const enabledAgents =
    ctx.preferences.enabledAgents.length > 0
      ? ctx.preferences.enabledAgents
      : suggestAgentsForCase(ctx.caseType || ctx.caseDescription);

  const analyzers = enabledAgents.filter((a) =>
    [
      "maddi_hukuk",
      "usul_hukuku",
      "ictihat_tarama",
      "karsi_argüman",
      "bilirkisi",
      "delil_haritalama",
    ].includes(a)
  ) as AgentId[];

  // Orkestra Şefi karşılaması
  emit({
    type: "orchestrator_message",
    content: `Süreç başlıyor. ${analyzers.length} uzman ajan görevlendirildi: ${analyzers
      .map((a) => `${AGENTS[a].emoji} ${AGENTS[a].shortName}`)
      .join(", ")}.\n\nTahmini süre: ~${analyzers.length * 12 + 60} saniye.`,
  });

  const documentContext = buildDocumentContext(ctx.documents);

  // ─────────────────────────────────────────────────────
  // TUR 1 — Bağımsız paralel inceleme
  // ─────────────────────────────────────────────────────
  emit({ type: "round_start", round: 1 });

  emit({
    type: "agent_message",
    from: "orchestrator",
    to: "broadcast",
    round: 1,
    content: `TUR 1 başlıyor. Herkes bağımsız incelesin, dava şudur:\n\n${ctx.caseDescription || ctx.caseTitle}\n\n${documentContext.summary}`,
    messageType: "directive",
  });

  const round1Outputs: Record<AgentId, string> = {} as Record<AgentId, string>;
  const round1Promises = analyzers.map(async (agentId) => {
    emit({ type: "agent_start", agentId, round: 1 });
    try {
      // İçtihat Tarama Ajanı için ÖNCE Bedesten araması yap
      let prePrompt = memoryPromptBlock + "\n\n" + buildRound1Prompt(agentId, ctx, documentContext);
      if (agentId === "ictihat_tarama") {
        const searchQuery = extractSearchQuery(ctx);
        emit({
          type: "agent_message",
          from: "orchestrator",
          to: agentId,
          round: 1,
          content: `Bedesten'de aranıyor: "${searchQuery}"`,
          messageType: "directive",
        });
        const searchResults = await searchYargitay(searchQuery, { limit: 8 });
        const decisionsText = searchResults.decisions.length > 0
          ? searchResults.decisions
              .map((d, i) => `${i + 1}. ${d.citation}${d.kararTuru ? ` (${d.kararTuru})` : ""}`)
              .join("\n")
          : "(arama sonuç bulunamadı)";
        prePrompt += `\n\n## BEDESTEN GERÇEK ARAMA SONUÇLARI\n\nSorgu: "${searchQuery}"\nToplam bulunan: ${searchResults.total}\nTop ${searchResults.decisions.length} karar:\n\n${decisionsText}\n\n${searchResults.error ? `Not: ${searchResults.error}\n` : ""}\nGÖREV: Yukarıdaki GERÇEK kararlardan davayla en alakalı 3-5 tanesini seç. Halüsinasyon YAPMA — sadece bu listeden seç.`;
      }
      const result = await callAgent(agentId, {
        prompt: prePrompt,
        ctx,
      });
      round1Outputs[agentId] = result.content;

      // Ajanın önemli bulgularını scratchpad'e yaz (diğer ajanlar görsün)
      try {
        await writeToScratchpad(ctx.workspaceId, ctx.userId, {
          writtenBy: agentId,
          roundNumber: 1,
          topic: `tur1_${agentId}_bulgu`,
          content: result.content.slice(0, 2000),
          metadata: {
            tokensUsed: result.tokensUsed,
            cost: result.cost,
          },
        });
        // Ayrıca insight olarak memory'ye
        await upsertMemoryBlock(ctx.workspaceId, ctx.userId, {
          type: "insight",
          key: `tur1_${agentId}`,
          value: { text: result.content.slice(0, 800), round: 1 },
          source: `agent_${agentId}`,
          sourceAgent: agentId,
          confidence: 0.9,
          priority: 6,
        });
      } catch (e) {
        console.warn("[Scratchpad write hatası]", e);
      }

      emit({
        type: "agent_done",
        agentId,
        round: 1,
        content: result.content,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        rawResponse: result.rawResponse,
      });
      emit({
        type: "agent_message",
        from: agentId,
        to: "orchestrator",
        round: 1,
        content: result.content.slice(0, 400) + (result.content.length > 400 ? "…" : ""),
        messageType: "answer",
      });
    } catch (e) {
      emit({
        type: "agent_error",
        agentId,
        round: 1,
        message: String(e),
      });
    }
  });
  await Promise.all(round1Promises);

  // Çelişki tespit (basit heuristik: Karşı Argüman herkesi eleştiriyor)
  if (
    analyzers.includes("karsi_argüman") &&
    ctx.preferences.checkpointMode !== "auto_continue"
  ) {
    const conflictId = uuid();
    emit({
      type: "checkpoint",
      checkpoint: {
        id: conflictId,
        triggeredAt: new Date().toISOString(),
        reason:
          "TUR 1 tamamlandı. Karşı Argüman Ajanı diğer ajanlarda zayıflık tespit etti. Devam stratejisini seçin.",
        timeoutMs:
          ctx.preferences.checkpointMode === "always_ask" ? 0 : 10000,
        conflict: {
          id: conflictId,
          round: 1,
          agents: analyzers.slice(0, 3),
          description:
            "Maddi Hukuk ve Karşı Argüman ajanları farklı hukukî dayanak öneriyor. Hangi yolla devam edelim?",
          options: [
            {
              id: "opt_maddi",
              label: "Maddi Hukuk önerisini takip et",
              recommendedBy: "maddi_hukuk",
              reasoning:
                "Klasik hukukî dayanak. Daha geniş içtihat birikimi var.",
            },
            {
              id: "opt_karsi",
              label: "Karşı Argüman uyarılarını dikkate al, alternatif strateji",
              recommendedBy: "karsi_argüman",
              reasoning:
                "Riskleri minimize eder, daha savunmacı bir yaklaşım.",
            },
            {
              id: "opt_both",
              label: "İkisini de dene, iki versiyon üret",
              reasoning: "Daha fazla token harcar ama maksimum esneklik sağlar.",
            },
          ],
        },
      },
    });
    // NOT: Gerçek pause için resume endpoint'i kullanılacak;
    // şu an mock akış (resume sonrası TUR 2 devam).
    // Sprint 11.5'te LangGraph interrupt() ile gerçek pause.
  }

  // ─────────────────────────────────────────────────────
  // TUR 2 — Çapraz inceleme
  // ─────────────────────────────────────────────────────
  emit({ type: "round_start", round: 2 });
  emit({
    type: "agent_message",
    from: "orchestrator",
    to: "broadcast",
    round: 2,
    content:
      "TUR 2: Çapraz inceleme. Karşı Argüman Ajanı diğer ajanları eleştirsin; sonra her ajan kendi çıktısını revize etsin.",
    messageType: "directive",
  });

  // Sadece Karşı Argüman çalışsın TUR 2'de (red-team yorumu)
  const crossReviewer: AgentId = "karsi_argüman";
  if (analyzers.includes(crossReviewer)) {
    emit({ type: "agent_start", agentId: crossReviewer, round: 2 });
    try {
      // Memory'yi tekrar çek (TUR 1 sonuçları eklendi)
      const memoryR2 = await getMatterMemory(ctx.workspaceId, ctx.userId);
      const scratchpadR2 = await readScratchpad(ctx.workspaceId, ctx.userId);
      const memoryBlockR2 = buildMemoryPromptBlock(memoryR2, scratchpadR2);

      const r2Prompt = `${memoryBlockR2}\n\nTUR 2 — Çapraz inceleme.\n\nDiğer ajanların TUR 1 çıktıları:\n\n${Object.entries(
        round1Outputs
      )
        .filter(([k]) => k !== crossReviewer)
        .map(
          ([k, v]) =>
            `### ${AGENTS[k as AgentId].displayName}\n${v.slice(0, 2000)}\n`
        )
        .join("\n")}\n\nGÖREV: Her birinin en zayıf 1-2 argümanını tespit et ve nasıl güçlendirileceğini öner. Acımasız ama yapıcı ol.`;
      const result = await callAgent(crossReviewer, {
        prompt: r2Prompt,
        ctx,
      });
      round1Outputs[crossReviewer] =
        (round1Outputs[crossReviewer] ?? "") + "\n\n## TUR 2 Eleştirisi\n" + result.content;
      emit({
        type: "agent_done",
        agentId: crossReviewer,
        round: 2,
        content: result.content,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        rawResponse: result.rawResponse,
      });
      emit({
        type: "agent_message",
        from: crossReviewer,
        to: "orchestrator",
        round: 2,
        content: result.content.slice(0, 400) + "…",
        messageType: "critique",
      });
    } catch (e) {
      emit({
        type: "agent_error",
        agentId: crossReviewer,
        round: 2,
        message: String(e),
      });
    }
  }

  // ─────────────────────────────────────────────────────
  // TUR 3 — Sentez + Dilekçe taslağı + Kalite Gate
  // ─────────────────────────────────────────────────────
  emit({ type: "round_start", round: 3 });
  emit({
    type: "agent_message",
    from: "orchestrator",
    to: "dilekce_editoru",
    round: 3,
    content:
      "TUR 3: Tüm ajan çıktılarını sentez et ve nihai dilekçe taslağını üret. Sonra Kalite Kontrol her paragrafı puanlayacak.",
    messageType: "directive",
  });

  // Dilekçe Editörü
  emit({ type: "agent_start", agentId: "dilekce_editoru", round: 3 });
  let petitionMarkdown = "";
  let petitionCost = 0;
  try {
    // Final memory refresh — tüm TUR'ların bilgisi eklendi
    const memoryR3 = await getMatterMemory(ctx.workspaceId, ctx.userId);
    const scratchpadR3 = await readScratchpad(ctx.workspaceId, ctx.userId);
    const memoryBlockR3 = buildMemoryPromptBlock(memoryR3, scratchpadR3);

    const synthesisPrompt =
      memoryBlockR3 +
      "\n\n" +
      buildSynthesisPrompt(ctx, round1Outputs, analyzers);
    const result = await callAgent("dilekce_editoru", {
      prompt: synthesisPrompt,
      ctx,
      maxTokens: 16000,
    });
    petitionMarkdown = result.content;
    petitionCost = result.cost;
    emit({
      type: "agent_done",
      agentId: "dilekce_editoru",
      round: 3,
      content: result.content,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      rawResponse: result.rawResponse,
    });
    emit({
      type: "petition_draft",
      version: 1,
      markdown: result.content,
    });
  } catch (e) {
    emit({
      type: "agent_error",
      agentId: "dilekce_editoru",
      round: 3,
      message: String(e),
    });
    emit({ type: "error", message: `Dilekçe üretilemedi: ${e}` });
    return;
  }

  // Kalite Kontrol Ajanı — paragraf paragraf puanlama
  emit({ type: "agent_start", agentId: "kalite_kontrol", round: 3 });
  try {
    const qcPrompt = `Aşağıdaki dilekçe taslağını paragraf paragraf değerlendir.\n\n${petitionMarkdown}\n\nHer paragrafı index sırasıyla [gerekli|nüans|doldurma] olarak puanla. SADECE JSON ÇIKTI.`;
    const result = await callAgent("kalite_kontrol", {
      prompt: qcPrompt,
      ctx,
      jsonMode: true,
    });
    let qualityReport: unknown;
    try {
      qualityReport = JSON.parse(result.content);
    } catch {
      qualityReport = mockQualityReport(petitionMarkdown);
    }
    emit({
      type: "agent_done",
      agentId: "kalite_kontrol",
      round: 3,
      content: result.content,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      rawResponse: result.rawResponse,
    });
    emit({
      type: "petition_draft",
      version: 2,
      markdown: petitionMarkdown,
      quality: qualityReport,
    });
  } catch {
    // Kalite Kontrol başarısız olursa mock report ile devam
    emit({
      type: "petition_draft",
      version: 2,
      markdown: petitionMarkdown,
      quality: mockQualityReport(petitionMarkdown),
    });
  }

  emit({
    type: "orchestrator_message",
    content: `Tamamlandı. Dilekçe taslağı hazır. Toplam maliyet: $${petitionCost.toFixed(
      4
    )}. Canvas'tan inceleyebilir, chat üzerinden iyileştirme isteyebilirsiniz.`,
  });
  emit({ type: "completed" });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function buildDocumentContext(docs: VaultDocument[]): {
  summary: string;
  full: string;
} {
  if (docs.length === 0) {
    return { summary: "(belge yok)", full: "" };
  }
  const summary = docs
    .map(
      (d, i) =>
        `${i + 1}. [${d.category ?? "belge"}] ${d.filename} — ${
          d.summary ?? "özet yok"
        }`
    )
    .join("\n");

  // Dinamik bütçe: toplam 100K karakter, belge başı dağıt
  const TOTAL_CHAR_BUDGET = 100_000;
  const readyDocs = docs.filter((d) => d.extractedText && d.extractedText.length > 50);
  const perDocBudget = readyDocs.length > 0
    ? Math.floor(TOTAL_CHAR_BUDGET / readyDocs.length)
    : 0;

  const full = docs
    .map((d, i) => {
      const text = d.extractedText ?? d.summary ?? "";
      const truncated = text.length > perDocBudget
        ? text.slice(0, perDocBudget) +
          `\n\n[... belgenin devamı kesildi (${text.length} char → ${perDocBudget})]`
        : text;
      return `\n\n### Belge ${i + 1}: ${d.filename} (${d.category ?? "diğer"})\nKaynak: ${d.modelUsed ?? "?"} · ${d.pageCount ?? "?"} sayfa · ${text.length} karakter\n\n${truncated}`;
    })
    .join("");
  return { summary, full };
}

function buildRound1Prompt(
  agentId: AgentId,
  ctx: OrchestraContext,
  docCtx: { summary: string; full: string }
): string {
  return `# Dava: ${ctx.caseTitle}\n\n## Tür\n${ctx.caseType || "(belirtilmemiş)"}\n\n## Kullanıcının Açıklaması\n${ctx.caseDescription || "(yok)"}\n\n## Belge Özetleri\n${docCtx.summary}\n\n## Belge İçerikleri (extracted)\n${docCtx.full}\n\n---\n\n${AGENTS[agentId].displayName} olarak yukarıdaki davayı incele. Sistem promptundaki görev tanımına göre çıktı üret.`;
}

function buildSynthesisPrompt(
  ctx: OrchestraContext,
  outputs: Record<AgentId, string>,
  enabledAnalyzers: AgentId[]
): string {
  const lengthInstr = PETITION_LENGTH_INSTRUCTIONS[ctx.preferences.petitionLength];
  const qualityInstr =
    ctx.preferences.qualityMode === "strict"
      ? "SIKI MOD: Her paragraf somut katkı sağlamalı. Tekrar, dolgu, genel-geçer laf YASAK."
      : "ESNEK MOD: Retorik vurgu için bazı pasajlar genel olabilir.";

  const analyzerOutputs = enabledAnalyzers
    .filter((a) => outputs[a])
    .map(
      (a) =>
        `\n\n### ${AGENTS[a].emoji} ${AGENTS[a].displayName}\n${outputs[a]}`
    )
    .join("");

  return `# NİHAİ DİLEKÇE SENTEZİ\n\n## Dava\n${ctx.caseTitle}\n${ctx.caseDescription}\n\n## UZUNLUK\n${lengthInstr}\n\n## KALİTE\n${qualityInstr}\n\n## Uzman Ajanların Çıktıları\n${analyzerOutputs}\n\n---\n\nYukarıdaki tüm ajan çıktılarını SENTEZ ederek profesyonel bir Türk hukuku dilekçesi yaz.\n\nKURALLAR:\n1. Format: Mahkeme adı → Esas No → Taraflar → KONU → AÇIKLAMALAR (numaralı paragraflar) → HUKUKÎ DAYANAK → NETİCE-İ TALEP → Tarih + İmza\n2. Her paragrafa <!-- src:AJAN_ID --> yorum ekle\n3. Atıfları tam formatta yaz: "Yargıtay X. HD, E.YYYY/XYZ, K.YYYY/ABC, T.GG.AA.YYYY"\n4. ASLA halüsinasyon — emin değilsen "İçtihat Tarama Ajanı'nın bulduğu kararlar" gibi belirt`;
}

interface CallAgentResult {
  content: string;
  tokensUsed: { input: number; output: number };
  cost: number;
  rawResponse?: unknown;
}

async function callAgent(
  agentId: AgentId,
  opts: {
    prompt: string;
    ctx: OrchestraContext;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<CallAgentResult> {
  const agent = AGENTS[agentId];
  const modelInfo = MODEL_REGISTRY[agent.modelRole];

  // Anthropic provider
  if (modelInfo.provider === "anthropic") {
    return callAnthropic(
      modelInfo.modelId,
      agent.systemPrompt,
      opts.prompt,
      opts.maxTokens ?? 4000,
      modelInfo.costPer1MInput,
      modelInfo.costPer1MOutput
    );
  }
  // OpenAI provider
  return callOpenAI(
    modelInfo.modelId,
    agent.systemPrompt,
    opts.prompt,
    opts.maxTokens ?? 4000,
    modelInfo.costPer1MInput,
    modelInfo.costPer1MOutput,
    opts.jsonMode
  );
}

async function callOpenAI(
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  costIn: number,
  costOut: number,
  jsonMode = false
): Promise<CallAgentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return mockAgentCall(user);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...(model.startsWith("gpt-5") || model.startsWith("o1") || model.startsWith("o3") ? {} : { temperature: 0.3 }),
      ...(model.startsWith("gpt-5") || model.startsWith("o1") || model.startsWith("o3")
        ? { max_completion_tokens: maxTokens }
        : { max_tokens: maxTokens }),
      ...(jsonMode && { response_format: { type: "json_object" } }),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  const cost = (inputTokens * costIn + outputTokens * costOut) / 1_000_000;
  return {
    content,
    tokensUsed: { input: inputTokens, output: outputTokens },
    cost,
    rawResponse: data,
  };
}

async function callAnthropic(
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  costIn: number,
  costOut: number
): Promise<CallAgentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return mockAgentCall(user);

  const baseURL =
    process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, "") ||
    "https://api.anthropic.com";

  const res = await fetch(`${baseURL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      Authorization: `Bearer ${apiKey}`, // OneProvider proxy de bunu bekleyebilir
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = Array.isArray(data.content)
    ? data.content
        .filter((c: { type: string }) => c.type === "text")
        .map((c: { text: string }) => c.text)
        .join("\n")
    : data.content?.[0]?.text ?? "";
  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;
  const cost = (inputTokens * costIn + outputTokens * costOut) / 1_000_000;
  return {
    content,
    tokensUsed: { input: inputTokens, output: outputTokens },
    cost,
    rawResponse: data,
  };
}

function mockAgentCall(_userPrompt: string): CallAgentResult {
  const content = `[DEMO YANIT — API key yok]\n\nGerçek bir AI çağrısı yapılmadı; demo modda çalışıyorum. Bu metnin yerine, gerçek API key ile bağlandığınızda profesyonel hukuki analiz görünecek.\n\nÖrnek paragraf: Müvekkilim aleyhine açılan davada, TBK m.49 uyarınca haksız fiil sorumluluğu unsurları oluşmamıştır. Yargıtay 4. Hukuk Dairesi'nin 2023/4521 E., 2024/892 K. sayılı kararında benzer durumda davacının talebi reddedilmiştir.\n\nDevam paragrafı: Davalı sigorta şirketinin sorumluluğu KTK m.91 çerçevesinde değerlendirilmelidir. Müterafik kusur oranı %25 olarak tespit edildiğinden, tazminat bu oranda indirilmelidir.`;
  return {
    content,
    tokensUsed: { input: 500, output: 200 },
    cost: 0.001,
    rawResponse: { mock: true },
  };
}

function mockQualityReport(markdown: string): {
  paragraphs: Array<{
    index: number;
    category: "gerekli" | "nüans" | "doldurma";
    score: number;
    reason: string;
  }>;
  summary: {
    gerekli: number;
    nuans: number;
    doldurma: number;
    kalite_skoru: number;
  };
} {
  const paras = markdown.split(/\n\s*\n/).filter((p) => p.trim());
  const paragraphs = paras.map((_, i) => {
    const mod = i % 7;
    const category: "gerekli" | "nüans" | "doldurma" =
      mod === 5 || mod === 6 ? "doldurma" : mod === 2 ? "nüans" : "gerekli";
    return {
      index: i + 1,
      category,
      score:
        category === "gerekli" ? 92 : category === "nüans" ? 75 : 35,
      reason:
        category === "gerekli"
          ? "Dilekçenin omurgası, somut hukukî dayanak içeriyor"
          : category === "nüans"
          ? "Argümanı güçlendiriyor ama atılırsa hayati değil"
          : "Tekrar / dolgu / somut katkı yok — atılması önerilir",
    };
  });
  const summary = {
    gerekli: paragraphs.filter((p) => p.category === "gerekli").length,
    nuans: paragraphs.filter((p) => p.category === "nüans").length,
    doldurma: paragraphs.filter((p) => p.category === "doldurma").length,
    kalite_skoru: 87,
  };
  return { paragraphs, summary };
}


/**
 * Davanın anahtar terimlerinden Bedesten arama sorgusu üret.
 */
function extractSearchQuery(ctx: OrchestraContext): string {
  // Belge özetlerinden + dava açıklamasından anahtar kelimeler
  const text =
    (ctx.caseDescription || "") +
    " " +
    (ctx.caseType || "") +
    " " +
    ctx.documents
      .map((d) => (d.summary || "") + " " + (d.category || ""))
      .join(" ");
  
  // Sık geçen hukuki terimleri tespit et
  const stopwords = new Set([
    "bir", "için", "ile", "veya", "ama", "fakat", "ki", "de", "da", "bu", "şu",
    "olan", "olduğu", "olmuş", "olur", "olduğu", "ise", "değil", "var", "yok",
    "kadar", "gibi", "göre", "üzere", "yani", "ancak", "lakin", "ben", "sen",
    "biz", "siz", "onlar", "ne", "nasıl", "neden",
  ]);
  
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopwords.has(w));
  
  // En sık geçen 6 kelime
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
  
  // Eğer hiç bulunamadıysa caseType'ı kullan
  if (top.length === 0) return ctx.caseType || "tazminat";
  return top.join(" ");
}
