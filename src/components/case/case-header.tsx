"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import type { LegalCase } from "@/lib/data/types";
import {
  Car,
  Briefcase,
  Gavel,
  Building2,
  Users,
  Landmark,
  Folder,
  FileText,
  Brain,
  Sparkles,
  Share2,
  Download,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Car,
  Briefcase,
  Gavel,
  Building2,
  Users,
  Landmark,
  Folder,
};

export function CaseHeader({ caseItem }: { caseItem: LegalCase }) {
  const toast = useToast();
  const Icon = ICONS[caseItem.icon] || Folder;
  const variant =
    caseItem.status === "urgent"
      ? "urgent"
      : caseItem.status === "active"
      ? "active"
      : caseItem.status === "pending"
      ? "pending"
      : "closed";

  return (
    <div className="bg-gradient-to-br from-[var(--color-bg-1)] to-[var(--color-bg-2)] border border-[var(--color-line)] rounded-[18px] p-6 mb-5 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute top-0 right-0 w-52 h-52"
        style={{
          background:
            "radial-gradient(circle, rgba(201,169,97,0.08), transparent 70%)",
        }}
      />

      <div className="flex items-center gap-3.5 mb-3 flex-wrap relative">
        <div className="w-12 h-12 rounded-lg bg-[var(--color-gold)]/[0.12] text-[var(--color-gold-bright)] flex items-center justify-center">
          <Icon size={22} strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-serif">{caseItem.title}</h1>
          <div className="flex gap-4.5 flex-wrap text-[var(--color-text-2)] text-[12.5px] mt-2">
            <span className="flex items-center gap-1.5">
              <Briefcase size={14} /> {caseItem.id}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 size={14} /> {caseItem.court}
            </span>
            <span className="flex items-center gap-1.5">
              <FileText size={14} /> {caseItem.esasNo}
            </span>
          </div>
        </div>
        <Pill variant={variant} className="!text-xs !py-1 !px-3">
          {caseItem.statusLabel}
        </Pill>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4.5 mt-4.5 text-[13px] text-[var(--color-text-2)]">
        <div>
          <div className="text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.08em] mb-1">
            Müvekkil
          </div>
          <strong className="text-[var(--color-text)]">{caseItem.client}</strong>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.08em] mb-1">
            Karşı Taraf
          </div>
          <strong className="text-[var(--color-text)]">{caseItem.opponent}</strong>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.08em] mb-1">
            Sıradaki
          </div>
          <strong className="text-[var(--color-text)]">{caseItem.nextEvent}</strong>{" "}
          <span
            className={
              caseItem.daysLeft <= 7
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-warn)]"
            }
          >
            ({caseItem.daysLeft} gün)
          </span>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.08em] mb-1">
            AI Başarı Tahmini
          </div>
          <strong className="text-[var(--color-gold-bright)] font-serif text-lg">
            %{caseItem.successProb}
          </strong>
        </div>
      </div>

      <div className="flex gap-2.5 mt-4.5 flex-wrap relative z-10">
        <Link href={`/cases/${caseItem.id}/draft`}>
          <Button variant="primary">
            <Sparkles size={14} /> Dilekçe Üret
          </Button>
        </Link>
        <Link href={`/cases/${caseItem.id}/analysis`}>
          <Button variant="ghost">
            <Brain size={14} /> Derin Analiz
          </Button>
        </Link>
        <Button
          variant="ghost"
          onClick={() => toast("Dava paylaşım linki kopyalandı")}
        >
          <Share2 size={14} /> Paylaş
        </Button>
        <Button variant="ghost" onClick={() => toast("PDF olarak indiriliyor...")}>
          <Download size={14} /> Rapor İndir
        </Button>
      </div>
    </div>
  );
}
