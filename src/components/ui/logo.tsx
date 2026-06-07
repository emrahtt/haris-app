import { Scale } from "lucide-react";
import { cn } from "@/lib/cn";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizes = {
    sm: { mark: "w-7 h-7", text: "text-base", sub: "text-[8px]" },
    md: { mark: "w-9 h-9", text: "text-[22px]", sub: "text-[9px]" },
    lg: { mark: "w-11 h-11", text: "text-3xl", sub: "text-[10px]" },
  };

  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "rounded-lg flex items-center justify-center flex-shrink-0",
          "bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-soft)]",
          "text-[var(--color-bg-deep)] shadow-[0_4px_12px_rgba(201,169,97,0.3)]",
          s.mark
        )}
      >
        <Scale size={size === "sm" ? 16 : size === "md" ? 20 : 24} strokeWidth={1.6} />
      </div>
      <div
        className={cn(
          "font-serif font-bold tracking-[0.04em]",
          "bg-gradient-to-b from-white to-[var(--color-gold-bright)]",
          "bg-clip-text text-transparent",
          s.text
        )}
      >
        HARIS
        <span
          className={cn(
            "block font-sans tracking-[0.3em] text-[var(--color-text-3)] -mt-0.5",
            s.sub
          )}
        >
          DAVANIN BEKÇİSİ
        </span>
      </div>
    </div>
  );
}
