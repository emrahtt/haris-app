# VERCEL ENV — MODEL DEĞİŞKENLERİ (DOĞRU DEĞERLER)

> Tarih: 11.09.2026 · Faz 14.2
> Kaynak: `src/lib/v2/providers/index.ts` kodunun gerçekten okuduğu değerler

---

## ⚠️ Şu anki değerlerinde 3 hata var

| Env | Senin yazdığın | Kodun GERÇEKTE kullandığı | Sonuç |
|---|---|---|---|
| `HARIS_DRAFTER_MODEL` | `gemini-3.8-flash` | `anthropic:claude-opus-5` | **Ana hata bu.** Gemini orkestrada desteklenmiyor, önek de yok → sistem sessizce Claude'a düştü. Claude kredisi bitik → "Dilekçe üretilemedi: Anthropic 400 credit balance" |
| `HARIS_OPPOSITION_MODEL` | `openai:gpt-5.6-Sol` | `openai:gpt-5.6-Sol` | Büyük "S" → OpenAI model adları küçük harf. `model_not_found` riski |
| `HARIS_ADVERSARIAL_MODEL` | `gemini-3.8-flash` | — | Bu değişkeni **v2 orkestrası hiç okumuyor** (sadece V1 ekranları). Gemini zaten desteklenmiyor |

Ayrıca:
- `HARIS_GEMINI_MODEL` **sadece PDF/OCR (Gemini Vision)** içindir. Orkestra modelleriyle ilgisi yok.
- `HARIS_DEFAULT_MODEL` **sadece V1** ekranlarında kullanılır, v2 orkestrasında etkisiz.

Kodda desteklenen tek format:
```
anthropic:<model-adi>     veya     openai:<model-adi>
```
Öneksiz yazarsan (ör. `gemini-3.8-flash`) model adından tahmin edilir; tahmin
edilemezse varsayılana düşer ve **Vercel loglarına uyarı yazılır**.

---

## ✅ SEÇENEK A — Anthropic'e kredi yükleyeceksen (önerilen, en kaliteli çıktı)

```env
HARIS_ORCHESTRATOR_MODEL=anthropic:claude-opus-5
HARIS_ANALYZER_MODEL=anthropic:claude-opus-5
HARIS_DRAFTER_MODEL=anthropic:claude-opus-5
HARIS_QUICK_MODEL=anthropic:claude-sonnet-5
HARIS_VISION_MODEL=anthropic:claude-opus-5
HARIS_OPPOSITION_MODEL=openai:gpt-5.6-sol
HARIS_EMBEDDING_MODEL=openai:text-embedding-3-large
HARIS_GEMINI_MODEL=
HARIS_DEFAULT_MODEL=openai:gpt-5.6-sol
HARIS_ADVERSARIAL_MODEL=anthropic:claude-opus-5

HARIS_ENABLE_PROVIDER_FALLBACK=true
HARIS_FALLBACK_MODEL=openai:gpt-5.6-sol
HARIS_FALLBACK_ANTHROPIC_MODEL=anthropic:claude-sonnet-5
```

Not: `HARIS_QUICK_MODEL` → `claude-sonnet-5` yaptım çünkü bu rolü **belge
sınıflandırma + hafıza çıkarımı + özetleme** kullanıyor. Opus ile her belge
işlemede 5-8 kat fazla para yakarsın, kalite farkı bu işlerde önemsiz.

---

## ✅ SEÇENEK B — Anthropic'e para vermek istemiyorsan (her şey OpenAI)

```env
HARIS_ORCHESTRATOR_MODEL=openai:gpt-5.6-sol
HARIS_ANALYZER_MODEL=openai:gpt-5.6-sol
HARIS_DRAFTER_MODEL=openai:gpt-5.6-sol
HARIS_QUICK_MODEL=openai:gpt-5.5
HARIS_VISION_MODEL=openai:gpt-4o
HARIS_OPPOSITION_MODEL=openai:gpt-5.6-sol
HARIS_EMBEDDING_MODEL=openai:text-embedding-3-large
HARIS_GEMINI_MODEL=
HARIS_DEFAULT_MODEL=openai:gpt-5.6-sol
HARIS_ADVERSARIAL_MODEL=openai:gpt-5.6-sol

HARIS_ENABLE_PROVIDER_FALLBACK=true
HARIS_FALLBACK_MODEL=openai:gpt-5.6-sol
```

> `HARIS_VISION_MODEL=openai:gpt-4o` önemli: PDF/OCR'da "OpenAI Vision"
> yöntemini seçtiğinde bu model kullanılır. Opus/Sol vision için değil.

---

## Doğrulama (deploy'dan sonra, 30 saniye)

Tarayıcıda login olmuşken şunu aç:

```
https://haris-app-gamma.vercel.app/api/v2/debug/models?test=1
```

Dönecek cevap:
- `ozet: "Tüm modeller çalışıyor."` → her şey tamam
- `status: "kota_bitti"` → o hesabın kredisi yok, yükle
- `status: "model_bulunamadi"` → model adı yanlış yazılmış
- `warnings: [...]` → env'de düzeltmen gereken satırlar listesi

API anahtarları maskeli görünür (`sk-ant…x4y2`), güvenle paylaşabilirsin.

---

## Hangi rolü hangi ajan kullanıyor?

| Rol | Kullanan ajanlar |
|---|---|
| `orchestrator` | Orkestra Şefi |
| `analyzer` | Maddi Hukuk, Usul Hukuku, İçtihat Tarama, Bilirkişi, Delil Haritalama, Atıf Doğrulayıcı |
| `opposition` | Karşı Argüman (red-team) |
| `drafter` | **Dilekçe Editörü** ← dilekçeyi Canvas'a yazan ajan |
| `quick` | Müvekkil İletişim, Kalite Kontrol, belge sınıflandırma, hafıza çıkarımı |
| `vision` | PDF/OCR (Claude Vision yolu — provider önekine bakılır) |

**Kritik:** `drafter` bozuksa dilekçe asla Canvas'a düşmez. Senin hatan tam olarak buydu.
