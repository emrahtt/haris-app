# FAZ 16.5 — Kota Kapısı + Sahip Muafiyeti (402 sorununun gerçek çözümü)

## Neden gerekiyordu?

Kod taramasında iki çelişkili durum bulundu:

1. **`HARIS_OWNER_USER_IDS` env'ini okuyan TEK BİR SATIR KOD YOKTU.**
   Yani daha önce "owner muafiyeti için bunu ekle" denmişti ama eklemek hiçbir
   işe yaramıyordu — kod o değişkene hiç bakmıyordu.
2. **`checkAiCallLimit()` tanımlıydı ama hiçbir yerde çağrılmıyordu.**
   Yani v2 tarafında kota kontrolü yoktu: ücretsiz plan kullanıcısı sınırsız AI
   çağrısı yapabilirdi (ciddi maliyet riski).

Daha önce canlıda görülen `POST /api/v2/workspaces/.../chat 402` hatası bu
kod tabanında üretilemiyordu → o hata eski bir build'den kalmaydı.

## Ne yapıldı?

| Dosya | Değişiklik |
|---|---|
| `src/lib/billing/gate.ts` | **YENİ.** Tek merkezî kapı: `checkAiGate(userId)`, `isBillingOwner()`, `recordAiCall()`, `findInvalidOwnerIds()` |
| `src/app/api/v2/workspaces/[id]/chat/route.ts` | İstek başında kota kontrolü. Doluysa **402 + Türkçe mesaj** |
| `src/app/api/v2/workspaces/[id]/orchestrate/route.ts` | Aynı kapı. Tam bir orkestra süreci **1 çağrı** sayılır (4 aşama 4 kez tüketmez) |
| `src/app/v2/workspaces/[id]/workspace-client.tsx` | 402 gelirse sunucunun Türkçe mesajı sohbet akışına düşer (ham "HTTP 402" değil) |
| `src/app/api/billing/status/route.ts` | Sahip hesabı panoda "sınırsız" görünür |
| `src/app/api/v2/debug/models/route.ts` | `kota` bloğu: sahip muafiyeti, plan, kullanılan/limit, **geçersiz owner ID'leri** |

## Öncelik sırası

```
1) HARIS_OWNER_USER_IDS içinde misin?  → EVET ise her zaman serbest
2) HARIS_QUOTA_ENFORCEMENT=off mu?     → EVET ise serbest (test modu)
3) Plan limiti (free = 30 AI çağrısı/ay)
4) Limit dolduysa → 402 + çözüm mesajı
```

Kullanım sayacı isteği yavaşlatmaz (`recordAiCall` beklemeden çalışır).

## ENV

| Key | Value | Açıklama |
|---|---|---|
| `HARIS_OWNER_USER_IDS` | `uuid1, uuid2` | **8-4-4-4-12 formatında Supabase Auth UUID** |
| `HARIS_QUOTA_ENFORCEMENT` | `on` | Test sırasında `off` yaparsan kota tamamen devre dışı |

### ⚠️ En sık yapılan hata

`FSqtYoqk93esuIhtelLl98Pc` gibi bir değer **Vercel proje ID'sidir, UUID değildir**
→ muafiyet çalışmaz. Doğru değer Supabase'den alınır:

```
Supabase Dashboard → Authentication → Users → kendi e-postana tıkla → User UID
```

Bilinen geçerli UUID (tan hesabı):
```
cd6055ef-e080-45d8-8148-9f8b2c5fbfef
```

Kendi UUID'ni ekledikten sonra **Redeploy şart** (env değişikliği).

### Doğrulama

```
https://haris-app-gamma.vercel.app/api/v2/debug/models
```

`kota` bloğunda şunları gör:
```json
"kota": {
  "sahipMuafiyeti": true,        ← true olmalı
  "takipAcik": true,
  "plan": "Ücretsiz",
  "serbest": true,
  "ownerIds": ["cd6055ef-..."],
  "gecersizOwnerIds": []         ← boş olmalı
}
```

`gecersizOwnerIds` doluysa → UUID olmayan bir değer yazmışsın demektir.

## Faz 15 için ek koruma

`draft` aşamasında önceki turlardan **hiç ajan çıktısı yoksa** (ör. tüm ajanlar
kota/anahtar hatası verdiyse), boş veya uydurma bir dilekçe üretmek yerine net
bir hata mesajı verilir:

```
Dilekçe aşamasına geçilemedi: önceki turlardan hiçbir ajan çıktısı bulunamadı.
Çözüm: /api/v2/debug/models?test=1 ile modelleri test et, sonra süreci baştan başlat.
```

## Test

```
tsc --noEmit → hatasız
next build   → ✓ Compiled successfully (yeni uyarı yok)
```

---

## Ek: Ajan kimliği düzeltmesi ("Canvas'a yazamıyorum" sorunu)

Canlıda ajan şu cevabı vermişti:

```
❌ Canvas'a yazamıyorum. Bu oturumda canvas/artifact aracım aktif değil.
❌ .docx dosyası üretip ekleyemiyorum.
```

Sebep: sistem prompt'unda platformun ne olduğu hiç anlatılmıyordu; model kendini
genel bir sohbet asistanı sanıyordu.

Çözüm: `src/lib/v2/orchestra/platform-prompt.ts` → `PLATFORM_CAPABILITIES` bloğu
hem **sohbet** hem **orkestra** tarafında sistem prompt'unun başına ekleniyor.

Blok şunları içeriyor:
- HARIS'in gerçek yetenekleri: Canvas, Word/PDF/UDF dışa aktarma, Vault, Orkestra, izole hafıza
- **YASAK ifadeler:** "Canvas'a yazamıyorum", "docx üretemiyorum", "bu ortamda yeteneğim yok"
- Uzun belge istendiğinde ne yapacağı: parça parça sohbete dökmek yerine kullanıcıyı
  "Süreci Başlat" → Canvas akışına yönlendirmek
- Dilekçe Editörü orkestra içinde çalışıyorsa: metni eksiksiz, tek parça üretmek
- Türk hukuku terminolojisi + tam atıf formatı + halüsinasyon yasağı
