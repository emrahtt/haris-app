"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { Send, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  requestId: string;
  currentStatus: string;
}

const RESPONSE_TEMPLATES = {
  approved_access:
    "Sayın Başvuru Sahibi,\n\nKVKK m.11/a kapsamındaki başvurunuz incelenmiştir. Kişisel verilerinizin tarafımızca işlendiği teyit edilmektedir. Aşağıda detaylı bilgi bulunmaktadır:\n\n• İşleme amacı: [...]\n• Saklama süresi: [...]\n• Aktarım yapılan üçüncü kişiler: [...]\n\nSaygılarımızla,\nHARIS Veri Sorumlusu",

  approved_deletion:
    "Sayın Başvuru Sahibi,\n\nKVKK m.7 (Unutulma Hakkı) ve m.11/e kapsamındaki silme talebiniz işleme alınmıştır. Tüm kişisel verileriniz, yasal saklama yükümlülüğü altındaki kayıtlar (fatura, vergi — 10 yıl) hariç, [TARİH] itibarıyla silinmiştir.\n\nSaygılarımızla,\nHARIS Veri Sorumlusu",

  rejected:
    "Sayın Başvuru Sahibi,\n\nKVKK m.13 kapsamındaki başvurunuz incelenmiş olup talebinizin aşağıdaki gerekçeyle reddine karar verilmiştir:\n\n[GEREKÇE]\n\nKararımıza KVKK Kurulu'na şikayet yoluyla itiraz hakkınız saklıdır.\n\nSaygılarımızla,\nHARIS Veri Sorumlusu",
};

export function KvkkResponder({ requestId, currentStatus }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [response, setResponse] = useState("");
  const [decision, setDecision] = useState<"approved" | "rejected" | "">("");
  const [submitting, setSubmitting] = useState(false);

  function applyTemplate(key: keyof typeof RESPONSE_TEMPLATES) {
    setResponse(RESPONSE_TEMPLATES[key]);
  }

  async function handleSubmit() {
    if (!response.trim()) {
      toast("Lütfen bir yanıt yazın");
      return;
    }
    if (!decision) {
      toast("Lütfen karar verin (Onayla / Reddet)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/kvkk-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          newStatus: decision === "approved" ? "completed" : "rejected",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hata");
      toast("Yanıt gönderildi ✓");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Hata");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="!border-[var(--color-gold)]/30">
      <h3 className="font-semibold mb-3 text-[var(--color-gold-bright)]">
        ✍ Yanıt Hazırla
      </h3>

      {/* Hızlı şablonlar */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => applyTemplate("approved_access")}
          className="text-[11px] px-2.5 py-1 rounded-md border border-[var(--color-line)] hover:border-[var(--color-gold-soft)] text-[var(--color-text-2)]"
        >
          🟢 Onay (Bilgi Talebi)
        </button>
        <button
          onClick={() => applyTemplate("approved_deletion")}
          className="text-[11px] px-2.5 py-1 rounded-md border border-[var(--color-line)] hover:border-[var(--color-gold-soft)] text-[var(--color-text-2)]"
        >
          🟢 Onay (Silme)
        </button>
        <button
          onClick={() => applyTemplate("rejected")}
          className="text-[11px] px-2.5 py-1 rounded-md border border-[var(--color-line)] hover:border-[var(--color-gold-soft)] text-[var(--color-text-2)]"
        >
          🔴 Red Şablonu
        </button>
      </div>

      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={10}
        placeholder="Yanıtınızı yazın..."
        className="w-full px-3.5 py-3 rounded-lg bg-[var(--color-bg-2)] border border-[var(--color-line)] text-[var(--color-text)] text-[13px] outline-none focus:border-[var(--color-gold-soft)] font-sans leading-relaxed"
      />

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setDecision("approved")}
          className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium border ${
            decision === "approved"
              ? "bg-[var(--color-ok)]/15 text-[var(--color-ok)] border-[var(--color-ok)]"
              : "border-[var(--color-line)] text-[var(--color-text-2)] hover:border-[var(--color-ok)]/50"
          }`}
        >
          <CheckCircle2 size={14} className="inline mr-1.5" />
          Talebi Onayla
        </button>
        <button
          onClick={() => setDecision("rejected")}
          className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium border ${
            decision === "rejected"
              ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]"
              : "border-[var(--color-line)] text-[var(--color-text-2)] hover:border-[var(--color-danger)]/50"
          }`}
        >
          <XCircle size={14} className="inline mr-1.5" />
          Reddet
        </button>
      </div>

      <Button
        variant="primary"
        className="w-full justify-center mt-3"
        onClick={handleSubmit}
        disabled={submitting || currentStatus === "completed"}
      >
        <Send size={14} />
        {submitting ? "Gönderiliyor..." : "Yanıtı Gönder ve İşlemi Tamamla"}
      </Button>

      <p className="text-[10.5px] text-[var(--color-text-3)] mt-2 text-center">
        Yanıt başvuran kişiye e-posta ile gönderilecek ve audit_logs'a kayıt düşülecek.
      </p>
    </Card>
  );
}
