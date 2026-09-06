/**
 * HARIS KVKK Sabitleri
 *
 * Aydınlatma metni ve kullanım şartlarının versiyon takibi.
 * Versiyon değiştirilirse → kullanıcılardan yeniden onay alınır.
 */

export const LEGAL_DOCUMENT_VERSIONS = {
  kvkk_aydinlatma: "v1.0.0-2026-06-06",
  terms_of_service: "v1.0.0-2026-06-06",
  privacy_policy: "v1.0.0-2026-06-06",
  cookie_policy: "v1.0.0-2026-06-06",
} as const;

export const DATA_CONTROLLER = {
  name: "Yıldız & Ortakları Hukuk Bürosu",
  legalName: "HARIS Legal AI Yazılım A.Ş.",
  // Production'da gerçek bilgilerle değiştirilecek
  mersis: "0123456789012345",
  address: "Levent Mah. ... İstanbul, Türkiye",
  phone: "+90 (212) XXX XX XX",
  email: "kvkk@haris.example",
  kvkkContactPerson: "Av. Ayşe YILDIZ — Veri Sorumlusu İrtibat Kişisi",
  vergiNo: "1234567890",
  vergiDairesi: "Beşiktaş",
} as const;

export const KVKK_REQUEST_TYPES = {
  access: "Kişisel verilerimin işlenip işlenmediğini öğrenme",
  information: "Hangi amaçla işlendiği bilgisi",
  transfer_info: "Aktarıldığı üçüncü kişileri öğrenme",
  correction: "Eksik veya yanlış işlenmişse düzeltilmesi",
  deletion: "Silinmesi / yok edilmesi",
  portability: "Verilerimin başka bir veri sorumlusuna taşınması",
  objection: "Otomatik karar verme sonuçlarına itiraz",
  damage_compensation: "Hukuka aykırı işleme nedeniyle zararın giderilmesi",
} as const;

export type KvkkRequestType = keyof typeof KVKK_REQUEST_TYPES;

/** KVKK m.13: 30 gün içinde yanıt zorunlu */
export const KVKK_RESPONSE_DEADLINE_DAYS = 30;

/** Hesap silme cool-off (kullanıcı vazgeçebilir) */
export const ACCOUNT_DELETION_COOLOFF_DAYS = 30;
