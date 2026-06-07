import { notFound } from "next/navigation";
import { getCaseFromDb as getCase } from "@/lib/data/cases-db";
import { RagSearch } from "@/components/rag/rag-search";

export default async function CaseResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();

  // Dava türüne göre akıllı default sorgu
  const defaultQueries: Record<string, string> = {
    tazminat: "trafik kazası tazminat maluliyet emsal kararlar",
    is: "kıdem tazminatı haklı fesih emsal kararlar",
    aile: "velayet boşanma emsal kararlar",
    ceza: "meşru müdafaa görevi kötüye kullanma emsal",
    ticari: "sözleşme tazmin alacak emsal kararlar",
  };

  const dq = defaultQueries[c.caseType] || c.title.slice(0, 80);

  return (
    <div>
      <div className="mb-4 p-3 bg-[var(--color-info)]/[0.06] border border-[var(--color-info)]/20 rounded-lg text-[12.5px] text-[var(--color-text-2)]">
        💡 Bu dava (<strong>{c.caseType}</strong>) için varsayılan sorgu çalıştırıldı.
        Sorguyu değiştirip ara butonuna basarak farklı emsaller bulabilirsiniz.
      </div>
      <RagSearch defaultQuery={dq} />
    </div>
  );
}
