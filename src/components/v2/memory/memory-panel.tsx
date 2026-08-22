"use client";

/**
 * HARIS v2 — Memory Panel
 *
 * Chat panelinin üstünde herzaman görünen matter memory bloğu.
 * 6 kategori: Entities, Facts, Decisions, Notes, Preferences, Insights.
 * Kullanıcı: not ekle, düzenle, sabitle, sil.
 */

import { useEffect, useState, useCallback } from "react";
import type { MatterMemory, MemoryBlock, MemoryType } from "@/lib/v2/memory/types";

interface Props {
  workspaceId: string;
  /** Memory değiştiğinde parent'a bildir */
  onMemoryChange?: () => void;
}

const CATEGORY_META: Record<
  keyof MatterMemory,
  { label: string; icon: string; color: string; type: MemoryType }
> = {
  entities: {
    label: "Taraflar",
    icon: "👥",
    color: "text-sky-300",
    type: "entity",
  },
  facts: {
    label: "Somut Veriler",
    icon: "📊",
    color: "text-emerald-300",
    type: "fact",
  },
  decisions: {
    label: "Kararlar",
    icon: "⚖️",
    color: "text-amber-300",
    type: "decision",
  },
  userNotes: {
    label: "Notlarım",
    icon: "📝",
    color: "text-[#C9A961]",
    type: "user_note",
  },
  preferences: {
    label: "Tercihler",
    icon: "⚙️",
    color: "text-violet-300",
    type: "preference",
  },
  insights: {
    label: "Ajan Tespitleri",
    icon: "💡",
    color: "text-rose-300",
    type: "insight",
  },
};

export function MemoryPanel({ workspaceId, onMemoryChange }: Props) {
  const [memory, setMemory] = useState<MatterMemory | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v2/workspaces/${workspaceId}/memory`);
      if (res.ok) {
        const data = await res.json();
        setMemory(data.memory);
      }
    } catch (e) {
      console.error("Memory yüklenemedi:", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
    // Her 15 saniyede refresh (auto-extract ile eklenmiş yeni entity'leri gösterir)
    const interval = setInterval(load, 15000);
    // Chat veya orchestrate sonrası anında refresh için custom event
    const handleRefresh = () => { void load(); };
    if (typeof window !== "undefined") {
      window.addEventListener("haris:memory-refresh", handleRefresh);
    }
    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("haris:memory-refresh", handleRefresh);
      }
    };
  }, [load]);

  const totalBlocks = memory
    ? memory.entities.length +
      memory.facts.length +
      memory.decisions.length +
      memory.userNotes.length +
      memory.preferences.length +
      memory.insights.length
    : 0;

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await fetch(`/api/v2/workspaces/${workspaceId}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "user_note",
          key: `not_${Date.now()}`,
          value: { note: newNote.trim() },
          priority: 9,
          isPinned: true,
        }),
      });
      setNewNote("");
      setAddingNote(false);
      await load();
      onMemoryChange?.();
    } catch (e) {
      alert("Not eklenemedi: " + String(e));
    }
  };

  const deleteBlock = async (blockId: string, label: string) => {
    if (!confirm(`"${label}" silinsin mi?`)) return;
    try {
      await fetch(
        `/api/v2/workspaces/${workspaceId}/memory?blockId=${blockId}`,
        { method: "DELETE" }
      );
      await load();
      onMemoryChange?.();
    } catch (e) {
      alert("Silinemedi: " + String(e));
    }
  };

  const togglePin = async (block: MemoryBlock) => {
    try {
      await fetch(`/api/v2/workspaces/${workspaceId}/memory`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId: block.id,
          isPinned: !block.isPinned,
        }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  const saveEdit = async (blockId: string) => {
    try {
      // Basit JSON parse (kullanıcı düz metin girerse note olarak sar)
      let value: Record<string, unknown>;
      try {
        value = JSON.parse(editValue);
      } catch {
        value = { note: editValue };
      }
      await fetch(`/api/v2/workspaces/${workspaceId}/memory`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, value }),
      });
      setEditingBlock(null);
      await load();
    } catch (e) {
      alert("Kaydedilemedi: " + String(e));
    }
  };

  return (
    <div className="border-b border-white/10 bg-white/[0.015]">
      {/* Header — herzaman görünür */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🧠</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Matter Hafızası
          </span>
          <span className="text-[10px] text-slate-500">
            ({totalBlocks} kayıt)
          </span>
        </div>
        <span className="text-slate-500 text-xs">{isExpanded ? "▾" : "▸"}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 max-h-36 overflow-y-auto overscroll-contain">
          {loading && (
            <div className="text-[10px] text-slate-500 text-center py-2">
              Yükleniyor…
            </div>
          )}

          {!loading && totalBlocks === 0 && (
            <div className="text-[10px] text-slate-500 text-center py-3">
              Henüz hafıza kaydı yok. Belge yükledikçe otomatik dolar.
            </div>
          )}

          {memory &&
            (Object.keys(CATEGORY_META) as (keyof MatterMemory)[]).map((cat) => {
              const blocks = memory[cat];
              if (blocks.length === 0) return null;
              const meta = CATEGORY_META[cat];
              return (
                <div key={cat} className="mb-3">
                  <div
                    className={`text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 ${meta.color}`}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    <span className="text-slate-600">({blocks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {blocks.map((block) => (
                      <MemoryItem
                        key={block.id}
                        block={block}
                        editing={editingBlock === block.id}
                        editValue={editValue}
                        onEdit={() => {
                          setEditingBlock(block.id);
                          setEditValue(JSON.stringify(block.value, null, 2));
                        }}
                        onEditChange={setEditValue}
                        onSaveEdit={() => saveEdit(block.id)}
                        onCancelEdit={() => setEditingBlock(null)}
                        onDelete={() =>
                          deleteBlock(block.id, block.memoryKey)
                        }
                        onTogglePin={() => togglePin(block)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

          {/* + Not Ekle butonu */}
          <div className="mt-2 pt-2 border-t border-white/5">
            {!addingNote ? (
              <button
                type="button"
                onClick={() => setAddingNote(true)}
                className="w-full text-[10px] px-2 py-1.5 rounded border border-dashed border-[#C9A961]/30 text-[#C9A961] hover:bg-[#C9A961]/10"
              >
                + Not Ekle (AI hep bunu hatırlayacak)
              </button>
            ) : (
              <div className="space-y-1">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Örn: Müvekkil çok stresli, tonu yumuşak tut"
                  rows={3}
                  className="w-full px-2 py-1.5 rounded text-[11px] bg-black/30 border border-white/10 text-slate-100 placeholder:text-slate-500"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={addNote}
                    disabled={!newNote.trim()}
                    className="flex-1 text-[10px] px-2 py-1 rounded bg-[#C9A961] text-[#0A1628] font-semibold disabled:opacity-40"
                  >
                    💾 Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingNote(false);
                      setNewNote("");
                    }}
                    className="text-[10px] px-2 py-1 rounded border border-white/10 text-slate-400"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Single memory item
// ─────────────────────────────────────────────────────────

function MemoryItem({
  block,
  editing,
  editValue,
  onEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onTogglePin,
}: {
  block: MemoryBlock;
  editing: boolean;
  editValue: string;
  onEdit: () => void;
  onEditChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const displayValue = renderValue(block.value);
  const isNote = block.memoryType === "user_note";

  if (editing) {
    return (
      <div className="p-2 rounded border border-[#C9A961]/40 bg-[#C9A961]/5">
        <div className="text-[9px] text-slate-500 mb-1">{block.memoryKey}</div>
        <textarea
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          rows={4}
          className="w-full px-2 py-1 rounded text-[10px] font-mono bg-black/30 border border-white/10 text-slate-100"
          autoFocus
        />
        <div className="flex gap-1 mt-1">
          <button
            type="button"
            onClick={onSaveEdit}
            className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300"
          >
            ✓ Kaydet
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-slate-400"
          >
            İptal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group px-2 py-1 rounded hover:bg-white/[0.02] text-[11px] leading-tight">
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          {!isNote && (
            <span className="text-slate-500 font-medium">{block.memoryKey}: </span>
          )}
          <span className="text-slate-300">{displayValue}</span>
          {block.confidence < 0.9 && (
            <span className="text-[8px] text-amber-400 ml-1">
              ({Math.round(block.confidence * 100)}%)
            </span>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button
            type="button"
            onClick={onTogglePin}
            className={`text-[9px] px-1 py-0.5 rounded ${
              block.isPinned
                ? "bg-amber-500/30 text-amber-200"
                : "bg-white/5 text-slate-500 hover:bg-white/10"
            }`}
            title={block.isPinned ? "Sabitli (silme korunacak)" : "Sabitle"}
          >
            📌
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-[9px] px-1 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400"
            title="Düzenle"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-[9px] px-1 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200"
            title="Sil"
          >
            🗑
          </button>
        </div>
      </div>
      {block.source && block.source !== "user_manual" && (
        <div className="text-[8px] text-slate-600 mt-0.5 ml-1">
          {block.source === "auto_extract" ? "AI otomatik" : block.source}
        </div>
      )}
    </div>
  );
}

function renderValue(value: unknown): string {
  // AI bazen string, bazen array, bazen null dönebilir — hepsini güvenli işle
  if (value === null || value === undefined) return "—";

  // String direkt
  if (typeof value === "string") {
    return value.slice(0, 300);
  }

  // Number / boolean
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
      .join(" · ")
      .slice(0, 300);
  }

  // Object değil (edge case) — direkt string'e çevir
  if (typeof value !== "object") {
    return String(value).slice(0, 300);
  }

  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length === 0) return "—";

  // Note tipi (kullanıcı manuel notları)
  if ("note" in obj && typeof obj.note === "string") {
    return obj.note;
  }
  // Text tipi (insight'lar)
  if ("text" in obj && typeof obj.text === "string") {
    return obj.text.slice(0, 300);
  }
  // Value tipi (fact'ler için AI'ın döndüğü ortak yapı)
  if ("value" in obj) {
    if (typeof obj.value === "string") return obj.value.slice(0, 300);
    if (typeof obj.value === "number") return String(obj.value);
  }
  // Diğer: key=value formatı
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      if (typeof v === "object") return `${k}=${JSON.stringify(v)}`;
      return `${k}=${v}`;
    })
    .join(" · ")
    .slice(0, 300);
}
