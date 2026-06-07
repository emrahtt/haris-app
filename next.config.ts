import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  // Demo modunda Supabase env yoksa hata fırlatmasın
  env: {
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_SUPABASE_URL ? "false" : "true",
  },
};

export default config;
