import { LegalPage } from "@/components/legal/legal-page";
import { DATA_CONTROLLER, LEGAL_DOCUMENT_VERSIONS } from "@/lib/kvkk/constants";
import Link from "next/link";

export const metadata = {
  title: "Kullanım Şartları — HARIS",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Kullanım Şartları ve Sözleşme"
      version={LEGAL_DOCUMENT_VERSIONS.terms_of_service}
      lastUpdated="6 Haziran 2026"
    >
      <p>
        Bu kullanım şartları, <strong>{DATA_CONTROLLER.legalName}</strong> tarafından
        sunulan HARIS Legal AI hizmetinin kullanımını düzenler. Hizmete kayıt olarak
        bu şartları okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan edersiniz.
      </p>

      <h2>1. Tanımlar</h2>
      <ul>
        <li><strong>HARIS / Hizmet</strong>: AI destekli hukuk yazılımı platformu</li>
        <li><strong>Kullanıcı / Avukat</strong>: Hizmete kayıt olan baroya kayıtlı avukat veya hukuk bürosu çalışanı</li>
        <li><strong>Şirket</strong>: {DATA_CONTROLLER.legalName}</li>
        <li><strong>İçerik</strong>: Hizmet üzerinden üretilen tüm dilekçe, analiz, rapor</li>
      </ul>

      <h2>2. Üyelik ve Hesap</h2>
      <p>
        Hizmete yalnızca <strong>baroya kayıtlı avukatlar veya hukuk bürosu çalışanları</strong>{" "}
        kayıt olabilir. Şirket, gerektiğinde baro sicil no doğrulaması talep edebilir.
        Kullanıcı, hesabının güvenliğinden sorumludur ve şifresini paylaşmamayı taahhüt eder.
      </p>

      <h2>3. AI Çıktılarının Hukuki Niteliği</h2>
      <div className="callout">
        <strong>⚠ ÇOK ÖNEMLİ:</strong> HARIS AI çıktıları (dilekçeler, analizler, içtihat
        önerileri) <strong>profesyonel hukuki tavsiye yerine geçmez</strong>. AI çıktıları
        bir taslak/öneri niteliğindedir; nihai sorumluluk avukata aittir.
      </div>
      <ul>
        <li>Avukat, AI çıktısını mahkemeye sunmadan önce kontrol etmekle yükümlüdür.</li>
        <li>AI tarafından üretilen içtihat atıflarının doğruluğunu avukat teyit etmelidir.</li>
        <li>Şirket, AI hatasından doğan zararlardan sorumlu tutulamaz; ancak makul özen yükümlülüğüne sahiptir.</li>
        <li>Avukatın mesleki sorumluluk sigortası HARIS kullanımını kapsayacak şekilde güncel olmalıdır.</li>
      </ul>

      <h2>4. Hizmet Kapsamı</h2>
      <p>Plan tipinize göre aşağıdaki özellikler sunulur:</p>
      <ul>
        <li>AI destekli dilekçe üretimi (12 uzman ajan)</li>
        <li>RAG ile Yargıtay/Danıştay/AYM emsal kararlarına erişim</li>
        <li>Belge yükleme + OCR + otomatik sınıflandırma</li>
        <li>Karşı Taraf Simülatörü (Adversarial Red-Team)</li>
        <li>Müvekkil portalı (Pro+ planlarda)</li>
        <li>API erişimi (Enterprise planlarda)</li>
      </ul>
      <p>
        Detaylar için <Link href="/pricing">Plan ve Fiyatlandırma</Link> sayfasını inceleyin.
      </p>

      <h2>5. Ödeme ve Plan Değişikliği</h2>
      <ul>
        <li>Aylık veya yıllık abonelik; otomatik yenilenir.</li>
        <li>Plan yükseltme: anında geçerli, kalan günler için fark hesaplanır.</li>
        <li>Plan düşürme: aktif dönem sonunda geçerli.</li>
        <li>14 günlük ücretsiz deneme; deneme bitiminde kart varsa otomatik tahsilat.</li>
        <li>KDV dahil fiyatlar; tutar Türk Lirası veya USD üzerinden tahsil edilir.</li>
      </ul>

      <h2>6. İptal ve İade</h2>
      <ul>
        <li>Aboneliğinizi istediğiniz zaman <Link href="/settings">Ayarlar</Link> sayfasından iptal edebilirsiniz.</li>
        <li>İptal sonrası mevcut dönem sonuna kadar erişim devam eder.</li>
        <li>Mesafeli sözleşmeler kapsamında dijital hizmetler için cayma hakkı sınırlıdır.</li>
        <li>Yasal sebeplerle iade gerektiren durumlar için <a href={`mailto:${DATA_CONTROLLER.email}`}>{DATA_CONTROLLER.email}</a> ile iletişime geçin.</li>
      </ul>

      <h2>7. Yasaklanmış Kullanım</h2>
      <p>HARIS aşağıdaki amaçlarla kullanılamaz:</p>
      <ul>
        <li>Yargıyı yanıltıcı sahte içtihat veya kanun maddesi üretme</li>
        <li>Üçüncü kişilerin haklarını ihlal eden içerik üretme</li>
        <li>Suç oluşturan eylemler (örn. iftira, dolandırıcılık dilekçesi)</li>
        <li>Reverse-engineering, scraping (HARIS'in kendi sistemleri)</li>
        <li>API rate-limit aşma veya DDoS girişimleri</li>
        <li>Hesap paylaşma / tek lisansı birden fazla kişi kullanma</li>
      </ul>
      <p>İhlal halinde hesap derhal askıya alınır, ücret iadesi yapılmaz.</p>

      <h2>8. Fikri Mülkiyet</h2>
      <ul>
        <li>HARIS'in kodu, tasarımı, marka ve algoritmaları Şirket'in fikri mülkiyetidir.</li>
        <li>Kullanıcının ürettiği içerik (dilekçe, analiz raporu vb.) <strong>kullanıcıya aittir</strong>.</li>
        <li>Şirket, kullanıcının yüklediği belgeleri sadece hizmet sunumu amacıyla işler.</li>
      </ul>

      <h2>9. Sorumluluğun Sınırlandırılması</h2>
      <p>
        Şirket, hizmetin kesintisiz, hatasız çalışmasını garanti etmez. Aşağıdaki
        durumlardan doğan zararlardan sorumlu tutulamaz:
      </p>
      <ul>
        <li>AI çıktısındaki içerik hatası (avukat kontrolü zorunlu — bkz. m.3)</li>
        <li>Mücbir sebep (savaş, doğal afet, internet kesintisi)</li>
        <li>Üçüncü taraf servisleri (Supabase, Vercel, OpenAI) kesintileri</li>
        <li>Kullanıcının kendi ihmali (örn. dosya yedeklememe)</li>
      </ul>
      <p>
        Her halükarda Şirket'in toplam sorumluluğu son 12 ayda ödediğiniz ücretle sınırlıdır.
      </p>

      <h2>10. KVKK ve Veri Koruma</h2>
      <p>
        Kişisel verilerinizin işlenmesi <Link href="/legal/privacy">Aydınlatma Metni</Link>
        &apos;nde detaylandırılmıştır. Müvekkil verileri için avukat veri sorumlusu, Şirket
        veri işleyen sıfatıyla hareket eder (KVKK m.3/1-i).
      </p>

      <h2>11. Uyuşmazlık ve Yetkili Mahkeme</h2>
      <p>
        Bu sözleşmeden doğabilecek uyuşmazlıklarda <strong>İstanbul Anadolu Mahkemeleri ve İcra
        Daireleri</strong> yetkilidir. Tüketici uyuşmazlıkları için ilgili tüketici hakem heyeti
        ve mahkemeleri yetkili olabilir. Türk hukuku uygulanır.
      </p>

      <h2>12. Değişiklikler</h2>
      <p>
        Şirket, bu şartları güncelleyebilir. Önemli değişiklikler 30 gün önceden e-posta
        ile bildirilir. Devam eden kullanım yeni şartların kabulü anlamına gelir.
      </p>

      <div className="callout">
        <strong>İletişim:</strong>{" "}
        <a href={`mailto:${DATA_CONTROLLER.email}`}>{DATA_CONTROLLER.email}</a> |{" "}
        {DATA_CONTROLLER.phone}
      </div>
    </LegalPage>
  );
}
