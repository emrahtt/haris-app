"use client";

/**
 * HARIS v2 — Checkpoint Dialog (Karar 4: hibrit mod)
 * Çelişki bulunduğunda kullanıcıya gösterilir; opsiyonlu seçim sunar.
 */

import type { UserCheckpoint } from "@/lib/v2/state/workspace-state";
import { AGENTS } from "@/lib/v2/orchestra/agents";
import { useEffect, useState } from "react";

interface Props {
  checkpoint: UserCheckpoint;
  onResolve: (choice: string) => void;
  onClose: () => void;
}

export function CheckpointDialog({ checkpoint, onResolve, onClose }: Props) {
  const [customInput, setCustomInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(checkpoint.timeoutMs / 1000);
  const [autoApply, setAutoApply] = useState(false);

  // Timeout countdown (Karar 4: hibrit mod default opsiyonel)
  useEffect(() => {
    if (checkpoint.timeoutMs <= 0) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          setAutoApply(true);
          // Önerilen seçeneği otomatik uygula
          const recommended = checkpoint.conflict?.options.find((o) =>
            o.recommendedBy
          );
          if (recommended) {
            setTimeout(() => onResolve(recommended.id), 800);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [checkpoint, onResolve]);

  const conflict = checkpoint.conflict;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0E1B30] border border-amber-500/40 rounded-xl max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400 mb-1">
              🛑 Checkpoint · TUR {checkpoint.conflict?.round ?? "?"}
            </div>
            <h2 className="text-lg font-semibold">{checkpoint.reason}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Conflict description */}
        {conflict && (
          <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-slate-300">
            <div className="text-xs text-slate-500 mb-2">
              Çelişki:{" "}
              {conflict.agents
                .map((a) => `${AGENTS[a].emoji} ${AGENTS[a].shortName}`)
                .join(" vs ")}
            </div>
            {conflict.description}
          </div>
        )}

        {/* Options */}
        <div className="space-y-2 mb-4">
          {conflict?.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            const recommendedAgent = opt.recommendedBy
              ? AGENTS[opt.recommendedBy]
              : null;
            return (
              <label
                key={opt.id}
                className={`block p-3 rounded-lg border cursor-pointer transition ${
                  isSelected
                    ? "border-[#C9A961] bg-[#C9A961]/10"
                    : "border-white/10 hover:border-white/30 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="checkpoint-option"
                    checked={isSelected}
                    onChange={() => setSelectedOption(opt.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-100">{opt.label}</div>
                    {recommendedAgent && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {recommendedAgent.emoji} {recommendedAgent.shortName}{" "}
                        öneriyor
                      </div>
                    )}
                    <div className="text-xs text-slate-400 mt-1">
                      {opt.reasoning}
                    </div>
                  </div>
                </div>
              </label>
            );
          })}

          {/* Custom input */}
          <label
            className={`block p-3 rounded-lg border cursor-pointer transition ${
              selectedOption === "__custom"
                ? "border-[#C9A961] bg-[#C9A961]/10"
                : "border-white/10 hover:border-white/30 bg-white/[0.02]"
            }`}
          >
            <div className="flex items-start gap-2">
              <input
                type="radio"
                name="checkpoint-option"
                checked={selectedOption === "__custom"}
                onChange={() => setSelectedOption("__custom")}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-100">
                  Ben farklı bir şey diyeceğim
                </div>
                {selectedOption === "__custom" && (
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Talimatınızı yazın…"
                    rows={3}
                    className="mt-2 w-full px-3 py-2 rounded bg-black/30 border border-white/10 text-sm text-slate-100"
                    autoFocus
                  />
                )}
              </div>
            </div>
          </label>
        </div>

        {/* Timeout bar (Karar 4: hibrit) */}
        {checkpoint.timeoutMs > 0 && !autoApply && (
          <div className="mb-4 text-xs text-slate-400">
            ⏱️ {remaining} saniye sonra önerilen seçenek otomatik uygulanacak
            <div className="mt-1 h-1 bg-white/5 rounded overflow-hidden">
              <div
                className="h-full bg-[#C9A961] transition-all duration-1000"
                style={{
                  width: `${(remaining / (checkpoint.timeoutMs / 1000)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-slate-400 hover:text-slate-200"
          >
            Sonra
          </button>
          <button
            onClick={() =>
              onResolve(
                selectedOption === "__custom" ? customInput : selectedOption!
              )
            }
            disabled={
              !selectedOption ||
              (selectedOption === "__custom" && customInput.trim().length < 5)
            }
            className={`px-5 py-2 rounded font-semibold text-sm transition ${
              selectedOption &&
              (selectedOption !== "__custom" || customInput.trim().length >= 5)
                ? "bg-[#C9A961] text-[#0A1628] hover:bg-[#e6c479]"
                : "bg-white/5 text-slate-500 cursor-not-allowed"
            }`}
          >
            Devam Et →
          </button>
        </div>
      </div>
    </div>
  );
}
