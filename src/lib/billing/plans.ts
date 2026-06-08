```ts
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
  maxCases: number | null;
  monthlyAiCalls: number;
  maxFileSizeMB: number;
  maxStorageGB: number;
  monthlyScrapingJobs: number;
  clientPortal: boolean;
  whiteLabel: boolean;
  adversarialMode: boolean;
  premiumModels: boolean;
  apiAccess: boolean;
  maxTeamMembers: number;
  prioritySupport: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  displayName: string;
  description: string;

  priceMonthlyTRY: number;
  priceYearlyTRY: number;

  priceMonthlyUSD: number;
  priceYearlyUSD: number;

  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;

  iyzicoMonthlyPlanRef?: string;
  iyzicoYearlyPlanRef?: string;

  badge?: "popular" | "recommended" | "enterprise";

  limits: PlanLimits;

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
    ],
  },

  starter: {
    id: "starter",
    name: "Başlangıç",
    displayName: "Starter",
    description: "Solo avukatlar için",

    priceMonthlyTRY: 1499,
    priceYearlyTRY: 14990,

    priceMonthlyUSD: 49,
    priceYearlyUSD: 490,

    stripeMonthlyPriceId:
      "price_1Tfbj2E7v15ytfknWM0nv8fr",

    stripeYearlyPriceId:
      "price_1TfbmAE7v15ytfkn4NixXQIJ",

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
      "50 MB dosya",
      "10 GB saklama",
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

    stripeMonthlyPriceId:
      "price_1TfbnjE7v15ytfknWkzfDP0R",

    stripeYearlyPriceId:
      "price_1TfbqZE7v15ytfknwRKm26wY",

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
      "3000 AI işlem",
      "Premium AI",
      "100 GB saklama",
    ],
  },

  enterprise: {
    id: "enterprise",
    name: "Kurumsal",
    displayName: "Enterprise",
    description: "Büyük hukuk ofisleri için",

    priceMonthlyTRY: 0,
    priceYearlyTRY: 0,

    priceMonthlyUSD: 0,
    priceYearlyUSD: 0,

    badge: "enterprise",

    limits: {
      maxCases: null,
      monthlyAiCalls: 999999,
      maxFileSizeMB: 1000,
      maxStorageGB: 1000,
      monthlyScrapingJobs: 99999,
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
      "Sınırsız AI",
      "API erişimi",
    ],
  },
};

export function getPlan(
  id: PlanId | string
): Plan {
  return PLANS[id as PlanId] || PLANS.free;
}

export function getPlanList(): Plan[] {
  return [
    PLANS.free,
    PLANS.starter,
    PLANS.pro,
    PLANS.enterprise,
  ];
}

export function formatPriceTRY(
  amount: number
): string {
  if (amount === 0) return "Ücretsiz";

  return `₺${amount.toLocaleString("tr-TR")}`;
}

export function formatPriceUSD(
  amount: number
): string {
  if (amount === 0) return "Free";

  return `$${amount.toLocaleString("en-US")}`;
}
```
