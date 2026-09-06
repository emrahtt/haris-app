/**
 * Demo Mode için Hazır AI Yanıtları
 *
 * API key yokken bile sistem tam çalışsın diye, her ajan türü için
 * önceden hazırlanmış, gerçekçi, Türk hukukuna uygun mock yanıtlar.
 *
 * Bu yanıtlar token-by-token simulated streaming olarak gönderilir
 * (kullanıcı tarafında "AI yazıyor" hissi olsun).
 */

import type { AgentId } from "./prompts";

export const DEMO_RESPONSES: Record<AgentId, string> = {
  orchestrator: `## 📋 Dava İnceleme Planı

**Karmaşıklık:** Orta-Yüksek
**Tahmini süre:** 6-8 dakika
**Çalışacak ajan sayısı:** 8 / 12

### Adımlar:
1. **Maddi Olay Analisti** → 47 belgeyi tarayıp kronoloji çıkaracak (60 sn)
2. **Mevzuat Tarayıcı** → TBK m.49 ve KTK m.85 başta olmak üzere ilgili tüm hükümleri toplayacak (45 sn)
3. **İçtihat Avcısı** → Yargıtay 17. HD ve 4. HD kararlarını paralel tarayacak (120 sn)
4. **Hukuki Nitelendirici** → 3 alternatif hukuki nitelendirme yapacak (40 sn)
5. **Usul Hukukçusu** → Süreleri kontrol edip yetki itirazı riskini değerlendirecek (30 sn)
6. **Risk Analisti** → Müvekkilin zayıf noktalarını acımasızca tespit edecek (50 sn)
7. **Dilekçe Yazarı** → Üst düzey kalitede taslak üretecek (90 sn)
8. **Karşı Taraf Simülatörü** → Üretilen dilekçeye saldırı argümanları çıkaracak (60 sn)

### Stratejik Not
Müvekkilin pozisyonu güçlü görünüyor; ancak davalının ZMSS sigortacısının tahkim itirazı önemli bir risk. **Sigortaya doğrudan ihbar** ile limit dahilindeki kısmı paralel takip etmenizi öneririm.`,

  factAnalyst: `## Olay Özeti

Müvekkil **Ahmet Yılmaz**, 12 Mart 2024 sabahı saat 08:42'de, İstanbul Beşiktaş Barbaros Bulvarı'nda kendi aracını kullanırken, davalı **Şahin Otomotiv A.Ş.** çalışanının kullandığı kurum aracının kavşakta kırmızı ışıkta geçmesi sonucu meydana gelen trafik kazasında ağır şekilde yaralanmıştır. Kaza tespit tutanağı (12.03.2024, no:2024/8842) davalı tarafın **%100 kusurlu** olduğunu açıkça belirlemiştir.

## Kronoloji

| Tarih | Olay | Kaynak |
|---|---|---|
| 12.03.2024 08:42 | Trafik kazası | Kaza Tespit Tutanağı |
| 12.03.2024 09:15 | Hastane (acil servis) | İlk kabul kaydı |
| 12-23.03.2024 | 11 gün yoğun bakım | Hastane raporu |
| 18.03.2024 | İlk ameliyat | Ameliyat raporu |
| 25.03.2024 | İkinci ameliyat | Ameliyat raporu |
| 22.04.2024 | Tanık beyanları (3 görgü tanığı) | Tanık tutanakları |
| 18.10.2024 | ATK Maluliyet Raporu: **%32 sürekli** | ATK raporu |
| 12.05.2025 | Dava açıldı (İst. 7. Asliye Hukuk) | Dava dilekçesi |
| 08.06.2025 | Davalının cevap dilekçesi | Cevap dilekçesi |

## Taraflar Haritası
- **Davacı:** Ahmet Yılmaz (mağdur, SMMM)
- **Davalı:** Şahin Otomotiv A.Ş. (araç işleten)
- **Sürücü (kusurlu):** Mehmet Öztürk (davalı çalışanı)
- **Sigortacı:** XYZ Sigorta A.Ş. (ZMSS limiti: 1.000.000 ₺)
- **3 tanık:** AY, BK, CM

## ⚠ Tespit Edilen Çelişkiler
1. **Tanık #2 (BK)** beyanında "kavşağa girdiğinde sarı ışık" diyor; resmi tutanakta "kırmızı". Bu çelişki karşı tarafın eline koz verebilir; **revize edilmeli veya açıklanmalı**.
2. Hastane ilk kabul kaydında **emniyet kemeri ekimozu** notu var (= kemer takılıydı), ancak davalı cevap dilekçesinde "müvekkil kemer takmamıştı" iddiası mevcut. Bu çelişki **bizim lehimize**.

## Eksik Bilgiler
- Müvekkilin kaza sonrası **aylık vergi beyannameleri** dosyada yok (kazanç kaybı ispatı için kritik)
- **Kaza yeri trafik kamerası görüntüleri** ZABITA'dan istenmemiş`,

  legalClassifier: `## Önerilen Hukuki Nitelendirmeler

### 1. Haksız Fiil Sorumluluğu ⭐ **BİRİNCİL DAYANAK**
- **Hukuki dayanak:** TBK m.49, 50, 51, 56, 58
- **Gerekçe:** Davalının kusurlu eylemi (kırmızı ışık ihlali) nedeniyle müvekkilin uğradığı zararı tazmin yükümlülüğü kesindir.
- **Avantaj:** Kusur kaza tutanağı ile sabit; ispat yükü hafiftir.
- **Risk:** Müvekkilin ikincil bir kusurunun (emniyet kemeri) ileri sürülmesi.

### 2. Motorlu Araç İşletenin Hukuki Sorumluluğu ⭐ **GÜÇLÜ İKİNCİL**
- **Hukuki dayanak:** 2918 sayılı KTK m.85, m.86
- **Gerekçe:** İşletenin tehlike sorumluluğu (kusursuz sorumluluk) rejimi. Kusur ispatı dahi gerekmez; zarar ile illiyet bağı yeterlidir.
- **Avantaj:** Davalı, kusursuzluğunu ispatlamadıkça sorumludur (objektif sorumluluk).
- **Risk:** Mücbir sebep veya üçüncü kişi kusuru savunması (somut olayda zayıf).

### 3. Sigortacının Doğrudan Sorumluluğu — **EK DAVA İMKANI**
- **Hukuki dayanak:** KTK m.97, ZMSS Genel Şartları
- **Gerekçe:** Sigorta limiti dahilinde mağdurun sigortacıya doğrudan başvuru hakkı vardır.
- **Avantaj:** Paralel yürütülebilir; tahsilat hızlanır.
- **Risk:** Sigortacının tahkim talebi (5684 SK m.30) — mağdurun seçim hakkı olduğu için reddedilebilir.

## ⚖ Tavsiye
**Birincil + İkincil nitelendirme birleştirilerek dava sürdürülmeli**, sigortacıya **paralel doğrudan ihbar** yapılmalıdır. Bu üçlü strateji hem kusur ispatı yükünü düşürür, hem de nakit akışını hızlandırır.`,

  legislationScanner: `## İlgili Mevzuat

### 6098 sayılı Türk Borçlar Kanunu

#### TBK m.49 — Haksız Fiilden Sorumluluk
> "Kusurlu ve hukuka aykırı bir fiille başkasına zarar veren, bu zararı gidermekle yükümlüdür."

**Yürürlük:** ✅ Yürürlükte
**Uygulama:** Davanın temel dayanağı. Davalının kusurlu eylemi ile zararın illiyet bağı kuruluyor.

#### TBK m.50 — Zararın ve Kusurun İspatı
> "Zarar gören, zararını ve zarar verenin kusurunu ispat yükü altındadır."

**Uygulama:** Kaza tespit tutanağı kusur ispatını sağlamıştır.

#### TBK m.51 — Tazminat Türleri ve Kapsamı
> "Hâkim, tazminatın kapsamını ve ödenme biçimini, durumun gereğini ve özellikle kusurun ağırlığını göz önüne alarak belirler."

#### TBK m.56 — Manevi Tazminat
> "Hâkim, bir kimsenin bedensel bütünlüğünün zedelenmesi durumunda, olayın özelliklerini göz önünde tutarak, zarar görene uygun bir miktar paranın manevi tazminat olarak ödenmesine karar verebilir."

**Kritik:** Bu madde manevi tazminat talebimizin doğrudan dayanağıdır.

---

### 2918 sayılı Karayolları Trafik Kanunu

#### KTK m.85 — İşletenin Sorumluluğu
> "Bir motorlu aracın işletilmesi bir kimsenin ölümüne veya yaralanmasına yahut bir şeyin zarara uğramasına sebep olursa, motorlu aracın bir teşebbüsün unvanı veya işletme adı altında veya bu teşebbüs tarafından kesilen biletle işletilmesi halinde, motorlu aracın işleteni ve bağlı olduğu teşebbüsün sahibi, doğan zarardan müştereken ve müteselsilen sorumlu olurlar."

**Yürürlük:** ✅ Yürürlükte (2018 değişiklikleri dahil)
**Uygulama:** Şahin Otomotiv A.Ş.'nin işleten sıfatıyla **kusursuz sorumluluğunu** kurar.

#### KTK m.97 — Sigortacıya Doğrudan Başvuru
> "Zarar gören, uğradığı zararın sigorta sözleşmesinde öngörülen miktara kadar olan kısmının ödenmesini doğrudan doğruya sigortacıdan isteyebilir."

**Kritik:** Paralel sigorta davası açma hakkımızı verir.

---

### 6100 sayılı Hukuk Muhakemeleri Kanunu

#### HMK m.127 — Cevap Dilekçesi Süresi
> "Cevap dilekçesini verme süresi, dava dilekçesinin davalıya tebliğinden itibaren iki haftadır."

⚠ **Bu dosyada cevaba cevap için 12 gün kaldı.**

### Dikkat Edilecek Hususlar
- **Eski Borçlar Kanunu m.41-46 (818 sayılı, mülga)** — kullanılmamalıdır.
- 2918 KTK 2018 değişiklikleri sigorta limitlerini güncellemiştir; **eski limitler geçersizdir**.`,

  caseHunter: `## 🟢 Lehe Emsal Kararlar

### 1. Yargıtay 17. Hukuk Dairesi — E.2021/8932 K.2022/4521 (T.14.09.2022)
- **Benzerlik:** %96
- **Karar özeti:** Trafik kazasında %32 sürekli iş gücü kaybı nedeniyle 1.180.000 TL tazminata hükmedildi. **Tam kusurlu davalının, mağdurun ikincil kusurunu (emniyet kemeri) kusur paylaşımı argümanı olarak ileri süremeyeceği** içtihat edildi.
- **Bizim davaya katkısı:** Davalının emniyet kemeri itirazını doğrudan çürütür. Maluliyet hesabı için de emsal niteliğindedir.
- **Tam atıf:** \`Yarg. 17. HD, E.2021/8932 K.2022/4521, T.14.09.2022\`

### 2. Yargıtay Hukuk Genel Kurulu — E.2023/892 K.2024/156 (T.08.02.2024)
- **Benzerlik:** %89
- **Karar özeti:** ZMSS poliçesi kapsamında sigortacının manevi tazminattan da limit dahilinde **doğrudan sorumlu olduğu**; manevi tazminat miktarının takdirinde mahkemenin geniş takdir yetkisi bulunduğu vurgulandı.
- **Bizim davaya katkısı:** Sigortaya paralel ihbar stratejimizi güçlendirir.
- **Tam atıf:** \`Yarg. HGK, E.2023/892 K.2024/156, T.08.02.2024\`

### 3. Yargıtay 4. Hukuk Dairesi — E.2024/2103 K.2024/8821 (T.22.03.2024)
- **Benzerlik:** %92
- **Karar özeti:** %38 maluliyet, 14 gün yoğun bakım ve psikolojik travma için **500.000 TL manevi tazminat** onandı.
- **Bizim davaya katkısı:** Manevi tazminat talebimizin (300.000 TL) "fahiş" olmadığını, aksine düşük kaldığını ispatlar.
- **Tam atıf:** \`Yarg. 4. HD, E.2024/2103 K.2024/8821, T.22.03.2024\`

### 4. Yargıtay 17. HD — E.2023/4421 K.2023/12056 (T.19.10.2023)
- **Benzerlik:** %87
- **Karar özeti:** Kaza öncesi mevcut bel fıtığının kaza ile ağırlaştığı durumda, **mevcut rahatsızlık maluliyet hesabından düşülmez**; oluşan toplam maluliyet esas alınır.
- **Bizim davaya katkısı:** Davalının olası "geçmiş hastalık" itirazını öncesinden kapatır.

### 5. Yargıtay 4. HD — E.2023/9201 K.2024/3290 (T.05.02.2024)
- **Benzerlik:** %84
- **Karar özeti:** Sürekli iş gücü kaybı tazminatı **haksız fiil tarihinden itibaren** faize tabidir; temerrüt aranmaz.
- **Bizim davaya katkısı:** Kaza tarihinden itibaren faiz talebimizi destekler.

## 🔴 Aleyhe Olabilecek Kararlar

### 1. Yargıtay 17. HD — E.2020/3318 K.2021/2876
Bu kararda, mağdurun emniyet kemeri kullanmadığı **kesin kanıtlanan** durumda %15 kusur paylaşımına gidilmiştir. Karşı taraf bu kararı kullanabilir, ancak **bizim dosyada kemer kullanımı belgelidir** (hastane ekimoz notu), bu nedenle uygulanabilir değildir.

## Strateji Önerisi
- Kararlar 1, 3 ve 4'ü dilekçenin **HUKUKİ SEBEPLER** bölümünde ayrı ayrı işle.
- Karar 2'yi sigorta tahkim itirazına karşı sakla.
- Karar 5'i neticei talep bölümünde faiz başlangıcını gerekçelendirirken kullan.`,

  doctrineScanner: `## Doktrindeki Tartışma

### Hâkim Görüş
Türk doktrininde, **motorlu araç işletenin kusursuz sorumluluğunun** mağdurun ikincil bir kusuruyla paylaştırılamayacağı görüşü hâkimdir. İşletenin sorumluluğu **tehlike sorumluluğu** rejimine tabidir ve mağdurun emniyet kemeri kullanmaması gibi durumlar, ancak **kaza ile illiyet bağı kesilirse** sorumluluğu azaltabilir.

- **Yazarlar:** Genel olarak deliktik sorumluluk doktrini bu yönde ağırlık göstermektedir.
- **Önemli noktalar:** İllik bağı kesilmemişse, mağdurun %5-10 düzeyindeki ikincil kusuru tazminattan indirim sebebi yapılmaz (Yarg. HGK içtihatları bu görüşle uyumludur).

### Karşı Görüş
Azınlık görüşüne göre, mağdurun emniyet kemeri kullanmamış olması TBK m.52 anlamında **müşterek kusur** sayılmalı ve tazminattan oransal indirim yapılmalıdır. Bu görüş özellikle 1990'lı yıllarda etkili olmuş, sonradan içtihatla terk edilmiştir.

### HARIS Değerlendirmesi
Davamızda **kemer kullanımı belgeli** olduğundan bu tartışma somut anlam taşımıyor. Yine de karşı tarafın bu doktrini gündeme getirme ihtimaline karşı, dilekçede **hâkim görüşe** atıf yapılması ve **HGK içtihatlarıyla** desteklenmesi tavsiye olunur.

> Not: Spesifik yazar atıfı için manuel literatür taraması önerilir; HARIS doktrin veritabanı yeterli granülariteye ulaştığında otomatik atıflar eklenecektir.`,

  procedureExpert: `## Görev ve Yetki Kontrolü

- **Görevli mahkeme:** ✅ Asliye Hukuk Mahkemesi (HMK m.2 — değer 50.000 TL üzerinde, manevi tazminat dahil)
- **Yetkili mahkeme:** ✅ İstanbul (haksız fiilin işlendiği yer — TBK/HMK m.16)
- **Gerekçe:** Trafik kazası Beşiktaş'ta meydana geldiğinden İstanbul mahkemeleri yetkilidir. Davalının ikametgâhı (Maslak) da İstanbul'da olduğundan **çifte yetki** bulunmaktadır.

## ⏰ Kritik Süreler

| Süre | Başlangıç | Bitiş | Yasal Dayanak |
|---|---|---|---|
| **Cevaba cevap dilekçesi** | Davalının cevap dilekçesinin tebliği (8 Haz 2025) | 28 Mayıs 2026 *(2 hafta + adli tatil)* | HMK m.136 |
| **Ön inceleme duruşması** | — | 15 Haziran 2026 | HMK m.137-142 |
| **Tanık listesi** | Ön inceleme bittikten sonra | 2 hafta içinde | HMK m.240 |
| **Bilirkişi itirazı** | Rapor tebliğinden | 2 hafta | HMK m.281 |
| **Karara karşı istinaf** | Kararın tebliği | 2 hafta | HMK m.345 |
| **Zamanaşımı (genel)** | Haksız fiil tarihi (12 Mar 2024) | 10 yıl | TBK m.72 |

## Olası Usul İtirazları

### Karşı Taraftan Beklenenler:
1. **Sigorta tahkim yetkisizliği itirazı** (5684 SK m.30) → Cevap: Mağdurun seçim hakkı vardır (Yarg. 17. HD 2024/4 K.)
2. **Bilirkişi yenileme talebi** → Cevap: ATK raporu yeterli ve resmî bilirkişidir
3. **Tanık #2 beyanına itiraz** → Cevap: Çelişki açıklanabilir niteliktedir

### Bizden Yapılabilecekler:
- **Kısmi dava → ıslah** ile talep yükseltme (HMK m.176)
- **Delil tespiti** (kaza yeri trafik kamera kayıtları)

## Yapılması Gerekenler (Sıralı)
1. ✅ **Cevaba cevap dilekçesi** (28 Mayıs'a kadar)
2. ⏳ Sigorta şirketine **doğrudan ihbar** gönder (paralel hat)
3. ⏳ Trafik kamera görüntülerinin **delil tespiti** dilekçesi
4. ⏳ Müvekkilin **vergi beyannameleri** için Vergi Dairesi'ne celp
5. ⏳ Ön inceleme duruşmasına müvekkilin bizzat katılımını sağla (HMK m.140)`,

  riskAnalyst: `## 🔴 KRİTİK RİSKLER (Davayı Kaybettirebilir)

### 1. Bilirkişi Yenileme Riski (%25)
Davalı sigorta avukatı, ATK raporuna itiraz edip **yeniden bilirkişi** talep edebilir. Adli Tıp dışında akademisyenler atanırsa, %32 maluliyet oranı düşürülebilir. **Aksiyon:** ATK'nın resmi statüsünü ve uzmanlığını şimdiden dilekçede vurgula.

### 2. Sigorta Tahkim İtirazı (%35)
5684 SK m.30 ZMSS uyuşmazlıklarında tahkim öngörür. Karşı taraf bunu **görev itirazı** olarak ileri sürebilir. Yarg. 17. HD 2024/4 K. lehimize emsal olsa da, mahkeme yorumu değişebilir. **Aksiyon:** Tahkim itirazına cevap dilekçesini önceden hazırla.

## 🟡 ORTA RİSKLER

### 3. Manevi Tazminat İndirimi (%42)
Mahkemeler manevi tazminatta tarihsel olarak muhafazakâr davranır. 300.000 TL'lik talep %30-40 oranında indirilebilir. **Aksiyon:** Yarg. 4. HD 2024/8821 K. ile 500.000 TL emsal göster.

### 4. Tanık #2 Çelişkisi (%18)
Sarı/kırmızı ışık çelişkisi karşı tarafa "Tüm tanık beyanlarına güvenilemez" tezini açar. **Aksiyon:** Cevaba cevap dilekçesinde bu çelişkiyi PROAKTİF olarak açıkla.

### 5. Kazanç Kaybı Hesabı İtirazı (%30)
Müvekkilin SMMM olarak aylık 42.000 TL gelirinin **belgelenmesi** zayıf — sadece vergi beyannameleri eksik. Karşı taraf bunu kullanabilir. **Aksiyon:** Vergi Dairesi'nden celp ile beyannameler toplansın.

## 🟢 KÜÇÜK RİSKLER

### 6. Faiz Başlangıç Tarihi (%8)
Faiz "haksız fiil tarihinden" değil de "dava tarihinden" başlatılabilir. **Aksiyon:** Yarg. 4. HD 2024/3290 K. ile karşıla.

### 7. Yargılama Gecikmesi (%50 olasılık ama düşük etki)
Ortalama 14-22 ay sürer. Müvekkilin nakit ihtiyacı varsa **sigorta paralel hattı** öncelikli olmalı.

## 📊 Risk Skoru (Toplam)
- **Tam kaybetme olasılığı:** %5
- **Kısmi kabul (%50-70 tazminat) olasılığı:** %22
- **Yüksek kabul (%70-90 tazminat) olasılığı:** %39
- **Tam kabul / üstü:** %34

## Risk Azaltma Önerileri
1. **Tanık #2 çelişkisini cevaba cevapta proaktif açıkla.**
2. **Sigortaya paralel doğrudan ihbar yap** — limit içi tahsil hızı kazandır.
3. **Vergi beyannameleri** için Vergi Dairesi'ne celp talep et.
4. **Trafik kamerası** için delil tespiti açıver.
5. **Manevi tazminat için 4. HD 2024/8821 K. emsal** öne çıkar.

## Dış Denetçi Notu
Müvekkilin pozisyonu **güçlüdür ama kendinden emin değildir**. Davanın %78 başarı tahmini gerçekçidir, ancak yukarıdaki 7 risk **proaktif olarak** kapatılmazsa, %78 rakamı %60'lara inebilir. **Şimdi pasif kalmak en büyük risktir.**`,

  petitionWriter: `İSTANBUL 7. ASLİYE HUKUK MAHKEMESİ

SAYIN HAKİMLİĞİ'NE

**DOSYA NO:** 2025/1842 E.

# CEVABA CEVAP DİLEKÇESİDİR

**DAVACI**         : Ahmet YILMAZ (T.C. 12345678901)
                    Beşiktaş / İstanbul

**VEKİLİ**         : Av. Ayşe YILDIZ — Yıldız & Ortakları Hukuk Bürosu
                    Levent Mh. ... İstanbul (Sicil: 12345)

**DAVALI**         : Şahin Otomotiv A.Ş. (MERSİS: 0123456789012345)
                    Maslak / İstanbul

**VEKİLİ**         : Av. Bülent KAYA

**KONU**           : Davalı vekilinin 08.06.2025 tarihli cevap dilekçesine cevaplarımızdan ibarettir.

## AÇIKLAMALAR

Davalı vekili tarafından sunulan cevap dilekçesinde ileri sürülen iddialar, hem maddi vakıalar yönünden gerçeği yansıtmamakta, hem de hukuki dayanaktan yoksun bulunmaktadır. Aşağıda her bir iddiaya ayrı ayrı cevap verilmektedir.

**1. KUSUR İTİRAZINA İLİŞKİN:** Davalı vekili, müvekkilimin de kazanın oluşumunda *"emniyet kemeri takmaması suretiyle"* kusurlu olduğunu iddia etmektedir. Ancak bu iddia tamamen mesnetsizdir:

1. **Kaza Tespit Tutanağı** (12.03.2024, sıra no: 2024/8842), davalı sürücünün **kavşakta kırmızı ışıkta geçtiğini ve %100 kusurlu olduğunu** açıkça tespit etmiştir. **(EK-2)**

2. Müvekkilin emniyet kemeri kullandığı, kaza yeri fotoğraflarındaki kemer izlerinden ve hastane ilk kabul kayıtlarındaki *"omuz çapraz emniyet kemeri ekimozu"* notundan açıkça anlaşılmaktadır. **(EK-4, EK-8)**

3. Yargıtay 17. Hukuk Dairesi'nin yerleşik içtihadına göre, **tam kusurlu davalı, mağdurun ikincil bir kusurunu (varsa dahi) kusur paylaşımı argümanı olarak ileri süremez.** *(Yarg. 17. HD, E.2021/8932 K.2022/4521, T.14.09.2022)*

**2. SİGORTA LİMİTİ İTİRAZINA İLİŞKİN:** Davalı vekili, ZMSS sigortası limitinin tazminat üst sınırı oluşturduğunu iddia etmektedir. Bu iddia, **2918 sayılı KTK m.85'in açık hükmüne aykırıdır.** İşletenin sorumluluğu sigorta limiti ile sınırlı değildir; sigorta limitini aşan zararlar bizzat işletenden talep edilebilir. *(Yarg. HGK E.2023/892 K.2024/156)*

**3. MALULİYET ORANINA İLİŞKİN:** Davalı, Adli Tıp Kurumu'nun **%32 sürekli iş gücü kaybı** raporuna itiraz etmektedir. Yarg. 17. HD E.2023/4421 K.2023/12056 sayılı kararı uyarınca, **kaza öncesi mevcut bir rahatsızlık, kaza ile ağırlaşmışsa, maluliyet hesabında düşülmez.** ATK raporu, alanında uzman bir heyetçe müvekkilin tüm tıbbi geçmişi gözetilerek düzenlenmiş olup itiraza mahal yoktur.

**4. MANEVİ TAZMİNAT İNDİRİM TALEBİNE İLİŞKİN:** Davalı, talep edilen 300.000 TL manevi tazminatın "fahiş" olduğunu iddia etmektedir. Oysa müvekkil:
- 11 gün yoğun bakımda kalmış,
- 2 büyük ameliyat geçirmiş,
- %32 oranında kalıcı maluliyete uğramış,
- Mesleğini eskisi gibi icra edememekte,
- Psikolojik travma sonrası tedavi görmektedir.

Yargıtay 4. HD'nin E.2024/2103 K.2024/8821 sayılı emsal kararında, benzer ağırlıkta bir yaralanma için **500.000 TL manevi tazminata** hükmedilmiştir. Talep edilen miktar fahiş değil, aksine emsal kararların altındadır.

## HUKUKİ SEBEPLER

TBK m.49, 50, 51, 56, 58; 2918 sayılı KTK m.85, 86, 90, 97; HMK ve sair mevzuat hükümleri.

## HUKUKİ DELİLLER

Dosyaya sunulu tüm deliller, ek olarak sunulacak deliller, tanık beyanları, bilirkişi incelemesi, keşif, yemin ve sair her türlü yasal delil.

## NETİCE-İ TALEP

Yukarıda arz ve izah edilen nedenlerle:
1. **Davalı vekilinin tüm itirazlarının reddine,**
2. Müvekkilin **650.000 TL maddi** ve **300.000 TL manevi** tazminat talebinin, kaza tarihi olan 12.03.2024'ten itibaren işleyecek **yasal faiziyle birlikte** davalıdan tahsiline,
3. **Yargılama giderleri ve vekâlet ücretinin davalıya yükletilmesine**,

karar verilmesini saygılarımla arz ve talep ederim.

20 Mayıs 2026
Davacı Vekili
**Av. Ayşe YILDIZ**
*(e-imza)*

**EKLER:**
EK-2: Kaza Tespit Tutanağı (12.03.2024, no:2024/8842)
EK-4: Hastane İlk Kabul Kayıtları
EK-8: Kaza Yeri Fotoğrafları (12 adet)
EK-12: Yarg. 17. HD E.2021/8932 K.2022/4521 — Karar metni
EK-13: Yarg. HGK E.2023/892 K.2024/156 — Karar metni`,

  defenseArchitect: `## Savunma Mimarisi

### Sıralama (Önerilen)

1. **Kusur İtirazını Çürütme** *(en güçlü, başta)*
   → Kaza tutanağı + EK-2 ile %100 davalı kusuru
   → Yargıtay 17. HD 2022/4521 emsal kararı
   → **Etki:** Hâkimin ilk izlenimi netleşir

2. **Emniyet Kemeri Preemptive Defense** *(karşı saldırı kapatma)*
   → Karşı taraf "kemer takmamış" diyor
   → Hastane ekimoz notu (EK-4) ile çürüt
   → **Etki:** Karşı tarafın en güçlü argümanı baştan etkisizleştirilir

3. **Sigorta Limiti İtirazı** *(orta blok)*
   → KTK m.85 açıkça reddediyor
   → HGK 2024/156 emsalle pekiştir

4. **Maluliyet İtirazı** *(orta blok)*
   → ATK uzman bilirkişi
   → 17. HD 2023/12056 emsalle pekiştir

5. **Manevi Tazminat Tutarı** *(ikinci en güçlü, sona)*
   → 4. HD 2024/8821 emsali (500.000 TL onandı)
   → Yaşanan acıların yoğun anlatımı
   → **Etki:** Hâkimin son izlenimi "talep mütevazidir" olur

### 🎯 Anahtar Mesaj
*"Müvekkilin kusursuz, davalının %100 kusurlu olduğu kesindir; talep edilen tazminat ise emsal kararların gerisinde kalan, mütevazi bir miktardır."*

### Kaçınılacaklar
- **Davalı şirkete ahlaki suçlama** YASAK (sempatiyi azaltır, profesyonellik düşürür)
- **Müvekkilin geçmiş bel fıtığı** detaylarına gereksiz girme (karşı tarafa zemin açar)
- **Sigortayı suçlama** YASAK (sigortacı henüz davaya katılmamış, kötüye kullanım riski)`,

  editor: `## Editör Kontrol Raporu

### ✅ Dilbilgisi & Yazım
- Tüm büyük/küçük harf doğru kullanılmış
- "müvekkilim'in" → "müvekkilimin" (kesme işareti gereksizdi) — düzeltildi
- "ki" bağlacı 3 yerde yanlış yazılmış — düzeltildi
- Noktalama: tam isabet

### ✅ Hukuki Terminoloji
- "açtığı dava" → "ikame ettiği dava" — terminoloji yükseltildi
- "söz konusu" → "anılan" (resmi dil)
- "iddia ediyor" → "iddia etmektedir" (geniş zaman, hukuki)

### ✅ Tutarlılık
- Müvekkil ismi tüm dilekçede aynı: "Ahmet YILMAZ" ✓
- Tazminat miktarları her yerde aynı: 650.000 + 300.000 = 950.000 TL ✓
- Atıf formatları tutarlı: \`Yarg. X. HD, E.YYYY/NNNN K.YYYY/NNNN\` ✓

### ✅ Atıf Doğruluğu
- TBK m.49, 50, 51, 56, 58 → kontrol edildi, hepsi mevcut ve doğru
- KTK m.85, 97 → kontrol edildi
- 4 Yargıtay kararı atfı → standart format

### ✅ Profesyonel Ton
- Hiçbir duygusal patlama yok
- Karşı tarafa hakaret yok
- "Mahkemenizin takdirine arz olunur" gibi gereksiz kibirlilik temizlendi

### Notlar (Avukatın Dikkatine)
1. **EK numaralandırması** (EK-2'den başlıyor — önceki dilekçedeki ekleri saymak için). Doğru.
2. **E-imza** ile gönderilecek — fiziki imza zorunluluğu yok (HMK m.118).
3. Dilekçenin **PDF formatında**, **UYAP üzerinden** sunulması önerilir.

### Genel Değerlendirme: **9.4 / 10**
Üst düzey hukuk ofisi standardında. Sunulabilir.`,

  adversarial: `## ⚔ Karşı Taraf Avukatı Olarak Saldırı Argümanlarım

(Şimdi bu dilekçeyi parçalamaya çalışıyorum. Sizin tarafınız bunlara hazır olmalı.)

### 1. **Maluliyet — Sebep-Sonuç Saldırısı** 🔴 YÜKSEK
**Argüman:** "Davacının kaza öncesi belgelenmiş bel fıtığı bulunmaktadır. ATK raporu, maluliyetin tamamını kazaya bağlamış olup bu hatalıdır. Mevcut rahatsızlığın etkisi düşülmelidir. Yeniden bilirkişi talep ederiz."
**Hedeflediği zayıflık:** Müvekkilin tıbbi geçmişi
**Savunma:** Yarg. 17. HD 2023/12056 K. zaten dilekçede geçti. Pekiştirmek için **ATK uzman heyetinin tıbbi geçmiş incelemesini yaptığını** EK olarak göster.

### 2. **Tanık Çelişkisi Saldırısı** 🟡 ORTA
**Argüman:** "Davacı tanığı BK, beyanında 'sarı ışıktı' demektedir; resmi tutanakta 'kırmızı'. Bu çelişki, tüm tanık beyanlarına güvenilmezliği gösterir."
**Hedeflediği zayıflık:** Dilekçede bu çelişkiye değinilmedi
**Savunma:** Bu çelişki **dilekçeye proaktif olarak eklenmeli**: *"Tanığın sarı algısı, ışığın sarıdan kırmızıya geçme anına denk gelen kısa süreli karışıklıktır; ana olgu olan davalının kavşağa giriş anında ışığın kırmızı olduğu resmi tutanakla sabittir."*

### 3. **Sigorta Tahkim Yetkisi İtirazı** 🟡 ORTA
**Argüman:** "ZMSS uyuşmazlıklarında 5684 sayılı kanun m.30 uyarınca SİGORTA TAHKİM KOMİSYONU yetkilidir. Bu davanın esastan reddi gerekir."
**Hedeflediği zayıflık:** Görev/yetki
**Savunma:** 5684 SK m.30 tahkim opsiyonel — mağdurun seçim hakkı vardır. Yarg. 17. HD 2024/4 K. teyit eder. **Dilekçeye eklenmeli.**

### 4. **Manevi Tazminat Tavanı Saldırısı** 🟡 ORTA
**Argüman:** "Emsal kararlar incelendiğinde, benzer maluliyet oranlarında manevi tazminatlar 200.000 TL civarındadır. 300.000 TL talebi fahiştir; TBK m.51 uyarınca indirim talep ederiz."
**Hedeflediği zayıflık:** Talep miktarı
**Savunma:** Yarg. 4. HD 2024/8821 K. (500.000 TL onandı) dilekçede zaten geçti. **Enflasyon faktörü** de eklenmeli: "Belirtilen emsal kararlardaki 300.000 TL'lik miktarlar 2019-2020 tarihlidir; 2024 yılı tüketici fiyatlarına göre 950.000 TL'ye karşılık gelir."

### 5. **Kazanç Kaybı Hesabı İtirazı** 🔴 YÜKSEK
**Argüman:** "Davacının iddia ettiği 42.000 TL aylık gelir BORDROYA dayanmaktadır. SMMM olarak serbest mesleği gereği **vergi beyannameleri** sunulmamıştır. Gelir miktarı belgesizdir."
**Hedeflediği zayıflık:** Eksik belge
**Savunma:** **Vergi Dairesi'nden celp ile beyannameler ACİL toplanmalı.** Bu eksik kapatılmadan dilekçe risk taşıyor.

### 6. **Faiz Başlangıç Tarihi İtirazı** 🟢 DÜŞÜK
**Argüman:** "Faiz, dava tarihinden itibaren işlemelidir; haksız fiil tarihi değil."
**Savunma:** Yarg. 4. HD 2024/3290 K. zıt yönde içtihat (haksız fiil tarihi). Dilekçeye eklenmeli.

---

## 📊 Genel Adversarial Skor: **6.5 / 10**

Dilekçe genelde sağlam, ancak şu 3 noktada **proaktif iyileştirme** olmadan karşı tarafa zemin verir:
1. **Tanık #2 çelişkisinin açıklanması eksik**
2. **Sigorta tahkim itirazına önceden cevap yok**
3. **Vergi beyannameleri belgesizliği boşluk yaratıyor**

## ⚡ Acil Aksiyon
Bu 3 saldırı vektörünü kapatın → dilekçe skoru **8.5/10**'a çıkar.`,
};

export function getDemoResponse(agentId: AgentId): string {
  return DEMO_RESPONSES[agentId] || "Demo yanıt henüz hazırlanmadı.";
}
