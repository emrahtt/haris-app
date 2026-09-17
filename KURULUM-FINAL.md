# HARIS — SON KURULUM DOSYASI (Faz 14.1 → 16.6)
## Tek seferde yapılacak her şey · Sırayla uygula · ~35 dakika

> **Bu tek dosya yeter.** Diğer PHASE-*.md dosyaları sadece teknik referans.
> Üzerine kurulduğu commit: `522571f` (Faz 14.0)
> 0014/0015 migration'larını zaten çalıştırdın → tekrar çalıştırma.
> Bu pakette **1 yeni migration var: 0016** → onu çalıştırman gerekiyor.

---

# BÖLÜM 0 · NE DEĞİŞİYOR? (özet)

| # | Sorun / İstek | Sonuç |
|---|---|---|
| 1 | Anthropic kredisi bitince orkestra duruyordu | 4 sağlayıcı arasında otomatik yedekleme |
| 2 | `HARIS_DRAFTER_MODEL=gemini-3.8-flash` sessizce Claude oluyordu | Geçersiz env artık uyarı veriyor + teşhis sayfası |
| 3 | **Canvas'a dilekçe düşmüyordu** (Vercel 300 sn limiti) | Orkestra 4 aşamaya bölündü, her birinin kendi 300 sn'si var |
| 4 | React error #418 | Sunucu/tarayıcı saat farkı giderildi |
| 5 | `HARIS_OWNER_USER_IDS` kodda hiç okunmuyordu | Gerçek sahip muafiyeti + kota kapısı (402 çözümü) |
| 6 | Sohbet 4000 token'da kesiliyordu | 8000'e çıktı (`HARIS_CHAT_MAX_TOKENS`) |
| 7 | Ajan "Canvas'a yazamıyorum, docx üretemiyorum" diyordu | Platform kimliği prompt'u eklendi, o ifadeler yasaklandı |
| 8 | `gpt-4o` 13 Şub 2026'da emekli oldu | OCR varsayılanları güncellendi |
| 9 | **Model Stratejisi paneli** istedin | `/settings/model-strategy` — kaydet/geri yükle/varsayılana dön |
| 10 | **Gemini + Meta** istedin | İkisi de eklendi (4 sağlayıcı) |
| 11 | **OCR varsayılanı Muse Spark 1.3 olsun** | ✅ `auto` → Meta Vision (reasoning high), olmazsa OpenAI'a düşer |
| 12 | **Legal'de Fable 5 olsun** | ✅ Analistler + Dilekçe Editörü → `claude-fable-5` |
| 13 | V2'de çıkış yolu yoktu | Üst barda hesap menüsü (çıkış / hesap değiştir) |

---

# BÖLÜM 1 · DOSYALARI KOPYALA (3 dk)

1. `haris-app-FINAL.zip` → sağ tık → **Tümünü Çıkart** → `C:\AI\haris-app-final`
2. Çıkarttığın klasörün içindekileri **Ctrl+A → Ctrl+C**
3. `C:\AI\haris-app` içine **Ctrl+V** → **"Hedefteki öğeleri değiştir"**

```powershell
cd C:\AI\haris-app
git status
```

Beklenen: `modified: ~16`, `untracked: ~13`. **`Kopya` geçen satır OLMAMALI.**

> `deleted: ngrok.exe` görürsen:
> `git rm ngrok.exe` (repodan çıkar, önerilen) **veya** `git checkout -- ngrok.exe` (geri getir)

---

# BÖLÜM 2 · SUPABASE MİGRATİON 0016 (2 dk) — ZORUNLU

Model Stratejisi paneli veritabanında saklanıyor. Bu adım atlanırsa panel hata verir.

1. https://supabase.com/dashboard/project/epdjkejtwosdozhdbroq
2. Sol menü → **SQL Editor** → **New query**
3. `supabase\migrations\0016_model_strategies.sql` içeriğini **olduğu gibi** yapıştır
4. **Run**

Beklenen: `Success. No rows returned`
(Dosya idempotent — iki kez çalıştırmak zarar vermez.)

---

# BÖLÜM 3 · DERLEME TESTİ (5 dk)

```powershell
npm run type-check
npm run build
```

- `type-check` **hiç çıktı vermeden** biter → başarılı
- `build` sonunda `✓ Compiled successfully` ve şu yeni satırlar olmalı:
  ```
  ├ ƒ /api/strategies
  ├ ƒ /api/strategies/test
  ├ ƒ /api/v2/debug/models
  ├ ƒ /settings/model-strategy
  ```
- ⚠️ **`npm audit fix --force` ÇALIŞTIRMA** (geçen sefer Next 15.5 → 9.3.3'e düşürüp bozdu)
- Sarı `Warning` satırları normaldir, hepsi önceden var olanlar

Build patlarsa: `git checkout .` → hata metnini bana gönder.

---

# BÖLÜM 4 · GİT PUSH (3 dk)

```powershell
git config user.email "memraht@hotmail.com"
git config user.name "Muhammed Emrah Toraman"

git add src supabase .env.example KURULUM-FINAL.md PHASE-14.1-PROVIDER-FALLBACK.md PHASE-15-STAGED-ORCHESTRA.md PHASE-16-MODEL-STRATEGY.md PHASE-16.5-QUOTA-OWNER.md VERCEL-ENV-DOGRU-DEGERLER.md

git status
git diff --cached --stat
```

Listede `Kopya` varsa → `git reset` → tekrar ekle. **`git add .` YASAK.**

```powershell
git commit -m "Faz 14.1-16.6: provider fallback, asamali orkestra (Canvas fix), Model Stratejisi paneli, Gemini+Meta, OCR=Muse Spark 1.3, legal=Fable 5, kota+owner muafiyeti, React 418 fix"
git push origin main
```

---

# BÖLÜM 5 · VERCEL ENV (7 dk)

Vercel → **haris-app** → Settings → Environment Variables

## 5.1 · Model değişkenleri (SENİN SEÇİMİN: legal=Fable 5, OCR=Muse Spark)

```env
HARIS_ORCHESTRATOR_MODEL=anthropic:claude-opus-5
HARIS_ANALYZER_MODEL=anthropic:claude-fable-5
HARIS_DRAFTER_MODEL=anthropic:claude-fable-5
HARIS_QUICK_MODEL=anthropic:claude-sonnet-5
HARIS_OPPOSITION_MODEL=openai:gpt-5.6-sol
HARIS_VISION_MODEL=meta:muse-spark-1.3
HARIS_META_VISION_MODEL=muse-spark-1.3
HARIS_GEMINI_MODEL=gemini-3.8-flash
HARIS_EMBEDDING_MODEL=openai:text-embedding-3-large
HARIS_DEFAULT_MODEL=openai:gpt-5.6-sol
HARIS_ADVERSARIAL_MODEL=anthropic:claude-fable-5
```

**Düzeltilecek eski değerler:**

| Key | ❌ Eski | ✅ Yeni |
|---|---|---|
| `HARIS_DRAFTER_MODEL` | `gemini-3.8-flash` | `anthropic:claude-fable-5` |
| `HARIS_ANALYZER_MODEL` | `anthropic:claude-opus-5` | `anthropic:claude-fable-5` |
| `HARIS_OPPOSITION_MODEL` | `openai:gpt-5.6-Sol` | `openai:gpt-5.6-sol` (küçük harf) |
| `HARIS_DEFAULT_MODEL` | `openai:gpt-5.6-Sol` | `openai:gpt-5.6-sol` |
| `HARIS_ADVERSARIAL_MODEL` | `gemini-3.8-flash` | `anthropic:claude-fable-5` |
| `HARIS_QUICK_MODEL` | `anthropic:claude-opus-5` | `anthropic:claude-sonnet-5` |
| `HARIS_VISION_MODEL` | `anthropic:claude-opus-5` | `meta:muse-spark-1.3` |

> 💰 **Maliyet notu:** Fable 5 = $10 girdi / $50 çıktı (1M token). Opus 5'in 2 katı.
> 6-10 sayfalık bir dilekçe ≈ **$0.90 – $1.60**. Opus 5 ile bu $0.45 – $0.80'di.
> Pahalı gelirse panelden tek tıkla Opus 5'e dönebilirsin (Redeploy gerekmez).

## 5.2 · Yeni eklenecekler

```env
HARIS_ENABLE_PROVIDER_FALLBACK=true
HARIS_FALLBACK_MODEL=openai:gpt-5.6-sol
HARIS_FALLBACK_ANTHROPIC_MODEL=anthropic:claude-sonnet-5
HARIS_DOC_CHAR_BUDGET=100000
HARIS_CHAT_MAX_TOKENS=8000
HARIS_QUOTA_ENFORCEMENT=on
HARIS_OWNER_USER_IDS=<KENDİ-SUPABASE-UUID>, cd6055ef-e080-45d8-8148-9f8b2c5fbfef
GEMINI_API_KEY=<Google AI Studio anahtarın>
MODEL_API_KEY=<Meta Model API anahtarın>
```

### ⚠️ `HARIS_OWNER_USER_IDS` için doğru UUID

```
Supabase Dashboard → Authentication → Users → kendi e-postana tıkla → User UID
```

Format: `8-4-4-4-12` tireli. `FSqtYoqk93esuIhtelLl98Pc` gibi değerler
**Vercel ID'sidir, işe yaramaz.** Teşhis sayfası yanlış yazarsan yakalar.

Test sırasında kotayı tamamen kapatmak istersen: `HARIS_QUOTA_ENFORCEMENT=off`

## 5.3 · Süre limiti kontrolü — Canvas bug'ı için KRİTİK

- Vercel → Settings → **Plan** → Hobby mi Pro?
- Vercel → Project → Settings → **Functions** → **Fluid Compute AÇIK mı?**

| Durum | Limit |
|---|---|
| Hobby + Fluid **KAPALI** | **60 sn** ← orkestra yetişmez, **AÇ** |
| Hobby + Fluid **AÇIK** | 300 sn ← Faz 15 ile yeterli |
| Pro + Fluid | 300 sn (800'e çıkarılabilir) |

## 5.4 · Redeploy

Deployments → en üstteki → **⋯** → **Redeploy**

## 5.5 · Kredi (en az birinde olmalı)

```
Anthropic → https://console.anthropic.com/settings/billing        (min 5$)
OpenAI    → https://platform.openai.com/settings/organization/billing
Meta      → https://dev.meta.ai  (Model API bakiyesi)
```

---

# BÖLÜM 6 · TEST (7 dk)

## 6.1 · Teşhis sayfası (login olmuşken)

```
https://haris-app-gamma.vercel.app/api/v2/debug/models?test=1
```

Beklenen:
```json
"ozet": "Tüm modeller çalışıyor.",
"kota": { "sahipMuafiyeti": true, "gecersizOwnerIds": [], "serbest": true },
"etkiliRoller": [ { "role": "drafter", "model": "anthropic:claude-fable-5", ... } ]
```

| Görürsen | Anlamı |
|---|---|
| `kota_bitti` | O hesabın kredisi yok |
| `model_bulunamadi` | Model ID yanlış yazılmış |
| `anahtar_gecersiz` | API key hatalı |
| `gecersizOwnerIds` dolu | UUID olmayan değer yazmışsın |

## 6.2 · Model Stratejisi paneli

```
https://haris-app-gamma.vercel.app/settings/model-strategy
```
(V1 sol menü → **Hesap → Model Stratejisi**)

- Her rol için **🩺 Test et** → modeli canlı dener
- Değiştir → isim ver → **💾 Kaydet ve etkinleştir** (Redeploy gerekmez, 15 sn'de etkili)
- **↩️ Varsayılana dön** → env'e geri döner

## 6.3 · OCR testi (Muse Spark)

1. `/v2` → bir matter → sol Vault → **+ Belge Ekle**
2. Taranmış bir PDF seç → yöntem listesinde **🟠 Muse Spark 1.3 Vision (VARSAYILAN)** görülmeli
3. **Akıllı (Otomatik)** seç → belge işlensin
4. Belge satırında `Muse Spark muse-spark-1.3 (N sayfa)` yazmalı

## 6.4 · Orkestra testi — ANA TEST

1. `/v2` → matter aç → **F12** → Console
2. ⚙️ → **Preserve log** işaretle ← yoksa önceki loglar kaybolur
3. Filtre kutusuna: `SSE`
4. **Süreci Başlat**

Beklenen:
```
[AŞAMA] round1 başlıyor
[SSE agent_start] [SSE agent_done] × 6
[AŞAMA] round1 bitti · 94.2 sn · temiz kapanış: true
[AŞAMA] round2 başlıyor
[AŞAMA] draft başlıyor
[CANVAS] petition_draft v1 alındı, 14820 karakter   ← BU SATIR = ÇÖZÜLDÜ
[AŞAMA] quality başlıyor
[SSE completed]
```

## 6.5 · Diğer kontroller

- Console'da `Minified React error #418` **olmamalı**
- V2 üst barı sağda **hesap menüsü** → Çıkış Yap / Hesap Değiştir çalışmalı
- Giriş sonrası `/dashboard`'a düşmeli (V2'ye değil)
- Ajana "dilekçe yaz" dediğinde **"Canvas'a yazamıyorum" DEMEMELİ**;
  seni "Süreci Başlat"a yönlendirmeli

---

# BÖLÜM 7 · SONUÇ TABLOSU

| Ne görürsen | Ne yap |
|---|---|
| `[CANVAS] petition_draft v1 alındı` | ✅ **Çözüldü** — bana haber ver |
| `Sunucu bağlantısı "draft" aşamasında kesildi` | `HARIS_DOC_CHAR_BUDGET=50000` + Ayarlar → dilekçe uzunluğu "Kısa" + ajan sayısı 4 → Redeploy |
| `💳 ... kredisi bitti` | Bölüm 5.5 |
| `⏸ Aylık AI kotan doldu` | `HARIS_OWNER_USER_IDS`'ye UUID'ni ekle (Bölüm 5.2) → Redeploy |
| `Dilekçe aşamasına geçilemedi: ... ajan çıktısı bulunamadı` | Analiz aşamasında tüm ajanlar hata verdi → 6.1'deki testi çalıştır |
| Panel "Supabase yapılandırılmamış" | Bölüm 2'yi (migration 0016) yapmadın |
| Meta OCR çalışmıyor, OpenAI'a düşüyor | `MODEL_API_KEY` yok veya Meta API bölgesel kısıtlı → Console'da `[OCR] Meta Vision başarısız` logunu bana gönder |

---

# GERİ ALMA

```powershell
cd C:\AI\haris-app
git checkout .
git clean -fd src supabase
git push origin main --force-with-lease
```

Migration 0016 zararsızdır, geri almana gerek yok.
Vercel'de eski sürüme dönmek: Deployments → çalışan son deploy → ⋯ → **Promote to Production**

---

# SSS

**Dilekçe parça parça mı gelecek, "devam" diyecek miyim?**
Hayır. Canvas'a tek seferde tam metin düşer (16.000 token bütçe ≈ 25-30 sayfa).

**"Muse Spark 1.3 MAX" diye ayrı bir model var mı?**
Hayır, doğrulayamadım. Meta'nın yayınladığı ID'ler: `muse-spark-1.3`,
`muse-spark-1.3-contributor`, `muse-spark-1.2`, `muse-spark-1.1`.
"MAX" isteğini **`muse-spark-1.3` + `reasoning_effort: high`** olarak uyguladım —
Meta API'de en yüksek muhakeme seviyesi bu.

**"Opus 5.1" var mı?**
Hayır. Opus serisi: 5 → 4.8 → 4.7 → 4.6. "5.1" sürümü olan seri **Fable**:
`claude-fable-5-1`. İstersen panelden Fable 5 yerine Fable 5.1'e geçebilirsin
(daha yeni, aynı fiyat: $10/$50).

**`muse-spark-1.3-contributor` neden önerilmiyor?**
Daha ucuz ama prompt/çıktılarınla Meta'nın model eğitmesine izin veriyor.
Müvekkil verisi için **KVKK riski**. Panelde kırmızı uyarıyla işaretli.

**0014/0015'i tekrar çalıştıracak mıyım?** Hayır. Sadece **0016**.

**`npm ci` gerek mi?** Hayır, `package.json` değişmedi.

**Strateji değiştirmek için Redeploy gerekir mi?** Hayır, en geç 15 saniyede etkili.

**V1 ekranları bozulur mu?** Hayır. `?stage` verilmezse orkestra eski davranışını korur.
