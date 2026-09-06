"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useScrapingJob } from "@/hooks/use-scraping-job";
import {
  Database,
  Loader2,
  Sparkles,
  StopCircle,
  Check,
  AlertTriangle,
  Activity,
  RotateCcw,
} from "lucide-react";
import type { ScrapingSource } from "@/lib/scraping/types";

interface AdapterInfo {
  source: ScrapingSource;
  displayName: string;
  baseUrl: string;
}

const SOURCE_LABELS: Record<ScrapingSource, string> = {
  demo: "🧪 Demo (Sentetik)",
  yargitay: "🏛 Yargıtay",
  danistay: "🏛 Danıştay",
  aym: "⚖ Anayasa Mahkemesi",
  aihm: "🌍 AİHM",
  mevzuat_gov_tr: "📜 Mevzuat.gov.tr",
};

const PRESET_QUERIES = [
  "trafik kazası tazminat maluliyet",
  "iş kıdem ihbar tazminat",
  "boşanma velayet çocuğun üstün yararı",
  "meşru müdafaa orantılılık",
  "görevi kötüye kullanma somut zarar",
  "ZMSS sigorta doğrudan dava",
];

export function ScrapingConsole() {
  const job = useScrapingJob();
  const [source, setSource] = useState<ScrapingSource>("demo");
  const [query, setQuery] = useState(PRESET_QUERIES[0]);
  const [limit, setLimit] = useState(5);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [stats, setStats] = useState<
    Array<{ source: string; total_decisions_indexed: number; last_run: string | null }>
  >([]);
  const [recentJobs, setRecentJobs] = useState<
    Array<{
      id: string;
      source: string;
      query: string;
      status: string;
      totalIndexed: number;
      finishedAt: string | null;
    }>
  >([]);

  useEffect(() => {
    refresh();
  }, []);

  // Job tamamlanınca recent jobs'u yenile
  useEffect(() => {
    if (job.done) refresh();
  }, [job.done]);

  async function refresh() {
    try {
      const res = await fetch("/api/scraping/jobs");
      const data = await res.json();
      setAdapters(data.adapters || []);
      setStats(data.stats || []);
      setRecentJobs(data.jobs || []);
    } catch {
      // sessiz geç
    }
  }

  function handleStart() {
    if (!query.trim()) return;
    job.run({ source, query, limit });
  }

  const elapsed =
    job.startedAt && job.finishedAt
      ? ((job.finishedAt - job.startedAt) / 1000).toFixed(1)
      : job.startedAt
      ? ((Date.now() - job.startedAt) / 1000).toFixed(1)
      : "0";

  return (
    <div className="space-y-4">
      {/* Configurator */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-[var(--color-gold-bright)] flex items-center gap-2">
            <Database size={18} /> Yargıtay Scraping Console
          </h2>
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RotateCcw size={14} /> Yenile
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_120px] gap-3">
          <div>
            <label className="block text-xs text-[var(--color-text-2)] mb-1.5">
              Kaynak
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as ScrapingSource)}
              disabled={job.isRunning}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-2)] border border-[var(--color-line)] text-sm outline-none"
            >
              {adapters.length > 0
                ? adapters.map((a) => (
                    <option key={a.source} value={a.source}>
                      {SOURCE_LABELS[a.source] || a.displayName}
                    </option>
                  ))
                : Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-2)] mb-1.5">
              Arama Sorgusu
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={job.isRunning}
              placeholder="örn: trafik kazası %32 maluliyet"
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-2)] border border-[var(--color-line)] text-sm outline-none focus:border-[var(--color-gold-soft)]"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-2)] mb-1.5">
              Limit
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10) || 5)}
              disabled={job.isRunning}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-2)] border border-[var(--color-line)] text-sm outline-none"
            />
          </div>
        </div>

        {/* Preset queries */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {PRESET_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              disabled={job.isRunning}
              className={`text-[10.5px] px-2 py-1 rounded-md border transition-colors ${
                query === q
                  ? "border-[var(--color-gold)] text-[var(--color-gold-bright)] bg-[var(--color-gold)]/[0.08]"
                  : "border-[var(--color-line)] text-[var(--color-text-2)] hover:border-[var(--color-gold-soft)]"
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          {!job.isRunning ? (
            <Button variant="primary" onClick={handleStart} disabled={!query.trim()}>
              <Sparkles size={14} /> Scraping Başlat
            </Button>
          ) : (
            <Button variant="danger" onClick={job.abort}>
              <StopCircle size={14} /> Durdur
            </Button>
          )}
          {job.done && (
            <Button variant="ghost" onClick={job.reset}>
              <RotateCcw size={14} /> Sıfırla
            </Button>
          )}
          {(job.isRunning || job.done) && (
            <span className="text-[11px] text-[var(--color-text-3)] ml-auto">
              ⏱ {elapsed}s
            </span>
          )}
        </div>
      </Card>

      {/* Live progress */}
      {(job.isRunning || job.done || job.error) && (
        <Card>
          <h3 className="font-semibold text-[var(--color-gold-bright)] text-[13px] mb-3 flex items-center gap-2">
            <Activity size={14} /> Canlı Akış
            {job.isRunning && (
              <Loader2 size={12} className="animate-spin text-[var(--color-info)]" />
            )}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Metric label="Bulundu" value={job.progress.found} />
            <Metric
              label="Scraped"
              value={job.progress.scraped}
              color="info"
            />
            <Metric
              label="İndekslendi"
              value={job.progress.indexed}
              color="ok"
            />
            <Metric
              label="Hata"
              value={job.progress.failed}
              color={job.progress.failed > 0 ? "danger" : undefined}
            />
          </div>

          {job.currentTitle && job.isRunning && (
            <div className="text-[11.5px] text-[var(--color-text-2)] bg-[var(--color-bg-2)] rounded p-2 mb-3">
              <strong className="text-[var(--color-info)]">⏳ İşleniyor:</strong>{" "}
              {job.currentTitle}
            </div>
          )}

          {job.error && (
            <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-[12px] px-3 py-2 rounded-lg flex items-start gap-2 mb-3">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{job.error}</span>
            </div>
          )}

          {job.done && !job.error && (
            <div className="bg-[var(--color-ok)]/10 border border-[var(--color-ok)]/30 text-[var(--color-ok)] text-[12px] px-3 py-2 rounded-lg flex items-center gap-2 mb-3">
              <Check size={14} /> Job tamamlandı: {job.progress.indexed} karar
              pgvector'a yazıldı, RAG'da artık aranabilir.
            </div>
          )}

          {job.decisions.length > 0 && (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider mb-1">
                Toplanan Kararlar ({job.decisions.length})
              </div>
              {job.decisions.map((d, i) => (
                <div
                  key={i}
                  className="bg-[var(--color-bg-1)] border border-[var(--color-line)] rounded-md p-2.5 text-[11.5px]"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[var(--color-gold-bright)] font-medium">
                      {d.court}
                    </span>
                    <span className="font-mono text-[var(--color-text-2)]">
                      E.{d.esasNo} K.{d.kararNo}
                    </span>
                    {d.kararDate && (
                      <span className="text-[10.5px] text-[var(--color-text-3)]">
                        {d.kararDate}
                      </span>
                    )}
                  </div>
                  <div className="text-[var(--color-text)] line-clamp-2">
                    {d.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Stats */}
      {stats.length > 0 && (
        <Card>
          <h3 className="font-semibold text-[var(--color-gold-bright)] text-[13px] mb-3">
            Kaynak İstatistikleri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats.map((s) => (
              <div
                key={s.source}
                className="bg-[var(--color-bg-2)] rounded-lg p-3"
              >
                <div className="text-[11.5px] text-[var(--color-text-3)]">
                  {SOURCE_LABELS[s.source as ScrapingSource] || s.source}
                </div>
                <div className="font-serif text-2xl text-[var(--color-gold-bright)] font-bold mt-1">
                  {s.total_decisions_indexed || 0}
                </div>
                <div className="text-[10.5px] text-[var(--color-text-3)] mt-1">
                  {s.last_run
                    ? `Son çalışma: ${new Date(s.last_run).toLocaleString("tr-TR")}`
                    : "Henüz çalışmadı"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent jobs */}
      {recentJobs.length > 0 && (
        <Card>
          <h3 className="font-semibold text-[var(--color-gold-bright)] text-[13px] mb-3">
            Son Job&apos;lar
          </h3>
          <div className="space-y-1.5">
            {recentJobs.slice(0, 10).map((j) => (
              <div
                key={j.id}
                className="flex items-center gap-2 text-[11.5px] py-1.5 border-b border-[var(--color-line)] last:border-0"
              >
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    j.status === "done"
                      ? "bg-[var(--color-ok)]/15 text-[var(--color-ok)]"
                      : j.status === "running"
                      ? "bg-[var(--color-info)]/15 text-[var(--color-info)]"
                      : j.status === "failed"
                      ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                      : "bg-[var(--color-bg-3)] text-[var(--color-text-2)]"
                  }`}
                >
                  {j.status}
                </span>
                <span className="text-[var(--color-text-2)]">{j.source}</span>
                <span className="text-[var(--color-text)] truncate flex-1">
                  &quot;{j.query}&quot;
                </span>
                <span className="text-[var(--color-gold-bright)] font-medium">
                  {j.totalIndexed} indeks
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "ok" | "info" | "danger";
}) {
  const colorClass =
    color === "ok"
      ? "text-[var(--color-ok)]"
      : color === "info"
      ? "text-[var(--color-info)]"
      : color === "danger"
      ? "text-[var(--color-danger)]"
      : "text-[var(--color-gold-bright)]";

  return (
    <div className="bg-[var(--color-bg-2)] rounded-lg p-3 text-center">
      <div className={`font-serif text-2xl font-bold ${colorClass}`}>
        {value}
      </div>
      <div className="text-[10.5px] text-[var(--color-text-3)] uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
