/**
 * HARIS v2 — Workspace DB Helpers
 *
 * Supabase üzerinden Matter Workspace CRUD.
 * Demo modda in-memory fallback (DEMO_STORE).
 */

import { uuid } from "../utils/uuid";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER, isDemoMode } from "@/lib/supabase/config";
import type {
  VaultDocument,
  AgentOutput,
  AgentMessage,
  UserPreferences,
} from "../state/workspace-state";

export interface WorkspaceRow {
  id: string;
  user_id: string;
  title: string;
  case_description: string;
  case_type: string;
  status: "draft" | "active" | "archived" | "completed";
  current_round: number;
  orchestration_status:
    | "idle"
    | "running"
    | "paused_for_user"
    | "completed"
    | "error";
  preferences: UserPreferences;
  total_cost_usd: number;
  total_tokens_input: number;
  total_tokens_output: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// DEMO STORE — in-memory, sadece isDemoMode=true durumunda
// ─────────────────────────────────────────────────────────────
type DemoStore = {
  workspaces: WorkspaceRow[];
  documents: Map<string, VaultDocument[]>; // workspaceId → docs
  agentOutputs: Map<string, AgentOutput[]>;
  agentMessages: Map<string, AgentMessage[]>;
  petitions: Map<string, { version: number; markdown: string; quality?: unknown }[]>;
};

const DEMO_STORE: DemoStore = (globalThis as { __harisV2Demo?: DemoStore }).__harisV2Demo ?? {
  workspaces: [
    {
      id: "demo-1",
      user_id: DEMO_USER.id,
      title: "Trafik Kazası Tazminat — Yılmaz vs. Aksigorta",
      case_description: "12.03.2024 trafik kazası, davacı %25 müterafik kusurlu",
      case_type: "tazminat",
      status: "active",
      current_round: 1,
      orchestration_status: "running",
      preferences: {
        petitionLength: "standard",
        qualityMode: "strict",
        checkpointMode: "ask_on_conflict",
        showInternalDialogs: false,
        showRawResponses: false,
        enabledAgents: [],
      },
      total_cost_usd: 0.12,
      total_tokens_input: 12_400,
      total_tokens_output: 3_800,
      created_at: new Date(Date.now() - 7200_000).toISOString(),
      updated_at: new Date(Date.now() - 60_000).toISOString(),
    },
    {
      id: "demo-2",
      user_id: DEMO_USER.id,
      title: "Boşanma Davası — Demir Ailesi",
      case_description: "",
      case_type: "aile",
      status: "draft",
      current_round: 0,
      orchestration_status: "idle",
      preferences: {
        petitionLength: "standard",
        qualityMode: "strict",
        checkpointMode: "ask_on_conflict",
        showInternalDialogs: false,
        showRawResponses: false,
        enabledAgents: [],
      },
      total_cost_usd: 0,
      total_tokens_input: 0,
      total_tokens_output: 0,
      created_at: new Date(Date.now() - 86_400_000).toISOString(),
      updated_at: new Date(Date.now() - 86_400_000).toISOString(),
    },
  ],
  documents: new Map([
    [
      "demo-1",
      [
        {
          id: "d1",
          filename: "Şikayet Dilekçesi.pdf",
          mimeType: "application/pdf",
          sizeBytes: 142_000,
          uploadedAt: new Date().toISOString(),
          category: "şikayet_dilekçesi",
          summary:
            "Davacı Ahmet Yılmaz, 12.03.2024 trafik kazasında 50.000 TL maddi tazminat talep ediyor.",
          status: "ready",
        },
        {
          id: "d2",
          filename: "Tanık Beyanı - Mehmet Demir.pdf",
          mimeType: "application/pdf",
          sizeBytes: 67_000,
          uploadedAt: new Date().toISOString(),
          category: "tanık_beyanı",
          summary:
            "Olay yerinde bulunan tanık, davacının yeşil ışıkta geçtiğini doğruladı.",
          status: "ready",
        },
        {
          id: "d3",
          filename: "Trafik Kazası Tespit Tutanağı.pdf",
          mimeType: "application/pdf",
          sizeBytes: 89_000,
          uploadedAt: new Date().toISOString(),
          category: "tutanak",
          summary: "Polis tutanağı: kusur oranı %75 davalıda, %25 davacıda.",
          status: "ready",
        },
        {
          id: "d4",
          filename: "Bilirkişi Raporu.pdf",
          mimeType: "application/pdf",
          sizeBytes: 234_000,
          uploadedAt: new Date().toISOString(),
          category: "bilirkişi_raporu",
          summary:
            "Maluliyet oranı %12, iş gücü kaybı bedeli 87.500 TL hesaplandı.",
          status: "ready",
        },
      ],
    ],
  ]),
  agentOutputs: new Map(),
  agentMessages: new Map(),
  petitions: new Map(),
};


// User auth yoksa veya DEMO_USER.id eşitse → demo store kullan

function isDemoWorkspace(workspaceId: string): boolean {
  // Faz 13.5.5: Sadece isDemoMode aktifken demo store kontrolü
  if (!isDemoMode) return false;
  return DEMO_STORE.documents.has(workspaceId) || DEMO_STORE.workspaces.some(w => w.id === workspaceId);
}

function shouldUseDemoStore(_userId: string): boolean {
  // Faz 13.5.5: SADECE isDemoMode (Supabase env yok) durumunda demo store
  // DEMO_USER.id kontrolü kaldırıldı — Ngrok/multi-user isolation için
  // Gerçek prod'da Supabase Auth zorunlu → her user kendi user_id ile izole
  return isDemoMode;
}

if (!(globalThis as { __harisV2Demo?: DemoStore }).__harisV2Demo) {
  (globalThis as { __harisV2Demo?: DemoStore }).__harisV2Demo = DEMO_STORE;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

export async function listWorkspaces(
  userId: string
): Promise<WorkspaceRow[]> {
  if (shouldUseDemoStore(userId)) {
    return DEMO_STORE.workspaces
      .filter((w) => w.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkspaceRow[];
}

export async function getWorkspace(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRow | null> {
  if (shouldUseDemoStore(userId)) {
    return (
      DEMO_STORE.workspaces.find(
        (w) => w.id === workspaceId && w.user_id === userId
      ) ?? null
    );
  }
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as WorkspaceRow;
}

export async function createWorkspace(
  userId: string,
  init: Partial<WorkspaceRow> & { title: string }
): Promise<WorkspaceRow> {
  const now = new Date().toISOString();
  const row: WorkspaceRow = {
    id: uuid(),
    user_id: userId,
    title: init.title,
    case_description: init.case_description ?? "",
    case_type: init.case_type ?? "",
    status: "draft",
    current_round: 0,
    orchestration_status: "idle",
    preferences: init.preferences ?? {
      petitionLength: "standard",
      qualityMode: "strict",
      checkpointMode: "ask_on_conflict",
      showInternalDialogs: false,
      showRawResponses: false,
      enabledAgents: [],
    },
    total_cost_usd: 0,
    total_tokens_input: 0,
    total_tokens_output: 0,
    created_at: now,
    updated_at: now,
  };

  if (shouldUseDemoStore(userId)) {
    DEMO_STORE.workspaces.unshift(row);
    DEMO_STORE.documents.set(row.id, []);
    return row;
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase istemci alınamadı");
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      id: row.id,
      user_id: userId,
      title: row.title,
      case_description: row.case_description,
      case_type: row.case_type,
      preferences: row.preferences,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WorkspaceRow;
}

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  patch: Partial<WorkspaceRow>
): Promise<void> {
  if (shouldUseDemoStore(userId)) {
    const idx = DEMO_STORE.workspaces.findIndex(
      (w) => w.id === workspaceId && w.user_id === userId
    );
    if (idx >= 0) {
      DEMO_STORE.workspaces[idx] = {
        ...DEMO_STORE.workspaces[idx],
        ...patch,
        updated_at: new Date().toISOString(),
      };
    }
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("workspaces")
    .update(patch)
    .eq("id", workspaceId)
    .eq("user_id", userId);
}

export async function listDocuments(
  workspaceId: string
): Promise<VaultDocument[]> {
  if (isDemoMode || isDemoWorkspace(workspaceId)) {
    return DEMO_STORE.documents.get(workspaceId) ?? [];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("workspace_documents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map(mapDbDocToVault);
}

export async function addDocument(
  workspaceId: string,
  userId: string,
  doc: VaultDocument
): Promise<void> {
  if (shouldUseDemoStore(userId)) {
    const list = DEMO_STORE.documents.get(workspaceId) ?? [];
    list.push(doc);
    DEMO_STORE.documents.set(workspaceId, list);
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("workspace_documents").insert({
    id: doc.id,
    workspace_id: workspaceId,
    user_id: userId,
    filename: doc.filename,
    mime_type: doc.mimeType,
    size_bytes: doc.sizeBytes,
    category: doc.category,
    summary: doc.summary,
    extracted_text: doc.extractedText,
    status: doc.status,
  });
}

export async function updateDocument(
  workspaceId: string,
  docId: string,
  patch: Partial<VaultDocument>
): Promise<void> {
  if (isDemoMode || isDemoWorkspace(workspaceId)) {
    const list = DEMO_STORE.documents.get(workspaceId) ?? [];
    const idx = list.findIndex((d) => d.id === docId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      DEMO_STORE.documents.set(workspaceId, list);
    }
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  const dbPatch: Record<string, unknown> = {};
  if (patch.category) dbPatch.category = patch.category;
  if (patch.summary !== undefined) dbPatch.summary = patch.summary;
  if (patch.extractedText) dbPatch.extracted_text = patch.extractedText;
  if (patch.status) dbPatch.status = patch.status;
  if (patch.errorMessage !== undefined) dbPatch.error_message = patch.errorMessage;
  // Not: extraction_method, model_used vb. metadata jsonb içinde tutulabilir; şimdilik error_message yeter
  await supabase
    .from("workspace_documents")
    .update(dbPatch)
    .eq("id", docId)
    .eq("workspace_id", workspaceId);
}

/**
 * deleteDocument — bir belgeyi sil (kullanıcı UI'da X butonuyla)
 */
export async function deleteDocument(
  workspaceId: string,
  docId: string
): Promise<void> {
  if (isDemoMode || isDemoWorkspace(workspaceId)) {
    const list = DEMO_STORE.documents.get(workspaceId) ?? [];
    const filtered = list.filter((d) => d.id !== docId);
    DEMO_STORE.documents.set(workspaceId, filtered);
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("workspace_documents")
    .delete()
    .eq("id", docId)
    .eq("workspace_id", workspaceId);
}

function mapDbDocToVault(d: Record<string, unknown>): VaultDocument {
  return {
    id: d.id as string,
    filename: d.filename as string,
    mimeType: d.mime_type as string,
    sizeBytes: Number(d.size_bytes),
    uploadedAt: d.created_at as string,
    category: (d.category as string) ?? undefined,
    summary: (d.summary as string) ?? undefined,
    extractedText: (d.extracted_text as string) ?? undefined,
    status: (d.status as VaultDocument["status"]) ?? "ready",
    errorMessage: (d.error_message as string) ?? undefined,
    pageCount: (d.page_count as number) ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// AGENT OUTPUTS
// ─────────────────────────────────────────────────────────────



/**
 * clearChatMessages — bir workspace'te user_chat + agent_chat mesajlarını sil
 * (ajan iç diyalogları ve orkestra çıktıları etkilenmez)
 */
export async function clearChatMessages(
  workspaceId: string
): Promise<number> {
  if (isDemoMode || isDemoWorkspace(workspaceId)) {
    const list = DEMO_STORE.agentMessages.get(workspaceId) ?? [];
    const filtered = list.filter(
      (m) => m.type !== "user_chat" && m.type !== "agent_chat"
    );
    const cleared = list.length - filtered.length;
    DEMO_STORE.agentMessages.set(workspaceId, filtered);
    return cleared;
  }
  const supabase = await createClient();
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from("agent_messages")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("message_type", ["user_chat", "agent_chat"])
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function saveAgentOutput(
  workspaceId: string,
  userId: string,
  output: AgentOutput,
  modelMeta: { provider: string; modelId: string; systemPrompt?: string }
): Promise<void> {
  if (shouldUseDemoStore(userId)) {
    const list = DEMO_STORE.agentOutputs.get(workspaceId) ?? [];
    const idx = list.findIndex(
      (o) => o.agentId === output.agentId && o.round === output.round
    );
    if (idx >= 0) list[idx] = output;
    else list.push(output);
    DEMO_STORE.agentOutputs.set(workspaceId, list);
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("agent_runs").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      agent_id: output.agentId,
      round_number: output.round,
      model_provider: modelMeta.provider,
      model_id: modelMeta.modelId,
      status: output.status,
      content: output.content,
      raw_response: output.rawResponse,
      system_prompt: modelMeta.systemPrompt,
      tokens_input: output.tokensUsed?.input ?? 0,
      tokens_output: output.tokensUsed?.output ?? 0,
      cost_usd: output.cost ?? 0,
      started_at: output.startedAt,
      finished_at: output.finishedAt,
      error_message: output.error,
    },
    { onConflict: "workspace_id,agent_id,round_number" }
  );
}

export async function listAgentOutputs(
  workspaceId: string
): Promise<AgentOutput[]> {
  if (isDemoMode || isDemoWorkspace(workspaceId)) {
    return DEMO_STORE.agentOutputs.get(workspaceId) ?? [];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("round_number");
  return (data ?? []).map((r: Record<string, unknown>) => ({
    agentId: r.agent_id as AgentOutput["agentId"],
    round: r.round_number as AgentOutput["round"],
    status: r.status as AgentOutput["status"],
    startedAt: r.started_at as string,
    finishedAt: (r.finished_at as string) ?? undefined,
    content: (r.content as string) ?? undefined,
    rawResponse: r.raw_response,
    tokensUsed: {
      input: Number(r.tokens_input ?? 0),
      output: Number(r.tokens_output ?? 0),
    },
    cost: Number(r.cost_usd ?? 0),
    error: (r.error_message as string) ?? undefined,
  }));
}

// ─────────────────────────────────────────────────────────────
// AGENT MESSAGES (iç diyaloglar + chat)
// ─────────────────────────────────────────────────────────────

export async function saveAgentMessage(
  workspaceId: string,
  userId: string,
  msg: AgentMessage
): Promise<void> {
  if (shouldUseDemoStore(userId)) {
    const list = DEMO_STORE.agentMessages.get(workspaceId) ?? [];
    list.push(msg);
    DEMO_STORE.agentMessages.set(workspaceId, list);
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("agent_messages").insert({
    id: msg.id,
    workspace_id: workspaceId,
    user_id: userId,
    from_agent: msg.from,
    to_agent: msg.to,
    round_number: msg.round ?? null,
    message_type: msg.type,
    content: msg.content,
  });
}

export async function listAgentMessages(
  workspaceId: string
): Promise<AgentMessage[]> {
  if (isDemoMode || isDemoWorkspace(workspaceId)) {
    return DEMO_STORE.agentMessages.get(workspaceId) ?? [];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  return (data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    from: m.from_agent as AgentMessage["from"],
    to: m.to_agent as AgentMessage["to"],
    round: (m.round_number as AgentMessage["round"]) ?? 1,
    timestamp: m.created_at as string,
    content: m.content as string,
    type: m.message_type as AgentMessage["type"],
  }));
}

// ─────────────────────────────────────────────────────────────
// PETITIONS
// ─────────────────────────────────────────────────────────────

export async function savePetitionVersion(
  workspaceId: string,
  userId: string,
  data: {
    versionNumber: number;
    contentMarkdown: string;
    qualityReport?: unknown;
    qualityScore?: number;
    createdByAgent?: string;
  }
): Promise<void> {
  if (shouldUseDemoStore(userId)) {
    const list = DEMO_STORE.petitions.get(workspaceId) ?? [];
    list.push({
      version: data.versionNumber,
      markdown: data.contentMarkdown,
      quality: data.qualityReport,
    });
    DEMO_STORE.petitions.set(workspaceId, list);
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("petition_versions").insert({
    workspace_id: workspaceId,
    user_id: userId,
    version_number: data.versionNumber,
    content_markdown: data.contentMarkdown,
    quality_report: data.qualityReport,
    quality_score: data.qualityScore,
    created_by_agent: data.createdByAgent,
    author: "ai",
  });
}

export async function getLatestPetition(
  workspaceId: string
): Promise<{
  version: number;
  markdown: string;
  quality?: unknown;
} | null> {
  if (isDemoMode || isDemoWorkspace(workspaceId)) {
    const list = DEMO_STORE.petitions.get(workspaceId) ?? [];
    return list.length ? list[list.length - 1] : null;
  }
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("petition_versions")
    .select("version_number, content_markdown, quality_report")
    .eq("workspace_id", workspaceId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    version: data.version_number,
    markdown: data.content_markdown,
    quality: data.quality_report,
  };
}
