"use client";

/**
 * HARIS v2 — Parties Panel (Faz 13.6)
 *
 * Bir workspace'in müvekkil / karşı taraf / tanık listesini yönetir.
 * Yeni party eklerken otomatik conflict check yapılır ve banner gösterilir.
 */

import { useEffect, useState, useCallback } from "react";
import type { Party, PartyRole, ConflictHit } from "@/lib/v2/conflict/db";
import { ConflictBanner } from "../conflict/conflict-banner";

interface Props {
  workspaceId: string;
}

const ROLES: { id: PartyRole; label: string; emoji: string; color: string }[] = [
  { id: "muvekkil", label: "Müvekkil", emoji: "👤", color: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" },
  { id: "karsi_taraf", label: "Karşı Taraf", emoji: "⚖️", color: "text-red-300 border-red-500/40 bg-red-500/10" },
  { id: "ilgili_taraf", label: "İlgili Taraf", emoji: "🔗", color: "text-slate-300 border-slate-500/40 bg-slate-500/10" },
  { id: "tanik", label: "Tanık", emoji: "👁️", color: "text-sky-300 border-sky-500/40 bg-sky-500/10" },
  { id: "bilirkisi", label: "Bilirkişi", emoji: "🎓", color: "text-violet-300 border-violet-500/40 bg-violet-500/10" },
];

export function PartiesPanel({ workspaceId }: Props) {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [role, setRole] = useState<PartyRole>("muvekkil");
  const [fullName, setFullName] = useState("");
  const [tcNo, setTcNo] = useState("");
  const [notes, setNotes] = useState("");

  // Conflict state
  const [conflictHits, setConflictHits] = useState<ConflictHit[]>([]);

  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/workspaces/${workspaceId}/parties`);
      const data = await res.json();
      setParties(data.parties ?? []);
    } catch (err) {
      console.error("[parties fetch]", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  const resetForm = () => {
    setRole("muvekkil");
    setFullName("");
    setTcNo("");
    setNotes("");
    setShowForm(false);
    setConflictHits([]);
  };

  const actuallySave = async (justification?: string) => {
    setSaving(true);
    try {
      // Eğer conflict override varsa logla
      if (conflictHits.length > 0 && justification !== undefined) {
        const topSeverity =
          conflictHits.find((h) => h.severity === "critical")?.severity ??
          conflictHits.find((h) => h.severity === "warning")?.severity ??
          "info";
        const topHit = conflictHits[0];
        await fetch("/api/v2/conflict-check", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            conflictingWorkspaceId: topHit.workspaceId,
            partyName: fullName,
            matchType: topHit.matchType,
            severity: topSeverity,
            justification,
          }),
        });
      }

      const res = await fetch(`/api/v2/workspaces/${workspaceId}/parties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          fullName,
          tcNo: tcNo || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Kaydedilemedi: ${err.error ?? "bilinmeyen hata"}`);
        return;
      }
      resetForm();
      await loadParties();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert("İsim boş olamaz");
      return;
    }

    // 1. Önce conflict check
    setSaving(true);
    try {
      const checkRes = await fetch("/api/v2/conflict-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          tcNo: tcNo || undefined,
          excludeWorkspaceId: workspaceId,
        }),
      });
      const checkData = await checkRes.json();
      const hits: ConflictHit[] = checkData.hits ?? [];

      if (hits.length > 0) {
        // Conflict var → banner göster, kullanıcı onaylarsa devam
        setConflictHits(hits);
        setSaving(false);
        return;
      }

      // Conflict yok → direkt kaydet
      await actuallySave();
    } catch (err) {
      console.error("[submit]", err);
      alert("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (partyId: string) => {
    if (!confirm("Bu tarafı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/v2/workspaces/${workspaceId}/parties?pid=${partyId}`, {
      method: "DELETE",
    });
    await loadParties();
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-left"
        >
          <h3 className="text-xs font-semibold text-[#C9A961] uppercase tracking-wider">
            ⚖️ Taraflar ({parties.length})
          </h3>
          <span className="text-slate-500 text-xs">{open ? "▾" : "▸"}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setShowForm(!showForm);
          }}
          className="text-[10px] px-2 py-1 rounded bg-[#C9A961] text-[#0A1628] hover:bg-[#B89751] transition font-medium"
        >
          {showForm ? "−" : "+ Ekle"}
        </button>
      </div>
      {!open ? null : (
      <div className="px-3 pb-3 max-h-40 overflow-y-auto overscroll-contain">

      {/* Conflict Banner */}
      {conflictHits.length > 0 && (
        <div className="mb-4">
          <ConflictBanner
            hits={conflictHits}
            onOverride={async (justification) => {
              await actuallySave(justification);
            }}
            onCancel={() => {
              setConflictHits([]);
                      }}
          />
        </div>
      )}

      {/* Ekleme formu */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 border border-slate-800 rounded p-3 bg-slate-900/40 space-y-3"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rol</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    role === r.id
                      ? r.color + " font-medium"
                      : "border-slate-700 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {r.emoji} {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Ad Soyad / Ünvan *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ör: Ali Veli / X A.Ş."
              className="w-full text-sm bg-slate-900/60 border border-slate-700 rounded p-2 text-slate-100 placeholder:text-slate-500 focus:border-[#C9A961] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              TC Kimlik / Vergi No (opsiyonel — daha güvenilir eşleşme için)
            </label>
            <input
              type="text"
              value={tcNo}
              onChange={(e) => setTcNo(e.target.value)}
              placeholder="11 haneli TC veya 10 haneli VKN"
              className="w-full text-sm bg-slate-900/60 border border-slate-700 rounded p-2 text-slate-100 placeholder:text-slate-500 focus:border-[#C9A961] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Not (opsiyonel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ör: Vekaletname mevcut, tebligat adresi..."
              className="w-full text-sm bg-slate-900/60 border border-slate-700 rounded p-2 text-slate-100 placeholder:text-slate-500 focus:border-[#C9A961] focus:outline-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="text-xs px-3 py-1.5 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded bg-[#C9A961] text-[#0A1628] hover:bg-[#B89751] font-medium disabled:opacity-50"
            >
              {saving ? "Kontrol ediliyor..." : "Ekle (Conflict Check)"}
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      {loading ? (
        <div className="text-xs text-slate-500 italic">Yükleniyor...</div>
      ) : parties.length === 0 ? (
        <div className="text-xs text-slate-500 italic">
          Henüz taraf eklenmedi. Yeni dava açarken müvekkil ve karşı tarafı eklemenizi öneririz — bu sayede
          gelecekte çıkar çatışması otomatik yakalanır.
        </div>
      ) : (
        <ul className="space-y-2">
          {parties.map((p) => {
            const roleInfo = ROLES.find((r) => r.id === p.role);
            return (
              <li
                key={p.id}
                className={`text-sm border rounded px-3 py-2 flex items-start justify-between gap-2 ${
                  roleInfo?.color ?? "border-slate-700"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs opacity-80">
                      {roleInfo?.emoji} {roleInfo?.label ?? p.role}
                    </span>
                    <span className="font-medium text-slate-100">{p.fullName}</span>
                  </div>
                  {(p.tcNo || p.taxNo) && (
                    <div className="text-xs opacity-70 mt-1">
                      🆔 {p.tcNo ?? p.taxNo}
                    </div>
                  )}
                  {p.notes && (
                    <div className="text-xs opacity-70 mt-1 italic">📝 {p.notes}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                  aria-label="Sil"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
      </div>
      )}
    </div>
  );
}
