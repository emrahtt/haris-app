# 🎉 Faz 12 — UDF (UYAP Doküman Formatı) Desteği

**Durum:** ✅ Tamam
**Tarih:** 2026-06-16
**Süre:** ~1 saat
**Risk:** Düşük (sadece 2 yeni dosya + 6 değişiklik, eski kod etkilenmedi)

---

## 🎯 Ne Yaptık?

Türk avukatların günlük kullandığı **UDF (UYAP Doküman Formatı)** desteği eklendi:

1. **UDF Okuma** — Kullanıcı UDF dosyası yüklediğinde HARIS otomatik:
   - ZIP'i açar
   - content.xml + documentproperties.xml'i parse eder
   - Düz metni çıkarır (AI sınıflandırması için)
   - UYAP metadata'sını (sicil, doğrulama kodu, yazar) yakalar
   - E-imza varsa "imzalı" flag set eder
   - Vaka Alıcısı ajanı içeriği analiz edip kategorilendirir

2. **UDF Yazma** — HARIS'in ürettiği dilekçeyi UDF formatında indirme:
   - Canvas üstünde **📥 UDF (UYAP)** butonu (altın çerçeveli vurgu)
   - Markdown → temiz Türkçe metin → content.xml + documentproperties.xml → ZIP
   - UYAP Doküman Editörü 1.8+ ile uyumlu format

---

## 📦 Yeni / Değişen Dosyalar (9 toplam)

### 🆕 Yeni (2)
- `src/lib/v2/udf/reader.ts` — 130 satır
- `src/lib/v2/udf/writer.ts` — 160 satır

### ✏️ Değişen (6)
- `src/lib/v2/ingest/extract.ts` — UDF branch
- `src/app/api/v2/workspaces/[id]/petition/download/route.ts` — `?format=udf`
- `src/components/v2/canvas/petition-canvas.tsx` — UDF butonu
- `src/components/v2/vault/vault-panel.tsx` — uyap_belgesi ikonu
- `src/app/v2/workspaces/new/page.tsx` — accept + hint
- `src/app/v2/workspaces/[id]/workspace-client.tsx` — accept

### 📚 Dokümantasyon (1)
- `PHASE-12-UDF.md` (bu dosya)
- `MIGRATIONS-LOG.md` (güncellendi)

---

## 🧪 Live Test Sonuçları

```
1. UDF üretiyorum...
   ✓ 1262 byte UDF
2. ZIP içeriği:
   - content.xml: 2374 byte
   - documentproperties.xml: 514 byte
3. UDF geri okuyorum...
   ✓ 307 char metin
   ✓ Hata: yok
   ✓ İmza: yok
   ✓ Metadata: { yazar: 'HARIS' }
   ✓ İçerik (250 char): İSTANBUL 5. ASLİYE HUKUK MAHKEMESİ...
```

**Round-trip başarılı** — Write → Read tamamen çalışıyor, Türkçe karakterler bozulmadı, markdown sentaksı temizlendi.

---

## ⚠️ Bilinen Sınırlamalar

1. **UDF resmi şeması açık değil** — Adalet Bakanlığı UYAP belgelerinin tam XSD'sini paylaşmıyor. format_id=1.8 ile reverse-engineering yaptık. UYAP'ın yeni sürümleri farklı şema kullanırsa bozulabilir.

2. **E-imza üretmiyoruz** — UDF dosyamızda `sign.sgn` yok. UYAP'a göndermek için kullanıcı:
   - Sistem UDF'ini indir
   - UYAP Doküman Editörü'nde aç
   - E-imzasını ekle
   - UYAP'a yükle

3. **%100 UYAP uyumluluk garantili değil** — UYAP Doküman Editörü'nün versiyon değişikliklerinde dosya açılmayabilir. Bu durumda kullanıcı MD/TXT export'a düşer ve Word'e kopyala/yapıştır yapar.

4. **Karmaşık formatlama** desteklenmiyor — Sadece düz paragraflar. Tablo, görsel, çapraz referans gibi UDF gelişmiş özellikleri yok. (Eklenmesi mümkün ama Faz 13'e ertelendi.)

---

## 🚀 Kullanıcı Akışı

### UDF Okuma (Avukat UYAP'tan indirdiği dosyayı HARIS'e yükler)
```
1. /v2/workspaces/[id] aç
2. Sol panelden "+ Belge Ekle" tıkla
3. UYAP'tan indirilen .udf dosyasını seç
4. HARIS otomatik:
   - ZIP'i açar
   - content.xml'i parse eder
   - Metin çıkarır
   - Vaka Alıcısı sınıflar (şikayet/cevap/karar vs)
   - Vault panelinde kategorize görünür
5. 🎼 Süreci Başlat → ajanlar UDF içeriğini analiz eder
```

### UDF Yazma (HARIS'in dilekçesini UYAP'a yüklemek için)
```
1. Workspace'te orkestra tamamlandığında Canvas'ta dilekçe görünür
2. Üstte 4 indirme butonu:
   📋 Kopyala (markdown panoya)
   📥 Markdown (.md)
   📥 Düz Metin (.txt)
   📥 UDF (UYAP)  ← altın vurgulu, yeni
3. UDF butonuna bas → dosya iner
4. UYAP Doküman Editörü'nde aç → e-imzanı ekle → UYAP'a yükle
```

---

## 🎯 Sonuç

Faz 12 UDF entegrasyonu **tamamlandı ve test edildi**. Türk avukat günlük iş akışına uyumlu hale geldi. Risk: düşük (eski kod etkilenmedi, yeni 2 dosya + 6 küçük değişiklik).
