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
  type OrchestraStage,
  type StreamEvent,
} from "@/lib/v2/orchestra/engine";
import { AGENTS } from "@/lib/v2/orchestra/agents";
import { checkAiGate, recordAiCall } from "@/lib/billing/quota-gate";
import { MODEL_REGISTRY } from "@/lib/v2/providers";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 dakika

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // FAZ 15: ?stage=round1|round2|draft|quality  (yoksa "all" = eski davranış)
  const requested = req.nextUrl.searchParams.get("stage");
  const stage: OrchestraStage =
    requested === "round1" ||
    requested === "round2" ||
    requested === "draft" ||
    requested === "quality" ||
    requested === "all"
      ? requested
      : "all";
  const isFinalStage = stage === "all" || stage === "quality";
  console.log(`[ORKESTRA] stage=${stage} workspace=${id}`);
  const userId = await getCurrentUserId();
  const ws = await getWorkspace(id, userId);
  if (!ws) {
    return new Response(JSON.stringify({ error: "Bulunamadı" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const documents = await listDocuments(id);

  // Faz 16.5: kota kapısı + sahip muafiyeti
  // Tam bir orkestra süreci 1 çağrı sayılır (round1/all aşamasında),
  // böylece 4 aşamalı akış ücretsiz kotayı 4x hızlı tüketmez.
  const gate = await checkAiGate(userId);
  if (!gate.allowed) {
    console.warn(`[KOTA] orkestra engellendi user=${userId} plan=${gate.planId} ${gate.used}/${gate.limit}`);
    await updateWorkspace(id, userId, { orchestration_status: "error" });
    return new Response(
      JSON.stringify({ error: gate.reason, quota: {
        plan: gate.planName, used: gate.used, limit: gate.limit, remaining: 0 } }),
      { status: gate.status, headers: { "Content-Type": "application/json" } }
    );
  }
  if (stage === "round1" || stage === "all") recordAiCall(userId);

  await updateWorkspace(id, userId, {
    orchestration_status: "running",
    ...(stage === "round1" || stage === "all" ? { current_round: 1 as const } : {}),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        try {
          const line = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(line));
          // Faz 13.8: server log — production'da hangi event ne zaman gitti gör
          console.log(
            `[SSE→] ${event.type}${
              (event as { agentId?: string }).agentId
                ? ` (${(event as { agentId: string }).agentId})`
                : ""
            }${
              event.type === "petition_draft"
                ? ` v${(event as { version: number }).version} · ${
                    (event as { markdown: string }).markdown?.length ?? 0
                  } chars`
                : ""
            }`
          );
          // Side-effect: DB persist
          void persistEvent(id, userId, event).catch((err) => {
            console.warn("[SSE persist hatası]", event.type, err);
          });
        } catch (e) {
          console.error("[SSE emit hatası]", event.type, e);
        }
      };

      // Faz 13.8: keep-alive heartbeat (Vercel 25sn timeout için)
      // Her 15 sn'de bir comment event yolla ki bağlantı düşmesin
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // controller kapalıysa ignore
        }
      }, 15000);

      try {
        await runOrchestra(
          {
            workspaceId: id,
            userId,
            caseTitle: ws.title,
            caseType: ws.case_type,
            caseDescription: ws.case_description,
            documents,
            preferences: {
              petitionLength:
                ws.preferences?.petitionLength ?? "standard",
              qualityMode: ws.preferences?.qualityMode ?? "strict",
              checkpointMode:
                ws.preferences?.checkpointMode ?? "ask_on_conflict",
              enabledAgents: ws.preferences?.enabledAgents ?? [],
              // Faz 14.0: mahkeme bilgisi (kullanicinin reposunda mevcut)
              court: (ws.preferences as { court?: string } | undefined)?.court,
              esasNo: (ws.preferences as { esasNo?: string } | undefined)?.esasNo,
            },
          },
          emit,
          stage
        );
        await updateWorkspace(id, userId, {
          // FAZ 15: sadece son aşamada "completed" işaretle
          orchestration_status: isFinalStage ? "completed" : "running",
          ...(isFinalStage ? { current_round: 3 as const } : {}),
        });
      } catch (e) {
        emit({ type: "error", message: String(e) });
        await updateWorkspace(id, userId, {
          orchestration_status: "error",
        });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed
        }
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
