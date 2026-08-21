# 🚀 Faz 13.7 Kurulum Rehberi

## 📦 Dosya
`haris-app-faz-13.7-DELTA.zip` (72 KB, 17 dosya)

## 🎯 Ne Değişti?

### 1. Citation UI ✨
Chat yanıtlarının altında **kaynak chip'leri** — Harvey/CoCounsel tarzı. AI'ın hangi belge/mevzuata dayanarak konuştuğu bir bakışta görünür.

### 2. ESLint Cleanup 🧹
Vercel'deki 15+ sarı uyarı temizlendi.

### 3. Global Corpus Seed 🌱
27 örnek mevzuat + içtihat kaydı (TBK, TMK, TTK, HMK, İş K., TCK, KTK, Yargıtay, Danıştay, AYM).

---

## 📋 3 Adımda Kurulum

### ADIM 1 — ZIP'i Aç (2 dk)
1. `haris-app-faz-13.7-DELTA.zip` indirin
2. `C:\AI\haris-app\` üzerine açın (overwrite = YES)

Overwrite edilen dosyalar (17 tane):
- ✨ Yeni: `src/components/v2/chat/citations-view.tsx`
- ✨ Yeni: `scripts/seed-global-corpus.ts`
- 🔄 Güncellenen: 15 dosya (unused import temizliği + citation entegrasyonu)

### ADIM 2 — Global Corpus Seed (5 dk, ~$0.001)

PowerShell'de:
```powershell
cd C:\AI\haris-app
npx tsx scripts/seed-global-corpus.ts
```

**Beklenen çıktı:**
```
🌱 27 kayıt seed ediliyor...
✅ mevzuat-tbk-49 — TBK m.49 — Haksız Fiil Sorumluluğu
✅ mevzuat-tbk-51 — TBK m.51 — Tazminatın Belirlenmesi
✅ mevzuat-tmk-166 — TMK m.166 — Evlilik Birliğinin...
...
🎉 Bitti. Başarılı: 27 · Başarısız: 0
```

**⚠️ Hata alırsan:**
- `Supabase env vars eksik` → `.env.local` dosyanız var mı kontrol et
- `Embed hata: 429` → OpenAI kredi yükleyin
- `tsx not found` → `npm install -D tsx` (bir kereye mahsus)

### ADIM 3 — Git Push
```powershell
git add .
git commit -m "Faz 13.7: Citation UI + ESLint cleanup + Global corpus seed"
git push origin main
```

Vercel otomatik build alır (~3 dk).

---

## 🧪 Test Sırası (Deploy Sonrası)

### Test 1 — Citation Chip'leri (En Görsel)
1. Herhangi bir matter'a bir PDF yükle (bir dava dosyası)
2. Chat'e sor: **"TBK 49'a göre haksız fiil şartları neler?"**
3. Yanıtın altında görmeli:
   - 📎 **Kaynaklar** başlığı
   - 🟢 **MEVZUAT** chip: "TBK m.49 · Türk Borçlar Kanunu"
   - 📄 **Matter** chip: "dava-dosyan.pdf · Chunk #X"
4. Chip'e tıkla → **200 karakter snippet** açılır
5. Yeşil chip'te 🔗 **Kaynak** butonu var → mevzuat.gov.tr'ye açar

### Test 2 — Farklı Konular
| Soru | Beklenen Chip |
|------|---------------|
| "Boşanmada geçici tedbir nasıl istenir?" | TMK m.169, Yargıtay 2. HD |
| "Kira ödenmezse ne yapılır?" | TBK m.315, Yargıtay 3. HD |
| "İşçi ücret almazsa haklı fesih olur mu?" | İş K. m.32, Yargıtay 9. HD |
| "Trafik kazasında müterafik kusur" | TBK m.52, KTK m.85, Yargıtay HGK |
| "Makul süre aşılırsa ne olur?" | AYM 2019/12345 |

### Test 3 — ESLint Sarıları
Vercel Dashboard → Deployments → Latest → Build Logs → Warning satırlarına bakın. **Öncekinden çok daha az** olmalı.

### Test 4 — Matter Belgesi Citation
1. PDF'i yükledikten sonra chat'e o belgeyle ilgili spesifik soru sor
   - Örn: "Karşı taraf ne iddia ediyor?"
2. **📄 Matter chip** görünmeli — belgenin adı + sayfa/section
3. Chip'e tıkla → belgeden gerçek alıntı

---

## 🎯 Ne Fark Yaratacak?

**Öncesi:** Chat yanıtı geliyordu ama "nereden aldı?" bilinmiyordu.

**Sonrası:**
- ✅ Her cevabın altında **kanıt zinciri** görünür
- ✅ Chip'e tıkla → hangi belge, hangi sayfa, hangi maddeden geldiği kesin
- ✅ Avukat referansları hızlıca doğrulayabilir
- ✅ Baro sunumunda "AI şunu iddia etti" değil, "AI şu Yargıtay kararı ve şu belgeye dayanarak dedi" diyebilir

**Bu Harvey/CoCounsel'in "attribution" özelliği ✨**

---

## 📊 İstatistikler

- **Yeni dosya:** 2 (`citations-view.tsx`, `seed-global-corpus.ts`)
- **Güncellenen dosya:** 15
- **Yeni UI kompontleri:** 1 (`CitationsView`)
- **Corpus kaydı:** 27 (mevzuat + içtihat)
- **Silinen unused import/var:** 15+

**Toplam kod:** ~800 satır ekleme (kod + seed corpus)
