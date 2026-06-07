import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "active" | "pending" | "urgent" | "closed" | "info" | "gold";
}

export function Pill({ className, variant = "active", ...props }: PillProps) {
  const variants = {
    active: "bg-[var(--color-ok)]/12 text-[var(--color-ok)]",
    pending: "bg-[var(--color-warn)]/12 text-[var(--color-warn)]",
    urgent: "bg-[var(--color-danger)]/12 text-[var(--color-danger)]",
    closed: "bg-[var(--color-text-3)]/12 text-[var(--color-text-3)]",
    info: "bg-[var(--color-info)]/15 text-[var(--color-info)]",
    gold: "bg-[var(--color-gold)]/15 text-[var(--color-gold-bright)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[11px] font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
