/**
 * Yargıtay Karar Arama Adapter (GERÇEK — Bedesten API)
 *
 * Yargıtay'ın resmi Bedesten arama backend'ine bağlanır.
 * - Endpoint: https://bedesten.adalet.gov.tr/emsal-karar/...
 * - Auth: AdaletApplicationName: UyapMevzuat header (captcha YOK)
 * - Rate limit: 1 req / 3.5s (sunucu sayıyor)
 * - Tüm Yargıtay HD/CD/Genel Kurul kararları erişilebilir
 *
 * Demo fallback:
 * - YGT_SCRAPER_ENABLED env yoksa veya network erişilemezse
 * - DemoScraperAdapter'a delege
 *
 * Production aktivasyon:
 *   YGT_SCRAPER_ENABLED=true (.env.local'a ekleyin)
 */

import type {
  ScraperAdapter,
  ScrapedDecision,
  ScrapingJobInput,
} from "../types";
import { DemoScraperAdapter } from "./demo";
import {
  BedestenClient,
  BedestenRateLimitedError,
  type BedestenSearchInput,
} from "./bedesten-client";
import {
  decodeBedestenContent,
  extractDecisionMetadata,
} from "./yargitay-decoder";
import {
  
  fullNameToChamberCode,
  type YargitayChamberCode,
} from "./yargitay-chambers";

export class YargitayScraperAdapter implements ScraperAdapter {
  readonly source = "yargitay" as const;
  readonly displayName = "Yargıtay Karar Arama (Bedesten)";
  readonly baseUrl = "https://karararama.yargitay.gov.tr";

  private bedesten = new BedestenClient();
  private demoFallback = new DemoScraperAdapter();

  async isAvailable(): Promise<boolean> {
    // Production switch — varsayılan kapalı
    if (process.env.YGT_SCRAPER_ENABLED !== "true") return false;

    // Network kontrolü — küçük gerçek arama (HEAD/GET çalışmıyor, POST gerek)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(
        "https://bedesten.adalet.gov.tr/emsal-karar/searchDocuments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "AdaletApplicationName": "UyapMevzuat",
            "Origin": "https://mevzuat.adalet.gov.tr",
            "Referer": "https://mevzuat.adalet.gov.tr/",
            "User-Agent": "HARIS-LegalAI/0.7 healthcheck",
          },
          body: JSON.stringify({
            data: {
              pageSize: 1,
              pageNumber: 1,
              itemTypeList: ["YARGITAYKARARI"],
              phrase: "test",
              sortFields: ["KARAR_TARIHI"],
              sortDirection: "desc",
            },
            applicationName: "UyapMevzuat",
            paging: true,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  async *scrape(
    job: ScrapingJobInput,
    onProgress: (p: {
      found: number;
      scraped: number;
      currentTitle?: string;
    }) => void
  ): AsyncGenerator<ScrapedDecision, void, unknown> {
    const available = await this.isAvailable();
    if (!available) {
      console.warn(
        "[YargitayScraper] YGT_SCRAPER_ENABLED kapalı veya Bedesten erişilemez — demo'ya fallback"
      );
      for await (const d of this.demoFallback.scrape(job, onProgress)) {
        yield d;
      }
      return;
    }

    yield* this.scrapeFromBedesten(job, onProgress);
  }

  private async *scrapeFromBedesten(
    job: ScrapingJobInput,
    onProgress: (p: {
      found: number;
      scraped: number;
      currentTitle?: string;
    }) => void
  ): AsyncGenerator<ScrapedDecision, void, unknown> {
    const limit = Math.min(job.limit ?? 10, 100);
    const phrase = (job.query || "").trim();
    if (!phrase) {
      throw new Error("Yargıtay scraping için 'query' (phrase) zorunlu");
    }

    // Chamber: filterCourt string'i bir kod ise (örn "H17") kullan
    const chamber =
      job.filterCourt && /^[HC]\d{1,2}$|^(HGK|CGK|BGK|HBK|CBK|ALL)$/.test(job.filterCourt)
        ? (job.filterCourt as YargitayChamberCode)
        : undefined;

    // Tarih: ISO 8601 full datetime
    const dateStart = job.filterDateFrom
      ? `${job.filterDateFrom}T00:00:00Z`
      : undefined;
    const dateEnd = job.filterDateTo ? `${job.filterDateTo}T23:59:59Z` : undefined;

    // Pagination — Bedesten max 10 per page
    let pageNumber = 1;
    let totalScraped = 0;
    let totalFound = 0;
    let firstPage = true;

    while (totalScraped < limit) {
      const remaining = limit - totalScraped;
      const pageSize = Math.min(10, remaining);

      const searchInput: BedestenSearchInput = {
        phrase,
        courtType: "YARGITAYKARARI",
        chamber,
        dateStart,
        dateEnd,
        pageSize,
        pageNumber,
      };

      let searchResult;
      try {
        searchResult = await this.bedesten.searchDocuments(searchInput);
      } catch (err) {
        if (err instanceof BedestenRateLimitedError) {
          throw new Error(
            `Yargıtay rate-limit: ${err.message}. Daha az/limit küçük deneyin.`
          );
        }
        throw err;
      }

      if (firstPage) {
        totalFound = searchResult.total;
        onProgress({ found: totalFound, scraped: 0 });
        firstPage = false;
      }

      if (searchResult.decisions.length === 0) break;

      for (const entry of searchResult.decisions) {
        if (totalScraped >= limit) break;

        // Belge içeriğini çek
        let textContent = "";
        let warnings: string[] = [];
        try {
          const doc = await this.bedesten.getDocument(entry.documentId);
          const decoded = await decodeBedestenContent(doc);
          textContent = decoded.text;
          warnings = decoded.warnings;
        } catch (err) {
          console.warn(
            `[YargitayScraper] Belge ${entry.documentId} alınamadı:`,
            err
          );
          continue;
        }

        // Title üret (entry'den + metadata'dan)
        const extracted = extractDecisionMetadata(textContent);
        const court = entry.birimAdi || extracted.court || "Yargıtay";
        const esasNo = entry.esasNo || extracted.esasNo;
        const kararNo = entry.kararNo || extracted.kararNo;

        // Title çıkarımı:
        // - Esas/Karar başlık satırını atla (zaten metadata'da var)
        // - "MAHKEMESİ", "İçtihat Metni" gibi gürültüyü atla
        // - İlk anlamlı içerik cümlesini al
        const lines = textContent
          .split(/\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 30 && l.length < 300);

        const skipPatterns =
          /^(\d+\.\s+(Hukuk|Ceza)\s+Dairesi|Hukuk\s+Genel|Ceza\s+Genel|MAHKEMESİ|SAYISI|TARİHİ|NUMARASI|"?İçtihat\s+Metni"?)/i;
        const firstContentLine = lines.find((l) => !skipPatterns.test(l));

        // Kısa, anlamlı bir özet: ilk içerik satırından maks 200 char
        const titleBase =
          firstContentLine?.replace(/<[^>]+>/g, "").slice(0, 200).trim() ||
          `${court} E.${esasNo || "?"} K.${kararNo || "?"}`;

        // Court + key concept formatı
        const title = `${court} E.${esasNo}/K.${kararNo} — ${titleBase.slice(0, 140)}`;

        // Hukuk alanı çıkarımı (basit heuristic)
        const areas = inferLegalAreas(textContent, court);

        const decision: ScrapedDecision = {
          jobId: "", // runner set eder
          source: "yargitay",
          sourceId: entry.documentId,
          sourceUrl: `https://karararama.yargitay.gov.tr/?documentId=${entry.documentId}`,
          court,
          esasNo,
          kararNo,
          kararDate: entry.kararTarihi
            ? entry.kararTarihi.slice(0, 10)
            : undefined,
          title,
          content: textContent.slice(0, 50_000), // güvenlik kapağı
          category: "yargitay",
          areas,
          tags: extractTags(phrase, court, areas),
          metadata: {
            bedestenId: entry.documentId,
            chamberCode: fullNameToChamberCode(court),
            kesinlesmeDurumu: entry.kararTuru,
            warnings,
          },
        };

        totalScraped++;
        onProgress({
          found: totalFound,
          scraped: totalScraped,
          currentTitle: title.slice(0, 80),
        });

        yield decision;
      }

      // Sayfanın tamamını okuduk, total'a ulaştıysak dur
      if (totalScraped >= searchResult.total) break;
      pageNumber++;

      // Sayfa başına ek bekleme (sunucuya nazik ol)
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

/* ============================================================
   Helper'lar
   ============================================================ */

function inferLegalAreas(
  text: string,
  court: string
): import("@/lib/rag/corpus").LegalArea[] {
  const areas: import("@/lib/rag/corpus").LegalArea[] = [];
  const lower = (text + " " + court).toLowerCase();

  // Skorla: hangi alanın daha çok eşleşmesi var
  const scores: Record<string, number> = {};
  const count = (re: RegExp) => (lower.match(re) || []).length;

  scores.tazminat = count(/trafik|kaza|maluliyet|zmss|ktk|haksız fiil/g);
  scores.is = count(/kıdem|ihbar|mobbing|işveren|işçi|fesih/g);
  scores.ticari = count(/sözleşme|ttk|tacir|şirket|alacak/g);
  scores.aile = count(/boşanma|velayet|nafaka|mal rejimi|evlilik/g);
  scores.ceza =
    count(/tck|cmk|sanık|meşru|suç/g) + (/Ceza/.test(court) ? 5 : 0);
  scores.icra = count(/icra|iik|haciz|takip|borçlu/g);
  scores.idari = count(/idari|iyuk|idare|işlem iptali/g);

  // En yüksek 2 skoru al (eğer >0 ise)
  const top = Object.entries(scores)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  if (top.length === 0) areas.push("genel");
  else areas.push(...(top as import("@/lib/rag/corpus").LegalArea[]));

  return areas;
}

function extractTags(phrase: string, court: string, areas: string[]): string[] {
  const tags = new Set<string>();

  // Phrase'ten önemli kelimeler
  phrase
    .toLowerCase()
    .replace(/[^a-zçğıöşü0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5)
    .forEach((w) => tags.add(w));

  // Areas
  areas.forEach((a) => tags.add(a));

  // Daire kısaltması
  const chamberMatch = court.match(/(\d+)\.\s+(Hukuk|Ceza)/i);
  if (chamberMatch) {
    tags.add(`${chamberMatch[2].toLowerCase()}-${chamberMatch[1]}`);
  }

  return Array.from(tags);
}
