/**
 * Supabase yapılandırma kontrolü.
 *
 * Demo modu: Ortam değişkenleri tanımlı değilse uygulama mock veri ile çalışır.
 * Bu sayede yeni geliştiriciler `npm install && npm run dev` ile anında deneme yapabilir.
 */

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
} as const;

export const isDemoMode =
  !supabaseConfig.url || !supabaseConfig.anonKey;

export const DEMO_USER: {
  id: string;
  email: string;
  name: string;
  firmName: string;
  plan: string;
  baroSicil: string;
  initials: string;
} = {
  id: "demo-user-haris-2026",
  email: "ayse.yildiz@yildizhukuk.com",
  name: "Av. Ayşe Yıldız",
  firmName: "Yıldız & Ortakları Hukuk Bürosu",
  plan: "Pro",
  baroSicil: "34/12345",
  initials: "AY",
};

export type HarisUser = typeof DEMO_USER;
