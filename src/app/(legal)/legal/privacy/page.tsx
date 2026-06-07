import { LegalPage } from "@/components/legal/legal-page";
import { DATA_CONTROLLER, LEGAL_DOCUMENT_VERSIONS } from "@/lib/kvkk/constants";
import Link from "next/link";

export const metadata = {
  title: "Aydınlatma Metni — HARIS",
  description:
    "6698 sayılı KVKK kapsamında HARIS Legal AI kişisel verilerinizi nasıl işliyor?",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Kişisel Verilerin Korunması — Aydınlatma Metni"
      version={LEGAL_DOCUMENT_VERSIONS.kvkk_aydinlatma}
      lastUpdated="6 Haziran 2026"
    >
      <p>
        <strong>{DATA_CONTROLLER.legalName}</strong> (&ldquo;<strong>HARIS</strong>&rdquo; veya
        &ldquo;Şirket&rdquo;) olarak 6698 sayılı Kişisel Verilerin Korunması Kanunu
        (&ldquo;<strong>KVKK</strong>&rdquo;) m.10 ve Aydınlatma Yükümlülüğünün Yerine
        Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca, sizleri
        kişisel verilerinizin işlenmesi hakkında bilgilendiriyoruz.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <table>
        <tbody>
          <tr>
            <th>Ünvan</th>
            <td>{DATA_CONTROLLER.legalName}</td>
          </tr>
          <tr>
            <th>MERSİS No</th>
            <td>{DATA_CONTROLLER.mersis}</td>
          </tr>
          <tr>
            <th>Adres</th>
            <td>{DATA_CONTROLLER.address}</td>
          </tr>
          <tr>
            <th>İrtibat Kişisi</th>
            <td>{DATA_CONTROLLER.kvkkContactPerson}</td>
          </tr>
          <tr>
            <th>E-posta</th>
            <td>
              <a href={`mailto:${DATA_CONTROLLER.email}`}>{DATA_CONTROLLER.email}</a>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>2. İşlenen Kişisel Veri Kategorileri</h2>
      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Veri Türü</th>
            <th>Kaynak</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Kimlik</strong></td>
            <td>Ad-soyad, T.C. kimlik numarası (vergi için), baro sicil no</td>
            <td>Kullanıcı kaydı</td>
          </tr>
          <tr>
            <td><strong>İletişim</strong></td>
            <td>E-posta, telefon, büro adresi</td>
            <td>Kullanıcı kaydı</td>
          </tr>
          <tr>
            <td><strong>Müşteri İşlem</strong></td>
            <td>Dava bilgileri, dilekçeler, müvekkil bilgileri, yüklediğiniz belgeler</td>
            <td>Avukat tarafından girilen</td>
          </tr>
          <tr>
            <td><strong>Finansal</strong></td>
            <td>Abonelik planı, ödeme tarihi, fatura</td>
            <td>Stripe/iyzico üzerinden</td>
          </tr>
          <tr>
            <td><strong>İşlem Güvenliği</strong></td>
            <td>IP adresi, oturum logları, audit kayıtları</td>
            <td>Otomatik (m.12 gereği)</td>
          </tr>
          <tr>
            <td><strong>Pazarlama (rıza ile)</strong></td>
            <td>E-posta tercihleri, gezinme davranışı</td>
            <td>Açık rıza ile</td>
          </tr>
        </tbody>
      </table>

      <div className="callout">
        <strong>⚠ Önemli:</strong> Avukat-müvekkil gizliliği kapsamındaki dava
        içerikleriniz <strong>üçüncü taraf AI sağlayıcılarının eğitim verisinde
        kullanılmaz</strong>. OpenAI ve Anthropic ile data processing addendum (DPA)
        akdedilmiştir.
      </div>

      <h2>3. İşleme Amaçları</h2>
      <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
      <ul>
        <li>Hizmet sunumu (dava yönetimi, AI dilekçe üretimi, RAG araştırma)</li>
        <li>Kullanıcı hesabınızın oluşturulması ve yönetimi</li>
        <li>Sözleşme yükümlülüklerinin yerine getirilmesi</li>
        <li>Abonelik ve fatura işlemleri</li>
        <li>Hukuki yükümlülüklerin yerine getirilmesi (KVKK, VUK arşivleme)</li>
        <li>Güvenlik ve dolandırıcılığın önlenmesi (audit log, IP kayıt)</li>
        <li>Hizmet iyileştirme — kişisel veri içermeyen agregat istatistik</li>
        <li>İletişim — destek talepleri ve sözleşmesel duyurular</li>
        <li>Açık rıza vermeniz halinde: pazarlama e-postaları</li>
      </ul>

      <h2>4. Hukuki Sebepler (KVKK m.5/2 ve m.6/3)</h2>
      <ul>
        <li><strong>Sözleşmenin kurulması/ifası</strong> (m.5/2-c) — Üyelik ve hizmet sunumu</li>
        <li><strong>Hukuki yükümlülük</strong> (m.5/2-ç) — Vergi mevzuatı, KVKK arşiv</li>
        <li><strong>Meşru menfaat</strong> (m.5/2-f) — Güvenlik, dolandırıcılık önleme</li>
        <li><strong>Açık rıza</strong> (m.5/1) — Pazarlama iletileri, opsiyonel çerezler</li>
      </ul>

      <h2>5. Aktarım</h2>
      <p>Verileriniz aşağıdaki üçüncü kişilere işleyen sıfatıyla aktarılabilir:</p>
      <ul>
        <li>
          <strong>Supabase Inc.</strong> (ABD, AB veri rezidansı — Frankfurt) — Veritabanı,
          depolama, kimlik doğrulama. AB-ABD Data Privacy Framework kapsamında transfer.
        </li>
        <li>
          <strong>Vercel Inc.</strong> (ABD/AB) — Uygulama hosting, CDN. SCC ve DPA mevcut.
        </li>
        <li>
          <strong>OpenAI L.L.C. / Anthropic PBC</strong> (ABD) — AI dilekçe üretimi ve
          analiz. Data processing addendum imzalı. Verileriniz LLM eğitiminde KULLANILMAZ.
        </li>
        <li>
          <strong>Stripe Inc. / iyzico Ödeme Sistemleri A.Ş.</strong> — Ödeme işlemleri.
        </li>
        <li>
          <strong>Yetkili kamu kurumları</strong> — Yasal zorunluluk halinde (mahkeme kararı,
          C. Başsavcılığı talebi, vergi denetimi).
        </li>
      </ul>

      <h2>6. Saklama Süreleri</h2>
      <table>
        <thead>
          <tr>
            <th>Veri Türü</th>
            <th>Süre</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Hesap aktif olduğu sürece</td><td>Süresiz (silme talebine kadar)</td></tr>
          <tr><td>Hesap silme talebi sonrası dava içerikleri</td><td>30 gün cool-off + 10 yıl arşiv (TBK m.146)</td></tr>
          <tr><td>Fatura ve mali kayıtlar</td><td>10 yıl (VUK m.253)</td></tr>
          <tr><td>Audit log + IP kayıtları</td><td>2 yıl (m.12 yükümlülüğü)</td></tr>
          <tr><td>Pazarlama tercih kayıtları</td><td>Rıza geri çekilene kadar</td></tr>
          <tr><td>Çerez verileri</td><td>30 gün - 1 yıl arası (çerez türüne göre)</td></tr>
        </tbody>
      </table>

      <h2>7. İlgili Kişinin Hakları (KVKK m.11)</h2>
      <p>Veri sahibi olarak aşağıdaki haklara sahipsiniz:</p>
      <ol>
        <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
        <li>Hangi amaçla işlendiği bilgisini talep etme</li>
        <li>Üçüncü kişilere aktarılıp aktarılmadığını öğrenme</li>
        <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
        <li>Silinmesini / yok edilmesini isteme</li>
        <li>Verilerinizi başka bir veri sorumlusuna taşıma (taşınabilirlik)</li>
        <li>Otomatik karar verme sonuçlarına itiraz etme</li>
        <li>Hukuka aykırı işleme nedeniyle zararın giderilmesini talep etme</li>
      </ol>

      <p>
        Bu haklarınızı kullanmak için <Link href="/legal/kvkk-basvuru">KVKK Başvuru Formu</Link>
        &apos;nu doldurabilirsiniz. Talebiniz <strong>30 gün içinde</strong> ücretsiz olarak
        yanıtlanır (KVKK m.13).
      </p>

      <h2>8. Veri Güvenliği</h2>
      <ul>
        <li>Tüm veriler AES-256 ile şifrelenir (at-rest + in-transit TLS 1.3)</li>
        <li>Row Level Security (RLS): kullanıcı sadece kendi verisini görür</li>
        <li>Avukat-müvekkil gizliliği için ek izolasyon katmanı</li>
        <li>İki faktörlü kimlik doğrulama (opsiyonel)</li>
        <li>Düzenli güvenlik denetimleri ve sızma testleri</li>
        <li>İhlal durumunda 72 saat içinde KVKK Kurulu'na bildirim (m.12/5)</li>
      </ul>

      <h2>9. Çerez Politikası</h2>
      <p>
        Çerez kullanımı hakkında detaylı bilgi için{" "}
        <Link href="/legal/cookies">Çerez Politikası</Link>&apos;nı inceleyiniz.
      </p>

      <h2>10. Değişiklikler</h2>
      <p>
        Bu aydınlatma metnini güncelleyebiliriz. Önemli değişiklikler e-posta yoluyla
        bildirilir ve giriş sırasında yeniden onayınız istenebilir.
      </p>

      <div className="callout">
        <strong>Sorularınız için:</strong>{" "}
        <a href={`mailto:${DATA_CONTROLLER.email}`}>{DATA_CONTROLLER.email}</a>
      </div>
    </LegalPage>
  );
}
