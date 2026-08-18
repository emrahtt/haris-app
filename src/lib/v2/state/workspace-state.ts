/**
 * HARIS v2 — Workspace State (LangGraph Annotation)
 *
 * Tüm 3-tur orkestrasyonu boyunca paylaşılan, typed state.
 * LangGraph'in `Annotation` API'si ile tanımlanır → conditional edges,
 * checkpoint, time-travel debug bedava gelir.
 */

import { Annotation } from "@langchain/langgraph";
import type { AgentId } from "../orchestra/agents";

export type RoundNumber = 1 | 2 | 3;

export interface VaultDocument {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  /** Vaka Alıcısı tarafından doldurulur */
  category?: string;
  summary?: string;
  extractedText?: string;
  /** OCR/sınıflama durumu */
  status: "uploading" | "extracting" | "classifying" | "ready" | "error";
  /** Hangi AI modeli kullanıldı (UI rozeti için) */
  extractionMethod?: string;  // "pdf_vision_ocr" | "docx" | "image_ocr" | "udf" | ...
  modelUsed?: string;          // "Claude Sonnet 4.6" | "GPT-4o Vision" | "Doğrudan parse"
  /** Tahmini maliyet ($) — sadece AI ile okunduysa */
  extractionCost?: number;
  /** Sayfa sayısı */
  pageCount?: number;
  /** Süre (ms) — kullanıcıya bilgi */
  extractionDurationMs?: number;
  /** Detaylı hata mesajı (technical) */
  errorDetail?: string;
  /** İnsan dostu hata mesajı (UI için) */
  errorMessage?: string;
}

export interface AgentOutput {
  agentId: AgentId;
  round: RoundNumber;
  startedAt: string;
  finishedAt?: string;
  status: "pending" | "running" | "done" | "error";
  content?: string; // Markdown
  rawResponse?: unknown; // "Ham yanıtı gör" butonunda gösterilir
  tokensUsed?: { input: number; output: number };
  cost?: number;
  error?: string;
}

export interface AgentMessage {
  /** Ajan-ajan veya şef-ajan iç diyalog mesajı */
  id: string;
  from: AgentId | "user";
  to: AgentId | "broadcast" | "user";
  round: RoundNumber;
  timestamp: string;
  content: string;
  type: "question" | "answer" | "directive" | "critique" | "synthesis" | "user_chat" | "agent_chat";
}

export interface Conflict {
  id: string;
  round: RoundNumber;
  agents: AgentId[];
  description: string;
  options: Array<{
    id: string;
    label: string;
    recommendedBy?: AgentId;
    reasoning: string;
  }>;
}

export interface UserCheckpoint {
  id: string;
  triggeredAt: string;
  reason: string;
  conflict?: Conflict;
  /** Kullanıcı seçimi — null ise henüz cevaplanmamış */
  userChoice?: string;
  /** Hibrit mod: timeout sonrası AI önerisini otomatik uygula */
  timeoutMs: number;
  resolvedAt?: string;
}

export interface UserPreferences {
  petitionLength: "short" | "standard" | "comprehensive";
  qualityMode: "strict" | "flexible";
  checkpointMode: "always_ask" | "ask_on_conflict" | "auto_continue";
  showInternalDialogs: boolean;
  showRawResponses: boolean;
  enabledAgents: AgentId[];
}

/** LangGraph Annotation — tüm node'lar bu state üzerinde çalışır */
export const WorkspaceAnnotation = Annotation.Root({
  workspaceId: Annotation<string>(),
  userId: Annotation<string>(),
  caseDescription: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  caseType: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  documents: Annotation<VaultDocument[]>({
    reducer: (current, next) => next ?? current,
    default: () => [],
  }),
  preferences: Annotation<UserPreferences>({
    reducer: (current, next) => ({ ...current, ...next }),
    default: () => ({
      petitionLength: "standard",
      qualityMode: "strict",
      checkpointMode: "ask_on_conflict",
      showInternalDialogs: false,
      showRawResponses: false,
      enabledAgents: [],
    }),
  }),
  currentRound: Annotation<RoundNumber>({
    reducer: (_, next) => next,
    default: () => 1,
  }),
  agentOutputs: Annotation<AgentOutput[]>({
    reducer: (current, next) => {
      // Append/merge by agentId+round
      const map = new Map<string, AgentOutput>();
      for (const o of current) map.set(`${o.agentId}-${o.round}`, o);
      for (const o of next) map.set(`${o.agentId}-${o.round}`, o);
      return Array.from(map.values());
    },
    default: () => [],
  }),
  agentMessages: Annotation<AgentMessage[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),
  conflicts: Annotation<Conflict[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),
  checkpoints: Annotation<UserCheckpoint[]>({
    reducer: (current, next) => {
      // Update existing or append
      const map = new Map<string, UserCheckpoint>();
      for (const c of current) map.set(c.id, c);
      for (const c of next) map.set(c.id, c);
      return Array.from(map.values());
    },
    default: () => [],
  }),
  draftPetition: Annotation<{ markdown: string; version: number } | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  qualityReport: Annotation<{
    paragraphs: Array<{ index: number; category: "gerekli" | "nüans" | "doldurma"; score: number; reason: string }>;
    summary: { gerekli: number; nuans: number; doldurma: number; kalite_skoru: number };
  } | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  totalCost: Annotation<number>({
    reducer: (current, next) => current + next,
    default: () => 0,
  }),
  status: Annotation<"idle" | "running" | "paused_for_user" | "completed" | "error">({
    reducer: (_, next) => next,
    default: () => "idle",
  }),
});

export type WorkspaceState = typeof WorkspaceAnnotation.State;
