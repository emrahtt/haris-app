/**
 * GET  /api/v2/workspaces/[id]/petition/versions — versiyon listesi
 * POST /api/v2/workspaces/[id]/petition/versions — yeni versiyon kaydet (kullanıcı düzenlemesi)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import {
  getWorkspace,
  getLatestPetition,
  savePetitionVersion,
} from "@/lib/v2/workspace/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) return NextResponse.json({ error: "Workspace yok" }, { status: 404 });
  const latest = await getLatestPetition(id);
  // Şimdilik sadece latest döner (Sprint 14'te tüm versiyon listesi UI)
  return NextResponse.json({ latest });
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
  const { markdown } = body as { markdown?: string };
  if (!markdown || markdown.length < 10) {
    return NextResponse.json(
      { error: "Markdown içerik boş veya çok kısa" },
      { status: 400 }
    );
  }

  const latest = await getLatestPetition(id);
  const nextVersion = (latest?.version ?? 0) + 1;

  await savePetitionVersion(id, userId, {
    versionNumber: nextVersion,
    contentMarkdown: markdown,
    createdByAgent: "user",
  });

  return NextResponse.json({ ok: true, version: nextVersion });
}
