"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  Shield,
  Download,
  Trash2,
  FileText,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from "lucide-react";

export function PrivacySection() {
  const toast = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionScheduled, setDeletionScheduled] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleExport() {
    setExportLoading(true);
    try {
      // Direkt browser download
      window.location.href = "/api/account/export";
      setTimeout(() => setExportLoading(false), 2000);
      toast("Veri export dosyası indiriliyor...");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Hata");
      setExportLoading(false);
    }
  }

  async function handleDeleteRequest() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, retentionChoice: "anonymize" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);
      setDeletionScheduled(data.scheduledAt);
      setShowDeleteConfirm(false);
      toast("Hesap silme talebiniz alındı (30 gün cool-off)");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Hata");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleCancelDeletion() {
    try {
      await fetch("/api/account/delete", { method: "DELETE" });
      setDeletionScheduled(null);
      toast("Silme talebi iptal edildi ✓");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Hata");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-serif text-[var(--color-gold-bright)] text-xl mb-2 flex items-center gap-2">
          <Shield size={18} /> Gizlilik & KVKK
        </h3>
        <p className="text-[12.5px] text-[var(--color-text-2)]">
          6698 sayılı KVKK kapsamındaki haklarınızı buradan kullanabilirsiniz.
        </p>
      </div>

      {/* Hukuki belgeler */}
      <Card>
        <h4 className="font-semibold text-[14px] mb-3 flex items-center gap-2">
          <FileText size={14} className="text-[var(--color-gold-bright)]" />
          Hukuki Belgeler
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[12.5px]">
          <Link
            href="/legal/privacy"
            className="p-3 border border-[var(--color-line)] rounded-lg hover:border-[var(--color-gold-soft)] flex items-center justify-between"
          >
            <span>Aydınlatma Metni</span>
            <ExternalLink size={12} />
          </Link>
          <Link
            href="/legal/terms"
            className="p-3 border border-[var(--color-line)] rounded-lg hover:border-[var(--color-gold-soft)] flex items-center justify-between"
          >
            <span>Kullanım Şartları</span>
            <ExternalLink size={12} />
          </Link>
          <Link
            href="/legal/cookies"
            className="p-3 border border-[var(--color-line)] rounded-lg hover:border-[var(--color-gold-soft)] flex items-center justify-between"
          >
            <span>Çerez Politikası</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </Card>

      {/* Veri Export */}
      <Card>
        <h4 className="font-semibold text-[14px] mb-2 flex items-center gap-2">
          <Download size={14} className="text-[var(--color-info)]" />
          Verilerimi İndir
        </h4>
        <p className="text-[12.5px] text-[var(--color-text-2)] mb-3">
          KVKK m.11/d kapsamında tüm verilerinizi (profil, davalar, belgeler, dilekçeler,
          audit logları) <strong>JSON formatında</strong> indirebilirsiniz.
        </p>
        <Button variant="ghost" onClick={handleExport} disabled={exportLoading} size="sm">
          {exportLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          Verilerimi İndir (.json)
        </Button>
      </Card>

      {/* KVKK başvuru */}
      <Card>
        <h4 className="font-semibold text-[14px] mb-2 flex items-center gap-2">
          <Shield size={14} className="text-[var(--color-gold-bright)]" />
          KVKK Başvuru
        </h4>
        <p className="text-[12.5px] text-[var(--color-text-2)] mb-3">
          Verilerinizin işlenmesi hakkında bilgi almak, düzeltme talep etmek veya itiraz
          etmek için resmi başvuruda bulunabilirsiniz. 30 gün içinde yanıtlanır.
        </p>
        <Link href="/legal/kvkk-basvuru">
          <Button variant="ghost" size="sm">
            <FileText size={14} /> Başvuru Formu Aç <ExternalLink size={12} />
          </Button>
        </Link>
      </Card>

      {/* Account deletion */}
      <Card className="!border-[var(--color-danger)]/30 !bg-[var(--color-danger)]/[0.04]">
        <h4 className="font-semibold text-[14px] mb-2 flex items-center gap-2 text-[var(--color-danger)]">
          <Trash2 size={14} />
          Hesabımı Sil
        </h4>

        {deletionScheduled ? (
          <div className="bg-[var(--color-warn)]/10 border border-[var(--color-warn)]/30 rounded-lg p-3 mt-2">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={14}
                className="text-[var(--color-warn)] flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 text-[12.5px]">
                <strong className="text-[var(--color-warn)] block mb-1">
                  Silme talebi aktif
                </strong>
                <p className="text-[var(--color-text-2)] mb-2">
                  Hesabınız{" "}
                  <strong>
                    {new Date(deletionScheduled).toLocaleDateString("tr-TR")}
                  </strong>{" "}
                  tarihinde silinecek. Bu süre içinde fikrinizi değiştirebilirsiniz.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelDeletion}
                >
                  ✓ Silmeyi İptal Et
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[12.5px] text-[var(--color-text-2)] mb-3">
              <strong>Unutulma Hakkı</strong> (KVKK m.7). Talep gönderdikten sonra{" "}
              <strong>30 gün cool-off</strong> süreniz olur; bu süre içinde vazgeçebilirsiniz.
              Sonrasında dava verileriniz dahil tüm hesap kalıcı olarak silinir.
            </p>
            {!showDeleteConfirm ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={14} /> Hesap Silme Talebi Başlat
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg p-3 text-[12.5px]">
                  <strong className="block mb-1">Emin misiniz?</strong>
                  Tüm davalarınız, belgeleriniz, dilekçeleriniz ve hesap geçmişiniz 30 gün
                  sonra <strong>kalıcı olarak silinecek</strong>. Yasal saklama (10 yıl
                  fatura arşivi) hariç hiçbir veri geri alınamaz.
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    onClick={handleDeleteRequest}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Evet, Silme Talebi Gönder
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                    Vazgeç
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
