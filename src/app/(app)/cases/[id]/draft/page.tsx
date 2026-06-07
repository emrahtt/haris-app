import { notFound } from "next/navigation";
import { AIPetitionGenerator } from "@/components/case/ai-petition-generator";
import { getCaseFromDb as getCase } from "@/lib/data/cases-db";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();

  return <AIPetitionGenerator caseItem={c} />;
}
