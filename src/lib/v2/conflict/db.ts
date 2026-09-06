/**
 * HARIS v2 — Conflict Check DB (Faz 13.6)
 *
 * workspace_parties + conflict_overrides CRUD.
 * Demo modda in-memory fallback.
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { uuid } from "../utils/uuid";
import { similarity } from "./fuzzy";

export type PartyRole =
  | "muvekkil"
  | "karsi_taraf"
  | "ilgili_taraf"
  | "tanik"
  | "bilirkisi";

export type EntityType = "gercek" | "tuzel" | "kamu";

export interface Party {
  id: string;
  workspaceId: string;
  userId: string;
  role: PartyRole;
  fullName: string;
  tcNo?: string;
  taxNo?: string;
  entityType: EntityType;
  contactInfo?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConflictSeverity = "critical" | "warning" | "info";
export type ConflictMatchType = "exact_name" | "tc_match" | "fuzzy_name";

export interface ConflictHit {
  workspaceId: string;
  workspaceTitle: string;
  caseType: string;
  partyId: string;
  partyRole: PartyRole;
  partyName: string;
  matchType: ConflictMatchType;
  severity: ConflictSeverity;
}

// ─────────────────────────────────────────────────────────
// DEMO STORE
// ─────────────────────────────────────────────────────────
interface DemoConflictStore {
  parties: Map<string, Party[]>; // workspaceId → parties
  overrides: Array<{ id: string; userId: string; partyName: string; createdAt: string }>;
}

const DEMO: DemoConflictStore = (globalThis as { __harisConflictDemo?: DemoConflictStore })
  .__harisConflictDemo ?? {
  parties: new Map(),
  overrides: [],
};

if (!(globalThis as { __harisConflictDemo?: DemoConflictStore }).__harisConflictDemo) {
  (globalThis as { __harisConflictDemo?: DemoConflictStore }).__harisConflictDemo = DEMO;
}

// Fuzzy normalize (client-side backup)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────────────────
// PARTIES CRUD
// ─────────────────────────────────────────────────────────

export async function listParties(workspaceId: string): Promise<Party[]> {
  if (isDemoMode) return DEMO.parties.get(workspaceId) ?? [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("workspace_parties")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapDbToParty);
}

export async function addParty(
  workspaceId: string,
  userId: string,
  input: Omit<Party, "id" | "workspaceId" | "userId" | "createdAt" | "updatedAt">
): Promise<Party> {
  const party: Party = {
    id: uuid(),
    workspaceId,
    userId,
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isDemoMode) {
    const list = DEMO.parties.get(workspaceId) ?? [];
    list.push(party);
    DEMO.parties.set(workspaceId, list);
    return party;
  }

  const supabase = await createClient();
  if (!supabase) return party;

  const { data, error } = await supabase
    .from("workspace_parties")
    .insert({
      id: party.id,
      workspace_id: workspaceId,
      user_id: userId,
      role: party.role,
      full_name: party.fullName,
      tc_no: party.tcNo ?? null,
      tax_no: party.taxNo ?? null,
      entity_type: party.entityType,
      contact_info: party.contactInfo ?? {},
      notes: party.notes ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[addParty]", error);
    return party;
  }
  return mapDbToParty(data);
}

export async function deleteParty(partyId: string): Promise<boolean> {
  if (isDemoMode) {
    for (const [wsId, list] of DEMO.parties.entries()) {
      const filtered = list.filter((p) => p.id !== partyId);
      DEMO.parties.set(wsId, filtered);
    }
    return true;
  }

  const supabase = await createClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("workspace_parties")
    .delete()
    .eq("id", partyId);

  return !error;
}

// ─────────────────────────────────────────────────────────
// CONFLICT CHECK
// ─────────────────────────────────────────────────────────

export async function checkConflict(params: {
  fullName: string;
  tcNo?: string;
  excludeWorkspaceId?: string;
  userId: string;
}): Promise<ConflictHit[]> {
  const { fullName, tcNo, excludeWorkspaceId, userId } = params;

  if (isDemoMode) {
    // Demo mod: in-memory tarama
    const normalized = normalizeName(fullName);
    const hits: ConflictHit[] = [];
    for (const [wsId, list] of DEMO.parties.entries()) {
      if (wsId === excludeWorkspaceId) continue;
      for (const p of list) {
        if (p.userId !== userId) continue;
        const nameMatch = normalizeName(p.fullName) === normalized;
        const fuzzy = similarity(p.fullName, fullName) >= 0.78;
        const tcMatch = tcNo && p.tcNo === tcNo;
        if (nameMatch || tcMatch || fuzzy) {
          hits.push({
            workspaceId: wsId,
            workspaceTitle: `Demo Workspace ${wsId}`,
            caseType: "",
            partyId: p.id,
            partyRole: p.role,
            partyName: p.fullName,
            matchType: tcMatch
              ? "tc_match"
              : nameMatch
                ? "exact_name"
                : "fuzzy_name",
            severity:
              p.role === "karsi_taraf"
                ? "critical"
                : p.role === "muvekkil"
                  ? "warning"
                  : "info",
          });
        }
      }
    }
    return hits.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
  }

  const supabase = await createClient();
  if (!supabase) return [];

  let { data, error } = await supabase.rpc("check_conflict_fuzzy", {
    p_full_name: fullName,
    p_tc_no: tcNo ?? null,
    p_exclude_workspace_id: excludeWorkspaceId ?? null,
  });

  if (error) {
    const fallback = await supabase.rpc("check_conflict", {
      p_full_name: fullName,
      p_tc_no: tcNo ?? null,
      p_exclude_workspace_id: excludeWorkspaceId ?? null,
    });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("[checkConflict]", error);
    return [];
  }
  if (!data) return [];

  return (data as ConflictRowRaw[]).map((r) => ({
    workspaceId: r.workspace_id,
    workspaceTitle: r.workspace_title,
    caseType: r.case_type,
    partyId: r.party_id,
    partyRole: r.party_role as PartyRole,
    partyName: r.party_name,
    matchType: r.match_type as ConflictMatchType,
    severity: r.severity as ConflictSeverity,
  }));
}

export async function logConflictOverride(params: {
  userId: string;
  workspaceId?: string;
  conflictingWorkspaceId?: string;
  partyName: string;
  matchType: ConflictMatchType;
  severity: ConflictSeverity;
  justification?: string;
}): Promise<boolean> {
  if (isDemoMode) {
    DEMO.overrides.push({
      id: uuid(),
      userId: params.userId,
      partyName: params.partyName,
      createdAt: new Date().toISOString(),
    });
    return true;
  }

  const supabase = await createClient();
  if (!supabase) return false;

  const { error } = await supabase.from("conflict_overrides").insert({
    user_id: params.userId,
    workspace_id: params.workspaceId ?? null,
    conflicting_workspace_id: params.conflictingWorkspaceId ?? null,
    party_name: params.partyName,
    match_type: params.matchType,
    severity: params.severity,
    justification: params.justification ?? null,
  });

  if (error) {
    console.error("[logConflictOverride]", error);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function severityOrder(s: ConflictSeverity): number {
  return s === "critical" ? 0 : s === "warning" ? 1 : 2;
}

interface DbPartyRow {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  full_name: string;
  tc_no: string | null;
  tax_no: string | null;
  entity_type: string;
  contact_info: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ConflictRowRaw {
  workspace_id: string;
  workspace_title: string;
  case_type: string;
  party_id: string;
  party_role: string;
  party_name: string;
  match_type: string;
  severity: string;
}

function mapDbToParty(row: DbPartyRow): Party {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role as PartyRole,
    fullName: row.full_name,
    tcNo: row.tc_no ?? undefined,
    taxNo: row.tax_no ?? undefined,
    entityType: row.entity_type as EntityType,
    contactInfo: row.contact_info ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
