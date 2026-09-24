"use client";

/**
 * HARIS — Model Stratejisi Paneli (Faz 16)
 *
 * Rol bazında sağlayıcı + model + reasoning seviyesi seçimi.
 * Seçimler Supabase'de saklanır (Vercel env'ine dokunmaya gerek kalmaz).
 * İsim + açıklama ile "strateji" olarak kaydedilip sonra geri yüklenebilir.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

type ProviderId = "anthropic" | "openai" | "gemini" | "meta";
type Effort = "low" | "medium" | "high";
type ModelRole = "orchestrator" | "analyzer" | "opposition" | "drafter" | "quick" | "vision";

interface CatalogModel {
  id: string;
  name: string;
  provider: ProviderId;
  costIn?: number;
  costOut?: number;
  contextWindow: number;
  maxOutput: number;
  vision: boolean;
  supportsEffort: boolean;
  effortValues?: string[];
  status: "current" | "legacy" | "preview" | "limited";
  warning?: string;
  bestFor?: string;
}

interface RoleChoice {
  provider: ProviderId;
  modelId: string;
  effort?: Effort;
  maxTokens?: number;
}

type StrategyConfig = Partial<Record<ModelRole, RoleChoice>>;

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  config: StrategyConfig;
  isActive: boolean;
  updatedAt: string;
}

interface ProviderInfo {
  id: ProviderId;
  label: string;
  hasKey: boolean;
  keyName: string;
}

const GOLD = "#C9A961";
const NAVY = "#0A1628";

const STATUS_LABEL: Record<CatalogModel["status"], { text: string; color: string }> = {
  current: { text: "güncel", color: "#4ade80" },
  legacy: { text: "eski sürüm", color: "#fbbf24" },
  preview: { text: "önizleme", color: "#60a5fa" },
  limited: { text: "sınırlı erişim", color: "#f87171" },
};

export function ModelStrategyPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [roles, setRoles] = useState<{ id: ModelRole; name: string; desc: string }[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // FAZ 16.7: şu an GERÇEKTEN kullanılan modeller (strateji > env > varsayılan)
  const [effective, setEffective] = useState<
    { role: string; provider: ProviderId; modelId: string; effort?: Effort | null; source: string; hasKey: boolean }[]
  >([]);
  const [envWarnings, setEnvWarnings] = useState<
    { envKey: string; rawValue: string; problem: string; resolvedTo: string }[]
  >([]);

  const [config, setConfig] = useState<StrategyConfig>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/strategies");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Yüklenemedi");
      setProviders(data.providers);
      setModels(data.models);
      setRoles(data.roles);
      setStrategies(data.strategies);
      setActiveId(data.activeId);

      setEffective(data.effective ?? []);
      setEnvWarnings(data.envWarnings ?? []);

      const active = data.strategies.find((s: Strategy) => s.id === data.activeId);
      if (active) {
        setConfig(active.config);
        setName(active.name);
        setDescription(active.description ?? "");
      } else {
        // FAZ 16.7 DÜZELTME: eskiden kod içi DEFAULT_STRATEGY gösteriliyordu,
        // bu yüzden panel "şu an kullanılan" modeli YANLIŞ gösteriyordu.
        // Artık gerçekten devrede olan değerler (Vercel env dahil) ön-yükleniyor.
        const fromEffective: StrategyConfig = {};
        (data.effective ?? []).forEach(
          (e: { role: ModelRole; provider: ProviderId; modelId: string; effort?: Effort | null }) => {
            fromEffective[e.role] = {
              provider: e.provider,
              modelId: e.modelId,
              ...(e.effort ? { effort: e.effort } : {}),
            };
          }
        );
        setConfig(Object.keys(fromEffective).length ? fromEffective : data.defaultStrategy);
        setName("");
        setDescription("");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const modelsByProvider = useMemo(() => {
    const map: Record<string, CatalogModel[]> = {};
    models.forEach((m) => {
      map[m.provider] = map[m.provider] ?? [];
      map[m.provider].push(m);
    });
    return map;
  }, [models]);

  const setRole = (role: ModelRole, patch: Partial<RoleChoice>) => {
    setConfig((prev) => {
      const current = prev[role] ?? { provider: "anthropic", modelId: "claude-opus-5" };
      const next = { ...current, ...patch };
      // Sağlayıcı değiştiyse modeli o sağlayıcının ilk güncel modeline çek
      if (patch.provider && patch.provider !== current.provider) {
        const list = modelsByProvider[patch.provider] ?? [];
        const preferred = list.find((m) => m.status === "current") ?? list[0];
        next.modelId = preferred?.id ?? "";
        next.effort = preferred?.supportsEffort ? (next.effort ?? "medium") : undefined;
      }
      return { ...prev, [role]: next };
    });
  };

  const modelInfo = (role: ModelRole): CatalogModel | undefined => {
    const c = config[role];
    return c ? models.find((m) => m.id === c.modelId) : undefined;
  };

  const testRole = async (role: ModelRole) => {
    const c = config[role];
    if (!c) return;
    setTesting(role);
    setTestResult((prev) => ({ ...prev, [role]: { ok: true, message: "Test ediliyor…" } }));
    try {
      const res = await fetch("/api/strategies/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: c.provider, modelId: c.modelId, effort: c.effort }),
      });
      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [role]: { ok: !!data.ok, message: data.message ?? data.error ?? "Bilinmeyen sonuç" },
      }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [role]: { ok: false, message: String(e) } }));
    } finally {
      setTesting(null);
    }
  };

  const save = async (activate = true) => {
    setNotice(null);
    setError(null);
    if (!name.trim()) {
      setError("Kaydetmek için stratejiye bir isim ver (ör. \"Standart Dilekçe Düzeni\").");
      return;
    }
    try {
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, config, activate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kaydedilemedi");
      setNotice(data.message);
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const activateStrategy = async (s: Strategy) => {
    setNotice(null);
    try {
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, name: s.name, description: s.description, config: s.config, activate: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Etkinleştirilemedi");
      setNotice(`"${s.name}" etkinleştirildi.`);
      setConfig(s.config);
      setName(s.name);
      setDescription(s.description ?? "");
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const removeStrategy = async (id: string) => {
    if (!confirm("Bu strateji silinsin mi?")) return;
    await fetch(`/api/strategies?id=${id}`, { method: "DELETE" });
    await load();
  };

  const resetToDefault = async () => {
    setNotice(null);
    const res = await fetch("/api/strategies?default=1", { method: "POST" });
    const data = await res.json();
    setNotice(data.message ?? "Varsayılana dönüldü.");
    await load();
  };

  if (loading) {
    return <div style={{ padding: 32, color: "#94a3b8" }}>Yükleniyor…</div>;
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, color: "#e2e8f0" }}>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, color: GOLD, marginBottom: 4 }}>
        HARIS Model Stratejisi
      </h1>
      <p style={{ color: "#94a3b8", fontSize: 13.5, marginBottom: 20 }}>
        Her rol için hangi yapay zekâ modelinin çalışacağını seç. Kaydettiğin an geçerli olur —
        Vercel&apos;e girmene veya yeniden deploy etmene gerek yok.
      </p>

      {error && (
        <div style={box("#7f1d1d", "#fecaca")}>
          <strong>Hata:</strong> {error}
        </div>
      )}
      {notice && <div style={box("#14532d", "#bbf7d0")}>{notice}</div>}

      {/* Sağlayıcı anahtar durumu */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
        {providers.map((p) => (
          <div
            key={p.id}
            style={{
              border: `1px solid ${p.hasKey ? "#166534" : "#7f1d1d"}`,
              background: p.hasKey ? "rgba(22,101,52,0.12)" : "rgba(127,29,29,0.12)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12.5,
            }}
          >
            <span style={{ color: p.hasKey ? "#4ade80" : "#f87171" }}>
              {p.hasKey ? "●" : "○"}
            </span>{" "}
            {p.label}
            {!p.hasKey && (
              <span style={{ color: "#fca5a5", marginLeft: 6 }}>
                ({p.keyName} eksik — modeller çalışmaz)
              </span>
            )}
          </div>
        ))}
      </div>

      {/* FAZ 16.7 — ŞU AN KULLANILANLAR */}
      <div
        style={{
          border: "1px solid rgba(201,169,97,0.35)",
          borderRadius: 10,
          padding: 14,
          marginBottom: 20,
          background: "rgba(201,169,97,0.06)",
        }}
      >
        <div style={{ fontWeight: 600, color: GOLD, marginBottom: 4, fontSize: 14 }}>
          📌 Şu anda fiilen kullanılan modeller
        </div>
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>
          Kayıtlı strateji yoksa Vercel env değişkenleri geçerlidir. Aşağıdaki liste
          her isteğin gerçekten hangi modele gittiğini gösterir.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: "#94a3b8", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                <th style={th}>Rol</th>
                <th style={th}>Model</th>
                <th style={th}>Kaynak</th>
                <th style={th}>Anahtar</th>
              </tr>
            </thead>
            <tbody>
              {effective.map((e) => {
                const role = roles.find((r) => r.id === e.role);
                const src =
                  e.source === "strateji"
                    ? { t: "🟢 Kayıtlı strateji", c: "#4ade80" }
                    : e.source === "env"
                      ? { t: "🔵 Vercel env", c: "#60a5fa" }
                      : { t: "⚪ Kod varsayılanı", c: "#94a3b8" };
                return (
                  <tr key={e.role} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{role?.name ?? e.role}</div>
                    </td>
                    <td style={td}>
                      <code style={{ color: "#e2e8f0" }}>
                        {e.provider}:{e.modelId}
                      </code>
                      {e.effort && <span style={{ color: "#94a3b8" }}> · çaba: {e.effort}</span>}
                    </td>
                    <td style={{ ...td, color: src.c, whiteSpace: "nowrap" }}>{src.t}</td>
                    <td style={{ ...td, color: e.hasKey ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>
                      {e.hasKey ? "✓ var" : "✕ YOK"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {envWarnings.length > 0 && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "rgba(127,29,29,0.25)", border: "1px solid rgba(248,113,113,0.35)" }}>
            <div style={{ fontWeight: 600, color: "#fca5a5", fontSize: 12.5, marginBottom: 6 }}>
              ⚠️ Vercel env&apos;inde hatalı model tanımı var ({envWarnings.length})
            </div>
            {envWarnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: "#fecaca", marginBottom: 3 }}>
                <code>{w.envKey}=&quot;{w.rawValue}&quot;</code> → {w.problem} →{" "}
                <strong>kullanılan: {w.resolvedTo}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rol kartları */}
      {roles.map((role) => {
        const choice = config[role.id] ?? { provider: "anthropic" as ProviderId, modelId: "claude-opus-5" };
        const info = modelInfo(role.id);
        const list = modelsByProvider[choice.provider] ?? [];
        const tr = testResult[role.id];

        return (
          <div
            key={role.id}
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{role.name}</div>
                <div style={{ color: "#94a3b8", fontSize: 12.5 }}>{role.desc}</div>
              </div>
              <button onClick={() => testRole(role.id)} disabled={testing === role.id} style={btnGhost}>
                {testing === role.id ? "Test ediliyor…" : "🩺 Test et"}
              </button>
            </div>

            {tr && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: tr.ok ? "#86efac" : "#fca5a5", whiteSpace: "pre-wrap" }}>
                {tr.message}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, marginTop: 12 }}>
              <label style={labelStyle}>
                Sağlayıcı
                <select
                  value={choice.provider}
                  onChange={(e) => setRole(role.id, { provider: e.target.value as ProviderId })}
                  style={selectStyle}
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} {p.hasKey ? "" : "— anahtar yok"}
                    </option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Model
                <select
                  value={choice.modelId}
                  onChange={(e) => setRole(role.id, { modelId: e.target.value })}
                  style={selectStyle}
                >
                  {list.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.id}
                    </option>
                  ))}
                </select>
              </label>

              {info?.supportsEffort && (
                <label style={labelStyle}>
                  Muhakeme seviyesi
                  <select
                    value={choice.effort ?? "medium"}
                    onChange={(e) => setRole(role.id, { effort: e.target.value as Effort })}
                    style={selectStyle}
                  >
                    <option value="low">Düşük (hızlı + ucuz)</option>
                    <option value="medium">Orta (dengeli)</option>
                    <option value="high">Yüksek (derin + pahalı)</option>
                  </select>
                </label>
              )}

              <label style={labelStyle}>
                Token tavanı
                <input
                  type="number"
                  min={1000}
                  max={128000}
                  step={1000}
                  value={choice.maxTokens ?? ""}
                  placeholder={role.id === "drafter" ? "16000" : "4000"}
                  onChange={(e) =>
                    setRole(role.id, {
                      maxTokens: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  style={selectStyle}
                />
              </label>
            </div>

            {info && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
                <span style={{ color: STATUS_LABEL[info.status].color }}>
                  [{STATUS_LABEL[info.status].text}]
                </span>{" "}
                {info.costIn !== undefined
                  ? `$${info.costIn} / $${info.costOut} (1M token)`
                  : "fiyat doğrulanamadı"}{" "}
                · bağlam {(info.contextWindow / 1000).toFixed(0)}K · çıktı{" "}
                {(info.maxOutput / 1000).toFixed(0)}K
                {info.bestFor ? ` · ${info.bestFor}` : ""}
              </div>
            )}
            {info?.warning && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: "#fcd34d", whiteSpace: "pre-wrap" }}>
                ⚠️ {info.warning}
              </div>
            )}
          </div>
        );
      })}

      {/* Kaydet */}
      <div
        style={{
          border: `1px solid ${GOLD}44`,
          borderRadius: 10,
          padding: 16,
          marginTop: 20,
          background: "rgba(201,169,97,0.06)",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 10, color: GOLD }}>Bu seçimi kaydet</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Strateji adı (ör. Yoğun Dilekçe Düzeni)"
            style={selectStyle}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Açıklama (ör. Opus ile tam dilekçe, Luna ile özetler)"
            style={selectStyle}
          />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => save(true)} style={btnGold}>
            💾 Kaydet ve etkinleştir
          </button>
          <button onClick={resetToDefault} style={btnGhost}>
            ↩️ Varsayılana dön (env)
          </button>
        </div>
      </div>

      {/* Kayıtlı stratejiler */}
      <div style={{ marginTop: 26 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Kayıtlı stratejiler ({strategies.length})</div>
        {strategies.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            Henüz kayıtlı strateji yok. Yukarıdan seçim yapıp kaydet.
          </div>
        )}
        {strategies.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              border: `1px solid ${s.isActive ? GOLD : "rgba(255,255,255,0.10)"}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 8,
              background: s.isActive ? "rgba(201,169,97,0.08)" : "transparent",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {s.name} {s.isActive && <span style={{ color: GOLD, fontSize: 12 }}>· ETKİN</span>}
              </div>
              {s.description && <div style={{ color: "#94a3b8", fontSize: 12.5 }}>{s.description}</div>}
              <div style={{ color: "#64748b", fontSize: 11.5, marginTop: 2 }}>
                {Object.entries(s.config)
                  .map(([role, c]) => `${role}: ${(c as RoleChoice).modelId}`)
                  .join(" · ")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!s.isActive && (
                <button onClick={() => activateStrategy(s)} style={btnGhost}>
                  Etkinleştir
                </button>
              )}
              <button
                onClick={() => {
                  setConfig(s.config);
                  setName(s.name);
                  setDescription(s.description ?? "");
                  setNotice(`"${s.name}" düzenleyiciye yüklendi. Değiştirip kaydedebilirsin.`);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={btnGhost}
              >
                Düzenle
              </button>
              <button onClick={() => removeStrategy(s.id)} style={{ ...btnGhost, color: "#f87171" }}>
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      <p style={{ color: "#64748b", fontSize: 12, marginTop: 24 }}>
        Not: Aktif strateji yoksa sistem Vercel env değişkenlerini (HARIS_*_MODEL) kullanır.
        Strateji değiştirmek için yeniden deploy gerekmez; en geç 15 saniye içinde etkili olur.
        {activeId ? "" : " Şu an: env geçerli."}
      </p>
    </div>
  );
}

function box(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    border: `1px solid ${color}55`,
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 14,
    whiteSpace: "pre-wrap",
  };
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 11.5,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const selectStyle: React.CSSProperties = {
  background: NAVY,
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  textTransform: "none",
  letterSpacing: 0,
  width: "100%",
};

const btnGold: React.CSSProperties = {
  background: GOLD,
  color: NAVY,
  border: "none",
  borderRadius: 6,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const th: React.CSSProperties = { padding: "6px 10px", fontWeight: 500, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" };
const td: React.CSSProperties = { padding: "7px 10px", verticalAlign: "top" };

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 6,
  padding: "9px 14px",
  fontSize: 13,
  cursor: "pointer",
};
