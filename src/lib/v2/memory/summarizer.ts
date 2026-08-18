/**
 * HARIS v2 — Rolling Chat Summarizer
 *
 * Chat 20 mesajı aştığında eski mesajları özetler.
 * Özet tek bir DB satırında tutulur, sadece son ~10 mesaj tam formatta gider.
 * Token maliyeti sabit kalır.
 */

import { getChatSummary, upsertChatSummary } from "./db";
import type { ChatSummary } from "./types";
import type { AgentMessage } from "../state/workspace-state";

const SUMMARIZE_THRESHOLD = 80; // 60 mesajı aşınca özet başlar (Faz 13.5)
const KEEP_RECENT = 70; // son 70 mesaj tam kalır (Faz 13.5)

interface SummarizationResult {
  summary: ChatSummary | null;
  recentMessages: AgentMessage[];
}

/**
 * Chat için memory context hazırla:
 * - Kısa chat (< 20 mesaj) → tümü tam
 * - Uzun chat → eski özet + son 10 mesaj tam
 */
export async function prepareChatMemory(
  workspaceId: string,
  userId: string,
  allChatMessages: AgentMessage[]
): Promise<SummarizationResult> {
  const chatOnly = allChatMessages.filter(
    (m) => m.type === "user_chat" || m.type === "agent_chat"
  );

  // Kısa chat → özet gerekmez
  if (chatOnly.length <= SUMMARIZE_THRESHOLD) {
    return {
      summary: null,
      recentMessages: chatOnly,
    };
  }

  // Var olan özeti çek
  let existingSummary = await getChatSummary(workspaceId, userId);

  // Yeni özetlenecek mesajlar var mı? (özet coversUntil'den sonraki mesajlar)
  const oldMessages = chatOnly.slice(0, chatOnly.length - KEEP_RECENT);
  const recentMessages = chatOnly.slice(chatOnly.length - KEEP_RECENT);

  const oldestTimestamp = oldMessages[oldMessages.length - 1]?.timestamp;
  const alreadySummarized =
    existingSummary?.coversUntilTimestamp &&
    oldestTimestamp &&
    new Date(existingSummary.coversUntilTimestamp).getTime() >=
      new Date(oldestTimestamp).getTime();

  // Özet güncel → onu kullan
  if (alreadySummarized) {
    return { summary: existingSummary, recentMessages };
  }

  // Özetle
  try {
    const summaryText = await summarizeMessages(oldMessages, existingSummary);
    await upsertChatSummary(workspaceId, userId, {
      summaryText,
      coversMessageCount: oldMessages.length,
      coversUntilTimestamp: oldestTimestamp ?? new Date().toISOString(),
    });
    existingSummary = await getChatSummary(workspaceId, userId);
    return { summary: existingSummary, recentMessages };
  } catch (e) {
    console.error("[Summarize hatası]", e);
    // Özet başarısız → son 10 kaydını göster, eski özet varsa onu göster
    return { summary: existingSummary, recentMessages };
  }
}

async function summarizeMessages(
  messages: AgentMessage[],
  existingSummary: ChatSummary | null
): Promise<string> {
  // Provider-aware routing
  const modelSpec =
    process.env.HARIS_QUICK_MODEL ?? "anthropic:claude-sonnet-4-6";
  const [provider, model] = modelSpec.includes(":")
    ? modelSpec.split(":")
    : ["openai", modelSpec];

  const hasKey =
    provider === "anthropic"
      ? !!process.env.ANTHROPIC_API_KEY
      : !!process.env.OPENAI_API_KEY;

  if (!hasKey) {
    // Demo mode fallback: basit metin
    return messages
      .slice(-5)
      .map((m) => `[${m.from}] ${m.content.slice(0, 100)}`)
      .join("\n");
  }

  const apiKey =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY!
      : process.env.OPENAI_API_KEY!;
  const messagesText = messages
    .map((m) => `[${m.from} → ${m.to}] ${m.content}`)
    .join("\n\n");

  const prompt = existingSummary
    ? `Bu bir hukuk chat'inin özet güncellemesi.

MEVCUT ÖZET:
${existingSummary.summaryText}

YENİ EKLENEN MESAJLAR:
${messagesText}

GÖREV: Mevcut özeti YENİ mesajlarla güncelle. Kısa tut (max 1000 karakter).
Önemli olanlar:
- Verilen kararlar
- Kullanıcının talepleri/tercihleri
- Sorulan ama yanıtlanmamış konular
- Konuşulan hukuki argümanlar/atıflar

SADECE güncellenmiş özet metnini döndür, başka bir şey yazma.`
    : `Bu bir Türk hukuk chat'inin ilk özeti.

MESAJLAR:
${messagesText}

GÖREV: Bu chat'in ana konularını KISA bir özet olarak yaz (max 1000 karakter).
Önemli olanlar:
- Verilen kararlar
- Kullanıcı talepleri
- Sorulan konular
- Argümanlar/atıflar

SADECE özet metnini döndür.`;

  const systemMsg =
    "Türk hukuk chat'lerini özetleyen kısa ve öz bir asistansın. Sadece özet metni döndürürsün.";

  if (provider === "anthropic") {
    const baseURL =
      process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, "") ||
      "https://api.anthropic.com";
    const res = await fetch(`${baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system: systemMsg,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    const text = Array.isArray(data.content)
      ? data.content
          .filter((c: { type: string }) => c.type === "text")
          .map((c: { text: string }) => c.text)
          .join("\n")
      : "";
    return text.trim();
  }

  // OpenAI fallback
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
        ? { max_completion_tokens: 800 }
        : { max_tokens: 800 }),
      ...(model.startsWith("gpt-5") ||
      model.startsWith("o1") ||
      model.startsWith("o3")
        ? {}
        : { temperature: 0.2 }),
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
