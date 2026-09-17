# FAZ 16 — Model Stratejisi Paneli + Gemini/Meta Sağlayıcıları

## Ne eklendi?

V1 arayüzünde yeni bir menü: **⚙️ Hesap → Model Stratejisi** (`/settings/model-strategy`)

Buradan her rol için sağlayıcı + model + muhakeme seviyesi seçebilir, seçimi
**isim ve açıklama ile kaydedebilir**, sonra tek tıkla geri yükleyebilirsin.
"Varsayılana dön" butonu seni Vercel env ayarlarına geri döndürür.

> **Neden veritabanı?** Vercel env değişkenleri build anında sabitlenir,
> çalışma sırasında değiştirilemez. Panelden yapılan seçimin anında etkili
> olması için Supabase'de saklanması gerekiyor (`model_strategies` tablosu).
> Bu yüzden **migration 0016 çalıştırılmalı.**

## Öncelik sırası (kod nasıl karar veriyor?)

```
1) Kullanıcının AKTİF stratejisi   (Supabase · model_strategies)
2) Vercel env değişkenleri          (HARIS_*_MODEL)
3) Kod içi DEFAULT_STRATEGY
```

Aktif strateji 15 saniye önbelleğe alınır → değişiklik en geç 15 sn'de etkili.
Redeploy GEREKMEZ.

## Roller

| Rol | Ne yapar |
|---|---|
| `orchestrator` | Orkestra Şefi |
| `analyzer` | Maddi Hukuk, Usul, İçtihat, Delil, Bilirkişi, Atıf Doğrulayıcı |
| `drafter` | **Dilekçe Editörü** → Canvas'a yazan ajan (varsayılan 16.000 token) |
| `opposition` | Karşı Argüman / şeytan avukatı |
| `quick` | Sınıflandırma, özet, hafıza çıkarımı, müvekkil iletişim |
| `vision` | PDF/OCR |

## DOĞRULANMIŞ model kataloğu (11-14 Eylül 2026)

`src/lib/v2/providers/catalog.ts` içinde. **Uydurma isim yok**, hepsi kaynaklı.

### Anthropic
| Model ID | İsim | $/1M girdi-çıktı | Bağlam | Durum |
|---|---|---|---|---|
| `claude-fable-5-1` | Claude Fable 5.1 | 10 / 50 | 1M | güncel (1 Eyl 2026) |
| `claude-fable-5` | Claude Fable 5 | 10 / 50 | 1M | güncel |
| `claude-opus-5` | Claude Opus 5 | 5 / 25 | 1M | güncel |
| `claude-sonnet-5` | Claude Sonnet 5 | 2 / 10 | 1M | güncel |
| `claude-opus-4-8` / `-4-7` / `-4-6` | Opus 4.8/4.7/4.6 | 5 / 25 | 1M | eski ama aktif |
| `claude-sonnet-4-6` | Sonnet 4.6 | 3 / 15 | 200K | eski |
| `claude-haiku-4-5` | Haiku 4.5 | 1 / 5 | 200K | güncel/ucuz |

> ⚠️ **`claude-opus-5-1` diye bir model YOK.** Opus serisi: 5 → 4.8 → 4.7 → 4.6.
> "5.1" sürümü olan seri **Fable**'dır: `claude-fable-5-1`.
> `claude-mythos-5` davetiyeyle (Project Glasswing) — listeye alınmadı.

### OpenAI
| Model ID | İsim | $/1M | Bağlam | Muhakeme |
|---|---|---|---|---|
| `gpt-5.6-sol` | GPT-5.6 Sol (alias `gpt-5.6`) | 5 / 30 | 1.05M | none→max |
| `gpt-5.6-terra` | GPT-5.6 Terra | 2 / 12 | 1.05M | none→max |
| `gpt-5.6-luna` | GPT-5.6 Luna | 0.2 / 1.2 | 1.05M | none→max |

> ⚠️ **`gpt-4o` ve `gpt-4.1` 13 Şubat 2026'da EMEKLİ OLDU.** Kodda varsayılan
> olan `gpt-4o` (OpenAI Vision OCR) → `gpt-5.6-terra` olarak düzeltildi.
> OpenAI reasoning effort değerleri: `none, low, medium, high, xhigh, max`.
> HARIS panelinde basitlik için low/medium/high sunuluyor.

### Google Gemini
| Model ID | İsim | $/1M | Bağlam | Durum |
|---|---|---|---|---|
| `gemini-3.8-flash` | Gemini 3.8 Flash | 0.75 / 3.75 | 1M | güncel (2 Eyl 2026) |
| `gemini-3.7-flash` | Gemini 3.7 Flash | — | 1M | güncel |
| `gemini-3.6-flash` | Gemini 3.6 Flash | 1.5 / 7 | 1M | güncel |
| `gemini-3.5-flash` | Gemini 3.5 Flash | 1.5 / 9 | 1M | eski |
| `gemini-3.5-flash-lite` | Flash-Lite | 0.3 / 2.5 | 1M | en ucuz |
| `gemini-3.1-pro-preview` | Gemini 3.1 Pro | 2 / 12 | 1M | **önizleme** |
| `gemini-3-flash-preview` | Gemini 3 Flash | 0.5 / 3 | 1M | önizleme |

> Senin `HARIS_GEMINI_MODEL=gemini-3.8-flash` değerin **DOĞRU** — gerçek bir
> model. Sorun, orkestrada Gemini sağlayıcısının olmamasıydı; artık var.
> Gemini reasoning karşılığı: `generationConfig.thinkingConfig.thinkingLevel`
> = `low | medium | high` (kod bunu otomatik gönderiyor).

### Meta (Muse Spark)
| Model ID | İsim | Durum |
|---|---|---|
| `muse-spark-1.3` | Muse Spark 1.3 (2 Eyl 2026) | **sınırlı — yalnızca ABD önizlemesi** |
| `muse-spark-1.2` | Muse Spark 1.2 | sınırlı |
| `muse-spark-1.1` | Muse Spark 1.1 ($1.25/$4.25) | sınırlı |
| `muse-spark-1.3-contributor` | indirimli | ⚠️ **KVKK RİSKİ** |

> Meta Model API: `https://api.meta.ai/v1` (OpenAI-uyumlu), anahtar env'i
> **`MODEL_API_KEY`**, kayıt: `https://dev.meta.ai`.
> **Şu an halka açık önizleme yalnızca ABD'li geliştiricilere açık.**
> Türkiye'den anahtar alamazsan Meta modelleri panelde "anahtar yok" görünür,
> seçsen de çalışmaz. Bunu bilerek listeye ekledim.
>
> `muse-spark-1.3-contributor` daha ucuzdur AMA prompt/çıktılarınla Meta'nın
> model eğitmesine izin verir. **Müvekkil verisi için kullanma** — panelde
> kırmızı uyarı olarak gösteriliyor.

## Yeni env değişkenleri

| Key | Açıklama |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio anahtarı (sende var) |
| `MODEL_API_KEY` | Meta Model API anahtarı (opsiyonel, ABD önizleme) |
| `HARIS_CHAT_MAX_TOKENS` | Sohbet yanıtı token tavanı — varsayılan **8000** (eskiden sabit 4000'di) |
| `HARIS_DOC_CHAR_BUDGET` | Ajanlara giden toplam belge karakteri — varsayılan 100000 |

## Değişen/yeni dosyalar

| Dosya | Durum |
|---|---|
| `supabase/migrations/0016_model_strategies.sql` | **YENİ — Supabase'de çalıştırılmalı** |
| `src/lib/v2/providers/catalog.ts` | **YENİ** — doğrulanmış model kataloğu |
| `src/lib/v2/providers/clients.ts` | **YENİ** — Gemini/Meta/OpenAI/Anthropic doğrudan istemcileri |
| `src/lib/v2/strategy/db.ts` | **YENİ** — strateji CRUD + `resolveRoleModel()` |
| `src/app/api/strategies/route.ts` | **YENİ** — GET/POST/DELETE |
| `src/app/api/strategies/test/route.ts` | **YENİ** — modeli canlı test eder |
| `src/app/(app)/settings/model-strategy/page.tsx` | **YENİ** — panel sayfası |
| `src/components/settings/model-strategy-panel.tsx` | **YENİ** — panel arayüzü |
| `src/components/v2/layout/user-menu.tsx` | **YENİ** — V2 çıkış/hesap menüsü |
| `src/app/v2/layout.tsx` | üst bara menü + Model Stratejisi linki |
| `src/components/shell/sidebar.tsx` | V1 menüsüne "Model Stratejisi" + "Matter Workspace (v2)" |
| `src/lib/v2/orchestra/engine.ts` | `callAgent` artık `resolveRoleModel` + `callProvider` kullanıyor (4 sağlayıcı) |
| `src/app/api/v2/workspaces/[id]/chat/route.ts` | strateji + Gemini/Meta + `HARIS_CHAT_MAX_TOKENS` |
| `src/lib/v2/providers/index.ts` | `provider` tipi 4 sağlayıcıya genişletildi, `gpt-4o` → `gpt-5.6-terra` |
| `src/lib/v2/providers/fallback.ts` | yedekleme 4 sağlayıcıyı kapsıyor |
| `src/app/api/v2/debug/models/route.ts` | aktif strateji + etkili roller + 4 sağlayıcı testi |

## Diğer iyileştirmeler

- **Sohbet token limiti 4000 → 8000** (`HARIS_CHAT_MAX_TOKENS`). Dilekçe
  Canvas'ta zaten 16.000 token ile üretiliyor; sohbette uzun dilekçe istemek
  yine de kesilir — doğru yol Canvas.
- **V2'de çıkış yolu yoktu.** Artık üst barda hesap menüsü: çıkış, hesap
  değiştirme, Model Stratejisi, V1'e dönüş.
- Giriş sonrası yönlendirme zaten `/dashboard`'dı (V2'ye otomatik gitmiyor).

## Test

```
tsc --noEmit → hatasız
next build   → ✓ 4 yeni route derlendi:
  /api/strategies
  /api/strategies/test
  /api/v2/debug/models
  /settings/model-strategy
```
