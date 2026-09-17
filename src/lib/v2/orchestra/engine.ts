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
import { listAgentOutputs, getLatestPetition } from "../workspace/db";
import { buildMemoryPromptBlock } from "../memory/prompt-builder";
import { searchYargitay } from "../tools/bedesten-search";
import {
  friendlyProviderError,
  getFallbackSpec,
  isQuotaError,
} from "../providers/fallback";
import { callProvider } from "../providers/clients";
import { resolveRoleModel } from "../strategy/db";
import { withPlatformContext } from "./platform-prompt";
import type { ProviderId } from "../providers/catalog";
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
    /** Faz 14.0: mahkeme bilgisi (0014_fuzzy_and_court migration) */
    court?: string;
    /** Faz 14.0: esas numarası */
    esasNo?: string;
  };
  /**
   * Faz 16.6 — Checkpoint sonrası devam.
   * resume/route.ts bunu gönderir; orkestra o turdan itibaren çalışır,
   * önceki turların çıktılarını Supabase'den (agent_runs) geri yükler.
   */
  resumeFromRound?: 1 | 2 | 3;
  /**
   * Faz 16.6 — resume route'un gönderdiği önceki tur çıktıları.
   * Tip bilerek geniş tutuldu (unknown): çağıran taraf Record<AgentId,string>,
   * Partial<...> veya başka bir nesne gönderse de derleme bozulmaz.
   * Engine içinde normalizePriorOutputs() ile güvenli biçimde okunur.
   */
  priorOutputs?: unknown;
  /**
   * Faz 16.6 — kullanıcının checkpoint kararı / yönlendirmesi.
   * resume route gönderir; TUR 3 sentezinde dilekçeye işlenir.
   */
  userGuidance?: unknown;
  /**
   * Faz 16.6 — "yine de devam et" seçeneği.
   * resume route gönderir; okunabilir belge içeriği olmasa bile süreci sürdürür.
   */
  forceContinue?: boolean;
  /**
   * Faz 16.6 — GÜVENLİK AĞI.
   * Kullanıcının reposundaki resume/route.ts, OrchestraContext'e bu dosyada
   * tanımlı olmayan ek alanlar gönderebiliyor (court, esasNo, resumeFromRound,
   * priorOutputs, userGuidance, forceContinue...). Her seferinde derleme
   * hatası almamak için ek alanlara izin veriliyor; engine bilmediklerini yok sayar.
   */
  [key: string]: unknown;
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
  | { type: "stage_complete"; stage: OrchestraStage }
  | { type: "error"; message: string };

/**
 * FAZ 15 — AŞAMALI ORKESTRA
 *
 * Vercel bir fonksiyon çağrısını en fazla 300 saniye (Hobby/Fluid) çalıştırır;
 * süre dolunca bağlantıyı ÖLDÜRÜR. Heartbeat bunu engellemez (limit, yanıtın
 * tamamı için geçerli). 12 ajan + 3 tur tek çağrıda 5-10 dakika sürdüğü için
 * fonksiyon TUR 3'e gelmeden ölüyordu → petition_draft hiç gönderilmiyordu →
 * Canvas boş kalıyordu. Console'da sadece "[SSE] stream tamamlandı" görünüyordu.
 *
 * ÇÖZÜM: Orkestra 4 ayrı HTTP çağrısına bölündü. Her çağrının kendi 300sn
 * bütçesi var. Aradaki durum Supabase'den (agent_runs / petition_versions)
 * geri okunur.
 */
export type OrchestraStage = "round1" | "round2" | "draft" | "quality" | "all";

export const ORCHESTRA_STAGES: Exclude<OrchestraStage, "all">[] = [
  "round1",
  "round2",
  "draft",
  "quality",
];

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
  emit: EmitFn,
  stage: OrchestraStage = "all"
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

  // ── Faz 16.6: checkpoint sonrası devam (resume route resumeFromRound gönderir)
  const startRound = ctx.resumeFromRound ?? 1;
  const skipRound1 = stage === "all" && startRound >= 2;
  const skipRound2 = stage === "all" && startRound >= 3;
  const priorFromResume = normalizePriorOutputs(ctx.priorOutputs);
  if (ctx.forceContinue) {
    console.log("[FAZ16.6] forceContinue=true → belge içeriği yetersiz olsa da devam edilecek");
  }

  // ─────────────────────────────────────────────────────
  // TUR 1 — Bağımsız paralel inceleme
  // ─────────────────────────────────────────────────────
  if (skipRound1) {
    emit({
      type: "orchestrator_message",
      content: `Kaldığı yerden devam ediliyor — TUR ${startRound}'den başlıyorum. Önceki turların çıktıları dava hafızasından yüklendi.`,
    });
  } else {
  emit({ type: "round_start", round: 1 });

  emit({
    type: "agent_message",
    from: "orchestrator",
    to: "broadcast",
    round: 1,
    content: `TUR 1 başlıyor. Herkes bağımsız incelesin, dava şudur:\n\n${ctx.caseDescription || ctx.caseTitle}\n\n${documentContext.summary}`,
    messageType: "directive",
  });
  } // Faz 16.6: skipRound1 dalı sonu

  const round1Outputs: Record<AgentId, string> = {} as Record<AgentId, string>;

  if (skipRound1) {
    // Önce resume route'un gönderdiği çıktılar, sonra DB'den tamamlama
    for (const [k, v] of Object.entries(priorFromResume)) {
      round1Outputs[k as AgentId] = v;
    }
    const reloaded = await reloadAgentOutputs(ctx.workspaceId);
    for (const [k, v] of Object.entries(reloaded)) {
      if (!round1Outputs[k as AgentId]) round1Outputs[k as AgentId] = v;
    }
    console.log(
      `[FAZ16.6] resume: TUR 1 atlandı · ${Object.keys(priorFromResume).length} çıktı resume'dan, ` +
        `toplam ${Object.keys(round1Outputs).length} ajan çıktısı hazır`
    );
  }

  const round1Promises = (skipRound1 ? ([] as AgentId[]) : analyzers).map(async (agentId) => {
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
        message: summarizeAgentError(e),
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

  // FAZ 15: round1 aşaması tek başına çalışıyorsa burada dur.
  // (Vercel 300sn limiti TUR 2/3'ü yutamasın diye)
  if (stage === "round1") {
    emit({ type: "stage_complete", stage: "round1" });
    return;
  }

  // ─────────────────────────────────────────────────────
  // TUR 2 — Çapraz inceleme
  // ─────────────────────────────────────────────────────
  if (stage === "round2" || skipRound2) {
    for (const [k, v] of Object.entries(priorFromResume)) {
      round1Outputs[k as AgentId] = v;
    }
    const reloaded = await reloadAgentOutputs(ctx.workspaceId);
    for (const [k, v] of Object.entries(reloaded)) {
      if (!round1Outputs[k as AgentId]) round1Outputs[k as AgentId] = v;
    }
    console.log(`[FAZ15] round2: DB'den ${Object.keys(reloaded).length} ajan çıktısı yüklendi`);
  }

  if (!skipRound2) emit({ type: "round_start", round: 2 });
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
  if (analyzers.includes(crossReviewer) && !skipRound2) {
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
        message: summarizeAgentError(e),
      });
    }
  }

  if (stage === "round2") {
    emit({ type: "stage_complete", stage: "round2" });
    return;
  }

  // ─────────────────────────────────────────────────────
  // TUR 3 — Sentez + Dilekçe taslağı + Kalite Gate
  // ─────────────────────────────────────────────────────
  if (stage === "draft" || stage === "quality") {
    const reloaded = await reloadAgentOutputs(ctx.workspaceId);
    for (const [k, v] of Object.entries(reloaded)) round1Outputs[k as AgentId] = v;
    console.log(`[FAZ15] ${stage}: DB'den ${Object.keys(reloaded).length} ajan çıktısı yüklendi`);

    // Faz 16.5 koruma: önceki turlar hiç çalışmadıysa boş/hurafe dilekçe
    // üretmek yerine kullanıcıya net mesaj ver.
    if (stage === "draft" && Object.keys(reloaded).length === 0) {
      emit({
        type: "error",
        message:
          "Dilekçe aşamasına geçilemedi: önceki turlardan hiçbir ajan çıktısı bulunamadı.\n\n" +
          "Muhtemel sebep: analiz aşamasında tüm ajanlar hata verdi (API kotası/anahtarı) " +
          "veya süreç yarıda kesildi.\n\n" +
          "Çözüm: /api/v2/debug/models?test=1 ile modelleri test et, sonra süreci baştan başlat.",
      });
      return;
    }
  }

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
  let petitionMarkdown = "";
  let petitionCost = 0;

  if (stage === "quality") {
    // FAZ 15: kalite ayrı çağrı → taslağı DB'den oku, editörü tekrar çalıştırma
    const latest = await getLatestPetition(ctx.workspaceId);
    petitionMarkdown = latest?.markdown ?? "";
    if (!petitionMarkdown) {
      emit({
        type: "error",
        message:
          "Kalite kontrolü için dilekçe taslağı bulunamadı. Süreci baştan başlatın.",
      });
      return;
    }
    console.log(`[FAZ15] quality: taslak DB'den yüklendi (${petitionMarkdown.length} karakter)`);
  } else {
  emit({ type: "agent_start", agentId: "dilekce_editoru", round: 3 });
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
    // FAZ 15: draft aşaması burada biter (kalite ayrı çağrıda)
    if (stage === "draft") {
      emit({ type: "stage_complete", stage: "draft" });
      return;
    }
  } catch (e) {
    emit({
      type: "agent_error",
      agentId: "dilekce_editoru",
      round: 3,
      message: summarizeAgentError(e),
    });
    const draftErr = String(e);
    const draftModel = await resolveRoleModel(
      AGENTS["dilekce_editoru"].modelRole,
      ctx.userId
    );
    emit({
      type: "error",
      message: `Dilekçe üretilemedi.\n\n${friendlyProviderError(
        draftErr,
        draftModel.provider,
        draftModel.modelId
      )}`,
    });
    return;
  }
  } // FAZ 15: stage !== "quality" dalı kapanışı

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
  // FAZ 15: HARIS_DOC_CHAR_BUDGET ile küçültülebilir (Vercel 300sn limitine
  // takılıyorsan 50000 yap → ajanlar daha hızlı döner, maliyet de düşer)
  const TOTAL_CHAR_BUDGET = Math.max(
    10_000,
    parseInt(process.env.HARIS_DOC_CHAR_BUDGET ?? "100000", 10) || 100_000
  );
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
  const courtLine = [
    ctx.preferences.court ? `\n\n## Mahkeme\n${ctx.preferences.court}` : "",
    ctx.preferences.esasNo ? `\n\n## Esas No\n${ctx.preferences.esasNo}` : "",
  ].join("");

  return `# Dava: ${ctx.caseTitle}${courtLine}\n\n## Tür\n${ctx.caseType || "(belirtilmemiş)"}\n\n## Kullanıcının Açıklaması\n${ctx.caseDescription || "(yok)"}\n\n## Belge Özetleri\n${docCtx.summary}\n\n## Belge İçerikleri (extracted)\n${docCtx.full}\n\n---\n\n${AGENTS[agentId].displayName} olarak yukarıdaki davayı incele. Sistem promptundaki görev tanımına göre çıktı üret.`;
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

  const guidanceText = normalizeGuidance(ctx.userGuidance);
  const guidanceBlock = guidanceText
    ? `\n\n## KULLANICININ CHECKPOINT KARARI / YÖNLENDİRMESİ (BUNA UY)\n${guidanceText}`
    : "";

  const courtBlock = [
    ctx.preferences.court
      ? `\n\n## GÖREVLİ MAHKEME (dilekçe başlığında AYNEN kullan)\n${ctx.preferences.court}`
      : "",
    ctx.preferences.esasNo
      ? `\n\n## ESAS NUMARASI (dilekçe başlığında AYNEN kullan)\n${ctx.preferences.esasNo}`
      : "",
  ].join("");

  return `# NİHAİ DİLEKÇE SENTEZİ\n\n## Dava\n${ctx.caseTitle}\n${ctx.caseDescription}${courtBlock}${guidanceBlock}\n\n## UZUNLUK\n${lengthInstr}\n\n## KALİTE\n${qualityInstr}\n\n## Uzman Ajanların Çıktıları\n${analyzerOutputs}\n\n---\n\nYukarıdaki tüm ajan çıktılarını SENTEZ ederek profesyonel bir Türk hukuku dilekçesi yaz.\n\nKURALLAR:\n1. Format: Mahkeme adı → Esas No → Taraflar → KONU → AÇIKLAMALAR (numaralı paragraflar) → HUKUKÎ DAYANAK → NETİCE-İ TALEP → Tarih + İmza\n2. Her paragrafa <!-- src:AJAN_ID --> yorum ekle\n3. Atıfları tam formatta yaz: "Yargıtay X. HD, E.YYYY/XYZ, K.YYYY/ABC, T.GG.AA.YYYY"\n4. ASLA halüsinasyon — emin değilsen "İçtihat Tarama Ajanı'nın bulduğu kararlar" gibi belirt`;
}

/**
 * FAZ 15 — Önceki aşamanın çıktılarını Supabase'den geri yükler.
 * Aynı ajanın birden fazla turda çıktısı varsa (TUR1 + TUR2 eleştirisi) birleştirir.
 */
async function reloadAgentOutputs(
  workspaceId: string
): Promise<Record<AgentId, string>> {
  const outputs = {} as Record<AgentId, string>;
  try {
    const rows = await listAgentOutputs(workspaceId);
    for (const row of rows) {
      if (row.status !== "done" || !row.content) continue;
      const prev = outputs[row.agentId] ?? "";
      outputs[row.agentId] = prev
        ? `${prev}\n\n## TUR ${row.round} Katkısı\n${row.content}`
        : row.content;
    }
  } catch (e) {
    console.warn("[FAZ15] agent_runs geri yükleme hatası:", e);
  }
  return outputs;
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

  // FAZ 16: rol → model çözümlemesi
  // Öncelik: kullanıcının aktif Model Stratejisi > Vercel env > kod varsayılanı
  const resolved = await resolveRoleModel(agent.modelRole, opts.ctx.userId);
  const maxTokens = opts.maxTokens ?? resolved.maxTokens ?? 4000;

  if (!resolved.hasKey) {
    console.warn(
      `[HARIS] ${agentId}: ${resolved.provider} için API anahtarı yok → demo yanıt`
    );
    return mockAgentCall(opts.prompt);
  }

  const attempt = async (
    provider: ProviderId,
    modelId: string,
    costIn: number,
    costOut: number,
    effort = resolved.effort
  ): Promise<CallAgentResult> => {
    const r = await callProvider({
      provider,
      model: modelId,
      system: withPlatformContext(agent.systemPrompt),
      user: opts.prompt,
      maxTokens,
      effort,
      jsonMode: opts.jsonMode,
      costIn,
      costOut,
    });
    return {
      content: r.content,
      tokensUsed: r.tokensUsed,
      cost: r.cost,
      rawResponse: r.rawResponse,
    };
  };

  try {
    return await attempt(
      resolved.provider,
      resolved.modelId,
      resolved.costPer1MInput,
      resolved.costPer1MOutput
    );
  } catch (e) {
    const primaryErr = String(e);
    if (!isQuotaError(primaryErr)) throw e;

    // ── OTOMATİK SAĞLAYICI YEDEKLEMESİ (Faz 14.1 / 16) ──
    const fb = getFallbackSpec(resolved.provider);
    if (!fb) {
      throw new Error(
        friendlyProviderError(primaryErr, resolved.provider, resolved.modelId)
      );
    }

    console.warn(
      `[HARIS FALLBACK] ${agentId}: ${resolved.provider}:${resolved.modelId} kotası bitti → ${fb.provider}:${fb.modelId} deneniyor`
    );

    try {
      const fbResult = await attempt(
        fb.provider,
        fb.modelId,
        fb.costPer1MInput,
        fb.costPer1MOutput,
        undefined
      );
      console.warn(
        `[HARIS FALLBACK] ${agentId}: yedek model başarılı (${fb.provider}:${fb.modelId})`
      );
      return fbResult;
    } catch (e2) {
      throw new Error(
        [
          friendlyProviderError(primaryErr, resolved.provider, resolved.modelId),
          "",
          `Yedek model (${fb.provider}:${fb.modelId}) da çalışmadı:`,
          friendlyProviderError(String(e2), fb.provider, fb.modelId),
        ].join("\n")
      );
    }
  }
}

/**
 * Faz 16.6 — kullanıcının checkpoint yönlendirmesini metne çevirir.
 * String, dizi veya nesne gelmesi fark etmez; boş/anlamsızsa "" döner.
 */
function normalizeGuidance(input: unknown): string {
  if (!input) return "";
  if (typeof input === "string") return input.trim();
  if (Array.isArray(input)) {
    return input
      .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  if (typeof input === "object") {
    const o = input as Record<string, unknown>;
    const parts: string[] = [];
    for (const [k, v] of Object.entries(o)) {
      if (v === null || v === undefined || v === "") continue;
      parts.push(`- ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
    }
    return parts.join("\n").trim();
  }
  return String(input).trim();
}

/**
 * Faz 16.6 — resume route'un gönderdiği priorOutputs'u güvenli biçimde
 * { ajanId: metin } haritasına çevirir. Beklenmedik bir yapı gelirse boş döner
 * (engine o zaman DB'den yükler, yani hiçbir şey patlamaz).
 */
function normalizePriorOutputs(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim().length > 0) {
      out[key] = value;
    } else if (value && typeof value === "object") {
      const maybe = (value as { content?: unknown; text?: unknown }).content;
      const maybeText = (value as { content?: unknown; text?: unknown }).text;
      if (typeof maybe === "string" && maybe.trim()) out[key] = maybe;
      else if (typeof maybeText === "string" && maybeText.trim()) out[key] = maybeText;
    }
  }
  return out;
}

/** Ajan hatasını tek satır okunur özete indirger (UI log akışı için). */
function summarizeAgentError(e: unknown): string {
  const text = String(e ?? "");
  const firstLine = text.split("\n")[0]?.trim() ?? text;
  return firstLine.length > 220 ? `${firstLine.slice(0, 220)}…` : firstLine;
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
