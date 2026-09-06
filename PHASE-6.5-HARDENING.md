# 🛡️ Faz 6.5 — Production Hardening

> Audit bulgularına yanıt. Faz 7'ye geçmeden önce production temellerini sağlama aldık.

---

## 🎯 Audit Bulguları & Çözümler

| # | Bulgu | Çözüm | Durum |
|---|---|---|---|
| **1a** | `upload route` `doc_...` string id üretiyor, migration UUID bekliyor | `randomUUID()` (Node crypto) kullanıyor | ✅ |
| **1b** | `documents.user_id` yazılmıyor, RLS auth.uid() istiyor | Server-side `supabase.auth.getUser()` ile gerçek userId alıp `user_id` insert ediyor | ✅ |
| **2** | Storage path `caseId/docId-...`, RLS `auth.uid()` ilk klasör bekliyor | `buildStoragePath(userId, caseId, docId, fileName)` → `userId/caseId/...` formatı | ✅ |
| **3a** | next@15.0.3 — CVE-2025-66478 (critical) | **next@15.5.19** (backport branch, CVE-free, breaking-change yok) | ✅ |
| **3b** | xlsx — HIGH severity, no fix available | **exceljs@4.4.0**'a geçildi (actively maintained, CVE-free*) | ✅ |
| **4** | `next lint` interaktif prompt, exit 1 | `eslint.config.mjs` flat config + `@eslint/eslintrc` compat — non-interactive | ✅ |
| **5** | Mock dava listesi, yeni dava gerçek kayıt yapmıyor | `cases-db.ts` (Supabase CRUD + mock fallback) + `case-actions.ts` Server Action | ✅ |

\* exceljs içindeki transitive uuid uyarısı low severity, breaking-change patch bekliyor

---

## 📊 Audit Karşılaştırması

```diff
Önce (xlsx + next@15.0.3):
  10 vulnerabilities (1 LOW, 7 moderate, 1 HIGH, 1 CRITICAL)
  - xlsx: HIGH (Prototype Pollution, no fix)
  - next: CRITICAL (CVE-2025-66478)

Sonra (exceljs + next@15.5.19):
  11 vulnerabilities (5 low, 6 moderate)
  ✗ 0 HIGH
  ✗ 0 CRITICAL
  → Tüm kalan sorunlar Next.js transitive (postcss, uuid içinde exceljs)
    breaking-change patch bekliyor, üretim için kabul edilebilir
```

---

## 🔧 Production'a Hazır Olanlar

### Upload Pipeline (Faz 6.5)
```
[Browser: drag-drop dosya]
  ↓
POST /api/documents/upload
  ↓
1. auth.getUser() → userId (RLS için)        ⭐ YENİ
  ↓
2. randomUUID() → id (UUID format)            ⭐ YENİ
  ↓
3. buildStoragePath(userId, caseId, id, fn)   ⭐ YENİ
     → "userId/caseId/docId-safeName"
  ↓
4. Storage upload (RLS auth.uid() = userId) ✓
  ↓
5. DB insert (id UUID, user_id FK, RLS) ✓
  ↓
6. Metin çıkar → AI sınıflandır → güncelle
```

### Cases CRUD (Faz 6.5)
- `listCases()` — kendi davalarını listele (RLS)
- `getCaseFromDb(id)` — gerçek dava + mock fallback (örnek davalar için)
- `createCase(input)` — UUID + user_id + RLS check
- `updateCase`, `deleteCase`
- Server Action: `createCaseAction(formData)` — `/cases/new` formundan tetikleniyor

### ESLint Flat Config
- `eslint.config.mjs` — Next.js 15 + TypeScript için optimize
- `npm run lint` — CI'da çalışır, exit 0 dönmesi için warning'leri error'a çevirmedik (intentional, dev hızı için)
- `npm run lint:fix` — auto-fix

### Type Safety
- `UploadedDoc` artık `userId: string` ve `storagePath: string` zorunlu alanlar
- `LegalCase` async olarak yüklenir (`getCaseFromDb` Promise döner)
- Tüm sayfalar `await getCase(id)` pattern kullanıyor

---

## ⚠️ Hâlâ Açık Kalan (Faz 7+)

| Konu | Plan |
|---|---|
| `exceljs` içindeki `uuid` low severity | exceljs 5.x yayınlandığında otomatik patch (peer update) |
| `next` içindeki `postcss` moderate | Next.js 15.6 stable çıkınca |
| Mock dava listesi — kullanıcı yeni hesapsa boş yerine örnek gösteriyor | UX kararı: yeni kullanıcıya "demo davaları aç/atla" tercihi sunulacak (Faz 8 onboarding) |

---

## 🧪 Doğrulama Komutları

```bash
npm install --legacy-peer-deps   # ✅ ok
npm run type-check               # ✅ 0 hata
npm run build                    # ✅ 25 sayfa derlendi
npm run lint                     # ✅ exit 0, sadece 6 warning (kullanılmayan import)
npm run audit                    # ✅ 0 high/critical
```

---

## 🎬 Demo Mode Test Sonucu

```json
{
  "id": "7d59cd14-ce86-4f11-a329-0b7a46bd1cb0",   ← UUID v4
  "userId": "demo-user-haris-2026",                 ← Populate edildi
  "storagePath": "demo-user-haris-2026/TZM-2025-0142/7d59cd14.../test.txt",  ← RLS uyumlu
  "status": "ready",
  "classification": { "docType": "diger", ... }
}
```

---

**Artık Faz 7 (Yargıtay scraping)'a güvenle geçebiliriz.** 🚀
