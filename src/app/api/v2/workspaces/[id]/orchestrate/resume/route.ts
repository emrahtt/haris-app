/**
 * POST — Checkpoint sonrası TUR 2+3 SSE ile devam.
 */

import { uuid } from "@/lib/v2/utils/uuid";
import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import {
  getWorkspace,
  listDocuments,
  listAgentOutputs,
  saveAgentMessage,
  updateWorkspace,
} from "@/lib/v2/workspace/db";
import { runOrchestra, type StreamEvent } from "@/lib/v2/orchestra/engine";
import type { AgentId } from "@/lib/v2/orchestra/agents";
import { assertUserCanUseAi } from "@/lib/billing/gate";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const body = await req.json().catch(() => ({}));
  const { checkpointId, choice } = body as {
    checkpointId?: string;
    choice?: string;
  };

  const ws = await getWorkspace(id, userId);
  if (!ws) {
    return new Response(JSON.stringify({ error: "Bulunamadı" }), {
      status: 404,
    });
  }

  const quota = await assertUserCanUseAi(userId, 2);
  if (!quota.allowed) {
    return new Response(JSON.stringify({ error: quota.reason, quota }), {
      status: 402,
    });
  }

  if (checkpointId && choice) {
    await saveAgentMessage(id, userId, {
      id: uuid(),
      from: "user",
      to: "orchestrator",
      round: 1,
      timestamp: new Date().toISOString(),
      content: `Checkpoint ${checkpointId.slice(0, 8)} kararı: ${choice}`,
      type: "directive",
    });
  }

  const [documents, outputs] = await Promise.all([
    listDocuments(id),
    listAgentOutputs(id),
  ]);

  const priorOutputs = {} as Record<AgentId, string>;
  for (const o of outputs) {
    if (o.round === 1 && o.content) {
      priorOutputs[o.agentId] = o.content;
    }
  }

  await updateWorkspace(id, userId, { orchestration_status: "running" });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastType = "";
      const emit = (event: StreamEvent) => {
        lastType = event.type;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };
      try {
        await runOrchestra(
          {
            workspaceId: id,
            userId,
            caseTitle: ws.title,
            caseType: ws.case_type,
            caseDescription: ws.case_description,
            documents,
            resumeFromRound: 2,
            priorOutputs,
            preferences: {
              petitionLength: ws.preferences?.petitionLength ?? "standard",
              qualityMode: ws.preferences?.qualityMode ?? "strict",
              checkpointMode: "auto_continue",
              enabledAgents: ws.preferences?.enabledAgents ?? [],
              court: ws.preferences?.court,
              esasNo: ws.preferences?.esasNo,
            },
          },
          emit
        );
        await updateWorkspace(id, userId, {
          orchestration_status:
            lastType === "completed" ? "completed" : "paused_for_user",
          current_round: lastType === "completed" ? 3 : 2,
        });
      } catch (e) {
        emit({ type: "error", message: String(e) });
        await updateWorkspace(id, userId, { orchestration_status: "error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
