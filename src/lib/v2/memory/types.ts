/**
 * HARIS v2 — Memory System Types
 */

export type MemoryType =
  | "entity"      // Davacı, davalı, avukat gibi kişi/kurum
  | "fact"        // Tarih, tutar, kusur oranı gibi ölçülebilir
  | "decision"    // Checkpoint kararları, kullanıcı seçimleri
  | "user_note"   // Kullanıcının manuel eklediği not
  | "preference"  // Ton, uzunluk, stil tercihleri
  | "insight";    // Ajanların önemli tespitleri

export interface MemoryBlock {
  id: string;
  workspaceId: string;
  memoryType: MemoryType;
  memoryKey: string; // "davaci", "kusur_orani", "tur_1_karar"
  value: Record<string, unknown>;
  source?: string; // "auto_extract", "user_manual", "agent_ictihat"
  sourceDocumentId?: string;
  sourceAgent?: string;
  confidence: number; // 0-1
  priority: number; // 1-10
  isPinned: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatterMemory {
  entities: MemoryBlock[];
  facts: MemoryBlock[];
  decisions: MemoryBlock[];
  userNotes: MemoryBlock[];
  preferences: MemoryBlock[];
  insights: MemoryBlock[];
}

export interface ScratchpadEntry {
  id: string;
  workspaceId: string;
  writtenBy: string; // agent_id
  roundNumber?: 1 | 2 | 3;
  topic: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ChatSummary {
  id: string;
  workspaceId: string;
  summaryText: string;
  coversMessageCount: number;
  coversUntilTimestamp: string;
  createdAt: string;
  updatedAt: string;
}
