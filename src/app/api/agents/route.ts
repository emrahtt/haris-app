import { NextResponse } from "next/server";
import { AGENT_PROMPTS, AGENT_DISPLAY_NAMES } from "@/lib/ai/prompts";
import { isAiDemoMode, hasOpenAI, hasAnthropic, aiConfig } from "@/lib/ai/config";

/**
 * GET /api/agents
 * Sistem durumunu döndürür: ajanlar, sağlayıcılar, demo mode.
 */
export async function GET() {
  return NextResponse.json({
    agents: Object.keys(AGENT_PROMPTS).map((id) => ({
      id,
      name: AGENT_DISPLAY_NAMES[id as keyof typeof AGENT_DISPLAY_NAMES],
    })),
    providers: {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      demoMode: isAiDemoMode,
      defaultModel: aiConfig.defaultModel,
      adversarialModel: aiConfig.adversarialModel,
    },
  });
}
