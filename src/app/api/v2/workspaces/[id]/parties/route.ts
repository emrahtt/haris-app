/**
 * GET  /api/v2/workspaces/[id]/parties        → list
 * POST /api/v2/workspaces/[id]/parties        → add
 * DELETE /api/v2/workspaces/[id]/parties?pid=X → sil
 *
 * Faz 13.6 — Ethical Walls
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { getWorkspace } from "@/lib/v2/workspace/db";
import {
  listParties,
  addParty,
  deleteParty,
  type PartyRole,
  type EntityType,
} from "@/lib/v2/conflict/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) return NextResponse.json({ error: "Workspace yok" }, { status: 404 });

  const parties = await listParties(id);
  return NextResponse.json({ parties });
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
  const {
    role,
    fullName,
    tcNo,
    taxNo,
    entityType = "gercek",
    contactInfo,
    notes,
  } = body as {
    role: PartyRole;
    fullName: string;
    tcNo?: string;
    taxNo?: string;
    entityType?: EntityType;
    contactInfo?: Record<string, unknown>;
    notes?: string;
  };

  if (!role || !fullName?.trim()) {
    return NextResponse.json(
      { error: "role ve fullName zorunlu" },
      { status: 400 }
    );
  }

  const party = await addParty(id, userId, {
    role,
    fullName: fullName.trim(),
    tcNo,
    taxNo,
    entityType,
    contactInfo,
    notes,
  });

  return NextResponse.json({ party });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) return NextResponse.json({ error: "Workspace yok" }, { status: 404 });

  const url = new URL(req.url);
  const pid = url.searchParams.get("pid");
  if (!pid) return NextResponse.json({ error: "pid gerekli" }, { status: 400 });

  const ok = await deleteParty(pid);
  return NextResponse.json({ deleted: ok });
}
