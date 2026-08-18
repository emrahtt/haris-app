import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Faz 13.5.2: typedRoutes root'a taşındı (Next 15.5+ deprecated experimental)
  typedRoutes: false,
  env: {
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_SUPABASE_URL ? "false" : "true",
  },
  /**
   * Server-side packages (Node.js native binaries, dynamic require)
   */
  serverExternalPackages: [
    "pdf-to-png-converter",
    "@napi-rs/canvas",
    "pdf-parse",
    "pdf-lib",
    "mammoth",
    "pdfkit",
    "jszip",
    "cheerio",
    "exceljs",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          "pdf-to-png-converter": "commonjs pdf-to-png-converter",
          "@napi-rs/canvas": "commonjs @napi-rs/canvas",
        });
      }
    }
    return config;
  },
};

export default config;
