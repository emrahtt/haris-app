import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getKvkkRequest, getSystemMetrics } from "@/lib/admin/queries";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { KvkkResponder } from "@/components/admin/kvkk-responder";
import { KVKK_REQUEST_TYPES } from "@/lib/kvkk/constants";

export const dynamic = "force-dynamic";

export default async function KvkkRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin();
  const req = await getKvkkRequest(id);
  if (!req) notFound();

  const metrics = await getSystemMetrics();
  const daysLeft = Math.ceil(
    (new Date(req.deadlineAt).getTime() - Date.now()) / 86400_000
  );
  const isOverdue = daysLeft <= 0;

  return (
    <AdminShell admin={admin} pendingKvkkCount={metrics.kvkkPending}>
      <div className="mb-6">
        <Link
          href="/admin/kvkk-requests"
          className="text-[var(--color-text-2)] text-[13px] hover:text-[var(--color-gold-bright)]"
        >
          ← Tüm başvurular
        </Link>
        <h1 className="font-serif text-2xl mt-2">KVKK Başvurusu</h1>
        <code className="text-[11px] text-[var(--color-text-3)]">{req.id}</code>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
              <Field label="Başvuran Adı" value={req.applicantName} />
              <Field label="E-posta" value={req.applicantEmail} mono />
              <Field
                label="Talep Türü"
                value={KVKK_REQUEST_TYPES[req.requestType as keyof typeof KVKK_REQUEST_TYPES]}
              />
              <Field
                label="Başvuru Tarihi"
                value={new Date(req.createdAt).toLocaleString("tr-TR")}
              />
              <Field
                label="Deadline (m.13 — 30 gün)"
                value={`${new Date(req.deadlineAt).toLocaleDateString("tr-TR")} (${
                  daysLeft > 0 ? `${daysLeft} gün kaldı` : "VADESI GEÇMİŞ"
                })`}
                danger={isOverdue}
              />
              <Field label="IP Adresi" value={req.ipAddress || "—"} mono />
            </div>

            <hr className="my-4 border-[var(--color-line)]" />

            <Field label="Konu" value={req.subject} />

            <div className="mt-4">
              <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider mb-1.5">
                Talep Detayı
              </div>
              <p className="text-[13.5px] text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                {req.description}
              </p>
            </div>
          </Card>

          {req.response && (
            <Card>
              <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider mb-1.5">
                Verilen Yanıt
              </div>
              <p className="text-[13.5px] text-[var(--color-text)] leading-relaxed whitespace-pre-wrap mb-3">
                {req.response}
              </p>
              <div className="text-[11px] text-[var(--color-text-3)]">
                {req.respondedAt &&
                  `Yanıtlandı: ${new Date(req.respondedAt).toLocaleString("tr-TR")}`}
              </div>
            </Card>
          )}

          {/* Yanıt formu */}
          {!req.response && (
            <KvkkResponder requestId={req.id} currentStatus={req.status} />
          )}
        </div>

        {/* Sağ panel: Durum + Aksiyon */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-[14px] mb-3">Durum</h3>
            <span
              className={`inline-block text-[11px] px-3 py-1 rounded-full ${
                req.status === "completed"
                  ? "bg-[var(--color-ok)]/15 text-[var(--color-ok)]"
                  : req.status === "in_review"
                  ? "bg-[var(--color-info)]/15 text-[var(--color-info)]"
                  : req.status === "rejected"
                  ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                  : "bg-[var(--color-warn)]/15 text-[var(--color-warn)]"
              }`}
            >
              {req.status}
            </span>
          </Card>

          <Card>
            <h3 className="font-semibold text-[14px] mb-2">Hukuki Çerçeve</h3>
            <ul className="text-[12px] text-[var(--color-text-2)] space-y-1.5">
              <li>
                • <strong>KVKK m.11/{requestArticle(req.requestType)}</strong> ile başvuru yapıldı
              </li>
              <li>
                • <strong>m.13</strong>: 30 gün içinde ücretsiz yanıt zorunlu
              </li>
              <li>
                • Yetersiz yanıtta İlgili Kişi <strong>KVKK Kurulu'na</strong> şikayet edebilir
              </li>
              <li>
                • İhlal halinde idari para cezası (m.18 — 25.000 ₺&apos;den 1.000.000 ₺&apos;ye)
              </li>
            </ul>
          </Card>

          <Card>
            <h3 className="font-semibold text-[14px] mb-2">Audit</h3>
            <div className="text-[11.5px] text-[var(--color-text-2)] space-y-1">
              <div>Oluşturma: {new Date(req.createdAt).toLocaleString("tr-TR")}</div>
              {req.ipAddress && <div>IP: {req.ipAddress}</div>}
              <div className="text-[10.5px] text-[var(--color-text-3)] pt-2">
                Bu sayfaya erişim audit_logs'a kaydedilir.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  mono,
  danger,
}: {
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`text-[13px] ${mono ? "font-mono" : ""} ${
          danger ? "text-[var(--color-danger)] font-semibold" : "text-[var(--color-text)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function requestArticle(type: string): string {
  const map: Record<string, string> = {
    access: "a",
    information: "b",
    transfer_info: "c",
    correction: "d",
    deletion: "e",
    portability: "d",
    objection: "g",
    damage_compensation: "h",
  };
  return map[type] || "?";
}
