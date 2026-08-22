"use client";

import { useState } from "react";

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

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {open && (
        <div className="mb-2 w-80 rounded-xl border border-[#C9A961]/40 bg-[#0A1628] shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#C9A961]">
              5 adımda HARIS
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
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
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-10 px-3 rounded-full bg-[#C9A961] text-[#0A1628] text-sm font-semibold shadow-lg hover:bg-[#e6c479]"
      >
        {open ? "Kapat" : "❓ Yardım"}
      </button>
    </div>
  );
}
