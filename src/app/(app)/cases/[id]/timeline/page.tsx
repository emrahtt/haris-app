import { Card } from "@/components/ui/card";
import { DeadlineCard } from "@/components/shell/deadline-card";
import { AlertTriangle, Calendar, Check } from "lucide-react";

const CASE_DEADLINES = [
  { date: "28", mon: "May", title: "Cevap dilekçesi son günü", sub: "HMK m.127 — 2 hafta süre", days: 12, level: "warn" as const },
  { date: "15", mon: "Haz", title: "Ön İnceleme Duruşması", sub: "İstanbul 7. Asliye Hukuk Mh. — Saat 10:00", days: 30, level: "normal" as const },
  { date: "8", mon: "Tem", title: "Tanık dinleme duruşması", sub: "3 tanık beyanı + müvekkilin beyanı", days: 53, level: "normal" as const },
  { date: "12", mon: "Eyl", title: "Bilirkişi raporu beklenen tarih", sub: "Trafik bilirkişisi — kusur ve maluliyet", days: 119, level: "normal" as const },
  { date: "5", mon: "Kas", title: "Esas hakkında savunma — son duruşma", sub: "Karar duruşması bekleniyor", days: 173, level: "normal" as const },
];

export default function TimelinePage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4.5">
      <Card>
        <h3 className="font-serif text-[var(--color-gold-bright)] mb-4.5 text-lg">
          Süre Takibi & Duruşma Takvimi
        </h3>
        {CASE_DEADLINES.map((d, i) => (
          <DeadlineCard key={i} d={d} />
        ))}
      </Card>

      <div className="space-y-3.5">
        <Card>
          <h3 className="font-serif text-[var(--color-gold-bright)] text-[15px] mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> AI Süre Uyarıları
          </h3>
          <div className="p-2.5 rounded-md mb-2 border-l-[3px] border-[var(--color-danger)] bg-[var(--color-danger)]/[0.06] text-xs">
            <strong className="block mb-0.5">HMK m.127 — 2 hafta süre</strong>
            <p className="text-[var(--color-text-2)] text-[11.5px] m-0">
              Cevaba cevap dilekçesi 28 Mayıs&apos;a kadar verilmeli. AI dilekçeyi hazır etti.
            </p>
          </div>
          <div className="p-2.5 rounded-md border-l-[3px] border-[var(--color-warn)] bg-[var(--color-warn)]/[0.06] text-xs">
            <strong className="block mb-0.5">HMK m.139 — Ön inceleme zorunlu</strong>
            <p className="text-[var(--color-text-2)] text-[11.5px] m-0">
              15 Haziran ön inceleme duruşmasına müvekkilin katılımı zorunlu (HMK m.140).
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="font-serif text-[var(--color-gold-bright)] text-[15px] mb-3 flex items-center gap-2">
            <Calendar size={14} /> Otomatik Hatırlatmalar
          </h3>
          <div className="text-[12.5px] text-[var(--color-text-2)] leading-7">
            {[
              "7 gün önce e-posta + SMS",
              "3 gün önce push notification",
              "1 gün önce telefon araması",
              "Sabah 08:00 günlük özet",
            ].map((t, i) => (
              <div
                key={i}
                className="py-2 border-b border-[var(--color-line)] last:border-0 flex items-center gap-2"
              >
                <Check size={12} className="text-[var(--color-ok)]" /> {t}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
