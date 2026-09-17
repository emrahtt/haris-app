"use client";

/**
 * HARIS v2 — Kullanıcı Menüsü (Faz 16)
 *
 * Eksikti: /v2 üst barında çıkış yapmanın yolu yoktu (sadece "← Eski Arayüz").
 * Şimdi: hesap bilgisi, Model Stratejisi, V1, çıkış ve hesap değiştirme.
 */

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth-actions";

const GOLD = "#C9A961";

export function UserMenu({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = (email ?? "?")
    .replace(/[^a-zA-Z0-9çğıöşü]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const doSignOut = async () => {
    setBusy(true);
    await signOut();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={email ?? "Hesap"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: open ? "rgba(201,169,97,0.15)" : "transparent",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 999,
          padding: "5px 12px 5px 6px",
          cursor: "pointer",
          color: "#e2e8f0",
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: GOLD,
            color: "#0A1628",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {initials || "?"}
        </span>
        <span style={{ fontSize: 12.5, maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {email ?? "Hesap"}
        </span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 250,
            background: "#0A1628",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
            padding: 6,
            zIndex: 100,
          }}
        >
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 4 }}>
            <div style={{ fontSize: 12.5, color: "#e2e8f0", wordBreak: "break-all" }}>{email ?? "—"}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Oturum açık</div>
          </div>

          <Item href="/settings/model-strategy" label="🧠 Model Stratejisi" />
          <Item href="/dashboard" label="🗂 Eski Arayüz (V1)" />
          <Item href="/settings" label="⚙️ Ayarlar" />

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />

          <button onClick={doSignOut} disabled={busy} style={menuItem}>
            {busy ? "Çıkış yapılıyor…" : "🚪 Çıkış Yap"}
          </button>
          <button
            onClick={async () => {
              setBusy(true);
              await signOut();
              window.location.href = "/login";
            }}
            disabled={busy}
            style={menuItem}
          >
            🔄 Hesap Değiştir
          </button>
        </div>
      )}
    </div>
  );
}

function Item({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={menuItem}>
      {label}
    </a>
  );
}

const menuItem: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "9px 10px",
  fontSize: 13,
  color: "#cbd5e1",
  background: "transparent",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  textDecoration: "none",
};
