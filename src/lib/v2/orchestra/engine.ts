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
import { buildEnhancedDocumentContext } from "./document-context";
import type { DeliveryGate } from "./evidence-model";

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
    court?: string;
    esasNo?: string;
  };
  /** 2 veya 3: checkpoint sonrası TUR 2/3'ten devam */
  resumeFromRound?: 1 | 2 | 3;
  priorOutputs?: Record<AgentId, string>;
  /**
   * Kullanıcının checkpoint'te verdiği karar/talimat metni.
   * TUR 3 sentez promptuna "kullanıcı yönlendirmesi" olarak işlenir.
   */
  userGuidance?: string;
  /**
   * Kullanıcı "yine de devam et" dediyse true olur; belge içeriği
   * okunamasa bile orkestrayı durdurmadan ilerletir.
   */
  forceContinue?: boolean;
}

export type StreamEvent =
  | { type: "round_start"; round: 1 | 2 | 3 }
  | { type: "analysis_stage"; stage: "intake" | "evidence_model" | "issue_tree" | "red_team" | "revision" | "citation_check" | "delivery_gate"; message: string }
  | { type: "quality_iteration"; iteration: number; score: number; status: "passed" | "needs_revision" | "requires_review"; changes?: string[] }
  | { type: "claim_matrix"; claims: unknown[]; conflicts: unknown[] }
  | { type: "delivery_gate"; gate: DeliveryGate }
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

  // ── Pre-flight: Okunabilir belge içeriği var mı? ─────────────
  // Kullanıcı bilgi/belge sağlamadan orkestra boş analiz üretmesin.
  // (Gerekliyse durup gerekçeyi yazar; "yine de devam et" seçilirse forceContinue ile ilerler.)
  const isFullRun = (ctx.resumeFromRound ?? 1) <= 1;
  const hasReadableContent = ctx.documents.some(
    (d) =>
      (d.extractedText?.trim().length ?? 0) > 50 ||
      (d.summary?.trim().length ?? 0) > 0
  );
  if (
    isFullRun &&
    !ctx.forceContinue &&
    ctx.preferences.checkpointMode !== "auto_continue" &&
    ctx.documents.length > 0 &&
    !hasReadableContent
  ) {
    const blockerId = uuid();
    const blockerReason =
      "Okunabilir belge içeriği bulunamadı. Belgeler yüklenmiş görünüyor ama içerikleri (OCR/metin/özet) çıkarılamamış — ajanlar bu hâliyle yalnızca dosya adlarıyla çalışır ve dilekçe sağlıklı üretilemez.";
    emit({
      type: "checkpoint",
      checkpoint: {
        id: blockerId,
        triggeredAt: new Date().toISOString(),
        reason: blockerReason,
        timeoutMs: 0,
        conflict: {
          id: blockerId,
          round: 1,
          agents: analyzers.slice(0, 3),
          description:
            "Ne yapabilirsiniz?\n1) Vault'tan belgeyi silip yeniden yükleyin (OCR/farklı yöntem seçin) → sonra İşlemi Başlat'a basın.\n2) Veya 'Yine de devam et' diyerek içeriksiz ilerleyin (önerilmez; çıktı zayıf olur).",
          options: [
            {
              id: "opt_override_unreadable",
              label: "Yine de devam et (içerik okunamıyor)",
              reasoning:
                "Ajanlar dosya adı + özet olmadan çalışır; üretilen dilekçe zayıf ve eksik olabilir.",
            },
          ],
        },
      },
    });
    emit({
      type: "orchestrator_message",
      content:
        "Duruyorum — okunabilir belge içeriği bulamadım. 📄 Bu davayı sağlıklı analiz edebilmem için belgelerin OCR/metin özetinin çıkarılmış olması gerekiyor. Lütfen Vault'tan belgeleri kontrol edip (durum 'ready' olmalı) yeniden başlatın veya 'Yine de devam et' deyin.",
    });
    return;
  }

  // Orkestra Şefi karşılaması
  emit({
    type: "orchestrator_message",
    content: `Süreç başlıyor. ${analyzers.length} uzman ajan görevlendirildi: ${analyzers
      .map((a) => `${AGENTS[a].emoji} ${AGENTS[a].shortName}`)
      .join(", ")}.\n\nTahmini süre: ~${analyzers.length * 12 + 60} saniye.`,
  });

  emit({
    type: "analysis_stage",
    stage: "intake",
    message: "Dosya alımı: tüm belgeler sayfa-bazlı ve bölüm-bazlı taranıyor.",
  });
  const enhancedContext = buildEnhancedDocumentContext(ctx.documents);
  const documentContext = {
    summary: enhancedContext.summary,
    full: enhancedContext.fullByDocument
      .map((document) => {
        const sectionText = document.sections
          .map((section) => `\\n#### ${section.name} (s.${section.startPage}-${section.endPage})\\n${section.content}`)
          .join("\\n");
        return `\\n### Belge: ${document.filename} (${document.totalPages} sayfa)\\n${sectionText}\\n`;
      })
      .join(""),
  };
  emit({
    type: "analysis_stage",
    stage: "evidence_model",
    message: `${enhancedContext.stats.totalDocuments} belge, ${enhancedContext.stats.totalPages} sayfa ve ${enhancedContext.conflicts.length} çelişki adayı indekslendi.`,
  });
  if (enhancedContext.conflicts.length > 0) {
    emit({
      type: "claim_matrix",
      claims: [],
      conflicts: enhancedContext.conflicts,
    });
  }
  const startRound = ctx.resumeFromRound ?? 1;
  const round1Outputs: Record<AgentId, string> = {
    ...(ctx.priorOutputs ?? {}),
  } as Record<AgentId, string>;

  if (startRound > 1) {
    emit({
      type: "orchestrator_message",
      content: `Checkpoint kararı alındı. TUR ${startRound}'den devam ediyorum.`,
    });
  }

  // ─────────────────────────────────────────────────────
  // TUR 1 — Bağımsız paralel inceleme
  // ─────────────────────────────────────────────────────
  if (startRound <= 1) {
  emit({ type: "round_start", round: 1 });

  emit({
    type: "agent_message",
    from: "orchestrator",
    to: "broadcast",
    round: 1,
    content: `TUR 1 başlıyor. Herkes bağımsız incelesin, dava şudur:\n\n${ctx.caseDescription || ctx.caseTitle}\n\n${documentContext.summary}`,
    messageType: "directive",
  });

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

  // ── TUR 1 bitti — özet ve durma politikası ───────────────────
  emit({
    type: "orchestrator_message",
    content: summarizeRound1(analyzers, round1Outputs),
  });

  // "always_ask": Kullanıcı her TUR sonunda onay isteyeceğini seçti → dur, açıkla, bekle.
  if (ctx.preferences.checkpointMode === "always_ask") {
    const approvalId = uuid();
    const karsiAgent: AgentId = "karsi_argüman";
    emit({
      type: "checkpoint",
      checkpoint: {
        id: approvalId,
        triggeredAt: new Date().toISOString(),
        reason:
          "TUR 1 analizleri tamamlandı. Modunuz 'Her zaman sor' olduğu için TUR 2–3'e geçmeden önce devam onayınızı bekliyorum.",
        timeoutMs: 0,
        conflict: {
          id: approvalId,
          round: 1,
          agents: analyzers.slice(0, 3),
          description:
            "Onay verdiğinizde TUR 2 (çapraz inceleme) ve TUR 3 (dilekçe sentezi) çalışacak ve taslak Canvas'a düşecek. Bir strateji tercihi yapabilir veya 'Ben farklı bir şey diyeceğim' ile ek talimat verebilirsiniz.",
          options: [
            {
              id: "opt_continue",
              label: "TUR 2–3'e devam et, taslağı üret (önerilen)",
              recommendedBy: karsiAgent,
              reasoning:
                "Karşı Argüman çapraz eleştiri yapar, ardından sentezle taslak üretilir.",
            },
            {
              id: "opt_priority_critique",
              label: "Sentezde Karşı Argüman'ın tespitlerine öncelik ver",
              reasoning:
                "Stres-test edilmiş, savunmacı ve sağlamlaştırılmış bir taslak istiyorum.",
            },
            {
              id: "opt_comprehensive",
              label: "Kapsamlı hukukî dayanakları öne çıkar",
              reasoning:
                "Geniş içtihat ve kanun maddesi kullanımı, detaylı gerekçe istiyorum.",
            },
          ],
        },
      },
    });
    emit({
      type: "orchestrator_message",
      content:
        "TUR 1 bitti, onayınızı bekliyorum. Seçiminizi yaptığınız anda TUR 2–3 çalışır ve dilekçe taslağı Canvas'a düşer. Not: 'Her zaman sor' modunda olduğunuz için TUR 2 sonunda bir kez daha onay isteyeceğim.",
    });
    return;
  }
  // ask_on_conflict / auto_continue: gerekmedikçe durmayız — TUR 2–3 aynı akışta devam eder.
  } // startRound <= 1

  // ─────────────────────────────────────────────────────
  // TUR 2 — Çapraz inceleme
  // ─────────────────────────────────────────────────────
  if (startRound <= 2) {
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

  // Çoklu red-team: tek bir eleştiri yerine farklı risk mercekleri
  const crossReviewers: AgentId[] = [
    "karsi_argüman",
    "usul_hukuku",
    "delil_haritalama",
    "ictihat_tarama",
  ].filter((agent) => analyzers.includes(agent as AgentId)) as AgentId[];
  const critiques: string[] = [];
  emit({
    type: "analysis_stage",
    stage: "red_team",
    message: `${crossReviewers.length} bağımsız red-team merceği devrede: karşı taraf, usul, delil ve içtihat.`,
  });

  await Promise.all(crossReviewers.map(async (reviewer) => {
    emit({ type: "agent_start", agentId: reviewer, round: 2 });
    try {
      const memoryR2 = await getMatterMemory(ctx.workspaceId, ctx.userId);
      const scratchpadR2 = await readScratchpad(ctx.workspaceId, ctx.userId);
      const memoryBlockR2 = buildMemoryPromptBlock(memoryR2, scratchpadR2);
      const r2Prompt = `${memoryBlockR2}\n\nTUR 2 — BAĞIMSIZ RED-TEAM İNCELEMESİ.\n\nDosya bağlamı:\n${documentContext.full}\n\nTUR 1 analizleri:\n${Object.entries(round1Outputs)
        .map(([k, v]) => `### ${AGENTS[k as AgentId]?.displayName ?? k}\n${v.slice(0, 3500)}`)
        .join("\\n\\n")}\n\n${AGENTS[reviewer].displayName} olarak yalnızca kendi uzmanlık merceğinle incele. Her risk için: (1) iddia, (2) kaynak, (3) açık zayıflık, (4) düzeltme önerisi, (5) kritik/önem derecesi ver. Kaynaksız bir şeyi doğrulanmış kabul etme.`;
      const result = await callAgent(reviewer, { prompt: r2Prompt, ctx, jsonMode: reviewer === "delil_haritalama" });
      const critique = `## ${AGENTS[reviewer].displayName} Red-Team\\n${result.content}`;
      critiques.push(critique);
      round1Outputs[reviewer] = `${round1Outputs[reviewer] ?? ""}\\n\\n${critique}`;
      emit({ type: "agent_done", agentId: reviewer, round: 2, content: result.content, tokensUsed: result.tokensUsed, cost: result.cost, rawResponse: result.rawResponse });
      emit({ type: "agent_message", from: reviewer, to: "orchestrator", round: 2, content: result.content.slice(0, 400) + (result.content.length > 400 ? "…" : ""), messageType: "critique" });
    } catch (e) {
      emit({ type: "agent_error", agentId: reviewer, round: 2, message: String(e) });
    }
  }));
  const crossCritique = critiques.join("\\n\\n");

  // ── always_ask: TUR 2 (çapraz inceleme) sonunda da onay iste ──
  if (
    ctx.preferences.checkpointMode === "always_ask" &&
    typeof crossCritique === "string" &&
    crossCritique.trim().length > 0
  ) {
    const approvalId = uuid();
    emit({
      type: "checkpoint",
      checkpoint: {
        id: approvalId,
        triggeredAt: new Date().toISOString(),
        reason:
          "TUR 2 (çapraz inceleme) tamamlandı. 'Her zaman sor' modunda olduğunuz için TUR 3'e (dilekçe sentezi) geçmeden onayınızı bekliyorum.",
        timeoutMs: 0,
        conflict: {
          id: approvalId,
          round: 2,
          agents: [...crossReviewers.slice(0, 2), ...analyzers.filter((a) => !crossReviewers.includes(a)).slice(0, 2)],
          description:
            "Karşı Argüman Ajanı diğer ajan çıktılarını eleştirdi; eleştiriler senteze işlenecek. Onay verdiğinizde TUR 3 çalışır ve dilekçe taslağı Canvas'a düşer.",
          options: [
            {
              id: "opt_continue_draft",
              label: "TUR 3'e geç, dilekçe taslağını üret (önerilen)",
              recommendedBy: crossReviewers[0],
              reasoning:
                "Çapraz inceleme bitti; tüm çıktılar ve eleştiriler sentezlenerek taslak üretilir.",
            },
            {
              id: "opt_harden",
              label: "Taslakta Karşı Argüman'ın tespitlerini ayrıntılı ele al",
              reasoning:
                "Zayıflık tespitlerine güçlü cevaplar içeren sağlamlaştırılmış taslak istiyorum.",
            },
            {
              id: "opt_concise",
              label: "Taslağı kısa ve öz tut",
              reasoning:
                "Netice-i talep öncelikli, kısa bir dilekçe istiyorum.",
            },
          ],
        },
      },
    });
    emit({
      type: "orchestrator_message",
      content:
        "TUR 2 bitti, onayınızı bekliyorum. Seçiminizi yaptığınızda TUR 3 sentezi çalışır ve dilekçe taslağı Canvas'ta belirir.",
    });
    return;
  }
  } // startRound <= 2

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

  // Kalite kapısı: taslak → denetim → atıf kontrolü → red-team → revizyon.
  // Strict modda kritik hata varsa "tamamlandı" demek yerine teslimi durdurur.
  let qualityReport: {
    summary?: {
      kalite_skoru?: number;
      evidenceCompleteness?: number;
      criticalIssues?: string[];
    };
    paragraphs?: unknown[];
  } | null = null;
  let deliveryGate: DeliveryGate = {
    status: "requires_review",
    reason: "Kalite denetimi henüz tamamlanmadı.",
    criticalIssues: [],
    warnings: [],
    timestamp: new Date().toISOString(),
  };

  for (let iteration = 1; iteration <= 3; iteration += 1) {
    emit({ type: "quality_iteration", iteration, score: 0, status: "needs_revision" });
    emit({ type: "analysis_stage", stage: "citation_check", message: `Kalite iterasyonu ${iteration}: iddia, delil ve atıflar denetleniyor.` });
    emit({ type: "agent_start", agentId: "kalite_kontrol", round: 3 });

    try {
      const qcPrompt = `Aşağıdaki dilekçeyi bir hukuk bürosunun son kalite kapısı gibi değerlendir.\n\n${petitionMarkdown}\n\nHer paragraf için JSON üret: index, category (gerekli|nüans|doldurma), score (0-100), reason, warnings. Ayrıca summary içinde kalite_skoru, factualAccuracy, legalCorrectness, evidenceCompleteness, persuasivenessScore, criticalIssues ve deliveryStatus alanlarını ver.\n\nZORUNLU: Belge/kanun/içtihat dayanağı olmayan maddi iddiaları kritik sorun olarak işaretle. Doğrulanmamış kararları doğrulanmış gösterme.`;
      const result = await callAgent("kalite_kontrol", { prompt: qcPrompt, ctx, jsonMode: true });
      try {
        qualityReport = JSON.parse(result.content);
      } catch {
        qualityReport = mockQualityReport(petitionMarkdown);
      }
      const score = Number(qualityReport?.summary?.kalite_skoru ?? 0);
      const criticalIssues = Array.isArray(qualityReport?.summary?.criticalIssues)
        ? qualityReport.summary.criticalIssues.map((description: string) => ({ type: "unsupported_claim" as const, description }))
        : [];
      const evidenceCompleteness = Number(qualityReport?.summary?.evidenceCompleteness ?? 0);
      const passed = score >= (ctx.preferences.qualityMode === "strict" ? 88 : 78) && criticalIssues.length === 0 && evidenceCompleteness >= 0.7;
      deliveryGate = {
        status: passed ? "approved" : criticalIssues.length > 0 ? "requires_review" : "rejected",
        reason: passed ? "Kalite eşiği, kanıt kapsamı ve kritik hata kapısı geçildi." : "Kalite eşiği veya kanıt kapsamı henüz yeterli değil; dilekçe yeniden gözden geçirilecek.",
        criticalIssues,
        warnings: [],
        reviewedBy: "kalite_kontrol",
        timestamp: new Date().toISOString(),
      };
      emit({ type: "agent_done", agentId: "kalite_kontrol", round: 3, content: result.content, tokensUsed: result.tokensUsed, cost: result.cost, rawResponse: result.rawResponse });
      emit({ type: "quality_iteration", iteration, score, status: passed ? "passed" : deliveryGate.status === "requires_review" ? "requires_review" : "needs_revision" });
      emit({ type: "petition_draft", version: iteration + 1, markdown: petitionMarkdown, quality: qualityReport });
      emit({ type: "delivery_gate", gate: deliveryGate });

      if (passed) break;
      if (iteration === 3) break;

      emit({ type: "analysis_stage", stage: "revision", message: `İterasyon ${iteration} başarısız: editör taslağı kanıt ve red-team bulgularına göre yeniden yazıyor.` });
      const revision = await callAgent("dilekce_editoru", {
        prompt: `${buildSynthesisPrompt(ctx, round1Outputs, analyzers)}\n\n## ÖNCEKİ TASLAK\n${petitionMarkdown}\n\n## KALİTE RAPORU\n${JSON.stringify(qualityReport)}\n\n## ZORUNLU REVİZYON\nSadece doğrulanabilir iddiaları koru. Her maddi iddiayı belge/sayfa, kanun veya doğrulanmış içtihatla bağla. Kritik sorunları gider. Belirsiz kalanları açıkça [AVUKAT İNCELEMESİ] işaretiyle belirt.`,
        ctx,
        maxTokens: 16000,
      });
      petitionMarkdown = revision.content;
      petitionCost += revision.cost;
    } catch (error) {
      deliveryGate = { status: "requires_review", reason: `Kalite kapısı teknik olarak tamamlanamadı: ${String(error)}`, criticalIssues: [{ type: "legal_error", description: "Kalite doğrulaması başarısız oldu." }], warnings: [], timestamp: new Date().toISOString() };
      emit({ type: "delivery_gate", gate: deliveryGate });
      break;
    }
  }

  emit({ type: "analysis_stage", stage: "delivery_gate", message: `Teslim kararı: ${deliveryGate.status}.` });

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

  // Checkpoint'te kullanıcının verdiği karar/talimat — mutlaka uygula
  const userGuidance = ctx.userGuidance?.trim();
  const guidanceBlock = userGuidance
    ? `\n\n## KULLANICI YÖNLENDİRMESİ (orkestra checkpoint'ine verdiği karar)\n${userGuidance}\nBu yönlendirme KESİN talimattır: dilekçe taslağını buna göre şekillendir.\n`
    : "";

  return `# NİHAİ DİLEKÇE SENTEZİ\n\n## Dava\n${ctx.caseTitle}\n${ctx.caseDescription}\n\n## UZUNLUK\n${lengthInstr}\n\n## KALİTE\n${qualityInstr}${guidanceBlock}\n\n## Uzman Ajanların Çıktıları\n${analyzerOutputs}\n\n---\n\nYukarıdaki tüm ajan çıktılarını SENTEZ ederek profesyonel bir Türk hukuku dilekçesi yaz.\n\nKURALLAR:\n1. Format: Mahkeme adı → Esas No → Taraflar → KONU → AÇIKLAMALAR (numaralı paragraflar) → HUKUKÎ DAYANAK → NETİCE-İ TALEP → Tarih + İmza\n2. Her paragrafa <!-- src:AJAN_ID --> yorum ekle\n3. Atıfları tam formatta yaz: "Yargıtay X. HD, E.YYYY/XYZ, K.YYYY/ABC, T.GG.AA.YYYY"\n4. ASLA halüsinasyon — emin değilsen "İçtihat Tarama Ajanı'nın bulduğu kararlar" gibi belirt`;
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
 * TUR 1 sonunda chat'e düşen kısa özet mesajı.
 * Her ajanın çıktısının ilk satırını özet olarak gösterir.
 */
function summarizeRound1(
  analyzers: AgentId[],
  outputs: Record<AgentId, string>
): string {
  const seen = new Set<string>();
  const lines = analyzers
    .filter((a) => {
      const text = (outputs[a] ?? "").trim();
      if (!text || seen.has(a)) return false;
      seen.add(a);
      return true;
    })
    .map((a) => {
      const text = (outputs[a] ?? "").trim();
      const firstLine =
        text
          .split("\n")
          .map((s) => s.trim())
          .find((s) => s.length > 0) ?? "";
      const snippet =
        firstLine.length > 170 ? firstLine.slice(0, 170) + "…" : firstLine;
      return `• ${AGENTS[a].emoji} **${AGENTS[a].shortName}**: ${snippet}`;
    });
  return [
    `**TUR 1 tamamlandı.** ${analyzers.length} uzman ajan dosyayı bağımsız inceledi:`,
    ...lines,
    "",
    "Sıradaki adım: TUR 2 çapraz inceleme ve TUR 3 dilekçe sentezi. Taslak bittiğinde Canvas'ta görünecek.",
  ].join("\n");
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
