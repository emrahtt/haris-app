/**
 * Yargıtay Daire Kodları
 *
 * Bedesten API kısa kodları → tam Türkçe daire isimleri
 * Kaynak: bedesten.adalet.gov.tr + yargitay.gov.tr resmi listeleri
 */

export const YARGITAY_CHAMBERS = {
  ALL: "Tümü",

  // Hukuk Daireleri (1-23)
  H1: "1. Hukuk Dairesi",
  H2: "2. Hukuk Dairesi",
  H3: "3. Hukuk Dairesi",
  H4: "4. Hukuk Dairesi",
  H5: "5. Hukuk Dairesi",
  H6: "6. Hukuk Dairesi",
  H7: "7. Hukuk Dairesi",
  H8: "8. Hukuk Dairesi",
  H9: "9. Hukuk Dairesi",
  H10: "10. Hukuk Dairesi",
  H11: "11. Hukuk Dairesi",
  H12: "12. Hukuk Dairesi",
  H13: "13. Hukuk Dairesi",
  H14: "14. Hukuk Dairesi",
  H15: "15. Hukuk Dairesi",
  H16: "16. Hukuk Dairesi",
  H17: "17. Hukuk Dairesi",
  H18: "18. Hukuk Dairesi",
  H19: "19. Hukuk Dairesi",
  H20: "20. Hukuk Dairesi",
  H21: "21. Hukuk Dairesi",
  H22: "22. Hukuk Dairesi",
  H23: "23. Hukuk Dairesi",

  // Ceza Daireleri (1-23)
  C1: "1. Ceza Dairesi",
  C2: "2. Ceza Dairesi",
  C3: "3. Ceza Dairesi",
  C4: "4. Ceza Dairesi",
  C5: "5. Ceza Dairesi",
  C6: "6. Ceza Dairesi",
  C7: "7. Ceza Dairesi",
  C8: "8. Ceza Dairesi",
  C9: "9. Ceza Dairesi",
  C10: "10. Ceza Dairesi",
  C11: "11. Ceza Dairesi",
  C12: "12. Ceza Dairesi",
  C13: "13. Ceza Dairesi",
  C14: "14. Ceza Dairesi",
  C15: "15. Ceza Dairesi",
  C16: "16. Ceza Dairesi",
  C17: "17. Ceza Dairesi",
  C18: "18. Ceza Dairesi",
  C19: "19. Ceza Dairesi",
  C20: "20. Ceza Dairesi",
  C21: "21. Ceza Dairesi",
  C22: "22. Ceza Dairesi",
  C23: "23. Ceza Dairesi",

  // Genel Kurullar
  HGK: "Hukuk Genel Kurulu",
  CGK: "Ceza Genel Kurulu",
  BGK: "Büyük Genel Kurulu",
  HBK: "Hukuk Daireleri Başkanlar Kurulu",
  CBK: "Ceza Daireleri Başkanlar Kurulu",
} as const;

export type YargitayChamberCode = keyof typeof YARGITAY_CHAMBERS;

/** Kısa kodu tam isme çevirir (API'ye gönderirken) */
export function chamberCodeToFullName(code: string): string {
  if (code === "ALL" || !code) return "";
  return YARGITAY_CHAMBERS[code as YargitayChamberCode] || "";
}

/** Tam isimden kısa kod (response parse'ta) */
export function fullNameToChamberCode(name: string): YargitayChamberCode | null {
  for (const [code, full] of Object.entries(YARGITAY_CHAMBERS)) {
    if (full === name) return code as YargitayChamberCode;
  }
  return null;
}
