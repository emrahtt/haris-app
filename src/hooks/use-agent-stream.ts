"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentId } from "@/lib/ai/prompts";

interface RunOptions {
  agentId: AgentId;
  context: string;
  previousOutputs?: Record<string, string>;
  targetText?: string;
  modelSpec?: string;
}

export interface RagProvenance {
  ids: string[];
  scores: number[];
  count: number;
}

interface RunState {
  text: string;
  isStreaming: boolean;
  isDone: boolean;
  error: string | null;
  duration: number;
  /** RAG retrieval metadata (varsa) */
  rag: RagProvenance | null;
}

/**
 * /api/agents/run endpoint'ini stream olarak çağırır.
 * Response header'larından RAG provenance bilgisini de okur.
 */
export function useAgentStream() {
  const [state, setState] = useState<RunState>({
    text: "",
    isStreaming: false,
    isDone: false,
    error: null,
    duration: 0,
    rag: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const startRef = useRef<number>(0);

  const run = useCallback(async (opts: RunOptions) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    startRef.current = Date.now();
    setState({
      text: "",
      isStreaming: true,
      isDone: false,
      error: null,
      duration: 0,
      rag: null,
    });

    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorBody}`);
      }

      if (!res.body) {
        throw new Error("Stream body alınamadı");
      }

      // RAG provenance header'larını oku
      const ragCount = parseInt(res.headers.get("X-Haris-Rag-Count") || "0", 10);
      const ragIds = res.headers.get("X-Haris-Rag-Ids")?.split(",").filter(Boolean) || [];
      const ragScores =
        res.headers.get("X-Haris-Rag-Scores")?.split(",").map(parseFloat) || [];
      const rag: RagProvenance | null =
        ragCount > 0 ? { count: ragCount, ids: ragIds, scores: ragScores } : null;
      if (rag) setState((s) => ({ ...s, rag }));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setState((s) => ({
          ...s,
          text: accumulated,
          duration: Date.now() - startRef.current,
        }));
      }

      setState((s) => ({
        ...s,
        isStreaming: false,
        isDone: true,
        duration: Date.now() - startRef.current,
      }));

      return accumulated;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState((s) => ({
        ...s,
        isStreaming: false,
        error: err instanceof Error ? err.message : "Bilinmeyen hata",
      }));
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({
      text: "",
      isStreaming: false,
      isDone: false,
      error: null,
      duration: 0,
      rag: null,
    });
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  return { ...state, run, reset, abort };
}
