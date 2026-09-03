/**
 * POST — Checkpoint sonrası orkestraya kaldığı turdan devam.
 *
 * Kullanıcının checkpoint kararı:
 *  - agent_message olarak kaydedilir,
 *  - scratchpad'e yazılır (böylece TUR 3 sentezinde "kullanıcı yönlendirmesi"
 *    olarak görünür),
 *  - userGuidance olarak engine'e iletilir.
 *
 * Kaldığı tur otomatik hesaplanır:
 *  - Hiç çıktı yoksa      → TUR 1
 *  - Sadece TUR 1 varsa    → TUR 2
 *  - TUR 2 çıktısı da varsa → TUR 3 (dilekçe sentezi)
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
import { writeToScratchpad } from "@/lib/v2/memory/db";
import { assertUserCanUseAi } from "@/lib/billing/gate";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Kullanıcı "belge içeriği olmasa bile devam et" dediyse pre-flight'ı atla. */
function isOverrideChoice(choice: string | undefined): boolean {
  if (!choice) return false;
  return /yine de devam/i.test(choice) || choice === "opt_override_unreadable";
}

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

  // Kullanıcının kararını scratchpad'e yaz → TUR 3 sentezi bunu görecek
  const guidance = choice && !isOverrideChoice(choice) ? choice : undefined;
  if (guidance) {
    try {
      await writeToScratchpad(id, userId, {
        writtenBy: "orchestrator",
        roundNumber: 1,
        topic: "checkpoint_kullanici_karari",
        content: `Kullanıcı checkpoint kararı: ${guidance}`,
        metadata: { checkpointId },
      });
    } catch (e) {
      console.warn("[Resume scratchpad yazma hatası]", e);
    }
  }

  const [documents, outputs] = await Promise.all([
    listDocuments(id),
    listAgentOutputs(id),
  ]);

  // Tüm turların çıktılarını tur sırasına göre birleştir (TUR1 + TUR2 eleştirisi dahil)
  const byAgent: Record<string, { round: number; content: string }[]> = {};
  for (const o of outputs) {
    if (o.content && o.round >= 1) {
      (byAgent[o.agentId] ??= []).push({ round: o.round, content: o.content });
    }
  }
  const priorOutputs = {} as Record<AgentId, string>;
  for (const [agentId, arr] of Object.entries(byAgent)) {
    arr.sort((a, b) => a.round - b.round);
    priorOutputs[agentId as AgentId] = arr.map((x) => x.content).join("\n\n");
  }

  const hasRound2 = outputs.some((o) => o.round === 2 && o.content);
  const hasAnyOutput = Object.keys(priorOutputs).length > 0;
  const startRound = !hasAnyOutput ? 1 : hasRound2 ? 3 : 2;

  await updateWorkspace(id, userId, { orchestration_status: "running" });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastType = "";
      let lastRound: 1 | 2 | 3 | undefined;
      const emit = (event: StreamEvent) => {
        lastType = event.type;
        if (event.type === "round_start") {
          lastRound = event.round;
          void updateWorkspace(id, userId, { current_round: event.round }).catch(
            () => undefined
          );
        }
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
            resumeFromRound: startRound,
            priorOutputs,
            // Kullanıcının gerçek checkpoint modunu koru: "always_ask" seçmişse
            // sonraki tur sonunda tekrar durup sorar.
            preferences: {
              petitionLength: ws.preferences?.petitionLength ?? "standard",
              qualityMode: ws.preferences?.qualityMode ?? "strict",
              checkpointMode:
                ws.preferences?.checkpointMode ?? "ask_on_conflict",
              enabledAgents: ws.preferences?.enabledAgents ?? [],
              court: ws.preferences?.court,
              esasNo: ws.preferences?.esasNo,
            },
            userGuidance: guidance,
            forceContinue: isOverrideChoice(choice),
          },
          emit
        );
        const finished = lastType === "completed";
        await updateWorkspace(id, userId, {
          orchestration_status: finished ? "completed" : "paused_for_user",
          current_round: finished ? 3 : (lastRound ?? startRound),
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
