/**
 * HARIS Corpus Indexing Script
 *
 * Kullanım:
 *   npm run rag:index
 *
 * Ön koşul:
 *   .env.local'de SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + OPENAI_API_KEY
 *
 * Yaptığı:
 *   1. Korpus belgelerini batch olarak embed et (OpenAI text-embedding-3-small)
 *   2. rag_documents tablosuna upsert et
 *   3. Sayım ve istatistik raporla
 */

import { createClient } from "@supabase/supabase-js";
import { CORPUS } from "../src/lib/rag/corpus";
import { embedBatch } from "../src/lib/rag/embeddings";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli");
    console.error("   .env.local dosyasını kontrol edin");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠ OPENAI_API_KEY yok — demo hash embedding (256d) kullanılacak");
    console.warn("  Production için OpenAI key eklenmesi şiddetle önerilir");
  }

  console.log(`\n🔍 HARIS Corpus İndeksleme Başladı`);
  console.log(`   Belge sayısı: ${CORPUS.length}`);
  console.log(`   Hedef: ${url}\n`);

  const supabase = createClient(url, key);

  // Tablo var mı kontrol
  const { error: checkErr } = await supabase
    .from("rag_documents")
    .select("id", { count: "exact", head: true });

  if (checkErr) {
    console.error("❌ rag_documents tablosu bulunamadı.");
    console.error("   Önce migration'ı çalıştırın:");
    console.error("   supabase/migrations/0002_pgvector_rag.sql\n");
    console.error("   Hata:", checkErr.message);
    process.exit(1);
  }

  console.log(`📊 Embedding üretiliyor (${CORPUS.length} belge)...`);
  const startEmbed = Date.now();

  const texts = CORPUS.map((d) =>
    [
      d.title,
      d.lawName || "",
      d.articleNo || "",
      d.court || "",
      d.tags.join(" "),
      d.content,
    ]
      .filter(Boolean)
      .join(". ")
  );

  const embeddings = await embedBatch(texts);
  console.log(
    `   ✓ ${embeddings.length} embedding üretildi (${
      (Date.now() - startEmbed) / 1000
    }s)`
  );
  console.log(`   ✓ Boyut: ${embeddings[0]?.length} dimension\n`);

  // Batch upsert (50'lik chunklar)
  console.log(`💾 Supabase'e yazılıyor...`);
  const startUpsert = Date.now();
  const BATCH_SIZE = 50;
  let successCount = 0;

  for (let i = 0; i < CORPUS.length; i += BATCH_SIZE) {
    const slice = CORPUS.slice(i, i + BATCH_SIZE);
    const rows = slice.map((d, j) => ({
      id: d.id,
      category: d.category,
      areas: d.areas,
      court: d.court || null,
      case_no: d.caseNo || null,
      date: d.date || null,
      article_no: d.articleNo || null,
      law_name: d.lawName || null,
      title: d.title,
      content: d.content,
      tags: d.tags,
      url: d.url || null,
      embedding: embeddings[i + j],
    }));

    const { error } = await supabase
      .from("rag_documents")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} hatası:`, error.message);
    } else {
      successCount += slice.length;
      process.stdout.write(`   ✓ ${successCount}/${CORPUS.length} yüklendi\r`);
    }
  }

  console.log(
    `\n   ✓ ${successCount} belge yüklendi (${(Date.now() - startUpsert) / 1000}s)\n`
  );

  // Final sayım
  const { count } = await supabase
    .from("rag_documents")
    .select("*", { count: "exact", head: true });

  console.log(`🎉 İndeksleme tamamlandı!`);
  console.log(`   Toplam veritabanı: ${count} belge`);
  console.log(`   HNSW index aktif — sorgu süresi ~5-20 ms\n`);
}

main().catch((err) => {
  console.error("\n💥 Hata:", err);
  process.exit(1);
});
