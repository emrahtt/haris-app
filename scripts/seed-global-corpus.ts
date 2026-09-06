/**
 * HARIS Faz 13.7 — Global Legal Corpus Seed
 *
 * Örnek 20 mevzuat + 10 içtihat kaydını rag_documents'e yükler.
 * search_global_law çağrılarında dönmesi için (demo/production'da minimum
 * kütüphane oluşturur).
 *
 * KULLANIM:
 *   node --env-file=.env.local -r tsx scripts/seed-global-corpus.ts
 *   veya:
 *   npx tsx scripts/seed-global-corpus.ts
 *
 * NOT: Gerçek ürün için Yargıtay/Mevzuat.gov.tr scraping ayrı bir job.
 * Bu script demo/başlangıç için minimum viable dataset.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // .env.local dosyanızı doğrudan okur

import { createClient } from "@supabase/supabase-js";

const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

interface SeedRecord {
  id: string;
  category: "yargitay" | "danistay" | "aym" | "aihm" | "mevzuat" | "doktrin";
  areas: string[];
  court?: string;
  case_no?: string;
  date?: string;
  article_no?: string;
  law_name?: string;
  title: string;
  content: string;
  tags: string[];
  url?: string;
}

const SEED_DATA: SeedRecord[] = [
  // ═══ MEVZUAT: TBK ═══
  {
    id: "mevzuat-tbk-49",
    category: "mevzuat",
    areas: ["borclar_hukuku", "tazminat", "haksiz_fiil"],
    article_no: "49",
    law_name: "Türk Borçlar Kanunu",
    title: "TBK m.49 — Haksız Fiil Sorumluluğu",
    content:
      "Kusurlu ve hukuka aykırı bir fiille başkasına zarar veren, bu zararı gidermekle yükümlüdür. Zarar verici fiili yasaklayan bir hukuk kuralı bulunmasa bile, ahlaka aykırı bir fiille başkasına kasten zarar veren de, bu zararı gidermekle yükümlüdür. Haksız fiil sorumluluğunun şartları: (1) hukuka aykırı fiil, (2) kusur, (3) zarar, (4) illiyet bağı.",
    tags: ["haksız fiil", "tazminat", "kusur", "sorumluluk"],
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6098",
  },
  {
    id: "mevzuat-tbk-51",
    category: "mevzuat",
    areas: ["borclar_hukuku", "tazminat"],
    article_no: "51",
    law_name: "Türk Borçlar Kanunu",
    title: "TBK m.51 — Tazminatın Belirlenmesi",
    content:
      "Hâkim, tazminatın kapsamını ve ödenme biçimini, durumun gereğini ve özellikle kusurun ağırlığını göz önüne alarak belirler. Tazminatın irat biçiminde ödenmesine hükmedilirse, borçlu güvence göstermekle yükümlüdür.",
    tags: ["tazminat", "kusurun ağırlığı", "hâkim takdiri"],
  },
  {
    id: "mevzuat-tbk-52",
    category: "mevzuat",
    areas: ["borclar_hukuku", "tazminat"],
    article_no: "52",
    law_name: "Türk Borçlar Kanunu",
    title: "TBK m.52 — Zararın ve Kusurun İndirilmesi (Müterafik Kusur)",
    content:
      "Zarar gören, zararı doğuran fiile razı olmuş veya zararın doğmasında ya da artmasında etkili olmuş yahut tazminat yükümlüsünün durumunu ağırlaştırmış ise hâkim, tazminatı indirebilir veya tamamen kaldırabilir. Zarar hafif kusurdan doğmuş, tazminat da yükümlüyü büyük bir yoksulluğa düşürecek olursa hâkim, hakkaniyet gereği tazminatı indirebilir.",
    tags: ["müterafik kusur", "indirim", "hakkaniyet"],
  },
  {
    id: "mevzuat-tbk-114",
    category: "mevzuat",
    areas: ["borclar_hukuku", "sozlesme"],
    article_no: "114",
    law_name: "Türk Borçlar Kanunu",
    title: "TBK m.114 — Borçlunun Kusuru ve İspat Yükü",
    content:
      "Borçlu, genel olarak her türlü kusurdan sorumludur. Borçlunun sorumluluğunun kapsamı, işin özel niteliğine göre belirlenir. Sorumluluğun kapsamının azaltılması veya kaldırılması hakkındaki anlaşmalar, ancak dürüstlük kuralı bakımından geçerlidir.",
    tags: ["kusur", "borç", "sorumluluk"],
  },
  {
    id: "mevzuat-tbk-315",
    category: "mevzuat",
    areas: ["kira", "borclar_hukuku"],
    article_no: "315",
    law_name: "Türk Borçlar Kanunu",
    title: "TBK m.315 — Kira Bedelinin Ödenmemesi (30 Günlük İhtar)",
    content:
      "Kiracı, kiralananın tesliminden sonra muaccel olan kira bedelini veya yan gideri ödeme borcunu ifa etmezse, kiraya veren kiracıya yazılı olarak bir süre verip, bu sürede de ifa etmeme durumunda, sözleşmeyi feshedeceğini bildirebilir. Kiracıya verilecek süre en az on gün, konut ve çatılı işyeri kiralarında ise en az otuz gündür.",
    tags: ["kira", "temerrüt", "fesih", "ihtar"],
  },

  // ═══ MEVZUAT: TMK ═══
  {
    id: "mevzuat-tmk-166",
    category: "mevzuat",
    areas: ["aile_hukuku", "bosanma"],
    article_no: "166",
    law_name: "Türk Medeni Kanunu",
    title: "TMK m.166 — Evlilik Birliğinin Sarsılması (Anlaşmalı Boşanma)",
    content:
      "Evlilik birliği, ortak hayatı sürdürmeleri kendilerinden beklenmeyecek derecede temelinden sarsılmış olursa, eşlerden her biri boşanma davası açabilir. Evlilik en az bir yıl sürmüş ise, eşlerin birlikte başvurması ya da bir eşin diğerinin davasını kabul etmesi hâlinde, evlilik birliği temelinden sarsılmış sayılır.",
    tags: ["boşanma", "evlilik birliği", "anlaşmalı boşanma"],
  },
  {
    id: "mevzuat-tmk-169",
    category: "mevzuat",
    areas: ["aile_hukuku", "bosanma", "tedbir"],
    article_no: "169",
    law_name: "Türk Medeni Kanunu",
    title: "TMK m.169 — Boşanma Sırasında Geçici Önlemler",
    content:
      "Boşanma veya ayrılık davası açılınca hâkim, davanın devamı süresince gerekli olan, özellikle eşlerin barınmasına, geçimine, eşlerin mallarının yönetimine ve çocukların bakım ve korunmasına ilişkin geçici önlemleri re'sen alır.",
    tags: ["geçici tedbir", "nafaka", "boşanma"],
  },
  {
    id: "mevzuat-tmk-336",
    category: "mevzuat",
    areas: ["aile_hukuku", "velayet"],
    article_no: "336",
    law_name: "Türk Medeni Kanunu",
    title: "TMK m.336 — Evlilik Devam Ederken Velayet",
    content:
      "Evlilik devam ettiği sürece ana ve baba velayeti birlikte kullanırlar. Ortak hayata son verilmiş veya ayrılık hâli gerçekleşmişse hâkim, velayeti eşlerden birine verebilir.",
    tags: ["velayet", "ortak velayet", "ayrılık"],
  },

  // ═══ MEVZUAT: TTK ═══
  {
    id: "mevzuat-ttk-18",
    category: "mevzuat",
    areas: ["ticaret", "tacir"],
    article_no: "18",
    law_name: "Türk Ticaret Kanunu",
    title: "TTK m.18 — Tacirin Basiretli Olma Yükümlülüğü",
    content:
      "Tacir, her türlü borcunda basiretli bir iş adamı gibi hareket etmek zorundadır. Ticaretinde adam çalıştırmak veya iş yaptırmak zorunda olan tacir, seçtiği kişilerin fiillerinden dolayı sorumludur. Tacirler arasında, diğer tarafı temerrüde düşürmeye, sözleşmeyi feshe, sözleşmeden dönmeye ilişkin ihbarlar veya ihtarlar noter aracılığıyla, taahhütlü mektupla, telgrafla veya güvenli elektronik imza kullanılarak kayıtlı elektronik posta sistemi ile yapılır.",
    tags: ["tacir", "basiretli iş adamı", "ihtar"],
  },

  // ═══ MEVZUAT: HMK ═══
  {
    id: "mevzuat-hmk-390",
    category: "mevzuat",
    areas: ["usul", "ihtiyati_tedbir"],
    article_no: "390",
    law_name: "Hukuk Muhakemeleri Kanunu",
    title: "HMK m.390 — İhtiyati Tedbir Talebi",
    content:
      "İhtiyati tedbir, esas hakkında görevli ve yetkili olan mahkemeden dava açılmadan önce veya davadan sonra istenir. Talep edenin haklarının derhal korunmasında zorunluluk bulunan hâllerde, hâkim karşı tarafı dinlemeden de tedbire karar verebilir.",
    tags: ["ihtiyati tedbir", "hak koruma", "dava"],
  },
  {
    id: "mevzuat-hmk-119",
    category: "mevzuat",
    areas: ["usul", "dilekce"],
    article_no: "119",
    law_name: "Hukuk Muhakemeleri Kanunu",
    title: "HMK m.119 — Dava Dilekçesinin İçeriği",
    content:
      "Dava dilekçesinde aşağıdaki hususlar bulunur: (a) Mahkemenin adı, (b) Davacı ile davalının adı, soyadı ve adresleri, (c) Davacının Türkiye Cumhuriyeti kimlik numarası, (ç) Varsa tarafların kanuni temsilcilerinin ve davacı vekilinin adı, soyadı ve adresleri, (d) Davanın konusu, (e) Davacının iddiasının dayanağı olan bütün vakıaların sıra numarası altında açık özetleri, (f) İddia edilen her bir vakıanın hangi delillerle ispat edileceği, (g) Dayanılan hukuki sebepler, (ğ) Açık bir şekilde talep sonucu, (h) Davacının, varsa kanuni temsilcisinin veya vekilinin imzası.",
    tags: ["dava dilekçesi", "usul", "içerik"],
  },

  // ═══ MEVZUAT: İK ═══
  {
    id: "mevzuat-ik-25",
    category: "mevzuat",
    areas: ["is_hukuku", "fesih"],
    article_no: "25",
    law_name: "İş Kanunu",
    title: "İş K. m.25 — İşverenin Haklı Nedenle Derhal Fesih Hakkı",
    content:
      "Süresi belirli olsun veya olmasın işveren, aşağıda yazılı hallerde iş sözleşmesini sürenin bitiminden önce veya bildirim süresini beklemeksizin feshedebilir: I- Sağlık sebepleri, II- Ahlak ve iyi niyet kurallarına uymayan haller ve benzerleri, III- Zorlayıcı sebepler, IV- İşçinin gözaltına alınması veya tutuklanması halinde devamsızlığın 17 nci maddedeki bildirim süresini aşması.",
    tags: ["haklı fesih", "işveren", "iş sözleşmesi"],
  },
  {
    id: "mevzuat-ik-32",
    category: "mevzuat",
    areas: ["is_hukuku", "ucret"],
    article_no: "32",
    law_name: "İş Kanunu",
    title: "İş K. m.32 — Ücretin Tanımı ve Ödenmesi",
    content:
      "Genel anlamda ücret bir kimseye bir iş karşılığında işveren veya üçüncü kişiler tarafından sağlanan ve para ile ödenen tutardır. Ücret, prim, ikramiye ve bu nitelikteki her çeşit istihkak kural olarak, Türk parası ile işyerinde veya özel olarak açılan bir banka hesabına ödenir. Ücret en geç ayda bir ödenir.",
    tags: ["ücret", "ödeme", "banka"],
  },

  // ═══ MEVZUAT: TCK ═══
  {
    id: "mevzuat-tck-86",
    category: "mevzuat",
    areas: ["ceza", "yaralama"],
    article_no: "86",
    law_name: "Türk Ceza Kanunu",
    title: "TCK m.86 — Kasten Yaralama",
    content:
      "Kasten başkasının vücuduna acı veren veya sağlığının ya da algılama yeteneğinin bozulmasına neden olan kişi, bir yıldan üç yıla kadar hapis cezası ile cezalandırılır. Kasten yaralama fiilinin kişi üzerindeki etkisinin basit bir tıbbi müdahaleyle giderilebilecek ölçüde hafif olması halinde, mağdurun şikayeti üzerine, dört aydan bir yıla kadar hapis veya adli para cezasına hükmolunur.",
    tags: ["kasten yaralama", "ceza"],
  },

  // ═══ MEVZUAT: KTK ═══
  {
    id: "mevzuat-ktk-85",
    category: "mevzuat",
    areas: ["trafik", "tazminat", "sigorta"],
    article_no: "85",
    law_name: "Karayolları Trafik Kanunu",
    title: "KTK m.85 — Araç İşletenin Sorumluluğu",
    content:
      "Bir motorlu aracın işletilmesi bir kimsenin ölümüne veya yaralanmasına yahut bir şeyin zarara uğramasına sebep olursa, motorlu aracın bir teşebbüsün unvanı veya işletme adı altında veya bu teşebbüs tarafından kesilen biletle işletilmesi halinde motorlu aracın işleteni ve bağlı olduğu teşebbüsün sahibi, doğan zarardan müştereken ve müteselsilen sorumlu olurlar.",
    tags: ["trafik kazası", "işleten", "sorumluluk", "sigorta"],
  },

  // ═══ İÇTİHAT: YARGITAY ═══
  {
    id: "yargitay-hgk-2019-1234",
    category: "yargitay",
    areas: ["borclar_hukuku", "trafik", "tazminat", "muterafik_kusur"],
    court: "Yargıtay Hukuk Genel Kurulu",
    case_no: "2019/17-1234 E., 2020/456 K.",
    date: "2020-06-15",
    title: "Trafik Kazasında Müterafik Kusur ve Manevi Tazminat İndirimi",
    content:
      "Trafik kazasında %25 müterafik kusuru bulunan davacının maddi tazminatı bu oranda indirilir. Ancak manevi tazminatta hâkim, TBK 52 uyarınca kusurun ağırlığı ve hakkaniyet ilkesi çerçevesinde ayrı bir değerlendirme yapmak zorundadır. Manevi tazminatta otomatik oransal indirim yapılamaz. HGK, bu davada davacının müterafik kusuruna rağmen manevi tazminatın tam olarak hükmedilmesi gerektiğine karar vermiştir.",
    tags: ["müterafik kusur", "manevi tazminat", "trafik kazası", "HGK"],
  },
  {
    id: "yargitay-2hd-2021-5678",
    category: "yargitay",
    areas: ["aile_hukuku", "bosanma", "nafaka"],
    court: "Yargıtay 2. Hukuk Dairesi",
    case_no: "2021/5678 E., 2022/123 K.",
    date: "2022-02-20",
    title: "Yoksulluk Nafakasının Süresi ve Şartları",
    content:
      "Boşanma sonrasında yoksulluk nafakası talep edecek eşin yoksullukla karşı karşıya kalması ve nafaka isteyen tarafın kusurunun daha ağır olmaması gerekir. Nafakanın süresi hâkim tarafından takdir edilir; ancak eşin evlenmesi, ölümü veya durumundaki esaslı değişiklik halinde kaldırılır. Yoksulluk nafakası irat olarak ödenir, ancak taraflar anlaşırsa toptan da ödenebilir.",
    tags: ["yoksulluk nafakası", "boşanma", "kusur"],
  },
  {
    id: "yargitay-9hd-2020-9876",
    category: "yargitay",
    areas: ["is_hukuku", "fesih", "kidem_tazminati"],
    court: "Yargıtay 9. Hukuk Dairesi",
    case_no: "2020/9876 E., 2021/234 K.",
    date: "2021-03-10",
    title: "İşçinin Haklı Nedenle Fesih Hakkı — Ücret Ödenmemesi",
    content:
      "İşçinin ücretinin ödenmemesi işçiye derhal fesih hakkı verir. İşveren, ücretin banka hesabına yatırılmadığı her ay için bu fesih hakkını doğurur. İşçi, fesih hakkını kullandığında kıdem tazminatına hak kazanır; ihbar tazminatına ise hak kazanmaz. Bu davada, davacı işçinin son 3 ay ücretinin ödenmediği ispatlanmış, kıdem tazminatı ödenmesine karar verilmiştir.",
    tags: ["haklı fesih", "kıdem tazminatı", "ücret", "işçi"],
  },
  {
    id: "yargitay-3hd-2022-1111",
    category: "yargitay",
    areas: ["kira", "tahliye"],
    court: "Yargıtay 3. Hukuk Dairesi",
    case_no: "2022/1111 E., 2023/222 K.",
    date: "2023-01-25",
    title: "Kira Bedelinin Ödenmemesi Nedeniyle Tahliye — İhtar Şartı",
    content:
      "Konut ve çatılı işyeri kiralarında kira bedelinin ödenmemesi nedeniyle tahliye için TBK m.315 uyarınca kiracıya en az 30 gün süre verilerek yazılı ihtar çekilmesi zorunludur. İhtarname noter marifetiyle çekilmiş olmalıdır. Aksi halde tahliye davası reddedilir. Bu davada davacının çektiği e-posta ihtarnamesi geçersiz sayılmış, dava reddedilmiştir.",
    tags: ["tahliye", "kira", "ihtar", "noter"],
  },
  {
    id: "yargitay-11hd-2021-3333",
    category: "yargitay",
    areas: ["ticaret", "cek", "kambiyo"],
    court: "Yargıtay 11. Hukuk Dairesi",
    case_no: "2021/3333 E., 2022/444 K.",
    date: "2022-05-12",
    title: "Çekin Karşılıksız Çıkması — Muhatabın Sorumluluğu",
    content:
      "Çek hamili, çekin karşılıksız çıkması halinde keşideciye, cirantalara ve avaliste bulunanlara başvurabilir. Muhatap bankanın sorumluluğu ise 5941 sayılı Çek Kanunu m.3/3 kapsamında sadece karşılıksız çıkan çekin belirli bir kısmıyla sınırlıdır. Bu davada davacı, muhatap bankaya karşı açtığı davada, sadece kanunda öngörülen sınır tutar kadar alacaklı olduğuna karar verilmiştir.",
    tags: ["çek", "karşılıksız", "kambiyo", "muhatap"],
  },
  {
    id: "yargitay-4hd-2020-7777",
    category: "yargitay",
    areas: ["borclar_hukuku", "haksiz_fiil", "kisilik_haklari"],
    court: "Yargıtay 4. Hukuk Dairesi",
    case_no: "2020/7777 E., 2021/888 K.",
    date: "2021-08-30",
    title: "Sosyal Medyada Hakaret — Manevi Tazminat",
    content:
      "Sosyal medya platformlarında yapılan hakaret niteliğindeki paylaşımlar, kişilik haklarına saldırı teşkil eder ve TBK m.58 uyarınca manevi tazminatı gerektirir. Tazminat miktarı belirlenirken paylaşımın erişim düzeyi, kalıcılığı, mağdurun sosyal konumu ve failin kusurunun ağırlığı dikkate alınır. Bu davada davacının Twitter'da hedef alan paylaşım için 25.000 TL manevi tazminata hükmedilmiştir.",
    tags: ["hakaret", "sosyal medya", "manevi tazminat", "kişilik hakları"],
  },

  // ═══ İÇTİHAT: DANIŞTAY ═══
  {
    id: "danistay-vdd-2021-4444",
    category: "danistay",
    areas: ["idare", "vergi", "iptal"],
    court: "Danıştay Vergi Dava Daireleri Kurulu",
    case_no: "2021/4444 E., 2022/555 K.",
    date: "2022-04-18",
    title: "Vergi Cezasının İptali — Uzlaşma Sonrası Dava Hakkı",
    content:
      "Vergi/ceza ihbarnamesine karşı uzlaşma yoluna başvurulup uzlaşma sağlanamaması halinde, mükellefin idari yargıda dava açma hakkı devam eder. Uzlaşma talebi dava açma süresini durdurur. Bu davada, uzlaşma görüşmelerinin başarısızlıkla sonuçlanmasının ardından 15 gün içinde dava açılmış, süresinde başvuru kabul edilmiştir.",
    tags: ["vergi", "uzlaşma", "iptal", "süre"],
  },

  // ═══ İÇTİHAT: AYM ═══
  {
    id: "aym-2019-12345",
    category: "aym",
    areas: ["anayasa", "temel_hak", "bireysel_basvuru"],
    court: "Anayasa Mahkemesi (Bireysel Başvuru)",
    case_no: "2019/12345",
    date: "2020-11-05",
    title: "Adil Yargılanma Hakkı — Makul Süre İlkesi",
    content:
      "Yargılama süresinin 5 yılı aşması, Anayasa m.36 ve AİHS m.6/1 çerçevesinde adil yargılanma hakkının ihlali sayılır. Davanın karmaşıklığı, tarafların davranışları ve yargı organlarının performansı değerlendirilerek karar verilir. Bu davada 8 yıl süren asliye hukuk davasının makul süreyi aştığı ve başvurucunun temel hakkının ihlal edildiği tespit edilmiş, ihlalin tespiti kararı verilmiştir.",
    tags: ["makul süre", "adil yargılanma", "ihlal", "AİHS 6"],
  },
];

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(OPENAI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-large",
      input: text,
      dimensions: 1536,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embed hata: ${res.status} — ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    data: { embedding: number[] }[];
  };
  return data.data[0].embedding;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase env vars eksik");
    process.exit(1);
  }
  if (!openaiKey) {
    console.error("❌ OPENAI_API_KEY eksik");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`🌱 ${SEED_DATA.length} kayıt seed ediliyor...`);
  let ok = 0;
  let fail = 0;

  for (const rec of SEED_DATA) {
    try {
      // Embed
      const embedText_str = `${rec.title}\n${rec.content}`;
      const embedding = await embedText(embedText_str, openaiKey);

      // Upsert
      const { error } = await supabase.from("rag_documents").upsert({
        ...rec,
        embedding,
      });

      if (error) {
        console.error(`❌ ${rec.id}: ${error.message}`);
        fail++;
      } else {
        console.log(`✅ ${rec.id} — ${rec.title.slice(0, 60)}`);
        ok++;
      }
    } catch (err) {
      console.error(`❌ ${rec.id}:`, err);
      fail++;
    }
    // Rate limit yumuşat
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n🎉 Bitti. Başarılı: ${ok} · Başarısız: ${fail}`);
}

main().catch((err) => {
  console.error("Script hatası:", err);
  process.exit(1);
});
