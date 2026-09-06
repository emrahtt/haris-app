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
import { CREDIT_PACKS, type CreditPackId } from "../credits";
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

    const amountUsd =
      input.billingPeriod === "yearly"
        ? plan.priceYearlyUSD
        : plan.priceMonthlyUSD;
    const amountTry =
      input.billingPeriod === "yearly"
        ? plan.priceYearlyTRY
        : plan.priceMonthlyTRY;
    const currency = (billingConfig.defaultCurrency || "try").toLowerCase();
    const unitAmount =
      currency === "usd"
        ? Math.round(amountUsd * 100)
        : Math.round(amountTry * 100);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: unitAmount,
              recurring: {
                interval: input.billingPeriod === "yearly" ? "year" : "month",
              },
              product_data: {
                name: `HARIS ${plan.displayName}`,
                description: plan.description,
              },
            },
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = session.metadata?.kind;
      if (kind === "credits") {
        return {
          provider: "stripe",
          eventId: event.id,
          type: "credits.purchased",
          userId:
            session.metadata?.userId ||
            session.client_reference_id ||
            undefined,
          amountCents: session.amount_total ?? undefined,
          currency: session.currency?.toUpperCase(),
          creditPackId: session.metadata?.packId,
          creditCalls: session.metadata?.calls
            ? Number(session.metadata.calls)
            : undefined,
          raw: event,
        };
      }
      if (session.mode === "subscription") {
        return {
          provider: "stripe",
          eventId: event.id,
          type: "subscription.created",
          userId:
            session.metadata?.userId ||
            session.client_reference_id ||
            undefined,
          planId: session.metadata?.planId as PlanId | undefined,
          billingPeriod: session.metadata?.billingPeriod as
            | "monthly"
            | "yearly"
            | undefined,
          customerId:
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id,
          status: "active",
          raw: event,
        };
      }
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

  async createCreditCheckout(input: {
    packId: CreditPackId;
    userId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutResult> {
    const stripe = getStripe();
    const pack = CREDIT_PACKS[input.packId];
    const currency = (billingConfig.defaultCurrency || "try").toLowerCase();
    const unitAmount =
      currency === "usd" ? pack.priceUsdCents : pack.priceTry * 100;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: input.userEmail,
      client_reference_id: input.userId,
      success_url: `${input.successUrl}?credits=ok`,
      cancel_url: input.cancelUrl,
      metadata: {
        kind: "credits",
        userId: input.userId,
        packId: pack.id,
        calls: String(pack.calls),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: `HARIS ${pack.name} — ${pack.calls} AI işlem`,
              description: "Yalnızca satın alan hesabın kotasına eklenir.",
            },
          },
        },
      ],
    });
    if (!session.url) throw new Error("Stripe paket URL'i üretilemedi");
    return { url: session.url, sessionId: session.id };
  }
}
