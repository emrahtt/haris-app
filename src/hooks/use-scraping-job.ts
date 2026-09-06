"use client";

import { useCallback, useRef, useState } from "react";
import type { ScrapedDecision, ScrapingSource } from "@/lib/scraping/types";

export interface JobProgress {
  found: number;
  scraped: number;
  indexed: number;
  failed: number;
}

interface JobState {
  isRunning: boolean;
  progress: JobProgress;
  decisions: ScrapedDecision[];
  currentTitle: string;
  error: string | null;
  done: boolean;
  startedAt: number | null;
  finishedAt: number | null;
}

interface RunInput {
  source: ScrapingSource;
  query?: string;
  limit?: number;
}

const initial: JobState = {
  isRunning: false,
  progress: { found: 0, scraped: 0, indexed: 0, failed: 0 },
  decisions: [],
  currentTitle: "",
  error: null,
  done: false,
  startedAt: null,
  finishedAt: null,
};

export function useScrapingJob() {
  const [state, setState] = useState<JobState>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (input: RunInput) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({
      ...initial,
      isRunning: true,
      startedAt: Date.now(),
    });

    try {
      const res = await fetch("/api/scraping/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as {
              type: string;
              payload: Record<string, unknown>;
            };
            handleEvent(event);
          } catch {
            // satır parse edilemedi, atla
          }
        }
      }

      setState((s) => ({
        ...s,
        isRunning: false,
        done: true,
        finishedAt: Date.now(),
      }));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setState((s) => ({ ...s, isRunning: false }));
        return;
      }
      setState((s) => ({
        ...s,
        isRunning: false,
        error: err instanceof Error ? err.message : "Bilinmeyen hata",
      }));
    }

    function handleEvent(event: { type: string; payload: Record<string, unknown> }) {
      if (event.type === "decision") {
        const decision = event.payload as unknown as ScrapedDecision;
        setState((s) => ({
          ...s,
          decisions: [...s.decisions, decision],
          currentTitle: decision.title || "",
        }));
      } else if (event.type === "progress") {
        const p = event.payload as Record<string, number>;
        setState((s) => ({
          ...s,
          progress: {
            found: p.found ?? s.progress.found,
            scraped: p.scraped ?? s.progress.scraped,
            indexed: p.indexed ?? s.progress.indexed,
            failed: s.progress.failed,
          },
        }));
      } else if (event.type === "indexed") {
        const p = event.payload as Record<string, number>;
        setState((s) => ({
          ...s,
          progress: { ...s.progress, indexed: p.totalIndexed ?? s.progress.indexed },
        }));
      } else if (event.type === "error") {
        const p = event.payload as { errorMessage?: string };
        setState((s) => ({ ...s, error: p.errorMessage || "Hata" }));
      }
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, isRunning: false }));
  }, []);

  const reset = useCallback(() => setState(initial), []);

  return { ...state, run, abort, reset };
}
