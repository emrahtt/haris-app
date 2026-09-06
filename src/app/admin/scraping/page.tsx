import { requireAdmin } from "@/lib/admin/auth";
import { getSystemMetrics } from "@/lib/admin/queries";
import { AdminShell } from "@/components/admin/admin-shell";
import { ScrapingConsole } from "@/components/scraping/scraping-console";

export const dynamic = "force-dynamic";

export default async function AdminScrapingPage() {
  const admin = await requireAdmin();
  const metrics = await getSystemMetrics();

  return (
    <AdminShell admin={admin} pendingKvkkCount={metrics.kvkkPending}>
      <div className="mb-6">
        <h1 className="font-serif text-3xl">Yargıtay Scraping</h1>
        <p className="text-[var(--color-text-2)] text-[13px] mt-1">
          Korpus genişletme — Bedesten API üzerinden Yargıtay/Danıştay kararları
        </p>
      </div>
      <ScrapingConsole />
    </AdminShell>
  );
}
