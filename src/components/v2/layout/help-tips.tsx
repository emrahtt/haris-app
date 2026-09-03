"use client";

/**
 * HARIS v2 — Yardım / 5 adım turu
 *
 * Eski tasarımda ekranın sol altında sabit "büyük sarı Yardım butonu" vardı.
 * Kullanıcı isteğiyle kaldırıldı: artık tetikleyici, dikey işlem çubuğundaki
 * (OrchestraRail) diğer öğelerle aynı stilde KÜÇÜK DİKEY "❓ Yardım" butonu.
 *
 * Açılan panel, çubuğun soluna (Canvas tarafına) yapışık açılır.
 */

import { useEffect, useState } from "react";

const STEPS = [
  {
    n: "1",
    title: "Belge yükle",
    body: "Sol Vault’tan evrak ekleyin. Okuma yöntemini seçin (Akıllı çoğu dosyada yeter).",
  },
  {
    n: "2",
    title: "Tarafları yaz",
    body: "Sağda Taraflar → müvekkil ve karşı taraf. Çıkar çatışması otomatik kontrol edilir.",
  },
  {
    n: "3",
    title: "İşlemi başlat",
    body: "Matter’ın solundaki dikey çubuğun en altındaki «İşlemi Başlat»a basın. 3 tur sürer.",
  },
  {
    n: "4",
    title: "Dilekçeyi düzelt",
    body: "Orta Canvas’ta taslak belirecek. Chat’ten «daha sert yaz» veya @ajan ile revize edin.",
  },
  {
    n: "5",
    title: "V1’e aktar (isteğe bağlı)",
    body: "Mahkeme / takvim / klasik panel için dikey çubukta V1 Araçlar → V1'e Aktar.",
  },
];

export function HelpTips() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("haris_tour_seen")) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        localStorage.setItem("haris_tour_seen", "1");
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="relative flex-none border-t border-white/10">
      {/* Küçük dikey Yardım butonu — Ayarlar'ın yanında */}
      <button
        type="button"
        onClick={toggle}
        title={open ? "Yardımı kapat" : "Yardım"}
        aria-label="Yardım"
        className={`w-full flex items-center justify-center py-3 min-h-[5rem] transition ${
          open
            ? "bg-[#C9A961]/15 text-[#C9A961]"
            : "text-slate-300 hover:bg-white/5"
        }`}
      >
        <span
          className="text-[10px] font-semibold tracking-wide whitespace-nowrap"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
        >
          ❓ Yardım
        </span>
      </button>

      {open && (
        <div className="absolute right-full top-0 mr-2 w-80 max-h-[26rem] overflow-y-auto rounded-xl border border-[#C9A961]/40 bg-[#0A1628] shadow-2xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#C9A961]">
              5 adımda HARIS
            </h3>
            <button
              type="button"
              onClick={toggle}
              className="text-slate-500 hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          </div>
          <ol className="space-y-2.5">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#C9A961] text-[#0A1628] text-[10px] font-bold flex items-center justify-center">
                  {s.n}
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-100">
                    {s.title}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    {s.body}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={toggle}
            className="mt-4 w-full px-3 py-2 rounded text-xs font-semibold bg-[#C9A961] text-[#0A1628] hover:bg-[#e6c479]"
          >
            Turu kapat
          </button>
        </div>
      )}
    </div>
  );
}
