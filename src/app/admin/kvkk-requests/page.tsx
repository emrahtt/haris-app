import { requireAdmin } from "@/lib/admin/auth";
import { getSystemMetrics, listKvkkRequests } from "@/lib/admin/queries";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { KVKK_REQUEST_TYPES } from "@/lib/kvkk/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function KvkkRequestsPage() {
  const admin = await requireAdmin();
  const metrics = await getSystemMetrics();
  const requests = await listKvkkRequests({ limit: 100 });

  const pending = requests.filter((r) =>
    ["received", "in_review"].includes(r.status)
  );
  const completed = requests.filter((r) =>
    ["completed", "rejected", "cancelled"].includes(r.status)
  );

  return (
    <AdminShell admin={admin} pendingKvkkCount={metrics.kvkkPending}>
      <div className="mb-6">
        <h1 className="font-serif text-3xl">KVKK Başvuruları</h1>
        <p className="text-[var(--color-text-2)] text-[13px] mt-1">
          KVKK m.11 ilgili kişi başvuruları — 30 gün içinde yanıt zorunlu (m.13)
        </p>
      </div>

      {/* Statü özetleri */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatPill label="Bekleyen" value={pending.length} color="warn" />
        <StatPill
          label="Deadline yakın"
          value={requests.filter((r) => {
            const days = Math.ceil(
              (new Date(r.deadlineAt).getTime() - Date.now()) / 86400_000
            );
            return ["received", "in_review"].includes(r.status) && days <= 7;
          }).length}
          color="danger"
        />
        <StatPill
          label="Tamamlanan"
          value={requests.filter((r) => r.status === "completed").length}
          color="ok"
        />
        <StatPill label="Toplam" value={requests.length} color="default" />
      </div>

      {/* Bekleyen başvurular */}
      {pending.length > 0 && (
        <Card className="mb-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            ⏰ Bekleyen Başvurular
          </h3>
          <div className="space-y-1.5">
            {pending.map((req) => (
              <RequestRow key={req.id} req={req} />
            ))}
          </div>
        </Card>
      )}

      {/* Geçmiş */}
      {completed.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-3">Geçmiş</h3>
          <div className="space-y-1.5">
            {completed.slice(0, 20).map((req) => (
              <RequestRow key={req.id} req={req} compact />
            ))}
          </div>
        </Card>
      )}

      {requests.length === 0 && (
        <Card className="text-center py-12 text-[var(--color-text-3)]">
          🎉 Henüz KVKK başvurusu yok.
        </Card>
      )}
    </AdminShell>
  );
}

function RequestRow({
  req,
  compact,
}: {
  req: Awaited<ReturnType<typeof listKvkkRequests>>[number];
  compact?: boolean;
}) {
  const daysLeft = Math.ceil(
    (new Date(req.deadlineAt).getTime() - Date.now()) / 86400_000
  );
  const requestLabel = KVKK_REQUEST_TYPES[
    req.requestType as keyof typeof KVKK_REQUEST_TYPES
  ];

  return (
    <Link
      href={`/admin/kvkk-requests/${req.id}`}
      className="grid grid-cols-[80px_1fr_auto_120px] gap-3 items-center p-2.5 rounded-lg hover:bg-[var(--color-bg-2)] border border-transparent hover:border-[var(--color-line)]"
    >
      {!compact ? (
        <span
          className={`text-[11px] px-2 py-1 rounded text-center font-semibold ${
            daysLeft <= 0
              ? "bg-[var(--color-danger)]/20 text-[var(--color-danger)]"
              : daysLeft <= 7
              ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
              : daysLeft <= 14
              ? "bg-[var(--color-warn)]/15 text-[var(--color-warn)]"
              : "bg-[var(--color-info)]/15 text-[var(--color-info)]"
          }`}
        >
          {daysLeft <= 0 ? "VADESI GEÇMİŞ" : `${daysLeft} gün`}
        </span>
      ) : (
        <span
          className={`text-[11px] px-2 py-1 rounded text-center font-medium ${
            req.status === "completed"
              ? "bg-[var(--color-ok)]/15 text-[var(--color-ok)]"
              : "bg-[var(--color-text-3)]/15 text-[var(--color-text-3)]"
          }`}
        >
          {req.status}
        </span>
      )}

      <div className="min-w-0">
        <div className="text-[13.5px] truncate">{req.subject}</div>
        <div className="text-[11px] text-[var(--color-text-3)] mt-0.5">
          <span className="text-[var(--color-gold-bright)]">{requestLabel}</span>
          {" · "}
          {req.applicantName} ({req.applicantEmail})
        </div>
      </div>

      <span className="text-[10.5px] text-[var(--color-text-3)]">
        {new Date(req.createdAt).toLocaleDateString("tr-TR")}
      </span>

      <span className="text-[10.5px] text-[var(--color-text-3)] text-right">
        →
      </span>
    </Link>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "warn" | "danger" | "ok" | "default";
}) {
  const colorClass = {
    warn: "text-[var(--color-warn)]",
    danger: "text-[var(--color-danger)]",
    ok: "text-[var(--color-ok)]",
    default: "text-[var(--color-gold-bright)]",
  }[color];

  return (
    <div className="bg-[var(--color-bg-1)] border border-[var(--color-line)] rounded-lg p-3">
      <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider">
        {label}
      </div>
      <div className={`font-serif text-2xl font-bold mt-1 ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}
