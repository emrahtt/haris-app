"use client";

/**
 * HARIS v2 — Checkpoint Dialog (Karar 4: hibrit mod)
 * Çelişki bulunduğunda kullanıcıya gösterilir; opsiyonlu seçim sunar.
 */

import type { UserCheckpoint } from "@/lib/v2/state/workspace-state";
import { AGENTS } from "@/lib/v2/orchestra/agents";
import { useState } from "react";

interface Props {
  checkpoint: UserCheckpoint;
  onResolve: (choice: string) => void;
  onClose: () => void;
}

export function CheckpointDialog({ checkpoint, onResolve, onClose }: Props) {
  const [customInput, setCustomInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Seçenek id'si yerine ETİKETİNİ göndeririz; böylece engine kullanıcının
  // kararını "yönlendirme" olarak TUR 3 sentezine işleyebilir.
  const optionLabel = (optionId: string) =>
    checkpoint.conflict?.options.find((o) => o.id === optionId)?.label ??
    optionId;

  // FAZ 16.8: OTOMATİK KAPANMA KALDIRILDI.
  // Eskiden 10 saniye sonra kendini kapatıp önerilen seçeneği kendisi
  // uyguluyordu — kullanıcı ne seçtiğini bile göremiyordu.
  // Artık dialog kullanıcı karar verene kadar AÇIK KALIR ve süreç DURAKLAR.

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

        {/* FAZ 16.8: düz Türkçe açıklama — bu ekran ne, ne işe yarar */}
        <div className="mb-4 p-3 rounded-lg border text-[12.5px] text-slate-300 leading-relaxed"
             style={{ background: "rgba(201,169,97,0.06)", borderColor: "rgba(201,169,97,0.28)" }}>
          <div className="font-semibold mb-1" style={{ color: "#e8d5a8" }}>
            💡 Bu ekran ne işe yarıyor?
          </div>
          TUR 1 bitti: uzman ajanlar davayı bağımsız inceledi. <strong>Karşı Argüman
          ajanı</strong> (şeytan avukatı) diğer ajanların önerilerinde zayıf nokta buldu ve
          ortaya <strong>iki farklı hukukî strateji</strong> çıktı. Dilekçeyi hangisine göre
          kuracağımızı sen seçiyorsun.
          <div className="mt-1.5 text-slate-400">
            Seçimin TUR 3&apos;te (dilekçe yazımı) omurga olarak kullanılır. Karar vermeden
            süreç ilerlemez — zaman aşımı yok.
          </div>
        </div>

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

        {/* FAZ 16.8: geri sayım yok — süreç duraklatıldı, karar bekleniyor */}
        <div className="mb-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-100">
          ⏸ <strong>Süreç duraklatıldı.</strong> Sen karar verene kadar hiçbir aşama
          ilerlemez, zaman aşımı yok. Seçimin dilekçenin hukukî stratejisini belirler.
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              // FAZ 16.8: "Kararı atla" → önerilen (veya ilk) seçenekle devam eder.
              // Eski "Sonra" butonu dialogu kapatıyor ama süreci kilitli bırakıyordu.
              const recommended =
                checkpoint.conflict?.options.find((o) => o.recommendedBy) ??
                checkpoint.conflict?.options[0];
              onResolve(
                recommended
                  ? optionLabel(recommended.id)
                  : "Varsayılan strateji ile devam et"
              );
            }}
            className="px-4 py-2 rounded text-sm text-slate-400 hover:text-slate-200 border border-white/10"
            title="Seçim yapmadan önerilen seçenekle devam et"
          >
            Kararı atla →
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-slate-500 hover:text-slate-300"
            title="Pencereyi kapat (süreç duraklatılmış kalır, raydan tekrar başlatabilirsin)"
          >
            Kapat
          </button>
          <button
            onClick={() =>
              onResolve(
                selectedOption === "__custom"
                  ? customInput
                  : optionLabel(selectedOption!)
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
