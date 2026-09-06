import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "px-3.5 py-1.5 text-xs",
      md: "px-5 py-2.5 text-[13px]",
      lg: "px-7 py-3.5 text-[15px]",
    };

    const variantClasses = {
      primary:
        "bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-soft)] text-[var(--color-bg-deep)] font-semibold shadow-[0_4px_18px_rgba(201,169,97,0.25)] hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(201,169,97,0.4)] border-transparent",
      ghost:
        "bg-transparent text-[var(--color-text)] border-[var(--color-line-2)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold-bright)]",
      danger:
        "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/25",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg font-medium transition-all cursor-pointer border",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
