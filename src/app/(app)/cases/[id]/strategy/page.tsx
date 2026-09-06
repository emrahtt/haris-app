import { SCENARIOS } from "@/lib/data/legal";

export default function StrategyPage() {
  return (
    <>
      <div className="bg-[var(--color-bg-1)] border border-[var(--color-line)] rounded-xl p-6 overflow-x-auto">
        <h3 className="font-serif text-lg text-[var(--color-gold-bright)] mb-1.5">
          Senaryo Ağacı — Davanın Olası Gidişatları
        </h3>
        <p className="text-[var(--color-text-2)] text-[13px] mb-6">
          AI, 12 olası senaryo simüle etti. Aşağıda en olasılı 8 senaryo ve karşı hamleleriniz var.
        </p>

        <div className="min-w-[800px]">
          <svg width="900" height="540" viewBox="0 0 900 540" style={{ display: "block", margin: "0 auto" }}>
            {/* Kök */}
            <g>
              <rect x="370" y="20" width="160" height="60" rx="10" fill="rgba(201,169,97,0.15)" stroke="var(--color-gold)" strokeWidth="2" />
              <text x="450" y="46" textAnchor="middle" fill="#e8eef7" fontSize="12" fontWeight="600">DAVA AÇILDI</text>
              <text x="450" y="64" textAnchor="middle" fill="#a9b6cc" fontSize="10">12 May 2025</text>
            </g>

            {/* Çizgiler */}
            <line x1="450" y1="80" x2="180" y2="120" stroke="var(--color-line-2)" strokeWidth="1" />
            <line x1="450" y1="80" x2="450" y2="120" stroke="var(--color-gold)" strokeWidth="2" />
            <line x1="450" y1="80" x2="720" y2="120" stroke="var(--color-line-2)" strokeWidth="1" />

            {/* 2. seviye */}
            <g>
              <rect x="100" y="120" width="160" height="60" rx="8" fill="rgba(106,163,230,0.1)" stroke="var(--color-info)" strokeWidth="1" />
              <text x="180" y="146" textAnchor="middle" fill="#e8eef7" fontSize="12">Sulh Görüşmesi</text>
              <text x="180" y="164" textAnchor="middle" fill="#6aa3e6" fontSize="11" fontWeight="600">%18 olasılık</text>
            </g>
            <g>
              <rect x="370" y="120" width="160" height="60" rx="8" fill="rgba(201,169,97,0.15)" stroke="var(--color-gold)" strokeWidth="2" />
              <text x="450" y="146" textAnchor="middle" fill="#e8eef7" fontSize="12" fontWeight="600">Yargılama Devam</text>
              <text x="450" y="164" textAnchor="middle" fill="#c9a961" fontSize="11" fontWeight="600">%72 olasılık ★</text>
            </g>
            <g>
              <rect x="640" y="120" width="160" height="60" rx="8" fill="rgba(226,107,107,0.1)" stroke="var(--color-danger)" strokeWidth="1" />
              <text x="720" y="146" textAnchor="middle" fill="#e8eef7" fontSize="12">Tahkim Yönlendirme</text>
              <text x="720" y="164" textAnchor="middle" fill="#e26b6b" fontSize="11" fontWeight="600">%10 olasılık</text>
            </g>

            {/* 3. seviye */}
            <line x1="450" y1="180" x2="280" y2="240" stroke="var(--color-gold)" strokeWidth="1.5" />
            <line x1="450" y1="180" x2="450" y2="240" stroke="var(--color-gold)" strokeWidth="2" />
            <line x1="450" y1="180" x2="620" y2="240" stroke="var(--color-line-2)" strokeWidth="1" />

            <g>
              <rect x="200" y="240" width="160" height="60" rx="8" fill="rgba(92,200,143,0.1)" stroke="var(--color-ok)" strokeWidth="1" />
              <text x="280" y="266" textAnchor="middle" fill="#e8eef7" fontSize="12">Lehimize Sonuç</text>
              <text x="280" y="284" textAnchor="middle" fill="#5cc88f" fontSize="11" fontWeight="600">%52 olasılık</text>
            </g>
            <g>
              <rect x="370" y="240" width="160" height="60" rx="8" fill="rgba(230,184,90,0.1)" stroke="var(--color-warn)" strokeWidth="2" />
              <text x="450" y="266" textAnchor="middle" fill="#e8eef7" fontSize="12" fontWeight="600">Kısmi Kabul</text>
              <text x="450" y="284" textAnchor="middle" fill="#e6b85a" fontSize="11" fontWeight="600">%26 olasılık</text>
            </g>
            <g>
              <rect x="540" y="240" width="160" height="60" rx="8" fill="rgba(226,107,107,0.1)" stroke="var(--color-danger)" strokeWidth="1" />
              <text x="620" y="266" textAnchor="middle" fill="#e8eef7" fontSize="12">İstinaf Gerekli</text>
              <text x="620" y="284" textAnchor="middle" fill="#e26b6b" fontSize="11" fontWeight="600">%22 olasılık</text>
            </g>

            {/* 4. seviye */}
            <line x1="280" y1="300" x2="180" y2="360" stroke="var(--color-ok)" strokeWidth="1.5" />
            <line x1="280" y1="300" x2="380" y2="360" stroke="var(--color-ok)" strokeWidth="1.5" />

            <g>
              <rect x="100" y="360" width="160" height="80" rx="8" fill="rgba(92,200,143,0.15)" stroke="var(--color-ok)" strokeWidth="2" />
              <text x="180" y="384" textAnchor="middle" fill="#e8eef7" fontSize="12" fontWeight="600">Tam Kabul</text>
              <text x="180" y="402" textAnchor="middle" fill="#a9b6cc" fontSize="10">1.2M+ ₺</text>
              <text x="180" y="420" textAnchor="middle" fill="#5cc88f" fontSize="11" fontWeight="700">%34 olasılık</text>
            </g>
            <g>
              <rect x="300" y="360" width="160" height="80" rx="8" fill="rgba(92,200,143,0.1)" stroke="var(--color-ok)" strokeWidth="1" />
              <text x="380" y="384" textAnchor="middle" fill="#e8eef7" fontSize="12">Kısmi Kabul (Yüksek)</text>
              <text x="380" y="402" textAnchor="middle" fill="#a9b6cc" fontSize="10">800K-1.1M ₺</text>
              <text x="380" y="420" textAnchor="middle" fill="#5cc88f" fontSize="11" fontWeight="700">%18 olasılık</text>
            </g>

            {/* Beklenen Değer kutusu */}
            <g>
              <rect x="540" y="360" width="240" height="80" rx="8" fill="rgba(201,169,97,0.08)" stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x="660" y="384" textAnchor="middle" fill="#c9a961" fontSize="11" fontWeight="600">BEKLENEN DEĞER (AI)</text>
              <text x="660" y="408" textAnchor="middle" fill="#e8eef7" fontSize="18" fontWeight="700" fontFamily="Playfair Display">965.000 ₺</text>
              <text x="660" y="424" textAnchor="middle" fill="#a9b6cc" fontSize="10">Olasılık ağırlıklı</text>
            </g>

            {/* Tavsiye */}
            <g>
              <rect x="200" y="470" width="500" height="50" rx="8" fill="rgba(201,169,97,0.05)" stroke="var(--color-gold-soft)" />
              <text x="450" y="492" textAnchor="middle" fill="#c9a961" fontSize="11" fontWeight="600">★ TAVSİYE EDİLEN HAMLE</text>
              <text x="450" y="510" textAnchor="middle" fill="#e8eef7" fontSize="12">Yargılamayı sürdür, sigortaya doğrudan ihbarla limit içi tahsil yap, ıslah ile talep yükselt</text>
            </g>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-4.5">
        {SCENARIOS.map((s) => (
          <div
            key={s.name}
            className="border border-[var(--color-line)] rounded-lg p-3.5 bg-[var(--color-bg-1)]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[13.5px] font-medium">{s.name}</div>
              <div className="font-serif text-[22px] font-bold text-[var(--color-gold-bright)]">
                %{s.probability}
              </div>
            </div>
            <div className="w-full h-1 bg-[var(--color-bg-3)] rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-gold-soft)] to-[var(--color-gold-bright)]"
                style={{ width: `${s.probability * 2}%` }}
              />
            </div>
            <p className="text-xs text-[var(--color-text-2)] mt-2.5">{s.description}</p>
            <p className="text-[11.5px] text-[var(--color-gold-bright)] mt-1.5">
              <strong>Beklenen sonuç:</strong> {s.value}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
