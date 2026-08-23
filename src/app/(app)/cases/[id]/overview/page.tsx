import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCaseFromDb as getCase } from "@/lib/data/cases-db";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4.5">
      <Card>
        <h3 className="font-serif text-[var(--color-gold-bright)] mb-3.5">Olay Özeti</h3>
        <p className="text-[var(--color-text-2)] leading-7 text-[13.5px] mb-3 whitespace-pre-wrap">
          {c.summary ||
            "Bu dava için henüz detaylı bir özet yok. V2 Matter'dan «V1'e Aktar» ile sohbet, belgeler ve dilekçe buraya kopyalanır. Mahkeme / esas bilgisi V1 üst başlıktan düzenlenir."}
        </p>
        <p className="text-[11px] text-[var(--color-text-3)]">
          Mahkeme: {c.court || "seçilmedi"} · Esas: {c.esasNo || "—"} · Tür:{" "}
          {c.caseType}
        </p>
        {c.maddi && c.manevi && (
          <>
            <h3 className="font-serif text-[var(--color-gold-bright)] mt-6 mb-3.5">
              Talep Edilen
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-[var(--color-bg-2)] rounded-lg">
                <div className="text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.08em]">
                  Maddi Tazminat
                </div>
                <div className="font-serif text-[22px] text-[var(--color-gold-bright)] font-bold mt-1">
                  {c.maddi.toLocaleString("tr-TR")} ₺
                </div>
                <div className="text-[11px] text-[var(--color-text-2)] mt-1">
                  Tedavi + kazanç kaybı + iş göremezlik
                </div>
              </div>
              <div className="p-3.5 bg-[var(--color-bg-2)] rounded-lg">
                <div className="text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.08em]">
                  Manevi Tazminat
                </div>
                <div className="font-serif text-[22px] text-[var(--color-gold-bright)] font-bold mt-1">
                  {c.manevi.toLocaleString("tr-TR")} ₺
                </div>
                <div className="text-[11px] text-[var(--color-text-2)] mt-1">
                  Acı, ızdırap, yaşam kalitesi kaybı
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <div className="space-y-3.5">
        {c.valueRange && (
          <Card>
            <h3 className="font-serif text-[var(--color-gold-bright)] mb-3">
              AI Tavsiye Aralığı
            </h3>
            <div className="text-center py-3.5">
              <div className="font-serif text-2xl text-[var(--color-text)] font-bold">
                {c.valueRange}
              </div>
              <div className="text-[11px] text-[var(--color-text-3)] mt-1">
                12 emsal Yargıtay 4. HD kararı baz alındı
              </div>
            </div>
            <div className="mt-2.5 p-2.5 bg-[var(--color-ok)]/[0.06] rounded-md text-xs text-[var(--color-text-2)]">
              <strong className="text-[var(--color-ok)]">↑ Talebinizi artırabilirsiniz</strong>{" "}
              — emsal kararlar ortalama %38 daha yüksek miktarlara hükmediyor.
            </div>
          </Card>
        )}

        <Card>
          <h3 className="font-serif text-[var(--color-gold-bright)] mb-3">
            Kritik Belgeler
          </h3>
          <div className="text-[12.5px] text-[var(--color-text-2)]">
            {[
              ["Kaza Tespit Tutanağı", "kusur belirleyici"],
              ["ATK Maluliyet Raporu", "%32 sürekli"],
              ["Hastane Faturaları", "247.000 ₺"],
              ["Müvekkil Maaş Bordroları", "12 aylık"],
            ].map(([n, tag]) => (
              <div
                key={n}
                className="py-2 border-b border-[var(--color-line)] last:border-0 flex justify-between"
              >
                <strong className="text-[var(--color-text)] text-[12.5px]">{n}</strong>
                <span className="text-[var(--color-gold-bright)] text-[11px]">{tag}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
