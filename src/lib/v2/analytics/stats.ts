import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { listWorkspaces, listAgentOutputs, type WorkspaceRow } from "@/lib/v2/workspace/db";
import { AGENTS, type AgentId } from "@/lib/v2/orchestra/agents";

export interface AgentCostRow {
  agentId: string;
  label: string;
  runs: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

export interface AnalyticsSnapshot {
  workspaceCount: number;
  completedCount: number;
  runningCount: number;
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  petitionCount: number;
  byAgent: AgentCostRow[];
  byWorkspace: Array<{
    id: string;
    title: string;
    cost: number;
    tokensIn: number;
    tokensOut: number;
    status: string;
    round: number;
  }>;
}

export async function getUserAnalytics(userId: string): Promise<AnalyticsSnapshot> {
  const workspaces = await listWorkspaces(userId);
  const byWorkspace = workspaces.map((w) => ({
    id: w.id,
    title: w.title,
    cost: Number(w.total_cost_usd ?? 0),
    tokensIn: Number(w.total_tokens_input ?? 0),
    tokensOut: Number(w.total_tokens_output ?? 0),
    status: w.orchestration_status,
    round: w.current_round,
  }));

  const agentMap = new Map<string, AgentCostRow>();

  if (!isDemoMode) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from("agent_runs")
        .select("agent_id, tokens_input, tokens_output, cost_usd")
        .eq("user_id", userId);
      for (const r of data ?? []) {
        bumpAgent(agentMap, String(r.agent_id), {
          tokensIn: Number(r.tokens_input ?? 0),
          tokensOut: Number(r.tokens_output ?? 0),
          cost: Number(r.cost_usd ?? 0),
        });
      }
    }
  } else {
    for (const w of workspaces) {
      const outs = await listAgentOutputs(w.id);
      for (const o of outs) {
        bumpAgent(agentMap, o.agentId, {
          tokensIn: o.tokensUsed?.input ?? 0,
          tokensOut: o.tokensUsed?.output ?? 0,
          cost: o.cost ?? 0,
        });
      }
    }
  }

  const totalsFromWs = summarizeWorkspaces(workspaces);
  const byAgent = [...agentMap.values()].sort((a, b) => b.cost - a.cost);

  return {
    workspaceCount: workspaces.length,
    completedCount: workspaces.filter((w) => w.orchestration_status === "completed").length,
    runningCount: workspaces.filter((w) => w.orchestration_status === "running").length,
    totalCost: totalsFromWs.cost || byAgent.reduce((s, a) => s + a.cost, 0),
    totalTokensIn: totalsFromWs.in || byAgent.reduce((s, a) => s + a.tokensIn, 0),
    totalTokensOut: totalsFromWs.out || byAgent.reduce((s, a) => s + a.tokensOut, 0),
    petitionCount: workspaces.filter((w) => w.current_round >= 3).length,
    byAgent,
    byWorkspace,
  };
}

function bumpAgent(
  map: Map<string, AgentCostRow>,
  agentId: string,
  delta: { tokensIn: number; tokensOut: number; cost: number }
) {
  const agent = AGENTS[agentId as AgentId];
  const prev = map.get(agentId) ?? {
    agentId,
    label: agent ? `${agent.emoji} ${agent.shortName}` : agentId,
    runs: 0,
    tokensIn: 0,
    tokensOut: 0,
    cost: 0,
  };
  prev.runs += 1;
  prev.tokensIn += delta.tokensIn;
  prev.tokensOut += delta.tokensOut;
  prev.cost += delta.cost;
  map.set(agentId, prev);
}

function summarizeWorkspaces(ws: WorkspaceRow[]) {
  return {
    cost: ws.reduce((s, w) => s + Number(w.total_cost_usd ?? 0), 0),
    in: ws.reduce((s, w) => s + Number(w.total_tokens_input ?? 0), 0),
    out: ws.reduce((s, w) => s + Number(w.total_tokens_output ?? 0), 0),
  };
}
