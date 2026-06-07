import { Card } from "@/components/ui/card";
import { Scale } from "lucide-react";

const STEPS = [
  { num: 1, title: "Dava Açıldı", desc: "İstanbul 7. Asliye Hukuk Mahkemesi'nde 12 Mayıs 2025'te dava açıldı.", status: "done" as const },
  { num: 2, title: "Dava Dilekçesi Davalıya Tebliğ Edildi", desc: "Karşı tarafa 25 Mayıs 2025'te tebliğ edildi.", status: "done" as const },
  { num: 3, title: "Davalının Cevap Dilekçesi Geldi", desc: "Davalı tüm iddiaları reddetti, kusur paylaşımı talep etti. Avukatınız cevap hazırlıyor.", status: "done" as const },
  { num: 4, title: "Cevaba Cevap Dilekçesi Hazırlanıyor", desc: "AI destekli dilekçe taslağı hazır, son düzenlemeler yapılıyor. 28 Mayıs'a kadar mahkemeye sunulacak.", status: "now" as const },
  { num: 5, title: "Ön İnceleme Duruşması", desc: "15 Haziran 2026 — Saat 10:00. Sizin de katılımınız önemli olacak.", status: "future" as const },
];

export default function PortalPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4.5">
      <div
        className="rounded-xl p-7 px-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
        style={{
          background: "linear-gradient(180deg, #fafaf6 0%, #f0ede4 100%)",
          color: "#1a1a1a",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div className="flex items-center gap-3 pb-4 border-b mb-4.5" style={{ borderColor: "#d0c8b0" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#1a1a1a", color: "#d4b35e" }}>
            <Scale size={20} />
          </div>
          <div>
            <div className="font-serif text-lg" style={{ color: "#1a1a1a" }}>
              Yıldız &amp; Ortakları Hukuk Bürosu
            </div>
            <div className="text-[11px]" style={{ color: "#6a6a6a" }}>
              Müvekkil Portalı — A. Yılmaz Tazminat Davası
            </div>
          </div>
        </div>

        <h2 className="text-[22px] mb-1.5" style={{ color: "#1a1a1a" }}>
          Merhaba Ahmet Bey,
        </h2>
        <p className="text-[13px] mb-6" style={{ color: "#4a4a4a" }}>
          Davanızda son 14 gün içindeki gelişmeler ve önümüzdeki adımlar.
        </p>

        {STEPS.map((s) => (
          <div key={s.num} className="flex gap-3.5 py-3.5" style={{ borderBottom: "1px solid #e5e0d0" }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold flex-shrink-0 font-serif"
              style={{ background: "#1a1a1a", color: "#d4b35e" }}
            >
              {s.num}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[13.5px]">{s.title}</div>
              <div className="text-xs mt-0.5" style={{ color: "#6a6a6a" }}>
                {s.desc}
              </div>
            </div>
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-xl self-center"
              style={
                s.status === "done"
                  ? { background: "#d8ead2", color: "#2d5a3a" }
                  : s.status === "now"
                  ? { background: "#1a1a1a", color: "#d4b35e" }
                  : { background: "#e8e1c8", color: "#4a4a4a" }
              }
            >
              {s.status === "done" ? "Tamamlandı" : s.status === "now" ? "Şu an" : "Sıradaki"}
            </span>
          </div>
        ))}

        <div className="mt-8 p-4.5 rounded-lg" style={{ background: "#e8e1c8" }}>
          <strong style={{ color: "#1a1a1a" }}>📊 AI Tahmini:</strong>
          <p className="text-[13px] mt-2" style={{ color: "#4a4a4a" }}>
            Davanızın <strong>%78 başarı olasılığı</strong> bulunuyor. Tahmini sonuç süresi:{" "}
            <strong>9-14 ay</strong>. Beklenen tazminat aralığı:{" "}
            <strong>850.000 ₺ — 1.450.000 ₺</strong>.
          </p>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            className="px-4.5 py-2.5 rounded-md font-medium text-[13px] cursor-pointer border-0"
            style={{ background: "#1a1a1a", color: "#d4b35e" }}
          >
            Belge Yükle
          </button>
          <button
            className="px-4.5 py-2.5 rounded-md font-medium text-[13px] cursor-pointer bg-transparent"
            style={{ color: "#1a1a1a", border: "1px solid #1a1a1a" }}
          >
            Avukatına Mesaj Yaz
          </button>
        </div>
      </div>

      <div className="space-y-3.5">
        <Card>
          <h3 className="font-serif text-[var(--color-gold-bright)] text-[15px] mb-3">
            Portal Ayarları
          </h3>
          <div className="text-[12.5px] text-[var(--color-text-2)]">
            {[
              ["Müvekkil görüş izni", "Aktif"],
              ["Belge yükleme", "Açık"],
              ["AI ön cevap", "Aktif"],
              ["Otomatik özet sıklığı", "Haftalık"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between py-2.5 border-b border-[var(--color-line)] last:border-0"
              >
                <span>{k}</span>
                <span className="font-semibold text-[var(--color-gold-bright)]">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-serif text-[var(--color-gold-bright)] text-[15px] mb-3">
            Beyaz Etiket
          </h3>
          <p className="text-xs text-[var(--color-text-2)]">
            Müvekkil portalı kendi büronuzun logosu, rengi ve domaini ile sunulur. Müvekkil
            HARIS adını görmez.
          </p>
        </Card>
      </div>
    </div>
  );
}
