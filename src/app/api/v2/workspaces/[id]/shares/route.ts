/**
 * GET  /api/v2/workspaces/[id]/shares — paylaşım listesi
 * POST /api/v2/workspaces/[id]/shares — yeni paylaşım davet et
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { getWorkspace } from "@/lib/v2/workspace/db";
import { listShares, createShare } from "@/lib/v2/sharing/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) return NextResponse.json({ error: "Workspace yok" }, { status: 404 });
  const shares = await listShares(id, userId);
  return NextResponse.json({ shares });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) return NextResponse.json({ error: "Workspace yok" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { email, role = "viewer" } = body as {
    email?: string;
    role?: "viewer" | "editor" | "admin";
  };
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ error: "Geçerli email girin" }, { status: 400 });
  }
  if (!["viewer", "editor", "admin"].includes(role)) {
    return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
  }

  try {
    const share = await createShare(id, userId, email, role);
    return NextResponse.json({ share }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
