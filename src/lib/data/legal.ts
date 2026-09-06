import type {
  Citation,
  Deadline,
  DocumentItem,
  Template,
  Scenario,
  RiskItem,
  AttackArgument,
} from "./types";

/* ============================================================
   EMSAL KARARLAR (Trafik Tazminat Davası)
   ============================================================ */
export const CITATIONS: Citation[] = [
  {
    court: "Yargıtay 17. HD",
    no: "2022/4521 K. — 2021/8932 E.",
    date: "14 Eylül 2022",
    title:
      "Trafik Kazasında %32 Sürekli İş Gücü Kaybı — 1.180.000 TL Tazminata Hükmedildi",
    snippet:
      "Davacının kaza neticesinde uğradığı %32 sürekli iş gücü kaybı sebebiyle, PMF 1931 yaşam tablosu uyarınca hesaplanan kazanç kaybı, tedavi giderleri ve manevi tazminat toplamı olarak 1.180.000 TL'ye hükmedilmiştir. Davalının emniyet kemeri kusur paylaşımı itirazı reddedilmiş; tam kusurlu davalının ikincil kusur ileri süremeyeceği belirtilmiştir...",
    relevance: 96,
  },
  {
    court: "Yargıtay HGK",
    no: "2024/156 K. — 2023/892 E.",
    date: "8 Şubat 2024",
    title:
      "Manevi Tazminatta Sigorta Şirketinin Doğrudan Sorumluluğu — Limit Dahilinde 250.000 TL Onandı",
    snippet:
      "Hukuk Genel Kurulu, ZMSS poliçesi kapsamında sigorta şirketinin manevi tazminattan da limit dahilinde doğrudan sorumlu olduğuna karar vermiştir. Yargılama tarihindeki ekonomik koşullar ve enflasyon dikkate alınarak manevi tazminat miktarının takdirinde mahkemenin geniş takdir yetkisi bulunduğu vurgulanmıştır...",
    relevance: 89,
  },
  {
    court: "Yargıtay 4. HD",
    no: "2024/8821 K. — 2024/2103 E.",
    date: "22 Mart 2024",
    title: "Trafik Kazasında Manevi Tazminat — 500.000 TL Tutarı Onandı",
    snippet:
      'Davacının kaza nedeniyle yaşadığı %38 maluliyet, 14 günlük yoğun bakım süreci ve psikolojik travma sonrası bozukluk tanısı dikkate alınarak ilk derece mahkemesinin 500.000 TL manevi tazminat hükmü onanmıştır. Yargıtay, "manevi tazminatın amacının zenginleştirme değil, yaşanan acı ve ızdırabın hafifletilmesi" olduğunu belirtmekle birlikte, miktarın günün koşullarına uygun olması gerektiğini vurgulamıştır...',
    relevance: 92,
  },
  {
    court: "Yargıtay 17. HD",
    no: "2023/12056 K. — 2023/4421 E.",
    date: "19 Ekim 2023",
    title:
      "Geçmiş Hastalık Maluliyet Hesabında Düşülmez — Kaza ile Ağırlaşma Esastır",
    snippet:
      "Davacının kaza öncesi mevcut bel fıtığı rahatsızlığının, kaza ile birlikte ağırlaştığı ATK raporu ile sabittir. Davalı tarafça öne sürülen 'geçmiş hastalığın maluliyetten düşülmesi' itirazı reddedilmiştir. Yargıtay, mevcut hastalığın kaza ile ağırlaşması durumunda, ağırlaşan kısmın değil, oluşan toplam maluliyetin esas alınacağını içtihat etmiştir...",
    relevance: 87,
  },
  {
    court: "Yargıtay 4. HD",
    no: "2024/3290 K. — 2023/9201 E.",
    date: "5 Şubat 2024",
    title:
      "Sürekli İş Gücü Kaybında Faiz Başlangıcı — İşletme Tarihinden İtibaren",
    snippet:
      "Davacının sürekli iş gücü kaybı tazminatının, haksız fiilin işletildiği tarihten (kaza tarihi) itibaren faize tabi olduğu, tedavi giderlerinin ise her bir gider için ödeme tarihinden itibaren faize tabi olduğu belirtilmiştir. TBK m.117 uyarınca temerrüt halinin doğmasına gerek yoktur, haksız fiil tarihi başlangıç esastır...",
    relevance: 84,
  },
];

/* ============================================================
   YAKLAŞAN SÜRELER (Tüm davalardan)
   ============================================================ */
export const DEADLINES: Deadline[] = [
  {
    date: "22",
    mon: "May",
    title: "Esas hakkında savunma — K. Aydın",
    sub: "Ankara 12. Ağır Ceza • CMK m.190",
    days: 6,
    level: "urgent",
    caseId: "CMK-2025-0034",
  },
  {
    date: "28",
    mon: "May",
    title: "Cevap dilekçesi — A. Yılmaz Tazminat",
    sub: "İstanbul 7. Asliye Hukuk • HMK m.127",
    days: 12,
    level: "warn",
    caseId: "TZM-2025-0142",
  },
  {
    date: "10",
    mon: "Haz",
    title: "Bilirkişi raporuna itiraz — Beta Holding",
    sub: "İst. Anadolu 3. Asliye Ticaret • HMK m.281",
    days: 25,
    level: "normal",
    caseId: "TIC-2025-0211",
  },
  {
    date: "15",
    mon: "Haz",
    title: "Tanık dinleme duruşması — M. Demir",
    sub: "İstanbul 14. İş Mahkemesi • Saat 11:30",
    days: 30,
    level: "normal",
    caseId: "IS-2025-0089",
  },
  {
    date: "5",
    mon: "Tem",
    title: "Tanık beyanları — S. Kaya Boşanma",
    sub: "İzmir 4. Aile Mahkemesi • Saat 14:00",
    days: 50,
    level: "normal",
    caseId: "AIL-2025-0067",
  },
  {
    date: "18",
    mon: "Tem",
    title: "Karar duruşması — Demir İş",
    sub: "İstanbul 14. İş Mahkemesi",
    days: 63,
    level: "normal",
    caseId: "IS-2025-0089",
  },
];

/* ============================================================
   BELGELER (Trafik Tazminat Davası)
   ============================================================ */
export const DOCUMENTS: DocumentItem[] = [
  {
    name: "01_Dava_Dilekcesi.pdf",
    type: "pdf",
    tag: "Dilekçe",
    date: "12 May 2025",
    size: "248 KB",
    critical: true,
  },
  {
    name: "02_Kaza_Tespit_Tutanagi.pdf",
    type: "pdf",
    tag: "Delil",
    date: "12 Mar 2024",
    size: "1.2 MB",
    critical: true,
  },
  {
    name: "03_ATK_Maluliyet_Raporu.pdf",
    type: "pdf",
    tag: "Bilirkişi",
    date: "18 Eki 2024",
    size: "3.4 MB",
    critical: true,
  },
  {
    name: "04_Hastane_Faturalari.pdf",
    type: "pdf",
    tag: "Delil",
    date: "Çeşitli",
    size: "8.7 MB",
  },
  {
    name: "05_Mussavir_Maas_Bordrolari.xlsx",
    type: "word",
    tag: "Delil",
    date: "2024",
    size: "124 KB",
  },
  {
    name: "06_Tanik_Beyanlari.docx",
    type: "word",
    tag: "Delil",
    date: "22 Nis 2024",
    size: "89 KB",
  },
  {
    name: "07_Cevap_Dilekcesi_Karsi.pdf",
    type: "pdf",
    tag: "Dilekçe",
    date: "8 Haz 2025",
    size: "312 KB",
  },
  {
    name: "08_Kaza_Yeri_Fotograflari.zip",
    type: "img",
    tag: "Delil",
    date: "12 Mar 2024",
    size: "24 MB",
  },
];

/* ============================================================
   ŞABLON KÜTÜPHANESİ
   ============================================================ */
export const TEMPLATES: Template[] = [
  { id: "trafik-dava", name: "Trafik Kazası Dava Dilekçesi (Maddi+Manevi)", category: "Tazminat", uses: 47 },
  { id: "is-kidem", name: "İş Akdi Feshi — Kıdem ve İhbar Talebi", category: "İş", uses: 62 },
  { id: "bosanma", name: "Çekişmeli Boşanma — Velayet Talepli", category: "Aile", uses: 34 },
  { id: "cevaba-cevap", name: "Cevaba Cevap Dilekçesi — Genel Şablon", category: "Genel", uses: 128 },
  { id: "icra-itiraz", name: "İcra Takibine İtiraz", category: "İcra", uses: 89 },
  { id: "idari-iptal", name: "İdari İşlem İptal Davası (İYUK)", category: "İdari", uses: 23 },
  { id: "bilirkisi-itiraz", name: "Bilirkişi Raporuna İtiraz", category: "Genel", uses: 71 },
  { id: "istinaf", name: "İstinaf Dilekçesi — Hukuk", category: "Genel", uses: 54 },
  { id: "aym", name: "AYM Bireysel Başvuru", category: "Anayasa", uses: 18 },
  { id: "aihm", name: "AİHM Başvuru — Madde 6 İhlali", category: "AİHM", uses: 9 },
  { id: "tanik-liste", name: "Tanık Listesi Dilekçesi", category: "Genel", uses: 152 },
  { id: "sigorta-tahkim", name: "Sigorta Tahkim Komisyonu Başvuru", category: "Sigorta", uses: 31 },
];

/* ============================================================
   SENARYO AĞACI (Trafik Tazminat Davası)
   ============================================================ */
export const SCENARIOS: Scenario[] = [
  {
    name: "Senaryo A — Hızlı Lehimize Sonuç",
    probability: 34,
    value: "1.200.000 ₺",
    description:
      "Kusur kesinleşmiş, deliller güçlü. Karşı tarafın dilatuvar taktikleri tutmazsa 8-12 ay içinde lehimize.",
  },
  {
    name: "Senaryo B — Sulh Anlaşması",
    probability: 18,
    value: "750.000 ₺",
    description:
      "Davalı şirket itibar baskısı altında uzlaşmaya açık. AI önerisi: ilk teklifi reddedin, %30 yükseltme şansı var.",
  },
  {
    name: "Senaryo C — Kısmi Kabul + İstinaf",
    probability: 22,
    value: "650.000 ₺ + istinaf süreci",
    description:
      "İlk derecede maddi tazminat kabul, manevi indirimli. İstinafta tam kabul olasılığı %68.",
  },
  {
    name: "Senaryo D — Bilirkişi Yenilemesi",
    probability: 14,
    value: "Süreç +6 ay",
    description:
      "Davalı yeniden bilirkişi talep edebilir. ATK raporu güçlü olduğu için sonuç değişmez ama süreç uzar.",
  },
  {
    name: "Senaryo E — Tahkim İtirazı",
    probability: 7,
    value: "Mahkeme kararı bekleyen",
    description:
      "Davalı tahkim yetki itirazı yapabilir. Yarg. 17. HD 2024/4 K. ile reddedilir, +3 ay kayıp.",
  },
  {
    name: "Senaryo F — Aleyhe Karar (düşük olasılık)",
    probability: 5,
    value: "Reddedilirse istinaf",
    description:
      "Tüm delillerin çürütüldüğü senaryo. Olasılık çok düşük; istinafta lehimize döner.",
  },
];

/* ============================================================
   RİSK HARİTASI
   ============================================================ */
export const RISKS: RiskItem[] = [
  { name: "Süre kaçırma", percent: 5, level: "low" },
  { name: "Bilirkişi olumsuzluğu", percent: 25, level: "mid" },
  { name: "Sigorta tahkim itirazı", percent: 35, level: "mid" },
  { name: "Kusur paylaşımı kararı", percent: 18, level: "low" },
  { name: "Manevi tazminat indirimi", percent: 42, level: "high" },
];

/* ============================================================
   KARŞI TARAF SİMÜLATÖRÜ — Saldırılar ve Cevaplar
   ============================================================ */
export const ADVERSARIAL_ATTACKS: AttackArgument[] = [
  {
    title: "Saldırı 1: Maluliyet sebep-sonuç",
    attack:
      "Kaza öncesi bel fıtığı raporu mevcut. Müvekkilin maluliyetinin tamamı kazaya bağlanamaz. Yeniden bilirkişi talep ederiz.",
    response:
      "Yarg. 17. HD 2023/12056 K. — kaza ile ağırlaşan rahatsızlıklar maluliyetten düşülmez. Bu argüman zaten dilekçede geçti.",
  },
  {
    title: "Saldırı 2: Tanık #2 çelişkisi",
    attack:
      "Görgü tanığı kendi beyanında çelişkili ifadeler verdi. Tanık beyanına itimat edilmemeli.",
    response:
      "Önerilen: Bu çelişki dilekçede önceden ele alınmalı. Açıklama: tanığın sarı/kırmızı algısı, kavşak ışığının sarıdan kırmızıya geçme anına denk geldiği için doğaldır.",
  },
  {
    title: "Saldırı 3: Sigorta tahkim",
    attack:
      "ZMSS uyuşmazlıklarında SİGORTA TAHKİM KOMİSYONU yetkili — bu davanın esastan reddi gerekir.",
    response:
      "5684 sayılı kanun m.30 — tahkim opsiyonel, mağdur isterse genel mahkeme yoluna başvurabilir. Yarg. 17. HD 2024/4 K. teyit eder.",
  },
  {
    title: "Saldırı 4: Manevi tazminat tavanı",
    attack:
      "Emsal kararlarda 300.000 TL manevi tazminat aşılmıyor — talep fahiştir.",
    response:
      "Yarg. 4. HD 2024/8821 K. — 500.000 TL hükmedildi. Üstelik enflasyon güncellemesi ile bu rakam 700.000 TL'ye karşılık gelir.",
  },
];
