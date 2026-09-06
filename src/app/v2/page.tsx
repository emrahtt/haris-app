/**
 * HARIS v2 — Landing / Workspace listesi
 * Sprint 11.2: Gerçek API'dan veri çeker.
 */

import Link from "next/link";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { listWorkspaces } from "@/lib/v2/workspace/db";
import { isDemoMode } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function formatRelativeTr(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
}

export default async function V2Home() {
  const userId = await getCurrentUserId();
  const workspaces = await listWorkspaces(userId);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1
          className="text-4xl font-bold mb-3"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Matter Workspace
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl">
          Her dava bir <em>workspace</em>. 12 uzman AI ajan, Orkestra Şefi
          koordinasyonunda, sizinle birlikte çalışır.
        </p>
        <Link
          href="/v2/analytics"
          className="inline-block mt-3 text-sm text-[#C9A961] hover:underline"
        >
          Maliyet ve ajan paneli →
        </Link>
      </div>

      <Link
        href="/v2/workspaces/new"
        className="block mb-8 p-8 rounded-2xl border-2 border-dashed border-[#C9A961]/30 hover:border-[#C9A961] hover:bg-[#C9A961]/5 transition group"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: "linear-gradient(135deg, #C9A961, #8a7340)" }}
          >
            ✨
          </div>
          <div>
            <div className="text-xl font-semibold text-[#C9A961] group-hover:text-[#e6c479]">
              Yeni Dava Dosyası Aç
            </div>
            <div className="text-sm text-slate-400 mt-1">
              Belgelerinizi sürükleyin, Orkestra Şefi karşılasın.
            </div>
          </div>
        </div>
      </Link>

      <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-4">
        Aktif Dava Dosyaları ({workspaces.length})
      </h2>

      {workspaces.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Henüz workspace yok. Yukarıdaki butona basıp ilk davanızı oluşturun.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((w) => (
            <Link
              key={w.id}
              href={`/v2/workspaces/${w.id}`}
              className="block p-6 rounded-xl border border-white/10 hover:border-[#C9A961]/40 hover:bg-white/[0.02] transition"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-100">{w.title}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    w.status === "active"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/30"
                  }`}
                >
                  {w.status === "active"
                    ? "Aktif"
                    : w.status === "completed"
                    ? "Tamamlandı"
                    : "Taslak"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {w.case_type && <span>{w.case_type}</span>}
                {w.current_round > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-[#C9A961]">
                      TUR {w.current_round}/3
                    </span>
                  </>
                )}
                {w.total_cost_usd > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-slate-500">
                      ${w.total_cost_usd.toFixed(3)}
                    </span>
                  </>
                )}
                <span className="ml-auto">
                  {formatRelativeTr(w.updated_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isDemoMode && (
        <div className="mt-12 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-200/80">
          <strong className="text-amber-300">Demo modu aktif:</strong> Supabase
          env değişkenleri tanımlı değil, in-memory mock data gösteriliyor.
          Production için .env.local + Vercel env ayarlanmalı.
        </div>
      )}
    </div>
  );
}
