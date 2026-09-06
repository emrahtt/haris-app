import type { Deadline } from "@/lib/data/types";
import { cn } from "@/lib/cn";

export function DeadlineCard({ d }: { d: Deadline }) {
  const isUrgent = d.level === "urgent";
  const isWarn = d.level === "warn";

  return (
    <div
      className={cn(
        "grid grid-cols-[60px_1fr_auto] gap-3.5 items-center p-3.5 rounded-lg border mb-2",
        "bg-[var(--color-bg-1)] border-[var(--color-line)]",
        isUrgent && "border-[var(--color-danger)]/40 bg-[var(--color-danger)]/[0.04]",
        isWarn && "border-[var(--color-warn)]/30"
      )}
    >
      <div className="text-center p-2 bg-[var(--color-bg-2)] rounded-lg">
        <div className="font-serif text-[22px] font-bold text-[var(--color-gold-bright)] leading-none">
          {d.date}
        </div>
        <div className="text-[10px] text-[var(--color-text-3)] uppercase tracking-[0.1em] mt-0.5">
          {d.mon}
        </div>
      </div>
      <div>
        <div className="text-[13.5px] font-medium">{d.title}</div>
        <div className="text-[11.5px] text-[var(--color-text-2)] mt-0.5">{d.sub}</div>
      </div>
      <div
        className={cn(
          "font-serif text-[28px] font-bold",
          isUrgent
            ? "text-[var(--color-danger)]"
            : isWarn
            ? "text-[var(--color-warn)]"
            : "text-[var(--color-text)]"
        )}
      >
        {d.days}
        <span className="text-xs text-[var(--color-text-3)] font-sans">gün</span>
      </div>
    </div>
  );
}
