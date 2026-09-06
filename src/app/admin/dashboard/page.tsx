import { requireAdmin } from "@/lib/admin/auth";
import { getSystemMetrics, listKvkkRequests } from "@/lib/admin/queries";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  Folder,
  FileText,
  Database,
  Shield,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Activity,
  HardDrive,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const metrics = await getSystemMetrics();
  const pendingKvkk = await listKvkkRequests({ status: "received", limit: 100 });

  return (
    <AdminShell admin={admin} pendingKvkkCount={metrics.kvkkPending}>
      <div className="mb-6">
        <h1 className="font-serif text-3xl">Admin Dashboard</h1>
        <p className="text-[var(--color-text-2)] text-[13px] mt-1">
          Sistem genel görünümü ve operasyonel uyarılar
        </p>
      </div>

      {/* Alarm uyarıları */}
      {(metrics.kvkkDeadlineSoon > 0 ||
        metrics.deletionsOverdue > 0 ||
        metrics.kvkkPending > 5) && (
        <Card className="!border-[var(--color-danger)]/40 !bg-[var(--color-danger)]/[0.05] mb-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3 text-[var(--color-danger)]">
            <AlertTriangle size={16} /> Acil Eylem Gerekli
          </h3>
          <div className="space-y-2 text-[13px]">
            {metrics.kvkkDeadlineSoon > 0 && (
              <div className="flex items-center justify-between">
                <span>
                  ⏰ <strong>{metrics.kvkkDeadlineSoon}</strong> KVKK başvurusunun deadline'ı{" "}
                  <strong>7 günden az</strong> kaldı (m.13)
                </span>
                <Link href="/admin/kvkk-requests">
                  <Button variant="danger" size="sm">
                    Görüntüle
                  </Button>
                </Link>
              </div>
            )}
            {metrics.deletionsOverdue > 0 && (
              <div className="flex items-center justify-between">
                <span>
                  🗑 <strong>{metrics.deletionsOverdue}</strong> hesap silme cool-off
                  süresi <strong>dolmuş</strong>
                </span>
                <Link href="/admin/deletions">
                  <Button variant="danger" size="sm">
                    İşle
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Ana metrikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Metric
          icon={Users}
          label="Toplam Kullanıcı"
          value={metrics.totalUsers.toLocaleString("tr-TR")}
          subtitle={`+${metrics.newUsers30d} bu ay`}
          trend="up"
        />
        <Metric
          icon={TrendingUp}
          label="Ödeyen Kullanıcı"
          value={metrics.payingUsers.toLocaleString("tr-TR")}
          subtitle={`%${Math.round((metrics.payingUsers / metrics.totalUsers) * 100)} dönüşüm`}
          trend="up"
        />
        <Metric
          icon={Folder}
          label="Toplam Dava"
          value={metrics.totalCases.toLocaleString("tr-TR")}
          subtitle={`+${metrics.newCases7d} bu hafta`}
        />
        <Metric
          icon={FileText}
          label="Üretilen Dilekçe"
          value={metrics.totalPetitions.toLocaleString("tr-TR")}
        />
        <Metric
          icon={Database}
          label="RAG Korpus"
          value={metrics.totalRagDocuments.toLocaleString("tr-TR")}
          subtitle="emsal karar"
        />
        <Metric
          icon={Activity}
          label="AI İşlem (bu ay)"
          value={metrics.aiCallsThisMonth.toLocaleString("tr-TR")}
        />
        <Metric
          icon={HardDrive}
          label="Depolama"
          value={`${(metrics.totalStorageBytes / 1024 ** 3).toFixed(1)} GB`}
          subtitle={`${metrics.totalDocuments.toLocaleString("tr-TR")} belge`}
        />
        <Metric
          icon={Database}
          label="Scraping (bu ay)"
          value={metrics.scrapingThisMonth.toLocaleString("tr-TR")}
          subtitle="Yargıtay job"
        />
      </div>

      {/* Operasyonel kartlar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Shield size={16} className="text-[var(--color-gold-bright)]" />
            KVKK Başvuruları
          </h3>
          <div className="space-y-2 text-[13px]">
            <Row label="Bekleyen" value={metrics.kvkkPending} color="warn" />
            <Row label="Deadline 7 günden az" value={metrics.kvkkDeadlineSoon} color="danger" />
          </div>
          <Link href="/admin/kvkk-requests">
            <Button variant="ghost" size="sm" className="w-full justify-center mt-3">
              Tümünü Yönet →
            </Button>
          </Link>
        </Card>

        <Card>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Trash2 size={16} className="text-[var(--color-danger)]" />
            Hesap Silme
          </h3>
          <div className="space-y-2 text-[13px]">
            <Row label="Cool-off bekleyen" value={metrics.deletionsPending} color="warn" />
            <Row label="Vadesi dolmuş" value={metrics.deletionsOverdue} color="danger" />
          </div>
          <Link href="/admin/deletions">
            <Button variant="ghost" size="sm" className="w-full justify-center mt-3">
              Kuyruğu Yönet →
            </Button>
          </Link>
        </Card>

        <Card>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Activity size={16} className="text-[var(--color-info)]" />
            Son Aktiviteler
          </h3>
          <p className="text-[12px] text-[var(--color-text-2)] mb-3">
            Audit log akışı (real-time)
          </p>
          <Link href="/admin/audit-logs">
            <Button variant="ghost" size="sm" className="w-full justify-center">
              Loglara Git →
            </Button>
          </Link>
        </Card>
      </div>

      {/* Son KVKK başvuruları önizleme */}
      {pendingKvkk.length > 0 && (
        <Card className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Bekleyen KVKK Başvuruları</h3>
            <Link href="/admin/kvkk-requests" className="text-[12px] text-[var(--color-gold-bright)]">
              Tümü →
            </Link>
          </div>
          <div className="space-y-2">
            {pendingKvkk.slice(0, 5).map((req) => {
              const daysLeft = Math.ceil(
                (new Date(req.deadlineAt).getTime() - Date.now()) / 86400_000
              );
              return (
                <Link
                  key={req.id}
                  href={`/admin/kvkk-requests/${req.id}`}
                  className="flex items-center gap-3 p-2 rounded hover:bg-[var(--color-bg-2)]"
                >
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      daysLeft <= 7
                        ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                        : daysLeft <= 14
                        ? "bg-[var(--color-warn)]/15 text-[var(--color-warn)]"
                        : "bg-[var(--color-info)]/15 text-[var(--color-info)]"
                    }`}
                  >
                    {daysLeft} gün
                  </span>
                  <span className="text-[12px] text-[var(--color-text-3)] font-mono">
                    {req.requestType}
                  </span>
                  <span className="text-[13px] flex-1 truncate">{req.subject}</span>
                  <span className="text-[11px] text-[var(--color-text-3)]">
                    {req.applicantEmail}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </AdminShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="bg-[var(--color-bg-1)] border border-[var(--color-line)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon size={16} className="text-[var(--color-gold-bright)]" />
        {trend === "up" && (
          <span className="text-[10px] text-[var(--color-ok)]">↑</span>
        )}
      </div>
      <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider">
        {label}
      </div>
      <div className="font-serif text-2xl font-bold text-[var(--color-gold-bright)] mt-0.5">
        {value}
      </div>
      {subtitle && (
        <div className="text-[10.5px] text-[var(--color-text-3)] mt-1">{subtitle}</div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "warn" | "danger" | "info";
}) {
  const colorClass = {
    warn: "text-[var(--color-warn)]",
    danger: "text-[var(--color-danger)]",
    info: "text-[var(--color-info)]",
  }[color];

  return (
    <div className="flex justify-between items-center py-1 border-b border-[var(--color-line)] last:border-0">
      <span className="text-[var(--color-text-2)]">{label}</span>
      <span className={`font-semibold ${colorClass}`}>{value}</span>
    </div>
  );
}
