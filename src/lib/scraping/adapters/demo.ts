/**
 * Demo Scraper Adapter
 *
 * Gerçek scraping yapmadan, query'ye uygun gerçekçi sentetik Yargıtay/Danıştay
 * kararları üretir. Faz 7 UI'sını ve embedding pipeline'ını test etmek için.
 *
 * Üretilen kararlar:
 * - Türk hukukuna uygun esas/karar no formatı
 * - Query'ye semantik olarak yakın özet metinler
 * - Stream simülasyonu (her karar arasında 200-800ms gecikme)
 */

import type {
  ScraperAdapter,
  ScrapedDecision,
  ScrapingJobInput,
} from "../types";

const COURTS = [
  "Yargıtay 1. Hukuk Dairesi",
  "Yargıtay 4. Hukuk Dairesi",
  "Yargıtay 9. Hukuk Dairesi",
  "Yargıtay 17. Hukuk Dairesi",
  "Yargıtay 22. Hukuk Dairesi",
  "Yargıtay Hukuk Genel Kurulu",
  "Yargıtay 5. Ceza Dairesi",
  "Yargıtay 11. Ceza Dairesi",
];

const TEMPLATES: Record<string, { courts: string[]; templates: { title: string; content: string }[] }> = {
  trafik: {
    courts: ["Yargıtay 17. Hukuk Dairesi", "Yargıtay 4. Hukuk Dairesi", "Yargıtay HGK"],
    templates: [
      {
        title: "Trafik Kazasında %{N1} Sürekli İş Gücü Kaybı — Tam Kusurlu Davalı Sorumlu",
        content: `Davacının trafik kazası neticesinde uğradığı %{N1} oranındaki sürekli iş gücü kaybı sebebiyle açtığı tazminat davasında, davalının %100 kusurlu olduğu kaza tespit tutanağı ile sabittir. PMF 1931 yaşam tablosu uyarınca hesaplanan kazanç kaybı, tedavi giderleri ve manevi tazminat toplamı olarak {AMOUNT} TL'ye hükmedilmiş, Dairemizce ONANMIŞTIR.

Davalı tarafça ileri sürülen "mağdurun emniyet kemeri kullanmadığı için kusur paylaşımı yapılması" itirazı, Dairemizce reddedilmiştir. Yerleşik içtihadımıza göre, tam kusurlu davalı, mağdurun ikincil kusurunu kusur paylaşımı argümanı olarak ileri süremez. 2918 sayılı KTK m.85 uyarınca işletenin kusursuz sorumluluğu kapsamında sigorta limitini aşan zararların bizzat işletenden talep edilebileceği de hüküm altına alınmıştır.`,
      },
      {
        title: "Manevi Tazminatta Sigortacının Doğrudan Sorumluluğu — ZMSS Limiti Dahilinde",
        content: `Davalı sigorta şirketi nezdinde açılan manevi tazminat davasında, KTK m.97 kapsamında sigortacının doğrudan dava edilebilirliği sabit kabul edilmiştir. Sigortacının manevi tazminattan da poliçe limiti dahilinde sorumlu olduğu Hukuk Genel Kurulu içtihatları ile içtihat birliği sağlanmış konulardandır.

Yargılama tarihindeki ekonomik koşullar, enflasyon, mağdurun yaşadığı acı ve ızdırap, kalıcı maluliyet oranı dikkate alınarak {AMOUNT} TL manevi tazminat takdir edilmiş ve karar ONANMIŞTIR. Mahkemenin geniş takdir yetkisi çerçevesinde, tazminatın "zenginleştirme aracı" değil "hafifletme aracı" olduğu ilkesine uygun değerlendirme yapılmıştır.`,
      },
    ],
  },
  is: {
    courts: ["Yargıtay 9. Hukuk Dairesi", "Yargıtay 22. Hukuk Dairesi"],
    templates: [
      {
        title: "Kıdem Tazminatı — Haklı Fesih İddiasının İspatı İşverende",
        content: `İş Kanunu m.25/II uyarınca işverenin haklı nedenle derhal fesih hakkını kullandığı iddiası karşısında, bu fesih sebebinin somut delillerle ispatı yükü işverene aittir. İşçinin iş yerinde "ahlak ve iyi niyet kurallarına aykırı" davranışta bulunduğu iddiasının kamera kaydı, tutanak veya tanık beyanı gibi nesnel delillerle desteklenmesi gerekmektedir.

Somut olayda işverenin sadece bir başka çalışanın sözlü beyanına dayanarak gerçekleştirdiği fesih HAKSIZ kabul edilmiş, müvekkilin {AMOUNT} TL kıdem ve {N1} ay ihbar tazminatına hükmedilmiş, karar ONANMIŞTIR. Dairemiz, m.25/II'nin sıkı şekilde yorumlanması gerektiğini, şüpheye yer veren delillerin işveren aleyhine değerlendirileceğini bir kez daha vurgulamıştır.`,
      },
      {
        title: "Mobbing Tespiti — Süreklilik ve Sistematiklik Aranır",
        content: `İşçi tarafından açılan manevi tazminat davasında ileri sürülen mobbing iddiasının kabul edilebilmesi için süreklilik (genellikle 6 ay+ sistematik tekrar), kasıt (yıldırma amacı) ve mağdur üzerinde somut etki (psikolojik bozukluk, performans düşüşü) unsurlarının bir arada bulunması gerekmektedir.

Somut olayda davacının {N1} aylık süreçte sistematik olarak görev tanımı dışında işlere zorlandığı, toplantılarda dışlandığı ve psikiyatri raporlarıyla anksiyete bozukluğu tanısı aldığı sabittir. Mobbing tespit edilerek {AMOUNT} TL manevi tazminata hükmedilmiş, işverenin "olağan yönetim hakkı" savunması reddedilmiştir.`,
      },
    ],
  },
  ceza: {
    courts: ["Yargıtay 1. Ceza Dairesi", "Yargıtay 5. Ceza Dairesi", "Yargıtay 11. Ceza Dairesi"],
    templates: [
      {
        title: "Görevi Kötüye Kullanma — Somut Zarar Tespiti Şart",
        content: `5237 sayılı TCK m.257'de düzenlenen görevi kötüye kullanma suçunun oluşabilmesi için kamu görevlisinin görevinin gereklerine aykırı hareketi sonucunda somut bir mağduriyet, kamu zararı veya haksız menfaatin tespit edilmesi gerekir. Soyut "olabilirdi" düzeyinde tespit yetersizdir.

Somut olayda sanığın imza atması gereken bir evrakı geciktirdiği sabit olmakla birlikte, bu gecikme sonucunda rakamsal olarak ölçülebilir bir zararın doğduğuna dair delil bulunmadığından, ilk derece mahkemesinin mahkumiyet hükmü BOZULMUŞTUR. Dairemiz, görevi kötüye kullanma suçunun "her aksaklığa uygulanan genel bir hüküm" olmadığını vurgulamıştır.`,
      },
      {
        title: "Meşru Müdafaa — Orantılılık Esas, Geri Çekilme Yükü Yoktur",
        content: `5237 sayılı TCK m.25/1 kapsamındaki meşru müdafaada mağdurun "kaçma veya geri çekilme yükümlülüğü bulunmamaktadır". Saldırıya uğrayan kişi, orantılı güçle karşı koyma hakkına sahiptir. Ancak karşı koymanın savunma amaçlı olması, intikam amaçlı olmaması ve etkisiz hale gelmiş saldırgana ek vuruşların yapılmaması esastır.

Somut olayda sanığın saldırgan tarafından bıçakla yaralandığı, savunma amaçlı evindeki tabancayla tek el ateş edip saldırganı durduğu için ateş etmeyi kestiği tespit edildiğinden, meşru müdafaa sınırları içinde değerlendirilmiş ve BERAAT kararı ONANMIŞTIR.`,
      },
    ],
  },
  aile: {
    courts: ["Yargıtay 2. Hukuk Dairesi", "Yargıtay 3. Hukuk Dairesi"],
    templates: [
      {
        title: "Velayet — Çocuğun Üstün Yararı Esas, Anne Önceliği Mutlak Değildir",
        content: `Çekişmeli boşanma davasında müşterek çocuğun velayetinin tayininde, Türk Medeni Kanunu m.182 kapsamında "çocuğun üstün yararı" ilkesi tek belirleyici kriterdir. "Küçük yaştaki çocuğun velayeti anneye verilir" şeklindeki yaygın kanı hükümden çıkarılamaz; hâkim çocuğun yaşı, sağlığı, eğitim ihtiyaçları, anne-babanın durumu ve uzman pedagog raporu çerçevesinde çocuğun tercihini birlikte değerlendirir.

Somut olayda annenin uzun çalışma saatleri ve bakım imkanının sınırlı olması karşılığında babanın esnek çalışma düzeni ve çocukla geçirdiği zamanın belgelenmesi karşısında velayetin BABAYA verilmesine ilişkin ilk derece hükmü ONANMIŞTIR.`,
      },
    ],
  },
};

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(s: string): string {
  return s
    .replace(/\{N1\}/g, String(20 + Math.floor(Math.random() * 50)))
    .replace(
      /\{AMOUNT\}/g,
      (200000 + Math.floor(Math.random() * 1500000)).toLocaleString("tr-TR")
    );
}

function categorizeQuery(q: string): keyof typeof TEMPLATES {
  const l = q.toLowerCase();
  if (/trafik|kaza|tazminat|maluliyet|sigorta|zmss|ktk/.test(l)) return "trafik";
  if (/iş|kıdem|ihbar|fesih|mobbing|işveren|işçi/.test(l)) return "is";
  if (/ceza|suç|sanık|tck|cmk|meşru|tutukluluk|görevi/.test(l)) return "ceza";
  if (/aile|boşanma|velayet|nafaka|tmk|mal rejimi/.test(l)) return "aile";
  return "trafik";
}

export class DemoScraperAdapter implements ScraperAdapter {
  readonly source = "demo" as const;
  readonly displayName = "Demo Generator (Sentetik Yargıtay Kararları)";
  readonly baseUrl = "https://demo.haris.local";

  async isAvailable(): Promise<boolean> {
    return true; // her zaman müsait
  }

  async *scrape(
    job: ScrapingJobInput,
    onProgress: (p: { found: number; scraped: number; currentTitle?: string }) => void
  ): AsyncGenerator<ScrapedDecision, void, unknown> {
    const limit = job.limit ?? 8;
    const queryKey = categorizeQuery(job.query || "");
    const category = TEMPLATES[queryKey];

    const totalFound = limit + Math.floor(Math.random() * 5);
    onProgress({ found: totalFound, scraped: 0 });

    for (let i = 0; i < limit; i++) {
      // Stream gecikme — gerçek scraping hissi
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

      const template = randomChoice(category.templates);
      const court = randomChoice(category.courts);
      const year = 2022 + Math.floor(Math.random() * 3);
      const esasNo = `${year}/${1000 + Math.floor(Math.random() * 18000)}`;
      const kararNo = `${year + 1}/${100 + Math.floor(Math.random() * 9000)}`;
      const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
      const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");

      const title = fillTemplate(template.title);
      const content = fillTemplate(template.content);

      const decision: ScrapedDecision = {
        jobId: "", // run-time'da set edilir
        source: "demo",
        sourceId: `demo-${court.replace(/\s/g, "_")}-${esasNo.replace("/", "_")}-${kararNo.replace("/", "_")}`,
        sourceUrl: `https://demo.haris.local/karar/${i}`,
        court,
        esasNo,
        kararNo,
        kararDate: `${year + 1}-${month}-${day}`,
        title,
        content,
        category: "yargitay",
        areas: [
          queryKey === "trafik"
            ? "tazminat"
            : queryKey === "is"
            ? "is"
            : queryKey === "ceza"
            ? "ceza"
            : "aile",
        ],
        tags: [queryKey, court.split(" ")[1], `${year}`],
      };

      onProgress({
        found: totalFound,
        scraped: i + 1,
        currentTitle: title.slice(0, 80),
      });

      yield decision;
    }
  }
}
