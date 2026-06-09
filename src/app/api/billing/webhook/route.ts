import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/billing/registry";
import { upsertSubscription } from "@/lib/billing/subscriptions-db";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Raw body al (Stripe imza doğrulaması için zorunlu)
  const buf = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get("stripe-signature") || "";

  // Env kontrolleri (sunucu konfigürasyon hatalarını erken yakala)
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[billing/webhook] Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[billing/webhook] Missing Supabase env vars");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // Supabase server client (sadece server-side, service role key ile)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const provider = getProvider();
    // provider.verifyAndParseWebhook raw buffer ve signature bekliyorsa buf ver
    const event = await provider.verifyAndParseWebhook(buf, signature);
    console.log("Received event:", event?.type, event);

    if (!event) {
      return NextResponse.json({ received: true, ignored: true });
    }

    // Idempotency kontrolü: aynı provider_event_id daha önce işlenmiş mi?
    if (supabase) {
      const { data: existing, error: selectErr } = await supabase
        .from("payment_events")
        .select("id")
        .eq("provider_event_id", event.eventId)
        .limit(1);

      if (selectErr) {
        console.error("[billing/webhook] Supabase select error:", selectErr);
        // DB hatası sunucu hatası sayılır
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      if (!existing || existing.length === 0) {
        const { error: insertErr } = await supabase.from("payment_events").insert({
          provider: event.provider,
          provider_event_id: event.eventId,
          event_type: event.type,
          user_id: event.userId || null,
          amount_cents: event.amountCents,
          currency: event.currency,
          raw_payload: event.raw as Record<string, unknown>,
          processed: false,
        });

        if (insertErr) {
          console.error("[billing/webhook] Supabase insert error:", insertErr);
          return NextResponse.json({ error: "DB error" }, { status: 500 });
        }
      } else {
        console.log("[billing/webhook] Duplicate event, skipping insert:", event.eventId);
      }
    }

    // Subscription update
    if (
      (event.type === "subscription.created" || event.type === "subscription.updated") &&
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
      const { error: invoiceErr } = await supabase.from("invoices").insert({
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

      if (invoiceErr) {
        console.error("[billing/webhook] Supabase invoice insert error:", invoiceErr);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
    }

    // Mark processed
    if (supabase) {
      const { error: updateErr } = await supabase
        .from("payment_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("provider_event_id", event.eventId);

      if (updateErr) {
        console.error("[billing/webhook] Supabase update error:", updateErr);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[billing/webhook] Error handling webhook:", err);
    // Stripe doğrulama hatası veya provider hatası -> 400
    return NextResponse.json(
      {
        error: "Webhook hatası",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}
