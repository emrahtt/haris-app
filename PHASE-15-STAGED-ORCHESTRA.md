# FAZ 15 — Aşamalı Orkestra (Canvas bug'ının kesin çözümü)

## Belirti

Kullanıcı "Süreci Başlat"a basıyor, Console'da yalnızca şu görünüyor:

```
[SSE] stream tamamlandı 2026-09-11T03:06:35.069Z
```

Ne `[SSE petition_draft]` var, ne `[CANVAS] petition_draft v1 alındı`, ne de hata
alert'i. Canvas boş kalıyor.

## Kök neden: Vercel fonksiyon süre limiti

Vercel resmî dokümanı (Eylül 2026):

| Plan | Varsayılan | Maksimum |
|---|---|---|
| Hobby (Fluid compute) | 300 sn | **300 sn** |
| Pro (Fluid compute) | 300 sn | 800 sn |
| Hobby (Fluid YOK) | 10 sn | **60 sn** |

> "This refers to the longest time a function invocation can run before Vercel
> terminates it. For request handlers, this includes time spent processing the
> request and **sending the response, including streamed responses**."
> — vercel.com/docs/functions/limitations

Yani:
1. `orchestrate/route.ts` içinde `maxDuration = 300` yazılı → tavan 300 saniye.
2. **Heartbeat bunu uzatmaz.** Limit, yanıtın tamamı (stream dahil) için geçerli.
   Kodda 15 sn'de bir `: heartbeat` gönderiliyor ama faydası yok.
3. Orkestra gerçekte ne kadar sürüyor?
   - TUR 1: 6 ajan paralel, ajan başına ~25K token girdi (100K karakter belge
     bütçesi) → **60-150 sn**
   - TUR 2: çapraz eleştiri → **40-90 sn**
   - TUR 3: Dilekçe Editörü `max_tokens: 16000` → **120-300 sn**
   - Kalite Kontrol → **40-90 sn**
   - **TOPLAM: 5-12 dakika**
4. Vercel 300. saniyede fonksiyonu öldürür → SSE bağlantısı kapanır →
   tarayıcıdaki `reader.read()` `done: true` döner → `[SSE] stream tamamlandı`
   loglanır → **`petition_draft` hiç gönderilemediği için Canvas boş kalır.**

Engine'de sadece 2 çıkış noktası var (`return`):
- satır ~431 → dilekçe üretilemedi (hata) → alert çıkardı
- satır ~480 → `emit({ type: "completed" })`

Kullanıcı ne alert gördü ne "Tamamlandı" → **engine hiç sonuna ulaşmadı.**
Tek açıklama: fonksiyon dışarıdan öldürüldü.

Not: Engine'in kendi tahmini (`analyzers.length * 12 + 60` = 132 sn) gerçekçi
değildi; bu yüzden sorun fark edilmedi.

## Çözüm: 4 ayrı HTTP çağrısı

Orkestra aşamalara bölündü. Her aşama **kendi 300 saniyelik bütçesine** sahip.
Ara durum Supabase'den geri okunuyor (`agent_runs`, `petition_versions`).

| Aşama | Ne yapar | Tahmini süre |
|---|---|---|
| `round1` | 6 uzman ajan paralel inceleme | 60-150 sn |
| `round2` | Karşı Argüman çapraz eleştirisi | 40-90 sn |
| `draft` | Dilekçe Editörü → `petition_draft v1` → **Canvas** | 120-300 sn |
| `quality` | Kalite Kontrol → `petition_draft v2` + `completed` | 40-90 sn |

Toplam bütçe artık ~20 dakika. Dilekçe Canvas'a düşüyor.

### Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/v2/orchestra/engine.ts` | `runOrchestra(ctx, emit, stage)` — aşama parametresi. `reloadAgentOutputs()` ile önceki turların çıktısı DB'den okunur. `quality` aşaması taslağı `getLatestPetition()` ile alır, editörü tekrar çalıştırmaz. Yeni event: `stage_complete`. Belge bütçesi `HARIS_DOC_CHAR_BUDGET` ile ayarlanabilir. |
| `src/app/api/v2/workspaces/[id]/orchestrate/route.ts` | `?stage=round1\|round2\|draft\|quality` kabul eder. `orchestration_status` yalnızca son aşamada `completed` olur. |
| `src/app/v2/workspaces/[id]/workspace-client.tsx` | `startOrchestration()` 4 aşamayı sırayla çalıştırır. Her aşamanın süresi Console'a yazılır. **Sunucu aşamayı bitiremeden koparsa** kullanıcıya Türkçe uyarı + çözüm listesi düşer. |

### Geriye dönük uyumluluk

`?stage` verilmezse `stage = "all"` → eski davranış aynen korunur.

## React error #418 — kesin sebep ve çözüm

```
Uncaught Error: Minified React error #418 ... args[]=text
```

`#418?args[]=text` = "sunucunun ürettiği metin ile tarayıcınınki farklı".

Sebep: `workspace-client.tsx` içinde karşılama mesajı `useState` initializer'ında
üretiliyordu:

```ts
timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
```

- Sunucu (Vercel, `fra1`) → UTC → örn. `03:06`
- Tarayıcı (Europe/Istanbul) → UTC+3 → örn. `06:06`

Aynı `uuid()` de sunucuda ve client'ta farklı değer üretiyordu.

Çözüm: mesaj listesi artık `useState([])` ile boş başlıyor, `useEffect` içinde
(client-only) kuruluyor. Hydration farkı kalmadı.

> Not: Console'daki `Cannot read properties of undefined (reading 'startTime')`
> hatası HARIS kaynaklı değil — tarayıcı eklentisi/performance ölçüm scripti.
> Yok sayılabilir.

## Yeni env (opsiyonel)

| Key | Varsayılan | Ne işe yarar |
|---|---|---|
| `HARIS_DOC_CHAR_BUDGET` | `100000` | Ajanlara giden toplam belge karakteri. `draft` aşaması hâlâ 300 sn'yi aşarsa `50000` yap |

## Test

```
tsc --noEmit  → hatasız
next build    → ✓ Compiled successfully
```

Canlı test adımları: `FAZ-14.1-KURULUM.md` → Adım 7.
