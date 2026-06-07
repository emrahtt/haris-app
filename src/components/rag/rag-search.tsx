"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  useResearchSearch,
  type SearchResultItem,
} from "@/hooks/use-research-search";
import type { DocCategory } from "@/lib/rag/corpus";
import {
  Search,
  Sparkles,
  Zap,
  Loader2,
  ExternalLink,
  Database,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface CategoryFilter {
  id: DocCategory | "all";
  label: string;
}

const FILTERS: CategoryFilter[] = [
  { id: "all", label: "Tümü" },
  { id: "yargitay", label: "Yargıtay" },
  { id: "aym", label: "AYM" },
  { id: "aihm", label: "AİHM" },
  { id: "mevzuat", label: "Mevzuat" },
  { id: "doktrin", label: "Doktrin" },
];

interface Props {
  defaultQuery?: string;
  /** Yargıtay/AYM rozetleri için sayım gösterimi */
  showIndexStatus?: boolean;
}

export function RagSearch({ defaultQuery, showIndexStatus = true }: Props) {
  const [query, setQuery] = useState(defaultQuery || "");
  const [activeFilter, setActiveFilter] = useState<DocCategory | "all">("all");
  const [indexInfo, setIndexInfo] = useState<{
    docCount: number;
    embeddingProvider: string;
    embeddingDim: number;
    backend: string;
  } | null>(null);

  const { results, isLoading, error, durationMs, lastQuery, search } =
    useResearchSearch();
  const toast = useToast();

  // İndeks durumunu yükle
  useEffect(() => {
    fetch("/api/research/index")
      .then((r) => r.json())
      .then((d) =>
        setIndexInfo({
          docCount: d.docCount,
          embeddingProvider: d.embeddingProvider,
          embeddingDim: d.embeddingDim,
          backend: d.backend,
        })
      )
      .catch(() => null);
  }, []);

  // İlk yüklemede default sorgu varsa otomatik ara
  useEffect(() => {
    if (defaultQuery && defaultQuery.length > 2) {
      handleSearch(defaultQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultQuery]);

  function handleSearch(q?: string) {
    const finalQuery = q ?? query;
    if (finalQuery.trim().length < 2) {
      toast("Lütfen en az 2 karakterlik bir sorgu girin");
      return;
    }
    search({
      query: finalQuery,
      categories: activeFilter === "all" ? undefined : [activeFilter],
      topK: 15,
    });
  }

  function handleEnter(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <>
      {/* Status badge */}
      {showIndexStatus && indexInfo && (
        <div className="mb-4 flex items-center gap-2 text-[11.5px] text-[var(--color-text-3)]">
          <Database size={12} className="text-[var(--color-gold-bright)]" />
          <span>
            <strong className="text-[var(--color-text-2)]">{indexInfo.docCount}</strong>{" "}
            kürate edilmiş kaynak •{" "}
            <span className="font-mono">{indexInfo.embeddingProvider}</span>
            {" • "}
            <span className={
              indexInfo.backend === "pgvector"
                ? "text-[var(--color-ok)] font-medium"
                : "text-[var(--color-warn)]"
            }>
              backend: {indexInfo.backend === "pgvector" ? "pgvector ⚡" : "in-memory"}
            </span>
          </span>
        </div>
      )}

      {/* Search box */}
      <Card className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-3)] pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleEnter}
              placeholder="Doğal dilde sorun: 'Trafik kazasında %32 maluliyet için emsal Yargıtay kararları'"
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--color-bg-2)] border border-[var(--color-line)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-gold-soft)]"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => handleSearch()}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Ara
          </Button>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setActiveFilter(f.id);
                if (lastQuery) {
                  search({
                    query: lastQuery,
                    categories: f.id === "all" ? undefined : [f.id],
                    topK: 15,
                  });
                }
              }}
              className={`px-3 py-1.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                activeFilter === f.id
                  ? "border-[var(--color-gold)] text-[var(--color-gold-bright)] bg-[var(--color-gold)]/[0.08]"
                  : "border-[var(--color-line)] bg-[var(--color-bg-1)] text-[var(--color-text-2)] hover:border-[var(--color-gold-soft)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Errors */}
      {error && (
        <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-[13px] px-4 py-3 rounded-lg mb-4">
          ⚠ {error}
        </div>
      )}

      {/* Results */}
      {results.length === 0 && !isLoading && lastQuery && !error && (
        <Card className="text-center py-10 text-[var(--color-text-3)]">
          <Search size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">&ldquo;{lastQuery}&rdquo; için sonuç bulunamadı.</p>
          <p className="text-xs mt-2">
            Farklı anahtar kelime deneyin veya kategori filtrelerini kaldırın.
          </p>
        </Card>
      )}

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3 text-[12px] text-[var(--color-text-2)]">
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-[var(--color-gold-bright)]" />
              <strong className="text-[var(--color-text)]">{results.length}</strong> sonuç
              bulundu{" "}
              <span className="text-[var(--color-text-3)]">
                ({durationMs}ms — hybrid semantic + lexical)
              </span>
            </div>
          </div>

          {results.map((r) => (
            <ResultCard key={r.id} item={r} />
          ))}
        </>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="!py-3">
              <div className="animate-pulse">
                <div className="h-3 bg-[var(--color-bg-3)] rounded w-1/3 mb-2" />
                <div className="h-4 bg-[var(--color-bg-3)] rounded w-3/4 mb-3" />
                <div className="h-2 bg-[var(--color-bg-3)] rounded w-full mb-1" />
                <div className="h-2 bg-[var(--color-bg-3)] rounded w-5/6" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ResultCard({ item }: { item: SearchResultItem }) {
  const [expanded, setExpanded] = useState(false);
  const toast = useToast();

  const categoryLabel = {
    yargitay: "Yargıtay",
    danistay: "Danıştay",
    aym: "AYM",
    aihm: "AİHM",
    mevzuat: "Mevzuat",
    doktrin: "Doktrin",
  }[item.category];

  const categoryColor = {
    yargitay: "text-[var(--color-gold-bright)] bg-[var(--color-gold)]/15",
    danistay: "text-[var(--color-gold-bright)] bg-[var(--color-gold)]/15",
    aym: "text-[var(--color-info)] bg-[var(--color-info)]/15",
    aihm: "text-[var(--color-info)] bg-[var(--color-info)]/15",
    mevzuat: "text-[var(--color-ok)] bg-[var(--color-ok)]/15",
    doktrin: "text-[var(--color-warn)] bg-[var(--color-warn)]/15",
  }[item.category];

  const scoreColor =
    item.score >= 0.7
      ? "text-[var(--color-ok)]"
      : item.score >= 0.4
      ? "text-[var(--color-gold-bright)]"
      : "text-[var(--color-text-3)]";

  return (
    <div className="bg-[var(--color-bg-1)] border border-[var(--color-line)] rounded-xl p-4 mb-2.5 hover:border-[var(--color-gold-soft)] transition-colors">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${categoryColor}`}>
          {categoryLabel}
        </span>
        {item.court && (
          <span className="text-[11px] text-[var(--color-text-2)] font-medium">
            {item.court}
          </span>
        )}
        {item.lawName && (
          <span className="text-[11px] text-[var(--color-text-2)] font-medium">
            {item.lawName}
          </span>
        )}
        {(item.caseNo || item.articleNo) && (
          <span className="text-xs text-[var(--color-text-3)] font-mono">
            {item.caseNo || item.articleNo}
          </span>
        )}
        {item.date && (
          <span className="text-[11.5px] text-[var(--color-text-3)]">{item.date}</span>
        )}
        <div className={`ml-auto flex items-center gap-1 text-[11px] font-medium ${scoreColor}`}>
          <Zap size={11} /> %{(item.score * 100).toFixed(0)}
        </div>
      </div>

      <div className="text-[13.5px] font-medium mb-1.5">{item.title}</div>
      <div className="text-[12.5px] text-[var(--color-text-2)] leading-6">
        {expanded ? item.content : `${item.snippet}...`}
      </div>

      {/* Eşleşen terimler */}
      {item.matchedTerms.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[10.5px]">
          <span className="text-[var(--color-text-3)]">Eşleşen:</span>
          {item.matchedTerms.map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold-bright)] font-mono"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3 text-[10.5px] text-[var(--color-text-3)]">
          <span>
            Sem: <strong className="text-[var(--color-text-2)]">
              {(item.semanticScore * 100).toFixed(0)}%
            </strong>
          </span>
          <span>
            Lex: <strong className="text-[var(--color-text-2)]">
              {(item.lexicalScore * 100).toFixed(0)}%
            </strong>
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="px-2.5 py-1 rounded-md text-[11px] text-[var(--color-text-2)] hover:bg-[var(--color-bg-2)] flex items-center gap-1"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {expanded ? "Daralt" : "Tam metin"}
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${item.title}\n${item.court || item.lawName} ${item.caseNo || item.articleNo}\n${item.content}`
              );
              toast("Kaynak panoya kopyalandı");
            }}
            className="px-2.5 py-1 rounded-md text-[11px] text-[var(--color-text-2)] hover:bg-[var(--color-bg-2)] flex items-center gap-1"
          >
            <ExternalLink size={11} /> Kopyala
          </button>
        </div>
      </div>
    </div>
  );
}
