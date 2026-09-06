import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(7,17,31,0.7)] border-b border-[var(--color-line)] px-[5%] py-4 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex gap-5 items-center text-[13px]">
          <Link
            href="/legal/privacy"
            className="text-[var(--color-text-2)] hover:text-[var(--color-gold-bright)]"
          >
            Aydınlatma
          </Link>
          <Link
            href="/legal/terms"
            className="text-[var(--color-text-2)] hover:text-[var(--color-gold-bright)]"
          >
            Şartlar
          </Link>
          <Link
            href="/legal/cookies"
            className="text-[var(--color-text-2)] hover:text-[var(--color-gold-bright)]"
          >
            Çerezler
          </Link>
          <Link
            href="/legal/kvkk-basvuru"
            className="text-[var(--color-gold-bright)] hover:underline"
          >
            KVKK Başvuru
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-[5%] py-12">
        {children}
      </div>

      <footer className="border-t border-[var(--color-line)] px-[5%] py-8 text-center text-[12px] text-[var(--color-text-3)]">
        © 2026 HARIS Legal AI — KVKK uyumlu • Türkiye veri rezidansı (Supabase Frankfurt)
      </footer>
    </main>
  );
}
