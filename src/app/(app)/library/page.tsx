"use client";

import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { TEMPLATES } from "@/lib/data/legal";
import { FileText, Plus } from "lucide-react";

const FILTERS = [
  "Tümü", "Tazminat", "İş", "Aile", "Ceza", "Ticari", "İcra", "İdari", "Anayasa", "AİHM",
];

export default function LibraryPage() {
  const toast = useToast();
  return (
    <>
      <Topbar title="Şablon Kütüphanesi" />

      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-[26px]">Şablon Kütüphanesi</h1>
          <p className="text-[var(--color-text-2)] text-[13px] mt-1">
            {TEMPLATES.length} hazır şablon — büronuza özel &quot;altın örnekleri&quot; de
            ekleyebilirsiniz
          </p>
        </div>
        <Button variant="primary">
          <Plus size={14} /> Yeni Şablon
        </Button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f, i) => (
          <div
            key={f}
            className={`px-3 py-1.5 rounded-2xl border text-xs cursor-pointer ${
              i === 0
                ? "border-[var(--color-gold)] text-[var(--color-gold-bright)] bg-[var(--color-gold)]/[0.08]"
                : "border-[var(--color-line)] bg-[var(--color-bg-1)] text-[var(--color-text-2)]"
            }`}
          >
            {f}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {TEMPLATES.map((t) => (
          <Card
            key={t.id}
            onClick={() => toast("Şablon yüklendi")}
            className="cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-11 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)] flex items-center justify-center flex-shrink-0">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[13.5px] mb-1.5 font-sans font-semibold">{t.name}</h4>
                <div className="flex justify-between items-center">
                  <span className="text-[10.5px] bg-[var(--color-bg-3)] text-[var(--color-text-2)] px-2 py-0.5 rounded-xl">
                    {t.category}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-3)]">
                    {t.uses} kez kullanıldı
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
