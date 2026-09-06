/**
 * HARIS Scraping — Tip Tanımları
 */

import type { DocCategory, LegalArea } from "@/lib/rag/corpus";

export type ScrapingSource =
  | "yargitay"
  | "danistay"
  | "aym"
  | "aihm"
  | "mevzuat_gov_tr"
  | "demo";

export type JobStatus =
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export interface ScrapingJobInput {
  source: ScrapingSource;
  query?: string;
  filterCourt?: string;
  filterDateFrom?: string; // ISO
  filterDateTo?: string;
  /** Maks. kaç karar */
  limit?: number;
  triggerType?: "manual" | "cron" | "api";
  triggeredBy?: string; // userId
}

export interface ScrapingJob extends ScrapingJobInput {
  id: string;
  status: JobStatus;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  totalFound: number;
  totalScraped: number;
  totalIndexed: number;
  totalFailed: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface ScrapedDecision {
  id?: string; // DB tarafından üretilir
  jobId: string;
  source: ScrapingSource;
  sourceId?: string;
  sourceUrl?: string;
  court: string;
  esasNo?: string;
  kararNo?: string;
  kararDate?: string; // YYYY-MM-DD
  title: string;
  content: string;
  /** RAG corpus için sınıflandırma */
  category: DocCategory;
  areas: LegalArea[];
  tags: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Scraper Adapter Interface
 *
 * Her kaynak (Yargıtay, Danıştay, AYM, vb.) bu interface'i implement eder.
 * Demo adapter sentetik veri üretir.
 */
export interface ScraperAdapter {
  readonly source: ScrapingSource;
  readonly displayName: string;
  readonly baseUrl: string;
  /** Tek bir job çalıştır, decision'ları stream et */
  scrape(
    job: ScrapingJobInput,
    onProgress: (progress: {
      found: number;
      scraped: number;
      currentTitle?: string;
    }) => void
  ): AsyncGenerator<ScrapedDecision, void, unknown>;
  /** Bu kaynağa erişilebilir mi? (API key, network vb.) */
  isAvailable(): Promise<boolean>;
}

export interface ScrapingStats {
  source: ScrapingSource;
  totalJobs: number;
  completedJobs: number;
  runningJobs: number;
  failedJobs: number;
  totalDecisionsIndexed: number;
  lastRun: string | null;
}
