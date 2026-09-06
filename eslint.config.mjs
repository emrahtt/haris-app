/**
 * HARIS ESLint Flat Config
 *
 * Next.js 15 + TypeScript için optimize.
 * `next lint` interaktif prompt'u atlatır.
 *
 * Çalıştırma:
 *   npm run lint
 *   npm run lint:fix
 */

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "scripts/**",
      "supabase/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // HARIS özel kuralları
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off", // Türkçe metinde sürekli false positive
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
