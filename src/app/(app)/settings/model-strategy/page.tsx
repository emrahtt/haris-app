import type { Metadata } from "next";
import { ModelStrategyPanel } from "@/components/settings/model-strategy-panel";

export const metadata: Metadata = {
  title: "Model Stratejisi · HARIS",
  description:
    "Rol bazında sağlayıcı ve model seçimi — Claude, GPT, Gemini, Muse Spark",
};

export const dynamic = "force-dynamic";

export default function ModelStrategyPage() {
  return <ModelStrategyPanel />;
}
