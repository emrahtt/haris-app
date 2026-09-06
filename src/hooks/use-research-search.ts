"use client";

import { useCallback, useState } from "react";
import type { DocCategory, LegalArea } from "@/lib/rag/corpus";

export interface SearchResultItem {
  id: string;
  title: string;
  category: DocCategory;
  areas: LegalArea[];
  court?: string;
  caseNo?: string;
  date?: string;
  lawName?: string;
  articleNo?: string;
  snippet: string;
  content: string;
  tags: string[];
  score: number;
  semanticScore: number;
  lexicalScore: number;
  matchedTerms: string[];
}

interface SearchOptions {
  query: string;
  categories?: DocCategory[];
  areas?: LegalArea[];
  topK?: number;
}

interface SearchState {
  results: SearchResultItem[];
  isLoading: boolean;
  error: string | null;
  durationMs: number;
  lastQuery: string;
}

export function useResearchSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null,
    durationMs: 0,
    lastQuery: "",
  });

  const search = useCallback(async (opts: SearchOptions) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = await res.json();
      setState({
        results: data.results,
        isLoading: false,
        error: null,
        durationMs: data.durationMs,
        lastQuery: opts.query,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Bilinmeyen hata",
      }));
    }
  }, []);

  const reset = useCallback(
    () =>
      setState({
        results: [],
        isLoading: false,
        error: null,
        durationMs: 0,
        lastQuery: "",
      }),
    []
  );

  return { ...state, search, reset };
}
