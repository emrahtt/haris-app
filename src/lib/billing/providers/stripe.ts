/**
 * Stripe Payment Provider Adapter
 *
 * Production'da Stripe Dashboard'dan:
 * 1. Test/Live mode'da Products + Prices oluştur
 * 2. Price ID'leri PLANS map'inde stripeMonthlyPriceId/stripeYearlyPriceId'e ekle
 * 3. Webhook endpoint URL'i: https://yourdomain.com/api/billing/webhook
 * 4. Webhook events: customer.subscription.*, invoice.paid, invoice.payment_failed
 */

import Stripe from "stripe";
import { billingConfig } from "../config";
import { PLANS, type PlanId } from "../plans";
import type {
  CheckoutInput,
  CheckoutResult,
  NormalizedWebhookEvent,
  PaymentProviderAdapter,
  SubscriptionStatus,
} from "../types";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!billingConfig.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY tanımlı değil");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(billingConfig.stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeClient;
}

function mapStripeStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "expired",
    paused: "expired",
  };
  return map[s] || "expired";
}

function findPlanByPriceId(priceId: string): { planId: PlanId; period: "monthly" | "yearly" } | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripeMonthlyPriceId === priceId)
      return { planId: plan.id, period: "monthly" };
    if (plan.stripeYearlyPriceId === priceId)
      return { planId: plan.id, period: "yearly" };
  }
  return null;
}

export class StripeProvider implements PaymentProviderAdapter {
  readonly name = "stripe";

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const stripe = getStripe();
    const plan = PLANS[input.planId];

    const priceId =
      input.billingPeriod === "yearly"
        ? plan.stripeYearlyPriceId
        : plan.stripeMonthlyPriceId;

    if (!priceId) {
      throw new Error(
        `Stripe Price ID tanımlı değil: ${plan.id} ${input.billingPeriod}. ` +
          `Dashboard'dan oluştur ve plans.ts'a ekle.`
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl,
      customer_email: input.userEmail,
      client_reference_id: input.userId,
      subscription_data: {
        metadata: { userId: input.userId, planId: input.planId },
        trial_period_days: billingConfig.trialDays || undefined,
      },
      metadata: {
        userId: input.userId,
        planId: input.planId,
        billingPeriod: input.billingPeriod,
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error("Stripe checkout URL'i üretilemedi");
    }

    return { url: session.url, sessionId: session.id };
  }

  async createPortalLink(customerId: string, returnUrl: string): Promise<string> {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately = false
  ): Promise<void> {
    const stripe = getStripe();
    if (immediately) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  async verifyAndParseWebhook(
    rawBody: string,
    signature: string
  ): Promise<NormalizedWebhookEvent | null> {
    const stripe = getStripe();
    const webhookSecret = billingConfig.stripeWebhookSecret;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET tanımlı değil");
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    // Subscription events
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const planMatch = priceId ? findPlanByPriceId(priceId) : null;

      return {
        provider: "stripe",
        eventId: event.id,
        type:
          event.type === "customer.subscription.deleted"
            ? "subscription.cancelled"
            : event.type === "customer.subscription.created"
            ? "subscription.created"
            : "subscription.updated",
        userId: sub.metadata?.userId,
        subscriptionId: sub.id,
        customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        planId: planMatch?.planId || (sub.metadata?.planId as PlanId | undefined),
        billingPeriod: planMatch?.period,
        status: mapStripeStatus(sub.status),
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        raw: event,
      };
    }

    // Invoice events
    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice;
      return {
        provider: "stripe",
        eventId: event.id,
        type: event.type === "invoice.paid" ? "invoice.paid" : "invoice.failed",
        customerId:
          typeof inv.customer === "string"
            ? inv.customer
            : inv.customer?.id,
        subscriptionId:
          typeof inv.subscription === "string"
            ? inv.subscription
            : inv.subscription?.id,
        amountCents: inv.amount_paid || inv.amount_due,
        currency: inv.currency?.toUpperCase(),
        invoiceId: inv.id,
        invoicePdfUrl: inv.invoice_pdf || undefined,
        invoiceHostedUrl: inv.hosted_invoice_url || undefined,
        raw: event,
      };
    }

    return {
      provider: "stripe",
      eventId: event.id,
      type: "unknown",
      raw: event,
    };
  }
}
