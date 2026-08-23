import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/billing/registry";
import { activeProvider, billingConfig } from "@/lib/billing/config";
import { upsertSubscription } from "@/lib/billing/subscriptions-db";
import { addBonusCalls, CREDIT_PACKS } from "@/lib/billing/credits";
import { StripeProvider } from "@/lib/billing/providers/stripe";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_USER } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  planId: z.enum(["starter", "pro", "enterprise"]).optional(),
  billingPeriod: z.enum(["monthly", "yearly"]).optional(),
  packId: z.enum(["pack_s", "pack_m", "pack_l"]).optional(),
});

/**
 * POST /api/billing/checkout
 *
 * Plan upgrade checkout başlatır. Provider'a göre URL döner.
 *
 * Demo modunda: success_url'e direkt yönlendirir + subscription'ı update eder.
 * Production: Stripe checkout session URL.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz istek", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Auth
    let userId = DEMO_USER.id;
    let userEmail = DEMO_USER.email;
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
        return NextResponse.json(
          { error: "Oturum gerekli" },
          { status: 401 }
        );
      }
      userId = user.id;
      userEmail = user.email || "";
    }

    if (parsed.data.packId) {
      const pack = CREDIT_PACKS[parsed.data.packId];
      if (activeProvider() === "demo") {
        const next = await addBonusCalls(userId, pack.calls);
        return NextResponse.json({
          url: `${billingConfig.appUrl}/settings?credits=demo`,
          demo: true,
          bonusCalls: next,
        });
      }
      const stripe = new StripeProvider();
      const result = await stripe.createCreditCheckout({
        packId: parsed.data.packId,
        userId,
        userEmail,
        successUrl: `${billingConfig.appUrl}/settings`,
        cancelUrl: `${billingConfig.appUrl}/pricing?upgrade=cancelled`,
      });
      return NextResponse.json({
        url: result.url,
        sessionId: result.sessionId,
        provider: "stripe",
      });
    }

    if (!parsed.data.planId || !parsed.data.billingPeriod) {
      return NextResponse.json({ error: "planId veya packId gerekli" }, { status: 400 });
    }

    if (parsed.data.planId === "enterprise") {
      return NextResponse.json(
        {
          error:
            "Enterprise plan için satış ekibimizle iletişime geçin: sales@haris.example",
          contactSales: true,
        },
        { status: 400 }
      );
    }

    const provider = getProvider();
    const result = await provider.createCheckout({
      planId: parsed.data.planId,
      billingPeriod: parsed.data.billingPeriod,
      userId,
      userEmail,
      successUrl: `${billingConfig.appUrl}/settings?upgrade=success`,
      cancelUrl: `${billingConfig.appUrl}/settings?upgrade=cancelled`,
    });

    // Demo modunda: subscription'ı hemen update et
    if (activeProvider() === "demo") {
      await upsertSubscription({
        userId,
        planId: parsed.data.planId,
        status: "active",
        provider: "manual",
        billingPeriod: parsed.data.billingPeriod,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(
          Date.now() + (parsed.data.billingPeriod === "yearly" ? 365 : 30) * 86400_000
        ).toISOString(),
      });
    }

    return NextResponse.json({
      url: result.url,
      sessionId: result.sessionId,
      provider: provider.name,
    });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      {
        error: "Checkout başlatılamadı",
        message: err instanceof Error ? err.message : "x",
      },
      { status: 500 }
    );
  }
}
