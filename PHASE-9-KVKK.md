# 🛡️ Faz 9 — KVKK Uyumluluk + Hukuki Sayfalar

> **Bir hukuk platformu olarak KVKK'da örnek olmamız gerek.**
>
> Faz 9 ile HARIS, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun **tüm temel
> yükümlülüklerini karşılayan** bir altyapıya sahip oldu.

---

## 🎯 KVKK Hangi Hükümler Karşılandı?

| Madde | Yükümlülük | HARIS Karşılığı |
|---|---|---|
| **m.4** | Veri işleme ilkeleri (hukuka uygunluk, belirli amaç, sınırlılık) | Aydınlatma metni + plan açıklamaları |
| **m.5** | Hukuki sebepler (rıza, sözleşme, hukuki yükümlülük, meşru menfaat) | Her veri kategorisi için belirtildi |
| **m.7** | **Unutulma Hakkı** — silme/yok etme | `/api/account/delete` + 30 gün cool-off + RPC |
| **m.10** | **Aydınlatma Yükümlülüğü** | `/legal/privacy` + versiyon takibi + consent records |
| **m.11** | **İlgili Kişinin Hakları** (8 hak) | `/legal/kvkk-basvuru` formu + `kvkk_requests` tablosu |
| **m.12** | **Veri Sorumlusu Yükümlülüğü** (güvenlik, audit) | `audit_logs` + IP/UA + RLS + AES-256 |
| **m.13** | **Başvuru süresi** (30 gün) | `deadline_at` GENERATED column |
| **m.18** | İdari para cezası önlemi | Tüm sistemin transparent + dokumante |

---

## 📁 Yeni Dosyalar (16 dosya)

```
supabase/migrations/
└── 0005_kvkk_compliance.sql    # 5 tablo + 2 RPC + RLS

src/lib/kvkk/
├── constants.ts                 # DATA_CONTROLLER, request types, versiyonlar
└── audit.ts                     # logAudit() — IP + UA + meta

src/app/(legal)/                # Public legal sayfaları
├── layout.tsx                   # Nav + footer
└── legal/
    ├── privacy/page.tsx         # Aydınlatma Metni
    ├── terms/page.tsx           # Kullanım Şartları
    ├── cookies/page.tsx         # Çerez Politikası
    └── kvkk-basvuru/page.tsx    # m.11 başvuru formu

src/app/api/
├── kvkk/request/route.ts        # POST — başvuru kabul
├── account/export/route.ts      # GET — JSON export (m.11/d)
├── account/delete/route.ts      # POST/DELETE — Cool-off (m.7)
└── account/consent/route.ts     # POST/GET — Rıza tracking (m.10)

src/components/
├── legal/
│   ├── legal-page.tsx           # Standart legal layout
│   └── cookie-banner.tsx        # GDPR/KVKK çerez banner
└── settings/
    └── privacy-section.tsx      # Settings → Gizlilik tabı
```

---

## 🌟 En Önemli Üç Özellik

### 1. **Cool-Off ile Hesap Silme** (KVKK m.7 Unutulma Hakkı)

```typescript
// Kullanıcı silme talebi gönderir
POST /api/account/delete { confirm: true, retentionChoice: "anonymize" }

→ scheduled_deletion_at = now() + 30 days
→ audit log
→ Kullanıcı fikrini değiştirebilir: DELETE /api/account/delete
→ Cron 30 gün sonra fiziksel silmeyi yapar (Faz 10 — TODO)
```

**3 retention seçeneği:**
- `anonymize`: Kişisel veri silinir, agregat istatistik kalır (önerilen)
- `delete_immediately`: Hemen sil (yasal asgari hariç)
- `legal_minimum`: VUK + TBK gerektirdiği asgari (10 yıl fatura arşivi)

### 2. **Immutable Consent Records** (KVKK m.10 + m.12 Kanıt)

Her açık rıza işlemi:
- Versiyon takibi (`v1.0.0-2026-06-06`)
- IP + User-Agent (m.12 yükümlülüğü)
- Zaman damgası
- **UPDATE/DELETE policy YOK** → kayıt **immutable** (yasal kanıt)

```sql
-- Kanıt: kullanıcı 6 Haziran 2026'da v1.0.0 aydınlatma metnini okudu
SELECT * FROM consent_records
WHERE user_id = ? AND consent_type = 'kvkk_aydinlatma'
ORDER BY created_at DESC LIMIT 1;
```

### 3. **30 Günlük Yasal Yanıt Garantisi**

`deadline_at` PostgreSQL `GENERATED ALWAYS AS` ile otomatik hesaplanır:
```sql
deadline_at timestamptz generated always as (created_at + interval '30 days') stored
```

Admin dashboard'da (Faz 10) "yarın deadline'ı dolacak başvurular" sorgusu:
```sql
SELECT * FROM kvkk_requests
WHERE status IN ('received', 'in_review')
  AND deadline_at < now() + interval '24 hours';
```

---

## 🍪 Cookie Banner Davranışı

```
İlk ziyaret (localStorage boş)
  → 800ms bekle (sayfa yüklensin)
  → Banner alt köşede açılır
  → 3 seçenek:
     • Sadece Zorunlu (analitik/pazarlama RED)
     • Tercihleri Özelleştir (detay seçim)
     • Tümünü Kabul Et

Seçim → localStorage'a kaydet + /api/account/consent'a POST
       → Banner kapanır, 1 yıl gizli kalır
       → Versiyon değişirse yeniden açılır
```

---

## 📋 Live Test Sonuçları

```bash
✓ /legal/privacy → 4 sayfa içerik render (Aydınlatma, Şartlar, Çerez, Başvuru)
✓ POST /api/kvkk/request → 30 gün deadline'lı başvuru kaydı (anonim destek)
✓ GET  /api/account/export → JSON export (KVKK m.11/d gerekçeli metadata)
✓ POST /api/account/delete → 30 gün cool-off + scheduled_at döner
✓ Cookie banner → SSR-safe (hydration yok), 800ms gecikmeli açılır
✓ Footer (landing) → 5 legal link eklendi
✓ Settings → "Gizlilik & KVKK" sekmesi: export + delete + KVKK form linki
```

---

## ⚠️ DİKKAT: SUPABASE/ENV DEĞİŞİKLİĞİ

Bu sprintte:

| Dosya | Tip | Risk |
|---|---|:---:|
| **`supabase/migrations/0005_kvkk_compliance.sql`** | ⭐ YENİ | 🔴 KRİTİK |
| **`.env.example`** | Değişmedi | — |

### Yapmanız gerekenler:

1. **Supabase SQL Editor → `0005_kvkk_compliance.sql` içeriğini yapıştır + Run** (idempotent)
2. **`src/lib/kvkk/constants.ts`** dosyasındaki `DATA_CONTROLLER` bilgilerini gerçek şirket bilgileriyle değiştir:
   - `legalName`, `mersis`, `address`, `phone`, `email`, `vergiNo`, `vergiDairesi`
3. **KVKK iletişim e-postası kur**: `kvkk@yourdomain.com` (örn: kvkk@haris.av.tr)
4. (Production) **Veri sorumlusu kayıt** — VERBİS'e (Veri Sorumluları Sicili) kayıt başvurusu

---

## 🏛 Production Checklist (Türkiye)

KVKK denetiminde sorulan tipik sorular:

- [ ] **VERBİS kaydı yapıldı mı?** (Yıllık ciro 100M TL+ veya çalışan 50+ ise zorunlu)
- [ ] **Aydınlatma metni 7/24 erişilebilir mi?** ✅ `/legal/privacy`
- [ ] **Açık rıza işlemleri kayıt altında mı?** ✅ `consent_records` (IP + UA + versiyon)
- [ ] **30 gün yanıt süresi takip ediliyor mu?** ✅ `kvkk_requests.deadline_at`
- [ ] **Audit log tutuluyor mu?** ✅ `audit_logs` (m.12)
- [ ] **Veri ihlali yönetim planı var mı?** TODO: Incident response prosedürü (Faz 10)
- [ ] **DPO atandı mı?** (50+ çalışan veya kritik veri işliyorsa zorunlu)
- [ ] **DPIA yapıldı mı?** (AI ile karar verme nedeniyle — TODO)

---

**Sonraki Faz Önerileri:**

| Faz | Konu |
|---|---|
| **Faz 10** | Admin dashboard (KVKK başvuru yönetimi, audit log viewer, deletion cron) |
| Faz 11 | Danıştay + AYM + AİHM scraper adapter'ları |
| Faz 12 | Mobile app (React Native) |
| Faz 13 | UYAP entegrasyonu |

---

*Bir hukuk platformu olarak HARIS, kendi hukukuna uymakla yükümlüdür. ✅*
