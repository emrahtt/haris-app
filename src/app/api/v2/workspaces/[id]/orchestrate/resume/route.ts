/**
 * POST /api/v2/workspaces/[id]/orchestrate/resume
 *
 * Checkpoint sonrası kullanıcı seçimini kaydet, orkestraya devam etmesi için
 * sinyal ver (Sprint 11.5'te gerçek LangGraph interrupt+resume).
 */

import { uuid } from "@/lib/v2/utils/uuid";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { saveAgentMessage, updateWorkspace } from "@/lib/v2/workspace/db";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const body = await req.json().catch(() => ({}));

  const { checkpointId, choice } = body as {
    checkpointId?: string;
    choice?: string;
  };

  if (!checkpointId || !choice) {
    return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
  }

  // Kullanıcının kararını agent_messages'a kaydet
  await saveAgentMessage(id, userId, {
    id: uuid(),
    from: "user",
    to: "orchestrator",
    round: 1,
    timestamp: new Date().toISOString(),
    content: `Checkpoint ${checkpointId.slice(0, 8)} kararı: ${choice}`,
    type: "directive",
  });

  await updateWorkspace(id, userId, {
    orchestration_status: "running",
  });

  return NextResponse.json({
    ok: true,
    message: "Checkpoint çözüldü, orkestra devam ediyor.",
  });
}
