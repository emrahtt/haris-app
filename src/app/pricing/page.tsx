"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { getPlanList, formatPriceTRY, type PlanId } from "@/lib/billing/plans";
import { CREDIT_PACKS } from "@/lib/billing/credits";
import { Check, ArrowRight, Sparkles, Star, Building2 } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();
  const toast = useToast();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<PlanId | null>(null);
  const plans = getPlanList();

  async function handleSubscribe(planId: PlanId) {
    if (planId === "free") {
      router.push("/register");
      return;
    }
    if (planId === "enterprise") {
      toast("Enterprise için sales@haris.example adresine yazın");
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingPeriod: period }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast(data.error || "Checkout başlatılamadı");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Hata");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(7,17,31,0.7)] border-b border-[var(--color-line)] px-[5%] py-4 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex gap-3 items-center">
          <Link
            href="/login"
            className="text-[var(--color-text-2)] hover:text-[var(--color-gold-bright)] text-[13px]"
          >
            Giriş
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              Ücretsiz Başla <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-[5%] pt-16 pb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/25 text-xs text-[var(--color-gold-bright)] mb-7">
          <Sparkles size={12} />
          14 gün ücretsiz deneme • Kredi kartı gerektirmez
        </div>
        <h1 className="text-[clamp(32px,5vw,52px)] leading-[1.1] mb-4">
          Davanızın kalitesi,{" "}
          <span className="italic bg-gradient-to-br from-[var(--color-gold-bright)] to-[var(--color-gold)] bg-clip-text text-transparent">
            bütçenizden büyük olmasın
          </span>
          .
        </h1>
        <p className="text-[var(--color-text-2)] text-base max-w-2xl mx-auto">
          Tek bir avukattan kurumsal hukuk bürosuna kadar her ölçeğe uygun planlar.
          AI işlem kotanız bittiğinde plan değiştirebilir veya bekleyebilirsiniz.
        </p>

        {/* Period toggle */}
        <div className="inline-flex bg-[var(--color-bg-2)] border border-[var(--color-line)] rounded-full p-1 mt-8">
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-5 py-2 rounded-full text-[13px] transition-all ${
              period === "monthly"
                ? "bg-[var(--color-gold)] text-[var(--color-bg-deep)] font-semibold"
                : "text-[var(--color-text-2)]"
            }`}
          >
            Aylık
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={`px-5 py-2 rounded-full text-[13px] transition-all ${
              period === "yearly"
                ? "bg-[var(--color-gold)] text-[var(--color-bg-deep)] font-semibold"
                : "text-[var(--color-text-2)]"
            }`}
          >
            Yıllık{" "}
            <span className="text-[10px] ml-1 bg-[var(--color-ok)]/20 text-[var(--color-ok)] px-1.5 py-0.5 rounded-full">
              2 ay bedava
            </span>
          </button>
        </div>
      </section>

      {/* Plan kartları */}
      <section className="px-[5%] pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const price =
              period === "yearly" ? plan.priceYearlyTRY : plan.priceMonthlyTRY;
            const periodLabel = period === "yearly" ? "yıl" : "ay";
            const monthlyEquivalent = period === "yearly"
              ? Math.round(plan.priceYearlyTRY / 12)
              : plan.priceMonthlyTRY;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-7 flex flex-col ${
                  plan.badge === "recommended"
                    ? "border-[var(--color-gold)] bg-gradient-to-b from-[var(--color-gold)]/[0.08] to-[var(--color-bg-1)] shadow-[0_0_40px_rgba(201,169,97,0.15)]"
                    : "border-[var(--color-line)] bg-[var(--color-bg-1)]"
                }`}
              >
                {plan.badge === "popular" && (
                  <div className="absolute -top-3 left-7 bg-[var(--color-info)]/20 text-[var(--color-info)] text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full border border-[var(--color-info)]/40">
                    ✦ Popüler
                  </div>
                )}
                {plan.badge === "recommended" && (
                  <div className="absolute -top-3 left-7 bg-[var(--color-gold)] text-[var(--color-bg-deep)] text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full">
                    <Star size={10} className="inline mr-1" />
                    Önerilen
                  </div>
                )}
                {plan.badge === "enterprise" && (
                  <div className="absolute -top-3 left-7 bg-[var(--color-text-2)]/20 text-[var(--color-text-2)] text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full border border-[var(--color-text-2)]/30">
                    <Building2 size={10} className="inline mr-1" />
                    Özel
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-serif text-2xl">{plan.displayName}</h3>
                  <p className="text-[var(--color-text-3)] text-[12.5px] mt-1">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  {plan.id === "enterprise" ? (
                    <div>
                      <div className="font-serif text-3xl font-bold text-[var(--color-gold-bright)]">
                        Custom
                      </div>
                      <div className="text-[12px] text-[var(--color-text-3)] mt-1">
                        sales@haris.example
                      </div>
                    </div>
                  ) : price === 0 ? (
                    <div>
                      <div className="font-serif text-4xl font-bold">Ücretsiz</div>
                      <div className="text-[12px] text-[var(--color-text-3)] mt-1">
                        Kredi kartı gerektirmez
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-serif text-4xl font-bold text-[var(--color-gold-bright)]">
                          {formatPriceTRY(monthlyEquivalent)}
                        </span>
                        <span className="text-[13px] text-[var(--color-text-3)]">
                          /ay
                        </span>
                      </div>
                      {period === "yearly" && (
                        <div className="text-[11.5px] text-[var(--color-ok)] mt-1">
                          Yıllık {formatPriceTRY(plan.priceYearlyTRY)} ödeyin
                        </div>
                      )}
                      {period === "monthly" && (
                        <div className="text-[11.5px] text-[var(--color-text-3)] mt-1">
                          /{periodLabel} — KDV dahil
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant={plan.badge === "recommended" ? "primary" : "ghost"}
                  className="w-full justify-center mb-5"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id
                    ? "Yönlendiriliyor..."
                    : plan.id === "free"
                    ? "Ücretsiz Başla"
                    : plan.id === "enterprise"
                    ? "Bizimle İletişime Geçin"
                    : "Hemen Başla"}
                  {!loading && <ArrowRight size={14} />}
                </Button>

                <ul className="space-y-2 text-[12.5px] text-[var(--color-text-2)] flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-[var(--color-ok)] flex-shrink-0 mt-0.5"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="max-w-5xl mx-auto mt-16">
          <h2 className="font-serif text-2xl text-center mb-3">
            Ek AI paketi
          </h2>
          <p className="text-center text-[var(--color-text-2)] text-sm mb-6 max-w-2xl mx-auto">
            Plan kotanız bittiğinde paket alın. Yükleme yalnızca sizin
            hesabınıza yazılır; başka kullanıcı sizin API bakiyenizi
            tüketemez.
          </p>
          <CreditPacks />
        </div>

        {/* SSS */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="font-serif text-2xl text-center mb-8">Sık Sorulanlar</h2>
          {[
            {
              q: "Plan değiştirebilir miyim?",
              a: "Evet, istediğiniz an. Yükseltmelerde fark hesaplanıp size yansıtılır, düşürmelerde aktif dönem sonunda geçerli olur.",
            },
            {
              q: "AI işlem kotamı aşarsam ne olur?",
              a: "Sistem uyarı verir, %100'e ulaşınca AI çağrıları o ay için pasifleştirilir. Plan yükselterek anında devam edebilirsiniz; gelecek ay otomatik resetlenir.",
            },
            {
              q: "Hangi ödeme yöntemleri kabul ediliyor?",
              a: "Kredi/banka kartı (Stripe — uluslararası), iyzico (Türkiye — kart, havale, BKM Express). Enterprise için banka transferi de mümkün.",
            },
            {
              q: "İptal etmek istersem?",
              a: "Settings → Plan ve Faturalama → İptal. Dönem sonuna kadar erişim devam eder, otomatik yenileme kapanır. Müvekkil verisi 30 gün saklanır.",
            },
            {
              q: "KVKK uyumlu mu?",
              a: "Evet. Veriler Türkiye veri rezidansında (Supabase Frankfurt), AES-256 şifrelenir, müvekkil dosyaları LLM training'de KULLANILMAZ.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="border-b border-[var(--color-line)] py-4 group"
            >
              <summary className="cursor-pointer text-[14px] font-medium flex items-center justify-between">
                {item.q}
                <span className="text-[var(--color-gold)] group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <p className="text-[13px] text-[var(--color-text-2)] mt-3 leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

function CreditPacks() {
  const [loading, setLoading] = useState<string | null>(null);
  const toast = useToast();

  async function buy(packId: string) {
    setLoading(packId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast(data.error || "Paket başlatılamadı");
    } catch (e) {
      toast(String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.values(CREDIT_PACKS).map((p) => (
        <div
          key={p.id}
          className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-1)] p-5"
        >
          <div className="text-sm text-[var(--color-text-3)]">{p.name}</div>
          <div className="font-serif text-2xl text-[var(--color-gold-bright)] mt-1">
            {p.calls} işlem
          </div>
          <div className="text-sm text-[var(--color-text-2)] mt-1 mb-4">
            {formatPriceTRY(p.priceTry)}
          </div>
          <button
            type="button"
            disabled={loading === p.id}
            onClick={() => buy(p.id)}
            className="w-full py-2 rounded-lg bg-[#C9A961] text-[#0A1628] text-sm font-semibold disabled:opacity-50"
          >
            {loading === p.id ? "…" : "Satın al"}
          </button>
        </div>
      ))}
    </div>
  );
}
