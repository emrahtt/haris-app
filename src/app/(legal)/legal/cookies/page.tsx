import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_DOCUMENT_VERSIONS } from "@/lib/kvkk/constants";

export const metadata = { title: "Çerez Politikası — HARIS" };

export default function CookiesPage() {
  return (
    <LegalPage
      title="Çerez Politikası"
      version={LEGAL_DOCUMENT_VERSIONS.cookie_policy}
      lastUpdated="6 Haziran 2026"
    >
      <p>
        HARIS, hizmetini sunabilmek için çerezler ve benzer teknolojiler kullanır. Bu
        politika, hangi çerezleri kullandığımızı ve seçimlerinizi nasıl yönetebileceğinizi
        açıklar.
      </p>

      <h2>1. Çerez Nedir?</h2>
      <p>
        Çerezler, ziyaret ettiğiniz web siteleri tarafından tarayıcınıza kaydedilen küçük
        metin dosyalarıdır. Oturum açık kalma, tercih kaydetme, ziyaret sayma gibi amaçlarla
        kullanılır.
      </p>

      <h2>2. Kullandığımız Çerez Kategorileri</h2>

      <h3>2.1 Zorunlu Çerezler (her zaman aktif)</h3>
      <p>Bu çerezler olmadan hizmet çalışmaz; rıza gerektirmez (KVKK m.5/2-c, sözleşme ifası).</p>
      <table>
        <thead>
          <tr>
            <th>Çerez</th>
            <th>Amaç</th>
            <th>Süre</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sb-access-token</code>, <code>sb-refresh-token</code></td>
            <td>Supabase oturum yönetimi</td>
            <td>7 gün</td>
          </tr>
          <tr>
            <td><code>haris-demo-session</code></td>
            <td>Demo mode oturumu</td>
            <td>7 gün</td>
          </tr>
          <tr>
            <td><code>haris-cookie-consent</code></td>
            <td>Çerez tercihiniz</td>
            <td>1 yıl</td>
          </tr>
        </tbody>
      </table>

      <h3>2.2 Analitik Çerezler (rıza gerektirir)</h3>
      <p>
        Hizmeti nasıl kullandığınızı anonim olarak ölçer (sayfa görüntüleme, hata oranı).
        <strong> Şu an pasif</strong> — Vercel Analytics aktivasyonu için ayrı rızanız alınır.
      </p>

      <h3>2.3 Pazarlama Çerezleri (rıza gerektirir)</h3>
      <p>
        Şu an <strong>kullanmıyoruz</strong>. Üçüncü taraf reklam ağı entegrasyonumuz yoktur.
      </p>

      <h2>3. Üçüncü Taraf Çerezler</h2>
      <table>
        <thead>
          <tr>
            <th>Sağlayıcı</th>
            <th>Amaç</th>
            <th>Politika</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Stripe</td>
            <td>Ödeme sayfasında dolandırıcılık önleme</td>
            <td>
              <a href="https://stripe.com/cookie-settings" target="_blank" rel="noopener">
                Stripe Çerezler
              </a>
            </td>
          </tr>
          <tr>
            <td>iyzico</td>
            <td>Ödeme sayfası (Türkiye)</td>
            <td>
              <a href="https://www.iyzico.com/cerez-politikasi" target="_blank" rel="noopener">
                iyzico Çerezler
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>4. Çerez Tercihlerinizi Yönetme</h2>
      <ul>
        <li>İlk ziyarette çerez tercih kutusu açılır; analitik/pazarlama için seçim yaparsınız.</li>
        <li>İstediğiniz zaman <strong>Ayarlar → Gizlilik</strong> sayfasından tercihleri değiştirebilirsiniz.</li>
        <li>Tarayıcı ayarlarından tüm çerezleri silebilirsiniz (ancak zorunlu çerezler olmadan giriş yapamazsınız).</li>
      </ul>

      <h2>5. e-Privacy ve KVKK</h2>
      <p>
        Çerez kullanımımız <strong>KVKK</strong> ile uyumlu olduğu gibi, Avrupa{" "}
        <strong>e-Privacy Direktifi (2002/58/EC)</strong> kapsamındaki en iyi uygulamaları
        da takip eder.
      </p>
    </LegalPage>
  );
}
