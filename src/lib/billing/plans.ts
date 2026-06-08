/**
 * HARIS Plan Tiers
 *
 * Free → Starter → Pro → Enterprise
 *
 * Her plan için:
 * - Aylık AI işlem kotası
 * - Dava limiti
 * - Belge upload limiti
 * - Yargıtay scraping limiti
 * - Müvekkil portalı / beyaz etiket / API erişimi
 */

export type PlanId = "free" | "starter" | "pro" | "enterprise";

export interface PlanLimits {
  /** Maks. aktif dava sayısı (null = sınırsız) */
  maxCases: number | null;
  /** Aylık AI çağrı kotası */
  monthlyAiCalls: number;
  /** Maks. yüklenen belge boyutu (MB) */
  maxFileSizeMB: number;
  /** Toplam saklanan belge boyutu (GB) */
  maxStorageGB: number;
  /** Aylık scraping job sayısı */
  monthlyScrapingJobs: number;
  /** Müvekkil portalı? */
  clientPortal: boolean;
  /** Beyaz etiket? */
  whiteLabel: boolean;
  /** Adversarial Red-Team aktif? */
  adversarialMode: boolean;
  /** Premium AI modeller (Claude Opus, GPT-4o)? */
  premiumModels: boolean;
  /** API erişimi? */
  apiAccess: boolean;
  /** Ekip üye sayısı */
  maxTeamMembers: number;
  /** Öncelikli destek? */
  prioritySupport: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  displayName: string;
  description: string;
  /** Aylık fiyat (TL) */
  priceMonthlyTRY: number;
  /** Yıllık fiyat (TL) — genelde aylık × 10 (2 ay bedava) */
  priceYearlyTRY: number;
  /** USD karşılığı (international/Stripe için) */
  priceMonthlyUSD: number;
  priceYearlyUSD: number;
  /** Stripe Price ID'leri — production'da Stripe Dashboard'dan üretilir */
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;
  /** iyzico subscription plan id'leri */
  iyzicoMonthlyPlanRef?: string;
  iyzicoYearlyPlanRef?: string;
  badge?: "popular" | "recommended" | "enterprise";
  limits: PlanLimits;
  /** Highlight özellikleri (UI'da gösterilir) */
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Ücretsiz",
    displayName: "Free",
    description: "Tanışma + küçük testler için",
    priceMonthlyTRY: 0,
    priceYearlyTRY: 0,
    priceMonthlyUSD: 0,
    priceYearlyUSD: 0,
    limits: {
      maxCases: 3,
      monthlyAiCalls: 30,
      maxFileSizeMB: 10,
      maxStorageGB: 1,
      monthlyScrapingJobs: 5,
      clientPortal: false,
      whiteLabel: false,
      adversarialMode: false,
      premiumModels: false,
      apiAccess: false,
      maxTeamMembers: 1,
      prioritySupport: false,
    },
    features: [
      "3 aktif dava",
      "30 AI işlem / ay",
      "10 MB dosya boyutu",
      "1 GB saklama",
      "Ekonomik AI modeller (GPT-4o-mini)",
      "Topluluk desteği",
    ],
  },

  starter: {
    id: "starter",
    name: "Başlangıç",
    displayName: "Starter",
    description: "Solo avukatlar için",
    priceMonthlyTRY: 1499,
    priceYearlyTRY: 14990, // ≈ 2 ay bedava
    priceMonthlyUSD: 49,
    priceYearlyUSD: 490,
    badge: "popular",
    limits: {
      maxCases: 25,
      monthlyAiCalls: 500,
      maxFileSizeMB: 50,
      maxStorageGB: 10,
      monthlyScrapingJobs: 50,
      clientPortal: false,
      whiteLabel: false,
      adversarialMode: true,
      premiumModels: false,
      apiAccess: false,
      maxTeamMembers: 1,
      prioritySupport: false,
    },
    features: [
      "25 aktif dava",
      "500 AI işlem / ay",
      "Adversarial Red-Team",
      "50 MB dosya boyutu",
      "10 GB saklama",
      "Yargıtay scraping (50 / ay)",
      "E-posta desteği",
    ],
  },

  pro: {
    id: "pro",
    name: "Profesyonel",
    displayName: "Pro",
    description: "Hukuk büroları için",
    priceMonthlyTRY: 3999,
    priceYearlyTRY: 39990,
    priceMonthlyUSD: 129,
    priceYearlyUSD: 1290,
    badge: "recommended",
    limits: {
      maxCases: 200,
      monthlyAiCalls: 3000,
      maxFileSizeMB: 200,
      maxStorageGB: 100,
      monthlyScrapingJobs: 500,
      clientPortal: true,
      whiteLabel: true,
      adversarialMode: true,
      premiumModels: true,
      apiAccess: false,
      maxTeamMembers: 10,
      prioritySupport: true,
    },
    features: [
      "200 aktif dava",
      "3.000 AI işlem / ay",
      "Premium AI (Claude Sonnet, GPT-4o)",
      "Müvekkil Portalı (beyaz etiket)",
      "200 MB dosya boyutu",
      "100 GB saklama",
      "Yargıtay scraping (500 / ay)",
      "10 ekip üyesi",
      "Öncelikli destek",
    ],
  },

  enterprise: {
    id: "enterprise",
    name: "Kurumsal",
    displayName: "Enterprise",
    description: "Büyük hukuk ofisleri için",
    priceMonthlyTRY: 0, // Custom — Talep üzerine
    priceYearlyTRY: 0,
    priceMonthlyUSD: 0,
    priceYearlyUSD: 0,
    badge: "enterprise",
    limits: {
      maxCases: null,
      monthlyAiCalls: 999_999,
      maxFileSizeMB: 1000,
      maxStorageGB: 1000,
      monthlyScrapingJobs: 99_999,
      clientPortal: true,
      whiteLabel: true,
      adversarialMode: true,
      premiumModels: true,
      apiAccess: true,
      maxTeamMembers: 999,
      prioritySupport: true,
    },
    features: [
      "Sınırsız dava",
      "Sınırsız AI işlem",
      "On-premise / dedicated cloud seçeneği",
      "UYAP entegrasyonu",
      "Özel AI model fine-tuning",
      "API erişimi + webhook",
      "Sınırsız ekip üyesi",
      "Tahsis edilmiş hesap yöneticisi",
      "SLA garantisi",
      "Özel sözleşme",
    ],
  },
};

starter: {
  stripeMonthlyPriceId: "price_1Tfbj2E7v15ytfknWM0nv8fr",
  stripeYearlyPriceId: "price_1TfbmAE7v15ytfkn4NixXQIJ",
  // ...
},
pro: {
  stripeMonthlyPriceId: "price_1TfbnjE7v15ytfknWkzfDP0R",
  stripeYearlyPriceId: "price_1TfbqZE7v15ytfknwRKm26wY",
  // ...
},
