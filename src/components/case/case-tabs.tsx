"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Brain,
  Sparkles,
  Search,
  Shield,
  Calendar,
  User,
  type LucideIcon,
} from "lucide-react";

interface Tab {
  slug: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const TABS: Tab[] = [
  { slug: "overview", label: "Genel Bakış", icon: Home },
  { slug: "documents", label: "Belgeler", icon: FileText, badge: "47" },
  { slug: "analysis", label: "Derin Analiz", icon: Brain, badge: "AI" },
  { slug: "draft", label: "Dilekçe Üret", icon: Sparkles },
  { slug: "research", label: "İçtihat", icon: Search },
  { slug: "strategy", label: "Strateji", icon: Shield },
  { slug: "timeline", label: "Süreler", icon: Calendar },
  { slug: "portal", label: "Müvekkil Portalı", icon: User },
];

export function CaseTabs({ caseId }: { caseId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 mb-5.5 border-b border-[var(--color-line)] overflow-x-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const href = `/cases/${caseId}/${tab.slug}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`px-4.5 py-3 text-[13px] border-b-2 cursor-pointer whitespace-nowrap transition-all flex items-center gap-2 ${
              isActive
                ? "text-[var(--color-gold-bright)] border-[var(--color-gold)]"
                : "text-[var(--color-text-2)] border-transparent hover:text-[var(--color-text)]"
            }`}
          >
            <Icon size={14} />
            {tab.label}
            {tab.badge && (
              <span
                className={`text-[10px] px-1.5 py-px rounded-xl ${
                  isActive
                    ? "bg-[var(--color-gold)]/20 text-[var(--color-gold-bright)]"
                    : "bg-[var(--color-bg-3)] text-[var(--color-text-2)]"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
