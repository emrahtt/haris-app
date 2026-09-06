import Link from "next/link";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseRow } from "@/components/shell/case-row";
import { DeadlineCard } from "@/components/shell/deadline-card";
import { listCases } from "@/lib/data/cases-db";
import { DEADLINES } from "@/lib/data/legal";
import { AGENT_ACTIVITIES, AGENTS } from "@/lib/data/agents";
import {
  Folder,
  Brain,
  FileText,
  Scale,
  Calendar,
  Sparkles,
  Library,
  Search,
  Plus,
  Eye,
  Flame,
} from "lucide-react";

const ACTIVITY_ICONS = {
  Brain,
  Eye,
  Scale,
  FileText,
  Search,
  Library,
  Flame,
  Sparkles,
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cases = await listCases();

  return (
    <>
      <Topbar title="Gösterge Paneli" />

      <div className="mb-2">
        <h1 className="font-serif text-[28px] mb-1">Günaydın, Av. Ayşe ✦</h1>
        <p className="text-[var(--color-text-2)] text-[13.5px]">
          Bugün <strong className="text-[var(--color-danger)]">3 acil süre</strong>,{" "}
          <strong className="text-[var(--color-gold-bright)]">2 yeni ajan analizi</strong>{" "}
          ve 1 müvekkil mesajı bekliyor.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
        {[
          { lbl: "Aktif Dava", val: "14", delta: "↑ Bu ay 3 yeni", Icon: Folder },
          {
            lbl: "AI Çalışma Saati (Tasarruf)",
            val: "347",
            unit: "sa",
            delta: "↑ 28 saat geçen haftaya göre",
            Icon: Brain,
          },
          {
            lbl: "Üretilen Dilekçe",
            val: "82",
            delta: "Bu yıl • %94 onay oranı",
            Icon: FileText,
          },
          {
            lbl: "Kazanma Oranı",
            val: "87",
            unit: "%",
            delta: "↑ Sektör ortalaması: %62",
            Icon: Scale,
          },
        ].map((s) => {
          const Icon = s.Icon;
          return (
            <div
              key={s.lbl}
              className="bg-[var(--color-bg-1)] border border-[var(--color-line)] rounded-xl p-4.5 relative overflow-hidden"
            >
              <Icon
                size={20}
                className="absolute top-3.5 right-3.5 opacity-20 text-[var(--color-gold)]"
              />
              <div className="text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.08em] mb-2">
                {s.lbl}
              </div>
              <div className="font-serif text-[32px] font-bold">
                {s.val}
                {s.unit && (
                  <span className="text-sm text-[var(--color-text-3)]">{s.unit}</span>
                )}
              </div>
              <div className="text-[11px] text-[var(--color-ok)] mt-1.5">{s.delta}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4.5 mt-5">
        {/* Sol Sütun */}
        <div className="space-y-4.5">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-sans font-semibold flex items-center gap-2">
                <Folder size={16} className="text-[var(--color-gold-bright)]" /> Aktif
                Davalar
              </h3>
              <Link
                href="/cases"
                className="text-[var(--color-text-3)] text-xs hover:text-[var(--color-gold-bright)]"
              >
                Tümünü gör →
              </Link>
            </div>
            {cases.slice(0, 4).map((c) => (
              <CaseRow key={c.id} caseItem={c} />
            ))}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-sans font-semibold flex items-center gap-2">
                <Calendar size={16} className="text-[var(--color-gold-bright)]" /> Yaklaşan
                Süreler
              </h3>
              <Link
                href="/calendar"
                className="text-[var(--color-text-3)] text-xs hover:text-[var(--color-gold-bright)]"
              >
                Takvime git →
              </Link>
            </div>
            {DEADLINES.slice(0, 3).map((d, i) => (
              <DeadlineCard key={i} d={d} />
            ))}
          </Card>
        </div>

        {/* Sağ Sütun */}
        <div className="space-y-4.5">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-sans font-semibold">🤖 Canlı AI Aktivitesi</h3>
              <span className="text-[11px] text-[var(--color-ok)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ok)] shadow-[0_0_8px_var(--color-ok)] animate-pulse-dot" />
                4 ajan çalışıyor
              </span>
            </div>
            {AGENT_ACTIVITIES.slice(0, 4).map((act) => {
              const agent = AGENTS.find((a) => a.id === act.agentId);
              if (!agent) return null;
              const Icon =
                ACTIVITY_ICONS[agent.icon as keyof typeof ACTIVITY_ICONS] || Brain;
              return (
                <div
                  key={act.agentId}
                  className="flex items-start gap-3 py-3 border-b border-[var(--color-line)] last:border-0"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      act.status === "working"
                        ? "bg-[var(--color-info)]/15 text-[var(--color-info)]"
                        : "bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)]"
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium">{agent.name}</div>
                    <div className="text-[11.5px] text-[var(--color-text-2)] mt-0.5">
                      {act.task}
                    </div>
                    <div className="text-[10.5px] text-[var(--color-text-3)] mt-1">
                      {act.timeAgo}
                    </div>
                  </div>
                </div>
              );
            })}
            <Link href="/agents">
              <Button variant="ghost" className="w-full justify-center mt-3">
                Tüm Ajan Aktivitesi →
              </Button>
            </Link>
          </Card>

          <Card>
            <h3 className="text-[15px] font-sans font-semibold mb-4">
              <Sparkles
                size={16}
                className="inline text-[var(--color-gold-bright)] mr-2"
              />
              Hızlı İşlem
            </h3>
            <Link href="/cases/new">
              <Button variant="primary" className="w-full justify-center mb-2">
                <Plus size={14} /> Yeni Dava Aç
              </Button>
            </Link>
            <Link href="/research">
              <Button variant="ghost" className="w-full justify-center mb-2">
                <Search size={14} /> İçtihat Ara
              </Button>
            </Link>
            <Link href="/library">
              <Button variant="ghost" className="w-full justify-center">
                <Library size={14} /> Şablon Kütüphanesi
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
