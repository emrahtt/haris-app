/**
 * Yargıtay Bedesten adapter — uçtan uca canlı test
 *
 * Kullanım: YGT_SCRAPER_ENABLED=true npx tsx scripts/test-yargitay-live.ts
 */

import { YargitayScraperAdapter } from "../src/lib/scraping/adapters/yargitay";

async function main() {
  process.env.YGT_SCRAPER_ENABLED = "true";
  const adapter = new YargitayScraperAdapter();

  console.log("\n🔍 YargitayScraperAdapter canlı test\n");

  const available = await adapter.isAvailable();
  console.log(`  isAvailable: ${available}`);
  if (!available) {
    console.error("❌ Bedesten erişilemez — network veya env sorunu");
    process.exit(1);
  }

  const job = {
    source: "yargitay" as const,
    query: "trafik kazası maluliyet tazminat",
    limit: 2, // küçük tutalım, rate limit'i zorlamayalım
  };

  console.log(`  Sorgu: "${job.query}", limit: ${job.limit}\n`);

  let count = 0;
  for await (const d of adapter.scrape(job, (p) => {
    if (p.currentTitle) {
      console.log(`  📥 [${p.scraped}/${p.found}] ${p.currentTitle}`);
    } else {
      console.log(`  📊 Toplam ${p.found} sonuç bulundu`);
    }
  })) {
    count++;
    console.log(`\n  ━━━ Karar ${count} ━━━`);
    console.log(`  🏛  ${d.court}`);
    console.log(`  📋  E.${d.esasNo} K.${d.kararNo}  (${d.kararDate})`);
    console.log(`  🏷  Areas: ${d.areas.join(", ")}`);
    console.log(`  📌  Title: ${d.title.slice(0, 100)}`);
    console.log(`  📝  Content: ${d.content.length} karakter`);
    console.log(`  🔖  Tags: ${d.tags.join(", ")}`);
    console.log(`  🔗  Source: ${d.sourceUrl}`);
    console.log(`  💬  İlk 200 char:`);
    console.log(`       ${d.content.slice(0, 200).replace(/\n/g, " ")}`);
  }

  console.log(`\n✅ Test başarılı — ${count} karar gerçek Yargıtay'dan çekildi.\n`);
}

main().catch((err) => {
  console.error("\n💥", err);
  process.exit(1);
});
