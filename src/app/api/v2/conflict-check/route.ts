/**
 * POST /api/v2/conflict-check
 *
 * Yeni dava / yeni party eklerken çıkar çatışması kontrol et.
 * Body: { fullName, tcNo?, excludeWorkspaceId? }
 * Response: { hits: ConflictHit[] }
 *
 * Faz 13.6 — Ethical Walls
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { checkConflict, logConflictOverride } from "@/lib/v2/conflict/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  const body = await req.json().catch(() => ({}));
  const { fullName, tcNo, excludeWorkspaceId } = body as {
    fullName: string;
    tcNo?: string;
    excludeWorkspaceId?: string;
  };

  if (!fullName?.trim()) {
    return NextResponse.json({ error: "fullName gerekli" }, { status: 400 });
  }

  const hits = await checkConflict({
    fullName: fullName.trim(),
    tcNo: tcNo?.trim() || undefined,
    excludeWorkspaceId,
    userId,
  });

  return NextResponse.json({
    hits,
    hasCritical: hits.some((h) => h.severity === "critical"),
    hasWarning: hits.some((h) => h.severity === "warning"),
  });
}

// Override log endpoint'i (kullanıcı "anladım, devam et" derse çağırılır)
export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId();
  const body = await req.json().catch(() => ({}));

  const ok = await logConflictOverride({
    userId,
    ...body,
  });

  return NextResponse.json({ logged: ok });
}
