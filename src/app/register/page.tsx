import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/auth-actions";
import { isDemoMode } from "@/lib/supabase/config";
import { ArrowRight, AlertCircle } from "lucide-react";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const sp = await searchParams;
  const errorMsg = sp.error;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div
        style={{
          padding: "60px",
          background:
            "linear-gradient(135deg, rgba(7,17,31,0.85), rgba(15,29,51,0.95)), radial-gradient(circle at 30% 30%, rgba(201,169,97,0.15), transparent 60%)",
        }}
        className="flex flex-col justify-between border-r border-[var(--color-line)]"
      >
        <Logo size="md" />
        <div>
          <p className="font-serif text-[28px] leading-[1.3] italic">
            &ldquo;Davanızın her detayı, en titiz bekçinin gözü altında.&rdquo;
          </p>
          <p className="text-[var(--color-gold-bright)] text-[13px] mt-3.5">— HARIS</p>
          <ul className="mt-8 space-y-3 text-[var(--color-text-2)] text-sm">
            <li>✓ 30 gün ücretsiz deneme</li>
            <li>✓ Sınırsız dava + 1000 AI işlemi</li>
            <li>✓ Kredi kartı gerektirmez</li>
            <li>✓ KVKK uyumlu, Türkiye veri rezidansı</li>
          </ul>
        </div>
        <div className="text-[var(--color-text-3)] text-[11px]">© 2026 HARIS Legal AI</div>
      </div>

      <div className="flex items-center justify-center p-10">
        <form action={signUp} className="w-full max-w-md">
          <h2 className="text-[28px] mb-2">Hesap Oluşturun</h2>
          <p className="text-[var(--color-text-2)] text-sm mb-8">
            Davanın bekçisini saniyeler içinde göreve alın
          </p>

          {/* HATA MESAJI */}
          {errorMsg && (
            <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-[13px] px-3.5 py-3 rounded-lg mb-4 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Kayıt yapılamadı</strong>
                <span className="text-[12px] opacity-90">{decodeURIComponent(errorMsg)}</span>
                {errorMsg.toLowerCase().includes("already registered") && (
                  <div className="text-[11.5px] mt-1.5">
                    💡 Bu e-posta zaten kayıtlı.{" "}
                    <Link href="/login" className="underline">
                      Giriş yapın
                    </Link>
                  </div>
                )}
                {errorMsg.toLowerCase().includes("password") && (
                  <div className="text-[11.5px] mt-1.5">
                    💡 Şifre en az 6 karakter olmalı.
                  </div>
                )}
              </div>
            </div>
          )}

          {isDemoMode && (
            <div className="bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 text-[var(--color-info)] text-xs px-3.5 py-2.5 rounded-lg mb-4">
              🚀 <strong>Demo Modu</strong> — Form doldurmadan da Dashboard&apos;a girebilirsiniz.
            </div>
          )}

          <div className="mb-4">
            <label className="block text-[var(--color-text-2)] text-xs mb-1.5">Ad Soyad</label>
            <input
              name="name"
              type="text"
              required
              placeholder="Av. Ahmet Demir"
              className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-1)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-gold-soft)]"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[var(--color-text-2)] text-xs mb-1.5">E-posta</label>
            <input
              name="email"
              type="email"
              required
              placeholder="ad@hukukburosu.com"
              className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-1)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-gold-soft)]"
            />
          </div>

          <div className="mb-6">
            <label className="block text-[var(--color-text-2)] text-xs mb-1.5">Şifre</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="En az 6 karakter"
              className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-1)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-gold-soft)]"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full justify-center">
            Ücretsiz Başla <ArrowRight size={14} />
          </Button>

          <p className="text-center mt-5 text-[var(--color-text-2)] text-[13px]">
            Hesabın var mı?{" "}
            <Link href="/login" className="text-[var(--color-gold-bright)]">
              Giriş yap
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
