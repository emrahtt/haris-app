import type { PlanId } from "./plans";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type BillingPeriod = "monthly" | "yearly";

export type PaymentProvider = "stripe" | "iyzico" | "manual" | "none";

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  billingPeriod: BillingPeriod;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsageStats {
  userId: string;
  periodMonth: string; // YYYY-MM-01
  aiCalls: number;
  scrapingJobs: number;
  documentsUploaded: number;
  bytesStored: number;
  aiLimitWarned: boolean;
  aiLimitBlocked: boolean;
}

export interface CheckoutInput {
  planId: PlanId;
  billingPeriod: BillingPeriod;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  url: string;
  sessionId?: string;
}

export interface PaymentProviderAdapter {
  readonly name: string;
  /** Checkout URL'ini üretir */
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Customer portal URL (abonelik yönetimi, fatura) */
  createPortalLink(userId: string, returnUrl: string): Promise<string>;
  /** Aboneliği iptal et */
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<void>;
  /** Webhook event'i işle ve normalize et */
  verifyAndParseWebhook(
    rawBody: string,
    signature: string
  ): Promise<NormalizedWebhookEvent | null>;
}

export interface NormalizedWebhookEvent {
  provider: PaymentProvider;
  eventId: string;
  type:
    | "subscription.created"
    | "subscription.updated"
    | "subscription.cancelled"
    | "invoice.paid"
    | "invoice.failed"
    | "unknown";
  userId?: string;
  customerEmail?: string;
  subscriptionId?: string;
  customerId?: string;
  planId?: PlanId;
  billingPeriod?: BillingPeriod;
  status?: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  amountCents?: number;
  currency?: string;
  invoiceId?: string;
  invoicePdfUrl?: string;
  invoiceHostedUrl?: string;
  raw: unknown;
}
