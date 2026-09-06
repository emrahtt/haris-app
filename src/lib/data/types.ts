/**
 * HARIS — Veri Modelleri (TypeScript)
 *
 * Bu tipler hem mock veri hem de Supabase DB şeması ile uyumludur.
 * Faz 3+ AI çıktıları için de ortak sözleşme görevi görür.
 */

export type CaseStatus = "active" | "pending" | "urgent" | "closed";
export type CaseType =
  | "tazminat"
  | "is"
  | "ticari"
  | "aile"
  | "ceza"
  | "icra"
  | "idari"
  | "gayri";

export interface LegalCase {
  id: string;
  title: string;
  type: string;
  caseType: CaseType;
  icon: string;
  court: string;
  esasNo: string;
  status: CaseStatus;
  statusLabel: string;
  client: string;
  opponent: string;
  nextDate: string;
  nextEvent: string;
  daysLeft: number;
  docs: number;
  aiAnalyzed: boolean;
  valueRange?: string;
  successProb: number;
  summary?: string;
  maddi?: number;
  manevi?: number;
}

export type AgentStatus = "idle" | "working" | "done";

export interface Agent {
  id: number;
  name: string;
  role: string;
  icon: string;
  description: string;
  layer: "araştırma" | "analiz" | "üretim" | "kalite" | "orkestra";
}

export interface AgentActivity {
  agentId: number;
  status: AgentStatus;
  task: string;
  progress: number;
  timeAgo: string;
}

export interface Citation {
  court: string;
  no: string;
  date: string;
  title: string;
  snippet: string;
  relevance: number;
}

export interface Deadline {
  date: string;
  mon: string;
  title: string;
  sub: string;
  days: number;
  level: "urgent" | "warn" | "normal";
  caseId?: string;
}

export interface DocumentItem {
  name: string;
  type: "pdf" | "word" | "img" | "audio";
  tag: string;
  date: string;
  size: string;
  critical?: boolean;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  uses: number;
}

export interface Scenario {
  name: string;
  probability: number;
  value: string;
  description: string;
}

export interface SWOTItem {
  category: "S" | "W" | "O" | "T";
  title: string;
  items: string[];
}

export interface RiskItem {
  name: string;
  percent: number;
  level: "low" | "mid" | "high";
}

export interface AttackArgument {
  title: string;
  attack: string;
  response: string;
}
