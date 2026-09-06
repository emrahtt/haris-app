/**
 * Demo Payment Provider — gerçek ödeme yapmadan tüm akışı simüle eder
 *
 * - Checkout: success_url'e direkt yönlendirir + session_id=demo_xxx
 * - Webhook: webhook simülasyonu yok (manual `simulate-payment` API endpoint kullan)
 * - Portal: settings sayfasına yönlendirir
 */

import { billingConfig } from "../config";
import type {
  CheckoutInput,
  CheckoutResult,
  NormalizedWebhookEvent,
  PaymentProviderAdapter,
} from "../types";

export class DemoProvider implements PaymentProviderAdapter {
  readonly name = "demo";

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const sessionId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // Demo: success_url'e direkt yönlendir — kullanıcı upgrade akışını "tamamlamış" sayılır
    const url = new URL(input.successUrl);
    url.searchParams.set("session_id", sessionId);
    url.searchParams.set("demo", "true");
    url.searchParams.set("plan", input.planId);
    url.searchParams.set("period", input.billingPeriod);
    return { url: url.toString(), sessionId };
  }

  async createPortalLink(_userId: string, returnUrl: string): Promise<string> {
    void _userId;
    return `${billingConfig.appUrl}/settings?portal=demo&return=${encodeURIComponent(returnUrl)}`;
  }

  async cancelSubscription(_id: string, _immediately?: boolean): Promise<void> {
    void _id;
    void _immediately;
    // Demo: no-op (DB güncellemesi caller'da yapılır)
  }

  async verifyAndParseWebhook(
    _rawBody: string,
    _signature: string
  ): Promise<NormalizedWebhookEvent | null> {
    void _rawBody;
    void _signature;
    return null; // Demo'da webhook gelmez
  }
}
