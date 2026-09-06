/**
 * HARIS v2 — Memory Prompt Builder
 *
 * Bir workspace'in tüm hafızasını AI prompt'a inject-edilebilir
 * formatta (Markdown) hazırlar.
 *
 * Bu fonksiyon hem chat API'sinde hem orchestra engine'de kullanılır.
 * Böylece hem chat'te hem orkestrada TÜM AJANLAR aynı hafızayı görür.
 */

import type { MatterMemory, ScratchpadEntry, ChatSummary } from "./types";

/**
 * Matter memory'yi Türkçe okunabilir prompt bloğu haline getir.
 * AI bu bloğu her zaman prompt'un başında görür.
 */
export function buildMemoryPromptBlock(
  memory: MatterMemory,
  scratchpad: ScratchpadEntry[] = [],
  chatSummary: ChatSummary | null = null
): string {
  const sections: string[] = [];

  // ─── ENTITIES ──────────────────────────────────────────
  if (memory.entities.length > 0) {
    sections.push(
      `### 👥 TARAFLAR VE KİŞİLER\n` +
        memory.entities
          .map((e) => {
            const v = e.value as Record<string, unknown>;
            const details = Object.entries(v)
              .filter(([, val]) => val && String(val).trim())
              .map(([k, val]) => `${k}: ${JSON.stringify(val)}`)
              .join(", ");
            const pinMark = e.isPinned ? "📌 " : "";
            return `- ${pinMark}**${e.memoryKey}**: ${details}`;
          })
          .join("\n")
    );
  }

  // ─── FACTS ─────────────────────────────────────────────
  if (memory.facts.length > 0) {
    sections.push(
      `### 📊 SOMUT VERİLER (tarih, tutar, oran, atıflar)\n` +
        memory.facts
          .map((f) => {
            const v = f.value as Record<string, unknown>;
            const details = Object.entries(v)
              .filter(([, val]) => val !== undefined && val !== null)
              .map(([k, val]) => `${k}=${JSON.stringify(val)}`)
              .join(", ");
            const pinMark = f.isPinned ? "📌 " : "";
            return `- ${pinMark}**${f.memoryKey}**: ${details}`;
          })
          .join("\n")
    );
  }

  // ─── DECISIONS ─────────────────────────────────────────
  if (memory.decisions.length > 0) {
    sections.push(
      `### ⚖️ ALINAN KARARLAR (checkpoint, kullanıcı seçimleri)\n` +
        memory.decisions
          .map((d) => {
            const v = d.value as Record<string, unknown>;
            const details = Object.entries(v)
              .map(([k, val]) => `${k}: ${JSON.stringify(val)}`)
              .join(" | ");
            return `- **${d.memoryKey}**: ${details}`;
          })
          .join("\n")
    );
  }

  // ─── USER NOTES ────────────────────────────────────────
  if (memory.userNotes.length > 0) {
    sections.push(
      `### 📝 KULLANICI NOTLARI (avukatın manuel eklediği önemli hatırlatmalar)\n` +
        memory.userNotes
          .map((n) => {
            const note =
              (n.value as { note?: string }).note ?? JSON.stringify(n.value);
            const pinMark = n.isPinned ? "📌 " : "";
            return `- ${pinMark}${note}`;
          })
          .join("\n")
    );
  }

  // ─── PREFERENCES ───────────────────────────────────────
  if (memory.preferences.length > 0) {
    sections.push(
      `### ⚙️ TERCİHLER (ton, üslup, format)\n` +
        memory.preferences
          .map((p) => {
            const v = p.value as Record<string, unknown>;
            const details = Object.entries(v)
              .map(([k, val]) => `${k}: ${val}`)
              .join(", ");
            return `- **${p.memoryKey}**: ${details}`;
          })
          .join("\n")
    );
  }

  // ─── INSIGHTS ──────────────────────────────────────────
  if (memory.insights.length > 0) {
    sections.push(
      `### 💡 AJAN TESPİTLERİ (önceki analizlerden çıkan içgörüler)\n` +
        memory.insights
          .map((i) => {
            const insight =
              (i.value as { text?: string }).text ?? JSON.stringify(i.value);
            const src = i.sourceAgent ? ` [${i.sourceAgent}]` : "";
            return `- ${insight}${src}`;
          })
          .join("\n")
    );
  }

  // ─── SCRATCHPAD (ajanlar arası shared board) ──────────
  if (scratchpad.length > 0) {
    sections.push(
      `### 🗒️ AJAN NOTLARI (ajanların birbirine bıraktığı bilgiler)\n` +
        scratchpad
          .slice(-20) // son 20 entry
          .map(
            (s) =>
              `- **${s.writtenBy}** (TUR ${s.roundNumber ?? "?"}, ${s.topic}): ${s.content.slice(0, 250)}`
          )
          .join("\n")
    );
  }

  // ─── CHAT SUMMARY (uzun chat için özet) ───────────────
  if (chatSummary) {
    sections.push(
      `### 💬 ÖNCEKI KONUŞMA ÖZETI (${chatSummary.coversMessageCount} mesajın özeti)\n${chatSummary.summaryText}`
    );
  }

  if (sections.length === 0) {
    return "";
  }

  return `# 🧠 MATTER HAFIZASI

Bu davada şu ana kadar tespit edilmiş, karar verilmiş ve not edilmiş bilgiler. Yanıt verirken BU BİLGİLERİ HERZAMAN DİKKATE AL, yeniden sorma, çelişme.

${sections.join("\n\n")}

---
`;
}

/**
 * Sadece boyut istatistiği (UI için)
 */
export function getMemoryStats(memory: MatterMemory): {
  total: number;
  entities: number;
  facts: number;
  decisions: number;
  notes: number;
  preferences: number;
  insights: number;
} {
  return {
    total:
      memory.entities.length +
      memory.facts.length +
      memory.decisions.length +
      memory.userNotes.length +
      memory.preferences.length +
      memory.insights.length,
    entities: memory.entities.length,
    facts: memory.facts.length,
    decisions: memory.decisions.length,
    notes: memory.userNotes.length,
    preferences: memory.preferences.length,
    insights: memory.insights.length,
  };
}
