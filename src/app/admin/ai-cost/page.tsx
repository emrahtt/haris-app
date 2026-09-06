import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function AdminAiCostPage() {
  const admin = await requireAdmin();
  let rows: Array<{
    user_id: string;
    cost: number;
    tokens_in: number;
    tokens_out: number;
    runs: number;
  }> = [];

  if (!isDemoMode) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from("agent_runs")
        .select("user_id, cost_usd, tokens_input, tokens_output");
      const map = new Map<string, (typeof rows)[0]>();
      for (const r of data ?? []) {
        const prev = map.get(r.user_id as string) ?? {
          user_id: r.user_id as string,
          cost: 0,
          tokens_in: 0,
          tokens_out: 0,
          runs: 0,
        };
        prev.cost += Number(r.cost_usd ?? 0);
        prev.tokens_in += Number(r.tokens_input ?? 0);
        prev.tokens_out += Number(r.tokens_output ?? 0);
        prev.runs += 1;
        map.set(r.user_id as string, prev);
      }
      rows = [...map.values()].sort((a, b) => b.cost - a.cost);
    }
  } else {
    rows = [
      {
        user_id: "demo",
        cost: 12.4,
        tokens_in: 800000,
        tokens_out: 210000,
        runs: 48,
      },
    ];
  }

  const total = rows.reduce((s, r) => s + r.cost, 0);

  return (
    <AdminShell admin={admin}>
      <h1 className="font-serif text-3xl mb-2">AI Maliyet (tüm kullanıcılar)</h1>
      <p className="text-[var(--color-text-2)] text-sm mb-6">
        Toplam: ${total.toFixed(2)} · {rows.length} kullanıcı
      </p>
      <div className="overflow-x-auto border border-[var(--color-line)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-[var(--color-text-3)]">
            <tr>
              <th className="p-3">Kullanıcı</th>
              <th className="p-3">Maliyet</th>
              <th className="p-3">Token</th>
              <th className="p-3">Ajan turu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className="border-t border-[var(--color-line)]">
                <td className="p-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                <td className="p-3 text-[var(--color-gold-bright)]">
                  ${r.cost.toFixed(3)}
                </td>
                <td className="p-3">
                  {r.tokens_in.toLocaleString("tr-TR")} /{" "}
                  {r.tokens_out.toLocaleString("tr-TR")}
                </td>
                <td className="p-3">{r.runs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
