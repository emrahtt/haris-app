"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function UsageMeter() {
  const [label, setLabel] = useState<string | null>(null);
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.isOwner) {
          setLabel("Sahip hesabı · kota yok");
          return;
        }
        const q = d.quotas?.aiCalls;
        if (!q) return;
        setLabel(`${q.used}/${q.limit} AI`);
        setWarn(q.remaining <= 5);
      })
      .catch(() => {});
  }, []);

  if (!label) return null;

  return (
    <Link
      href="/pricing"
      className={`text-xs px-2 py-1 rounded border ${
        warn
          ? "border-amber-500/40 text-amber-200"
          : "border-white/10 text-slate-400 hover:text-[#C9A961]"
      }`}
      title="Kota sizin planınıza aittir; diğer kullanıcılar sizin bakiyenizi kullanamaz."
    >
      {label}
    </Link>
  );
}
