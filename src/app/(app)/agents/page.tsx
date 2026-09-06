import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { AGENTS, AGENT_ACTIVITIES } from "@/lib/data/agents";
import { AIModeBanner, AIInfoFootnote } from "@/components/agents/ai-mode-banner";
import {
  Brain,
  Eye,
  Scale,
  FileText,
  Search,
  Library,
  Clock,
  AlertTriangle,
  Shield,
  Sparkles,
  Flame,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Brain,
  Eye,
  Scale,
  FileText,
  Search,
  Library,
  Clock,
  AlertTriangle,
  Shield,
  Sparkles,
  Flame,
};

export default function AgentsPage() {
  return (
    <>
      <Topbar title="AI Ajan Paneli" />

      <div className="mb-6">
        <h1 className="font-serif text-[28px]">AI Ajan Aktivite Paneli</h1>
        <p className="text-[var(--color-text-2)] text-[13.5px] mt-1">
          12 ajan • Şu anda 4&apos;ü çalışıyor • Toplam bu hafta 347 görev tamamlandı
        </p>
      </div>

      <AIModeBanner />

      <AIInfoFootnote />
      <Card className="mt-3">
        <div className="grid grid-cols-[40px_1fr_100px_80px] gap-3.5 py-2 border-b border-[var(--color-line)] text-[11px] text-[var(--color-text-3)] uppercase tracking-[0.08em] font-semibold">
          <div />
          <div>Ajan / Görev</div>
          <div>Durum</div>
          <div className="text-right">İlerleme</div>
        </div>

        {AGENTS.map((a) => {
          const activity = AGENT_ACTIVITIES.find((x) => x.agentId === a.id);
          if (!activity) return null;
          const Icon = ICONS[a.icon] || Brain;
          const statusColors = {
            working: "bg-[var(--color-info)]/15 text-[var(--color-info)]",
            done: "bg-[var(--color-ok)]/15 text-[var(--color-ok)]",
            idle: "bg-[var(--color-bg-3)] text-[var(--color-text-3)]",
          };
          const statusLabels = { working: "Çalışıyor", done: "Tamamlandı", idle: "Boşta" };

          return (
            <div
              key={a.id}
              className="grid grid-cols-[40px_1fr_100px_80px] gap-3.5 py-3 border-b border-[var(--color-line)] last:border-0 items-center"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  statusColors[activity.status]
                }`}
              >
                <Icon size={14} />
              </div>
              <div>
                <div className="text-[13px] font-medium">{a.name}</div>
                <div className="text-[11.5px] text-[var(--color-text-2)] mt-0.5">
                  {activity.task}
                </div>
              </div>
              <div
                className={`text-[11px] px-2.5 py-0.5 rounded-xl text-center ${
                  statusColors[activity.status]
                }`}
              >
                {statusLabels[activity.status]}
              </div>
              <div className="text-right">
                <div className="text-[11.5px] text-[var(--color-gold-bright)] font-medium mb-1">
                  {activity.progress}%
                </div>
                <div className="w-full h-1 bg-[var(--color-bg-3)] rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--color-gold-soft)] to-[var(--color-gold-bright)] transition-all"
                    style={{ width: `${activity.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 mt-4.5">
        <Card>
          <h3 className="font-serif text-[var(--color-gold-bright)] text-[16px] mb-3.5">
            Bu Hafta Performans
          </h3>
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { v: "347", l: "Görev tamamlandı", c: "var(--color-gold-bright)" },
              { v: "99.2%", l: "Doğruluk oranı", c: "var(--color-ok)" },
              { v: "3.4dk", l: "Ortalama yanıt", c: "var(--color-info)" },
              { v: "0", l: "Hallucination", c: "var(--color-text)" },
            ].map((s) => (
              <div key={s.l} className="text-center p-3.5 bg-[var(--color-bg-2)] rounded-lg">
                <div className="font-serif text-[28px] font-bold" style={{ color: s.c }}>
                  {s.v}
                </div>
                <div className="text-[11px] text-[var(--color-text-2)]">{s.l}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-serif text-[var(--color-gold-bright)] text-[16px] mb-3.5">
            Adversarial Red-Team Skoru
          </h3>
          <p className="text-[12.5px] text-[var(--color-text-2)] mb-4">
            Karşı taraf simülatörünün ürettiği saldırılar ve savunma ekibinin başarı oranı:
          </p>
          {[
            ["Bu hafta üretilen saldırı", "128", 100, "var(--color-danger)"],
            ["Savuşturulan", "122 (%95)", 95, "var(--color-ok)"],
            ["Dilekçeye işlenen iyileştirme", "87", 68, "var(--color-gold-bright)"],
          ].map(([label, val, pct, color]) => (
            <div key={label as string} className="mb-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span>{label}</span>
                <strong style={{ color: color as string }}>{val}</strong>
              </div>
              <div className="w-full h-1 bg-[var(--color-bg-3)] rounded-sm overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: color as string }}
                />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
