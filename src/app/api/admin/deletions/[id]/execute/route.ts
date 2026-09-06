import { NextResponse } from "next/server";
import { getCurrentAdmin, logAdminAction } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/deletions/[id]/execute
 *
 * Admin manuel olarak cool-off'u override edip silmeyi tetikler.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin yetkisi gerekli" }, { status: 403 });
  }

  if (isDemoMode) {
    return NextResponse.json({
      casesDeleted: 12,
      documentsDeleted: 47,
      petitionsDeleted: 8,
      demoMode: true,
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase yok" }, { status: 500 });
  }

  const { data, error } = await supabase.rpc("execute_account_deletion", {
    p_request_id: id,
    p_triggered_by: "admin_manual",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data?.[0] || { cases_deleted: 0, documents_deleted: 0, petitions_deleted: 0 };

  await logAdminAction({
    action: "deletion.executed",
    targetResourceType: "account_deletion_request",
    targetResourceId: id,
    metadata: { ...result, manual_override: true },
  });

  return NextResponse.json({
    casesDeleted: result.cases_deleted,
    documentsDeleted: result.documents_deleted,
    petitionsDeleted: result.petitions_deleted,
  });
}
