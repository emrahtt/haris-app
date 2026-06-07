import { NextResponse } from "next/server";
import { getProvider } from "@/lib/billing/registry";
import { billingConfig } from "@/lib/billing/config";
import { getCurrentSubscription } from "@/lib/billing/subscriptions-db";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/portal
 *
 * Customer portal URL döner (abonelik yönetimi, fatura, ödeme yöntemi).
 */
export async function POST() {
  try {
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

    const sub = await getCurrentSubscription(userId);
    if (!sub.providerCustomerId && !isDemoMode) {
      return NextResponse.json(
        { error: "Abonelik bulunamadı, önce plan satın alın" },
        { status: 400 }
      );
    }

    const provider = getProvider();
    const url = await provider.createPortalLink(
      sub.providerCustomerId || userId,
      `${billingConfig.appUrl}/settings`
    );

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Portal başlatılamadı",
        message: err instanceof Error ? err.message : "x",
      },
      { status: 500 }
    );
  }
}
