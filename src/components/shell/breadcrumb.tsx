import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <div className="text-[var(--color-text-3)] text-[13px]">
      {items.map((item, i) => (
        <span key={i}>
          {item.href ? (
            <Link href={item.href} className="text-[var(--color-text-2)] hover:text-[var(--color-gold-bright)]">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--color-text)]">{item.label}</span>
          )}
          {i < items.length - 1 && (
            <span className="mx-2 text-[var(--color-line-2)]">›</span>
          )}
        </span>
      ))}
    </div>
  );
}
