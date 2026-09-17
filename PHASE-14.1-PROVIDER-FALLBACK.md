# FAZ 14.1 + 14.2 — Sağlayıcı Yedeklemesi, Kredi Hatası Yönetimi, Model Env Doğrulaması

## Bu faz neden yapıldı?

Canlıda "Süreci Başlat" denince şu hata çıkıyordu:

```
Orkestra hatası: Dilekçe üretilemedi: Error: Anthropic 400:
{"type":"error","error":{"type":"invalid_request_error",
"message":"Your credit balance is too low to access the Anthropic API.
Please go to Plans & Billing to upgrade or purchase credits."}}
```

İki problem vardı:

1. **Tek sağlayıcıya bağımlılık:** Anthropic kotası bitince orkestra komple duruyordu.
   OpenAI anahtarı dolu olsa bile kullanılmıyordu.
2. **Ham JSON hata:** Kullanıcıya (avukata) API'nin İngilizce teknik JSON'u basılıyordu.
   Ne yapması gerektiği yazmıyordu.

## Ne değişti?

| Dosya | Değişiklik |
|---|---|
| `src/lib/v2/providers/fallback.ts` | **YENİ.** Kota/kredi/auth/model hatası tespiti, yedek model seçimi, Türkçe hata metni üretimi. |
| `src/lib/v2/orchestra/engine.ts` | `callAgent()` artık kota hatasında otomatik olarak **diğer sağlayıcıya** düşüyor. Hata mesajları `summarizeAgentError` + `friendlyProviderError` ile okunur hale geldi. |
| `src/lib/v2/providers/anthropic-client.ts` | Kredi bitmişse 3 kez boşuna retry yapmıyor; direkt anlaşılır hata veriyor. Retry sadece gerçek geçici hatalarda (429 hız limiti, 5xx, timeout). |
| `src/app/api/v2/workspaces/[id]/chat/route.ts` | Chat tarafında da iki yönlü fallback: Anthropic→OpenAI ve OpenAI→Anthropic. Hata mesajı `friendlyProviderError` kullanıyor. |
| `src/app/v2/workspaces/[id]/workspace-client.tsx` | `alert()` kaldırıldı. Orkestra hatası artık **sohbet akışına** okunur mesaj olarak düşüyor. |
| `.env.example` | Yeni fallback env anahtarları eklendi. |

## Akış (yeni)

```
Ajan çağrısı (ör. dilekce_editoru → anthropic:claude-opus-5)
        │
        ├─ Başarılı → devam
        │
        └─ HATA
             ├─ Kota/kredi hatası DEĞİL → olduğu gibi yukarı fırlat
             │
             └─ Kota/kredi hatası
                  ├─ Yedek sağlayıcı anahtarı VAR → yedeği dene
                  │      ├─ Yedek başarılı → işlem devam eder, dilekçe Canvas'a düşer
                  │      └─ Yedek de başarısız → iki hatanın Türkçe özeti
                  │
                  └─ Yedek anahtarı YOK → Türkçe, adım adım çözüm mesajı
```

## Yeni env değişkenleri (Vercel → Settings → Environment Variables)

| Key | Value | Açıklama |
|---|---|---|
| `HARIS_ENABLE_PROVIDER_FALLBACK` | `true` | Otomatik yedeklemeyi aç/kapat (varsayılan: açık) |
| `HARIS_FALLBACK_MODEL` | `openai:gpt-5.6-sol` | Anthropic kotası biterse kullanılacak model |
| `HARIS_FALLBACK_ANTHROPIC_MODEL` | `anthropic:claude-sonnet-5` | OpenAI kotası biterse kullanılacak model |

> **Önemli:** Fallback sihir değil. En az **bir** sağlayıcıda kredi olması şart.
> İkisi de boşsa sistem yine durur — ama artık neden durduğunu ve ne yapman
> gerektiğini Türkçe söyler.

## Tanınan hata tipleri

| Tip | Örnek | Davranış |
|---|---|---|
| Kota/kredi | `credit balance is too low`, `insufficient_quota`, HTTP 402 | Yedeğe düş, retry YOK |
| Kimlik | `invalid_api_key`, HTTP 401/403 | Türkçe "anahtarı kontrol et" mesajı, retry YOK |
| Model yok | `model_not_found`, HTTP 404 | Türkçe "model adını kontrol et" mesajı, retry YOK |
| Geçici | HTTP 429 (hız limiti), 500/502/503/504, timeout | 3x exponential backoff retry |

## Test

```
npx tsc --noEmit   → hatasız
npx next build     → ✓ Compiled successfully (24/24 sayfa)
```

Canlıda test: Anthropic kotası boşken "Süreci Başlat" → OpenAI kredisi varsa
dilekçe Canvas'a düşmeli; yoksa sohbet akışında Türkçe çözüm mesajı görünmeli.


---

# FAZ 14.2 — Model env doğrulaması + teşhis endpoint'i

## Bu faz neden yapıldı?

Vercel env'inde şu değer vardı:

```
HARIS_DRAFTER_MODEL=gemini-3.8-flash
```

Kod `provider:model` bekliyor. Önek olmayınca:
- `parseProvider` → "gemini" diye bir sağlayıcı yok → **sessizce `anthropic`**
- `parseModelId` → `parts[1]` yok → **sessizce `claude-opus-5`**

Yani kullanıcı "Gemini yazdım" sanırken **Dilekçe Editörü Claude Opus 5** ile
çalışıyordu. Anthropic kredisi bitince de tam olarak şu hata çıktı:

```
Dilekçe üretilemedi: Error: Anthropic 400: credit balance is too low
```

Buna ek olarak iki hata daha bulundu:

| Hata | Etki |
|---|---|
| `openai:gpt-5.6-Sol` (büyük S) | OpenAI model adları küçük harf → `model_not_found` riski |
| `extract.ts` env'i `split(":")[1]` ile okuyordu, provider önekini çöpe atıyordu | `HARIS_VISION_MODEL=anthropic:claude-opus-5` iken "OpenAI Vision" seçilirse OpenAI'a `claude-opus-5` gönderilip 404 alınıyordu |

## Ne değişti?

| Dosya | Değişiklik |
|---|---|
| `src/lib/v2/providers/index.ts` | `parseProvider`/`parseModelId` artık öneksiz değerde model adından provider **tahmin ediyor**, tahmin edilemiyorsa **yüksek sesle uyarı** logluyor. OpenAI model adları küçük harfe normalize ediliyor. `getModelEnvReport()` eklendi. |
| `src/lib/v2/providers/index.ts` | `resolveClaudeVisionModel()` / `resolveOpenAIVisionModel()` — OCR artık her zaman kendi sağlayıcısının modelini kullanır. |
| `src/lib/v2/ingest/extract.ts` | Claude/OpenAI Vision model seçimi bu yardımcılara bağlandı. |
| `src/app/api/v2/debug/models/route.ts` | **YENİ.** Tarayıcıdan env teşhisi: `/api/v2/debug/models?test=1` her modeli canlı deneyip kredi/model/anahtar durumunu raporlar. Anahtarlar maskeli. |

## Kanıt (gerçek env değerleriyle çalıştırıldı)

```
HARIS_DRAFTER_MODEL = "gemini-3.8-flash"   →  anthropic:claude-opus-5
HARIS_OPPOSITION_MODEL = "openai:gpt-5.6-Sol"  →  openai:gpt-5.6-sol

[HARIS MODEL ENV] HARIS_DRAFTER_MODEL="gemini-3.8-flash" → Desteklenmeyen
model/sağlayıcı. Orkestra yalnızca "anthropic:" ve "openai:" destekler
(Gemini sadece PDF/OCR içindir) → kullanılan: anthropic:claude-opus-5
```

## Doğru env değerleri

Bkz. `VERCEL-ENV-DOGRU-DEGERLER.md` (Seçenek A: Anthropic kredili / Seçenek B: tamamen OpenAI).

## Test

```
tsc --noEmit   → hatasız
next build     → ✓ 24 sayfa, /api/v2/debug/models route'u oluştu
```
