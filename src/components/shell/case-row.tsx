"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/pill";
import type { LegalCase } from "@/lib/data/types";
import {
  Car,
  Briefcase,
  Gavel,
  Building2,
  Users,
  Landmark,
  Folder,
  ArrowRight,
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

export function CaseRow({
  caseItem,
  detailed = false,
}: {
  caseItem: LegalCase;
  detailed?: boolean;
}) {
  const Icon = ICONS[caseItem.icon] || Folder;
  const variant =
    caseItem.status === "urgent"
      ? "urgent"
      : caseItem.status === "active"
      ? "active"
      : caseItem.status === "pending"
      ? "pending"
      : "closed";

  const dayColor =
    caseItem.daysLeft <= 7 && caseItem.daysLeft > 0
      ? "text-[var(--color-danger)]"
      : caseItem.daysLeft <= 14 && caseItem.daysLeft > 0
      ? "text-[var(--color-warn)]"
      : "text-[var(--color-text)]";

  return (
    <Link
      href={`/cases/${caseItem.id}/overview`}
      className={`grid gap-4 items-center border-b border-[var(--color-line)] last:border-0 cursor-pointer group ${
        detailed
          ? "grid-cols-[44px_1fr_auto_auto_auto] py-4 px-5.5"
          : "grid-cols-[36px_1fr_auto_auto_auto] py-3.5"
      }`}
    >
      <div
        className={`rounded-lg bg-[var(--color-gold)]/[0.08] text-[var(--color-gold-bright)] flex items-center justify-center ${
          detailed ? "w-11 h-11" : "w-9 h-9"
        }`}
      >
        <Icon size={detailed ? 22 : 18} strokeWidth={1.6} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className={`font-medium group-hover:text-[var(--color-gold-bright)] transition-colors truncate ${
              detailed ? "text-[14.5px]" : "text-[13.5px]"
            }`}
          >
            {caseItem.title}
          </div>
          {caseItem.aiAnalyzed && detailed && (
            <span className="text-[10px] bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)] px-1.5 py-0.5 rounded-xl whitespace-nowrap">
              AI ANALİZLİ
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-[var(--color-text-3)] truncate">
          {detailed && <strong>{caseItem.id} • </strong>}
          {caseItem.court} • {caseItem.esasNo} • {caseItem.docs} belge
          {detailed && ` • ${caseItem.type}`}
        </div>
        {detailed && (
          <div className="mt-1.5 text-[11.5px] text-[var(--color-text-2)] truncate">
            <strong>Müvekkil:</strong> {caseItem.client} &nbsp;{" "}
            <strong>Karşı Taraf:</strong> {caseItem.opponent}
          </div>
        )}
      </div>

      <Pill variant={variant}>{caseItem.statusLabel}</Pill>

      <div className="text-right">
        {caseItem.daysLeft > 0 ? (
          <div
            className={`font-semibold ${dayColor} ${
              detailed ? "font-serif text-lg" : "text-xs"
            }`}
          >
            {caseItem.daysLeft} {detailed && "gün"}
          </div>
        ) : (
          <div className="text-[var(--color-text-3)]">—</div>
        )}
        <div className="text-[11px] text-[var(--color-text-3)] max-w-[140px] truncate">
          {caseItem.nextEvent}
        </div>
      </div>

      <ArrowRight size={14} className="text-[var(--color-text-3)]" />
    </Link>
  );
}
