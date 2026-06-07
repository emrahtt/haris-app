import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEMO_USER } from "@/lib/supabase/config";
import { BillingCard } from "@/components/billing/billing-card";
import { PrivacySection } from "@/components/settings/privacy-section";
import { AdminLink } from "@/components/settings/admin-link";
import { User, Shield, Brain, Users, Landmark, Settings as SettingsIcon } from "lucide-react";

const MENU = [
  { icon: User, label: "Hesap", active: true },
  { icon: Shield, label: "Güvenlik & KVKK" },
  { icon: Brain, label: "AI Tercihleri" },
  { icon: Users, label: "Ekip Üyeleri" },
  { icon: Landmark, label: "Faturalama" },
  { icon: SettingsIcon, label: "Entegrasyonlar (UYAP)" },
];

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Ayarlar" />
      <div className="mb-6">
        <h1 className="font-serif text-[26px]">Ayarlar</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <Card className="!p-3.5">
          {MENU.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[12.5px] cursor-pointer transition-all ${
                  m.active
                    ? "bg-[var(--color-gold)]/[0.08] text-[var(--color-gold-bright)] border-l-2 border-[var(--color-gold)] pl-2.5"
                    : "text-[var(--color-text-2)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-text)]"
                }`}
              >
                <Icon size={14} /> {m.label}
              </div>
            );
          })}
        </Card>

        <Card>
          <h3 className="font-serif text-[var(--color-gold-bright)] mb-4.5">
            Hesap Bilgileri
          </h3>
          <div className="flex items-center gap-4.5 mb-6">
            <div className="w-15 h-15 rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-soft)] text-[var(--color-bg-deep)] flex items-center justify-center font-semibold text-[22px]">
              {DEMO_USER.initials}
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold">{DEMO_USER.name}</div>
              <div className="text-xs text-[var(--color-text-2)]">
                {DEMO_USER.firmName} • {DEMO_USER.plan} Plan
              </div>
            </div>
            <Button variant="ghost" size="sm">
              Profili Düzenle
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[
              ["Ad Soyad", DEMO_USER.name],
              ["Baro Sicil No", DEMO_USER.baroSicil],
              ["E-posta", DEMO_USER.email],
              ["Telefon", "+90 532 XXX XX XX"],
            ].map(([label, value]) => (
              <div key={label}>
                <label className="block text-[var(--color-text-2)] text-xs mb-1.5">
                  {label}
                </label>
                <input
                  defaultValue={value as string}
                  className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-1)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none"
                />
              </div>
            ))}
          </div>

          <h3 className="font-serif text-[var(--color-gold-bright)] mt-7 mb-3.5">
            Plan &amp; Kullanım
          </h3>
          <BillingCard />

          <AdminLink />

          <div className="mt-8 pt-8 border-t border-[var(--color-line)]">
            <PrivacySection />
          </div>
        </Card>
      </div>
    </>
  );
}
