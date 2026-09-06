"use client";

import { useState } from "react";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  KVKK_REQUEST_TYPES,
  type KvkkRequestType,
} from "@/lib/kvkk/constants";
import { CheckCircle2, Send } from "lucide-react";

export default function KvkkBasvuruPage() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string; deadline: string } | null>(null);
  const [form, setForm] = useState({
    requestType: "access" as KvkkRequestType,
    name: "",
    email: "",
    tc: "",
    phone: "",
    subject: "",
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/kvkk/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hata");
      setSubmitted({ id: data.id, deadline: data.deadline });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Başvuru gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <LegalPage
        title="Başvurunuz Alındı"
        version=""
        lastUpdated={new Date().toLocaleDateString("tr-TR")}
      >
        <div className="text-center py-8">
          <CheckCircle2
            size={48}
            className="text-[var(--color-ok)] mx-auto mb-4"
          />
          <h2 className="text-2xl font-serif mb-3">
            KVKK Başvurunuz Kayıt Altına Alındı
          </h2>
          <p className="mb-2">
            Başvuru numaranız:{" "}
            <code className="bg-[var(--color-bg-2)] px-2 py-1 rounded text-[var(--color-gold-bright)]">
              {submitted.id.slice(0, 8)}
            </code>
          </p>
          <p>
            <strong>{new Date(submitted.deadline).toLocaleDateString("tr-TR")}</strong>{" "}
            tarihine kadar (KVKK m.13 — 30 gün içinde) yanıtlayacağız. Yanıt e-posta
            adresinize gönderilecektir.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="text-[var(--color-gold-bright)] underline text-[13px]"
            >
              Ana sayfaya dön
            </Link>
          </div>
        </div>
      </LegalPage>
    );
  }

  return (
    <LegalPage
      title="KVKK İlgili Kişi Başvuru Formu"
      version="v1.0.0"
      lastUpdated="6 Haziran 2026"
    >
      <p>
        6698 sayılı KVKK m.11 kapsamındaki haklarınızı kullanmak için bu formu
        doldurabilirsiniz. Başvurunuz <strong>30 gün içinde ücretsiz olarak yanıtlanır</strong>{" "}
        (m.13). E-posta yoluyla{" "}
        <a href="mailto:kvkk@haris.example">kvkk@haris.example</a> adresine de yazabilirsiniz.
      </p>

      <form onSubmit={handleSubmit} className="not-prose space-y-4 mt-6">
        <div>
          <label className="block text-[13px] text-[var(--color-text-2)] mb-1.5">
            Talep Türü *
          </label>
          <select
            required
            value={form.requestType}
            onChange={(e) =>
              setForm({ ...form, requestType: e.target.value as KvkkRequestType })
            }
            className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-1)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-gold-soft)]"
          >
            {Object.entries(KVKK_REQUEST_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Ad Soyad *"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />
          <Field
            label="E-posta *"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            required
          />
          <Field
            label="T.C. Kimlik No (opsiyonel)"
            value={form.tc}
            onChange={(v) => setForm({ ...form, tc: v })}
            placeholder="11 haneli"
          />
          <Field
            label="Telefon (opsiyonel)"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            placeholder="+90 5XX XXX XX XX"
          />
        </div>

        <Field
          label="Konu *"
          value={form.subject}
          onChange={(v) => setForm({ ...form, subject: v })}
          placeholder="örn: Verilerimin işlenme amacı hakkında bilgi"
          required
        />

        <div>
          <label className="block text-[13px] text-[var(--color-text-2)] mb-1.5">
            Talep Detayı *
          </label>
          <textarea
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6}
            placeholder="Talebinizi mümkün olduğunca detaylı açıklayın. Hangi verilerle ilgili olduğunu, varsa olay tarihini belirtin."
            className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-1)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-gold-soft)] font-sans"
          />
        </div>

        <div className="bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 rounded-lg p-3.5 text-[12px] text-[var(--color-text-2)]">
          <strong className="text-[var(--color-info)]">Bilgilendirme:</strong> Başvurunuz
          kimliğinizin doğrulanmasının ardından işleme alınır. T.C. kimlik numarası girmek
          opsiyonel ancak hızlı yanıt için tavsiye edilir.
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
          className="w-full justify-center"
        >
          {submitting ? "Gönderiliyor..." : "Başvuruyu Gönder"} <Send size={14} />
        </Button>
      </form>
    </LegalPage>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[13px] text-[var(--color-text-2)] mb-1.5">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-1)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-gold-soft)]"
      />
    </div>
  );
}
