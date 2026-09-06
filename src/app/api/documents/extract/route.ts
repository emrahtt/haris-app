import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/ingest/storage";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";

export const runtime = "nodejs";

/**
 * GET /api/documents/extract?id=docId
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id zorunlu" }, { status: 400 });
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

  const doc = await getDocument(id, userId);
  if (!doc) {
    return NextResponse.json({ error: "Belge bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(doc);
}
