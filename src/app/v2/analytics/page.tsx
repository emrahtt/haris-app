import Link from "next/link";
import { getCurrentUserId } from "@/lib/v2/workspace/auth";
import { getUserAnalytics } from "@/lib/v2/analytics/stats";
import { assertWithinBudget } from "@/lib/v2/billing/quota";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const userId = await getCurrentUserId();
  const s = await getUserAnalytics(userId);
  const budget = await assertWithinBudget(userId);
  const maxCost = Math.max(...s.byAgent.map((a) => a.cost), 0.0001);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-[#C9A961]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Maliyet & Ajan Paneli
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sizin dosyalarınızdaki token, maliyet ve orkestra özeti. Canvas
            hatası çözülene kadar buradan da tur ilerlemesini görebilirsiniz.
          </p>
        </div>
        <Link href="/v2" className="text-xs text-slate-400 hover:text-[#C9A961]">
          ← Matter listesi
        </Link>
      </div>

      {budget.used / budget.limit > 0.7 && (
        <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-100">
          Aylık kota: ${budget.used.toFixed(2)} / ${budget.limit}.{" "}
          {budget.ok
            ? "Limit yaklaştı."
            : "Kota doldu — orkestra yeni iş başlatmaz."}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Dosya" value={String(s.workspaceCount)} />
        <Stat
          label="Toplam maliyet"
          value={`$${s.totalCost.toFixed(3)}`}
          gold
        />
        <Stat
          label="Token (giriş / çıkış)"
          value={`${fmt(s.totalTokensIn)} / ${fmt(s.totalTokensOut)}`}
        />
        <Stat
          label="Tamamlanan orkestra"
          value={`${s.completedCount}${s.runningCount ? ` · ${s.runningCount} çalışıyor` : ""}`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">
            Ajan maliyeti
          </h2>
          {s.byAgent.length === 0 ? (
            <p className="text-sm text-slate-500">
              Henüz ajan çalışmamış. Matter’da işlemi başlatın.
            </p>
          ) : (
            <ul className="space-y-2">
              {s.byAgent.map((a) => (
                <li key={a.agentId}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-200">{a.label}</span>
                    <span className="text-[#C9A961]">
                      ${a.cost.toFixed(4)} · {a.runs} tur
                    </span>
                  </div>
                  <div className="h-1.5 rounded bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-[#C9A961]"
                      style={{ width: `${Math.max(4, (a.cost / maxCost) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {fmt(a.tokensIn)} in / {fmt(a.tokensOut)} out
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">
            Dosya bazında
          </h2>
          {s.byWorkspace.length === 0 ? (
            <p className="text-sm text-slate-500">Dosya yok.</p>
          ) : (
            <ul className="space-y-2">
              {s.byWorkspace.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/v2/workspaces/${w.id}`}
                    className="block rounded-lg border border-white/5 hover:border-[#C9A961]/40 px-3 py-2"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-slate-100 truncate">
                        {w.title}
                      </span>
                      <span className="text-xs text-[#C9A961] shrink-0">
                        ${w.cost.toFixed(3)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {w.status} · TUR {w.round}/3 · {fmt(w.tokensIn + w.tokensOut)} token
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  gold,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-semibold ${gold ? "text-[#C9A961]" : "text-slate-100"}`}
      >
        {value}
      </div>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
