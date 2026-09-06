import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  hasDot?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, hasDot, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative w-9 h-9 rounded-lg border border-[var(--color-line)]",
          "bg-[var(--color-bg-2)] flex items-center justify-center",
          "text-[var(--color-text-2)] cursor-pointer transition-all",
          "hover:border-[var(--color-gold-soft)] hover:text-[var(--color-gold-bright)]",
          className
        )}
        {...props}
      >
        {children}
        {hasDot && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] shadow-[0_0_6px_var(--color-gold)]" />
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
