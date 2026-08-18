/**
 * HARIS v2 — Sharing DB helpers
 *
 * Workspace paylaşımı (email ile davet). Demo modda in-memory.
 */

import { uuid } from "../utils/uuid";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER, isDemoMode } from "@/lib/supabase/config";

export interface WorkspaceShare {
  id: string;
  workspaceId: string;
  ownerId: string;
  sharedWithEmail: string;
  sharedWithUserId?: string;
  role: "viewer" | "editor" | "admin";
  status: "pending" | "accepted" | "revoked";
  invitedAt: string;
  acceptedAt?: string;
}

const DEMO_SHARES: WorkspaceShare[] = [];

export async function listShares(
  workspaceId: string,
  userId: string
): Promise<WorkspaceShare[]> {
  if (isDemoMode || userId === DEMO_USER.id) {
    return DEMO_SHARES.filter((s) => s.workspaceId === workspaceId);
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("workspace_shares")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("owner_id", userId)
    .order("invited_at", { ascending: false });
  return (data ?? []).map(rowToShare);
}

export async function createShare(
  workspaceId: string,
  ownerId: string,
  email: string,
  role: "viewer" | "editor" | "admin"
): Promise<WorkspaceShare> {
  const share: WorkspaceShare = {
    id: uuid(),
    workspaceId,
    ownerId,
    sharedWithEmail: email.toLowerCase().trim(),
    role,
    status: "pending",
    invitedAt: new Date().toISOString(),
  };
  if (isDemoMode || ownerId === DEMO_USER.id) {
    DEMO_SHARES.push(share);
    return share;
  }
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase yok");
  const { data, error } = await supabase
    .from("workspace_shares")
    .insert({
      id: share.id,
      workspace_id: workspaceId,
      owner_id: ownerId,
      shared_with_email: share.sharedWithEmail,
      role,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToShare(data);
}

export async function revokeShare(
  shareId: string,
  ownerId: string
): Promise<void> {
  if (isDemoMode || ownerId === DEMO_USER.id) {
    const idx = DEMO_SHARES.findIndex((s) => s.id === shareId);
    if (idx >= 0) DEMO_SHARES[idx].status = "revoked";
    return;
  }
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("workspace_shares")
    .update({ status: "revoked" })
    .eq("id", shareId)
    .eq("owner_id", ownerId);
}

function rowToShare(r: Record<string, unknown>): WorkspaceShare {
  return {
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    ownerId: r.owner_id as string,
    sharedWithEmail: r.shared_with_email as string,
    sharedWithUserId: (r.shared_with_user_id as string) ?? undefined,
    role: r.role as "viewer" | "editor" | "admin",
    status: r.status as "pending" | "accepted" | "revoked",
    invitedAt: r.invited_at as string,
    acceptedAt: (r.accepted_at as string) ?? undefined,
  };
}
