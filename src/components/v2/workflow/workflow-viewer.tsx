"use client";

/**
 * HARIS v2 — Live Workflow Viewer
 *
 * Sticky sol panel üst — orkestra akışını canlı gösterir.
 * 3 TUR + checkpoint'ler düğüm graf olarak.
 *
 * Sprint 11.1: Mock state ile UI iskelet.
 * Sprint 11.3: Gerçek LangGraph state streaming.
 */

import type { AgentOutput, UserCheckpoint } from "@/lib/v2/state/workspace-state";
import { AGENTS, type AgentId } from "@/lib/v2/orchestra/agents";

interface WorkflowViewerProps {
  currentRound: 0 | 1 | 2 | 3;
  agentOutputs: AgentOutput[];
  checkpoints: UserCheckpoint[];
  onAgentClick?: (agentId: AgentId) => void;
  onCheckpointClick?: (checkpointId: string) => void;
}

const ROUND_LABELS = {
  1: "Bağımsız İnceleme",
  2: "Çapraz İnceleme",
  3: "Sentez + Dilekçe",
} as const;

export function WorkflowViewer({
  currentRound,
  agentOutputs,
  checkpoints,
  onAgentClick,
  onCheckpointClick,
}: WorkflowViewerProps) {
  // Round bazlı grupla
  const roundsData = [1, 2, 3].map((round) => {
    const outputs = agentOutputs.filter((o) => o.round === round);
    const checkpoint = checkpoints.find((c) => c.conflict?.round === round);
    const allDone = outputs.length > 0 && outputs.every((o) => o.status === "done");
    const anyRunning = outputs.some((o) => o.status === "running");
    return { round, outputs, checkpoint, allDone, anyRunning };
  });

  if (currentRound === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-500">
        <div className="text-2xl mb-2 opacity-50">⏸️</div>
        <div>Orkestra henüz başlamadı</div>
        <div className="mt-1 text-slate-600">
          Belge yükleyip &ldquo;Başlat&rdquo; deyin
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {roundsData.map(({ round, outputs, checkpoint, allDone, anyRunning }) => (
        <div key={round}>
          {/* Round başlığı */}
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`text-[10px] uppercase tracking-widest font-semibold ${
                round === currentRound
                  ? "text-[#C9A961]"
                  : allDone
                  ? "text-emerald-400"
                  : "text-slate-600"
              }`}
            >
              TUR {round} · {ROUND_LABELS[round as 1 | 2 | 3]}
            </span>
            {allDone && <span className="text-[10px] text-emerald-400">✓</span>}
            {anyRunning && (
              <span className="text-[10px] text-[#C9A961] animate-pulse">●</span>
            )}
          </div>

          {/* Ajan node'ları */}
          {outputs.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {outputs.map((output) => {
                const agent = AGENTS[output.agentId];
                if (!agent) return null;
                return (
                  <button
                    key={`${output.agentId}-${round}`}
                    onClick={() => onAgentClick?.(output.agentId)}
                    className={`text-left p-1.5 rounded-md border transition text-[11px] ${
                      output.status === "done"
                        ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                        : output.status === "running"
                        ? "border-[#C9A961]/40 bg-[#C9A961]/10 animate-pulse"
                        : output.status === "error"
                        ? "border-rose-500/30 bg-rose-500/5"
                        : "border-white/10 bg-white/[0.02] opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{agent.emoji}</span>
                      <span className="truncate font-medium">{agent.shortName}</span>
                    </div>
                    {output.status === "running" && (
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        çalışıyor…
                      </div>
                    )}
                    {output.status === "done" && output.tokensUsed && (
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {output.tokensUsed.output} tok
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-[10px] text-slate-600 py-2 text-center">
              ⏳ bekliyor
            </div>
          )}

          {/* Checkpoint */}
          {checkpoint && (
            <button
              onClick={() => onCheckpointClick?.(checkpoint.id)}
              className={`mt-2 w-full text-left p-2 rounded-md border-2 text-xs transition ${
                checkpoint.userChoice
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/40 bg-amber-500/10 animate-pulse"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{checkpoint.userChoice ? "✓" : "🛑"}</span>
                <span className="font-semibold">
                  {checkpoint.userChoice
                    ? "Checkpoint çözüldü"
                    : "Müdahalenize ihtiyaç var"}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                {checkpoint.reason}
              </div>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
