"use client";

/**
 * HARIS v2 — Workspace Ayarları Paneli
 *
 * Sprint 11.5: Karar 4, 7, 8 + dilekçe uzunluk slider'ı (kullanıcı isteği).
 *
 * Burada kullanıcı:
 *  - Dilekçe uzunluğunu seçer (Kısa/Standart/Kapsamlı)
 *  - Kalite modunu seçer (Sıkı/Esnek)
 *  - Checkpoint modunu seçer (her zaman sor / sadece çelişkide / otomatik devam)
 *  - İç diyalogları gör/gizle (Karar 9)
 *  - Ham yanıtları default göster/gizle (Karar 8)
 *  - Ajanları aç/kapa (Karar 7)
 */

import { useState } from "react";
import { AGENTS, ALL_AGENT_IDS, type AgentId } from "@/lib/v2/orchestra/agents";

interface Preferences {
  petitionLength: "short" | "standard" | "comprehensive";
  qualityMode: "strict" | "flexible";
  checkpointMode: "always_ask" | "ask_on_conflict" | "auto_continue";
  showInternalDialogs: boolean;
  showRawResponses: boolean;
  enabledAgents: AgentId[];
  court?: string;
  esasNo?: string;
}

interface Props {
  initialPreferences: Preferences;
  onSave: (prefs: Preferences) => Promise<void>;
  onClose: () => void;
}

const LENGTH_OPTIONS = [
  {
    id: "short" as const,
    label: "Kısa",
    desc: "3-5 sayfa",
    extra: "Acil / basit davalar",
  },
  {
    id: "standard" as const,
    label: "Standart",
    desc: "6-10 sayfa",
    extra: "Çoğu dava için ideal ⭐",
  },
  {
    id: "comprehensive" as const,
    label: "Kapsamlı",
    desc: "11-18 sayfa",
    extra: "Karmaşık / yüksek değerli",
  },
];

const CHECKPOINT_OPTIONS = [
  {
    id: "always_ask" as const,
    label: "Her tur sonunda sor",
    desc: "TUR 1 ve TUR 2 sonunda durur, onayınızı bekler",
  },
  {
    id: "ask_on_conflict" as const,
    label: "Gerektiğinde sor (önerilen)",
    desc: "TUR 1→3 durmadan çalışır, dilekçe Canvas'a düşer; yalnızca kritik bilgi/belge gerekirse durur ve size sorar",
  },
  {
    id: "auto_continue" as const,
    label: "Otomatik devam",
    desc: "Durmadan çalışır, sadece son sonucu gösterir",
  },
];

export function WorkspaceSettingsPanel({
  initialPreferences,
  onSave,
  onClose,
}: Props) {
  const [prefs, setPrefs] = useState<Preferences>(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(prefs);
      setSavedAt(new Date().toLocaleTimeString("tr-TR"));
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = (id: AgentId) => {
    setPrefs((p) => ({
      ...p,
      enabledAgents:
        p.enabledAgents.length === 0
          ? // Boşken: tümü açık varsayılır, bu agent'ı kapatmak için listeyi tersine doldur
            ALL_AGENT_IDS.filter((a) => a !== id)
          : p.enabledAgents.includes(id)
          ? p.enabledAgents.filter((a) => a !== id)
          : [...p.enabledAgents, id],
    }));
  };

  const isAgentEnabled = (id: AgentId): boolean => {
    if (prefs.enabledAgents.length === 0) return AGENTS[id].enabledByDefault;
    return prefs.enabledAgents.includes(id);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0E1B30] border border-white/15 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-bold text-[#C9A961]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            ⚙️ Workspace Ayarları
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg"
          >
            ✕
          </button>
        </div>

        <Section title="Mahkeme / Esas" hint="V1 aktarımında da gider">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={prefs.court ?? ""}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, court: e.target.value }))
              }
              placeholder="Örn. İstanbul 4. Asliye Hukuk"
              className="px-3 py-2 rounded bg-white/[0.03] border border-white/10 text-sm"
            />
            <input
              value={prefs.esasNo ?? ""}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, esasNo: e.target.value }))
              }
              placeholder="Esas no: 2025/123"
              className="px-3 py-2 rounded bg-white/[0.03] border border-white/10 text-sm"
            />
          </div>
        </Section>

        {/* ── Dilekçe Uzunluğu (kullanıcı isteği) ────────────── */}
        <Section title="Dilekçe Uzunluğu" hint="Kalite Gate ile garantili">
          <div className="grid grid-cols-3 gap-2">
            {LENGTH_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() =>
                  setPrefs((p) => ({ ...p, petitionLength: opt.id }))
                }
                className={`p-3 rounded-lg border text-left transition ${
                  prefs.petitionLength === opt.id
                    ? "border-[#C9A961] bg-[#C9A961]/10"
                    : "border-white/10 hover:border-white/30 bg-white/[0.02]"
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-slate-400">{opt.desc}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {opt.extra}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            💡 <strong>Kalite garantili:</strong> Kalite Kontrol Ajanı her
            paragrafı puanlar, doldurma olanlar atılır. Hedef uzunluk dolgu
            ile değil, kaliteli içerikle tutulur.
          </div>
        </Section>

        {/* ── Kalite Modu ───────────────────────────────────── */}
        <Section title="Kalite Modu">
          <div className="flex gap-2">
            <ToggleBtn
              active={prefs.qualityMode === "strict"}
              onClick={() => setPrefs((p) => ({ ...p, qualityMode: "strict" }))}
              label="🎯 Sıkı"
              desc="Her paragraf somut katkı"
            />
            <ToggleBtn
              active={prefs.qualityMode === "flexible"}
              onClick={() =>
                setPrefs((p) => ({ ...p, qualityMode: "flexible" }))
              }
              label="🌿 Esnek"
              desc="Retorik vurgu kabul"
            />
          </div>
        </Section>

        {/* ── Checkpoint Modu (Karar 4) ───────────────────── */}
        <Section title="Checkpoint Davranışı">
          <div className="space-y-2">
            {CHECKPOINT_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`block p-2 rounded border cursor-pointer transition ${
                  prefs.checkpointMode === opt.id
                    ? "border-[#C9A961] bg-[#C9A961]/10"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="checkpoint-mode"
                  checked={prefs.checkpointMode === opt.id}
                  onChange={() =>
                    setPrefs((p) => ({ ...p, checkpointMode: opt.id }))
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium">{opt.label}</span>
                <div className="text-xs text-slate-400 ml-5">{opt.desc}</div>
              </label>
            ))}
          </div>
        </Section>

        {/* ── Gizli özellikler (Karar 8, 9) ─────────────────── */}
        <Section title="Gelişmiş Görüntüleme">
          <div className="space-y-2">
            <ToggleRow
              label="🔍 Ham AI yanıtlarını default göster"
              hint="Her ajan kartında 'Ham yanıt' butonuna basmadan görünür"
              checked={prefs.showRawResponses}
              onChange={(v) =>
                setPrefs((p) => ({ ...p, showRawResponses: v }))
              }
            />
            <ToggleRow
              label="📜 İç ajan diyaloglarını default göster"
              hint="Şef ↔ Ajan ve Ajan ↔ Ajan konuşmaları sol panelde otomatik açık"
              checked={prefs.showInternalDialogs}
              onChange={(v) =>
                setPrefs((p) => ({ ...p, showInternalDialogs: v }))
              }
            />
          </div>
        </Section>

        {/* ── Ajan Aç/Kapa (Karar 7) ────────────────────────── */}
        <Section title="Aktif Ajanlar">
          <div className="text-xs text-slate-500 mb-3">
            Bu davada çalışmasını istemediğiniz ajanları kapatın. Orkestra
            Şefi sadece açık olanları görevlendirir.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ALL_AGENT_IDS.filter((id) => id !== "orchestrator").map((id) => {
              const a = AGENTS[id];
              const enabled = isAgentEnabled(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleAgent(id)}
                  className={`p-2 rounded-lg border text-left transition ${
                    enabled
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-white/10 bg-white/[0.02] opacity-50"
                  }`}
                  title={a.description}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{a.emoji}</span>
                    <div className="flex-1">
                      <div className="text-xs font-medium">{a.displayName}</div>
                      <div className="text-[10px] text-slate-500">
                        {a.capabilities[0]}
                      </div>
                    </div>
                    <span className="text-xs">{enabled ? "✓" : "○"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-xs text-slate-500">
            {savedAt ? `✓ ${savedAt}'de kaydedildi` : ""}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm text-slate-400 hover:text-slate-200"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded bg-[#C9A961] text-[#0A1628] font-semibold text-sm hover:bg-[#e6c479] disabled:opacity-50"
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
        <span>{title}</span>
        {hint && <span className="text-[10px] text-[#C9A961]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-3 rounded-lg border text-left transition ${
        active
          ? "border-[#C9A961] bg-[#C9A961]/10"
          : "border-white/10 hover:border-white/30 bg-white/[0.02]"
      }`}
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-slate-400">{desc}</div>
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-2 rounded border border-white/10 hover:bg-white/[0.02] cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        <div className="text-[10px] text-slate-500">{hint}</div>
      </div>
    </label>
  );
}
