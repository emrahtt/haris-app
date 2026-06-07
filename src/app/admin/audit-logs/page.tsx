import { requireAdmin } from "@/lib/admin/auth";
import { getSystemMetrics, listAuditLogs } from "@/lib/admin/queries";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const admin = await requireAdmin();
  const metrics = await getSystemMetrics();
  const logs = await listAuditLogs({ limit: 200 });

  return (
    <AdminShell admin={admin} pendingKvkkCount={metrics.kvkkPending}>
      <div className="mb-6">
        <h1 className="font-serif text-3xl">Audit Logları</h1>
        <p className="text-[var(--color-text-2)] text-[13px] mt-1">
          KVKK m.12 yükümlülüğü — tüm kullanıcı eylemleri kayıt altında.
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--color-line)]">
                <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                  Zaman
                </th>
                <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                  Kullanıcı
                </th>
                <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                  Eylem
                </th>
                <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                  Kaynak
                </th>
                <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                  IP
                </th>
                <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                  Detay
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[var(--color-line)] hover:bg-[var(--color-bg-2)]"
                >
                  <td className="py-2 px-2 text-[11.5px] text-[var(--color-text-3)] whitespace-nowrap font-mono">
                    {new Date(log.createdAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="py-2 px-2 text-[11.5px] font-mono">
                    {log.userId?.slice(0, 8) || "—"}
                  </td>
                  <td className="py-2 px-2">
                    <code className="text-[var(--color-gold-bright)]">{log.action}</code>
                  </td>
                  <td className="py-2 px-2 text-[var(--color-text-2)]">
                    {log.resourceType ? `${log.resourceType}/${log.resourceId?.slice(0, 8) || "—"}` : "—"}
                  </td>
                  <td className="py-2 px-2 text-[11px] font-mono text-[var(--color-text-3)]">
                    {log.ipAddress || "—"}
                  </td>
                  <td className="py-2 px-2 text-[11px] text-[var(--color-text-3)] max-w-xs truncate">
                    {Object.keys(log.metadata).length > 0
                      ? JSON.stringify(log.metadata).slice(0, 60)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-3)]">
            Henüz audit log yok.
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
