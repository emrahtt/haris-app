/**
 * HARIS Billing — Yapılandırma
 *
 * Sağlayıcı seçim mantığı:
 * - Stripe key varsa → stripe (international)
 * - iyzico key varsa → iyzico (Türkiye yerel)
 * - Hiçbiri yoksa → demo (mock, gerçek ödeme yok)
 */

export const billingConfig = {
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",

  iyzicoApiKey: process.env.IYZICO_API_KEY || "",
  iyzicoSecretKey: process.env.IYZICO_SECRET_KEY || "",

  // App URL — Stripe redirect URLs için
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Trial periyodu (gün)
  trialDays: parseInt(process.env.HARIS_TRIAL_DAYS || "14", 10),

  // Default currency
  defaultCurrency: process.env.HARIS_DEFAULT_CURRENCY || "try",
};

export const hasStripe = !!billingConfig.stripeSecretKey;
export const hasIyzico = !!billingConfig.iyzicoApiKey;
export const isBillingDemoMode = !hasStripe && !hasIyzico;

export function activeProvider(): "stripe" | "iyzico" | "demo" {
  if (hasStripe) return "stripe";
  if (hasIyzico) return "iyzico";
  return "demo";
}
