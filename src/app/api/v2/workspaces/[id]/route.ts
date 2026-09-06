/**
 * GET    /api/v2/workspaces/[id] — Workspace + documents + outputs + messages
 * PATCH  /api/v2/workspaces/[id] — Workspace alanı güncelle (preferences, title)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import {
  getWorkspace,
  updateWorkspace,
  listDocuments,
  listAgentOutputs,
  listAgentMessages,
  getLatestPetition,
} from "@/lib/v2/workspace/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  const [documents, agentOutputs, agentMessages, petition] =
    await Promise.all([
      listDocuments(id),
      listAgentOutputs(id),
      listAgentMessages(id),
      getLatestPetition(id),
    ]);
  return NextResponse.json({
    workspace: ws,
    documents,
    agentOutputs,
    agentMessages,
    petition,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const body = await req.json().catch(() => ({}));
  await updateWorkspace(id, userId, body);
  return NextResponse.json({ ok: true });
}
