import { NextRequest } from "next/server";
import { z } from "zod";
import { runAgentStream } from "@/lib/ai/orchestrator";
import { AGENT_PROMPTS } from "@/lib/ai/prompts";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { assertUserCanUseAi, consumeAiCall } from "@/lib/billing/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel hobby: 60s; pro: 300s

const RequestSchema = z.object({
  agentId: z.enum(Object.keys(AGENT_PROMPTS) as [keyof typeof AGENT_PROMPTS]),
  context: z.string().min(10).max(50000),
  previousOutputs: z.record(z.string(), z.string()).optional(),
  targetText: z.string().max(100000).optional(),
  modelSpec: z.string().optional(),
});

/**
 * POST /api/agents/run
 *
 * Tek bir ajanı stream olarak çalıştırır.
 * Demo modda simulated streaming, gerçek modda OpenAI/Anthropic.
 *
 * Request body:
 *   { agentId, context, previousOutputs?, targetText?, modelSpec? }
 *
 * Response: text/plain stream (token-by-token)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Geçersiz istek", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = await getCurrentUserId();
    const quota = await assertUserCanUseAi(userId, 1);
    if (!quota.allowed) {
      return new Response(JSON.stringify({ error: quota.reason, quota }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      });
    }
    await consumeAiCall(userId, 1);
    return await runAgentStream(parsed.data);
  } catch (err) {
    console.error("[agents/run] Hata:", err);
    return new Response(
      JSON.stringify({
        error: "Ajan çalıştırılamadı",
        message: err instanceof Error ? err.message : "Bilinmeyen hata",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
