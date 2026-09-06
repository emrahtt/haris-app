import { Check, X } from "lucide-react";

interface Row {
  feature: string;
  haris: boolean | string;
  cocounsel: boolean | string;
  harvey: boolean | string;
  vincent: boolean | string;
  lexis: boolean | string;
}

const ROWS: Row[] = [
  { feature: "Türk Hukuku Yerel RAG", haris: true, cocounsel: false, harvey: false, vincent: false, lexis: false },
  { feature: "Çoklu-Ajan Orkestrasyon", haris: true, cocounsel: "kısmen", harvey: true, vincent: "kısmen", lexis: "kısmen" },
  { feature: "Adversarial Red-Team", haris: true, cocounsel: false, harvey: false, vincent: false, lexis: false },
  { feature: "Senaryo Ağacı + Olasılık", haris: true, cocounsel: false, harvey: false, vincent: false, lexis: false },
  { feature: "Citation Doğrulama", haris: true, cocounsel: true, harvey: true, vincent: true, lexis: true },
  { feature: "Müvekkil Portalı", haris: true, cocounsel: false, harvey: false, vincent: false, lexis: false },
  { feature: "UYAP Entegrasyon Hazırlığı", haris: true, cocounsel: false, harvey: false, vincent: false, lexis: false },
  { feature: "KVKK / Türkiye Veri Rezidansı", haris: true, cocounsel: false, harvey: false, vincent: false, lexis: false },
  { feature: "Türkçe Dilekçe Üretimi (Anadil)", haris: true, cocounsel: false, harvey: false, vincent: false, lexis: false },
];

function Cell({ value, isHaris }: { value: boolean | string; isHaris?: boolean }) {
  return (
    <td
      className={`px-4 py-3.5 border-b border-[var(--color-line)] ${
        isHaris ? "bg-[var(--color-gold)]/[0.05]" : ""
      }`}
    >
      {value === true ? (
        <Check size={16} className="text-[var(--color-ok)]" />
      ) : value === false ? (
        <X size={16} className="text-[var(--color-text-3)]" />
      ) : (
        <span className="text-[var(--color-warn)] text-xs">{value}</span>
      )}
    </td>
  );
}

export function Compare() {
  return (
    <section className="px-[5%] py-20" id="compare">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="text-[var(--color-gold-bright)] text-xs tracking-[0.2em] uppercase mb-3.5">
          Rakip Karşılaştırma
        </div>
        <h2 className="text-[clamp(28px,4vw,42px)] leading-[1.15] mb-4">Neden HARIS?</h2>
        <p className="text-[var(--color-text-2)] text-base">
          Global liderlerle aynı seviyede teknoloji + Türk hukukuna özel yetenekler.
        </p>
      </div>

      <div className="max-w-5xl mx-auto bg-[var(--color-bg-1)] border border-[var(--color-line)] rounded-[18px] overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="px-4 py-3.5 text-left bg-black/30 font-semibold text-[var(--color-gold-bright)] text-xs uppercase tracking-wider">
                Özellik
              </th>
              <th className="px-4 py-3.5 text-left bg-[var(--color-gold)]/[0.08] font-semibold text-[var(--color-gold-bright)] text-xs uppercase tracking-wider">
                HARIS
              </th>
              <th className="px-4 py-3.5 text-left bg-black/30 font-semibold text-[var(--color-gold-bright)] text-xs uppercase tracking-wider">
                CoCounsel
              </th>
              <th className="px-4 py-3.5 text-left bg-black/30 font-semibold text-[var(--color-gold-bright)] text-xs uppercase tracking-wider">
                Harvey
              </th>
              <th className="px-4 py-3.5 text-left bg-black/30 font-semibold text-[var(--color-gold-bright)] text-xs uppercase tracking-wider">
                Vincent
              </th>
              <th className="px-4 py-3.5 text-left bg-black/30 font-semibold text-[var(--color-gold-bright)] text-xs uppercase tracking-wider">
                Lexis+
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.feature}>
                <td className="px-4 py-3.5 border-b border-[var(--color-line)]">{row.feature}</td>
                <Cell value={row.haris} isHaris />
                <Cell value={row.cocounsel} />
                <Cell value={row.harvey} />
                <Cell value={row.vincent} />
                <Cell value={row.lexis} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
