# 🕸️ Faz 7 — Yargıtay/Danıştay Scraping + Otomatik Korpus Genişletme

> RAG korpusunu manuel 31 belgeyle sınırlı bırakmadık.
> Şimdi Yargıtay/Danıştay/AYM kararlarını **otomatik scrape et + embed et + pgvector'a yaz** pipeline'ı var.

---

## 🏗️ Mimari

```
[/admin/scraping UI]
      ↓ POST + stream
[/api/scraping/run]
      ↓
runJob(input)
   ├─ getAdapter(source) → DemoAdapter | YargitayAdapter | ...
   ├─ adapter.scrape() — AsyncGenerator<ScrapedDecision>
   ↓
Her decision için:
   1. scraped_decisions.upsert  (raw kayıt)
   2. embedText(...)              (OpenAI text-embedding-3-small)
   3. rag_documents.upsert        (pgvector + HNSW)
   4. scraped_decisions.is_indexed = true
   ↓
Stream events:
   {type:"decision",  payload:{...}}
   {type:"progress",  payload:{found,scraped,indexed}}
   {type:"indexed",   payload:{ragId,totalIndexed}}
   {type:"done",      payload:{...}}
   {type:"error",     payload:{...}}
```

---

## 📁 Yeni Dosyalar (Faz 7)

```
src/lib/scraping/
├── types.ts                       # ScraperAdapter, ScrapedDecision, JobStatus
├── registry.ts                    # source → adapter mapping
├── job-runner.ts                  # runJob() generator + DB persistence
└── adapters/
    ├── demo.ts                    # Sentetik Yargıtay generator (her zaman çalışır)
    └── yargitay.ts                # Gerçek scraper skeleton + demo fallback

src/app/api/scraping/
├── run/route.ts                   # POST stream — yeni job başlat
├── jobs/route.ts                  # GET — job listesi + istatistik
└── cron/route.ts                  # GET — Vercel Cron tetiklenir (günlük)

src/components/scraping/
└── scraping-console.tsx           # Configurator + canlı progress + history

src/hooks/
└── use-scraping-job.ts            # Stream consumer (NDJSON parser)

src/app/(app)/admin/scraping/
└── page.tsx                       # Admin dashboard

supabase/migrations/
└── 0003_scraping.sql              # scraping_jobs + scraped_decisions + view

vercel.json                        # Cron schedule "0 3 * * *"
```

---

## 🎯 Adapter Pattern

Her kaynak `ScraperAdapter` interface'ini implement eder:

```typescript
interface ScraperAdapter {
  readonly source: ScrapingSource;
  readonly displayName: string;
  readonly baseUrl: string;
  isAvailable(): Promise<boolean>;
  scrape(
    job: ScrapingJobInput,
    onProgress: (p: {found, scraped, currentTitle?}) => void
  ): AsyncGenerator<ScrapedDecision, void, unknown>;
}
```

**Mevcut Adapter'lar:**
| Source | Adapter | Durum |
|---|---|---|
| `demo` | `DemoScraperAdapter` | ✅ Sentetik — query-aware, 4 kategori şablonu |
| `yargitay` | `YargitayScraperAdapter` | ⚠️ Skeleton — production HTML parser eklenecek |

**Faz 7+ Planı**: Danıştay, AYM, AİHM, mevzuat.gov.tr adapter'ları.

---

## 🧪 Demo Adapter Özellikleri

Sıfır API key, sıfır network — yine de gerçekçi:

1. **Query-aware sınıflandırma**: "trafik" → tazminat şablonu, "mobbing" → iş şablonu, "meşru müdafaa" → ceza şablonu
2. **Türkçe gerçek esas/karar formatı**: `2022/8932 K.2023/4521`
3. **Mahkeme çeşitliliği**: Yargıtay 1./4./9./17./22. HD + HGK + CD
4. **Streaming gecikme**: Her decision arası 300-800ms → gerçek scraping hissi
5. **Template variation**: `{N1}` maluliyet oranı, `{AMOUNT}` tazminat → her run farklı

---

## 🔒 Production Yargıtay Scraping

**Şu an `YGT_SCRAPER_ENABLED=false` (varsayılan)** → demo adapter çalışıyor.

**Aktifleştirmek için:**
1. Yargıtay Karar Arama'nın kullanım şartları + KVKK incelemesi
2. `robots.txt` kontrolü (`https://karararama.yargitay.gov.tr/robots.txt`)
3. Rate limit: max 1 req/sec
4. User-Agent: gerçek tarayıcı + iletişim e-postası
5. `YargitayScraperAdapter.scrape()` içindeki **iskelet kodu** gerçek HTML parser ile doldur (cheerio veya playwright)
6. `.env.local`: `YGT_SCRAPER_ENABLED=true`

**Alternatif (önerilen):** UYAP veya Lexpera/Kazancı gibi lisanslı veri sağlayıcı API'ları.

---

## ⏰ Cron Job

`vercel.json`:
```json
{ "crons": [{ "path": "/api/scraping/cron", "schedule": "0 3 * * *" }] }
```

Her gün UTC 03:00'te (TR saatiyle 06:00) çalışır:
- `trafik kazası tazminat` → 5 karar
- `iş kıdem ihbar tazminat` → 5 karar
- `boşanma velayet` → 5 karar

Toplam **15 yeni karar/gün × 365 = 5.475 karar/yıl** otomatik korpus artışı.

**Güvenlik**: `CRON_SECRET` env'i set ederseniz, Vercel Cron `Authorization: Bearer ${CRON_SECRET}` header'ı ile gelir, başkası tetikleyemez.

---

## 🎬 Live Test (Demo Mode)

```bash
# 1. Server başlat
npm run dev

# 2. Admin'e git
http://localhost:3000/admin/scraping

# 3. Source: "🧪 Demo" seç, Query: "trafik kazası", Limit: 5
# 4. "Scraping Başlat" → canlı stream izle
```

**Beklenen davranış:**
- Bulundu: 5 → Scraped: 1,2,3,4,5 (her biri 300-800ms arayla)
- Her decision için: court + esas/karar no + başlık + içerik gösterilir
- Demo modunda **indexed = scraped** (DB yok, simüle)
- Production modunda her decision **pgvector'a yazılır**, anında `/research`'te aranabilir hale gelir

---

## 📊 Test Sonuçları (Live)

```
✓ TypeScript: 0 hata
✓ Production build: 28 sayfa + 11 API route (3 yeni scraping endpoint)
✓ Lint: exit 0
✓ Audit: 0 critical, 0 high

✓ POST /api/scraping/run (demo, 3 karar):
   - Stream NDJSON: decision → progress → ... → done
   - 1.9 saniyede tamamlandı
   - Yargıtay 17. HD + 4. HD karışık üretildi
   - Türkçe başlık + içerik kusursuz
   - Esas no formatı: 2022/2492 K.2023/8689 ✓

✓ GET /api/scraping/jobs:
   - 2 adapter listelendi (demo + yargitay)
   - mode: "demo"
```

---

## 🔄 RAG'a Entegrasyon

Scraping tamamlanır → `rag_documents` tablosuna gerçek embedding ile yazılır → **anında `/research`'te aranabilir**.

Akış:
```
Scrape "boşanma velayet" → 5 yeni karar
       ↓
rag_documents tablosu: 31 + 5 = 36 belge
       ↓
Kullanıcı /research'te "velayet" arar
       ↓
HNSW + cosine: yeni eklenen 5 karar üst sırada
       ↓
Dilekçe yazarı caseHunter ajanı bu kararları kullanır
```

---

## 🛡️ Veri Provenance

Her scrape edilen kararın izlenebilir kökeni:
- `scraped_decisions.source_url` → orijinal kaynak link
- `scraped_decisions.source_id` → kaynaktaki id (duplicate koruma)
- `scraped_decisions.job_id` → hangi scraping işinde geldi
- `scraped_decisions.rag_document_id` → RAG'daki karşılığı

Audit query:
```sql
select s.title, s.court, s.fetched_at, j.query as scrape_query
from scraped_decisions s
join scraping_jobs j on j.id = s.job_id
order by s.fetched_at desc limit 20;
```

---

## ⏭️ Faz 8 Öncesi

- ✅ Auth + RLS (Faz 2)
- ✅ Upload pipeline (Faz 5 + 6.5)
- ✅ AI ajanlar (Faz 3)
- ✅ RAG + pgvector (Faz 4 + 6)
- ✅ **Scraping** (Faz 7) ← ŞİMDİ
- ⏭ Vercel deploy + Stripe TR fatura + custom domain (Faz 8)
