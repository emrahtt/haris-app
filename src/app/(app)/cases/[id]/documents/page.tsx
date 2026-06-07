import { notFound } from "next/navigation";
import { getCaseFromDb as getCase } from "@/lib/data/cases-db";
import { DocumentsView } from "@/components/documents/documents-view";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)] px-2 py-0.5 rounded-xl">
          FAZ 5 — GERÇEK DOSYA SİNDİRİMİ
        </span>
        <span className="text-[11.5px] text-[var(--color-text-2)]">
          Yüklediğiniz her belge AI ile otomatik incelenir, sınıflandırılır ve dava
          bağlamına eklenir.
        </span>
      </div>
      <DocumentsView caseId={c.id} />
    </div>
  );
}
