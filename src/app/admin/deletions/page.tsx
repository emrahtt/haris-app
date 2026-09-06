import { requireAdmin } from "@/lib/admin/auth";
import {
  getSystemMetrics,
  listDeletionRequests,
} from "@/lib/admin/queries";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { DeletionActions } from "@/components/admin/deletion-actions";

export const dynamic = "force-dynamic";

export default async function DeletionsPage() {
  const admin = await requireAdmin();
  const metrics = await getSystemMetrics();
  const pendings = await listDeletionRequests({ status: "pending" });

  const overdue = pendings.filter(
    (p) => new Date(p.scheduledDeletionAt) <= new Date()
  );
  const upcoming = pendings.filter(
    (p) => new Date(p.scheduledDeletionAt) > new Date()
  );

  return (
    <AdminShell admin={admin} pendingKvkkCount={metrics.kvkkPending}>
      <div className="mb-6">
        <h1 className="font-serif text-3xl">Hesap Silme Kuyruğu</h1>
        <p className="text-[var(--color-text-2)] text-[13px] mt-1">
          KVKK m.7 — Unutulma Hakkı. 30 gün cool-off sonrası kullanıcı vazgeçmediyse silinir.
        </p>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <Card className="!border-[var(--color-danger)]/40 !bg-[var(--color-danger)]/[0.05] mb-5">
          <h3 className="font-semibold text-[var(--color-danger)] mb-3">
            ⏰ Vadesi Geçmiş ({overdue.length}) — Silme bekliyor
          </h3>
          <div className="space-y-2">
            {overdue.map((d) => (
              <DeletionRow key={d.id} request={d} actionable />
            ))}
          </div>
        </Card>
      )}

      {/* Upcoming */}
      <Card>
        <h3 className="font-semibold mb-3">
          Bekleyen ({upcoming.length}) — Cool-off sürüyor
        </h3>
        {upcoming.length === 0 ? (
          <div className="text-center py-10 text-[var(--color-text-3)] text-[13px]">
            Bekleyen silme talebi yok.
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((d) => (
              <DeletionRow key={d.id} request={d} />
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 text-[11.5px] text-[var(--color-text-3)] text-center">
        <code>cron schedule: 0 4 * * *</code> — Her gün UTC 04:00, vadesi dolan talepleri
        otomatik işler. Manuel "Hemen Sil" override mümkündür.
      </div>
    </AdminShell>
  );
}

function DeletionRow({
  request,
  actionable,
}: {
  request: Awaited<ReturnType<typeof listDeletionRequests>>[number];
  actionable?: boolean;
}) {
  const scheduled = new Date(request.scheduledDeletionAt);
  const daysLeft = Math.ceil((scheduled.getTime() - Date.now()) / 86400_000);

  return (
    <div className="grid grid-cols-[100px_1fr_120px_auto] gap-3 items-center p-3 rounded-lg bg-[var(--color-bg-2)] border border-[var(--color-line)]">
      <span
        className={`text-[11px] px-2 py-1 rounded text-center font-semibold ${
          daysLeft <= 0
            ? "bg-[var(--color-danger)]/20 text-[var(--color-danger)]"
            : daysLeft <= 5
            ? "bg-[var(--color-warn)]/15 text-[var(--color-warn)]"
            : "bg-[var(--color-info)]/15 text-[var(--color-info)]"
        }`}
      >
        {daysLeft <= 0 ? "BUGÜN" : `${daysLeft} gün`}
      </span>

      <div className="min-w-0">
        <div className="text-[13px] truncate">
          {request.userName || "Kullanıcı"}
          {request.userEmail && (
            <span className="text-[11px] text-[var(--color-text-3)] ml-2">
              {request.userEmail}
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--color-text-3)] mt-0.5">
          <code className="text-[var(--color-gold-bright)]">{request.retentionChoice}</code>
          {request.reason && ` · "${request.reason}"`}
        </div>
      </div>

      <div className="text-[11px] text-[var(--color-text-3)]">
        {scheduled.toLocaleDateString("tr-TR")}
      </div>

      {actionable && (
        <DeletionActions requestId={request.id} />
      )}
    </div>
  );
}
