/**
 * POST /api/v2/workspaces/[id]/chat
 *
 * Faz 13.5 — Fable 5 + Prompt Caching + 50 mesaj hafıza
 *
 * OPTIMIZASYON:
 *   - Stable prefix (system + memory + docs) cache_control ile işaretlenir (%90 tasarruf)
 *   - Konuşma geçmişi: son 70 mesaj tam + öncesi rolling summary
 *   - Fable 5 effort: "medium" (routine chat için)
 *   - Retry + fallback
 *
 * Prompt yapısı (cache friendly):
 *   1. STABLE (cache'lenir):
 *      - System prompt (agent role)
 *      - Matter memory block
 *      - Belgelerin tam metni
 *      - Ajan çıktıları
 *      - Chat summary (varsa)
 *   2. VOLATILE (cache dışı):
 *      - Konuşma geçmişi (son 70)
 *      - Kullanıcının yeni mesajı
 */

import { NextRequest, NextResponse } from "next/server";
import { uuid } from "@/lib/v2/utils/uuid";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import {
  getWorkspace,
  listDocuments,
  listAgentOutputs,
  listAgentMessages,
  saveAgentMessage,
} from "@/lib/v2/workspace/db";
import { AGENTS, type AgentId } from "@/lib/v2/orchestra/agents";
import { MODEL_REGISTRY } from "@/lib/v2/providers";
import { callAnthropicOptimized } from "@/lib/v2/providers/anthropic-client";
import { getMatterMemory, readScratchpad } from "@/lib/v2/memory/db";
import { prepareChatMemory } from "@/lib/v2/memory/summarizer";
import { buildMemoryPromptBlock } from "@/lib/v2/memory/prompt-builder";
import type { AnthropicMessage } from "@/lib/v2/providers/anthropic-client";

export const runtime = "nodejs";
export const maxDuration = 180;

// Faz 13.5: 50 mesaj tam hafızada tutulur (öncesi rolling summary)
const KEEP_RECENT_MESSAGES = 70;

// Toplam belge metni karakter bütçesi
const TOTAL_DOC_CHAR_BUDGET = 120_000; // Fable 5 1M context, cache indirimli

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const body = await req.json().catch(() => ({}));
  const { content, mentionedAgents = [] } = body as {
    content: string;
    mentionedAgents: AgentId[];
  };

  if (!content?.trim()) {
    return NextResponse.json({ error: "İçerik boş" }, { status: 400 });
  }

  const ws = await getWorkspace(id, userId);
  if (!ws) {
    return NextResponse.json({ error: "Workspace yok" }, { status: 404 });
  }

  // Kullanıcı mesajını kaydet
  await saveAgentMessage(id, userId, {
    id: uuid(),
    from: "user",
    to: mentionedAgents[0] ?? "orchestrator",
    round: (ws.current_round || 1) as 1 | 2 | 3,
    timestamp: new Date().toISOString(),
    content,
    type: "user_chat",
  });

  // Context çekimi (paralel)
  const [documents, agentOutputs, allMessages, matterMemory, scratchpad] =
    await Promise.all([
      listDocuments(id),
      listAgentOutputs(id),
      listAgentMessages(id),
      getMatterMemory(id, userId),
      readScratchpad(id, userId),
    ]);

  // Rolling summary: 50 mesaj tam + öncesi özet
  const { summary: chatSummary, recentMessages } = await prepareChatMemory(
    id,
    userId,
    allMessages
  );

  // Hedef ajan
  const targetAgentId: AgentId =
    mentionedAgents.length > 0 ? mentionedAgents[0] : "orchestrator";
  const agent = AGENTS[targetAgentId];
  const modelInfo = MODEL_REGISTRY[agent.modelRole];

  // Memory prompt bloğu
  const memoryPromptBlock = buildMemoryPromptBlock(
    matterMemory,
    scratchpad,
    chatSummary
  );

  // Belgeler kategorize
  const readyDocs = documents.filter(
    (d) => d.status === "ready" && d.extractedText && d.extractedText.length > 50
  );
  const errorDocs = documents.filter((d) => d.status === "error");
  const pendingDocs = documents.filter(
    (d) =>
      d.status === "uploading" ||
      d.status === "extracting" ||
      d.status === "classifying"
  );

  // Dinamik bütçe
  const perDocBudget =
    readyDocs.length > 0
      ? Math.floor(TOTAL_DOC_CHAR_BUDGET / readyDocs.length)
      : 0;

  const documentContext = readyDocs.length
    ? readyDocs
        .map((d, i) => {
          const fullText = d.extractedText ?? "";
          const truncated =
            fullText.length > perDocBudget
              ? fullText.slice(0, perDocBudget) +
                `\n\n[... belgenin devamı kesildi (${fullText.length} char → ${perDocBudget})]`
              : fullText;
          return `### BELGE ${i + 1}: ${d.filename}
**Kategori:** ${d.category ?? "?"}
**Sayfa:** ${d.pageCount ?? "?"}
**Okuyan model:** ${d.modelUsed ?? "?"}
**Boyut:** ${(d.sizeBytes / 1024).toFixed(0)} KB, ${fullText.length} karakter metin

\`\`\`
${truncated}
\`\`\`
`;
        })
        .join("\n\n---\n\n")
    : "(Henüz işlenmiş belge yok)";

  // Hata + bekleyen belgeler bilgisi
  let docStatusInfo = "";
  if (errorDocs.length > 0) {
    docStatusInfo += `\n\n⚠️ **${errorDocs.length} belge HATA durumunda**:\n${errorDocs
      .map((d) => `- ${d.filename}: ${d.errorMessage ?? "bilinmeyen"}`)
      .join("\n")}`;
  }
  if (pendingDocs.length > 0) {
    docStatusInfo += `\n\n⏳ **${pendingDocs.length} belge işleniyor**:\n${pendingDocs
      .map((d) => `- ${d.filename} (${d.status})`)
      .join("\n")}`;
  }

  // Ajan çıktıları özeti
  const outputsSummary = agentOutputs.length
    ? agentOutputs
        .slice(0, 5)
        .map(
          (o) =>
            `### ${AGENTS[o.agentId].displayName} (TUR ${o.round})\n${(
              o.content ?? ""
            ).slice(0, 1500)}`
        )
        .join("\n\n")
    : "(henüz ajan çıktısı yok)";

  // ─── STABLE PREFIX (cache'lenecek) ─────────────────────
  const systemPrompt = agent.systemPrompt;

  const stableContext = `# WORKSPACE BAĞLAMI

## Dava
**Başlık:** ${ws.title}
${ws.case_description ? `**Açıklama:** ${ws.case_description}\n` : ""}
**Durum:** ${ws.status} · TUR ${ws.current_round || 0}/3
**Belge sayısı:** ${documents.length} (${readyDocs.length} hazır, ${errorDocs.length} hata, ${pendingDocs.length} işleniyor)
${docStatusInfo}

## Belgelerin TAM METNİ

${documentContext}

## Önceki Ajan Çıktıları (Orkestra TUR'larından)
${outputsSummary}

${memoryPromptBlock}

---

# TALİMATLAR

${
  targetAgentId === "orchestrator"
    ? `Orkestra Şefi olarak yukarıdaki BELGE METİNLERİNİ DETAYLI INCELEYEREK ve KONUŞMA GEÇMİŞİNİ HATIRLAYARAK kullanıcıya doğal Türkçe yanıt ver. Kıdemli ortak avukat tonunda konuş.

ÖNEMLİ KURALLAR:
1. Yukarıda **belgelerin tam metni** yazıyor — onları gerçekten oku, "okuyamadım" deme
2. Yukarıda **memory + konuşma geçmişi** var — daha önce söylediklerini HATIRLA, aynı soruyu tekrar sorma
3. Kullanıcı zaten cevapladıysa TEKRAR SORMA, o cevabı kullan
4. Belgelerden somut alıntı yap (sayfa, paragraf belirt)
5. Bir sorudan diğerine ilerle, döngü yapma
6. Her yanıtta en fazla 1-2 yeni soru sor
7. Hata durumundaki belgeler varsa uyar`
    : `${agent.displayName} olarak yukarıdaki belgelerin tam metnini ve KONUŞMA GEÇMİŞİNİ inceleyerek kendi uzmanlık alanından yanıt ver.

KURALLAR:
1. Konuşma geçmişindeki bilgileri HATIRLA, tekrarlama
2. Belgelerden somut alıntı yap
3. Kullanıcı bir konuyu cevapladıysa aynı soruyu tekrar sorma
4. Kısa ve öz ol`
}`;

  // Cacheable prefix = system + stable context (byte-identical her istekte)
  const cacheablePrefix = systemPrompt + "\n\n---\n\n" + stableContext;

  // ─── VOLATILE PART ─────────────────────────────────────
  // Konuşma geçmişi (son 70) → Anthropic message formatına çevir
  const historyForApi: AnthropicMessage[] = recentMessages
    .slice(0, -1) // son mesaj (kullanıcının şimdiki) hariç
    .map((m) => ({
      role: m.from === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  try {
    if (modelInfo.provider === "anthropic") {
      // Fable 5 + cache + effort
      const result = await callAnthropicOptimized({
        role: agent.modelRole,
        cacheablePrefix,
        userMessage: content,
        conversationHistory: historyForApi,
        maxTokens: 4000,
        effort: modelInfo.supportsEffort ? "medium" : undefined,
      });

      // Yanıtı kaydet
      await saveAgentMessage(id, userId, {
        id: uuid(),
        from: targetAgentId === "orchestrator" ? "orchestrator" : targetAgentId,
        to: "user",
        round: (ws.current_round || 1) as 1 | 2 | 3,
        timestamp: new Date().toISOString(),
        content: result.content,
        type: "agent_chat",
      });

      return NextResponse.json({
        reply: result.content,
        rawResponse: result.rawResponse,
        tokensUsed: {
          input: result.usage.inputTokens,
          output: result.usage.outputTokens,
          cacheWrite: result.usage.cacheCreationTokens,
          cacheRead: result.usage.cacheReadTokens,
        },
        cost: result.cost,
        cacheSavings: result.cacheSavings,
        cacheHitRate: result.cacheHitRate,
        agent: {
          id: targetAgentId,
          displayName: agent.displayName,
          model: result.modelUsed,
        },
        contextStats: {
          documentsTotal: documents.length,
          documentsReady: readyDocs.length,
          documentsError: errorDocs.length,
          documentsPending: pendingDocs.length,
          totalCharsSent: cacheablePrefix.length,
          memoryBlocks:
            matterMemory.entities.length +
            matterMemory.facts.length +
            matterMemory.decisions.length +
            matterMemory.userNotes.length +
            matterMemory.preferences.length +
            matterMemory.insights.length,
          scratchpadEntries: scratchpad.length,
          chatSummaryUsed: !!chatSummary,
          recentMessagesCount: recentMessages.length,
        },
      });
    }

    // OpenAI fallback (drafter için değişebilir)
    const result = await callOpenAI(
      modelInfo.modelId,
      systemPrompt,
      cacheablePrefix + "\n\n---\n\n" + content,
      modelInfo.costPer1MInput,
      modelInfo.costPer1MOutput
    );

    await saveAgentMessage(id, userId, {
      id: uuid(),
      from: targetAgentId === "orchestrator" ? "orchestrator" : targetAgentId,
      to: "user",
      round: (ws.current_round || 1) as 1 | 2 | 3,
      timestamp: new Date().toISOString(),
      content: result.content,
      type: "agent_chat",
    });

    return NextResponse.json({
      reply: result.content,
      rawResponse: result.rawResponse,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      agent: {
        id: targetAgentId,
        displayName: agent.displayName,
        model: modelInfo.displayName,
      },
      contextStats: {
        documentsTotal: documents.length,
        documentsReady: readyDocs.length,
        documentsError: errorDocs.length,
        documentsPending: pendingDocs.length,
        totalCharsSent: cacheablePrefix.length,
      },
    });
  } catch (e) {
    const errStr = String(e);
    // Server console'a detay logu (CMD'de görünsün)
    console.error("[CHAT API HATA]");
    console.error("  Ajan:", targetAgentId);
    console.error("  Model role:", agent.modelRole);
    console.error("  Model spec:", `${modelInfo.provider}:${modelInfo.modelId}`);
    console.error("  Display:", modelInfo.displayName);
    console.error("  Anthropic base:", process.env.ANTHROPIC_BASE_URL || "default");
    console.error("  Hata:", errStr.slice(0, 500));

    // Kullanıcı dostu mesaj
    let userMsg = errStr;
    if (errStr.includes("404")) {
      userMsg = `❌ Model "${modelInfo.modelId}" ${modelInfo.provider === "anthropic" ? "OneProvider'da" : "OpenAI'da"} bulunamadı.\n\nÇözüm: .env.local'de HARIS_${agent.modelRole.toUpperCase()}_MODEL değerini kontrol et. Çalışan modeller: claude-opus-4-8, claude-opus-4-7, claude-opus-4-6, claude-sonnet-4-6.`;
    } else if (errStr.includes("401") || errStr.includes("403")) {
      userMsg = `🔑 API key geçersiz veya süresi dolmuş (${modelInfo.provider}).\n\nÇözüm: .env.local'de ANTHROPIC_API_KEY veya OPENAI_API_KEY kontrol et.`;
    } else if (errStr.includes("429")) {
      userMsg = `⏸ Rate limit — çok fazla istek. 30 saniye bekleyip tekrar dene.`;
    } else if (errStr.includes("500") || errStr.includes("502") || errStr.includes("503")) {
      userMsg = `🔌 AI sunucusu geçici olarak hizmet dışı. Birkaç dakika bekle.`;
    } else if (errStr.includes("timeout") || errStr.includes("aborted")) {
      userMsg = `⏱ İşlem çok uzun sürdü (3 dakika). Belgeleri azalt veya daha basit soru sor.`;
    }

    return NextResponse.json(
      {
        error: errStr,
        reply: `Hata: ${userMsg}`,
        debug: {
          agent: targetAgentId,
          model: modelInfo.displayName,
          modelId: modelInfo.modelId,
          provider: modelInfo.provider,
          baseURL: process.env.ANTHROPIC_BASE_URL || "default",
        },
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────
// OpenAI fallback (drafter/embedding vs. için)
// ─────────────────────────────────────────────────────────

async function callOpenAI(
  model: string,
  system: string,
  user: string,
  costIn: number,
  costOut: number
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      content: "[Demo yanıt — OPENAI_API_KEY eksik]",
      tokensUsed: { input: 100, output: 80 },
      cost: 0,
      rawResponse: { mock: true },
    };
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...(model.startsWith("gpt-5") ||
      model.startsWith("o1") ||
      model.startsWith("o3")
        ? {}
        : { temperature: 0.4 }),
      ...(model.startsWith("gpt-5") ||
      model.startsWith("o1") ||
      model.startsWith("o3")
        ? { max_completion_tokens: 4000 }
        : { max_tokens: 4000 }),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const ti = data.usage?.prompt_tokens ?? 0;
  const to = data.usage?.completion_tokens ?? 0;
  return {
    content,
    tokensUsed: { input: ti, output: to },
    cost: (ti * costIn + to * costOut) / 1_000_000,
    rawResponse: data,
  };
}
