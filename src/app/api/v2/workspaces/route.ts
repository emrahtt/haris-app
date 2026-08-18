/**
 * POST /api/v2/workspaces — Yeni Matter Workspace oluştur
 * GET  /api/v2/workspaces — Kullanıcının workspace listesi
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import {
  listWorkspaces,
  createWorkspace,
} from "@/lib/v2/workspace/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const list = await listWorkspaces(userId);
    return NextResponse.json({ workspaces: list });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await req.json().catch(() => ({}));
    const ws = await createWorkspace(userId, {
      title: body.title || "Yeni Dava Dosyası",
      case_description: body.case_description ?? "",
      case_type: body.case_type ?? "",
    });
    return NextResponse.json({ workspace: ws }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
