import Link from "next/link";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseRow } from "@/components/shell/case-row";
import { listCases } from "@/lib/data/cases-db";
import { Plus, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const cases = await listCases();

  const filters = [
    { label: "Tümü", count: cases.length, active: true },
    { label: "Aktif", count: cases.filter((c) => c.status === "active").length },
    { label: "Acil", count: cases.filter((c) => c.status === "urgent").length },
    {
      label: "Beklemede",
      count: cases.filter((c) => c.status === "pending").length,
    },
    {
      label: "Sonuçlanan",
      count: cases.filter((c) => c.status === "closed").length,
    },
  ];

  return (
    <>
      <Topbar title="Davalarım" />

      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-[26px]">Davalarım</h1>
          <p className="text-[var(--color-text-2)] text-[13px] mt-1">
            Toplam {cases.length} dava —{" "}
            {cases.filter((c) => c.status === "active").length} aktif,{" "}
            {cases.filter((c) => c.status === "urgent").length} acil
          </p>
        </div>
        <Link href="/cases/new">
          <Button variant="primary">
            <Plus size={14} /> Yeni Dava
          </Button>
        </Link>
      </div>

      <div className="flex gap-2.5 mb-4 flex-wrap items-center">
        {filters.map((f) => (
          <div
            key={f.label}
            className={`px-3 py-1.5 rounded-2xl border text-xs cursor-pointer transition-all ${
              f.active
                ? "border-[var(--color-gold)] text-[var(--color-gold-bright)] bg-[var(--color-gold)]/[0.08]"
                : "border-[var(--color-line)] bg-[var(--color-bg-1)] text-[var(--color-text-2)] hover:border-[var(--color-gold-soft)]"
            }`}
          >
            {f.label} ({f.count})
          </div>
        ))}
        <div className="ml-auto flex bg-[var(--color-bg-2)] border border-[var(--color-line)] rounded-lg px-3.5 py-2 items-center gap-2.5 min-w-[240px]">
          <Search size={16} className="text-[var(--color-text-3)]" />
          <input
            placeholder="Dava ara..."
            className="bg-transparent border-0 text-[var(--color-text)] text-[13px] outline-none flex-1 placeholder:text-[var(--color-text-3)]"
          />
        </div>
      </div>

      {cases.length === 0 ? (
        <Card className="text-center py-12 text-[var(--color-text-3)]">
          <h3 className="text-[var(--color-text-2)] font-medium mb-2">
            Henüz davanız yok
          </h3>
          <p className="text-[12.5px] max-w-md mx-auto mb-4">
            İlk davanızı oluşturmak için &quot;Yeni Dava&quot; butonuna tıklayın.
          </p>
          <Link href="/cases/new">
            <Button variant="primary">
              <Plus size={14} /> İlk Davanı Oluştur
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="!p-0">
          {cases.map((c) => (
            <CaseRow key={c.id} caseItem={c} detailed />
          ))}
        </Card>
      )}
    </>
  );
}
