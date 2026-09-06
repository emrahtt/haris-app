import {
  Brain,
  Flame,
  Scale,
  Eye,
  Sparkles,
  Shield,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Brain,
    title: "12 Uzman AI Ajanı",
    description:
      "Tek bir LLM çağrısı değil — 12 farklı uzmanlık alanına sahip ajan paralel çalışır. İçtihat avcısı, usul hukukçusu, risk analisti, editör... Hepsi gerçek bir hukuk ofisi gibi sentezlenir.",
  },
  {
    icon: Flame,
    title: "Adversarial Red-Team",
    description:
      'Sistem, yazdığı her savunmayı KARŞI TARAFIN AVUKATI gibi parçalar. 2-3 tur döngü. "Üzerine söz söylenemeyecek" kalite buradan gelir.',
  },
  {
    icon: Scale,
    title: "Türk Hukuku Yerel RAG",
    description:
      "TMK, TBK, TTK, TCK, HMK, CMK, İYUK, İİK + 5M+ Yargıtay/Danıştay/AYM/AİHM kararı indeksli. Mevzuat değişiklikleri günlük güncellenir.",
  },
  {
    icon: Eye,
    title: "Şeffaflık Paneli",
    description:
      "Her cümlenin yanında kaynak link. Her atıf doğrulanmış. 0 hallucination garantisi. Vincent'in transparency-by-design felsefesinin ötesinde.",
  },
  {
    icon: Sparkles,
    title: "Senaryo Ağacı",
    description:
      "Davanın 8-12 olası gidişatı, her birinin olasılığı, karşı hamleler, her yolun beklenen sonucu. Strateji oyunu gibi planlayın.",
  },
  {
    icon: Shield,
    title: "KVKK & Gizlilik",
    description:
      "Türkiye'de veri rezidansı. Müvekkil verisi LLM eğitiminde KULLANILMAZ. AES-256 şifreleme. Audit trail. Avukat-müvekkil gizliliği zırhı.",
  },
];

export function Features() {
  return (
    <section className="px-[5%] py-20" id="features">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="text-[var(--color-gold-bright)] text-xs tracking-[0.2em] uppercase mb-3.5">
          5 Devrim Niteliğinde Yetenek
        </div>
        <h2 className="text-[clamp(28px,4vw,42px)] leading-[1.15] mb-4">
          Diğer hukuk AI&apos;larından{" "}
          <em className="text-[var(--color-gold-bright)] italic">çok</em> daha
          fazlası
        </h2>
        <p className="text-[var(--color-text-2)] text-base">
          HARIS, dünya çapındaki en iyi 9 hukuk AI platformunun (CoCounsel, Harvey,
          Lexis Protégé, Vincent, Spellbook, Legora, Everlaw, Relativity aiR, Clio) en
          güçlü özelliklerini damıttı, üstüne Türk hukuku için yepyeni yetenekler ekledi.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="group relative bg-gradient-to-b from-[var(--color-bg-2)] to-[var(--color-bg-1)] border border-[var(--color-line)] rounded-[18px] p-7 transition-all hover:border-[var(--color-gold-soft)] hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-11 h-11 rounded-[10px] bg-[var(--color-gold)]/10 flex items-center justify-center text-[var(--color-gold-bright)] mb-4.5">
                <Icon size={20} strokeWidth={1.6} />
              </div>
              <h3 className="text-[19px] mb-2.5">{f.title}</h3>
              <p className="text-[var(--color-text-2)] text-[13.5px]">{f.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
