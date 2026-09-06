import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { DeadlineCard } from "@/components/shell/deadline-card";
import { DEADLINES } from "@/lib/data/legal";

export default function CalendarPage() {
  return (
    <>
      <Topbar title="Takvim" />
      <div className="mb-6">
        <h1 className="font-serif text-[26px]">Takvim &amp; Süre Yönetimi</h1>
        <p className="text-[var(--color-text-2)] text-[13px] mt-1">
          Tüm davalarınızın süreleri, duruşmaları, hatırlatmaları
        </p>
      </div>
      <Card>
        <h3 className="font-serif text-[var(--color-gold-bright)] mb-4.5 text-lg">
          Yaklaşan Tüm Süreler
        </h3>
        {DEADLINES.map((d, i) => (
          <DeadlineCard key={i} d={d} />
        ))}
      </Card>
    </>
  );
}
