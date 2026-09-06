/**
 * HARIS v2 — Memory DB Helpers
 *
 * Matter-scoped memory CRUD (Harvey-style).
 * Demo mode: in-memory Map fallback.
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { uuid } from "../utils/uuid";
import type {
  MemoryBlock,
  MemoryType,
  MatterMemory,
  ScratchpadEntry,
  ChatSummary,
} from "./types";

// ─────────────────────────────────────────────────────────
// DEMO STORE
// ─────────────────────────────────────────────────────────
interface DemoMemoryStore {
  matterMemory: Map<string, MemoryBlock[]>; // workspaceId → blocks
  scratchpad: Map<string, ScratchpadEntry[]>;
  chatSummaries: Map<string, ChatSummary>; // workspaceId → summary
}

const DEMO_MEM: DemoMemoryStore = (globalThis as { __harisMemDemo?: DemoMemoryStore }).__harisMemDemo ?? {
  matterMemory: new Map(),
  scratchpad: new Map(),
  chatSummaries: new Map(),
};

if (!(globalThis as { __harisMemDemo?: DemoMemoryStore }).__harisMemDemo) {
  (globalThis as { __harisMemDemo?: DemoMemoryStore }).__harisMemDemo = DEMO_MEM;
}

function isDemoWorkspace(workspaceId: string): boolean {
  // Faz 13.5.5: sadece isDemoMode aktifken
  if (!isDemoMode) return false;
  return DEMO_MEM.matterMemory.has(workspaceId);
}

function shouldUseDemoStore(_userId: string): boolean {
  // Faz 13.5.5: DEMO_USER.id kontrolü kaldırıldı (multi-user isolation)
  return isDemoMode;
}

// ─────────────────────────────────────────────────────────
// MEMORY BLOCK CRUD
// ─────────────────────────────────────────────────────────

/**
 * getMatterMemory — Bir workspace'in tüm hafızasını kategoriye göre gruplu döner.
 * AI prompt'a inject etmek için ana fonksiyon.
 */
export async function getMatterMemory(
  workspaceId: string,
  userId: string
): Promise<MatterMemory> {
  if (shouldUseDemoStore(userId) || isDemoWorkspace(workspaceId)) {
    const blocks = DEMO_MEM.matterMemory.get(workspaceId) ?? [];
    return groupBlocks(blocks.filter((b) => !b.isHidden));
  }

  const supabase = await createClient();
  if (!supabase) return emptyMatterMemory();

  const { data, error } = await supabase
    .from("matter_memory")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_hidden", false)
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error || !data) return emptyMatterMemory();
  return groupBlocks(data.map(mapDbToBlock));
}

/**
 * upsertMemoryBlock — Bir memory bloğu ekle/güncelle.
 * Aynı (workspace, type, key) varsa üzerine yazar (auto-extract için ideal).
 */
export async function upsertMemoryBlock(
  workspaceId: string,
  userId: string,
  block: {
    type: MemoryType;
    key: string;
    value: Record<string, unknown>;
    source?: string;
    sourceDocumentId?: string;
    sourceAgent?: string;
    confidence?: number;
    priority?: number;
    isPinned?: boolean;
  }
): Promise<MemoryBlock> {
  const now = new Date().toISOString();
  const newBlock: MemoryBlock = {
    id: uuid(),
    workspaceId,
    memoryType: block.type,
    memoryKey: block.key,
    value: block.value,
    source: block.source,
    sourceDocumentId: block.sourceDocumentId,
    sourceAgent: block.sourceAgent,
    confidence: block.confidence ?? 1.0,
    priority: block.priority ?? 5,
    isPinned: block.isPinned ?? false,
    isHidden: false,
    createdAt: now,
    updatedAt: now,
  };

  if (shouldUseDemoStore(userId) || isDemoWorkspace(workspaceId)) {
    const list = DEMO_MEM.matterMemory.get(workspaceId) ?? [];
    const existingIdx = list.findIndex(
      (b) => b.memoryType === block.type && b.memoryKey === block.key
    );
    if (existingIdx >= 0) {
      // Sabitlenmiş bloğa üzerine yazma
      if (list[existingIdx].isPinned && block.source !== "user_manual") {
        return list[existingIdx];
      }
      list[existingIdx] = {
        ...list[existingIdx],
        value: block.value,
        source: block.source ?? list[existingIdx].source,
        confidence: block.confidence ?? list[existingIdx].confidence,
        priority: block.priority ?? list[existingIdx].priority,
        updatedAt: now,
      };
      DEMO_MEM.matterMemory.set(workspaceId, list);
      return list[existingIdx];
    }
    list.push(newBlock);
    DEMO_MEM.matterMemory.set(workspaceId, list);
    return newBlock;
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase yok");
  const { data, error } = await supabase
    .from("matter_memory")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        memory_type: block.type,
        memory_key: block.key,
        value: block.value,
        source: block.source,
        source_document_id: block.sourceDocumentId,
        source_agent: block.sourceAgent,
        confidence: block.confidence ?? 1.0,
        priority: block.priority ?? 5,
        is_pinned: block.isPinned ?? false,
      },
      { onConflict: "workspace_id,memory_type,memory_key" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbToBlock(data);
}

/**
 * updateMemoryBlock — Kullanıcı UI'dan değer düzenler
 */
export async function updateMemoryBlock(
  blockId: string,
  workspaceId: string,
  userId: string,
  patch: Partial<{
    value: Record<string, unknown>;
    priority: number;
    isPinned: boolean;
    isHidden: boolean;
  }>
): Promise<void> {
  if (shouldUseDemoStore(userId) || isDemoWorkspace(workspaceId)) {
    const list = DEMO_MEM.matterMemory.get(workspaceId) ?? [];
    const idx = list.findIndex((b) => b.id === blockId);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      DEMO_MEM.matterMemory.set(workspaceId, list);
    }
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  const dbPatch: Record<string, unknown> = {};
  if (patch.value !== undefined) dbPatch.value = patch.value;
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (patch.isPinned !== undefined) dbPatch.is_pinned = patch.isPinned;
  if (patch.isHidden !== undefined) dbPatch.is_hidden = patch.isHidden;
  await supabase
    .from("matter_memory")
    .update(dbPatch)
    .eq("id", blockId)
    .eq("workspace_id", workspaceId);
}

/**
 * deleteMemoryBlock — Kalıcı silme (kullanıcı UI'da 🗑 tıklarsa)
 */
export async function deleteMemoryBlock(
  blockId: string,
  workspaceId: string,
  userId: string
): Promise<void> {
  if (shouldUseDemoStore(userId) || isDemoWorkspace(workspaceId)) {
    const list = DEMO_MEM.matterMemory.get(workspaceId) ?? [];
    DEMO_MEM.matterMemory.set(
      workspaceId,
      list.filter((b) => b.id !== blockId)
    );
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("matter_memory")
    .delete()
    .eq("id", blockId)
    .eq("workspace_id", workspaceId);
}

// ─────────────────────────────────────────────────────────
// SCRATCHPAD (ajanlar arası shared board)
// ─────────────────────────────────────────────────────────

export async function writeToScratchpad(
  workspaceId: string,
  userId: string,
  entry: {
    writtenBy: string;
    roundNumber?: 1 | 2 | 3;
    topic: string;
    content: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ScratchpadEntry> {
  const newEntry: ScratchpadEntry = {
    id: uuid(),
    workspaceId,
    writtenBy: entry.writtenBy,
    roundNumber: entry.roundNumber,
    topic: entry.topic,
    content: entry.content,
    metadata: entry.metadata,
    createdAt: new Date().toISOString(),
  };

  if (shouldUseDemoStore(userId) || isDemoWorkspace(workspaceId)) {
    const list = DEMO_MEM.scratchpad.get(workspaceId) ?? [];
    list.push(newEntry);
    DEMO_MEM.scratchpad.set(workspaceId, list);
    return newEntry;
  }
  const supabase = await createClient();
  if (!supabase) return newEntry;
  const { data, error } = await supabase
    .from("agent_scratchpad")
    .insert({
      id: newEntry.id,
      workspace_id: workspaceId,
      user_id: userId,
      written_by: entry.writtenBy,
      round_number: entry.roundNumber ?? null,
      topic: entry.topic,
      content: entry.content,
      metadata: entry.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbScratchpad(data);
}

export async function readScratchpad(
  workspaceId: string,
  userId: string
): Promise<ScratchpadEntry[]> {
  if (shouldUseDemoStore(userId) || isDemoWorkspace(workspaceId)) {
    return DEMO_MEM.scratchpad.get(workspaceId) ?? [];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("agent_scratchpad")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(mapDbScratchpad);
}

// ─────────────────────────────────────────────────────────
// CHAT SUMMARIES (rolling summary)
// ─────────────────────────────────────────────────────────

export async function getChatSummary(
  workspaceId: string,
  userId: string
): Promise<ChatSummary | null> {
  if (shouldUseDemoStore(userId) || isDemoWorkspace(workspaceId)) {
    return DEMO_MEM.chatSummaries.get(workspaceId) ?? null;
  }
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("chat_summaries")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    summaryText: data.summary_text,
    coversMessageCount: data.covers_message_count,
    coversUntilTimestamp: data.covers_until_timestamp,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function upsertChatSummary(
  workspaceId: string,
  userId: string,
  data: {
    summaryText: string;
    coversMessageCount: number;
    coversUntilTimestamp: string;
  }
): Promise<void> {
  if (shouldUseDemoStore(userId) || isDemoWorkspace(workspaceId)) {
    const now = new Date().toISOString();
    const existing = DEMO_MEM.chatSummaries.get(workspaceId);
    DEMO_MEM.chatSummaries.set(workspaceId, {
      id: existing?.id ?? uuid(),
      workspaceId,
      summaryText: data.summaryText,
      coversMessageCount: data.coversMessageCount,
      coversUntilTimestamp: data.coversUntilTimestamp,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("chat_summaries").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      summary_text: data.summaryText,
      covers_message_count: data.coversMessageCount,
      covers_until_timestamp: data.coversUntilTimestamp,
    },
    { onConflict: "workspace_id" }
  );
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function groupBlocks(blocks: MemoryBlock[]): MatterMemory {
  return {
    entities: blocks.filter((b) => b.memoryType === "entity"),
    facts: blocks.filter((b) => b.memoryType === "fact"),
    decisions: blocks.filter((b) => b.memoryType === "decision"),
    userNotes: blocks.filter((b) => b.memoryType === "user_note"),
    preferences: blocks.filter((b) => b.memoryType === "preference"),
    insights: blocks.filter((b) => b.memoryType === "insight"),
  };
}

function emptyMatterMemory(): MatterMemory {
  return {
    entities: [],
    facts: [],
    decisions: [],
    userNotes: [],
    preferences: [],
    insights: [],
  };
}

function mapDbToBlock(d: Record<string, unknown>): MemoryBlock {
  return {
    id: d.id as string,
    workspaceId: d.workspace_id as string,
    memoryType: d.memory_type as MemoryType,
    memoryKey: d.memory_key as string,
    value: (d.value as Record<string, unknown>) ?? {},
    source: (d.source as string) ?? undefined,
    sourceDocumentId: (d.source_document_id as string) ?? undefined,
    sourceAgent: (d.source_agent as string) ?? undefined,
    confidence: Number(d.confidence ?? 1.0),
    priority: Number(d.priority ?? 5),
    isPinned: Boolean(d.is_pinned),
    isHidden: Boolean(d.is_hidden),
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  };
}

function mapDbScratchpad(d: Record<string, unknown>): ScratchpadEntry {
  return {
    id: d.id as string,
    workspaceId: d.workspace_id as string,
    writtenBy: d.written_by as string,
    roundNumber: (d.round_number as 1 | 2 | 3) ?? undefined,
    topic: d.topic as string,
    content: d.content as string,
    metadata: (d.metadata as Record<string, unknown>) ?? undefined,
    createdAt: d.created_at as string,
  };
}
