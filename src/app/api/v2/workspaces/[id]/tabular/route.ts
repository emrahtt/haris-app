/**
 * POST /api/v2/workspaces/[id]/tabular
 *
 * Body: { columns: [{ id, question }] }
 * Response: { review: TabularReview }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { getWorkspace, listDocuments } from "@/lib/v2/workspace/db";
import {
  generateTabularReview,
  detectConflicts,
  type TabularColumn,
} from "@/lib/v2/tabular/generator";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) return NextResponse.json({ error: "Workspace yok" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const columns = body.columns as TabularColumn[];
  if (!Array.isArray(columns) || columns.length === 0) {
    return NextResponse.json({ error: "Kolon listesi boş" }, { status: 400 });
  }

  const documents = await listDocuments(id);
  if (documents.length === 0) {
    return NextResponse.json({ error: "Belge yok" }, { status: 400 });
  }

  try {
    const review = await generateTabularReview(documents, columns);
    const withConflicts = detectConflicts(review);
    return NextResponse.json({ review: withConflicts });
  } catch (e) {
    return NextResponse.json(
      { error: String(e).slice(0, 300) },
      { status: 500 }
    );
  }
}
