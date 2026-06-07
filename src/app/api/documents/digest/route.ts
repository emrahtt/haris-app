import { NextRequest, NextResponse } from "next/server";
import { listDocuments } from "@/lib/ingest/storage";
import { buildDigest } from "@/lib/ingest/digest";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/documents/digest?caseId=XXX
 */
export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get("caseId");
  if (!caseId) {
    return NextResponse.json({ error: "caseId zorunlu" }, { status: 400 });
  }

  let userId = DEMO_USER.id;
  if (!isDemoMode) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase yapılandırılmamış" },
        { status: 500 }
      );
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }
    userId = user.id;
  }

  try {
    const docs = await listDocuments(caseId, userId);
    return NextResponse.json(buildDigest(docs));
  } catch (err) {
    return NextResponse.json(
      {
        error: "Sindirim başarısız",
        message: err instanceof Error ? err.message : "x",
      },
      { status: 500 }
    );
  }
}
