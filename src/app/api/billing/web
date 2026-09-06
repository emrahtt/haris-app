import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/billing/registry";
import { upsertSubscription } from "@/lib/billing/subscriptions-db";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook
 *
 * Stripe (ve gelecekte iyzico) webhook endpoint'i.
 * Subscription + invoice event'lerini DB'ye yansıtır.
 *
 * Vercel'de configure edilirken:
 *   - Stripe Dashboard → Webhooks → endpoint URL: https://yourdomain.com/api/billing/webhook
 *   - Events: customer.subscription.* + invoice.paid + invoice.payment_failed
 *   - Signing secret → STRIPE_WEBHOOK_SECRET env'e koy
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  try {
    const provider = getProvider();
    const event = await provider.verifyAndParseWebhook(rawBody, signature);
    console.log("Received event:", event?.type, event);

    if (!event) {
      return NextResponse.json({ received: true, ignored: true });
    }

    // Audit log
    const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
    if (supabase) {
      await supabase.from("payment_events").insert({
        provider: event.provider,
        provider_event_id: event.eventId,
        event_type: event.type,
        user_id: event.userId || null,
        amount_cents: event.amountCents,
        currency: event.currency,
        raw_payload: event.raw as Record<string, unknown>,
        processed: false,
      });
    }

    // Subscription update
    if (
      (event.type === "subscription.created" ||
        event.type === "subscription.updated") &&
      event.userId &&
      event.planId
    ) {
      await upsertSubscription({
        userId: event.userId,
        planId: event.planId,
        status: event.status || "active",
        provider: event.provider,
        providerSubscriptionId: event.subscriptionId,
        providerCustomerId: event.customerId,
        billingPeriod: event.billingPeriod,
        currentPeriodStart: event.currentPeriodStart,
        currentPeriodEnd: event.currentPeriodEnd,
      });
    }

    if (event.type === "subscription.cancelled" && event.userId) {
      await upsertSubscription({
        userId: event.userId,
        planId: "free",
        status: "cancelled",
        provider: "none",
      });
    }

    // Invoice paid → invoices tablosuna yaz
    if (event.type === "invoice.paid" && supabase && event.invoiceId) {
      await supabase.from("invoices").insert({
        user_id: event.userId || null,
        provider: event.provider,
        provider_invoice_id: event.invoiceId,
        amount_cents: event.amountCents || 0,
        currency: event.currency || "USD",
        status: "paid",
        paid_at: new Date().toISOString(),
        pdf_url: event.invoicePdfUrl,
        hosted_url: event.invoiceHostedUrl,
      });
    }

    // Mark processed
    if (supabase) {
      await supabase
        .from("payment_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("provider_event_id", event.eventId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[billing/webhook]", err);
    return NextResponse.json(
      {
        error: "Webhook hatası",
        message: err instanceof Error ? err.message : "x",
      },
      { status: 400 }
    );
  }
}
