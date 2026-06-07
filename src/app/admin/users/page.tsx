import { requireAdmin } from "@/lib/admin/auth";
import { getSystemMetrics, listUsers } from "@/lib/admin/queries";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdmin();
  const metrics = await getSystemMetrics();
  const users = await listUsers({ limit: 100 });

  return (
    <AdminShell admin={admin} pendingKvkkCount={metrics.kvkkPending}>
      <div className="mb-6">
        <h1 className="font-serif text-3xl">Kullanıcılar</h1>
        <p className="text-[var(--color-text-2)] text-[13px] mt-1">
          Toplam {users.length} kullanıcı listeleniyor.
        </p>
      </div>

      <Card>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                Ad Soyad
              </th>
              <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                Büro
              </th>
              <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                Plan
              </th>
              <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                Rol
              </th>
              <th className="text-left py-2 px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-text-3)]">
                Kayıt
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-[var(--color-line)] hover:bg-[var(--color-bg-2)]"
              >
                <td className="py-2.5 px-2 text-[13px]">{u.fullName}</td>
                <td className="py-2.5 px-2 text-[var(--color-text-2)]">
                  {u.firmName || "—"}
                </td>
                <td className="py-2.5 px-2">
                  <span
                    className={`text-[10.5px] px-2 py-0.5 rounded-full ${
                      u.plan === "pro" || u.plan === "enterprise"
                        ? "bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)]"
                        : u.plan === "starter"
                        ? "bg-[var(--color-info)]/15 text-[var(--color-info)]"
                        : "bg-[var(--color-bg-3)] text-[var(--color-text-3)]"
                    }`}
                  >
                    {u.plan}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  {u.isAdmin ? (
                    <span className="text-[10.5px] bg-[var(--color-danger)]/15 text-[var(--color-danger)] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                      <Shield size={9} />
                      {u.adminRole || "admin"}
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-[var(--color-text-3)]">user</span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-[11px] text-[var(--color-text-3)]">
                  {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 text-[11.5px] text-[var(--color-text-3)] text-center">
        Kullanıcıya tıklama, profil görüntüleme ve admin yetki yönetimi Faz 11&apos;de
        eklenecek.
      </div>
    </AdminShell>
  );
}
