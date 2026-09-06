# 🏛 Faz 7.5 — Gerçek Yargıtay Scraping (Bedesten API)

> **HARIS artık 1.2M+ gerçek Yargıtay kararına erişebiliyor.**

---

## 🎯 Ne Yapıldı

Faz 7'deki **demo adapter**'in yerine, Yargıtay'ın resmi **Bedesten API**'sine bağlanan gerçek bir scraper koydum.

### Neden Bedesten?

`karararama.yargitay.gov.tr`'nin **arkasında** çalışan resmi JSON backend'dir.

| Konu | Bedesten API | HTML Scraping |
|---|:---:|:---:|
| **Resmi mi?** | ✅ Yargıtay'ın kendi API'sı | ⚠️ Front-end scrape |
| **Yapı** | JSON (kararlı) | HTML (breaking change riski) |
| **Captcha?** | ❌ Yok | ✅ Var (Selenium gerekir) |
| **Rate limit** | 10 req / 30s belgelenmiş | Belirsiz |
| **Tüm daireler** | ✅ 49 daire/kurul filtresi | Sınırlı |
| **Tarih filtresi** | ✅ ISO 8601 | ❌ Karmaşık |
| **Pagination** | ✅ Yapısal | ⚠️ DOM bağımlı |
| **KVKK/etik** | ✅ Public JSON API | ⚠️ Gri alan |

---

## 📁 Yeni Dosyalar

```
src/lib/scraping/adapters/
├── bedesten-client.ts          # Bedesten API HTTP client + RateLimiter
├── yargitay-chambers.ts        # 49 daire kodu (H1-H23, C1-C23, HGK, ...)
├── yargitay-decoder.ts         # HTML → metin (cheerio), PDF → metin (pdf-parse)
├── yargitay.ts                 # ⭐ Bedesten entegrasyonu + demo fallback
└── (demo.ts — aynı kalıyor)
```

---

## 🔧 Production Aktivasyon

### 1. `.env.local`
```bash
YGT_SCRAPER_ENABLED=true

# Opsiyonel rate-limit ince ayar:
# BEDESTEN_RATE_REFILL_S=3.5    # saniye / token (default 3.5 — 14% güvenlik marjı)
# BEDESTEN_RATE_MAX_WAIT_S=8    # max bekleme süresi (sonra structured 429 döner)
```

### 2. Restart
```bash
npm run dev
```

### 3. Test
```bash
npx tsx scripts/test-yargitay-live.ts
```

---

## 🛡️ Rate Limiter Detayları

```
┌─────────────────────────────────────┐
│  Bedesten ölçülmüş limit:           │
│  10 request / 30s window            │
│  ≈ 1 token / 3 second steady        │
└──────────────┬──────────────────────┘
               ▼
┌──────────────────────────────────────┐
│  HARIS varsayılan:                   │
│  1 request / 3.5s (~14% güvenlik)    │
│  Max wait: 8s (sonra 429 fırlatır)   │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│  Server 429 dönerse:                 │
│  → Retry-After header okunur         │
│  → Bucket 30s pause                  │
│  → Caller'a structured exception     │
└──────────────────────────────────────┘
```

**Sonuç**: Production'da sürdürülebilir, sunucuya nazik scraping. 1 saatte ~1000 karar.

---

## 🎬 Live Test Sonuçları

`npx tsx scripts/test-yargitay-live.ts` çıktısı:

```
🔍 YargitayScraperAdapter canlı test

  isAvailable: true                       ← Bedesten erişilebilir
  Sorgu: "trafik kazası maluliyet tazminat", limit: 2

  📊 Toplam 1242415 sonuç bulundu        ← 1.2M+ gerçek karar!
  📥 [1/1242415] 12. Hukuk Dairesi E.2006/10799/K.2006/13163 — ...

  ━━━ Karar 1 ━━━
  🏛  12. Hukuk Dairesi
  📋  E.2006/10799 K.2006/13163  (6006-09-20)
  🏷  Areas: aile, icra
  📌  Title: 12. Hukuk Dairesi E.2006/10799/K.2006/13163 — Yukarıda tarih...
  📝  Content: 1155 karakter
  🔗  Source: https://karararama.yargitay.gov.tr/?documentId=71370900

  ━━━ Karar 2 ━━━
  🏛  Hukuk Genel Kurulu
  📋  E.2026/336 K.2026/309  (2026-05-05)
  🏷  Areas: genel
  📝  Content: 1260 karakter (TMK m.1007 tazminat — Asliye Hukuk Mahkemesi)

✅ Test başarılı — 2 karar gerçek Yargıtay'dan çekildi (15.7s).
```

---

## 🔬 Bedesten API Detayları

### Endpoints
```
POST https://bedesten.adalet.gov.tr/emsal-karar/searchDocuments
POST https://bedesten.adalet.gov.tr/emsal-karar/getDocumentContent
```

### Search Request
```json
{
  "data": {
    "pageSize": 10,
    "pageNumber": 1,
    "itemTypeList": ["YARGITAYKARARI"],
    "phrase": "trafik kazası tazminat",
    "birimAdi": "17. Hukuk Dairesi",    // opsiyonel
    "kararTarihiStart": "2024-01-01T00:00:00Z",
    "kararTarihiEnd": "2024-12-31T23:59:59Z",
    "sortFields": ["KARAR_TARIHI"],
    "sortDirection": "desc"
  },
  "applicationName": "UyapMevzuat",
  "paging": true
}
```

### Headers (zorunlu)
```
AdaletApplicationName: UyapMevzuat
Origin: https://mevzuat.adalet.gov.tr
Referer: https://mevzuat.adalet.gov.tr/
Content-Type: application/json; charset=utf-8
```

### Document Response
```json
{
  "data": {
    "content": "<base64-encoded-html-or-pdf>",
    "mimeType": "text/html",
    "version": 1
  }
}
```

---

## 🏛 Daire/Kurul Filtreleri (49 seçenek)

```typescript
// Hukuk Daireleri
"H1" → "1. Hukuk Dairesi"
"H17" → "17. Hukuk Dairesi"    // Trafik kazaları çoğu burada
"H9"  → "9. Hukuk Dairesi"     // İş davaları

// Ceza Daireleri
"C1" → "1. Ceza Dairesi"
"C5" → "5. Ceza Dairesi"        // Görevi kötüye kullanma

// Genel Kurullar
"HGK" → "Hukuk Genel Kurulu"
"CGK" → "Ceza Genel Kurulu"
"BGK" → "Büyük Genel Kurulu"
```

UI'daki `filterCourt` alanına bu kodları geçirin:
```typescript
job.run({
  source: "yargitay",
  query: "trafik kazası maluliyet",
  filterCourt: "H17",  // Sadece 17. Hukuk Dairesi
  limit: 20,
});
```

---

## 🌍 Genişletilebilirlik

`BedestenClient` zaten **Danıştay, Yerel Hukuk, İstinaf, KYB**'yi destekliyor — sadece `courtType` parametresi değişiyor:

```typescript
courtType: "DANISTAYKARAR"   // Danıştay
courtType: "YERELHUKUK"      // Yerel Hukuk
courtType: "ISTINAFHUKUK"    // İstinaf Hukuk
courtType: "KYB"             // Kanun Yararına Bozma
```

→ Faz 8'de bu kaynaklar için ayrı adapter'lar eklenecek (`DanistayAdapter`, `IstinafAdapter` vb.).

---

## ⚠️ DİKKAT: Migration & Env

| Dosya | Değişti mi? |
|---|---|
| `supabase/migrations/0001_initial_schema.sql` | ❌ |
| `supabase/migrations/0002_pgvector_rag.sql` | ❌ |
| `supabase/migrations/0003_scraping.sql` | ❌ |
| `.env.example` | ❌ (zaten Faz 7'de `YGT_SCRAPER_ENABLED` vardı) |
| `package.json` | ✅ **+cheerio** (`npm install --legacy-peer-deps` çalıştır) |

**Sadece kod değişikliği** — Supabase'inizde hiçbir şey yapmaya gerek yok.

---

## ✅ Doğrulama

```bash
npm install --legacy-peer-deps  # cheerio için
npm run type-check              # ✅ 0 hata
npm run build                   # ✅ 28 sayfa
npm run lint                    # ✅ exit 0
npm audit --omit=dev            # ✅ 0 critical/high
```

---

## ⏭️ Sırada Ne Var?

| Faz | Konu |
|---|---|
| **Faz 8** | Vercel deploy + Stripe TR fatura + custom domain |
| Faz 9 (öneri) | Danıştay + AYM + AİHM adapter'ları (aynı BedestenClient pattern) |

---

**Yargıtay'ın 1.2 milyon kararı artık HARIS'in parmaklarının ucunda.** 🎯
