"use client";

import { useRouter } from "next/navigation";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast-provider";
import { AIStatusBadge } from "@/components/shell/ai-status-badge";
import { Search, Bell, Users } from "lucide-react";

interface TopbarProps {
  title?: string;
  breadcrumb?: React.ReactNode;
}

export function Topbar({ title, breadcrumb }: TopbarProps) {
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        {breadcrumb || <h1 className="text-[22px] font-sans font-semibold">{title}</h1>}
      </div>
      <div className="flex items-center gap-2.5">
        <AIStatusBadge />
        <div className="hidden lg:flex bg-[var(--color-bg-2)] border border-[var(--color-line)] rounded-lg px-3.5 py-2 items-center gap-2.5 min-w-[240px]">
          <Search size={16} className="text-[var(--color-text-3)]" />
          <input
            placeholder="Davalarda, içtihatlarda ara..."
            className="bg-transparent border-0 text-[var(--color-text)] text-[13px] outline-none flex-1 placeholder:text-[var(--color-text-3)]"
          />
        </div>
        <IconButton
          hasDot
          onClick={() => toast("3 yeni bildirim: 1 acil, 2 normal")}
          title="Bildirimler"
        >
          <Bell size={18} strokeWidth={1.6} />
        </IconButton>
        <IconButton onClick={() => router.push("/agents")} title="AI Ajan Paneli">
          <Users size={16} strokeWidth={1.8} />
        </IconButton>
      </div>
    </div>
  );
}
