# ⚠️ KURULUM DÜZELTMESİ — bu dosyayı ÖNCE oku

## Ne oldu?

Benim elimdeki proje kopyası, senin `522571f` commit'inden **biraz daha eskiymiş**.
`type-check` bunu ortaya çıkardı. 4 ayrı çakışma vardı:

| # | Çakışma | Sebep | Çözüm |
|---|---|---|---|
| 1 | `src/lib/billing/gate.ts` | Sende zaten vardı (`assertUserCanUseAi`, `consumeAiCall`, `getBonusCalls`). Benim kopyamda yoktu → üzerine yazdım | Kodumu **`quota-gate.ts`** adlı YENİ dosyaya taşıdım. Senin `gate.ts`'in aynen kalıyor |
| 2 | `src/app/api/billing/status/route.ts` | Sende bonus çağrı mantığı vardı, benim kopyamda yoktu → üzerine yazdım | **Paketten çıkardım.** `git checkout` ile seninki geri geliyor |
| 3 | `engine.ts` içinde `court` yoktu | Sende Faz 14.0 ile mahkeme bilgisi (`0014_fuzzy_and_court`) eklenmiş | `court` alanı eklendi + dilekçe başlığında kullanılıyor |
| 4 | `orchestra-fab.tsx` ve `help-tips.tsx` | Senin repoda FAB dosyası hiç yok, HelpTips eski sürüm | İkisi de pakete eklendi |

Ayrıca `exceljs` tip hatası senin `node_modules` klasörünün eskiliğinden →
`npm ci --legacy-peer-deps` ile düzeliyor.

---

## Yapılacaklar (sırayla)

### Adım 1 · Ezilen 2 dosyanı geri yükle

```powershell
cd C:\AI\haris-app
git checkout -- src/lib/billing/gate.ts
git checkout -- src/app/api/billing/status/route.ts
```

Bu komutlar senin **orijinal** hallerini geri getirir. Kayıp yok.

### Adım 2 · Geçici dosyaları temizle

```powershell
git checkout -- supabase/.temp/cli-latest
git checkout -- ngrok.exe
Add-Content .gitignore "`nsupabase/.temp/"
```

### Adım 3 · Yeni paketi kopyala

`haris-app-FINAL-v2.zip` → çıkart → içindekileri `C:\AI\haris-app`'a kopyala
→ **"Hedefteki öğeleri değiştir"**

> Önceki `haris-app-FINAL.zip`'i attıysan sorun yok, bu onun düzeltilmiş hali.

### Adım 4 · Bağımlılıkları tazele (exceljs hatası için)

```powershell
npm ci --legacy-peer-deps
```

> ⚠️ `npm audit fix --force` ÇALIŞTIRMA.

### Adım 5 · Derleme testi

```powershell
npm run type-check
npm run build
```

**İkisi de hatasız bitmeli.** Hata çıkarsa tamamını bana gönder.

### Adım 6 · Push

```powershell
git config user.email "memraht@hotmail.com"
git config user.name "Muhammed Emrah Toraman"

git add src supabase .env.example KURULUM-FINAL.md KURULUM-DUZELTME.md PHASE-14.1-PROVIDER-FALLBACK.md PHASE-15-STAGED-ORCHESTRA.md PHASE-16-MODEL-STRATEGY.md PHASE-16.5-QUOTA-OWNER.md VERCEL-ENV-DOGRU-DEGERLER.md

git status
git diff --cached --stat
```

Kontrol: listede **`src/lib/billing/gate.ts` OLMAMALI** (senin dosyan değişmemeli),
**`src/app/api/billing/status/route.ts` OLMAMALI**.
`Kopya` geçen satır olmamalı.

```powershell
git commit -m "Faz 14.1-16.6: provider fallback, asamali orkestra (Canvas fix), Model Stratejisi, Gemini+Meta, OCR=Muse Spark 1.3, legal=Fable 5, kota+owner muafiyeti, React 418 fix"
git push origin main
```

### Adım 7 · Devam

`KURULUM-FINAL.md` → **Bölüm 5**'ten (Vercel env) devam et.
Migration 0016 zaten uygulandı ✅ (Bölüm 2'yi tekrar yapma).

---

## Bu paketteki dosyalar (değişiklik)

**Çıkarıldı:**
- ~~`src/lib/billing/gate.ts`~~ → senin dosyan, dokunulmuyor
- ~~`src/app/api/billing/status/route.ts`~~ → senin dosyan, dokunulmuyor

**Eklendi:**
- `src/lib/billing/quota-gate.ts` — yeni kota kapısı (senin gate.ts'ine dokunmaz)
- `src/components/v2/layout/orchestra-fab.tsx` — sağ alttaki altın "Süreci Başlat" butonu
- `src/components/v2/layout/help-tips.tsx` — güncel yardım ipuçları

**Güncellendi:**
- `src/lib/v2/orchestra/engine.ts` — `court` (mahkeme) desteği geri geldi
- `chat`, `orchestrate`, `debug/models` route'ları — artık `quota-gate`'i kullanıyor

---

## Not: Senin kota sistemin zaten varmış

`gate.ts` içinde `assertUserCanUseAi` + `consumeAiCall` + `getBonusCalls` +
`isBillingOwner` varmış ve V1 route'larında (`agents/run`, `documents/upload`,
`orchestrate/resume`) kullanılıyormuş.

Yani **sahip muafiyeti sende zaten kodluydu** — benim "kodda hiç yok" teşhisim
yanlıştı, özür dilerim. Muhtemelen sadece `HARIS_OWNER_USER_IDS` env'ine doğru
UUID yazılmadığı için çalışmıyordu.

Benim `quota-gate.ts`'im v2 tarafını (chat + orchestrate) kapsıyor.
İkisi birlikte çelişmez: seninki V1 + resume, benimki v2 chat/orkestra.

Push'tan sonra şunu test et:
```
https://haris-app-gamma.vercel.app/api/v2/debug/models
→ kota.sahipMuafiyeti: true olmalı
→ kota.gecersizOwnerIds: [] olmalı
```
