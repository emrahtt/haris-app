/**
 * HARIS Scraping — Adapter Registry
 *
 * Hangi kaynak için hangi adapter? Tek noktadan yönetim.
 */

import type { ScraperAdapter, ScrapingSource } from "./types";
import { DemoScraperAdapter } from "./adapters/demo";
import { YargitayScraperAdapter } from "./adapters/yargitay";

const adapters: Partial<Record<ScrapingSource, ScraperAdapter>> = {
  demo: new DemoScraperAdapter(),
  yargitay: new YargitayScraperAdapter(),
  // Faz 7+: danistay, aym, aihm, mevzuat_gov_tr eklenecek
};

export function getAdapter(source: ScrapingSource): ScraperAdapter {
  const adapter = adapters[source];
  if (!adapter) {
    // Bilinmeyen veya henüz implement edilmemiş → demo
    return adapters.demo!;
  }
  return adapter;
}

export function listAdapters() {
  return Object.entries(adapters).map(([source, a]) => ({
    source: source as ScrapingSource,
    displayName: a!.displayName,
    baseUrl: a!.baseUrl,
  }));
}
