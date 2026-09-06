export function PetitionEditor() {
  return (
    <div
      className="rounded-xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] min-h-[800px]"
      style={{
        background: "#f7f5ee",
        color: "#1a1a1a",
        fontFamily: "'Times New Roman', serif",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex gap-1 px-3.5 py-2 border-b flex-wrap"
        style={{ background: "#ebe6d9", borderColor: "#d0c8b0" }}
      >
        {["B", "I", "U", "|", "Başlık", "Liste", "|", "Atıf Ekle", "Kanun Maddesi"].map(
          (b, i) =>
            b === "|" ? (
              <span key={i} style={{ color: "#c0b896" }}>|</span>
            ) : (
              <button
                key={i}
                className="px-2.5 py-1 rounded text-xs cursor-pointer transition-colors"
                style={{ color: "#4a4a4a" }}
              >
                {b === "B" ? <strong>B</strong> : b === "I" ? <em>I</em> : b === "U" ? <u>U</u> : b}
              </button>
            )
        )}
        <span className="ml-auto text-[11px]" style={{ color: "#6a6a6a" }}>
          Otomatik kaydedildi • 14:32
        </span>
      </div>

      {/* Page */}
      <div className="px-15 py-12 text-sm leading-[1.8] max-w-3xl mx-auto" style={{ padding: "50px 60px" }}>
        <div className="text-center font-bold mb-2 text-sm uppercase tracking-wider">
          İSTANBUL 7. ASLİYE HUKUK MAHKEMESİ
        </div>
        <div className="text-center text-xs">SAYIN HAKİMLİĞİ&apos;NE</div>
        <p className="text-right mt-3.5">
          <strong>DOSYA NO:</strong> 2025/1842 E.
        </p>

        <div className="text-center font-bold my-5 text-[15px]">
          CEVABA CEVAP DİLEKÇESİDİR
        </div>

        {[
          ["DAVACI", "Ahmet YILMAZ (T.C. 12345678901)\nBeşiktaş / İstanbul"],
          ["VEKİLİ", "Av. Ayşe YILDIZ — Yıldız & Ortakları Hukuk Bürosu\nLevent Mh. ... İstanbul (Sicil: 12345)"],
          ["DAVALI", "Şahin Otomotiv A.Ş. (MERSİS: 0123456789012345)\nMaslak / İstanbul"],
          ["VEKİLİ", "Av. Bülent KAYA"],
          ["KONU", "Davalı vekilinin 08.06.2025 tarihli cevap dilekçesine cevaplarımızdan ibarettir."],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid gap-2 my-3.5 text-[13px]"
            style={{ gridTemplateColumns: "140px 10px 1fr" }}
          >
            <strong>{label}</strong>
            <span>:</span>
            <span className="whitespace-pre-line">{value}</span>
          </div>
        ))}

        <h2 className="font-bold text-sm mt-4.5 mb-2.5 uppercase tracking-wider">AÇIKLAMALAR</h2>

        <p className="mb-2.5 text-justify">
          Sayın Mahkemenize sunulan davalı cevap dilekçesinde ileri sürülen iddialar, hem
          maddi vakıalar yönünden gerçeği yansıtmamakta, hem de hukuki dayanaktan yoksun
          bulunmaktadır. Aşağıda her bir iddiaya ayrı ayrı cevap verilmektedir.
        </p>

        <p className="mb-2.5 text-justify">
          <strong>1. KUSUR İTİRAZINA İLİŞKİN:</strong> Davalı vekili, müvekkilimin de
          kazanın oluşumunda <em>&ldquo;emniyet kemeri takmaması suretiyle&rdquo;</em>{" "}
          kusurlu olduğunu iddia etmektedir. Ancak bu iddia tamamen mesnetsizdir:
        </p>

        <ol className="pl-6 mb-2.5">
          <li className="mb-2 pl-1.5">
            <strong>Kaza Tespit Tutanağı</strong> (12.03.2024 tarih, sıra no: 2024/8842),
            davalı sürücünün <strong>kavşakta kırmızı ışıkta geçtiğini ve %100 kusurlu
            olduğunu</strong> açıkça tespit etmiştir.{" "}
            <CitationInline>EK-2</CitationInline>
          </li>
          <li className="mb-2 pl-1.5">
            Müvekkilin emniyet kemeri kullandığı, kaza yeri fotoğraflarındaki kemer
            izlerinden ve hastane ilk kabul kayıtlarındaki{" "}
            <em>&ldquo;omuz çapraz emniyet kemeri ekimozu&rdquo;</em> notundan açıkça
            anlaşılmaktadır. <CitationInline>EK-8, EK-4</CitationInline>
          </li>
          <li className="mb-2 pl-1.5">
            Yargıtay 17. Hukuk Dairesi&apos;nin yerleşik içtihadına göre,{" "}
            <strong>
              tam kusurlu davalı, mağdurun ikincil bir kusurunu (varsa dahi) kusur paylaşımı
              argümanı olarak ileri süremez.
            </strong>{" "}
            <CitationInline>Yarg. 17. HD, 2022/4521 K.</CitationInline>
          </li>
        </ol>

        <p className="mb-2.5 text-justify">
          <strong>2. SİGORTA LİMİTİ İTİRAZINA İLİŞKİN:</strong> Davalı vekili, ZMSS
          sigortası limitinin tazminat üst sınırı oluşturduğunu iddia etmektedir. Bu iddia,{" "}
          <strong>
            2918 sayılı Karayolları Trafik Kanunu m.85&apos;in açık hükmüne aykırıdır.
          </strong>{" "}
          İşletenin sorumluluğu, sigorta limiti ile sınırlı değildir.{" "}
          <CitationInline>KTK m.85, m.97</CitationInline>
        </p>

        <p className="mb-2.5 text-justify">
          <strong>3. MALULİYET ORANINA İLİŞKİN:</strong> Davalı, Adli Tıp Kurumu&apos;nun{" "}
          <strong>%32 sürekli iş gücü kaybı</strong> raporuna itiraz etmektedir. Yarg. 17.
          HD 2023/12056 K. uyarınca,{" "}
          <strong>
            kaza öncesi mevcut bir rahatsızlık, kaza ile ağırlaşmışsa, maluliyet hesabında
            düşülmez.
          </strong>
        </p>

        <p className="mb-2.5 text-justify">
          <strong>4. MANEVİ TAZMİNAT İNDİRİM TALEBİNE İLİŞKİN:</strong> Davalı, talep edilen
          300.000 TL manevi tazminatın &ldquo;fahiş&rdquo; olduğunu iddia etmektedir. Oysa
          müvekkil 11 gün yoğun bakımda kalmış, 2 büyük ameliyat geçirmiş, %32 kalıcı
          maluliyete uğramıştır. Yargıtay 4. HD&apos;nin 2024/8821 K. sayılı emsal
          kararında, benzer ağırlıkta bir yaralanma için <strong>500.000 TL manevi
          tazminata</strong> hükmedilmiştir.
        </p>

        <h2 className="font-bold text-sm mt-4.5 mb-2.5 uppercase tracking-wider">HUKUKİ SEBEPLER</h2>
        <p>TBK m.49, 50, 51, 56, 58; KTK m.85, 86, 90, 97; HMK ve sair mevzuat hükümleri.</p>

        <h2 className="font-bold text-sm mt-4.5 mb-2.5 uppercase tracking-wider">HUKUKİ DELİLLER</h2>
        <p>
          Dosyaya sunulu tüm deliller, ek olarak sunulacak deliller, tanık beyanları,
          bilirkişi incelemesi, keşif, yemin ve sair her türlü yasal delil.
        </p>

        <h2 className="font-bold text-sm mt-4.5 mb-2.5 uppercase tracking-wider">NETİCE-İ TALEP</h2>
        <p>Yukarıda arz ve izah edilen nedenlerle:</p>
        <ol className="pl-6 mb-2.5">
          <li className="mb-2 pl-1.5">
            <strong>Davalı vekilinin tüm itirazlarının reddine</strong>,
          </li>
          <li className="mb-2 pl-1.5">
            Müvekkilin <strong>650.000 TL maddi</strong> ve <strong>300.000 TL manevi</strong>{" "}
            tazminat talebinin, kaza tarihi olan 12.03.2024&apos;ten itibaren işleyecek{" "}
            <strong>yasal faiziyle birlikte</strong> davalıdan tahsiline,
          </li>
          <li className="mb-2 pl-1.5">
            <strong>Yargılama giderleri ve vekâlet ücretinin davalıya yükletilmesine</strong>
            ,
          </li>
        </ol>
        <p>karar verilmesini saygılarımla arz ve talep ederim.</p>

        <div className="text-right mt-10">
          20 Mayıs 2026
          <br />
          Davacı Vekili
          <br />
          <strong>Av. Ayşe YILDIZ</strong>
          <br />
          <em>(e-imza)</em>
        </div>

        <p className="text-[11px] mt-7" style={{ color: "#888" }}>
          <strong>EKLER:</strong>
          <br />
          EK-2: Kaza Tespit Tutanağı (12.03.2024, no:2024/8842)
          <br />
          EK-4: Hastane İlk Kabul Kayıtları
          <br />
          EK-8: Kaza Yeri Fotoğrafları (12 adet)
          <br />
          EK-12: Yarg. 17. HD 2022/4521 K. — Karar metni
          <br />
          EK-13: Yarg. HGK 2024/156 K. — Karar metni
        </p>
      </div>
    </div>
  );
}

function CitationInline({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="px-1 rounded-sm cursor-pointer"
      style={{ background: "#f5e9c8" }}
    >
      {children}
    </span>
  );
}
