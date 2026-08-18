/**
 * POST /api/v2/workspaces/[id]/chat/clear
 * Chat geçmişini temizler (user_chat + agent_chat mesajları).
 * Ajan iç diyalogları ve orkestra çıktıları etkilenmez.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { getWorkspace, clearChatMessages } from "@/lib/v2/workspace/db";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) {
    return NextResponse.json({ error: "Workspace yok" }, { status: 404 });
  }
  try {
    const cleared = await clearChatMessages(id);
    return NextResponse.json({ ok: true, cleared });
  } catch (e) {
    return NextResponse.json(
      { error: String(e).slice(0, 200) },
      { status: 500 }
    );
  }
}
