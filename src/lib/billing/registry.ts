/**
 * Billing Provider Registry
 *
 * Aktif sağlayıcıyı seçer + tüm adapter'ları yönetir.
 */

import { activeProvider } from "./config";
import { DemoProvider } from "./providers/demo";
import { IyzicoProvider } from "./providers/iyzico";
import { StripeProvider } from "./providers/stripe";
import type { PaymentProviderAdapter } from "./types";

let cached: PaymentProviderAdapter | null = null;

export function getProvider(): PaymentProviderAdapter {
  if (cached) return cached;
  const which = activeProvider();
  if (which === "stripe") cached = new StripeProvider();
  else if (which === "iyzico") cached = new IyzicoProvider();
  else cached = new DemoProvider();
  return cached;
}

export function resetProvider() {
  cached = null;
}
