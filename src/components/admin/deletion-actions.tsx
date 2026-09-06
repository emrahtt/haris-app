"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { Loader2, Trash2 } from "lucide-react";

export function DeletionActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleExecute() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deletions/${requestId}/execute`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hata");
      toast(
        `Silindi: ${data.casesDeleted} dava, ${data.documentsDeleted} belge, ${data.petitionsDeleted} dilekçe`
      );
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Hata");
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  if (!confirm) {
    return (
      <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
        <Trash2 size={12} /> İşle
      </Button>
    );
  }

  return (
    <div className="flex gap-1">
      <Button variant="danger" size="sm" onClick={handleExecute} disabled={loading}>
        {loading ? <Loader2 size={12} className="animate-spin" /> : "Onayla"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
        İptal
      </Button>
    </div>
  );
}
