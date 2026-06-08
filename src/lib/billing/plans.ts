starter: {
  id: "starter",
  name: "Başlangıç",
  displayName: "Starter",
  description: "Solo avukatlar için",

  priceMonthlyTRY: 1499,
  priceYearlyTRY: 14990,

  priceMonthlyUSD: 49,
  priceYearlyUSD: 490,

  stripeMonthlyPriceId: "price_1Tfbj2E7v15ytfknWM0nv8fr",
  stripeYearlyPriceId: "price_1TfbmAE7v15ytfkn4NixXQIJ",

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

  stripeMonthlyPriceId: "price_1TfbnjE7v15ytfknWkzfDP0R",
  stripeYearlyPriceId: "price_1TfbqZE7v15ytfknwRKm26wY",

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