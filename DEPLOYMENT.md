# 🚀 HARIS — Production Deployment Rehberi

> Sıfırdan Vercel + Supabase + Stripe canlıya alma. Adım adım.

---

## 📋 Genel Bakış

```
┌────────────────────────────────────────────────┐
│                  KULLANICI                     │
└─────────────────────┬──────────────────────────┘
                      ▼
┌────────────────────────────────────────────────┐
│  Vercel (Edge Network + CDN + Serverless)     │
│  • Next.js 15 SSR + Server Actions             │
│  • Cron jobs                                   │
│  • Auto-scaling, SSL, custom domain            │
└────────┬─────────────────────┬─────────────────┘
         │                     │
         ▼                     ▼
┌────────────────┐   ┌────────────────────┐
│ Supabase       │   │ AI Providers       │
│ • Auth         │   │ • OpenAI           │
│ • PostgreSQL   │   │ • Anthropic        │
│ • Storage      │   │ • Stripe (billing) │
│ • pgvector RAG │   └────────────────────┘
└────────────────┘
```

---

## 🎯 Önkoşullar

| Servis | Hesap | Maliyet |
|---|---|---|
| **Vercel** | Pro plan önerilir | $20/ay/user (Hobby plan free ama 60s function limit var) |
| **Supabase** | Pro plan önerilir | $25/ay (Free 500MB DB, Pro 8GB) |
| **OpenAI** | Pay-as-you-go | ~$5-50/ay (kullanıma göre) |
| **Stripe** | Free | %1.4 + 0.25₺/işlem (TR) |
| **Domain** | (opsiyonel) | ~$15/yıl |

**Toplam minimum aylık**: ~$50

---

## 🔨 ADIM 1: Supabase Kurulumu (~15 dakika)

### 1.1 Yeni Proje
1. https://supabase.com/dashboard → **New Project**
2. **Region: Frankfurt (EU-Central)** — Türkiye'ye en yakın, KVKK uyumlu
3. Database password kaydet (güçlü olsun)
4. Pricing: **Pro** ($25/ay) — production için zorunlu

### 1.2 Migration'ları Sırayla Çalıştır
Dashboard → **SQL Editor** → New query. Her birini ayrı yapıştır + Run:

```
✅ 0001_initial_schema.sql      → profiles, cases, documents, petitions, agent_activities, deadlines
✅ 0002_pgvector_rag.sql        → pgvector + rag_documents + HNSW + storage bucket
✅ 0003_scraping.sql            → scraping_jobs, scraped_decisions, stats view
✅ 0004_billing.sql             → subscriptions, usage_tracking, payment_events, invoices
```

Her migration **idempotent** — tekrar çalıştırılabilir, hata vermez.

### 1.3 Auth Settings
- **Authentication → Providers → Email** → Aktif
- **Confirm email** → development için kapatabilirsin, production için aç (önerilen)
- **Email Templates** → "Confirm signup" şablonunu Türkçeleştir (opsiyonel)

### 1.4 Storage Bucket
Migration 0002 zaten `case-documents` bucket'ını oluşturur. Kontrol:
- Dashboard → **Storage** → `case-documents` görünmeli

### 1.5 API Keys Al
- **Project Settings → API**
- `Project URL` → kaydet
- `anon public` → kaydet
- `service_role secret` → kaydet (GİZLİ — sadece backend)

### 1.6 Korpusu İndeksle (Opsiyonel — Faz 4 RAG için)
Lokalden:
```bash
cd haris-app
# .env.local'a SUPABASE_URL/keys + OPENAI_API_KEY ekle
npm run rag:index
```

Çıktı: `✓ 31 belge yüklendi (HNSW aktif, ~5-20ms sorgu)`

---

## 🤖 ADIM 2: AI Provider Kurulumu (~5 dakika)

### 2.1 OpenAI
- https://platform.openai.com/api-keys
- Create new secret key → kaydet (sk-proj-...)
- Billing → Add payment method, $10-20 credit
- Kullanım izleme: https://platform.openai.com/usage

### 2.2 Anthropic (opsiyonel ama önerilen)
- https://console.anthropic.com/settings/keys
- Create Key → kaydet (sk-ant-...)
- Adversarial Red-Team için Claude Sonnet 3.5 en güçlüsü

---

## 💳 ADIM 3: Stripe Kurulumu (~20 dakika)

### 3.1 Hesap + Test Mode
- https://dashboard.stripe.com/register
- TR şirketi için Atlas yerine Stripe Türkiye Beta hesabı önerilir
- Şimdilik **Test mode** ile başla (üst sağ toggle)

### 3.2 Ürünler + Fiyatlar Oluştur
**Products → Add product:**

| Ürün | Fiyat (TRY) | Periyot | Lookup Key |
|---|---|---|---|
| HARIS Starter Monthly | 1499 | Aylık recurring | `haris_starter_monthly` |
| HARIS Starter Yearly | 14990 | Yıllık recurring | `haris_starter_yearly` |
| HARIS Pro Monthly | 3999 | Aylık recurring | `haris_pro_monthly` |
| HARIS Pro Yearly | 39990 | Yıllık recurring | `haris_pro_yearly` |

Her Price oluştuktan sonra **Price ID**'sini kopyala (`price_1AbC...`).

### 3.3 plans.ts'a Price ID'leri Ekle

`src/lib/billing/plans.ts`'da:
```typescript
starter: {
  stripeMonthlyPriceId: "price_1AbC...",
  stripeYearlyPriceId: "price_1AbD...",
  // ...
},
pro: {
  stripeMonthlyPriceId: "price_1AbE...",
  stripeYearlyPriceId: "price_1AbF...",
  // ...
},
```

### 3.4 Webhook Endpoint
- **Developers → Webhooks → Add endpoint**
- Endpoint URL: `https://yourdomain.com/api/billing/webhook` (Vercel deploy sonrası)
- Events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- **Signing secret** → kaydet (`whsec_...`)

### 3.5 API Keys
- **Developers → API keys**
- `Secret key` → `STRIPE_SECRET_KEY` (sk_test_... / sk_live_...)
- `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## ☁️ ADIM 4: Vercel Deploy (~10 dakika)

### 4.1 GitHub'a Push
```bash
cd haris-app
git init
git add .
git commit -m "feat: initial HARIS deploy"
gh repo create haris-app --private --source=. --push
```

### 4.2 Vercel Import
- https://vercel.com/new
- Import from GitHub → `haris-app` seç
- Framework: **Next.js** (otomatik tanır)
- Root directory: `./` (default)
- Build & Output: default
- **Region**: Frankfurt (Supabase'le aynı)

### 4.3 Environment Variables
Vercel Dashboard → Project → Settings → Environment Variables. Tümünü Production'a ekle:

```bash
# App
NEXT_PUBLIC_APP_URL=https://your-haris-app.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
HARIS_DEFAULT_MODEL=openai:gpt-4o-mini
HARIS_ADVERSARIAL_MODEL=anthropic:claude-3-5-sonnet-20241022

# Scraping
YGT_SCRAPER_ENABLED=true
CRON_SECRET=<openssl rand -hex 32 ile üret>

# Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
HARIS_TRIAL_DAYS=14
HARIS_DEFAULT_CURRENCY=try
```

### 4.4 Deploy
- **Deploy** butonuna bas
- 2-3 dakika içinde `https://your-haris-app.vercel.app` canlıda

### 4.5 Webhook URL'i Stripe'a Yansıt
- Stripe Dashboard → Webhooks → endpoint URL'i güncelle
- Test: Stripe Dashboard → "Send test event" → `invoice.paid`

### 4.6 Cron Doğrula
- Vercel Dashboard → Project → Cron Jobs
- `/api/scraping/cron` → schedule `0 3 * * *` → görünmeli

---

## 🌐 ADIM 5: Custom Domain (~10 dakika, opsiyonel)

### 5.1 Domain Satın Al
- Cloudflare, Namecheap, GoDaddy vb. — örn `haris.av.tr`

### 5.2 DNS Yapılandırma
Vercel Dashboard → Project → Settings → Domains → Add:
```
yourdomain.com           → A record    → 76.76.21.21
www.yourdomain.com       → CNAME       → cname.vercel-dns.com
```

### 5.3 SSL Otomatik
- Vercel Let's Encrypt SSL'i otomatik kurar
- 5 dakika sonra `https://yourdomain.com` aktif

### 5.4 Env Güncelle
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```
+ Stripe webhook URL'i güncelle.

---

## ✅ ADIM 6: Smoke Test (Production)

```
1. ✅ /pricing → tüm planlar görünüyor, fiyatlar doğru
2. ✅ /register → yeni kullanıcı kayıt, profile + free subscription otomatik oluşuyor
3. ✅ /login → giriş çalışıyor
4. ✅ /dashboard → demo dava listesi var
5. ✅ /research → "trafik" ara → RAG sonuçları geliyor (31+ belge)
6. ✅ /admin/scraping → Yargıtay sorgu → gerçek 1.2M karar arasından çekiyor
7. ✅ /settings → BillingCard → AI kotası görünüyor
8. ✅ /pricing → "Starter Hemen Başla" → Stripe Checkout açılıyor
9. ✅ Test kartı: 4242 4242 4242 4242 / herhangi tarih / herhangi CVC
10. ✅ Checkout success → Webhook tetiklenir → /settings'te plan PRO görünür
```

---

## 🔒 ADIM 7: Production Sertleştirme

### 7.1 Stripe Live Mode
- Test'leri tamamladıktan sonra Stripe Dashboard → top-right toggle → **Live mode**
- Test Price ID'lerini Live Price ID'leriyle değiştir
- `STRIPE_SECRET_KEY` → `sk_live_...`
- Webhook signing secret → live versiyonu kullan

### 7.2 Rate Limiting
- Vercel Edge Config veya Upstash Redis ile API endpoint'lerine rate limit
- Önerilen: `@upstash/ratelimit` (10 req/s per IP for `/api/agents/run`)

### 7.3 Monitoring
- **Vercel Analytics** → Settings → Analytics → Enable
- **Sentry** → `npm install @sentry/nextjs` (error tracking)
- **Supabase Logs** → Dashboard → Logs → query/auth/storage

### 7.4 KVKK Uyumluluk
- `/privacy` ve `/terms` sayfaları ekle (Türkçe)
- Cookie banner (opsiyonel ama önerilen)
- Aydınlatma metni → register sayfası altına link
- Veri silme talepleri için `/api/account/delete` endpoint (Faz 9)

### 7.5 Backup
- Supabase Pro otomatik daily backup → 7 gün
- Critical data export: weekly cron → S3/R2

---

## 📊 İlk Ay Maliyet Senaryosu

**Küçük başlangıç (10 paying user):**
- Vercel Pro: $20
- Supabase Pro: $25
- OpenAI (~5K AI çağrı): ~$15
- Stripe komisyon (5×₺3999 Pro): ₺280 (~$10)
- **TOPLAM: ~$70/ay**

**Gelir potansiyeli (10 Pro user):** 10 × ₺3999 = **₺39.990/ay (~$1300)**
**Marj: ~%95** 🎯

---

## 🆘 Sorun Giderme

| Problem | Çözüm |
|---|---|
| `Migration error: relation already exists` | Normal — idempotent, devam et |
| `Webhook 400` | `STRIPE_WEBHOOK_SECRET` yanlış — Stripe Dashboard'dan kopyala |
| `Vercel function timeout 60s` | `vercel.json` `functions.maxDuration` ayarla (Pro plan max 300s) |
| `Subscription update gelmiyor` | Webhook events seçildi mi? `customer.subscription.*` zorunlu |
| `Cron çalışmıyor` | Vercel Dashboard → Cron tab → log kontrol et |
| `RAG sonuç yok` | `npm run rag:index` lokalden çalıştırdın mı? |
| `Bedesten 429 rate limit` | `BEDESTEN_RATE_REFILL_S=5` yap (5 saniye spacing) |

---

## 🔄 Sürekli Deployment

GitHub'a her push → Vercel otomatik deploy:
- `main` branch → Production
- Diğer branch'ler → Preview URL (PR yorumlarında)

**Migration güncellemesi gerekirse:**
1. SQL'i `supabase/migrations/000X_*.sql` olarak ekle (idempotent!)
2. Production Supabase SQL Editor'da çalıştır
3. `MIGRATIONS-LOG.md` güncelle
4. PR aç + merge

---

**🎉 Tebrikler — HARIS canlı!**

Geri bildirimle gelecek geliştirmeler için:
- Faz 9: KVKK aydınlatma + cookie banner + veri silme
- Faz 10: Mobile app (React Native)
- Faz 11: UYAP entegrasyonu
