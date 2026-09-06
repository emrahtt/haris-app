import { notFound } from "next/navigation";
import { Topbar } from "@/components/shell/topbar";
import { Breadcrumb } from "@/components/shell/breadcrumb";
import { CaseHeader } from "@/components/case/case-header";
import { CaseTabs } from "@/components/case/case-tabs";
import { getCaseFromDb } from "@/lib/data/cases-db";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function CaseLayout({ children, params }: Props) {
  const { id } = await params;
  const caseItem = await getCaseFromDb(id);

  if (!caseItem) notFound();

  return (
    <>
      <Topbar
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Ana", href: "/dashboard" },
              { label: "Davalar", href: "/cases" },
              { label: caseItem.id },
            ]}
          />
        }
      />
      <CaseHeader caseItem={caseItem} />
      <CaseTabs caseId={caseItem.id} />
      {children}
    </>
  );
}
