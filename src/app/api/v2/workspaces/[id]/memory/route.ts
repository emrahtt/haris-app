/**
 * GET  /api/v2/workspaces/[id]/memory   — tüm matter memory
 * POST /api/v2/workspaces/[id]/memory   — yeni memory bloğu ekle
 * PATCH /api/v2/workspaces/[id]/memory  — bloğu güncelle
 * DELETE /api/v2/workspaces/[id]/memory?blockId=X — bloğu sil
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { getWorkspace } from "@/lib/v2/workspace/db";
import {
  getMatterMemory,
  upsertMemoryBlock,
  updateMemoryBlock,
  deleteMemoryBlock,
} from "@/lib/v2/memory/db";
import { getMemoryStats } from "@/lib/v2/memory/prompt-builder";
import type { MemoryType } from "@/lib/v2/memory/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) return NextResponse.json({ error: "Workspace yok" }, { status: 404 });

  const memory = await getMatterMemory(id, userId);
  return NextResponse.json({
    memory,
    stats: getMemoryStats(memory),
  });
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
  const { type, key, value, priority, isPinned } = body as {
    type?: MemoryType;
    key?: string;
    value?: Record<string, unknown>;
    priority?: number;
    isPinned?: boolean;
  };

  if (!type || !key || !value) {
    return NextResponse.json(
      { error: "type, key ve value gereklidir" },
      { status: 400 }
    );
  }

  try {
    const block = await upsertMemoryBlock(id, userId, {
      type,
      key,
      value,
      source: "user_manual",
      priority: priority ?? 8, // manuel notlar yüksek öncelik
      isPinned: isPinned ?? true, // manuel notlar otomatik sabitli
    });
    return NextResponse.json({ block }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) return NextResponse.json({ error: "Workspace yok" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { blockId, value, priority, isPinned, isHidden } = body as {
    blockId?: string;
    value?: Record<string, unknown>;
    priority?: number;
    isPinned?: boolean;
    isHidden?: boolean;
  };

  if (!blockId) {
    return NextResponse.json({ error: "blockId gereklidir" }, { status: 400 });
  }

  try {
    await updateMemoryBlock(blockId, id, userId, {
      value,
      priority,
      isPinned,
      isHidden,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) return NextResponse.json({ error: "Workspace yok" }, { status: 404 });

  const blockId = req.nextUrl.searchParams.get("blockId");
  if (!blockId) {
    return NextResponse.json({ error: "blockId gereklidir" }, { status: 400 });
  }

  try {
    await deleteMemoryBlock(blockId, id, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
