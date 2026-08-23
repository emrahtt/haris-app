/**
 * Cases — Supabase CRUD + Mock Fallback
 *
 * Demo modunda mock veriler kullanılır; gerçek modda Supabase cases tablosu.
 */

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import type { LegalCase, CaseType, CaseStatus } from "./types";
import { CASES as MOCK_CASES, getCase as getMockCase } from "./cases";

/* ============================================================
   READ
   ============================================================ */

export async function listCases(): Promise<LegalCase[]> {
  if (isDemoMode) return MOCK_CASES;

  const supabase = await createClient();
  if (!supabase) return MOCK_CASES;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listCases]", error);
    return [];
  }

  // İlk kullanımda kullanıcının davası yoksa mock'u göster
  // (sadece dev/preview için — production'da boş array dönebilir)
  if (!data || data.length === 0) {
    return MOCK_CASES;
  }

  return data.map(dbRowToCase);
}

export async function getCaseFromDb(id: string): Promise<LegalCase | undefined> {
  if (isDemoMode) return getMockCase(id);

  const supabase = await createClient();
  if (!supabase) return getMockCase(id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return getMockCase(id);

  const { data } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) return dbRowToCase(data);

  // Fallback: mock davalardan (örnek/onboarding davaları)
  return getMockCase(id);
}

/* ============================================================
   WRITE
   ============================================================ */

export interface CreateCaseInput {
  title: string;
  caseType: CaseType;
  court?: string;
  esasNo?: string;
  client: string;
  opponent?: string;
  summary?: string;
}

export async function createCase(
  input: CreateCaseInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (isDemoMode) {
    // Demo: gerçek kayıt yapmaz, örnek davaya yönlendirir
    return { ok: true, id: "TZM-2025-0142" };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase yapılandırılmamış" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum gerekli" };

  // ID üret: prefix + tarih + random
  const prefix = (
    {
      tazminat: "TZM",
      is: "IS",
      ticari: "TIC",
      aile: "AIL",
      ceza: "CMK",
      icra: "ICR",
      idari: "IDR",
      gayri: "GYR",
    } as Record<CaseType, string>
  )[input.caseType];
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000 + 1000);
  const id = `${prefix}-${year}-${random}`;

  const { error } = await supabase.from("cases").insert({
    id,
    user_id: user.id,
    title: input.title,
    case_type: input.caseType,
    status: "active",
    court: input.court || null,
    esas_no: input.esasNo || null,
    client_name: input.client,
    opponent_name: input.opponent || null,
    summary: input.summary || null,
    next_event: "Dosya inceleniyor",
  });

  if (error) {
    console.error("[createCase]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, id };
}

export async function updateCase(
  id: string,
  patch: Partial<LegalCase>
): Promise<boolean> {
  if (isDemoMode) return true; // no-op

  const supabase = await createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const dbPatch: Record<string, unknown> = {};
  if (patch.title) dbPatch.title = patch.title;
  if (patch.status) dbPatch.status = patch.status;
  if (patch.court) dbPatch.court = patch.court;
  if (patch.esasNo) dbPatch.esas_no = patch.esasNo;
  if (patch.summary) dbPatch.summary = patch.summary;
  if (patch.successProb !== undefined) dbPatch.success_prob = patch.successProb;

  const { error } = await supabase
    .from("cases")
    .update(dbPatch)
    .eq("id", id)
    .eq("user_id", user.id);

  return !error;
}

export async function deleteCase(id: string): Promise<boolean> {
  if (isDemoMode) return true;

  const supabase = await createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("cases")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return !error;
}

/* ============================================================
   YARDIMCI
   ============================================================ */

function dbRowToCase(row: Record<string, unknown>): LegalCase {
  const caseType = (row.case_type as CaseType) || "tazminat";
  const status = (row.status as CaseStatus) || "active";
  const statusLabels: Record<CaseStatus, string> = {
    active: "Aktif",
    pending: "Beklemede",
    urgent: "Acil",
    closed: "Sonuçlandı",
  };
  const iconMap: Record<CaseType, string> = {
    tazminat: "Car",
    is: "Briefcase",
    ticari: "Building2",
    aile: "Users",
    ceza: "Gavel",
    icra: "Landmark",
    idari: "Building2",
    gayri: "Folder",
  };

  // daysLeft hesabı
  const nextDate = row.next_date ? new Date(row.next_date as string) : null;
  const daysLeft = nextDate
    ? Math.max(
        0,
        Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : 0;

  return {
    id: row.id as string,
    title: row.title as string,
    type: caseType,
    caseType,
    icon: iconMap[caseType],
    court: (row.court as string) || "",
    esasNo: (row.esas_no as string) || "",
    status,
    statusLabel: statusLabels[status],
    client: (row.client_name as string) || "",
    opponent: (row.opponent_name as string) || "",
    nextDate: nextDate ? nextDate.toLocaleDateString("tr-TR") : "—",
    nextEvent: (row.next_event as string) || "—",
    daysLeft,
    docs: 0, // sayım ayrı sorgu gerektirir
    aiAnalyzed: false,
    successProb: (row.success_prob as number) || 0,
    summary:
      (row.summary as string) ||
      (row.description as string) ||
      (row.notes as string) ||
      undefined,
  };
}
