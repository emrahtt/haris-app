import { Topbar } from "@/components/shell/topbar";
import { RagSearch } from "@/components/rag/rag-search";

export default function ResearchPage() {
  return (
    <>
      <Topbar title="Araştırma" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="font-serif text-[26px]">İçtihat &amp; Mevzuat Araştırma</h1>
          <span className="text-[10px] bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)] px-2 py-0.5 rounded-xl">
            FAZ 4 — GERÇEK RAG
          </span>
        </div>
        <p className="text-[var(--color-text-2)] text-[13px] mt-1">
          Türk hukuku bilgi tabanında <strong>semantic + lexical hybrid</strong> arama.
          Doğal Türkçe sorularla Yargıtay, AYM, AİHM kararları ve temel mevzuatı tarayın.
        </p>
      </div>
      <RagSearch />
    </>
  );
}
