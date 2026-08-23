/**
 * POST /api/v2/workspaces/[id]/orchestrate
 *
 * 3-tur orkestra akışını başlatır, SSE (Server-Sent Events) ile event'leri
 * client'a yollar. UI workspace-client.tsx tarafında consume edilir.
 */

import { uuid } from "@/lib/v2/utils/uuid";
import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import {
  getWorkspace,
  listDocuments,
  saveAgentOutput,
  saveAgentMessage,
  savePetitionVersion,
  updateWorkspace,
} from "@/lib/v2/workspace/db";
import {
  runOrchestra,
  type StreamEvent,
} from "@/lib/v2/orchestra/engine";
import { AGENTS } from "@/lib/v2/orchestra/agents";
import { MODEL_REGISTRY } from "@/lib/v2/providers";
import { consumeAiCall, assertUserCanUseAi } from "@/lib/billing/gate";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) {
    return new Response(JSON.stringify({ error: "Bulunamadı" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const quota = await assertUserCanUseAi(userId, 4);
  if (!quota.allowed) {
    return new Response(JSON.stringify({ error: quota.reason, quota }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const documents = await listDocuments(id);

  await updateWorkspace(id, userId, {
    orchestration_status: "running",
    current_round: 1,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {
          /* stream kapandı */
        }
      }, 15_000);

      let lastType = "";
      const emit = (event: StreamEvent) => {
        lastType = event.type;
        try {
          if (event.type === "petition_draft") {
            console.log(
              `[SSE→] petition_draft v${event.version} · ${event.markdown?.length ?? 0} chars`
            );
          } else {
            console.log(`[SSE→] ${event.type}`);
          }
          const line = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(line));
          void persistEvent(id, userId, event).catch((err) =>
            console.error("[SSE persist]", err)
          );
        } catch (e) {
          console.error("[SSE emit hatası]", e);
        }
      };

      try {
        await runOrchestra(
          {
            workspaceId: id,
            userId,
            caseTitle: ws.title,
            caseType: ws.case_type,
            caseDescription: [
              ws.case_description,
              ws.preferences?.court ? `Mahkeme: ${ws.preferences.court}` : "",
              ws.preferences?.esasNo ? `Esas: ${ws.preferences.esasNo}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
            documents,
            preferences: {
              petitionLength:
                ws.preferences?.petitionLength ?? "standard",
              qualityMode: ws.preferences?.qualityMode ?? "strict",
              checkpointMode:
                ws.preferences?.checkpointMode ?? "ask_on_conflict",
              enabledAgents: ws.preferences?.enabledAgents ?? [],
              court: ws.preferences?.court,
              esasNo: ws.preferences?.esasNo,
            },
          },
          emit
        );
        const finished = lastType === "completed";
        await updateWorkspace(id, userId, {
          orchestration_status: finished ? "completed" : "paused_for_user",
          current_round: finished ? 3 : 1,
        });
      } catch (e) {
        emit({ type: "error", message: String(e) });
        await updateWorkspace(id, userId, {
          orchestration_status: "error",
        });
      } finally {
        closed = true;
        clearInterval(heartbeat);
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

async function persistEvent(
  workspaceId: string,
  userId: string,
  event: StreamEvent
): Promise<void> {
  switch (event.type) {
    case "agent_done": {
      const agent = AGENTS[event.agentId];
      const modelInfo = MODEL_REGISTRY[agent.modelRole];
      await saveAgentOutput(
        workspaceId,
        userId,
        {
          agentId: event.agentId,
          round: event.round,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          status: "done",
          content: event.content,
          tokensUsed: event.tokensUsed,
          cost: event.cost,
          rawResponse: event.rawResponse,
        },
        {
          provider: modelInfo.provider,
          modelId: modelInfo.modelId,
          systemPrompt: agent.systemPrompt,
        }
      );
      await consumeAiCall(userId, 1);
      const ws = await getWorkspace(workspaceId, userId);
      if (ws) {
        await updateWorkspace(workspaceId, userId, {
          total_cost_usd: Number(ws.total_cost_usd ?? 0) + (event.cost ?? 0),
          total_tokens_input:
            Number(ws.total_tokens_input ?? 0) + (event.tokensUsed?.input ?? 0),
          total_tokens_output:
            Number(ws.total_tokens_output ?? 0) + (event.tokensUsed?.output ?? 0),
        });
      }
      break;
    }
    case "agent_message":
      await saveAgentMessage(workspaceId, userId, {
        id: uuid(),
        from: event.from as "user" | "orchestrator",
        to: event.to as "broadcast",
        round: event.round,
        timestamp: new Date().toISOString(),
        content: event.content,
        type: event.messageType,
      });
      break;
    case "orchestrator_message":
      await saveAgentMessage(workspaceId, userId, {
        id: uuid(),
        from: "orchestrator",
        to: "broadcast",
        round: 1,
        timestamp: new Date().toISOString(),
        content: event.content,
        type: "synthesis",
      });
      break;
    case "petition_draft":
      await savePetitionVersion(workspaceId, userId, {
        versionNumber: event.version,
        contentMarkdown: event.markdown,
        qualityReport: event.quality,
        qualityScore:
          (event.quality as { summary?: { kalite_skoru?: number } })?.summary
            ?.kalite_skoru ?? undefined,
        createdByAgent: "dilekce_editoru",
      });
      break;
  }
}
