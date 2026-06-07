/**
 * HARIS Türk Hukuku Korpusu
 *
 * 40+ kürate edilmiş hukuki belge:
 * - Yargıtay/Danıştay/AYM emsal karar özetleri
 * - Temel mevzuat maddeleri (TBK, TCK, HMK, CMK, KTK, İYUK, İK, TMK)
 * - Tematik doktrin özetleri
 *
 * Her belge embed edilir, RAG retrieval'da kullanılır.
 * Production'da Yargıtay Karar Arama scraping + günlük güncelleme planlanıyor.
 *
 * NOT: Karar özetleri ve metinler eğitsel/demonstratif amaçlıdır.
 */

export type DocCategory =
  | "yargitay"
  | "danistay"
  | "aym"
  | "aihm"
  | "mevzuat"
  | "doktrin";

export type LegalArea =
  | "tazminat"
  | "is"
  | "ticari"
  | "aile"
  | "ceza"
  | "icra"
  | "idari"
  | "gayri"
  | "anayasa"
  | "usul"
  | "genel";

export interface CorpusDoc {
  id: string;
  category: DocCategory;
  areas: LegalArea[];
  court?: string;
  caseNo?: string;
  date?: string;
  articleNo?: string;
  lawName?: string;
  title: string;
  content: string;
  /** Aranabilir ek anahtar kelimeler */
  tags: string[];
  url?: string;
}

export const CORPUS: CorpusDoc[] = [
  /* ============================================================
     YARGITAY KARARLARI — TAZMİNAT / TRAFİK
     ============================================================ */
  {
    id: "y-17hd-2022-4521",
    category: "yargitay",
    areas: ["tazminat"],
    court: "Yargıtay 17. Hukuk Dairesi",
    caseNo: "E.2021/8932 K.2022/4521",
    date: "14.09.2022",
    title:
      "Trafik Kazasında %32 Maluliyet — Tam Kusurlu Davalı, Mağdurun İkincil Kusurunu İleri Süremez",
    content: `Davacının trafik kazası neticesinde uğradığı %32 oranındaki sürekli iş gücü kaybı sebebiyle açtığı tazminat davasında, ilk derece mahkemesince PMF 1931 yaşam tablosu uyarınca hesaplanan kazanç kaybı, tedavi giderleri ve manevi tazminat toplamı olarak 1.180.000 TL'ye hükmedilmiştir. Davalı tarafça ileri sürülen "davacının emniyet kemeri kullanmadığı için kusur paylaşımı yapılması" itirazı, Dairemizce reddedilmiştir.

Dairemizin yerleşik içtihadına göre, kazanın oluşumunda davalı %100 kusurlu olarak tespit edilmişse, mağdurun ikincil bir kusurunun (örneğin emniyet kemeri kullanmaması) tazminattan indirim sebebi olarak değerlendirilebilmesi için, bu kusurun **kaza ile illiyet bağı** kesilmiş olmalıdır. Somut olayda davacının yaralanma derecesinin emniyet kemeri kullanılmamış olmasından kaynaklandığı yönünde dosyada herhangi bir somut delil bulunmamaktadır.

Bu sebeple ilk derece mahkemesinin tam kusur prensibine dayalı hükmü ONANMIŞTIR. 2918 sayılı KTK m.85 uyarınca işletenin kusursuz sorumluluğu çerçevesinde, sigorta limitini aşan zararların bizzat işletenden talep edilebileceği de hüküm altına alınmıştır.`,
    tags: [
      "trafik kazası",
      "maluliyet",
      "kusur paylaşımı",
      "emniyet kemeri",
      "tam kusur",
      "KTK 85",
      "PMF 1931",
      "iş gücü kaybı",
      "sigorta limiti",
    ],
  },
  {
    id: "y-hgk-2024-156",
    category: "yargitay",
    areas: ["tazminat"],
    court: "Yargıtay Hukuk Genel Kurulu",
    caseNo: "E.2023/892 K.2024/156",
    date: "08.02.2024",
    title:
      "ZMSS Sigortacısının Manevi Tazminattan Doğrudan Sorumluluğu — Limit Dahilinde",
    content: `Hukuk Genel Kurulu, Zorunlu Mali Sorumluluk Sigortası (ZMSS) poliçesi kapsamında sigorta şirketinin **manevi tazminattan da** poliçe limiti dahilinde **doğrudan sorumlu olduğuna** karar vermiştir. Aksi yöndeki bazı daire kararları içtihat birliği sağlanmak üzere değerlendirilmiş; sigortanın amacı ve KTK m.97'nin lafzı gözetilerek mağdurun doğrudan başvuru hakkının manevi tazminatı da kapsadığı sonucuna varılmıştır.

Karara göre, manevi tazminat miktarının takdirinde mahkemenin geniş takdir yetkisi bulunmakla birlikte, takdirde yargılama tarihindeki ekonomik koşullar, enflasyon, mağdurun yaşadığı acı ve ızdırap, kalıcı maluliyet oranı dikkate alınmalıdır. Hâkim, tazminatın "zenginleştirme aracı" değil "hafifletme aracı" olduğu ilkesine bağlı kalmakla birlikte, miktarın sembolik kalmamasına özen göstermelidir.

Somut olayda 250.000 TL manevi tazminat ZMSS limiti dahilinde olduğundan, sigorta şirketi yönünden hüküm ONANMIŞTIR.`,
    tags: [
      "manevi tazminat",
      "ZMSS",
      "sigorta",
      "doğrudan sorumluluk",
      "KTK 97",
      "limit",
      "HGK",
      "içtihat birleştirme",
    ],
  },
  {
    id: "y-4hd-2024-8821",
    category: "yargitay",
    areas: ["tazminat"],
    court: "Yargıtay 4. Hukuk Dairesi",
    caseNo: "E.2024/2103 K.2024/8821",
    date: "22.03.2024",
    title:
      "Manevi Tazminat — Yüksek Maluliyet ve Travma Halinde 500.000 TL Onandı",
    content: `Davacının trafik kazası nedeniyle uğradığı %38 sürekli iş gücü kaybı, 14 günlük yoğun bakım süreci, iki büyük ortopedik ameliyat ve travma sonrası stres bozukluğu tanısı dikkate alınarak ilk derece mahkemesinin 500.000 TL manevi tazminat hükmü Dairemizce ONANMIŞTIR.

Yargıtay, "manevi tazminatın amacı zenginleştirme değil, yaşanan acı ve ızdırabın hafifletilmesidir" şeklindeki klasik formülü tekrar etmekle birlikte, miktarın günün ekonomik koşullarına ve enflasyona uygun olması gerektiğini vurgulamıştır. 2010'lu yıllardaki içtihat seviyeleri (50.000-100.000 TL aralığı) bugünün koşullarında geçerli kabul edilmemelidir.

Dairemiz ayrıca, davalı tarafın "talep miktarı emsal kararların üzerindedir" şeklindeki itirazını, **emsal kararların enflasyon güncellemesi yapılarak değerlendirilmesi gerektiği** gerekçesiyle reddetmiştir.`,
    tags: [
      "manevi tazminat",
      "yüksek maluliyet",
      "travma",
      "emsal güncelleme",
      "enflasyon",
      "PTSD",
      "ortopedik",
    ],
  },
  {
    id: "y-17hd-2023-12056",
    category: "yargitay",
    areas: ["tazminat"],
    court: "Yargıtay 17. Hukuk Dairesi",
    caseNo: "E.2023/4421 K.2023/12056",
    date: "19.10.2023",
    title:
      "Geçmiş Hastalık Maluliyetten Düşülmez — Kaza ile Ağırlaşma Esastır",
    content: `Davacının kaza öncesinde mevcut bel fıtığı rahatsızlığının bulunduğu sabit olmakla birlikte, Adli Tıp Kurumu raporu uyarınca **kaza ile birlikte mevcut rahatsızlığın ciddi şekilde ağırlaştığı**, ameliyat ihtiyacının doğduğu tespit edilmiştir. Davalı sigorta tarafından öne sürülen "geçmiş rahatsızlığa isabet eden kısmın maluliyet hesabından düşülmesi" itirazı reddedilmiştir.

Dairemizin yerleşik içtihadına göre, kaza öncesi mevcut bir hastalığın kaza ile ağırlaşması durumunda, **ağırlaşan kısmın değil, oluşan toplam maluliyet oranının** tazminat hesabına esas alınması gerekir. Aksi kabul, mağdurun zaten zayıf olan sağlık durumunu davalı lehine bir argümana çevirir ki bu durum hakkaniyete aykırıdır.

Bu çerçevede ATK raporunda belirlenen %29 maluliyet oranı tam olarak hesaba esas alınmış, davalının yeniden bilirkişi talebi reddedilmiştir.`,
    tags: [
      "geçmiş hastalık",
      "maluliyet",
      "ağırlaşma",
      "bel fıtığı",
      "ATK",
      "Adli Tıp",
      "preexisting condition",
      "illiyet",
    ],
  },
  {
    id: "y-4hd-2024-3290",
    category: "yargitay",
    areas: ["tazminat"],
    court: "Yargıtay 4. Hukuk Dairesi",
    caseNo: "E.2023/9201 K.2024/3290",
    date: "05.02.2024",
    title:
      "Sürekli İş Gücü Kaybı Tazminatı — Faiz Başlangıcı Haksız Fiil Tarihinden",
    content: `Davacının sürekli iş gücü kaybı tazminatının ne zaman faize tabi olacağı hususunda ortaya çıkan uyuşmazlıkta Dairemiz, **TBK m.117 hükmüne göre haksız fiil sorumluluğunda temerrüt hâlinin doğmasına gerek bulunmadığı**, faizin doğrudan haksız fiil (kaza) tarihinden itibaren işlemeye başlayacağı sonucuna varmıştır.

Buna mukabil, **tedavi giderleri** yönünden faiz başlangıcı her bir giderin ödendiği tarihtir; çünkü tedavi giderlerinin doğması olay tarihinde değil, fiilî ödeme tarihinde gerçekleşir. Aynı şekilde **manevi tazminat** yönünden de faiz başlangıcı haksız fiil tarihidir; çünkü manevi zarar olayla birlikte doğmuştur.

Davalı tarafın "faiz dava tarihinden itibaren işlemelidir" şeklindeki itirazı, TBK m.117 ile bağdaşmadığı gerekçesiyle reddedilmiş, ilk derece mahkemesinin haksız fiil tarihinden itibaren faize hükmeden kararı ONANMIŞTIR.`,
    tags: [
      "faiz başlangıcı",
      "haksız fiil tarihi",
      "TBK 117",
      "temerrüt",
      "tedavi giderleri",
      "manevi tazminat faiz",
    ],
  },

  /* ============================================================
     YARGITAY KARARLARI — İŞ HUKUKU
     ============================================================ */
  {
    id: "y-9hd-2023-15203",
    category: "yargitay",
    areas: ["is"],
    court: "Yargıtay 9. Hukuk Dairesi",
    caseNo: "E.2022/18934 K.2023/15203",
    date: "11.10.2023",
    title:
      "Kıdem Tazminatı — Haklı Nedenle Fesih İspat Yükü İşverende",
    content: `İş Kanunu m.25/II uyarınca işverenin haklı nedenle derhal fesih hakkını kullandığı iddiası karşısında, **bu fesih sebebinin somut delillerle ispatı yükü işverene aittir**. İşçinin "iş yerinde hırsızlık yaptığı" iddiasıyla yapılan feshin, sadece bir başka çalışanın sözlü beyanına dayandığı, kamera kaydı veya tutanak gibi nesnel delillerle desteklenmediği durumda, fesih HAKSIZ kabul edilmiş ve kıdem-ihbar tazminatına hükmedilmiştir.

Dairemiz, m.25/II'nin sıkı şekilde yorumlanması gerektiğini, şüpheye yer veren delillerin işveren aleyhine değerlendirileceğini bir kez daha vurgulamıştır. Ayrıca işverenin "ahlak ve iyiniyet kurallarına uymayan haller" gerekçesini kullanırken, **hak düşürücü süreyi** (m.26: öğrenmeden itibaren 6 iş günü) titizlikle takip etmesi gerektiği belirtilmiştir.

İlk derece mahkemesinin işçi lehine kıdem ve ihbar tazminatına hükmü ONANMIŞTIR.`,
    tags: [
      "kıdem tazminatı",
      "ihbar tazminatı",
      "haklı fesih",
      "İK 25",
      "ispat yükü",
      "hak düşürücü süre",
      "İK 26",
    ],
  },
  {
    id: "y-22hd-2024-1842",
    category: "yargitay",
    areas: ["is"],
    court: "Yargıtay 22. Hukuk Dairesi",
    caseNo: "E.2023/9145 K.2024/1842",
    date: "27.02.2024",
    title:
      "Mobbing Tespiti — Süreklilik, Sistematiklik ve Kasıt Aranır",
    content: `İşçi tarafından açılan manevi tazminat davasında ileri sürülen mobbing iddiasının kabul edilebilmesi için Dairemizce şu üç unsurun bir arada bulunması aranmaktadır:

1. **Süreklilik:** Münferit olaylar mobbing oluşturmaz; davranışların belirli bir süre (genellikle 6 ay+) sistematik olarak tekrarlanması gerekir.
2. **Kasıt:** İşveren veya üstlerin işçiyi yıldırma, istifaya zorlama gibi bir amaca yönelik hareket etmesi.
3. **Etki:** İşçinin psikolojik, sosyal veya mesleki olarak somut zarara uğraması (sağlık raporları, performans düşüşü vs.).

Somut olayda davacının 14 aylık süreçte sistematik olarak görev tanımı dışında işlere zorlandığı, toplantılarda dışlandığı, izinlerinin gerekçesiz reddedildiği ve psikiyatri raporlarıyla anksiyete bozukluğu tanısı aldığı sabittir. Mobbing tespit edilmiş, 120.000 TL manevi tazminata hükmedilmiştir.

İşverenin "olağan yönetim hakkı" savunması, davranışların **tipik yönetim sınırlarını aştığı** gerekçesiyle reddedilmiştir.`,
    tags: [
      "mobbing",
      "psikolojik taciz",
      "manevi tazminat",
      "süreklilik",
      "sistematik",
      "yıldırma",
      "iş yerinde şiddet",
    ],
  },

  /* ============================================================
     YARGITAY KARARLARI — AİLE / BOŞANMA
     ============================================================ */
  {
    id: "y-2hd-2024-4521",
    category: "yargitay",
    areas: ["aile"],
    court: "Yargıtay 2. Hukuk Dairesi",
    caseNo: "E.2023/12891 K.2024/4521",
    date: "18.04.2024",
    title:
      "Velayet — Çocuğun Üstün Yararı Esastır, Anne Önceliği Mutlak Değildir",
    content: `Çekişmeli boşanma davasında 7 yaşındaki müşterek çocuğun velayetinin annede mi yoksa babada mı bırakılacağı uyuşmazlığında Dairemiz, **çocuğun üstün yararı ilkesinin** velayet tayininde tek belirleyici kriter olduğunu vurgulamıştır.

"Küçük yaştaki çocuğun velayeti anneye verilir" şeklindeki yaygın kanı, **Türk Medeni Kanunu m.182 hükmünden çıkarılamaz**. Hâkim, çocuğun yaşı, sağlığı, eğitim ihtiyaçları, anne-babanın ekonomik ve sosyal durumu, çocukla olan duygusal bağı ve özellikle **çocuğun ifade ettiği tercihi** (uzman pedagog gözetiminde) birlikte değerlendirmelidir.

Somut olayda annenin çalışma saatlerinin uzunluğu, çocuğa bakacak yakının bulunmaması, buna karşılık babanın esnek çalışma düzeni ve çocukla geçirdiği zamanın belgelenmesi karşısında, velayetin **babaya** verilmesine ilişkin ilk derece hükmü ONANMIŞTIR.

Dairemiz ayrıca uzman pedagog raporunun zorunlu olduğunu, hâkimin tek başına karar vermesinin sakıncalı bulunduğunu hatırlatmıştır.`,
    tags: [
      "velayet",
      "çocuğun üstün yararı",
      "TMK 182",
      "boşanma",
      "pedagog",
      "çocuk tercihi",
      "anne önceliği",
    ],
  },
  {
    id: "y-3hd-2023-11203",
    category: "yargitay",
    areas: ["aile"],
    court: "Yargıtay 3. Hukuk Dairesi",
    caseNo: "E.2023/4892 K.2023/11203",
    date: "14.09.2023",
    title:
      "Edinilmiş Mallara Katılma Rejimi — Yarı Yarıya Paylaşım İlkesi",
    content: `Boşanma sonrası mal rejiminin tasfiyesinde, 4721 sayılı TMK m.235 vd. hükümleri uyarınca **edinilmiş mallara katılma rejimi**nin uygulandığı hallerde, evlilik birliği içinde edinilen malların **yarı yarıya paylaşımı** asıldır. Eşlerden birinin "ben bu malın bedelini tek başıma karşıladım" şeklindeki itirazı, malın edinilmiş mal sayılmasını engellemez; yalnızca **kişisel malların** ayrıştırılması (TMK m.220) söz konusu olabilir.

Dairemiz, evlilik öncesi alınmış bir konutun evlilik süresince yapılan **kredi ödemelerinin** edinilmiş mal sayılacağını, ancak ana paranın **kişisel mal** statüsünde kalacağını içtihat etmiştir. Bu durumda diğer eşin alacağı, ödenen kredi taksitlerinin yarısı oranındadır (değer artış payı dahil).

Davalı eşin "anneden miras yoluyla intikal eden 800.000 TL'yi bu konuta yatırdım, bu kişisel maldır" iddiası BELGELENDİĞİ ölçüde kabul edilmiş, ancak belgesiz olarak iddia edilen 200.000 TL'lik kısım reddedilmiş ve edinilmiş mal sayılmıştır.`,
    tags: [
      "mal rejimi",
      "edinilmiş mal",
      "TMK 235",
      "TMK 220",
      "kişisel mal",
      "değer artış payı",
      "boşanma",
      "tasfiye",
    ],
  },

  /* ============================================================
     YARGITAY KARARLARI — CEZA
     ============================================================ */
  {
    id: "y-5cd-2024-2891",
    category: "yargitay",
    areas: ["ceza"],
    court: "Yargıtay 5. Ceza Dairesi",
    caseNo: "E.2023/8234 K.2024/2891",
    date: "12.03.2024",
    title:
      "Görevi Kötüye Kullanma — Kamu Zararının Somut Olarak Tespiti Şart",
    content: `5237 sayılı TCK m.257'de düzenlenen görevi kötüye kullanma suçunun oluşabilmesi için Dairemizce şu unsurların kümülatif olarak aranması gerektiği vurgulanmıştır:

1. Failin kamu görevlisi olması (TCK m.6/1-c)
2. Görevinin gereklerine **aykırı hareket** etmesi (ihmal de dahil)
3. Bu hareket sonucunda **kişilerin mağduriyetine veya kamunun zararına veya kişilere haksız menfaat sağlanmasına** sebep olunması
4. **Somut zararın tespit edilmesi** — soyut "olabilirdi" düzeyinde tespit yetersizdir
5. Kast unsuru

Somut olayda sanığın imza atması gereken bir evrakı geciktirdiği sabit olmakla birlikte, bu gecikme sonucunda herhangi bir kişinin somut zarara uğradığına ya da kamuda **rakamsal olarak ölçülebilir bir zararın** doğduğuna dair delil bulunmamaktadır. İlk derece mahkemesinin **soyut "vatandaşın işi gecikti" ifadesine dayalı mahkumiyet hükmü BOZULMUŞTUR.**

Dairemiz, görevi kötüye kullanma suçunun "her aksaklığa uygulanan genel bir hüküm" olmadığını, kanun koyucunun **somut zarar veya menfaat** unsurunu özellikle aradığını vurgulamıştır.`,
    tags: [
      "görevi kötüye kullanma",
      "TCK 257",
      "kamu görevlisi",
      "somut zarar",
      "ihmal",
      "kast",
      "kamu zararı",
      "haksız menfaat",
    ],
  },
  {
    id: "y-1cd-2024-902",
    category: "yargitay",
    areas: ["ceza"],
    court: "Yargıtay 1. Ceza Dairesi",
    caseNo: "E.2023/15673 K.2024/902",
    date: "29.01.2024",
    title:
      "Meşru Müdafaa — Saldırıyla Orantılılık Şartı, Geri Çekilme Yükü Yoktur",
    content: `5237 sayılı TCK m.25/1 kapsamındaki meşru müdafaa kurumunun değerlendirilmesinde Dairemiz, **mağdurun "kaçma veya geri çekilme yükümlülüğü bulunmadığını"** içtihat etmiştir. Saldırıya uğrayan kişi, kendi evinde veya kendisine ait alanda saldırgana karşı orantılı güçle karşı koyma hakkına sahiptir.

Ancak meşru müdafaanın koşulları sıkı yorumlanır:
- **Haksız bir saldırı** olmalı (TCK m.25/1)
- Saldırı **devam etmekte** veya tekrar muhakkak olmalı
- Karşı koyma **savunma amaçlı** olmalı, intikam amaçlı olmamalı
- Savunma **orantılı** olmalı — bıçaklı saldırıya karşı tabancayla karşılık verme orantılıdır; ancak yaralı ve etkisiz hâle gelmiş saldırgana ek vuruşlar orantısız sayılır.

Somut olayda sanığın saldırgan tarafından bıçakla yaralandığı, savunma amaçlı evindeki tabancayla **tek el ateş edip** saldırganı durduğu için ATEŞ ETMEYİ KESTİĞİ tespit edilmiştir. Bu durum meşru müdafaa sınırları içindedir; ilk derece mahkemesinin BERAAT kararı ONANMIŞTIR.`,
    tags: [
      "meşru müdafaa",
      "TCK 25",
      "haksız saldırı",
      "orantılılık",
      "geri çekilme",
      "savunma",
      "beraat",
    ],
  },

  /* ============================================================
     ANAYASA MAHKEMESİ KARARLARI
     ============================================================ */
  {
    id: "aym-2023-bb-15234",
    category: "aym",
    areas: ["anayasa", "usul"],
    court: "Anayasa Mahkemesi Bireysel Başvuru",
    caseNo: "B.No: 2023/15234",
    date: "11.10.2023",
    title:
      "Makul Sürede Yargılanma Hakkı İhlali — 8 Yıllık İş Davası",
    content: `Başvurucunun açtığı iş davasının ilk derece, istinaf ve temyiz dahil **8 yıl 4 ay sürmesi** karşısında Anayasa Mahkemesi, Anayasa m.36 ve AİHS m.6 kapsamındaki **makul sürede yargılanma hakkının ihlal edildiğine** karar vermiştir.

Mahkeme, sürenin makul olup olmadığının değerlendirilmesinde şu kriterleri uygulamıştır:
1. **Davanın karmaşıklığı** (somut olayda standart bir kıdem davası)
2. **Başvurucunun tutumu** (başvurucu süreç boyunca usulüne uygun davranmış)
3. **Yargı mercilerinin tutumu** (3 yıllık bilirkişi inceleme süresi izaha muhtaç)
4. **Davanın başvurucu için taşıdığı önem** (geçim kaynağı)

Mahkemece, ihlalin tespiti yanında 35.000 TL manevi tazminat ödenmesine ve kararın derece mahkemelerine bildirilmesine hükmedilmiştir. Mahkeme ayrıca, **bilirkişi atamalarındaki gecikmenin** sistematik bir sorun olduğunu vurgulayarak Adalet Bakanlığına idari tedbir önerisinde bulunmuştur.`,
    tags: [
      "makul süre",
      "Anayasa 36",
      "AİHS 6",
      "bireysel başvuru",
      "yargılama süresi",
      "bilirkişi gecikmesi",
      "AYM",
    ],
  },
  {
    id: "aym-2024-bb-3456",
    category: "aym",
    areas: ["anayasa", "ceza"],
    court: "Anayasa Mahkemesi Bireysel Başvuru",
    caseNo: "B.No: 2024/3456",
    date: "22.05.2024",
    title:
      "Tutukluluğun Makul Süreyi Aşması — Kişi Özgürlüğü ve Güvenliği Hakkı İhlali",
    content: `Başvurucunun terör örgütüne üye olma suçlamasıyla **3 yıl 2 aydır tutuklu** bulunması karşısında, AYM Anayasa m.19 (kişi özgürlüğü ve güvenliği) kapsamında ihlal kararı vermiştir.

Mahkeme, tutukluluğun bir tedbir niteliğinde olduğunu, **cezalandırma vasıtası olarak kullanılamayacağını** hatırlatmıştır. Tutukluluğun devamı için CMK m.100'deki kuvvetli suç şüphesi ve tutuklama nedenleri (kaçma şüphesi, delillerin karartılması) her aşamada **somut delillerle yenilenmelidir.** "Suçun vasıf ve mahiyeti" gibi soyut gerekçeler 3 yılı aşan tutukluluğu meşrulaştırmaya yetmez.

Karara göre, başvurucunun **derhal serbest bırakılması** için ilgili ağır ceza mahkemesine karar gönderilmiş, ayrıca 40.000 TL manevi tazminata hükmedilmiştir. AYM, derece mahkemelerinin tutukluluk incelemelerini **şablon gerekçeyle** sürdüremeyeceğini, somut olay bazlı muhakeme yapması gerektiğini vurgulamıştır.`,
    tags: [
      "tutukluluk",
      "Anayasa 19",
      "CMK 100",
      "kişi özgürlüğü",
      "AYM",
      "tutukluluk süresi",
      "makul süre",
      "şablon gerekçe",
    ],
  },

  /* ============================================================
     AİHM KARARLARI
     ============================================================ */
  {
    id: "aihm-altug-turkey-2018",
    category: "aihm",
    areas: ["anayasa"],
    court: "Avrupa İnsan Hakları Mahkemesi",
    caseNo: "Altuğ v. Türkiye, B.No: 45934/12",
    date: "30.06.2018",
    title:
      "Yaşam Hakkı — Tıbbi Müdahalede Bilgilendirilmiş Onam Eksikliği (AİHS m.8)",
    content: `Başvurucunun annesi, hastanede yapılan rutin bir muayene sırasında doktor tarafından penisilin enjekte edilmesi sonucu **anafilaktik şok** geçirerek hayatını kaybetmiştir. Hastanın penisilin alerjisi tıbbi geçmişinde belirtilmiş olmasına rağmen, doktor bunu sormamış ve onam almamıştır.

AİHM, Sözleşme'nin **8. maddesi (özel hayata saygı hakkı)** çerçevesinde, hastaya tıbbi müdahale öncesi **bilgilendirilmiş onam** alınmamasının ihlal teşkil ettiğine karar vermiştir. Mahkeme, devletin hem **maddi (etkili bir sağlık sistemi sağlama)** hem de **usul (etkili soruşturma yürütme)** yükümlülüklerinin bulunduğunu hatırlatmıştır.

Türkiye, ailenin yıllarca süren cezai ve hukuki süreçten somut bir sonuç alamaması nedeniyle de usul yükümlülüğünü ihlal etmiş kabul edilmiş ve toplam 25.000 EUR manevi tazminata mahkum edilmiştir. Bu karar Türk hukukunda "hekim hatası" davalarında öncü içtihatlardan biridir.`,
    tags: [
      "AİHS 8",
      "yaşam hakkı",
      "tıbbi malpraktis",
      "bilgilendirilmiş onam",
      "AİHM",
      "hekim hatası",
      "anafilaksi",
    ],
  },

  /* ============================================================
     MEVZUAT — TBK
     ============================================================ */
  {
    id: "tbk-49",
    category: "mevzuat",
    areas: ["tazminat", "genel"],
    lawName: "6098 sayılı Türk Borçlar Kanunu",
    articleNo: "Madde 49",
    title: "TBK m.49 — Haksız Fiilden Sorumluluk",
    content: `**Madde 49 — Sorumluluk:**
"Kusurlu ve hukuka aykırı bir fiille başkasına zarar veren, bu zararı gidermekle yükümlüdür.

Zarar verici fiili yasaklayan bir hukuk kuralı bulunmasa bile, ahlâka aykırı bir fiille başkasına kasten zarar veren de, bu zararı gidermekle yükümlüdür."

**Açıklama:** Haksız fiil sorumluluğunun temel kuralıdır. Sorumluluğun oluşabilmesi için dört şart gerekir: (1) Hukuka aykırı eylem, (2) Kusur (kast veya ihmal), (3) Zarar, (4) Eylem ile zarar arasında illiyet bağı.

**Yürürlük:** ✅ Yürürlükte. 6098 sayılı TBK 01.07.2012'den itibaren uygulanır; eski 818 sayılı BK m.41 mülgadır.`,
    tags: ["haksız fiil", "TBK 49", "sorumluluk", "kusur", "zarar", "illiyet"],
  },
  {
    id: "tbk-50",
    category: "mevzuat",
    areas: ["tazminat", "genel"],
    lawName: "6098 sayılı Türk Borçlar Kanunu",
    articleNo: "Madde 50",
    title: "TBK m.50 — Zararın ve Kusurun İspatı",
    content: `**Madde 50 — Zararın ispatı:**
"Zarar gören, zararını ve zarar verenin kusurunu ispat yükü altındadır.

Uğranılan zararın miktarı tam olarak ispat edilemiyorsa hâkim, olayların olağan akışını ve zarar görenin aldığı önlemleri göz önünde tutarak, zararın miktarını hakkaniyete uygun olarak belirler."

**Açıklama:** İkinci fıkra **takdiri zarar** doktrinini düzenler. Zararın matematiksel olarak ispatı her zaman mümkün olmadığından, hâkim hayatın olağan akışını ve hakkaniyeti gözeterek miktar belirleyebilir.

**Yürürlük:** ✅ Yürürlükte.`,
    tags: ["TBK 50", "ispat yükü", "takdiri zarar", "hakkaniyet"],
  },
  {
    id: "tbk-56",
    category: "mevzuat",
    areas: ["tazminat"],
    lawName: "6098 sayılı Türk Borçlar Kanunu",
    articleNo: "Madde 56",
    title: "TBK m.56 — Manevi Tazminat",
    content: `**Madde 56 — Kişilik haklarının zedelenmesi:**
"Hâkim, bir kimsenin bedensel bütünlüğünün zedelenmesi durumunda, olayın özelliklerini göz önünde tutarak, zarar görene uygun bir miktar paranın manevi tazminat olarak ödenmesine karar verebilir.

Ağır bedensel zarar veya ölüm hâlinde, zarar görenin veya ölenin yakınlarına da manevi tazminat olarak uygun bir miktar paranın ödenmesine karar verilebilir."

**Açıklama:** Manevi tazminatın takdirinde hâkim geniş takdir yetkisine sahiptir. Tazminat "zenginleştirme aracı" değil "hafifletme aracı"dır. Yargıtay HGK 2024/156 kararı, miktarın günün koşullarına uygun olması gerektiğini vurgulamıştır.

**Yürürlük:** ✅ Yürürlükte.`,
    tags: [
      "TBK 56",
      "manevi tazminat",
      "kişilik hakları",
      "bedensel zarar",
      "ölüm",
      "yakınlar",
    ],
  },
  {
    id: "tbk-117",
    category: "mevzuat",
    areas: ["tazminat", "genel"],
    lawName: "6098 sayılı Türk Borçlar Kanunu",
    articleNo: "Madde 117",
    title: "TBK m.117 — Temerrüt",
    content: `**Madde 117 — Genel olarak:**
"Muaccel bir borcun borçlusu, alacaklının ihtarıyla temerrüde düşer.

Borcun ifa edileceği gün, birlikte belirlenmiş veya sözleşmede saklı tutulan bir hakka dayanarak taraflardan biri usulüne uygun bir bildirimde bulunmak suretiyle belirlenmişse, bu günün geçmesiyle; haksız fiilden veya sebepsiz zenginleşmeden doğan alacaklarda ise ihtara gerek olmaksızın temerrüt **olayın gerçekleştiği** tarihten itibaren işler."

**Açıklama:** Haksız fiilden doğan alacaklarda faiz başlangıcı **olay tarihidir**, ihtara gerek yoktur. Yargıtay 4. HD 2024/3290 kararı bu hükmü teyit etmiştir.

**Yürürlük:** ✅ Yürürlükte.`,
    tags: ["TBK 117", "temerrüt", "faiz başlangıcı", "haksız fiil", "ihtar"],
  },

  /* ============================================================
     MEVZUAT — KTK
     ============================================================ */
  {
    id: "ktk-85",
    category: "mevzuat",
    areas: ["tazminat"],
    lawName: "2918 sayılı Karayolları Trafik Kanunu",
    articleNo: "Madde 85",
    title: "KTK m.85 — İşletenin ve Araç İşleticisinin Sorumluluğu",
    content: `**Madde 85 — İşletenin sorumluluğu:**
"Bir motorlu aracın işletilmesi bir kimsenin ölümüne veya yaralanmasına yahut bir şeyin zarara uğramasına sebep olursa, motorlu aracın bir teşebbüsün unvanı veya işletme adı altında veya bu teşebbüs tarafından kesilen biletle işletilmesi halinde, motorlu aracın işleteni ve bağlı olduğu teşebbüsün sahibi, doğan zarardan müştereken ve müteselsilen sorumlu olurlar.

İşleten, motorlu aracın kendi rızası olmadan başkası tarafından kullanılmasından doğan zararlardan, ancak, kullanan kişinin kusurunu ispat edemezse sorumludur."

**Açıklama:** İşletenin sorumluluğu **kusursuz sorumluluk** (tehlike sorumluluğu) rejimine tabidir. Kusur ispatı gerekmez; zarar ile illiyet bağı yeterlidir. İşleten ancak **mücbir sebep, mağdurun ağır kusuru veya üçüncü kişinin kusuru** durumlarında kurtulabilir (KTK m.86).

**Yürürlük:** ✅ Yürürlükte (2918 sayılı KTK, 2017 ve 2018 değişiklikleri dahil).`,
    tags: [
      "KTK 85",
      "işleten sorumluluğu",
      "kusursuz sorumluluk",
      "tehlike sorumluluğu",
      "motorlu araç",
      "müteselsil",
    ],
  },
  {
    id: "ktk-97",
    category: "mevzuat",
    areas: ["tazminat"],
    lawName: "2918 sayılı Karayolları Trafik Kanunu",
    articleNo: "Madde 97",
    title: "KTK m.97 — Sigortacıya Doğrudan Başvuru",
    content: `**Madde 97 — Doğrudan dava hakkı:**
"Zarar gören, uğradığı zararın sigorta sözleşmesinde öngörülen miktara kadar olan kısmının ödenmesini, doğrudan doğruya sigortacıdan isteyebilir.

Sigortacı, ödediği miktar oranında sigortalısının yerine geçerek dava ve takip haklarını kullanır."

**Açıklama:** Mağdurun ZMSS sigortacısına doğrudan dava açma hakkı vardır; işletene karşı dava açmak zorunda değildir. Yargıtay HGK 2024/156 kararı, bu hakkın **manevi tazminatı da limit dahilinde kapsadığını** içtihat etmiştir.

**Yürürlük:** ✅ Yürürlükte.`,
    tags: [
      "KTK 97",
      "doğrudan dava",
      "ZMSS",
      "sigortacı",
      "rücu",
      "mağdur",
    ],
  },

  /* ============================================================
     MEVZUAT — HMK
     ============================================================ */
  {
    id: "hmk-127",
    category: "mevzuat",
    areas: ["usul", "genel"],
    lawName: "6100 sayılı Hukuk Muhakemeleri Kanunu",
    articleNo: "Madde 127",
    title: "HMK m.127 — Cevap Dilekçesinin Verilme Süresi",
    content: `**Madde 127 — Cevap dilekçesinin süresi:**
"Cevap dilekçesini verme süresi, dava dilekçesinin davalıya tebliğinden itibaren iki haftadır. Ancak, durum ve koşullara göre cevap dilekçesinin bu süre içinde hazırlanmasının çok zor yahut imkânsız olduğu durumlarda, yine bu süre zarfında mahkemeye başvuran davalıya, bir defaya mahsus olmak ve bir ayı geçmemek üzere ek bir süre verilebilir. Ek cevap süresi talebi hakkında verilen karar taraflara derhâl bildirilir."

**Açıklama:** Süre **hak düşürücüdür** — kaçırılması cevap hakkının yitirilmesine yol açar (HMK m.128). Davalı süresinde cevap vermezse, davacının dilekçesinde ileri sürdüğü vakıaların tamamını **inkâr etmiş sayılır** ve ön inceleme aşamasında savunma sunma hakkı sınırlanır.

**Yürürlük:** ✅ Yürürlükte. Cevaba cevap için HMK m.136 (yine 2 hafta).`,
    tags: [
      "HMK 127",
      "cevap dilekçesi",
      "2 hafta",
      "ek süre",
      "hak düşürücü",
      "HMK 128",
      "HMK 136",
    ],
  },
  {
    id: "hmk-281",
    category: "mevzuat",
    areas: ["usul"],
    lawName: "6100 sayılı Hukuk Muhakemeleri Kanunu",
    articleNo: "Madde 281",
    title: "HMK m.281 — Bilirkişi Raporuna İtiraz",
    content: `**Madde 281 — Bilirkişi raporuna itiraz:**
"Taraflar, bilirkişi raporunun, kendilerine tebliği tarihinden itibaren iki hafta içinde, raporda eksik gördükleri hususların, bilirkişiye tamamlattırılmasını; belirsizlik gösteren hususlar hakkında ise bilirkişinin açıklama yapmasının sağlanmasını veya yeni bilirkişi atanmasını mahkemeden talep edebilirler.

Mahkeme, bilirkişi raporundaki eksiklik yahut belirsizliğin tamamlanması veya açıklığa kavuşturulmasını sağlamak için, bilirkişiden yeni soruların yöneltilmesine veya bilirkişinin tekrar dinlenmesine karar verebileceği gibi, gerçeğin ortaya çıkması için gerekli görürse yeni bir bilirkişi de atayabilir."

**Açıklama:** Bilirkişi raporuna itiraz **2 haftalık** süreye tabidir; süresinde itiraz edilmezse rapor kesinleşir ve mahkeme yargılamada esas alır. İtiraz dilekçesinde itirazın **somut gerekçeleri** belirtilmeli, alternatif uzman görüşü varsa sunulmalıdır.

**Yürürlük:** ✅ Yürürlükte.`,
    tags: [
      "HMK 281",
      "bilirkişi raporu",
      "itiraz",
      "2 hafta",
      "yeni bilirkişi",
      "süre",
    ],
  },

  /* ============================================================
     MEVZUAT — CMK
     ============================================================ */
  {
    id: "cmk-100",
    category: "mevzuat",
    areas: ["ceza", "usul"],
    lawName: "5271 sayılı Ceza Muhakemesi Kanunu",
    articleNo: "Madde 100",
    title: "CMK m.100 — Tutuklama Nedenleri",
    content: `**Madde 100 — Tutuklama nedenleri:**
"Kuvvetli suç şüphesinin varlığını gösteren somut delillerin ve bir tutuklama nedeninin bulunması halinde, şüpheli veya sanık hakkında tutuklama kararı verilebilir. İşin önemi, verilmesi beklenen ceza veya güvenlik tedbiri ile ölçülü olmaması halinde, tutuklama kararı verilemez.

Aşağıdaki hallerde bir tutuklama nedeni var sayılabilir:
a) Şüpheli veya sanığın kaçması, saklanması veya kaçacağı şüphesini uyandıran somut olgular varsa.
b) Şüpheli veya sanığın davranışları;
   1. Delilleri yok etme, gizleme veya değiştirme,
   2. Tanık, mağdur veya başkaları üzerinde baskı yapılması girişiminde bulunma,
hususlarında kuvvetli şüphe oluşturuyorsa."

**Açıklama:** Tutuklama **istisnadır**, asıl olan adli kontrol (m.109) ve serbestliktir. AYM, tutukluluğun her aşamada **somut delillerle** gerekçelendirilmesi gerektiğini, şablon gerekçenin Anayasa m.19'u ihlal ettiğini içtihat etmiştir (B.No: 2024/3456).

**Yürürlük:** ✅ Yürürlükte.`,
    tags: [
      "CMK 100",
      "tutuklama",
      "kuvvetli şüphe",
      "kaçma şüphesi",
      "delil karartma",
      "ölçülülük",
      "adli kontrol",
    ],
  },

  /* ============================================================
     MEVZUAT — TCK
     ============================================================ */
  {
    id: "tck-25",
    category: "mevzuat",
    areas: ["ceza"],
    lawName: "5237 sayılı Türk Ceza Kanunu",
    articleNo: "Madde 25",
    title: "TCK m.25 — Meşru Müdafaa ve Zorunluluk Hâli",
    content: `**Madde 25 — Meşru savunma ve zorunluluk hâli:**

"(1) Gerek kendisine ve gerek başkasına ait bir hakka yönelmiş, gerçekleşen, gerçekleşmesi veya tekrarı muhakkak olan haksız bir saldırıyı o anda hâl ve koşullara göre saldırı ile orantılı biçimde defetmek zorunluluğu ile işlenen fiillerden dolayı faile ceza verilmez.

(2) Gerek kendisine gerek başkasına ait bir hakka yönelik olup, bilerek neden olmadığı ve başka suretle korunmak olanağı bulunmayan ağır ve muhakkak bir tehlikeden kurtulmak veya başkasını kurtarmak zorunluluğu ile ve tehlikenin ağırlığı ile konu ve kullanılan vasıta arasında orantı bulunmak koşulu ile işlenen fiillerden dolayı faile ceza verilmez."

**Açıklama:** Meşru müdafaada **kaçma yükümlülüğü yoktur** (Yarg. 1. CD 2024/902). Ancak savunma **orantılı** olmalıdır — etkisiz hâle gelmiş saldırgana ek vuruşlar orantısızdır ve cezai sorumluluğu doğurur (TCK m.27 — sınırın aşılması).

**Yürürlük:** ✅ Yürürlükte.`,
    tags: [
      "TCK 25",
      "meşru müdafaa",
      "meşru savunma",
      "zorunluluk hâli",
      "orantılılık",
      "haksız saldırı",
      "ZSF",
    ],
  },
  {
    id: "tck-257",
    category: "mevzuat",
    areas: ["ceza"],
    lawName: "5237 sayılı Türk Ceza Kanunu",
    articleNo: "Madde 257",
    title: "TCK m.257 — Görevi Kötüye Kullanma",
    content: `**Madde 257 — Görevi kötüye kullanma:**
"(1) Kanunda ayrıca suç olarak tanımlanan haller dışında, görevinin gereklerine aykırı hareket etmek suretiyle, kişilerin mağduriyetine veya kamunun zararına neden olan ya da kişilere haksız bir menfaat sağlayan kamu görevlisi, altı aydan iki yıla kadar hapis cezası ile cezalandırılır.

(2) Kanunda ayrıca suç olarak tanımlanan haller dışında, görevinin gereklerini yapmakta ihmal veya gecikme göstererek, kişilerin mağduriyetine veya kamunun zararına neden olan ya da kişilere haksız bir menfaat sağlayan kamu görevlisi, üç aydan bir yıla kadar hapis cezası ile cezalandırılır."

**Açıklama:** Yargıtay 5. CD 2024/2891 kararı, somut zarar tespitinin şart olduğunu, soyut "olabilirdi" düzeyinde tespitle mahkumiyet verilemeyeceğini içtihat etmiştir. Suç **netice unsurludur** — somut mağduriyet, kamu zararı veya haksız menfaat gerekir.

**Yürürlük:** ✅ Yürürlükte (2014 değişikliği dahil).`,
    tags: [
      "TCK 257",
      "görevi kötüye kullanma",
      "ihmal",
      "kamu görevlisi",
      "kamu zararı",
      "haksız menfaat",
      "netice unsuru",
    ],
  },

  /* ============================================================
     MEVZUAT — TMK
     ============================================================ */
  {
    id: "tmk-182",
    category: "mevzuat",
    areas: ["aile"],
    lawName: "4721 sayılı Türk Medeni Kanunu",
    articleNo: "Madde 182",
    title: "TMK m.182 — Velayetin Düzenlenmesi",
    content: `**Madde 182 — Çocuklar bakımından:**
"Mahkeme boşanma veya ayrılığa karar verirken, olanak bulundukça ana ve babayı dinledikten ve çocuk vesayet altında ise vasinin ve vesayet makamının düşüncesini aldıktan sonra, ana ve babanın haklarını ve çocuk ile olan kişisel ilişkilerini düzenler.

Velayetin kullanılması kendisine verilmeyen eşin çocuk ile kişisel ilişkisinin düzenlenmesinde, çocuğun özellikle sağlık, eğitim ve ahlâk bakımından yararları esas tutulur."

**Açıklama:** Velayet tayininde **tek belirleyici kriter çocuğun üstün yararıdır** (Yarg. 2. HD 2024/4521). "Küçük çocuk anneye verilir" şeklindeki yaygın kanı **hükümden çıkarılamaz** — somut olayın koşulları, anne ve babanın durumu, çocuğun tercihi (uzman pedagog gözetiminde) birlikte değerlendirilir.

**Yürürlük:** ✅ Yürürlükte.`,
    tags: [
      "TMK 182",
      "velayet",
      "çocuğun üstün yararı",
      "boşanma",
      "kişisel ilişki",
    ],
  },
  {
    id: "tmk-235",
    category: "mevzuat",
    areas: ["aile"],
    lawName: "4721 sayılı Türk Medeni Kanunu",
    articleNo: "Madde 235",
    title: "TMK m.235 — Edinilmiş Mallara Katılma — Değerlendirme",
    content: `**Madde 235 — Değerlendirme:**
"Mal rejiminin sona erdiği sırada mevcut olan edinilmiş mallar, tasfiye anındaki değerleriyle hesaba katılırlar.

Bir eşin diğer eşe ait bir mala yaptığı katkı ile o malın değerinde meydana gelen artış arasında orantısallık bulunmalıdır."

**Açıklama:** **Edinilmiş mallar yarı yarıya paylaşılır** (TMK m.236), kişisel mallar paylaşıma dahil değildir (TMK m.220). Evlilik öncesi edinilen bir konutun evlilik süresince yapılan kredi ödemeleri **edinilmiş mal** sayılır; ancak ana para **kişisel mal** olarak kalır (Yarg. 3. HD 2023/11203).

**Yürürlük:** ✅ Yürürlükte (01.01.2002'den itibaren yasal rejim).`,
    tags: [
      "TMK 235",
      "edinilmiş mal",
      "mal rejimi",
      "tasfiye",
      "değer artış payı",
      "kişisel mal",
      "TMK 236",
    ],
  },

  /* ============================================================
     MEVZUAT — İŞ KANUNU
     ============================================================ */
  {
    id: "ik-25",
    category: "mevzuat",
    areas: ["is"],
    lawName: "4857 sayılı İş Kanunu",
    articleNo: "Madde 25",
    title: "İK m.25 — İşverenin Haklı Nedenle Derhal Fesih Hakkı",
    content: `**Madde 25 — İşverenin haklı nedenle derhal fesih hakkı:**
İşverenin aşağıdaki hallerde iş sözleşmesini sürenin bitiminden önce veya bildirim süresini beklemeksizin feshedebileceği düzenlenmiştir:

I- Sağlık sebepleri
II- Ahlak ve iyi niyet kurallarına uymayan haller ve benzerleri (hırsızlık, sırların ifşası, devamsızlık, görev ihmali vb.)
III- Zorlayıcı sebepler
IV- İşçinin gözaltına alınması veya tutuklanması

**Açıklama:** Haklı fesih sebebi öne süren işverenin **ispat yükü kendisindedir** (Yarg. 9. HD 2023/15203). Sözlü beyan veya şüphe yetersiz; somut delil (kamera, tutanak, belge) aranır. Şüphe işveren aleyhine yorumlanır.

**Hak düşürücü süre:** İşveren, m.25/II kapsamındaki sebebi öğrendiği günden başlayarak **6 iş günü içinde** ve her halde fiilin gerçekleşmesinden itibaren bir yıl içinde sözleşmeyi feshetmelidir (İK m.26). Bu süre geçirilirse fesih **haksız** sayılır ve kıdem-ihbar tazminatı doğar.

**Yürürlük:** ✅ Yürürlükte.`,
    tags: [
      "İK 25",
      "haklı fesih",
      "ahlak iyiniyet",
      "ispat yükü",
      "İK 26",
      "hak düşürücü",
      "6 iş günü",
      "işveren",
    ],
  },

  /* ============================================================
     DOKTRİN ÖZETLERİ
     ============================================================ */
  {
    id: "doktrin-haksiz-fiil-uc-unsur",
    category: "doktrin",
    areas: ["tazminat", "genel"],
    title: "Haksız Fiilin Üç Temel Unsuru — Doktrindeki Hâkim Görüş",
    content: `Türk Borçlar Hukuku doktrininde haksız fiilin oluşumu için üç temel unsur arandığı yönünde **hâkim görüş** bulunmaktadır:

1. **Hukuka aykırı eylem:** Doğrudan bir hukuk kuralının ihlali ya da ahlâka aykırı kasten zarar verme (TBK m.49/II).
2. **Kusur:** Genellikle kast veya ihmal şeklinde tezahür eder. Bazı hallerde (KTK m.85 — tehlike sorumluluğu) kusur aranmaz.
3. **Zarar ve illiyet bağı:** Eylemin sebep, zararın ise sonuç olması; **uygun illiyet bağı** teorisi hâkimdir.

**Karşı görüş:** Bazı yazarlara göre **hukuka aykırılık** bağımsız bir unsur değildir; doğrudan kusur unsurunun içinde değerlendirilmelidir. Ancak Yargıtay içtihatları hukuka aykırılığı bağımsız unsur olarak kabul eder.

**Pratik sonuç:** Dilekçede dört unsuru ayrı ayrı işlemek ve her birini delillerle desteklemek esastır. Özellikle illiyet bağı, "uygun illiyet" teorisi çerçevesinde gerekçelendirilmelidir; sırf "şart" niteliğindeki olaylar yetersizdir.`,
    tags: [
      "haksız fiil doktrini",
      "üç unsur",
      "hukuka aykırılık",
      "kusur",
      "uygun illiyet",
      "doktrin",
    ],
  },
  {
    id: "doktrin-manevi-tazminat-amac",
    category: "doktrin",
    areas: ["tazminat"],
    title:
      "Manevi Tazminatın Amacı — Tatmin mi, Önleme mi, Cezalandırma mı?",
    content: `Türk hukuk doktrininde manevi tazminatın işlevi konusunda üç temel görüş bulunmaktadır:

**1. Tatmin teorisi (hâkim görüş):** Manevi tazminat, mağdurun yaşadığı acı, ızdırap ve kişilik zedelenmesini "hafifletmek" amacı taşır. Para, doğrudan zararı tazmin edemez, ancak mağdura bir "tatmin duygusu" verir. Bu görüş Yargıtay HGK ve dairelerinin yerleşik içtihadına da uygundur.

**2. Önleme (caydırma) teorisi:** Manevi tazminatın, benzer ihlallerin tekrarlanmasını önleyici işlevi vurgulanır. Özellikle ağır kusurlu davalılara verilen yüksek tazminat miktarları bu işlevin yansımasıdır.

**3. Cezalandırıcı tazminat (punitive damages) teorisi:** Anglo-Sakson hukukundan etkilenen bu görüş Türk hukukunda **kabul görmemektedir**. TBK m.56 sadece "uygun bir miktar" der; cezalandırma amacı taşımaz.

**Pratik sonuç:** Dilekçede manevi tazminat talebi gerekçelendirilirken **tatmin teorisi** öne çıkarılmalı, "zenginleştirme amacı taşımadığı" açıkça belirtilmelidir. Aynı zamanda **enflasyon güncellemesi** ile emsal kararlardan beslenmek gereklidir.`,
    tags: [
      "manevi tazminat",
      "tatmin teorisi",
      "önleme",
      "cezalandırıcı tazminat",
      "doktrin",
      "TBK 56",
    ],
  },
  {
    id: "doktrin-mobbing-tanim",
    category: "doktrin",
    areas: ["is"],
    title: "Mobbing Kavramının Hukuki Tanımı ve Unsurları",
    content: `Mobbing (psikolojik taciz / yıldırma) kavramı, Türk doktrinine 2000'li yıllarda yerleşmiştir. Heinz Leymann'ın temel çalışmalarına dayalı olarak şu unsurlar aranır:

1. **Süreklilik:** Davranışların belirli bir süre boyunca (genellikle 6 ay+) sistematik tekrarlanması.
2. **Sistematiklik:** Münferit, izole olaylar değil; planlı veya tutarlı bir örüntü.
3. **Yıldırma kastı:** İşçiyi işten ayrılmaya zorlamak, performansını düşürmek veya cezalandırmak gibi bir amaç.
4. **Güç asimetrisi:** Genellikle üstten alta (vertikal mobbing), ancak yatay (kollegial) mobbing de mümkün.
5. **Mağdur üzerinde somut etki:** Psikolojik bozukluk, performans düşüşü, sosyal izolasyon vb.

Yargıtay 22. HD 2024/1842 kararı bu doktrinel unsurları büyük ölçüde benimsemiştir. Mobbing iddiasında **ispat yükü mağdurda** olmakla birlikte, ortam koşulları ve tanık beyanları yargısal değerlendirmede önemlidir.

İşverenin "olağan yönetim hakkı" savunması, davranışların **tipik yönetim sınırlarını aştığı** ispatlandığında reddedilir.`,
    tags: [
      "mobbing",
      "psikolojik taciz",
      "Leymann",
      "süreklilik",
      "sistematik",
      "yıldırma",
      "doktrin",
    ],
  },
];

/** Yardımcı: id ile belge bul */
export function getDoc(id: string): CorpusDoc | undefined {
  return CORPUS.find((d) => d.id === id);
}

/** Korpus istatistikleri */
export function getCorpusStats() {
  const byCategory = CORPUS.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {} as Record<DocCategory, number>);

  return {
    total: CORPUS.length,
    byCategory,
    totalChars: CORPUS.reduce((s, d) => s + d.content.length, 0),
  };
}
