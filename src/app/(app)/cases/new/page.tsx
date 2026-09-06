"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { createCaseAction } from "@/lib/data/case-actions";
import {
  Car,
  Briefcase,
  Building2,
  Users,
  Gavel,
  Landmark,
  Hammer,
  Upload,
  Check,
  ArrowRight,
  Info,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

interface CaseType {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}

const TYPES: CaseType[] = [
  { id: "tazminat", icon: Car, title: "Tazminat", desc: "Trafik kazası, iş kazası, malpraktis..." },
  { id: "is", icon: Briefcase, title: "İş Hukuku", desc: "Kıdem, ihbar, fazla mesai, mobbing..." },
  { id: "ticari", icon: Building2, title: "Ticari", desc: "Sözleşme, alacak, şirket uyuşmazlığı..." },
  { id: "aile", icon: Users, title: "Aile", desc: "Boşanma, velayet, nafaka, mal rejimi..." },
  { id: "ceza", icon: Gavel, title: "Ceza", desc: "Sanık savunma, suçtan zarar gören vekili..." },
  { id: "icra", icon: Landmark, title: "İcra-İflas", desc: "Takip, itiraz, iflas, konkordato..." },
  { id: "idari", icon: Building2, title: "İdari", desc: "İYUK kapsamında idari işlem iptali..." },
  { id: "gayri", icon: Hammer, title: "Gayrimenkul", desc: "Tapu iptali, ortaklık giderme, kira..." },
];

const STEPS = ["Tür", "Bilgiler", "Dosyalar", "Başlat"];

const AGENT_NAMES = [
  "Orkestra Ajanı",
  "Maddi Olay Analisti",
  "Hukuki Nitelendirici",
  "Mevzuat Tarayıcı",
  "İçtihat Avcısı",
  "Doktrin Tarayıcı",
  "Usul Hukukçusu",
  "Risk Analisti",
];

function NewCasePageInner() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error");
  const [step, setStep] = useState(1);

  // Form state
  const [caseType, setCaseType] = useState("tazminat");
  const [title, setTitle] = useState("");
  const [court, setCourt] = useState("");
  const [esasNo, setEsasNo] = useState("");
  const [client, setClient] = useState("");
  const [opponent, setOpponent] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function next() {
    if (step === 2) {
      if (!title.trim()) {
        toast("Dava adı zorunlu");
        return;
      }
      if (!client.trim()) {
        toast("Müvekkil adı zorunlu");
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const fd = new FormData();
    fd.set("caseType", caseType);
    fd.set("title", title);
    fd.set("court", court);
    fd.set("esasNo", esasNo);
    fd.set("client", client);
    fd.set("opponent", opponent);
    fd.set("summary", summary);
    // Server Action — başarılıysa redirect yapar (bu fonksiyon dönmez)
    try {
      await createCaseAction(fd);
    } catch {
      // Redirect istisnası — bilerek yutuyoruz
    }
  }

  return (
    <>
      <Topbar title="Yeni Dava" />

      <div className="mb-6">
        <Link
          href="/cases"
          className="text-[var(--color-text-2)] text-[13px] cursor-pointer hover:text-[var(--color-gold-bright)]"
        >
          ← Davalara dön
        </Link>
      </div>

      {errorMsg && (
        <div className="max-w-3xl mx-auto mb-4 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-[13px] px-3.5 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block mb-0.5">Dava oluşturulamadı</strong>
            <span className="text-[12px]">{decodeURIComponent(errorMsg)}</span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="flex mb-8">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const isActive = step === n;
            const isDone = step > n;
            return (
              <div key={n} className="flex-1 text-center py-3.5 relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold text-[13px] border ${
                    isActive
                      ? "bg-[var(--color-gold)] text-[var(--color-bg-deep)] border-[var(--color-gold)]"
                      : isDone
                      ? "bg-[var(--color-ok)]/20 text-[var(--color-ok)] border-[var(--color-ok)]/30"
                      : "bg-[var(--color-bg-2)] text-[var(--color-text-3)] border-[var(--color-line-2)]"
                  }`}
                >
                  {isDone ? <Check size={14} /> : n}
                </div>
                <div
                  className={`text-xs ${
                    isActive
                      ? "text-[var(--color-gold-bright)]"
                      : "text-[var(--color-text-3)]"
                  }`}
                >
                  {label}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="absolute top-7 left-[60%] right-[-40%] h-px bg-[var(--color-line-2)]" />
                )}
              </div>
            );
          })}
        </div>

        <Card>
          {step === 1 && (
            <>
              <h2 className="font-serif text-2xl mb-2">Dava türünü seçin</h2>
              <p className="text-[var(--color-text-2)] text-[13px] mb-6">
                HARIS, seçtiğiniz türe göre uzmanlaşmış ajanları devreye alacak.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = caseType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setCaseType(t.id)}
                      className={`p-4.5 px-3.5 border rounded-[10px] text-center cursor-pointer transition-all ${
                        isSelected
                          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/[0.08]"
                          : "border-[var(--color-line)] bg-[var(--color-bg-1)] hover:border-[var(--color-gold-soft)] hover:bg-[var(--color-bg-2)]"
                      }`}
                    >
                      <Icon
                        size={22}
                        strokeWidth={1.6}
                        className="text-[var(--color-gold-bright)] mx-auto mb-2"
                      />
                      <div className="text-[13px] font-medium">{t.title}</div>
                      <div className="text-[11px] text-[var(--color-text-3)] mt-1">
                        {t.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end mt-8">
                <Button variant="primary" onClick={next}>
                  İleri <ArrowRight size={14} />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-serif text-2xl mb-2">Dava bilgileri</h2>
              <p className="text-[var(--color-text-2)] text-[13px] mb-6">
                Temel bilgileri girin. Eksikleri sonra tamamlayabilirsiniz.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <Field label="Dava Adı / Konusu *" value={title} onChange={setTitle}
                  placeholder="Örn: Yılmaz vs. Şahin Tazminat" />
                <Field label="Esas No (varsa)" value={esasNo} onChange={setEsasNo}
                  placeholder="2025/.... E." />
                <Field label="Mahkeme" value={court} onChange={setCourt}
                  placeholder="İstanbul ... Asliye ..." />
                <Field label="Müvekkil Adı *" value={client} onChange={setClient}
                  placeholder="Ad Soyad / Şirket" />
                <Field label="Karşı Taraf" value={opponent} onChange={setOpponent}
                  placeholder="Ad Soyad / Şirket" />
              </div>
              <div className="mt-3.5">
                <label className="block text-[var(--color-text-2)] text-xs mb-1.5">
                  Olayın Kısa Özeti (AI&apos;ın bağlamı anlaması için)
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  placeholder="Olayı kendi sözcüklerinizle özetleyin..."
                  className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-2)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-gold-soft)] font-sans"
                />
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  ← Geri
                </Button>
                <Button variant="primary" onClick={next}>
                  İleri <ArrowRight size={14} />
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-serif text-2xl mb-2">Dosyaları yükleyin</h2>
              <p className="text-[var(--color-text-2)] text-[13px] mb-6">
                Dosya yüklemeyi <strong>dava oluştuktan sonra</strong> &quot;Belgeler&quot;
                sekmesinden yapabilirsiniz.
              </p>
              <div className="border-2 border-dashed border-[var(--color-line-2)] rounded-xl p-12 text-center opacity-60">
                <Upload size={32} strokeWidth={1.5} className="text-[var(--color-gold-bright)] mx-auto mb-3.5" />
                <div className="text-[15px] font-medium mb-1.5">
                  Dosya yükleme → dava oluştuktan sonra
                </div>
                <div className="text-xs text-[var(--color-text-3)]">
                  PDF, DOCX, JPG, MP3 desteklenir
                </div>
              </div>
              <div className="mt-4.5 p-3.5 bg-[var(--color-info)]/[0.06] border border-[var(--color-info)]/20 rounded-lg text-[12.5px] text-[var(--color-text-2)] flex gap-2.5">
                <Info size={16} className="text-[var(--color-info)] flex-shrink-0 mt-0.5" />
                <div>
                  Dava oluşturulduktan sonra <strong>Belgeler</strong> sekmesinden tüm
                  dosyalarınızı yükleyebilirsiniz. AI otomatik olarak OCR + sınıflandırma +
                  kronoloji yapacak.
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep(2)}>← Geri</Button>
                <Button variant="primary" onClick={next}>İleri <ArrowRight size={14} /></Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-serif text-2xl mb-2">Hazır! AI&apos;ı devreye alalım</h2>
              <p className="text-[var(--color-text-2)] text-[13px] mb-6">
                Dava oluşturulacak ve gösterge paneline yönlendirileceksiniz. AI ajanlarını
                Derin Analiz sekmesinden başlatabilirsiniz.
              </p>
              <div className="bg-gradient-to-br from-[var(--color-gold)]/[0.06] to-[var(--color-gold)]/[0.02] border border-[var(--color-gold)]/20 rounded-xl p-6 mb-4.5">
                <h4 className="text-[var(--color-gold-bright)] mb-3 font-sans font-semibold">
                  Otomatik Çalışacak Ajanlar:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12.5px] text-[var(--color-text-2)]">
                  {AGENT_NAMES.map((name) => (
                    <div key={name} className="flex items-center gap-2">
                      <Check size={14} strokeWidth={2.5} className="text-[var(--color-ok)]" />
                      {name}
                    </div>
                  ))}
                </div>
              </div>
              {/* Özet */}
              <div className="bg-[var(--color-bg-2)] rounded-lg p-3.5 mb-4 text-[12.5px] space-y-1">
                <div><strong className="text-[var(--color-gold-bright)]">Tür:</strong> {caseType}</div>
                <div><strong className="text-[var(--color-gold-bright)]">Başlık:</strong> {title || <em className="text-[var(--color-danger)]">girilmedi</em>}</div>
                <div><strong className="text-[var(--color-gold-bright)]">Müvekkil:</strong> {client || <em className="text-[var(--color-danger)]">girilmedi</em>}</div>
                {court && <div><strong className="text-[var(--color-gold-bright)]">Mahkeme:</strong> {court}</div>}
                {opponent && <div><strong className="text-[var(--color-gold-bright)]">Karşı Taraf:</strong> {opponent}</div>}
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(3)} disabled={submitting}>
                  ← Geri
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting || !title.trim() || !client.trim()}
                >
                  {submitting ? "Oluşturuluyor..." : "✨ Davayı Oluştur"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[var(--color-text-2)] text-xs mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-2)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-gold-soft)]"
      />
    </div>
  );
}


export default function NewCasePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--color-text-3)]">Yükleniyor...</div>}>
      <NewCasePageInner />
    </Suspense>
  );
}
