"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { formatPriceTRY } from "@/lib/billing/plans";
import {
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface BillingStatus {
  subscription: {
    planId: string;
    status: string;
    provider: string;
    billingPeriod: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  usage: {
    aiCalls: number;
    scrapingJobs: number;
    documentsUploaded: number;
  };
  plan: {
    id: string;
    displayName: string;
    priceMonthlyTRY: number;
    limits: { monthlyAiCalls: number; monthlyScrapingJobs: number };
  };
  quotas: {
    aiCalls: { used: number; limit: number; remaining: number; percentage: number };
    scrapingJobs: { used: number; limit: number; remaining: number };
    cases: { used: number; limit: number | null };
  };
  provider: "stripe" | "iyzico" | "demo";
}

export function BillingCard() {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast(data.error || "Portal açılamadı");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Hata");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="text-center py-8">
        <Loader2 size={20} className="animate-spin mx-auto text-[var(--color-text-3)]" />
      </Card>
    );
  }

  if (!status) return null;

  const aiPct = status.quotas.aiCalls.percentage;
  const isPro = status.plan.id === "pro" || status.plan.id === "enterprise";

  return (
    <div className="space-y-4">
      {/* Current Plan Card */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider mb-1">
              Mevcut Plan
            </div>
            <h3 className="font-serif text-2xl text-[var(--color-gold-bright)]">
              {status.plan.displayName}
              {status.provider === "demo" && (
                <span className="ml-2 text-[10px] bg-[var(--color-warn)]/15 text-[var(--color-warn)] px-2 py-0.5 rounded-full font-sans">
                  DEMO
                </span>
              )}
            </h3>
            <div className="text-[12px] text-[var(--color-text-2)] mt-1">
              {status.plan.priceMonthlyTRY === 0
                ? "Ücretsiz"
                : `${formatPriceTRY(status.plan.priceMonthlyTRY)}/ay`}
              {" • "}
              {status.subscription.status === "active" ? (
                <span className="text-[var(--color-ok)]">aktif</span>
              ) : status.subscription.status === "trialing" ? (
                <span className="text-[var(--color-info)]">deneme</span>
              ) : (
                <span className="text-[var(--color-warn)]">{status.subscription.status}</span>
              )}
              {status.subscription.cancelAtPeriodEnd && (
                <span className="text-[var(--color-danger)] ml-2">
                  (dönem sonunda iptal edilecek)
                </span>
              )}
            </div>
            {status.subscription.currentPeriodEnd && (
              <div className="text-[11px] text-[var(--color-text-3)] mt-1">
                Yenilenme: {new Date(status.subscription.currentPeriodEnd).toLocaleDateString("tr-TR")}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isPro && (
              <Link href="/pricing">
                <Button variant="primary" size="sm">
                  <TrendingUp size={14} /> Yükselt
                </Button>
              </Link>
            )}
            {status.plan.id !== "free" && (
              <Button variant="ghost" size="sm" onClick={openPortal} disabled={portalLoading}>
                <CreditCard size={14} />
                {portalLoading ? "Yükleniyor..." : "Yönet"}
              </Button>
            )}
          </div>
        </div>

        {/* AI usage progress */}
        <div className="bg-[var(--color-bg-2)] rounded-lg p-3.5">
          <div className="flex justify-between items-center mb-2 text-[12px]">
            <span className="text-[var(--color-text-2)]">AI işlem kullanımı (bu ay)</span>
            <span
              className={
                aiPct >= 90
                  ? "text-[var(--color-danger)] font-semibold"
                  : aiPct >= 70
                  ? "text-[var(--color-warn)] font-semibold"
                  : "text-[var(--color-gold-bright)] font-semibold"
              }
            >
              {status.quotas.aiCalls.used.toLocaleString("tr-TR")} /{" "}
              {status.quotas.aiCalls.limit.toLocaleString("tr-TR")}
            </span>
          </div>
          <div className="h-2 bg-[var(--color-bg-3)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                aiPct >= 90
                  ? "bg-[var(--color-danger)]"
                  : aiPct >= 70
                  ? "bg-[var(--color-warn)]"
                  : "bg-gradient-to-r from-[var(--color-gold-soft)] to-[var(--color-gold-bright)]"
              }`}
              style={{ width: `${Math.min(100, aiPct)}%` }}
            />
          </div>
          {aiPct >= 80 && (
            <div className="mt-2.5 flex items-start gap-1.5 text-[11.5px] text-[var(--color-warn)]">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                Kotanız tükenmek üzere. <Link href="/pricing" className="underline">Plan yükselt</Link>.
              </span>
            </div>
          )}
        </div>

        {/* Other quotas */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <QuotaMini
            label="Scraping"
            used={status.quotas.scrapingJobs.used}
            limit={status.quotas.scrapingJobs.limit}
          />
          <QuotaMini
            label="Davalar"
            used={status.quotas.cases.used}
            limit={status.quotas.cases.limit}
          />
          <QuotaMini
            label="Belgeler"
            used={status.usage.documentsUploaded}
            limit={null}
          />
        </div>
      </Card>

      {/* Upgrade nudge */}
      {!isPro && (
        <Card className="!bg-gradient-to-br !from-[var(--color-gold)]/[0.06] !to-transparent !border-[var(--color-gold)]/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/20 text-[var(--color-gold-bright)] flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-[14px] font-semibold text-[var(--color-gold-bright)] mb-1">
                Pro Plana Geçin
              </h4>
              <p className="text-[12.5px] text-[var(--color-text-2)] mb-3">
                <Check size={11} className="inline text-[var(--color-ok)] mr-1" />
                6× daha fazla AI işlem
                <Check size={11} className="inline text-[var(--color-ok)] mr-1 ml-3" />
                Premium AI (Claude Sonnet, GPT-4o)
                <Check size={11} className="inline text-[var(--color-ok)] mr-1 ml-3" />
                Müvekkil Portalı + Beyaz Etiket
              </p>
              <Link href="/pricing">
                <Button variant="primary" size="sm">
                  Planları İncele <ExternalLink size={12} />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function QuotaMini({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  return (
    <div className="bg-[var(--color-bg-2)] rounded-lg p-2.5 text-center">
      <div className="text-[10px] text-[var(--color-text-3)] uppercase tracking-wider">
        {label}
      </div>
      <div className="font-serif text-lg font-bold text-[var(--color-gold-bright)] mt-1">
        {used}
        {limit !== null && (
          <span className="text-[11px] text-[var(--color-text-3)] font-sans">
            {" "}
            / {limit}
          </span>
        )}
      </div>
    </div>
  );
}
