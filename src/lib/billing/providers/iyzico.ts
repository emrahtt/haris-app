/**
 * iyzico Payment Provider — Türkiye yerel ödeme
 *
 * STATUS: STUB (Faz 8+ implementation)
 *
 * iyzico SDK karmaşık (subscription product/pricing plan/customer/subscription
 * 4 ayrı adım) ve bizim mevcut prototip için kapsamı geniş. Mevcut akışı koruyoruz:
 *   - Stripe (international): default production
 *   - Demo (free tier): default development
 *
 * iyzico'ya geçiş için TODO:
 * 1. npm install iyzipay
 * 2. Subscription Products + Pricing Plans iyzico Dashboard'da oluştur
 * 3. createCheckout: iyzipay.subscription.checkoutForm.create
 * 4. Webhook: /api/billing/webhook/iyzico endpoint
 * 5. Test kartları: 5528790000000008
 */

import { billingConfig } from "../config";
import type {
  CheckoutInput,
  CheckoutResult,
  NormalizedWebhookEvent,
  PaymentProviderAdapter,
} from "../types";

export class IyzicoProvider implements PaymentProviderAdapter {
  readonly name = "iyzico";

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    // STUB: iyzico SDK entegre edilene kadar success_url'e demo yönlendirme
    const url = new URL(input.successUrl);
    url.searchParams.set("session_id", `iyzico_stub_${Date.now()}`);
    url.searchParams.set("provider", "iyzico");
    url.searchParams.set("plan", input.planId);
    url.searchParams.set("period", input.billingPeriod);
    return { url: url.toString(), sessionId: "iyzico_stub" };
  }

  async createPortalLink(_userId: string, returnUrl: string): Promise<string> {
    void _userId;
    return `${billingConfig.appUrl}/settings?portal=iyzico&return=${encodeURIComponent(returnUrl)}`;
  }

  async cancelSubscription(_id: string, _immediately?: boolean): Promise<void> {
    void _id;
    void _immediately;
    // TODO: iyzipay.subscription.cancel
  }

  async verifyAndParseWebhook(
    _rawBody: string,
    _signature: string
  ): Promise<NormalizedWebhookEvent | null> {
    void _rawBody;
    void _signature;
    // TODO: iyzico webhook signature verification
    return null;
  }
}
