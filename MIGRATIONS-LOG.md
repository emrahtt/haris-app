# 📋 HARIS — Migration & Environment Change Log

> **Bu dosya kritik altyapı dosyalarının değişim geçmişini tutar.**
> Her sprint'te güncellenir. Production deploy öncesi mutlaka kontrol edin.

---

## 🎯 Hangi Dosyalar Takip Edilir?

| Dosya | Risk | Etki |
|---|:---:|---|
| `supabase/migrations/*.sql` | 🔴 KRİTİK | Supabase DB şeması — yanlış değişiklik veri kaybı |
| `.env.example` | 🟡 ORTA | Yeni env değişkeni gerektirir — `.env.local` güncellenmeli |
| `vercel.json` | 🟡 ORTA | Cron + edge config |
| `package.json` (major sürüm değişiklikleri) | 🟡 ORTA | `npm install` + breaking-change kontrolü |

---

## 🔔 Güncel Durum (HEAD)

| Dosya | Son Faz | SHA256 (ilk 12) | Boyut |
|---|---|---|---|
| `supabase/migrations/0001_initial_schema.sql` | Faz 6.5 | `6d66f8a776b9` | 9774 B |
| `supabase/migrations/0002_pgvector_rag.sql` | Faz 6.5 | `397a3167a94c` | 4384 B |
| `supabase/migrations/0003_scraping.sql` | Faz 7 | `9f3847dbc9f3` | 4314 B |
| `supabase/migrations/0004_billing.sql` | Faz 8 | `ad3904f6d0d0` | 8290 B |
| `supabase/migrations/0005_kvkk_compliance.sql` | Faz 9 | `1716b72c372f` | 12099 B |
| `supabase/migrations/0006_admin_panel.sql` | **Faz 10** | **`5f020fb6112d`** | **14212 B** |
| `.env.example` | Faz 8 | `bbf73e9dced8` | 1957 B |
| `vercel.json` | **Faz 10** | +process-deletions cron, +admin headers | — |
| `package.json` | **Faz 8** | +stripe | — |

> 💡 **Checksum yeniden hesaplamak**: `sha256sum supabase/migrations/*.sql .env.example | cut -c1-12`

---

## 📜 Sürüm Geçmişi

### Faz 10 — Admin Panel + Operasyonel Araçlar (✅ Tamam)

#### `supabase/migrations/0006_admin_panel.sql` (YENİ) 🔴 KRİTİK
**`profiles` tablosu güncellendi:**
- ➕ `is_admin boolean default false`
- ➕ `admin_role text check (super_admin|kvkk_officer|support|finance)`
- ➕ `profiles_is_admin_idx` (partial index — sadece admin'ler)

**Yeni tablolar:**
1. **`deletion_log`** — Tamamlanan silme işlemlerinin kanıt zinciri
   - `original_user_id`, `user_email_hash` (SHA256 — kanıt için, ham email YOK)
   - `cases_deleted`, `documents_deleted`, `petitions_deleted`, `storage_bytes_freed`
   - `triggered_by`: cron / admin_manual / user_immediate
2. **`admin_actions`** — Admin self-audit (immutable append-only)
   - `admin_user_id` FK ON DELETE RESTRICT (admin silinemez, logları kalır)
   - 13 action type: kvkk_request.viewed, deletion.executed, vb.
   - IP + User-Agent zorunlu

**Yeni helper functions:**
- `is_admin(user_id)` — RLS policy'lerde kullanılır
- `has_admin_role(role, user_id)` — Granular role kontrolü

**Yeni RPC fonksiyonları:**
- `get_admin_metrics()` → SystemMetrics (admin guard)
- `execute_account_deletion(request_id, triggered_by)` — 3 retention strategy:
  - `anonymize`: profile anonim, dava içerikleri sil, audit log kalır
  - `delete_immediately`: ON DELETE CASCADE ile her şey
  - `legal_minimum`: VUK 10 yıl fatura saklama uyumlu

**Yeni view:** `admin_system_metrics` (16 metrik aggregate)

**RLS güncellemeleri:**
- profiles: admin select_all eklendi
- kvkk_requests: admin select_all + update (yanıt verme)
- audit_logs: admin select_all
- account_deletion_requests: admin select_all + update

**Güvenli mi?** ✅ İdempotent (CREATE IF NOT EXISTS + DROP/CREATE POLICY)

#### `vercel.json` 🟡 ORTA
- ➕ Yeni cron: `/api/cron/process-deletions` (her gün UTC 04:00)
- ➕ /admin/* için `X-Robots-Tag: noindex, nofollow` + `Cache-Control: no-store`
- ➕ Function maxDuration: process-deletions 300s

#### Yeni dosyalar
```
src/lib/admin/
├── auth.ts                    # getCurrentAdmin, requireAdmin, logAdminAction
└── queries.ts                 # SystemMetrics, KvkkRequestRow, vb. tipli queries

src/app/admin/
├── page.tsx                   # → /admin/dashboard redirect
├── dashboard/page.tsx         # Sistem metrikleri + alarm kartları
├── kvkk-requests/
│   ├── page.tsx               # Bekleyen + tamamlanan başvurular
│   └── [id]/page.tsx          # Tek başvuru detay + yanıt formu
├── audit-logs/page.tsx        # KVKK m.12 log viewer
├── deletions/page.tsx         # Silme kuyruğu (overdue + upcoming)
├── users/page.tsx             # Kullanıcı listesi
└── scraping/page.tsx          # /(app)/admin/scraping'ten taşındı

src/app/api/admin/
├── kvkk-requests/[id]/route.ts        # POST — admin yanıt + status update
└── deletions/[id]/execute/route.ts    # POST — manuel silme override

src/app/api/cron/
└── process-deletions/route.ts          # GET — cool-off dolan hesapları sil

src/components/admin/
├── admin-shell.tsx            # Admin sidebar + nav (badge ile pending count)
├── kvkk-responder.tsx         # Yanıt formu + 3 hızlı şablon
└── deletion-actions.tsx       # "İşle" butonu + confirm

src/components/settings/
└── admin-link.tsx             # Settings sayfasında admin için kart (zero-leak)
```

**Güncel dosyalar:**
- `src/lib/supabase/middleware.ts` — /admin için admin guard eklendi
- `src/components/shell/sidebar.tsx` — eski "/admin/scraping" linki kaldırıldı (artık /admin altında)
- `src/app/(app)/settings/page.tsx` — AdminLink kartı eklendi

**Aksiyon:**
1. Supabase SQL Editor → `0006_admin_panel.sql` → Run (idempotent)
2. İlk admin kullanıcısını manuel set et:
   ```sql
   UPDATE profiles
   SET is_admin = true, admin_role = 'super_admin'
   WHERE id = 'YOUR-USER-UUID';
   ```
3. (Production) Cron worker'ı doğrula: `https://yourdomain.com/api/cron/process-deletions`

---

### Faz 9 — KVKK Uyumluluk + Hukuki Sayfalar (✅ Tamam)

#### `supabase/migrations/0005_kvkk_compliance.sql` (YENİ) 🔴 KRİTİK
**5 yeni tablo + 2 RPC fonksiyonu — tam KVKK uyumluluğu:**

1. **`consent_records`** — Açık rıza kayıtları (immutable, yasal kanıt)
   - 8 consent_type: kvkk_aydinlatma, terms_of_service, cookie_*, marketing_emails, vb.
   - `granted`, `document_version`, `ip_address`, `user_agent` (m.12 yükümlülüğü)
   - `withdrawn_at` (rıza geri çekme)
2. **`kvkk_requests`** — m.11 ilgili kişi başvuruları
   - 8 request_type: access, information, transfer_info, correction, deletion, portability, objection, damage_compensation
   - `deadline_at` GENERATED (created_at + 30 gün — m.13 yasal süre)
   - Status: received → in_review → completed
   - Anonim başvuru desteği (user_id null olabilir)
3. **`data_export_requests`** — Asenkron veri export işleri (m.11/d)
4. **`account_deletion_requests`** — Unutulma hakkı (m.7) + 30 gün cool-off
   - retention_choice: anonymize | delete_immediately | legal_minimum
   - UNIQUE (user_id) — aynı kullanıcı için tek aktif talep
5. **`audit_logs`** — Veri sorumlusu yükümlülüğü (m.12)
   - action, resource_type/id, metadata, ip_address, user_agent
   - 2 yıl saklama önerisi

**RLS:**
- consent_records: kullanıcı kendi onaylarını SELECT/INSERT, UPDATE/DELETE yok (immutable)
- kvkk_requests: INSERT herkese açık (anonim başvuru için)
- audit_logs: kullanıcı kendi loglarını SELECT (m.11 erişim hakkı)

**RPC fonksiyonları:**
- `request_account_deletion(reason, retention)` — Cool-off başlatır, audit'e yazar
- `cancel_account_deletion()` — Pending talebi iptal eder

**Güvenli mi?** ✅ Tamamen idempotent.

#### `.env.example` — Değişmedi
KVKK için ek env değişkenine ihtiyaç yok.

#### Yeni dosyalar
```
src/lib/kvkk/
├── constants.ts                   # DATA_CONTROLLER, versiyonlar, request types
└── audit.ts                       # logAudit() helper

src/app/(legal)/
├── layout.tsx                     # Legal sayfa shell (nav + footer)
└── legal/
    ├── privacy/page.tsx           # Aydınlatma Metni (KVKK m.10)
    ├── terms/page.tsx             # Kullanım Şartları (TBK + Tüketici)
    ├── cookies/page.tsx           # Çerez Politikası (KVKK + e-Privacy)
    └── kvkk-basvuru/page.tsx      # KVKK m.11 başvuru formu

src/app/api/
├── kvkk/request/route.ts          # KVKK başvurusu kabul
├── account/export/route.ts        # m.11/d — JSON export
├── account/delete/route.ts        # m.7 — Cool-off ile silme
└── account/consent/route.ts       # m.10 — Rıza tracking

src/components/
├── legal/
│   ├── legal-page.tsx             # Standart legal layout (markdown)
│   └── cookie-banner.tsx          # GDPR/KVKK uyumlu çerez banner
└── settings/
    └── privacy-section.tsx        # Settings → Gizlilik & KVKK sekmesi
```

**Güncel dosyalar:**
- `src/app/layout.tsx` — CookieBanner eklendi (root)
- `src/app/(app)/settings/page.tsx` — PrivacySection eklendi
- `src/components/landing/final-cta.tsx` — Footer'a 5 legal link

**Aksiyon:**
1. `supabase/migrations/0005_kvkk_compliance.sql` → Supabase SQL Editor → Run
2. Production'da `src/lib/kvkk/constants.ts`'deki `DATA_CONTROLLER` bilgilerini gerçek şirket bilgileriyle değiştir
3. KVKK iletişim e-postası kur: `kvkk@yourdomain.com` (form gönderimleri buraya gider)

---

### Faz 8 — Vercel Deploy + Stripe Billing (✅ Tamam)

#### `supabase/migrations/0004_billing.sql` (YENİ) 🔴 KRİTİK
**Yeni tablolar:**
1. **`subscriptions`** — kullanıcı plan abonelikleri
   - `plan_id`: free / starter / pro / enterprise
   - `provider`: stripe / iyzico / manual / none
   - `status`: trialing / active / past_due / cancelled / expired
   - `provider_subscription_id`, `provider_customer_id` (Stripe ID'leri)
   - `billing_period`: monthly / yearly
   - `cancel_at_period_end`, `trial_ends_at`
   - UNIQUE (user_id) → her kullanıcı tek aktif abonelik
2. **`usage_tracking`** — aylık kullanım sayaçları
   - `period_month` (YYYY-MM-01)
   - `ai_calls`, `scraping_jobs`, `documents_uploaded`, `bytes_stored`
   - `ai_limit_warned`, `ai_limit_blocked`
   - UNIQUE (user_id, period_month)
3. **`payment_events`** — webhook audit log
   - Stripe/iyzico event'leri ham JSON ile saklanır
   - `provider_event_id` UNIQUE (idempotency)
4. **`invoices`** — kullanıcıya sunulan faturalar
   - status, pdf_url, hosted_url

**RLS:** Kullanıcı kendi verisini select edebilir, INSERT/UPDATE sadece service role (webhook).

**Triggers:**
- `handle_new_user_subscription` — yeni signup'a otomatik free subscription
- `set_updated_at` → subscriptions, usage_tracking

**RPC:** `increment_usage(user_id, metric, amount)` — atomic counter (race koşulu yok)

**Güvenli mi?** ✅ Tamamen idempotent.

#### `.env.example` 🟡 ORTA — Stripe/iyzico değişkenleri eklendi
**Yeni:**
- `NEXT_PUBLIC_APP_URL` — production domain
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` (opsiyonel)
- `HARIS_TRIAL_DAYS=14`
- `HARIS_DEFAULT_CURRENCY=try`

**Demo modda hiçbiri zorunlu değil.** Boşken DemoProvider çalışır.

#### `vercel.json` 🟡 ORTA — Production hardening
- Region: `fra1` (Supabase Frankfurt ile aynı)
- `installCommand: npm install --legacy-peer-deps`
- Cron: `/api/scraping/cron` schedule kalıyor
- **Yeni headers:** X-Frame-Options, HSTS, CSP-lite (Permissions-Policy), Referrer-Policy
- **Function maxDuration:** scraping/cron 300s, agents 120s, upload 60s, webhook 30s

#### `package.json` 🟡 ORTA — +stripe
- ➕ `stripe@^17.4.0` (Node SDK)
- `npm install --legacy-peer-deps` çalıştırın

#### Yeni dosyalar
```
src/lib/billing/
├── config.ts                     # provider auto-detect
├── plans.ts                      # 4 plan + limits + features
├── types.ts                      # PlanId, SubscriptionStatus, NormalizedWebhookEvent
├── subscriptions-db.ts           # CRUD + usage tracking + limit enforcement
├── registry.ts                   # active provider resolver
└── providers/
    ├── stripe.ts                 # Stripe checkout + portal + webhook
    ├── iyzico.ts                 # stub (Faz 8.5+)
    └── demo.ts                   # demo fallback

src/app/api/billing/
├── checkout/route.ts             # POST → checkout URL
├── portal/route.ts               # POST → customer portal URL
├── webhook/route.ts              # POST → Stripe webhook handler
└── status/route.ts               # GET → plan + usage + quotas

src/app/pricing/page.tsx          # public pricing page
src/components/billing/billing-card.tsx  # settings sayfasında

DEPLOYMENT.md                     # ⭐ Adım adım production rehberi
.vercelignore                     # vercel deploy exclude listesi
```

**Aksiyon:**
1. `npm install --legacy-peer-deps`
2. Supabase SQL Editor → 0004 migration'ı yapıştır + Run
3. (Production'da) Stripe Dashboard'dan ürünler + price ID'ler oluştur
4. `plans.ts`'a Price ID'leri ekle
5. Vercel'e deploy + env değişkenlerini girin

Detay: `DEPLOYMENT.md`

---

### Faz 7.5 — Gerçek Bedesten Adapter (✅ Tamam)

#### Sadece kod değişikliği — Supabase/env DEĞİŞMEDİ ✅
- `src/lib/scraping/adapters/bedesten-client.ts` (YENİ) — Bedesten API client + rate limiter
- `src/lib/scraping/adapters/yargitay-chambers.ts` (YENİ) — Daire kodları (H1-H23, C1-C23, HGK...)
- `src/lib/scraping/adapters/yargitay-decoder.ts` (YENİ) — HTML/PDF → metin (cheerio + pdf-parse)
- `src/lib/scraping/adapters/yargitay.ts` (GÜNCELLENDİ) — gerçek Bedesten entegrasyonu, demo fallback aynı kalıyor
- `package.json` — `cheerio@^1.0.0` eklendi

**Aksiyon:** `npm install --legacy-peer-deps` (yeni paket: cheerio)

**Production aktivasyon:**
```bash
# .env.local
YGT_SCRAPER_ENABLED=true
# Opsiyonel rate limit ayarı:
# BEDESTEN_RATE_REFILL_S=3.5   (default — sn/token)
# BEDESTEN_RATE_MAX_WAIT_S=8   (max wait before structured 429)
```

**Live test sonucu** (2026-06-06):
- ✅ Bedesten API erişilebilir, HTTP 200
- ✅ "trafik kazası maluliyet tazminat" → 1.242.415 sonuç
- ✅ 2 karar 15.7s'de çekildi (rate limit'e uygun)
- ✅ Title + esas/karar/tarih/daire/areas/tags — hepsi doğru

---

### Faz 7 — Yargıtay Scraping (✅ Tamam)

#### `supabase/migrations/0003_scraping.sql` (YENİ) 🔴 KRİTİK
**Yeni tablolar:**
1. **`scraping_jobs`** — scraping işlerini takip eder
   - `source`, `query`, `status` (queued/running/done/failed/cancelled)
   - `total_found`, `total_scraped`, `total_indexed`, `total_failed`
   - `trigger_type` (manual/cron/api), `triggered_by` (FK → auth.users)
2. **`scraped_decisions`** — ham scrape edilen kararlar
   - `(source, source_id)` UNIQUE — duplicate koruma
   - `rag_document_id` FK → rag_documents (transformasyon takibi)
   - `is_indexed` flag — embedding tamamlandı mı
3. **`scraping_stats`** view — kaynak bazlı istatistik (canlı dashboard için)

**RLS:**
- SELECT herkese açık (admin dashboard için)
- INSERT/UPDATE/DELETE sadece service role (job runner için)

**Güvenli mi?** ✅ İdempotent (IF NOT EXISTS + DROP/CREATE policy)

#### `.env.example` 🟡 ORTA
**Eklenen değişkenler:**
- `YGT_SCRAPER_ENABLED=false` — Gerçek Yargıtay scraping aç/kapa
  - `false` → demo adapter (sentetik veri)
  - `true` → gerçek scraping (production'da dikkatli aktive et)
- `CRON_SECRET=` — Vercel Cron için authorization token

**Aksiyon:** `.env.local`'a opsiyonel olarak ekleyin (boş bırakırsanız demo modda çalışır).

#### `vercel.json` (YENİ) 🟡 ORTA
```json
{
  "crons": [{
    "path": "/api/scraping/cron",
    "schedule": "0 3 * * *"
  }]
}
```
Her gün gece 03:00 (UTC) otomatik Yargıtay scraping çalıştırır.

**Aksiyon:** Vercel'e deploy ettiğinizde Vercel otomatik tanır. Local dev'de tetiklenmez.

#### `package.json`
- 📌 Değişmedi (yeni paket eklenmedi)

---

### Faz 6.5 — Production Hardening (✅ Tamam)

#### `supabase/migrations/0001_initial_schema.sql` 🔴 KRİTİK GÜNCELLEME
1. `documents.id`: `text` → **`uuid primary key default gen_random_uuid()`**
2. ➕ Yeni index: `documents_user_id_idx`
3. ✏️ İdempotent: `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`
4. ✏️ `handle_new_user` trigger'a `ON CONFLICT (id) DO NOTHING`

**Güvenli mi?** Boş veya yeni proje için ✅. Eski text-id veri varsa ⚠️ migration script gerekir.

#### `supabase/migrations/0002_pgvector_rag.sql` 🔴 KRİTİK GÜNCELLEME
1. ➕ Eksik **`UPDATE` storage policy** eklendi
2. ✏️ İdempotent pattern

**Güvenli mi?** ✅ Tamamen idempotent.

#### `package.json`
- ✏️ `next`: `15.0.3` → **`15.5.19`** (CVE patch)
- ➕ `exceljs`: xlsx replacement
- ➖ `xlsx`: kaldırıldı (HIGH CVE)
- ➕ `eslint.config.mjs`: yeni dosya

**Aksiyon:** `npm install --legacy-peer-deps`

---

### Faz 6 — Production Sindirim (✅ Tamam)

#### `supabase/migrations/0002_pgvector_rag.sql` (YENİ)
- pgvector extension
- `rag_documents` tablosu (vector 1536d)
- HNSW index, `search_rag_documents` RPC
- `case-documents` storage bucket + RLS

---

### Faz 3 — AI Entegrasyonu (✅ Tamam)

#### `.env.example`
- ➕ OpenAI/Anthropic key + model config

---

### Faz 2 — Auth + DB (✅ Tamam)

#### `supabase/migrations/0001_initial_schema.sql` (YENİ)
- profiles, cases, documents, petitions, agent_activities, deadlines + RLS + triggers

---

## 🛠️ Kullanım Senaryoları

### Yeni bir sprint başlayınca
1. Bu dosyayı oku — son sprint'te ne değişti
2. 🔴 KRİTİK değişiklik varsa:
   - `.env.local`'ı güncelle (yeni key varsa)
   - Yeni migration'ı Supabase SQL Editor'da çalıştır
3. `npm install --legacy-peer-deps` (package.json değiştiyse)

### Production'a deploy ederken
1. Bu dosyayı son sürümle karşılaştır
2. Yeni migration'lar için checklist:
   - [ ] Staging'de test edildi mi?
   - [ ] İdempotent mi (tekrar çalıştırılabilir mi)?
   - [ ] RLS politikaları kontrol edildi mi?
   - [ ] Veri kaybı riski var mı?

### Checksum doğrulama
```bash
sha256sum supabase/migrations/*.sql .env.example | cut -c1-12
```

---

## ⚠️ İdempotent Migration Garantisi

Tüm HARIS migration'ları **idempotent**'dir:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE EXTENSION IF NOT EXISTS`
- `DROP POLICY IF EXISTS ... CREATE POLICY`
- `DROP TRIGGER IF EXISTS ... CREATE TRIGGER`
- `INSERT ... ON CONFLICT DO NOTHING`

→ **Aynı migration'ı 100 kez çalıştırsanız bile** ilk seferki gibi davranır, hata vermez, veri kaybı yapmaz.

**İstisna**: Sütun tipi değişiklikleri (Faz 6.5'teki `documents.id text → uuid`) **idempotent değildir** ve eski veriyle çakışır.

---

*Son güncelleme: **Faz 10 sonu (Admin panel + operasyonel araçlar)***
